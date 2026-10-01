"""Measure real-app canvas, print-preview PDF, and Export PDF page counts.

Usage:
  python scripts/layout-audit/_print_page_audit.py <worktree> <out-dir> <file> [file ...]

Each document is opened in its own real pywebview app process, then the current
adapter serializer is sent through the same bridge routes used by Print and
Export PDF. Documents are processed sequentially because both the app and
LibreOffice use persistent local services.

Set VN_PRINT_USE_OFFICE=0 to force a LibreOffice-only fallback audit.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path


def _worker(root: str, app_kind: str, document_path: str, output_dir: str) -> int:
    sys.path.insert(0, root)
    import webview
    import main as vnmain

    use_office = os.environ.get("VN_PRINT_USE_OFFICE", "1").strip() != "0"
    if not use_office:
        # Simulate Office/WPS not installed in this isolated audit process;
        # product code and the user's registry are left untouched.
        vnmain._OFFICE_COM_MODULE.get_office_engine_info = lambda _kind: {
            "status": "ok", "available": False, "engine": "LibreOffice", "progId": "",
        }

    document = Path(document_path).resolve()
    out = Path(output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    app_kind_from_path, initial_file = vnmain.parse_launch_args([str(document)])
    if app_kind_from_path != app_kind:
        raise ValueError(f"Expected {app_kind}, got {app_kind_from_path} for {document}")

    server, port = vnmain._start_static_server()
    api = vnmain.VnOfficeApi(app_kind=app_kind, initial_file=initial_file)
    window = webview.create_window(
        title=f"VN Office print page audit - {document.name}",
        url=vnmain.build_launch_url(app_kind, initial_file, port=port),
        width=1400,
        height=900,
        js_api=api,
    )
    expected_path = json.dumps(str(document), ensure_ascii=False)
    state_script = f"""(function() {{
      const app = window.__vnoAppInstance;
      const a = app && app.adapter;
      if (!a) return JSON.stringify({{loaded:false}});
      const sourcePath = a._sourcePath || a.sourceFilePath || '';
      const norm = s => String(s || '').replace(/\\\\/g, '/').toLowerCase();
      const sourceMatches = norm(sourcePath) === norm({expected_path});
      let canvasPages = null;
      if ({json.dumps(app_kind)} === 'writer') canvasPages = Number(a._livePageCount) || 1;
      const sheetMetadata = {json.dumps(app_kind)} === 'sheet' ? {{
        names: a.grid?.sheets || [], active: a.grid?.activeSheet || '',
        cells: a.grid?.cellsData?.size || 0,
        pageSetupBySheet: a.grid?.pageSetupBySheet || {{}},
        printAreaBySheet: a.grid?.printAreaBySheet || {{}}
      }} : null;
      const sheetReady = !sheetMetadata || (
        sheetMetadata.names.length > 0 && Boolean(sheetMetadata.active) &&
        (sheetMetadata.cells > 0 || sheetMetadata.names.some(name => name !== 'Sheet1'))
      );
      const loaded = sourceMatches && sheetReady;
      return JSON.stringify({{
        loaded, sourcePath,
        canvasPages,
        sheetMetadata,
        documentName: a.sourceFileName || app.shell?.documentName || {json.dumps(document.stem)},
        status: (window.document.querySelector('.vno-statusbar-left')?.textContent || '').replace(/\\s+/g, ' ').trim()
      }});
    }})()"""
    content_script = f"""(function() {{
      const app = window.__vnoAppInstance;
      const a = app && app.adapter;
      if (!a) return JSON.stringify({{content:''}});
      let content = '';
      if ({json.dumps(app_kind)} === 'writer') content = a._contentForExport();
      else if ({json.dumps(app_kind)} === 'sheet') content = a.serializeToFods();
      else content = a.serializeToFodp();
      return JSON.stringify({{content}});
    }})()"""

    outcome: dict[str, object] = {"file": document.name, "app": app_kind}
    outcome["office_requested"] = use_office

    def after_load(win):
        try:
            previous = None
            stable_seconds = 0
            state = None
            for attempt in range(900):
                raw = win.evaluate_js(state_script)
                state = json.loads(raw) if isinstance(raw, str) else raw
                if state and state.get("loaded"):
                    sheet_metadata = state.get("sheetMetadata") or {}
                    signature = (
                        state.get("canvasPages"),
                        state.get("sourcePath"),
                        tuple(sheet_metadata.get("names", [])),
                        sheet_metadata.get("active"),
                        sheet_metadata.get("cells"),
                    )
                    stable_seconds = stable_seconds + 1 if signature == previous else 0
                    previous = signature
                    # The source path is assigned just before Writer finishes
                    # rendering and pagination. Let the real canvas settle for
                    # ten seconds so this cannot capture its pre-layout count.
                    if stable_seconds >= 10:
                        break
                else:
                    stable_seconds = 0
                if attempt % 30 == 0:
                    print(
                        f"WAIT {document.name}: loaded={bool(state and state.get('loaded'))} "
                        f"source={state.get('sourcePath') if state else ''} "
                        f"status={state.get('status') if state else ''}",
                        flush=True,
                    )
                import time
                time.sleep(1)
            if not state or not state.get("loaded") or stable_seconds < 10:
                raise RuntimeError(f"VN app did not finish loading {document}: {state}")

            raw_content = win.evaluate_js(content_script)
            content_state = json.loads(raw_content) if isinstance(raw_content, str) else raw_content
            content = content_state.get("content", "") if isinstance(content_state, dict) else ""
            if not content:
                raise RuntimeError(f"VN app returned no serialized document content for {document}")
            source_path = state["sourcePath"]
            dialog_only = app_kind == "sheet" and os.environ.get("VNO_PRINT_AUDIT_DIALOG_ONLY") == "1"
            # Leave the reporting-consent preference untouched; dismiss only the
            # startup prompt so it cannot block this local print audit.
            win.evaluate_js(
                "document.querySelector('.vno-error-reporting-overlay [data-dialog-close]')?.click()"
            )
            if dialog_only:
                cached_content = json.dumps(content, ensure_ascii=False)
                win.evaluate_js(
                    f"(function() {{ const a = window.__vnoAppInstance.adapter; "
                    f"a.serializeToFods = () => {cached_content}; return true; }})()"
                )
            outcome.update({
                "canvas_pages": state.get("canvasPages"),
                "source_path": source_path,
            })
            if state.get("sheetMetadata") is not None:
                outcome["sheet_metadata"] = state["sheetMetadata"]
            print(f"READY {document.name}: canvas={state.get('canvasPages')}", flush=True)

            printed = {}
            if not dialog_only:
                printed = api.prepare_print_document(
                    app_kind, content, str(state.get("documentName") or document.stem), source_path,
                    use_office,
                )
                if printed.get("status") != "ok":
                    raise RuntimeError(f"VN Print preview failed: {printed}")
                outcome["print_pages"] = int(printed["pageCount"])
                outcome["print_engine"] = printed.get("engine", "LibreOffice")
                session = api._print_pipeline._sessions.get(printed.get("sessionId"), {})
                session_root = Path(session.get("temp_dir").name) if session.get("temp_dir") else None
                if session.get("pdf_path"):
                    print_pdf_copy = out / f"{document.stem}.print.pdf"
                    import shutil
                    shutil.copyfile(session["pdf_path"], print_pdf_copy)
                    outcome["print_pdf"] = str(print_pdf_copy)
                if session_root:
                    native_suffix = {"writer": ".docx", "sheet": ".xlsx", "slides": ".pptx"}.get(app_kind)
                    native = next(iter(session_root.glob(f"*{native_suffix}")), None) if native_suffix else None
                    if native:
                        native_copy = out / f"{document.stem}.print-source{native.suffix}"
                        shutil.copyfile(native, native_copy)
                        outcome["print_source"] = str(native_copy)

                export_path = out / f"{document.stem}.export.pdf"
                win.create_file_dialog = lambda *args, **kwargs: str(export_path)
                exported = api._export_pdf_dialog_impl(
                    content, app_kind, str(state.get("documentName") or document.stem), source_path,
                )
                if exported.get("status") != "ok":
                    raise RuntimeError(f"VN Export PDF failed: {exported}")
                export_pdf = str(exported.get("path") or export_path)
                outcome["export_engine"] = exported.get("engine", "LibreOffice")
                outcome["export_pages"] = int(
                    api._print_pipeline._inspect_pdf(app_kind, export_pdf)
                )
                outcome["export_pdf"] = export_pdf

            if app_kind == "sheet":
                if not dialog_only:
                    whole_workbook = api.prepare_print_document(
                        app_kind,
                        content,
                        str(state.get("documentName") or document.stem),
                        source_path,
                        use_office,
                        {"sheetScope": "workbook"},
                    )
                    if whole_workbook.get("status") != "ok":
                        raise RuntimeError(f"VN whole-workbook print failed: {whole_workbook}")
                    outcome["whole_workbook_pages"] = int(whole_workbook["pageCount"])
                    outcome["whole_workbook_engine"] = whole_workbook.get("engine", "LibreOffice")
                    whole_session = api._print_pipeline._sessions.get(whole_workbook.get("sessionId"), {})
                    if whole_session.get("pdf_path"):
                        whole_pdf_copy = out / f"{document.stem}.whole-workbook.pdf"
                        import shutil
                        shutil.copyfile(whole_session["pdf_path"], whole_pdf_copy)
                        outcome["whole_workbook_pdf"] = str(whole_pdf_copy)
                    if whole_workbook.get("sessionId"):
                        api._print_pipeline.cancel(whole_workbook["sessionId"])

                # Open the production dialog in the pywebview desktop and exercise
                # the workbook/selection radios through the same click path users use.
                launched = win.evaluate_js(
                    "(window.__vnoAppInstance.adapter.print(), true)"
                )
                if not launched:
                    raise RuntimeError("Could not open the Sheet print dialog in the desktop app")
                inspect_dialog = """(() => {
                  const dialog = document.querySelector('.vno-print-dialog-overlay');
                  if (!dialog) return null;
                  const radios = [...dialog.querySelectorAll('input[name="sheetScope"]')];
                  return {
                    labels: radios.map(radio => radio.parentElement.querySelector('span')?.textContent || ''),
                    selected: radios.find(radio => radio.checked)?.value || '',
                    selectionEnabled: Boolean(radios.find(radio => radio.value === 'selection') && !radios.find(radio => radio.value === 'selection').disabled),
                    total: Number(dialog.querySelector('.vno-print-total')?.textContent || 0),
                    engine: dialog.querySelector('.vno-print-engine-used')?.textContent || '',
                    officeChecked: Boolean(dialog.querySelector('#vno-print-use-office')?.checked),
                    ready: Boolean(dialog.querySelector('.vno-print-submit') && !dialog.querySelector('.vno-print-submit').disabled)
                  };
                })()"""
                dialog_state = None
                for _ in range(180):
                    raw = win.evaluate_js(inspect_dialog)
                    dialog_state = json.loads(raw) if isinstance(raw, str) else raw
                    if dialog_state and dialog_state.get("ready"):
                        break
                    import time
                    time.sleep(1)
                if not dialog_state:
                    raise RuntimeError("Sheet print dialog did not render in the desktop app")
                outcome["dialog_scope_labels"] = dialog_state.get("labels", [])
                outcome["dialog_default_scope"] = dialog_state.get("selected")
                outcome["dialog_selection_enabled"] = dialog_state.get("selectionEnabled")
                outcome["dialog_default_pages"] = dialog_state.get("total")
                outcome["dialog_default_engine"] = dialog_state.get("engine")
                outcome["dialog_office_checked"] = dialog_state.get("officeChecked")
                if len(dialog_state.get("labels", [])) != 3 or dialog_state.get("selected") != "active":
                    raise RuntimeError(f"Unexpected Sheet print scope controls: {dialog_state}")
                if dialog_only:
                    outcome["print_pages"] = int(dialog_state.get("total") or 0)
                    outcome["print_engine"] = dialog_state.get("engine")

                win.evaluate_js("""(() => {
                  const radio = document.querySelector('.vno-print-dialog-overlay input[name="sheetScope"][value="workbook"]');
                  if (!radio) return false;
                  radio.click();
                  return true;
                })()""")
                workbook_dialog_state = None
                for _ in range(300):
                    raw = win.evaluate_js(inspect_dialog)
                    workbook_dialog_state = json.loads(raw) if isinstance(raw, str) else raw
                    if workbook_dialog_state and workbook_dialog_state.get("ready") and workbook_dialog_state.get("selected") == "workbook":
                        break
                    import time
                    time.sleep(1)
                if not workbook_dialog_state or workbook_dialog_state.get("selected") != "workbook":
                    raise RuntimeError("The desktop dialog did not switch to whole-workbook scope")
                outcome["dialog_workbook_pages"] = workbook_dialog_state.get("total")
                outcome["dialog_workbook_engine"] = workbook_dialog_state.get("engine")
                outcome["dialog_workbook_scope_matches_api"] = (
                    workbook_dialog_state.get("total") == outcome["whole_workbook_pages"]
                ) if not dialog_only else None
                if dialog_only:
                    outcome["whole_workbook_pages"] = int(workbook_dialog_state.get("total") or 0)
                    outcome["whole_workbook_engine"] = workbook_dialog_state.get("engine")

                if workbook_dialog_state.get("selectionEnabled"):
                    win.evaluate_js("""(() => {
                      const radio = document.querySelector('.vno-print-dialog-overlay input[name="sheetScope"][value="selection"]');
                      if (!radio) return false;
                      radio.click();
                      return true;
                    })()""")
                    selection_dialog_state = None
                    for _ in range(300):
                        raw = win.evaluate_js(inspect_dialog)
                        selection_dialog_state = json.loads(raw) if isinstance(raw, str) else raw
                        if selection_dialog_state and selection_dialog_state.get("ready") and selection_dialog_state.get("selected") == "selection":
                            break
                        import time
                        time.sleep(1)
                    outcome["dialog_selection_scope_ready"] = bool(
                        selection_dialog_state and selection_dialog_state.get("selected") == "selection"
                    )
                    outcome["dialog_selection_pages"] = (
                        selection_dialog_state.get("total") if selection_dialog_state else None
                    )
                    outcome["dialog_selection_engine"] = (
                        selection_dialog_state.get("engine") if selection_dialog_state else None
                    )
                    if not outcome["dialog_selection_scope_ready"]:
                        raise RuntimeError("The desktop dialog did not prepare the selected cell range")
                win.evaluate_js(
                    "document.querySelector('.vno-print-dialog-overlay .vno-print-cancel')?.click()"
                )

            session_id = printed.get("sessionId")
            if session_id:
                api._print_pipeline.cancel(session_id)
            outcome["status"] = "ok"
        except Exception as exc:
            outcome["status"] = "error"
            outcome["error"] = f"{type(exc).__name__}: {exc}"
        finally:
            out_json = out / f"{document.stem}.print-pages.json"
            out_json.write_text(json.dumps(outcome, ensure_ascii=False, indent=2), encoding="utf-8")
            print("RESULT " + json.dumps(outcome, ensure_ascii=False), flush=True)
            try:
                win.destroy()
            except Exception:
                pass

    webview.start(after_load, window, debug=os.environ.get("VNO_PRINT_AUDIT_DEBUG") == "1")
    return 0 if outcome.get("status") == "ok" else 1


def _run_one(root: str, out_dir: str, path: Path) -> dict[str, object]:
    suffix = path.suffix.lower()
    app_kind = (
        "writer" if suffix in {".docx", ".doc", ".odt"}
        else "sheet" if suffix in {".xlsx", ".xls", ".ods"}
        else "slides" if suffix in {".pptx", ".ppt", ".odp"}
        else None
    )
    if not app_kind:
        return {"file": path.name, "status": "unsupported extension"}
    cmd = [sys.executable, str(Path(__file__).resolve()), "--worker", root, app_kind, str(path.resolve()), out_dir]
    result_path = Path(out_dir) / f"{path.stem}.print-pages.json"
    result_path.unlink(missing_ok=True)
    result = subprocess.run(cmd, cwd=root, timeout=1800)
    if result_path.is_file():
        data = json.loads(result_path.read_text(encoding="utf-8"))
        data["worker_exit_code"] = result.returncode
        return data
    return {
        "file": path.name,
        "status": "worker failed",
        "worker_exit_code": result.returncode,
    }


def main() -> int:
    args = sys.argv[1:]
    if args and args[0] == "--worker":
        if len(args) != 5:
            raise SystemExit("--worker <worktree> <app-kind> <file> <out-dir>")
        return _worker(*args[1:])
    if len(args) < 3:
        raise SystemExit("<worktree> <out-dir> <file> [file ...]")

    root = str(Path(args[0]).resolve())
    out_dir = str(Path(args[1]).resolve())
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    files = [Path(name).resolve() for name in args[2:]]
    report_path = Path(out_dir) / "print-page-audit.json"
    rows = []
    for path in files:
        if not path.is_file():
            row = {"file": path.name, "status": "missing"}
        else:
            row = _run_one(root, out_dir, path)
        rows.append(row)
        print(json.dumps(row, ensure_ascii=False), flush=True)
        report_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"REPORT {report_path}", flush=True)
    return 0 if all(row.get("status") == "ok" for row in rows) else 1


if __name__ == "__main__":
    raise SystemExit(main())
