"""Measure real-app canvas, print-preview PDF, and Export PDF page counts.

Usage:
  python scripts/layout-audit/_print_page_audit.py <worktree> <out-dir> <file> [file ...]

Each document is opened in its own real pywebview app process, then the current
adapter serializer is sent through the same bridge routes used by Print and
Export PDF. Documents are processed sequentially because both the app and
LibreOffice use persistent local services.
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
      const loaded = norm(sourcePath) === norm({expected_path});
      let content = '';
      if (loaded) {{
        if ({json.dumps(app_kind)} === 'writer') content = a._contentForExport();
        else if ({json.dumps(app_kind)} === 'sheet') content = a.serializeToFods();
        else content = a.serializeToFodp();
      }}
      let canvasPages = null;
      if ({json.dumps(app_kind)} === 'writer') canvasPages = Number(a._livePageCount) || 1;
      const sheetMetadata = {json.dumps(app_kind)} === 'sheet' ? {{
        names: a.grid?.sheets || [], active: a.grid?.activeSheet || '',
        pageSetupBySheet: a.grid?.pageSetupBySheet || {{}}
      }} : null;
      return JSON.stringify({{
        loaded, sourcePath, content,
        canvasPages,
        sheetMetadata,
        documentName: a.sourceFileName || app.shell?.documentName || {json.dumps(document.stem)},
        status: (window.document.querySelector('.vno-statusbar-left')?.textContent || '').replace(/\\s+/g, ' ').trim()
      }});
    }})()"""

    outcome: dict[str, object] = {"file": document.name, "app": app_kind}

    def after_load(win):
        try:
            previous = None
            stable_seconds = 0
            state = None
            for attempt in range(900):
                raw = win.evaluate_js(state_script)
                state = json.loads(raw) if isinstance(raw, str) else raw
                if state and state.get("loaded") and state.get("content"):
                    signature = (state.get("canvasPages"), len(state["content"]))
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
            if not state or not state.get("loaded") or not state.get("content") or stable_seconds < 10:
                raise RuntimeError(f"VN app did not finish loading {document}: {state}")

            content = state["content"]
            source_path = state["sourcePath"]
            outcome.update({
                "canvas_pages": state.get("canvasPages"),
                "source_path": source_path,
            })
            if state.get("sheetMetadata") is not None:
                outcome["sheet_metadata"] = state["sheetMetadata"]
            print(f"READY {document.name}: canvas={state.get('canvasPages')}", flush=True)

            printed = api.prepare_print_document(
                app_kind, content, str(state.get("documentName") or document.stem), source_path,
            )
            if printed.get("status") != "ok":
                raise RuntimeError(f"VN Print preview failed: {printed}")
            outcome["print_pages"] = int(printed["pageCount"])
            session = api._print_pipeline._sessions.get(printed.get("sessionId"), {})
            session_root = Path(session.get("temp_dir").name) if session.get("temp_dir") else None
            if session_root:
                native_suffix = {"writer": ".docx", "sheet": ".xlsx"}.get(app_kind)
                native = next(iter(session_root.glob(f"*{native_suffix}")), None) if native_suffix else None
                if native:
                    native_copy = out / f"{document.stem}.print-source{native.suffix}"
                    import shutil
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
            outcome["export_pages"] = int(
                api._print_pipeline._inspect_pdf(app_kind, export_pdf)
            )
            outcome["export_pdf"] = export_pdf

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

    webview.start(after_load, window, debug=False)
    return 0 if outcome.get("status") == "ok" else 1


def _run_one(root: str, out_dir: str, path: Path) -> dict[str, object]:
    suffix = path.suffix.lower()
    app_kind = "writer" if suffix in {".docx", ".doc", ".odt"} else "sheet" if suffix in {".xlsx", ".xls", ".ods"} else None
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
