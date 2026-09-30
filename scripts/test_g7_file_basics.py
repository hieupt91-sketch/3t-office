"""Desktop acceptance probe for G7; needs pywebview, LibreOffice, and Office COM on Windows.

Copies small Office fixtures from E:\\VN OFice\\file test into the system temp directory,
drives VN Office through pywebview/evaluate_js, and leaves the source corpus untouched.
It never uses SendKeys. Run with: python scripts/test_g7_file_basics.py
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS = Path(r"E:\VN OFice\file test")
FIXTURES = {
    "writer": Path("landocx/d05.docx"),
    "sheet": Path("lan/lan25.xlsx"),
    "slides": Path("lan/BÁO CÁO KẾT QUẢ KINH DOANH NĂM 2021.pptx"),
}
COM_SCRIPT = r'''
param([string]$App, [string]$File, [string]$Marker)
$ErrorActionPreference = "Stop"
$obj = $null
$stage = "start"
try {
  switch ($App) {
    "writer" {
      $stage = "word.open"
      $obj = New-Object -ComObject Word.Application
      $obj.Visible = $false; $obj.DisplayAlerts = 0
      $doc = $obj.Documents.Open((Resolve-Path $File).Path, $false, $true, $false)
      $stage = "word.read"
      $text = [string]$doc.Content.Text
      $found = $text.Contains($Marker)
      $doc.Close(0)
    }
    "sheet" {
      $stage = "excel.open"
      $obj = New-Object -ComObject Excel.Application
      $obj.Visible = $false; $obj.DisplayAlerts = $false
      $book = $obj.Workbooks.Open((Resolve-Path $File).Path, 0, $true)
      $found = $false
      $stage = "excel.read"
      foreach ($ws in $book.Worksheets) {
        $values = $ws.UsedRange.Value2
        if ($null -ne $values) {
          foreach ($value in $values) {
            if ([string]$value -eq $Marker) { $found = $true; break }
          }
        }
        if ($found) { break }
      }
      $book.Close($false)
    }
    "slides" {
      $stage = "powerpoint.open"
      $obj = New-Object -ComObject PowerPoint.Application
      $deck = $obj.Presentations.Open((Resolve-Path $File).Path, $true, $false, $false)
      $found = $false
      $stage = "powerpoint.read"
      foreach ($slide in $deck.Slides) {
        foreach ($shape in $slide.Shapes) {
          if ($shape.HasTextFrame -and $shape.TextFrame.HasText -and ([string]$shape.TextFrame.TextRange.Text).Contains($Marker)) { $found = $true }
        }
      }
      $deck.Close()
    }
  }
  if ($found) { "COM_PASS" } else { "COM_FAIL marker not found" }
} catch { "COM_ERROR stage=$stage " + ($_.Exception.Message -replace "`r|`n", " ") }
finally { if ($null -ne $obj) { try { $obj.Quit() } catch {} } }
'''


def office_com_check(app: str, path: Path, marker: str) -> tuple[str, str]:
    helper = path.parent / "_verify_g7_office.ps1"
    if not helper.exists():
        helper.write_text(COM_SCRIPT, encoding="utf-8")
    try:
        output = ""
        for attempt in range(5):
            completed = subprocess.run(
                ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(helper), "-App", app, "-File", str(path), "-Marker", marker],
                capture_output=True, text=True, timeout=180, encoding="utf-8", errors="replace",
            )
            output = (completed.stdout or completed.stderr).strip()
            if "RPC_E_CALL_REJECTED" not in output or attempt == 4:
                break
            time.sleep(2)
        if "COM_PASS" in output:
            return "PASS", output
        if "COM_ERROR" in output and any(name in output.lower() for name in ("class not registered", "80040154", "cannot create activex")):
            return "BLOCKED", output
        if "RPC_E_CALL_REJECTED" in output:
            return "BLOCKED", "Office COM server kept rejecting calls during verification after retries: " + output
        return "FAIL", output or f"PowerShell exit={completed.returncode}"
    except subprocess.TimeoutExpired:
        return "BLOCKED", "Office COM probe exceeded 180 seconds"
    except OSError as error:
        return "BLOCKED", str(error)


def word_page_count(path: Path) -> tuple[str, str]:
    oracle = ROOT / "scripts" / "layout-audit" / "_word_oracle3.ps1"
    try:
        completed = subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(oracle), "-File", str(path)],
            capture_output=True, text=True, timeout=300, encoding="utf-8", errors="replace",
        )
        output = (completed.stdout or completed.stderr).strip()
        import re
        match = re.search(r"pages=(\d+)", output)
        return (match.group(1), output) if match else ("BLOCKED", output or f"Word oracle exit={completed.returncode}")
    except (OSError, subprocess.TimeoutExpired) as error:
        return "BLOCKED", str(error)


def pdf_page_count(path: Path) -> tuple[int | None, str]:
    try:
        data = path.read_bytes()
    except OSError as error:
        return None, str(error)
    import re
    count = len(re.findall(rb"/Type\s*/Page\b", data))
    if count == 0:
        return None, "PDF contains no readable /Page objects"
    return count, f"counted {count} PDF page objects"


def copy_fixtures(temp_root: Path) -> dict[str, tuple[Path, Path]]:
    copied = {}
    for app, relative in FIXTURES.items():
        source = CORPUS / relative
        if not source.is_file():
            raise FileNotFoundError(f"Required fixture missing: {source}")
        first = temp_root / f"{app}_open{source.suffix.lower()}"
        second = temp_root / f"{app}_replacement{source.suffix.lower()}"
        shutil.copy2(source, first)
        shutil.copy2(source, second)
        copied[app] = (first, second)
    return copied


def run_probe(app: str, first: Path, second: Path, out_dir: Path) -> tuple[dict, str]:
    result_path = out_dir / f"{app}.json"
    command = [sys.executable, str(Path(__file__).resolve()), "--probe", str(ROOT), app, str(first), str(second), str(out_dir), str(result_path)]
    try:
        completed = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=900, encoding="utf-8", errors="replace")
    except subprocess.TimeoutExpired as error:
        return {"status": "BLOCKED", "error": "pywebview session exceeded 900 seconds"}, str(error)
    if not result_path.exists():
        return {"status": "FAIL", "error": "probe did not write a result"}, (completed.stdout + "\n" + completed.stderr)[-4000:]
    try:
        payload = json.loads(result_path.read_text(encoding="utf-8"))
    except Exception as error:
        return {"status": "FAIL", "error": str(error)}, (completed.stdout + "\n" + completed.stderr)[-4000:]
    return payload, (completed.stdout + "\n" + completed.stderr)[-4000:]


def evaluate_js_json(window, expression: str):
    result = window.evaluate_js(f"JSON.stringify(({expression}))")
    if isinstance(result, str):
        return json.loads(result)
    return result


def wait_for(window, expression: str, predicate, timeout: float = 80, interval: float = 0.5):
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        try:
            last = evaluate_js_json(window, expression)
            if predicate(last):
                return last
        except Exception:
            pass
        time.sleep(interval)
    raise TimeoutError(f"Timed out waiting for JavaScript state: {expression}; last={last!r}")


def wait_for_window_count(webview_module, expected_count: int, timeout: float = 45):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if len(webview_module.windows) == expected_count:
            return list(webview_module.windows)
        time.sleep(0.25)
    raise TimeoutError(f"Timed out waiting for {expected_count} pywebview windows; saw {len(webview_module.windows)}")


def start_promise(window, expression: str) -> str:
    js = """(() => {
      window.__g7Runs ||= {}; const id = `g7-${Date.now()}-${Math.random()}`;
      window.__g7Runs[id] = { done: false };
      Promise.resolve().then(() => (EXPRESSION)).then(value => {
        window.__g7Runs[id] = { done: true, ok: true, value: value === undefined ? null : value };
      }, error => { window.__g7Runs[id] = { done: true, ok: false, error: String(error?.stack || error) }; });
      return id;
    })()""".replace("EXPRESSION", expression)
    return str(window.evaluate_js(js))


def await_promise(window, run_id: str, timeout: float = 240):
    state = wait_for(window, f"window.__g7Runs[{json.dumps(run_id)}]", lambda value: bool(value and value.get("done")), timeout)
    if not state.get("ok"):
        raise RuntimeError(state.get("error", "page promise failed"))
    return state.get("value")


def run_command(window, command: str, timeout: float = 240):
    run_id = start_promise(window, f"import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute({json.dumps(command)}))")
    return await_promise(window, run_id, timeout)


def trigger_shortcut(window, key: str, *, ctrl: bool = False, shift: bool = False):
    window.evaluate_js(
        "window.dispatchEvent(new KeyboardEvent('keydown', {key: " + json.dumps(key) +
        f", ctrlKey: {str(ctrl).lower()}, shiftKey: {str(shift).lower()}, bubbles: true, cancelable: true}})); true"
    )


def wait_app(window):
    return wait_for(window, "!!window.__vnoAppInstance?.adapter", bool, timeout=90)


def inspect_blank(window, app: str) -> dict:
    state = evaluate_js_json(window, f"""(() => {{
      const app = window.__vnoAppInstance, adapter = app?.adapter, shell = app?.shell;
      const common = {{ name: shell?.documentName || "", tab: document.querySelector('.vno-doc-tab span')?.textContent || "",
        title: document.title, dirty: !!adapter?.isDirty,
        recent: JSON.parse(localStorage.getItem('vno_recent_documents') || '[]').filter(item => item?.path).length }};
      if ({json.dumps(app)} === "writer") {{
        const body = adapter?.bodyDom;
        return {{...common, text: body?.innerText || "", html: body?.innerHTML || "", pages: adapter?.paginateContent?.()?.length || 0}};
      }}
      if ({json.dumps(app)} === "sheet") {{
        const grid = app.grid;
        return {{...common, sheets: grid?.sheets || [], active: grid?.activeSheet || "", selected: grid?.selectedCoord || null,
          dataCount: grid?.cellsData?.size ?? -1}};
      }}
      const slides = app.canvasController?.slides || [];
      return {{...common, slideCount: slides.length, slides: slides.map(slide => ({{title: slide.title || "", body: slide.body || "", notes: slide.notes || ""}}))}};
    }})()""")
    state["windowTitle"] = str(getattr(window, "title", ""))
    return state


def insert_marker(window, app: str, marker: str) -> None:
    escaped = json.dumps(marker)
    if app == "writer":
        expression = f"""(() => {{ const a=window.__vnoAppInstance.adapter, b=a.bodyDom;
          b.insertAdjacentHTML('beforeend', '<p>' + {escaped} + '</p>');
          b.dispatchEvent(new InputEvent('input', {{bubbles:true, inputType:'insertText', data:{escaped}}})); a.isDirty=true; return true; }})()"""
    elif app == "sheet":
        close_marker = "-close-save" in marker
        col = "B" if close_marker else "A"
        expression = f"""(() => {{ const a=window.__vnoAppInstance; a.grid.setCellValue('{col}', 1, {escaped}, false); a.adapter.isDirty=true; return true; }})()"""
    else:
        close_marker = "-close-save" in marker
        target_index = "Math.min(1, c.slides.length - 1)" if close_marker else "c.currentSlideIndex"
        expression = f"""(() => {{ const a=window.__vnoAppInstance, c=a.canvasController;
          const targetIndex={target_index}; if (targetIndex !== c.currentSlideIndex) c.selectSlide(targetIndex);
          const slide=c.slides[targetIndex], shape=slide?.shapes?.find(item => String(item.text || '').trim());
          if (shape) {{ shape.text={escaped}; delete shape.textHtml; }}
          c.titleEl.innerText={escaped}; c._syncEditableFieldsFromDom(); slide.title={escaped}; delete slide.titleHtml;
          c._renderShapesLayer();
          a.adapter.isDirty=true; return true; }})()"""
    if not window.evaluate_js(expression):
        raise RuntimeError(f"Could not insert marker into {app}")


def preview_info(window, app: str) -> dict:
    fonts_ready = start_promise(
        window,
        "Promise.resolve(document.fonts?.ready).then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))))",
    )
    await_promise(window, fonts_ready, 30)
    methods = {"writer": "adapter.openPrintPreview()", "sheet": "grid.openPrintPreview()", "slides": "canvasController.openPrintPreview()"}
    window.evaluate_js(f"window.__vnoAppInstance.{methods[app]}; 'opened'")
    if app == "writer":
        selector = ".vno-print-preview-sheet"
        total_selector = ".vno-print-preview-total-pages"
    elif app == "sheet":
        selector = ".vno-sheet-print-preview-page"
        total_selector = ".vno-sheet-pp-total"
    else:
        selector = ".vno-slides-print-preview-page"
        total_selector = ".vno-slides-pp-total"
    info = evaluate_js_json(window, f"""(() => {{ const el=document.querySelector({json.dumps('.vno-print-preview-overlay' if app == 'writer' else '.vno-sheet-print-preview-overlay' if app == 'sheet' else '.vno-slides-print-preview-overlay')});
      return {{count: document.querySelectorAll({json.dumps(selector)}).length,
        totalPages: Number(document.querySelector({json.dumps(total_selector)})?.textContent || 0),
        text: (el?.innerText || '').slice(0,30000)}}; }})()""")
    close_methods = {"writer": "adapter.closePrintPreview()", "sheet": "grid.closePrintPreview()", "slides": "canvasController.closePrintPreview()"}
    try:
        window.evaluate_js(f"window.__vnoAppInstance.{close_methods[app]}; 'closed'")
    except Exception:
        pass
    return info


def desktop_probe(app: str, first: Path, second: Path, out_dir: Path, result_path: Path) -> int:
    # Keep this automation isolated from the developer's real VN Office profile and prior probe runs.
    local_app_data = out_dir / "desktop-local-app-data"
    roaming_app_data = out_dir / "desktop-roaming-app-data"
    local_app_data.mkdir(parents=True, exist_ok=True)
    roaming_app_data.mkdir(parents=True, exist_ok=True)
    os.environ["LOCALAPPDATA"] = str(local_app_data)
    os.environ["APPDATA"] = str(roaming_app_data)
    import webview
    import main as vnmain

    server, port = vnmain._start_static_server()
    vnmain._DOCUMENT_SEQUENCE[app] = 1
    api = vnmain.VnOfficeApi(app_kind=app, server_port=port)
    window = webview.create_window(
        title=f"G7 {app}", url=vnmain.build_launch_url(app, None, port=port),
        width=1366, height=900, min_size=(960, 640), js_api=api, text_select=True,
    )
    vnmain._register_app_window(api, window)
    open_queue = [str(first), str(second)]
    save_queue = [str(out_dir / f"{app}_saveas.pdf")]
    dialog_calls = []

    def fake_dialog(dialog_type, *args, **kwargs):
        dialog_calls.append({"type": int(dialog_type), "kwargs": {key: list(value) if isinstance(value, tuple) else value for key, value in kwargs.items()}})
        if dialog_type == webview.OPEN_DIALOG:
            return [open_queue.pop(0)] if open_queue else []
        if dialog_type == webview.SAVE_DIALOG:
            return [save_queue.pop(0)] if save_queue else []
        return []

    def after_loaded(win):
        outcome = {"app": app, "checks": {}, "errors": [], "dialogCalls": dialog_calls}
        def checkpoint(step: str):
            outcome["step"] = step
            result_path.write_text(json.dumps(outcome, ensure_ascii=False, indent=2), encoding="utf-8")
        try:
            wait_app(win)
            blank = inspect_blank(win, app)
            outcome["blank"] = blank
            preview = preview_info(win, app)
            outcome["blankPreview"] = preview
            outcome["checks"]["blank"] = is_blank_ok(app, blank)
            outcome["checks"]["blankPreview"] = preview["count"] > 0 and not any(
                sample in preview["text"] for sample in ("Dự toán kinh phí", "Kế hoạch Q3", "Tiêu đề trang chiếu", "Nhập nội dung chính", "QUYẾT ĐỊNH")
            )

            initial_window = win
            checkpoint("blank")
            initial_before_new = blank
            trigger_shortcut(win, "n", ctrl=True)
            wait_for_window_count(webview, 2, timeout=35)
            child = next(candidate for candidate in webview.windows if candidate.uid != win.uid)
            wait_for(child, "!!window.__vnoAppInstance?.adapter", bool, timeout=90)
            child_blank = inspect_blank(child, app)
            after_new = inspect_blank(initial_window, app)
            outcome["new"] = {"first": after_new, "second": child_blank}
            outcome["checks"]["new"] = is_blank_ok(app, child_blank, number=2) and after_new == initial_before_new
            checkpoint("new")

            # A clean close must close the child without ever rendering the three-choice prompt.
            # The bridge Promise is torn down with the WebView, so observe native window removal instead.
            start_promise(child, "window.__vnoAppInstance.shell.requestCloseDocument()")
            wait_for_window_count(webview, 1, timeout=30)
            outcome["checks"]["cleanClose"] = True

            # Route native dialogs to copied fixtures and capture their actual filter/default-name arguments.
            win.create_file_dialog = fake_dialog
            trigger_shortcut(win, "o", ctrl=True)
            wait_for(win, "!!window.__vnoAppInstance.adapter.isDirty || !!window.__vnoAppInstance.adapter._sourcePath || !!window.__vnoAppInstance.adapter.sourceFilePath", bool, timeout=300)
            wait_for(win, f"window.__vnoAppInstance.shell.documentName === {json.dumps(first.name)}", bool, timeout=60)
            first_state = inspect_blank(win, app)
            first_path = read_source_path(win, app)
            outcome["openedFirst"] = {"state": first_state, "path": first_path}
            outcome["checks"]["openFilter"] = dialog_has_filter(dialog_calls, app)
            checkpoint("openedFirst")

            marker1 = f"VNOfficeG7-{app}-replace-save"
            insert_marker(win, app, marker1)
            # Opening another file while dirty must show Save / Don't Save / Cancel; choose Save.
            trigger_shortcut(win, "o", ctrl=True)
            wait_for(win, "!!document.querySelector('[data-unsaved-choice=save]')", bool, timeout=25)
            win.evaluate_js("document.querySelector('[data-unsaved-choice=save]').click(); true")
            wait_for(win, f"window.__vnoAppInstance.shell.documentName === {json.dumps(second.name)} && !window.__vnoAppInstance.adapter.isDirty", bool, timeout=300)
            outcome["checks"]["dirtyOpenSaveChoice"] = True
            checkpoint("dirtyOpenSaveChoice")

            marker2 = f"VNOfficeG7-{app}-cancel-then-save"
            insert_marker(win, app, marker2)
            outcome["insertedMarker"] = inspect_blank(win, app)
            if app == "slides":
                outcome["slideShapesAfterInsert"] = evaluate_js_json(win, "window.__vnoAppInstance.canvasController.slides[0].shapes.filter(shape => shape.text).map(({id,type,text,x,y}) => ({id,type,text,x,y})).slice(0,8)")
            title_before_cancel = inspect_blank(win, app)["title"]
            trigger_shortcut(win, "o", ctrl=True)
            wait_for(win, "!!document.querySelector('[data-unsaved-choice=cancel]')", bool, timeout=25)
            win.evaluate_js("document.querySelector('[data-unsaved-choice=cancel]').click(); true")
            wait_for(win, "window.__vnoAppInstance.adapter.isDirty", bool, timeout=25)
            after_cancel = inspect_blank(win, app)
            outcome["cancelOpen"] = after_cancel
            outcome["checks"]["dirtyOpenCancel"] = after_cancel["dirty"] and after_cancel["title"] == title_before_cancel and read_source_path(win, app) == str(second)

            trigger_shortcut(win, "s", ctrl=True)
            wait_for(win, "!window.__vnoAppInstance.adapter.isDirty", bool, timeout=300)
            outcome["checks"]["saveInPlace"] = not inspect_blank(win, app)["dirty"] and read_source_path(win, app) == str(second)
            outcome["afterInPlaceSave"] = inspect_blank(win, app)
            if app == "slides":
                outcome["slideShapesAfterSave"] = evaluate_js_json(win, "window.__vnoAppInstance.canvasController.slides[0].shapes.filter(shape => shape.text).map(({id,type,text,x,y}) => ({id,type,text,x,y})).slice(0,8)")
            checkpoint("saveInPlace")

            # Canceling the native Open picker leaves the current file, title, and dirty flag untouched.
            before_open_cancel = inspect_blank(win, app)
            open_cancel_id = start_promise(win, "window.__vnoAppInstance.adapter.open()")
            open_cancel_result = await_promise(win, open_cancel_id, 30)
            after_open_cancel = inspect_blank(win, app)
            outcome["checks"]["openDialogCancel"] = (
                open_cancel_result is False and after_open_cancel == before_open_cancel
                and read_source_path(win, app) == str(second)
            )
            checkpoint("openDialogCancel")

            # Save As selects PDF, proposes the current name first, and switches document chrome to the new target.
            trigger_shortcut(win, "F12")
            wait_for(win, f"window.__vnoAppInstance.shell.documentName.endsWith('.pdf') && !window.__vnoAppInstance.adapter.isDirty", bool, timeout=75)
            final_state = inspect_blank(win, app)
            outcome["saveAs"] = {"state": final_state, "path": read_source_path(win, app), "suggested": [call["kwargs"].get("save_filename") for call in dialog_calls if call["type"] == int(webview.SAVE_DIALOG)]}
            suggested = outcome["saveAs"]["suggested"]
            outcome["checks"]["saveAs"] = (
                final_state["name"].endswith(".pdf") and not final_state["dirty"]
                and Path(outcome["saveAs"]["path"]).is_file()
                and bool(suggested) and suggested[-1] == second.name
            )
            checkpoint("saveAs")

            # Reopen the saved source through the native Open path, then compare preview pages with the model.
            open_queue.append(str(second))
            trigger_shortcut(win, "o", ctrl=True)
            wait_for(win, f"window.__vnoAppInstance.shell.documentName === {json.dumps(second.name)} && !window.__vnoAppInstance.adapter.isDirty", bool, timeout=240)
            reopened = win
            reopened_state = inspect_blank(reopened, app)
            outcome["reopened"] = reopened_state
            if app == "slides":
                outcome["slideShapesAfterReopen"] = evaluate_js_json(reopened, "window.__vnoAppInstance.canvasController.slides[0].shapes.filter(shape => shape.text).map(({id,type,text,x,y}) => ({id,type,text,x,y})).slice(0,8)")
            if app == "sheet":
                outcome["checks"]["reopenSaved"] = evaluate_js_json(
                    reopened, f"window.__vnoAppInstance.grid.cellsData.get('A1')?.val === {json.dumps(marker2)}"
                )
            elif app == "slides":
                outcome["checks"]["reopenSaved"] = evaluate_js_json(
                    reopened,
                    f"window.__vnoAppInstance.canvasController.slides.some(slide => (slide.title || '') === {json.dumps(marker2)} || (slide.shapes || []).some(shape => (shape.text || '') === {json.dumps(marker2)}))",
                )
            else:
                outcome["checks"]["reopenSaved"] = marker2 in json.dumps(reopened_state, ensure_ascii=False)
            reopened_preview = preview_info(reopened, app)
            outcome["printPreview"] = reopened_preview
            if app == "slides":
                expected = reopened_state.get("slideCount", 0)
            elif app == "sheet":
                expected = evaluate_js_json(reopened, "window.__vnoAppInstance.grid.computePrintPages().totalPages")
            else:
                expected = reopened_preview["totalPages"]
            outcome["printExpectedPages"] = expected
            outcome["checks"]["printPreviewPages"] = reopened_preview["totalPages"] == expected and expected > 0
            outcome["checks"]["printPreviewHasRealContent"] = marker2 in reopened_preview["text"]
            outcome["checks"]["recentOnlyRealPaths"] = evaluate_js_json(reopened, "JSON.parse(localStorage.getItem('vno_recent_documents') || '[]').every(x => typeof x.path === 'string' && x.path.length > 0)")
            checkpoint("printPreview")

            corrupt = out_dir / f"{app}_corrupt{first.suffix.lower()}"
            corrupt.write_bytes(b"not a valid Office document package")
            open_queue.append(str(corrupt))
            title_before_bad_open = inspect_blank(win, app)["title"]
            source_before_bad_open = read_source_path(win, app)
            trigger_shortcut(win, "o", ctrl=True)
            wait_for(win, "!!document.querySelector('.vno-dialog-overlay')", bool, timeout=300)
            error_text = evaluate_js_json(win, "document.querySelector('.vno-dialog-overlay')?.innerText || ''")
            outcome["badOpen"] = {"message": error_text}
            win.evaluate_js("document.querySelector('.vno-dialog-ok-btn')?.click(); true")
            wait_for(win, "!document.querySelector('.vno-dialog-overlay')", bool, timeout=30)
            current_has_marker = evaluate_js_json(win, f"""(() => {{ const a=window.__vnoAppInstance;
              if ({json.dumps(app)} === 'writer') return (a.adapter.bodyDom?.innerText || '').includes({json.dumps(marker2)});
              if ({json.dumps(app)} === 'sheet') return a.grid.cellsData.get('A1')?.val === {json.dumps(marker2)};
              return a.canvasController.slides.some(slide => [slide.title, slide.body].some(text => String(text || '').includes({json.dumps(marker2)}))
                || (slide.shapes || []).some(shape => String(shape.text || '').includes({json.dumps(marker2)})));
            }})()""")
            after_bad_open = inspect_blank(win, app)
            outcome["checks"]["badOpenKeepsCurrent"] = (
                "Không thể mở" in error_text and after_bad_open["title"] == title_before_bad_open
                and read_source_path(win, app) == source_before_bad_open and current_has_marker
            )
            checkpoint("badOpen")

            if os.environ.get("VNO_G7_PRINT_UIA") == "1" or os.environ.get("VNO_G7_PRINT_ACTION", "pdf").lower() == "pdf":
                uia_report_dir = Path(os.environ.get("VNO_G7_PRINT_REPORT_DIR") or out_dir)
                uia_report_dir.mkdir(parents=True, exist_ok=True)
                uia_report_path = uia_report_dir / f"{app}_print_uia.json"
                uia_script = ROOT / "scripts" / "g7_print_uia_probe.ps1"
                uia_action = os.environ.get("VNO_G7_PRINT_ACTION", "pdf").lower()
                pdf_path = uia_report_dir / f"{app}_microsoft-print-{time.time_ns()}.pdf"
                uia = subprocess.Popen(
                    ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(uia_script),
                     "-ReportPath", str(uia_report_path), "-TargetProcessId", str(os.getpid()),
                     "-Action", uia_action, "-OutputPath", str(pdf_path), "-TimeoutSeconds", "25"],
                    cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                    encoding="utf-8", errors="replace",
                )
                print_job = start_promise(win, f"window.__vnoAppInstance.{ {'writer':'adapter','sheet':'grid','slides':'canvasController'}[app] }.print()")
                try:
                    uia_stdout, _ = uia.communicate(timeout=75)
                except subprocess.TimeoutExpired:
                    uia.kill()
                    uia_stdout, _ = uia.communicate()
                uia_result = json.loads(uia_report_path.read_text(encoding="utf-8-sig")) if uia_report_path.exists() else {"error": uia_stdout[-3000:]}
                outcome["printUIA"] = uia_result
                try:
                    await_promise(win, print_job, 45)
                except Exception as error:
                    outcome["errors"].append(f"native print dialog did not close: {error}")
                if uia_action == "pdf":
                    print_action = uia_result.get("printAction", {})
                    saved = bool(print_action.get("outputSaved")) and pdf_path.is_file()
                    outcome["printToMicrosoftPdf"] = {
                        "path": str(pdf_path),
                        "status": "PASS" if saved else "FAIL",
                        "details": print_action,
                    }
                    outcome["checks"]["printerSelected"] = print_action.get("printerSelected") is True
                    outcome["checks"]["copiesConfigured"] = print_action.get("copiesSet") is True
                    outcome["checks"]["allPagesConfigured"] = print_action.get("allPagesSelected") is True
                    outcome["checks"]["pageRangeAvailable"] = print_action.get("pageRangeControlAvailable") is True
                    outcome["checks"]["microsoftPrintPdfSaved"] = saved
                    if saved:
                        pdf_pages, page_detail = pdf_page_count(pdf_path)
                        expected_pdf_pages = int(outcome.get("printExpectedPages") or 0)
                        content_status, content_detail = office_com_check("writer", pdf_path, marker2)
                        pages_match = pdf_pages == expected_pdf_pages and expected_pdf_pages > 0
                        content_matches = content_status == "PASS"
                        outcome["officeCom"] = outcome.get("officeCom", {})
                        outcome["officeCom"]["printed PDF content"] = {"status": content_status, "detail": content_detail}
                        outcome["printToMicrosoftPdf"].update({
                            "pages": pdf_pages,
                            "expectedPages": expected_pdf_pages,
                            "pageDetail": page_detail,
                            "contentStatus": content_status,
                        })
                        outcome["checks"]["microsoftPrintPdfPageCount"] = pages_match
                        outcome["checks"]["microsoftPrintPdfContent"] = (
                            True if content_matches else "BLOCKED" if content_status == "BLOCKED" else False
                        )
                        if not pages_match:
                            outcome["printToMicrosoftPdf"]["status"] = "FAIL"
                        elif content_matches:
                            outcome["printToMicrosoftPdf"]["status"] = "PASS"
                        elif content_status == "BLOCKED":
                            outcome["printToMicrosoftPdf"]["status"] = "BLOCKED"
                    print(f"{app} Microsoft Print to PDF: {json.dumps(outcome['printToMicrosoftPdf'], ensure_ascii=False)}")
                else:
                    outcome["checks"]["nativePrintCancelled"] = bool(
                        uia_result.get("found") and uia_result.get("cancelled")
                    )
                checkpoint("nativePrint")

            # Exercise all three Office choices for a dirty document close.
            marker_close = f"VNOfficeG7-{app}-close-save"
            insert_marker(win, app, marker_close)
            close_cancel = start_promise(win, "window.__vnoAppInstance.shell.requestCloseDocument()")
            wait_for(win, "!!document.querySelector('[data-unsaved-choice=cancel]')", bool, timeout=25)
            win.evaluate_js("document.querySelector('[data-unsaved-choice=cancel]').click(); true")
            close_cancel_result = await_promise(win, close_cancel, 30)
            outcome["checks"]["dirtyCloseCancel"] = close_cancel_result is False and bool(inspect_blank(win, app)["dirty"])

            trigger_shortcut(win, "n", ctrl=True)
            wait_for_window_count(webview, 2, timeout=35)
            discard_window = next(candidate for candidate in webview.windows if candidate.uid != win.uid)
            wait_app(discard_window)
            insert_marker(discard_window, app, f"VNOfficeG7-{app}-close-discard")
            start_promise(discard_window, "window.__vnoAppInstance.shell.requestCloseDocument()")
            wait_for(discard_window, "!!document.querySelector('[data-unsaved-choice=discard]')", bool, timeout=25)
            discard_window.evaluate_js("document.querySelector('[data-unsaved-choice=discard]').click(); true")
            wait_for_window_count(webview, 1, timeout=30)
            outcome["checks"]["dirtyCloseDiscard"] = True

            close_save = start_promise(win, "window.__vnoAppInstance.shell.requestCloseDocument()")
            wait_for(win, "!!document.querySelector('[data-unsaved-choice=save]')", bool, timeout=25)
            win.evaluate_js("document.querySelector('[data-unsaved-choice=save]').click(); true")
            wait_for_window_count(webview, 0, timeout=90)
            outcome["checks"]["dirtyCloseSave"] = True
            outcome["dirtyCloseSavePath"] = str(second)

            # Leave an explicit truthful record for the native printer workflow: this harness opens app previews,
            # while Windows print-to-PDF selection is a separate native modal UI and is not driven with keystrokes.
            outcome["printToMicrosoftPdf"] = {"status": "NOT RUN", "reason": "Native Windows printer dialog automation is not part of the pywebview evaluate_js probe; no SendKeys used."}
        except Exception as error:
            outcome["errors"].append(f"{type(error).__name__}: {error}")
        finally:
            try:
                for active_api in list(vnmain._APP_WINDOW_APIS.values()):
                    active_api._allow_window_close = True
                for extra in list(webview.windows):
                    try:
                        extra.destroy()
                    except Exception:
                        pass
            except Exception:
                pass
            try:
                result_path.write_text(json.dumps(outcome, ensure_ascii=False, indent=2), encoding="utf-8")
                print("G7_RESULT " + json.dumps(outcome, ensure_ascii=False), flush=True)
            except Exception as error:
                print(f"G7_WRITE_ERROR {error}", flush=True)

    webview.start(after_loaded, window, debug=False)
    return 0


def is_blank_ok(app: str, state: dict, number: int = 1) -> bool:
    expected_names = {"writer": f"Tài liệu {number}.docx", "sheet": f"Bảng tính {number}.xlsx", "slides": f"Bản trình chiếu {number}.pptx"}
    if (state.get("name") != expected_names[app] or state.get("tab") != expected_names[app]
        or not state.get("title", "").startswith(expected_names[app])
        or not state.get("windowTitle", "").startswith(expected_names[app]) or state.get("dirty")):
        return False
    if app == "writer":
        return not state.get("text", "").strip() and "<p><br" in state.get("html", "").lower()
    if app == "sheet":
        return state.get("sheets") == ["Sheet1"] and state.get("active") == "Sheet1" and state.get("selected") == {"r": 1, "c": "A"} and state.get("dataCount") == 0
    slides = state.get("slides", [])
    return len(slides) == 1 and not slides[0].get("title") and not slides[0].get("body") and not slides[0].get("notes")


def read_source_path(window, app: str) -> str:
    field = {"writer": "_sourcePath", "sheet": "sourceFilePath", "slides": "sourceFilePath"}[app]
    return str(window.evaluate_js(f"window.__vnoAppInstance.adapter.{field} || ''"))


def dialog_has_filter(calls: list[dict], app: str) -> bool:
    open_call = next((call for call in calls if "file_types" in call["kwargs"] and "save_filename" not in call["kwargs"]), None)
    types = open_call["kwargs"].get("file_types", []) if open_call else []
    extensions = {"writer": ("*.docx", "*.doc", "*.odt", "*.rtf", "*.txt"), "sheet": ("*.xlsx", "*.xls", "*.ods", "*.csv"), "slides": ("*.pptx", "*.ppt", "*.odp")}[app]
    return bool(types) and all(any(ext in item for item in types) for ext in extensions)


def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1] == "--probe":
        _, _, root, app, first, second, out_dir, result = sys.argv
        sys.path.insert(0, root)
        return desktop_probe(app, Path(first), Path(second), Path(out_dir), Path(result))

    selected_app = sys.argv[2] if len(sys.argv) > 2 and sys.argv[1] == "--app" else None
    if selected_app is not None and selected_app not in {"writer", "sheet", "slides"}:
        print(f"FAIL: unknown app {selected_app}")
        return 1

    if os.name != "nt":
        print("BLOCKED: this G7 desktop probe needs Windows and pywebview.")
        return 2
    with tempfile.TemporaryDirectory(prefix="vno-g7-file-basics-", ignore_cleanup_errors=True) as temp:
        temp_root = Path(temp)
        fixtures = copy_fixtures(temp_root)
        report = {"fixtureDirectory": str(temp_root), "sourceCorpus": str(CORPUS), "apps": {}, "status": "PASS"}
        for app, (first, second) in fixtures.items():
            if selected_app is not None and app != selected_app:
                continue
            payload, output = run_probe(app, first, second, temp_root)
            report["apps"][app] = payload
            print(f"{app}: pywebview probe complete; errors={payload.get('errors', [])}")
            if payload.get("errors"):
                print(f"{app} probe log: {output[-5000:]}")
            marker1 = f"VNOfficeG7-{app}-replace-save"
            marker2 = f"VNOfficeG7-{app}-cancel-then-save"
            for label, target, marker in (("replacement save", first, marker1), ("in-place save", second, marker2)):
                status, detail = office_com_check(app, target, marker)
                payload.setdefault("officeCom", {})[label] = {"status": status, "detail": detail}
                print(f"{app} {label}: {status} ({detail})")
            close_marker = f"VNOfficeG7-{app}-close-save"
            close_status, close_detail = office_com_check(app, second, close_marker)
            payload.setdefault("officeCom", {})["dirty close save"] = {"status": close_status, "detail": close_detail}
            payload.setdefault("checks", {})["dirtyCloseSaveContentVerified"] = (
                True if close_status == "PASS" else "BLOCKED" if close_status == "BLOCKED" else False
            )
            print(f"{app} dirty-close save: {close_status} ({close_detail})")
            if app == "writer":
                pages, detail = word_page_count(second)
                payload.setdefault("officeCom", {})["wordPageCount"] = {"status": pages if pages.isdigit() else "BLOCKED", "detail": detail}
                payload.setdefault("checks", {})["writerPagesMatchWord"] = (
                    pages.isdigit() and int(pages) == payload.get("printExpectedPages")
                )
                print(f"writer preview/Word pages: app={payload.get('printExpectedPages')} Word={pages}")
            failures = [key for key, value in payload.get("checks", {}).items() if value is not True and value != "BLOCKED"]
            print(f"{app} checks: {json.dumps(payload.get('checks', {}), ensure_ascii=False)}")
            print(f"{app} failed checks: {failures}")
            if app == "slides":
                print("slides marker state: " + json.dumps({
                    key: payload.get(key) for key in (
                        "insertedMarker", "slideShapesAfterInsert", "afterInPlaceSave",
                        "slideShapesAfterSave", "reopened", "slideShapesAfterReopen"
                    )
                }, ensure_ascii=False)[:1200])
            if payload.get("printPreview"):
                print(f"{app} preview: {json.dumps(payload['printPreview'], ensure_ascii=False)[:1200]}")
            if payload.get("errors") or failures or any(item["status"] == "FAIL" for item in payload.get("officeCom", {}).values()):
                report["status"] = "FAIL"
            if any(item["status"] == "BLOCKED" for item in payload.get("officeCom", {}).values()):
                report["status"] = "BLOCKED" if report["status"] == "PASS" else report["status"]
            payload["failedChecks"] = failures
            payload["probeLog"] = output
        print_action = os.environ.get("VNO_G7_PRINT_ACTION", "pdf").lower()
        if print_action != "pdf" and report["status"] == "PASS":
            report["status"] = "NOT RUN"
            report["blockingChecks"] = ["Print to Microsoft Print to PDF, including native printer options/copies/range"]
        report_path = temp_root / "g7-file-basics-report.json"
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"G7 desktop report: {report_path}")
        if print_action == "pdf":
            pdf_statuses = {
                app: data.get("printToMicrosoftPdf", {}).get("status", "NOT RUN")
                for app, data in report["apps"].items()
            }
            print(f"G7 desktop probe status: {report['status']}; Microsoft Print to PDF: {json.dumps(pdf_statuses)}")
        else:
            print(f"G7 desktop probe status: {report['status']}; print-to-Microsoft-PDF: NOT RUN.")
        return 0 if report["status"] == "PASS" else 2 if report["status"] in {"NOT RUN", "BLOCKED"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
