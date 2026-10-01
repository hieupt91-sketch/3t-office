"""Open a real Sheet window, round-trip it, and control/check it through WebView2 CDP.

Usage: python _roundtrip_save_sheet.py <worktree> <xlsx-in> <xlsx-out>
The optional memory log is written beside the output as ``.memory.jsonl``.
"""

from __future__ import annotations

import json
import os
import sys
import threading
import time
from pathlib import Path

ROOT, XLSX_PATH, OUT = sys.argv[1], os.path.abspath(sys.argv[2]), os.path.abspath(sys.argv[3])
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from _cdp_client import (  # noqa: E402
    connect_to_browser,
    connect_to_page,
    free_local_port,
    process_working_set_bytes,
)

CDP_PORT = free_local_port()
os.environ["WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"] = f"--remote-debugging-port={CDP_PORT}"
process_start = time.monotonic()

import webview  # noqa: E402
import main as vnmain  # noqa: E402


server, static_port = vnmain._start_static_server()
app_kind, initial_file = vnmain.parse_launch_args([XLSX_PATH])
api = vnmain.VnOfficeApi(app_kind=app_kind, initial_file=initial_file)
original_save = api.save_document_dialog


def _dump_save(content, *args, **kwargs):
    with open(OUT + ".sent.fods", "w", encoding="utf-8") as saved_content:
        saved_content.write(content)
    return original_save(content, *args, **kwargs)


api.save_document_dialog = _dump_save
window = webview.create_window(
    title="3T Sheet - Round-trip audit",
    url=vnmain.build_launch_url(app_kind, initial_file, port=static_port),
    width=1400,
    height=900,
    js_api=api,
)
window.create_file_dialog = lambda *args, **kwargs: OUT

stem = Path(XLSX_PATH).stem[:6]
memory_path = OUT + ".memory.jsonl"
measure_memory = os.environ.get("VNO_MEASURE_MEMORY", "0").strip().lower() in {"1", "true", "yes", "on"}
skip_save = os.environ.get("VNO_ROUNDTRIP_SKIP_SAVE", "0").strip().lower() in {"1", "true", "yes", "on"}
finished = threading.Event()
sample_lock = threading.Lock()
phase_state = {"value": "startup"}
samples = []
if measure_memory:
    Path(memory_path).write_text("", encoding="utf-8")


def _memory_sample(page, phase):
    sample = page.evaluate(r"""(() => {
      const app = window.__vnoAppInstance;
      const grid = app?.grid || app?.adapter?.grid;
      const memory = performance.memory || null;
      const label = document.querySelector('.vno-doc-tab span')?.textContent?.trim() || '';
      const cells = grid?.cellsData;
      const sheetMaps = grid?.sheetsData;
      let storedCells = cells?.size ?? null;
      if (storedCells == null && sheetMaps && typeof sheetMaps === 'object') {
        storedCells = Object.values(sheetMaps).reduce((count, data) => count + (data?.size || 0), 0);
      }
      return {
        elapsedMs: Math.round(performance.now()),
        label,
        hasViewportCell: Boolean(document.querySelector('.vno-grid-cell')),
        hasVisibleContent: Array.from(document.querySelectorAll('.vno-grid-cell')).some(cell => Boolean(cell.textContent.trim())),
        domCells: document.querySelectorAll('.vno-grid-cell').length,
        storedCells,
        sheetCount: grid?.sheets?.length ?? null,
        hydrationPending: grid?.__vnoSheetHydrationPending ?? null,
        openElapsedMs: window.__vnoSheetOpenElapsedMs ?? null,
        usedJSHeapBytes: memory?.usedJSHeapSize ?? null,
        totalJSHeapBytes: memory?.totalJSHeapSize ?? null,
        jsHeapLimitBytes: memory?.jsHeapSizeLimit ?? null
      };
    })()""")
    sample["phase"] = phase
    sample["hostWorkingSetBytes"] = process_working_set_bytes(os.getpid())
    return sample


def _write_sample(sample):
    with sample_lock:
        samples.append(sample)
        with open(memory_path, "a", encoding="utf-8") as log:
            log.write(json.dumps(sample, ensure_ascii=False) + "\n")


def _sample_process_memory():
    """Sample working sets outside the renderer thread, including during synchronous save serialization."""
    browser = None
    process_rows = []
    refresh_at = 0.0
    try:
        browser = connect_to_browser(CDP_PORT, timeout=90)
        while not finished.wait(0.2):
            now = time.monotonic()
            if now >= refresh_at:
                try:
                    process_rows = browser.call("SystemInfo.getProcessInfo", timeout=3).get("processInfo", [])
                except Exception:
                    pass
                refresh_at = now + 1.0
            rows = []
            for process in process_rows:
                process_id = int(process.get("id", 0))
                rows.append({
                    "id": process_id,
                    "type": process.get("type", ""),
                    "workingSetBytes": process_working_set_bytes(process_id),
                })
            renderer_values = [
                row["workingSetBytes"] for row in rows
                if row["type"] == "renderer" and row["workingSetBytes"] is not None
            ]
            webview_values = [row["workingSetBytes"] for row in rows if row["workingSetBytes"] is not None]
            _write_sample({
                "elapsedMs": round((time.monotonic() - process_start) * 1000),
                "phase": phase_state["value"],
                "hostWorkingSetBytes": process_working_set_bytes(os.getpid()),
                "rendererWorkingSetBytes": sum(renderer_values) if renderer_values else None,
                "webviewWorkingSetBytes": sum(webview_values) if webview_values else None,
                "processes": rows,
            })
    except Exception:
        pass
    finally:
        if browser is not None:
            browser.close()


def _memory_summary(samples):
    with sample_lock:
        samples = list(samples)
    def max_field(field):
        values = [sample.get(field) for sample in samples if isinstance(sample.get(field), (int, float))]
        return max(values) if values else None

    return {
        "samples": len(samples),
        "peakUsedJSHeapBytes": max_field("usedJSHeapBytes"),
        "peakRendererWorkingSetBytes": max_field("rendererWorkingSetBytes"),
        "peakWebviewWorkingSetBytes": max_field("webviewWorkingSetBytes"),
        "peakHostWorkingSetBytes": max_field("hostWorkingSetBytes"),
    }


def _run_audit():
    page = None
    last_sample = 0.0
    loaded = False
    fully_hydrated = False
    viewport_elapsed_ms = None
    hydration_elapsed_ms = None
    save_error = ""
    save_done = False
    try:
        phase_state["value"] = "open"
        page = connect_to_page(CDP_PORT, timeout=90)
        page.call("Runtime.enable")
        page.call("Page.enable")
        load_deadline = time.monotonic() + 2400
        hydration_deadline = time.monotonic() + 2400
        last_status = ""
        last_reported_status = ""
        while time.monotonic() < load_deadline:
            state = page.evaluate(r"""(() => {
              const app = window.__vnoAppInstance;
              const grid = app?.grid || app?.adapter?.grid;
              const label = document.querySelector('.vno-doc-tab span')?.textContent?.trim() || '';
              const status = document.querySelector('.vno-statusbar-left')?.textContent?.replace(/\s+/g, ' ').trim() || '';
              const maps = grid?.sheetsData;
              const storedCells = grid?.cellsData?.size ?? (maps && typeof maps === 'object'
                ? Object.values(maps).reduce((count, data) => count + (data?.size || 0), 0) : 0);
              const hasVisibleContent = Array.from(document.querySelectorAll('.vno-grid-cell'))
                .some(cell => Boolean(cell.textContent.trim()));
              return {
                  label,
                  status,
                loaded: label.toLowerCase().includes(%s) || decodeURIComponent(location.href).toLowerCase().includes(%s)
                  || storedCells > 0 || hasVisibleContent,
                hasViewportCell: Boolean(document.querySelector('.vno-grid-cell')),
                hasVisibleContent,
                storedCells,
                hydrationPending: grid?.__vnoSheetHydrationPending ?? null
              };
            })()""" % (json.dumps(stem.lower()), json.dumps(stem.lower())))
            loaded = bool(state.get("loaded"))
            if state.get("status") and state["status"] != last_status:
                last_status = state["status"]
            if measure_memory and time.monotonic() - last_sample >= 1.0:
                sample = _memory_sample(page, "open")
                _write_sample(sample)
                last_sample = time.monotonic()
            if loaded and state.get("hasViewportCell"):
                if viewport_elapsed_ms is None:
                    viewport_elapsed_ms = round((time.monotonic() - process_start) * 1000)
                report_key = (state.get("label") or "", state.get("status") or "")
                if report_key != last_reported_status:
                    print("LOADED:", state.get("label"), flush=True)
                    print("OPEN_STATUS:", state.get("status") or "", flush=True)
                    last_reported_status = report_key
                if state.get("hydrationPending") is False and state.get("storedCells", 0) > 0:
                    fully_hydrated = True
                    hydration_elapsed_ms = round((time.monotonic() - process_start) * 1000)
                    break
            time.sleep(0.35)

        if not loaded:
            print("LOAD_TIMEOUT: document tab did not match", stem, flush=True)
        if not fully_hydrated:
            print("HYDRATION_TIMEOUT_OR_FAILED:", flush=True)
        else:
            phase_state["value"] = "hydrated"
        print("PROCESS_TO_VIEWPORT_MS:", viewport_elapsed_ms, flush=True)
        print("PROCESS_TO_HYDRATED_MS:", hydration_elapsed_ms, flush=True)

        if measure_memory:
            sample = _memory_sample(page, "hydrated" if fully_hydrated else "open-timeout")
            _write_sample(sample)
            print("MEMORY_SUMMARY:", json.dumps(_memory_summary(samples)), flush=True)

        if not loaded or not fully_hydrated or skip_save:
            print("SAVE_SKIPPED:", "not-loaded" if not loaded else "not-hydrated" if not fully_hydrated else "measure-only", flush=True)
            return

        phase_state["value"] = "save"
        page.evaluate(r"""(() => {
          window.__saveDone = 0;
          window.__saveErr = '';
          import('/platform/commands/command-bus.js')
            .then(module => module.globalCommandBus.execute('common.file.saveAs'))
            .then(result => { window.__saveDone = 1; window.__saveRes = String(result); })
            .catch(error => { window.__saveErr = String(error?.stack || error); });
          return 'queued';
        })()""")
        save_deadline = time.monotonic() + 2400
        while time.monotonic() < save_deadline:
            save_state = page.evaluate("({done: window.__saveDone || 0, error: window.__saveErr || ''})")
            save_done = save_state.get("done") == 1
            save_error = str(save_state.get("error") or "")
            if save_done or save_error or (os.path.exists(OUT) and os.path.getsize(OUT) > 0):
                break
            if measure_memory and time.monotonic() - last_sample >= 1.0:
                sample = _memory_sample(page, "save")
                _write_sample(sample)
                last_sample = time.monotonic()
            time.sleep(0.5)
        print("SAVE_DONE:", save_done, "ERR:", save_error, flush=True)
        print("EXISTS:", os.path.exists(OUT), os.path.getsize(OUT) if os.path.exists(OUT) else 0, flush=True)
        if measure_memory:
            sample = _memory_sample(page, "after-save")
            _write_sample(sample)
            print("MEMORY_SUMMARY:", json.dumps(_memory_summary(samples)), flush=True)
    except Exception as exc:
        print("CDP_ERROR:", type(exc).__name__, str(exc), flush=True)
        if measure_memory:
            print("MEMORY_SUMMARY:", json.dumps(_memory_summary(samples)), flush=True)
    finally:
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


if measure_memory:
    threading.Thread(target=_sample_process_memory, name="3t-sheet-memory-sampler", daemon=True).start()
threading.Thread(target=_run_audit, name="3t-sheet-cdp-audit", daemon=True).start()
webview.start(debug=False)
if not finished.is_set():
    window.destroy()
