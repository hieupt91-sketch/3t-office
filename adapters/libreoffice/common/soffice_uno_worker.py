"""Private JSON-lines UNO worker for the bundled LibreOffice runtime.

The desktop process owns this helper and its LibreOffice child.  UNO uses a
per-process local pipe; no TCP listener is opened.  Standard output is reserved
for the JSON protocol so the parent can detect crashes and restart cleanly.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


def _write(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def _property(property_type: Any, name: str, value: Any) -> Any:
    prop = property_type()
    prop.Name = name
    prop.Value = value
    return prop


def _connect(uno: Any, pipe_name: str, process: subprocess.Popen[str]) -> Any:
    local_context = uno.getComponentContext()
    resolver = local_context.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local_context
    )
    connection_url = f"uno:pipe,name={pipe_name};urp;StarOffice.ComponentContext"
    deadline = time.monotonic() + 90
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"Bộ xử lý tài liệu đã dừng khi khởi động. Hãy thử lại.")
        try:
            return resolver.resolve(connection_url)
        except Exception as exc:  # pipe listener is not ready yet
            last_error = exc
            time.sleep(0.1)
    raise TimeoutError(f"Bộ xử lý tài liệu chưa sẵn sàng. Hãy thử lại.")


def _convert(desktop: Any, uno: Any, property_type: Any, request: dict[str, Any]) -> dict[str, Any]:
    source_path = str(Path(request["source_path"]).resolve())
    output_path = str(Path(request["output_path"]).resolve())
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    load_properties = [
        _property(property_type, "Hidden", True),
        _property(property_type, "Silent", True),
        # These conversions only import the source into an intermediate file;
        # opening read-only matches the CLI converter and handles DOCX files
        # that LibreOffice's interactive UNO loader otherwise declines.
        _property(property_type, "ReadOnly", True),
    ]
    input_filter = request.get("input_filter")
    if input_filter:
        load_properties.append(_property(property_type, "FilterName", str(input_filter)))
    input_filter_options = request.get("input_filter_options")
    if input_filter_options:
        load_properties.append(
            _property(property_type, "FilterOptions", str(input_filter_options))
        )

    started = time.monotonic()
    document = desktop.loadComponentFromURL(
        uno.systemPathToFileUrl(source_path), "_blank", 0, tuple(load_properties)
    )
    if document is None:
        raise RuntimeError("Không mở được tài liệu gốc.")

    try:
        store_properties = [_property(property_type, "Overwrite", True)]
        filter_name = request.get("filter_name")
        if filter_name:
            store_properties.append(
                _property(property_type, "FilterName", str(filter_name))
            )
        document.storeToURL(
            uno.systemPathToFileUrl(output_path), tuple(store_properties)
        )
    finally:
        try:
            document.close(True)
        except Exception:
            try:
                document.dispose()
            except Exception:
                pass

    if not os.path.isfile(output_path):
        raise RuntimeError("Không tạo được tệp đầu ra.")
    return {
        "ok": True,
        "output_path": output_path,
        "output_bytes": os.path.getsize(output_path),
        "elapsed_ms": round((time.monotonic() - started) * 1000, 1),
    }


def _load_hidden_document(desktop: Any, uno: Any, property_type: Any, path: str) -> Any:
    load_properties = (
        _property(property_type, "Hidden", True),
        _property(property_type, "Silent", True),
        _property(property_type, "ReadOnly", True),
    )
    document = desktop.loadComponentFromURL(
        uno.systemPathToFileUrl(str(Path(path).resolve())),
        "_blank",
        0,
        load_properties,
    )
    if document is None:
        raise RuntimeError("Không mở được PDF để xử lý.")
    return document


def _close_hidden_document(document: Any) -> None:
    try:
        document.close(True)
    except Exception:
        try:
            document.dispose()
        except Exception:
            pass


def _inspect_pdf(desktop: Any, uno: Any, property_type: Any, request: dict[str, Any]) -> dict[str, Any]:
    document = _load_hidden_document(desktop, uno, property_type, request["pdf_path"])
    try:
        pages = document.getDrawPages()
        page_count = int(pages.getCount())
        if page_count < 1:
            raise RuntimeError("PDF không có trang để in.")
        return {"ok": True, "page_count": page_count}
    finally:
        _close_hidden_document(document)


def _render_pdf_page(desktop: Any, uno: Any, property_type: Any, request: dict[str, Any]) -> dict[str, Any]:
    page_index = int(request["page_index"])
    output_path = str(Path(request["output_path"]).resolve())
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    document = _load_hidden_document(desktop, uno, property_type, request["pdf_path"])
    try:
        pages = document.getDrawPages()
        if page_index < 0 or page_index >= int(pages.getCount()):
            raise ValueError("Số trang xem trước nằm ngoài PDF.")
        controller = document.getCurrentController()
        if controller is None:
            raise RuntimeError("Không đọc được trang PDF để xem trước.")
        controller.setCurrentPage(pages.getByIndex(page_index))
        document.storeToURL(
            uno.systemPathToFileUrl(output_path),
            (
                _property(property_type, "FilterName", "draw_png_Export"),
                _property(property_type, "Overwrite", True),
            ),
        )
        if not os.path.isfile(output_path) or os.path.getsize(output_path) <= 0:
            raise RuntimeError("Không tạo được ảnh trang PDF.")
        return {"ok": True, "output_path": output_path, "output_bytes": os.path.getsize(output_path)}
    finally:
        _close_hidden_document(document)


def _print_pdf(desktop: Any, uno: Any, property_type: Any, request: dict[str, Any]) -> dict[str, Any]:
    printer_name = str(request.get("printer") or "").strip()
    if not printer_name:
        raise ValueError("Chưa chọn máy in.")
    copies = int(request.get("copies", 1))
    if not 1 <= copies <= 999:
        raise ValueError("Số bản phải từ 1 đến 999.")
    document = _load_hidden_document(desktop, uno, property_type, request["pdf_path"])
    try:
        options = [
            _property(property_type, "PrinterName", printer_name),
            _property(property_type, "CopyCount", uno.Any("short", copies)),
            _property(property_type, "Wait", True),
        ]
        pages = str(request.get("pages") or "").strip()
        if pages:
            options.append(_property(property_type, "Pages", pages))
        document.print(tuple(options))
        return {"ok": True, "printer": printer_name}
    finally:
        _close_hidden_document(document)


def _stop_server(desktop: Any, process: subprocess.Popen[str] | None) -> None:
    if desktop is not None:
        try:
            desktop.terminate()
        except Exception:
            pass
    if process is None or process.poll() is not None:
        return
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        if os.name == "nt":
            try:
                subprocess.run(
                    ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=False,
                    timeout=3,
                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                )
            except (OSError, subprocess.TimeoutExpired):
                pass
        if process.poll() is not None:
            return
        process.terminate()
        try:
            process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=3)


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if len(args) != 4:
        _write({"ready": False, "error": "Không khởi động được bộ xử lý tài liệu. Vui lòng cài lại 3T Office."})
        return 2

    soffice_path, profile_uri, pipe_name, app_kind = args
    program_dir = Path(soffice_path).resolve().parent
    os.environ["UNO_PATH"] = str(program_dir)
    os.environ["URE_BOOTSTRAP"] = f"vnd.sun.star.pathname:{program_dir / 'fundamental.ini'}"
    sys.path.insert(0, str(program_dir))

    process: subprocess.Popen[str] | None = None
    desktop = None
    try:
        import uno  # provided by the adjacent LibreOffice program directory
        from com.sun.star.beans import PropertyValue

        command = [
            soffice_path,
            "--headless",
            "--invisible",
            "--nocrashreport",
            "--nodefault",
            "--nolockcheck",
            "--nologo",
            "--norestore",
            "--nofirststartwizard",
            f"--accept=pipe,name={pipe_name};urp;StarOffice.ServiceManager",
            f"-env:UserInstallation={profile_uri}",
        ]
        creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        process = subprocess.Popen(
            command,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            text=True,
            creationflags=creationflags,
        )
        context = _connect(uno, pipe_name, process)
        desktop = context.ServiceManager.createInstanceWithContext(
            "com.sun.star.frame.Desktop", context
        )
        _write({"ready": True, "app_kind": app_kind, "soffice_pid": process.pid})

        for line in sys.stdin:
            request = None
            try:
                request = json.loads(line)
                if request.get("op") == "shutdown":
                    _write({"ok": True, "shutdown": True})
                    return 0
                operation = request.get("op")
                if operation == "convert":
                    response = _convert(desktop, uno, PropertyValue, request)
                elif operation == "inspect_pdf":
                    response = _inspect_pdf(desktop, uno, PropertyValue, request)
                elif operation == "render_pdf_page":
                    response = _render_pdf_page(desktop, uno, PropertyValue, request)
                elif operation == "print_pdf":
                    response = _print_pdf(desktop, uno, PropertyValue, request)
                else:
                    raise ValueError("unsupported worker operation")
                _write({"id": request.get("id"), **response})
            except Exception as exc:
                _write({
                    "id": request.get("id") if isinstance(request, dict) else None,
                    "ok": False,
                    "error": str(exc)[:1000],
                })
    except Exception as exc:
        _write({"ready": False, "error": str(exc)[:1000]})
        return 1
    finally:
        _stop_server(desktop, process)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
