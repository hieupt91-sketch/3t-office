"""Shared local print pipeline helpers. No document content leaves the device."""

from __future__ import annotations

import base64
import json
import os
import re
import shutil
import subprocess
import tempfile
import threading
import uuid
from pathlib import Path
from typing import Callable


PAGE_RANGE_ERROR = "Phạm vi trang không hợp lệ. Nhập số trang từ 1 đến tổng số trang, ví dụ 1-3,5."


def parse_page_range(value: object, total_pages: int) -> str:
    """Validate an Office-style 1-based page list and return LibreOffice syntax."""
    if type(total_pages) is not int or total_pages < 1:
        raise ValueError("Không xác định được số trang của tài liệu.")
    text = str(value or "").strip()
    if not text or text.casefold() in {"all", "tất cả"}:
        return ""

    pages: set[int] = set()
    for item in text.split(","):
        item = item.strip()
        match = re.fullmatch(r"(\d+)\s*(?:-\s*(\d+))?", item)
        if not match:
            raise ValueError(PAGE_RANGE_ERROR)
        start = int(match.group(1))
        end = int(match.group(2) or start)
        if start < 1 or end < start or end > total_pages:
            raise ValueError(PAGE_RANGE_ERROR)
        pages.update(range(start, end + 1))
    if not pages:
        raise ValueError(PAGE_RANGE_ERROR)

    ordered = sorted(pages)
    ranges: list[str] = []
    start = previous = ordered[0]
    for page in ordered[1:]:
        if page == previous + 1:
            previous = page
            continue
        ranges.append(str(start) if start == previous else f"{start}-{previous}")
        start = previous = page
    ranges.append(str(start) if start == previous else f"{start}-{previous}")
    return ",".join(ranges)


def select_default_printer(printers: list[dict]) -> str:
    for printer in printers:
        if printer.get("isDefault") and printer.get("name"):
            return str(printer["name"])
    return str(printers[0].get("name") or "") if printers else ""


def list_installed_printers(
    *,
    runner: Callable = subprocess.run,
    is_windows: bool | None = None,
    powershell_path: str | None = None,
) -> dict:
    """Query Windows' installed printer queue through built-in PowerShell/WMI."""
    windows = os.name == "nt" if is_windows is None else is_windows
    if not windows:
        return {"status": "error", "message": "Danh sách máy in hiện chỉ được hỗ trợ trên Windows."}
    powershell = powershell_path or shutil.which("powershell.exe") or shutil.which("powershell")
    if not powershell:
        return {"status": "error", "message": "Không tìm thấy PowerShell để đọc danh sách máy in Windows."}

    script = (
        "$OutputEncoding = New-Object System.Text.UTF8Encoding; "
        "[Console]::OutputEncoding = $OutputEncoding; "
        "$defaultName = Get-CimInstance -ClassName Win32_Printer | "
        "Where-Object { $_.Default } | Select-Object -First 1 -ExpandProperty Name; "
        "$items = @(Get-Printer -ErrorAction Stop | Sort-Object Name | ForEach-Object { "
        "[pscustomobject]@{ name = $_.Name; isDefault = ($_.Name -eq $defaultName); status = [string]$_.PrinterStatus } }); "
        "ConvertTo-Json -InputObject $items -Compress -Depth 3"
    )
    try:
        result = runner(
            [powershell, "-NoProfile", "-NonInteractive", "-Command", script],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=15,
            check=False,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return {"status": "error", "message": f"Không đọc được danh sách máy in: {exc}"}
    if result.returncode != 0:
        detail = (result.stderr or "").strip()
        return {"status": "error", "message": detail or "Windows không trả về danh sách máy in."}
    try:
        payload = json.loads((result.stdout or "[]").strip() or "[]")
    except json.JSONDecodeError as exc:
        return {"status": "error", "message": f"Danh sách máy in Windows không hợp lệ: {exc}"}
    if isinstance(payload, dict):
        payload = [payload]
    if not isinstance(payload, list):
        return {"status": "error", "message": "Danh sách máy in Windows không hợp lệ."}
    printers = [
        {
            "name": str(item.get("name") or item.get("Name") or "").strip(),
            "isDefault": bool(item.get("isDefault", item.get("IsDefault", False))),
            "status": str(item.get("status") or item.get("Status") or ""),
        }
        for item in payload
        if isinstance(item, dict) and str(item.get("name") or item.get("Name") or "").strip()
    ]
    if not printers:
        return {"status": "error", "message": "Windows chưa cài máy in nào."}
    return {"status": "ok", "printers": printers, "defaultPrinter": select_default_printer(printers)}


class PrintPipeline:
    """Own temporary PDFs and call injected local LibreOffice operations."""

    def __init__(
        self,
        *,
        write_source: Callable[..., str],
        convert_pdf: Callable[[str, str, str], str],
        office_candidates: Callable[[str], tuple[dict[str, str], ...]] | None = None,
        convert_office_pdf: Callable[[str, str, str, dict[str, str]], str] | None = None,
        inspect_pdf: Callable[[str, str], int],
        render_page: Callable[[str, str, int, str], None],
        print_pdf: Callable[[str, str, str, int, str, str | None], dict],
    ):
        self._write_source = write_source
        self._convert_pdf = convert_pdf
        self._office_candidates = office_candidates or (lambda _kind: ())
        self._convert_office_pdf = convert_office_pdf
        self._inspect_pdf = inspect_pdf
        self._render_page = render_page
        self._print_pdf = print_pdf
        self._sessions: dict[str, dict] = {}
        self._lock = threading.RLock()

    def prepare(
        self,
        app_kind: str,
        content: str,
        suggested_name: str = "TaiLieu",
        source_path: str | None = None,
        use_office: bool = True,
        print_options: dict | None = None,
    ) -> dict:
        if app_kind not in {"writer", "sheet", "slides"}:
            return {"status": "error", "message": "Không xác định được ứng dụng cần in."}
        if not isinstance(content, str) or not content.strip():
            return {"status": "error", "message": "Tài liệu đang trống hoặc chưa sẵn sàng để in."}
        # Windows scanners can briefly hold a freshly written PDF while the
        # UNO worker is recovering; keep cleanup from masking the print error.
        temp_dir = tempfile.TemporaryDirectory(prefix="vnoffice_print_", ignore_cleanup_errors=True)
        root = temp_dir.name
        try:
            if app_kind == "sheet" and isinstance(print_options, dict):
                native_source_path = self._write_source(
                    content, app_kind, root, source_path, print_options,
                )
            else:
                native_source_path = self._write_source(content, app_kind, root, source_path)
            engine_name = "LibreOffice"
            if use_office and self._convert_office_pdf:
                for candidate in self._office_candidates(app_kind):
                    try:
                        candidate_pdf = self._convert_office_pdf(native_source_path, app_kind, root, candidate)
                        if Path(candidate_pdf).is_file() and Path(candidate_pdf).stat().st_size > 0:
                            pdf_path = candidate_pdf
                            engine_name = str(candidate["engine"])
                            break
                    except Exception:
                        # The print dialog reports the successful fallback engine only.
                        try:
                            (Path(root) / f"{Path(native_source_path).stem}.pdf").unlink(missing_ok=True)
                        except OSError:
                            pass
                else:
                    pdf_path = self._convert_pdf(native_source_path, app_kind, root)
            else:
                pdf_path = self._convert_pdf(native_source_path, app_kind, root)
            if not Path(pdf_path).is_file() or Path(pdf_path).stat().st_size <= 0:
                raise RuntimeError("LibreOffice không tạo được tệp PDF xem trước.")
            page_count = self._inspect_pdf(app_kind, pdf_path)
            if type(page_count) is not int or page_count < 1:
                raise RuntimeError("LibreOffice không xác định được số trang PDF.")
            session_id = uuid.uuid4().hex
            with self._lock:
                self._sessions[session_id] = {
                    "temp_dir": temp_dir,
                    "app_kind": app_kind,
                    "pdf_path": str(pdf_path),
                    "page_count": page_count,
                    "engine": engine_name,
                    "suggested_name": Path(str(suggested_name or "TaiLieu")).stem or "TaiLieu",
                }
            return {
                "status": "ok", "sessionId": session_id,
                "pageCount": page_count, "engine": engine_name,
            }
        except Exception as exc:
            temp_dir.cleanup()
            return {"status": "error", "message": f"Không tạo được bản xem trước để in: {exc}"}

    def preview_page(self, session_id: str, page_number: int) -> dict:
        with self._lock:
            session = self._sessions.get(str(session_id or ""))
            if not session:
                return {"status": "error", "message": "Phiên xem trước đã hết hạn. Hãy mở lại hộp thoại in."}
            if type(page_number) is not int or not 1 <= page_number <= session["page_count"]:
                return {"status": "error", "message": "Số trang xem trước nằm ngoài tài liệu."}
            image_path = Path(session["temp_dir"].name) / f"page-{page_number:05d}.png"
            try:
                self._render_page(session["app_kind"], session["pdf_path"], page_number - 1, str(image_path))
                data = base64.b64encode(image_path.read_bytes()).decode("ascii")
                return {"status": "ok", "dataUrl": f"data:image/png;base64,{data}"}
            except Exception as exc:
                return {"status": "error", "message": f"Không dựng được ảnh trang {page_number}: {exc}"}

    def print_document(
        self,
        session_id: str,
        printer: str,
        copies: int,
        page_range: object = "",
        destination_path: str | None = None,
    ) -> dict:
        with self._lock:
            session = self._sessions.get(str(session_id or ""))
            if not session:
                return {"status": "error", "message": "Phiên in đã hết hạn. Hãy mở lại hộp thoại in."}
            selected_printer = str(printer or "").strip()
            if not selected_printer:
                return {"status": "error", "message": "Hãy chọn máy in trước khi in."}
            if type(copies) is not int or not 1 <= copies <= 999:
                return {"status": "error", "message": "Số bản phải từ 1 đến 999."}
            try:
                normalized_range = parse_page_range(page_range, session["page_count"])
                result = self._print_pdf(
                    session["app_kind"],
                    session["pdf_path"],
                    selected_printer,
                    copies,
                    normalized_range,
                    destination_path,
                )
                if not isinstance(result, dict) or not result.get("ok"):
                    detail = result.get("error") if isinstance(result, dict) else "Máy in không xác nhận được lệnh in."
                    return {"status": "error", "message": f"Máy in '{selected_printer}' không in được tài liệu: {detail}"}
                response = {
                    "status": "ok", "message": "Đã gửi đến máy in.",
                    "printer": selected_printer, "engine": session.get("engine", "LibreOffice"),
                }
                if destination_path:
                    response["path"] = str(destination_path)
                return response
            except Exception as exc:
                return {"status": "error", "message": f"Máy in '{selected_printer}' không in được tài liệu: {exc}"}

    def cancel(self, session_id: str) -> bool:
        with self._lock:
            session = self._sessions.pop(str(session_id or ""), None)
        if not session:
            return False
        session["temp_dir"].cleanup()
        return True

    def suggested_name(self, session_id: str) -> str:
        with self._lock:
            session = self._sessions.get(str(session_id or ""))
        return str(session.get("suggested_name") or "TaiLieu") if session else "TaiLieu"

    def engine_status(self, app_kind: str) -> dict[str, object]:
        candidates = self._office_candidates(str(app_kind or ""))
        return {
            "status": "ok",
            "appKind": app_kind,
            "officeAvailable": bool(candidates),
            "preferredEngine": candidates[0]["engine"] if candidates else "LibreOffice",
        }

    def close(self) -> None:
        with self._lock:
            sessions = list(self._sessions.values())
            self._sessions.clear()
        for session in sessions:
            session["temp_dir"].cleanup()
