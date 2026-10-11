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


def _soffice_creation_flags() -> int:
    return (
        getattr(subprocess, "CREATE_NO_WINDOW", 0)
        | getattr(subprocess, "ABOVE_NORMAL_PRIORITY_CLASS", 0)
    )


def _connect(uno: Any, endpoint: str, process: subprocess.Popen[str]) -> tuple[Any, int]:
    local_context = uno.getComponentContext()
    resolver = local_context.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local_context
    )
    connection_url = f"uno:{endpoint};urp;StarOffice.ComponentContext"
    deadline = time.monotonic() + 90
    last_error: Exception | None = None
    attempts = 0
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"Bộ xử lý tài liệu đã dừng khi khởi động. Hãy thử lại.")
        try:
            attempts += 1
            return resolver.resolve(connection_url), attempts
        except Exception as exc:  # pipe listener is not ready yet
            last_error = exc
            time.sleep(0.02)
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


def _load_hidden_document(
    desktop: Any,
    uno: Any,
    property_type: Any,
    path: str,
    error_message: str = "Không mở được PDF để xử lý.",
) -> Any:
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
        raise RuntimeError(error_message)
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


# --- P8 view-first: keep a spreadsheet loaded in LibreOffice and answer small window queries. ---
# The convert path above is untouched.  These operations let the UI paint the first screen of a
# very large workbook from the live document model instead of waiting for a full FODS export.
_VIEW_DOCUMENTS: dict[str, Any] = {}


def _view_open(desktop: Any, uno: Any, property_type: Any, request: dict[str, Any]) -> dict[str, Any]:
    started = time.monotonic()
    document = _load_hidden_document(
        desktop, uno, property_type, request["source_path"], "Không mở được tài liệu để xem nhanh."
    )
    try:
        sheets = document.getSheets()  # AttributeError for non-spreadsheet documents
        infos = []
        for index in range(int(sheets.getCount())):
            sheet = sheets.getByIndex(index)
            cursor = sheet.createCursor()
            cursor.gotoEndOfUsedArea(False)
            address = cursor.getRangeAddress()
            infos.append({
                "name": sheet.getName(),
                "rows": int(address.EndRow) + 1,
                "cols": int(address.EndColumn) + 1,
            })
    except Exception:
        _close_hidden_document(document)
        raise
    doc_id = str(request.get("doc_id") or f"view{len(_VIEW_DOCUMENTS) + 1}_{int(started * 1000)}")
    _VIEW_DOCUMENTS[doc_id] = document
    return {
        "ok": True,
        "doc_id": doc_id,
        "sheets": infos,
        "elapsed_ms": round((time.monotonic() - started) * 1000, 1),
    }


def _view_window(request: dict[str, Any]) -> dict[str, Any]:
    started = time.monotonic()
    document = _VIEW_DOCUMENTS.get(str(request.get("doc_id")))
    if document is None:
        raise ValueError("Chưa mở tài liệu để xem nhanh.")
    sheets = document.getSheets()
    sheet = sheets.getByIndex(int(request["sheet"]))
    first_row, first_col = int(request["r0"]), int(request["c0"])
    last_row, last_col = int(request["r1"]), int(request["c1"])
    if first_row < 0 or first_col < 0 or last_row < first_row or last_col < first_col:
        raise ValueError("Vùng xem không hợp lệ.")
    if (last_row - first_row + 1) * (last_col - first_col + 1) > 200_000:
        raise ValueError("Vùng xem quá lớn.")
    cell_range = sheet.getCellRangeByPosition(first_col, first_row, last_col, last_row)
    columns = sheet.getColumns()
    rows = sheet.getRows()
    values = [list(row) for row in cell_range.getDataArray()]
    extra: dict[str, Any] = {}
    if request.get("include_strings"):
        # Display text (number formats applied) only for non-empty cells: ~0.5 ms per cell.
        extra["strings"] = [
            [
                sheet.getCellByPosition(first_col + c, first_row + r).getString()
                if values[r][c] not in ("", None) else ""
                for c in range(last_col - first_col + 1)
            ]
            for r in range(last_row - first_row + 1)
        ]
    if request.get("include_formats"):
        extra["formats"] = _view_format_blocks(document, cell_range)
    return {
        "ok": True,
        **extra,
        "values": values,
        "formulas": [list(row) for row in cell_range.getFormulaArray()],
        # 1/100 mm, as LibreOffice stores them; the UI converts.
        "col_widths": [int(columns.getByIndex(c).Width) for c in range(first_col, last_col + 1)],
        "row_heights": [int(rows.getByIndex(r).Height) for r in range(first_row, last_row + 1)],
        "col_hidden": [not bool(columns.getByIndex(c).IsVisible) for c in range(first_col, last_col + 1)],
        "row_hidden": [not bool(rows.getByIndex(r).IsVisible) for r in range(first_row, last_row + 1)],
        "elapsed_ms": round((time.monotonic() - started) * 1000, 1),
    }


_VIEW_FORMAT_PROPERTIES = (
    "CharFontName", "CharHeight", "CharWeight", "CharPosture", "CharUnderline", "CharStrikeout",
    "CharColor", "CellBackColor", "HoriJustify", "VertJustify", "IsTextWrapped", "NumberFormat",
)


def _enum_name(value: Any) -> Any:
    return getattr(value, "value", value)


def _view_format_blocks(document: Any, cell_range: Any) -> list[dict[str, Any]]:
    """Uniform-format blocks covering the window (cheap: one property read per block, not per cell).

    Coordinates are relative to the queried range.  Colors are 0xRRGGBB ints (-1 = none).
    """
    origin = cell_range.getRangeAddress()
    number_formats = document.getNumberFormats()
    format_strings: dict[int, str] = {}
    blocks = []
    parts = cell_range.getCellFormatRanges()
    for index in range(int(parts.getCount())):
        part = parts.getByIndex(index)
        address = part.getRangeAddress()
        props = part.getPropertyValues(_VIEW_FORMAT_PROPERTIES)
        key = int(props[11])
        if key not in format_strings:
            try:
                format_strings[key] = str(number_formats.getByKey(key).FormatString)
            except Exception:
                format_strings[key] = "General"
        blocks.append({
            "r0": int(address.StartRow) - int(origin.StartRow),
            "c0": int(address.StartColumn) - int(origin.StartColumn),
            "r1": int(address.EndRow) - int(origin.StartRow),
            "c1": int(address.EndColumn) - int(origin.StartColumn),
            "font": str(props[0]),
            "size": float(props[1]),
            "weight": float(props[2]),
            "posture": str(_enum_name(props[3])),
            "underline": int(props[4]),
            "strike": int(props[5]),
            "color": int(props[6]),
            "bg": int(props[7]),
            "halign": str(_enum_name(props[8])),
            "valign": str(_enum_name(props[9])),
            "wrap": bool(props[10]),
            "numfmt": format_strings[key],
        })
    return blocks


def _view_close(request: dict[str, Any]) -> dict[str, Any]:
    document = _VIEW_DOCUMENTS.pop(str(request.get("doc_id")), None)
    if document is not None:
        _close_hidden_document(document)
    return {"ok": True}


def _close_all_views() -> None:
    for doc_id in list(_VIEW_DOCUMENTS):
        _view_close({"doc_id": doc_id})


def _stop_server(desktop: Any, process: subprocess.Popen[str] | None) -> None:
    _close_all_views()
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
    worker_started = time.monotonic()
    args = list(sys.argv[1:] if argv is None else argv)
    if len(args) != 4:
        _write({"ready": False, "error": "Không khởi động được bộ xử lý tài liệu. Vui lòng cài lại 3T Office."})
        return 2

    soffice_path, profile_uri, endpoint, app_kind = args
    program_dir = Path(soffice_path).resolve().parent
    os.environ["UNO_PATH"] = str(program_dir)
    os.environ["URE_BOOTSTRAP"] = f"vnd.sun.star.pathname:{program_dir / 'fundamental.ini'}"
    sys.path.insert(0, str(program_dir))

    process: subprocess.Popen[str] | None = None
    desktop = None
    try:
        import uno  # provided by the adjacent LibreOffice program directory
        from com.sun.star.beans import PropertyValue
        uno_imported = time.monotonic()

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
            f"--accept={endpoint};urp;StarOffice.ServiceManager",
            f"-env:UserInstallation={profile_uri}",
        ]
        creationflags = _soffice_creation_flags()
        process = subprocess.Popen(
            command,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            text=True,
            creationflags=creationflags,
        )
        soffice_spawned = time.monotonic()
        context, resolve_attempts = _connect(uno, endpoint, process)
        pipe_resolved = time.monotonic()
        desktop = context.ServiceManager.createInstanceWithContext(
            "com.sun.star.frame.Desktop", context
        )
        desktop_created = time.monotonic()
        _write({
            "ready": True,
            "app_kind": app_kind,
            "soffice_pid": process.pid,
            "timings_ms": {
                "python_and_uno_import": round((uno_imported - worker_started) * 1000, 1),
                "soffice_spawn": round((soffice_spawned - uno_imported) * 1000, 1),
                "pipe_resolve": round((pipe_resolved - soffice_spawned) * 1000, 1),
                "desktop_service": round((desktop_created - pipe_resolved) * 1000, 1),
                "resolve_attempts": resolve_attempts,
            },
        })

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
                elif operation == "view_open":
                    response = _view_open(desktop, uno, PropertyValue, request)
                elif operation == "view_window":
                    response = _view_window(request)
                elif operation == "view_close":
                    response = _view_close(request)
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
