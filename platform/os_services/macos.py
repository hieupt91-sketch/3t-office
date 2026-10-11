"""macOS services used while the native shell is implemented incrementally.

The data-directory and LibreOffice discovery behaviour is already portable, so
reuse it here.  macOS additionally selects QtWebEngine: the shared editors were
validated on Chromium and the desktop regression suite requires CDP.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Callable

from .base import ClipboardPayload, OSServices, PrinterInfo, ServiceResult
from .portable import PortableDataDirs, PortableLauncher


class MacClipboardExtras:
    """Read and write rich clipboard data through the active Qt application."""

    def __init__(self, clipboard_getter=None):
        # The optional getter keeps unit tests off the user's real system clipboard.
        self._clipboard_getter = clipboard_getter

    def _clipboard(self):
        if self._clipboard_getter is not None:
            return self._clipboard_getter()
        from qtpy.QtWidgets import QApplication

        app = QApplication.instance()
        if app is None:
            raise RuntimeError("Qt clipboard is unavailable before the application starts.")
        return app.clipboard()

    def read(self) -> ServiceResult[ClipboardPayload]:
        try:
            clipboard = self._clipboard()
            mime_data = clipboard.mimeData()
            text = mime_data.text() if mime_data.hasText() else clipboard.text()
            html = mime_data.html() if mime_data.hasHtml() else ""
            return ServiceResult.ok(ClipboardPayload(text=text or "", html=html or ""))
        except Exception:
            return ServiceResult.fail("not_available", "Không đọc được bộ nhớ tạm trên máy Mac.")

    def write(self, payload: ClipboardPayload) -> ServiceResult[None]:
        try:
            from qtpy.QtCore import QMimeData

            mime_data = QMimeData()
            mime_data.setText(str(payload.text or ""))
            if payload.html:
                mime_data.setHtml(str(payload.html))
            self._clipboard().setMimeData(mime_data)
            return ServiceResult.ok()
        except Exception:
            return ServiceResult.fail("not_available", "Không ghi được bộ nhớ tạm trên máy Mac.")


class MacPrinterService:
    """CUPS printer discovery/submission, with a local copy path for Save as PDF."""

    _PAGE_RANGE = re.compile(r"\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*\Z")

    def __init__(self, runner: Callable = subprocess.run, which: Callable = shutil.which):
        self._runner = runner
        self._which = which

    def _run(self, args: list[str]):
        return self._runner(args, capture_output=True, text=True, timeout=30, check=False)

    @staticmethod
    def _pdf_destination(is_default: bool = True) -> tuple[PrinterInfo, ...]:
        return (PrinterInfo("Save as PDF", is_default, "Lưu tệp PDF trên máy Mac"),)

    def list_installed(self) -> ServiceResult[tuple[PrinterInfo, ...]]:
        lpstat = self._which("lpstat")
        if not lpstat:
            return ServiceResult.ok(self._pdf_destination())
        try:
            listed = self._run([lpstat, "-p"])
            if listed.returncode != 0:
                return ServiceResult.ok(self._pdf_destination())
            default_result = self._run([lpstat, "-d"])
            default_name = ""
            if default_result.returncode == 0:
                match = re.search(r"(?:system default destination|default destination):\s*(\S+)", default_result.stdout, re.I)
                if match:
                    default_name = match.group(1)
            printers = []
            for line in listed.stdout.splitlines():
                match = re.match(r"\s*printer\s+(\S+)\s+(.*)", line, re.I)
                if not match:
                    continue
                name, status = match.groups()
                printers.append(PrinterInfo(name=name, is_default=(name == default_name), status=status.strip()))
            # This is an application-owned destination, not a CUPS queue.
            # Keep it available even when CUPS is absent/unconfigured.
            printers.append(PrinterInfo(
                name="Save as PDF",
                is_default=not default_name,
                status="Lưu tệp PDF trên máy Mac",
            ))
            return ServiceResult.ok(tuple(printers))
        except (OSError, subprocess.TimeoutExpired):
            return ServiceResult.ok(self._pdf_destination())

    @classmethod
    def _valid_page_range(cls, value: str) -> bool:
        if not cls._PAGE_RANGE.fullmatch(value):
            return False
        for part in value.split(","):
            bounds = [int(number) for number in part.split("-")]
            if bounds[0] < 1 or (len(bounds) == 2 and bounds[1] < bounds[0]):
                return False
        return True

    @staticmethod
    def _is_pdf(path: Path) -> bool:
        try:
            with path.open("rb") as stream:
                return stream.read(5) == b"%PDF-"
        except OSError:
            return False

    def print_pdf(self, pdf_path: Path, printer: str, copies: int,
                  pages: str = "", destination_path: Path | None = None) -> ServiceResult[None]:
        source = Path(pdf_path)
        if not self._is_pdf(source):
            return ServiceResult.fail("invalid_input", "Tệp cần in không phải PDF hợp lệ hoặc không đọc được.")
        if isinstance(copies, bool) or not isinstance(copies, int) or copies < 1 or copies > 999:
            return ServiceResult.fail("invalid_input", "Số bản in phải là số nguyên từ 1 đến 999.")
        page_spec = str(pages or "").strip()
        if page_spec and not self._valid_page_range(page_spec):
            return ServiceResult.fail("invalid_input", "Phạm vi trang không hợp lệ.")

        is_pdf_destination = str(printer or "").strip().casefold() == "save as pdf"
        if is_pdf_destination:
            if destination_path is None:
                return ServiceResult.fail("invalid_input", "Cần chọn vị trí lưu trước khi xuất PDF.")
            if copies != 1 or page_spec:
                return ServiceResult.fail("invalid_input", "Lưu PDF hỗ trợ một bản và toàn bộ trang.")
        elif destination_path is not None:
            return ServiceResult.fail("invalid_input", "Vị trí lưu chỉ áp dụng cho đích Save as PDF.")

        if destination_path is not None:
            target = Path(destination_path)
            try:
                if source.resolve() == target.resolve():
                    return ServiceResult.fail("invalid_input", "Tệp đích phải khác tệp PDF nguồn.")
                if not target.parent.is_dir():
                    return ServiceResult.fail("io_error", "Thư mục lưu PDF không tồn tại.")
                fd, temp_name = tempfile.mkstemp(prefix=f".{target.name}.", suffix=".tmp", dir=target.parent)
                os.close(fd)
                try:
                    shutil.copyfile(source, temp_name)
                    os.replace(temp_name, target)
                finally:
                    try:
                        os.unlink(temp_name)
                    except FileNotFoundError:
                        pass
                return ServiceResult.ok()
            except OSError:
                return ServiceResult.fail("io_error", "Không lưu được tệp PDF vào vị trí đã chọn.")

        lp = self._which("lp")
        if not lp:
            return ServiceResult.fail("not_available", "Không tìm thấy lệnh in CUPS (lp) trên máy Mac.")
        args = [lp]
        if printer:
            args.extend(["-d", printer])
        args.extend(["-n", str(copies)])
        if page_spec:
            args.extend(["-P", page_spec])
        args.append(str(source))
        try:
            result = self._run(args)
            if result.returncode != 0:
                return ServiceResult.fail("not_available", "CUPS không gửi được tài liệu tới máy in.")
            return ServiceResult.ok()
        except (OSError, subprocess.TimeoutExpired):
            return ServiceResult.fail("not_available", "CUPS không gửi được tài liệu tới máy in.")


def build_services() -> OSServices:
    return OSServices(
        data_dirs=PortableDataDirs(),
        launcher=PortableLauncher(),
        clipboard_extras=MacClipboardExtras(),
        printer_services=MacPrinterService(),
        desktop_webview_gui="qt",
    )
