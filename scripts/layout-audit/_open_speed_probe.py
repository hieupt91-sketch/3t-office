"""Measure a single 3T document open through WebView2 CDP.

Usage: python _open_speed_probe.py <worktree> <document>
Sheet XLSX fixtures use the opt-in payload path; no document is edited or saved.
"""

from __future__ import annotations

import json
import os
import sys
import threading
import time

ROOT, DOCUMENT = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from _cdp_client import connect_to_page, free_local_port  # noqa: E402

CDP_PORT = free_local_port()
os.environ["WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"] = f"--remote-debugging-port={CDP_PORT}"
if DOCUMENT.lower().endswith(".xlsx"):
    os.environ["SHEET_OPEN_PAYLOAD"] = "1"
process_start = time.monotonic()

import webview  # noqa: E402
import main as vnmain  # noqa: E402

server, static_port = vnmain._start_static_server()
app_kind, initial_file = vnmain.parse_launch_args([DOCUMENT])
api = vnmain.VnOfficeApi(app_kind=app_kind, initial_file=initial_file)
window = webview.create_window(
    title="3T " + ("Sheet" if app_kind == "sheet" else "Doc") + " - Open timing",
    url=vnmain.build_launch_url(app_kind, initial_file, port=static_port),
    width=1400,
    height=900,
    js_api=api,
)

stem = os.path.splitext(os.path.basename(DOCUMENT))[0].lower()
finished = threading.Event()


def run_probe():
    page = None
    result = {
        "file": os.path.basename(DOCUMENT),
        "app": app_kind,
        "payloadOptIn": os.environ.get("SHEET_OPEN_PAYLOAD") == "1" if app_kind == "sheet" else None,
        "processToViewportMs": None,
        "processToHydratedMs": None,
        "storedCells": None,
        "status": "",
        "error": "",
    }
    try:
        page = connect_to_page(CDP_PORT, timeout=90)
        page.call("Runtime.enable")
        page.call("Page.enable")
        deadline = time.monotonic() + 2400
        while time.monotonic() < deadline:
            state = page.evaluate(r"""(() => {
              const label = document.querySelector('.vno-doc-tab span')?.textContent?.trim() || '';
              const status = document.querySelector('.vno-statusbar-left')?.textContent?.replace(/\s+/g, ' ').trim() || '';
              const grid = window.__vnoAppInstance?.grid || window.__vnoAppInstance?.adapter?.grid;
              const maps = grid?.sheetsData;
              const storedCells = grid?.cellsData?.size ?? (maps && typeof maps === 'object'
                ? Object.values(maps).reduce((sum, data) => sum + (data?.size || 0), 0) : 0);
              const sheetViewport = Boolean(document.querySelector('.vno-grid-cell'));
              const sheetContent = Array.from(document.querySelectorAll('.vno-grid-cell'))
                .some(cell => Boolean(cell.textContent.trim()));
              const body = document.querySelector('.vno-writer-body');
              const writerContent = Boolean(body && body.innerText.trim().length);
              return {
                label,
                status,
                storedCells,
                hydrationPending: grid?.__vnoSheetHydrationPending ?? null,
                sheetViewport,
                sheetContent,
                writerContent
              };
            })()""")
            result["status"] = state.get("status") or ""
            result["storedCells"] = state.get("storedCells")
            label_matches = stem and stem in (state.get("label") or "").lower()
            if app_kind == "sheet":
                viewport_ready = bool(state.get("sheetViewport")) and bool(
                    state.get("storedCells") or state.get("sheetContent")
                )
                hydrated = (state.get("hydrationPending") is False or not DOCUMENT.lower().endswith(".xlsx")) \
                    and (state.get("storedCells") or 0) > 0
            else:
                viewport_ready = bool(label_matches and state.get("writerContent"))
                hydrated = viewport_ready
            if viewport_ready and result["processToViewportMs"] is None:
                result["processToViewportMs"] = round((time.monotonic() - process_start) * 1000)
            if hydrated:
                result["processToHydratedMs"] = round((time.monotonic() - process_start) * 1000)
                break
            time.sleep(0.35)
        if result["processToViewportMs"] is None:
            result["error"] = "viewport timeout or document content not detected"
        elif result["processToHydratedMs"] is None:
            result["error"] = "full model hydration timeout"
    except Exception as exc:
        result["error"] = f"{type(exc).__name__}: {exc}"
    finally:
        print("OPEN_PROBE:", json.dumps(result, ensure_ascii=False), flush=True)
        try:
            if page is not None:
                page.call("Page.close", timeout=5)
        except Exception:
            pass
        if page is not None:
            page.close()
        finished.set()
        try:
            window.destroy()
        except Exception:
            pass


threading.Thread(target=run_probe, name="3t-open-speed-cdp", daemon=True).start()
webview.start(debug=False)
if not finished.is_set():
    window.destroy()
