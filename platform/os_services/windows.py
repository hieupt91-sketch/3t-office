"""Windows backend (P2: data directories and the parts of the launcher that find/show things).

Behaviour is moved verbatim from main.py (_user_data_dir, find_soffice, long-path prefix, start-up error box);
the other Launcher methods (worker command, child processes) and the remaining services arrive in later steps.
"""

from __future__ import annotations

import logging
import os
import shutil
import sys
from pathlib import Path

from .base import OSServices, ServiceResult

APP_DATA_DIR_NAME = "VNOffice"
VALID_APP_KINDS = ("writer", "sheet", "slides")


class WindowsDataDirs:
    def user_data_dir(self) -> Path:
        base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
        return Path(base) / APP_DATA_DIR_NAME

    def document_profile_dir(self, app_kind: str) -> Path:
        kind = app_kind if app_kind in VALID_APP_KINDS else "shared"
        return self.user_data_dir() / f"lo-profile-{kind}"


class WindowsLauncher:
    def find_document_engine(self, app_root: Path, override: str | None = None) -> Path | None:
        candidates: list[str] = []
        if override:
            candidates.append(override)
        # A bundled engine next to main.py is preferred over an installed one: the installed version may differ
        # from the tested one and open/save differently.
        for name in ("soffice.exe", "soffice"):
            candidates.append(str(Path(app_root) / "tools" / "libreoffice" / "program" / name))
        candidates += [
            str(Path.home() / "tools" / "libreoffice" / "program" / "soffice.exe"),
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        ]
        for candidate in candidates:
            if candidate and os.path.isfile(candidate):
                return Path(candidate)
        found = shutil.which("soffice") or shutil.which("soffice.exe")
        return Path(found) if found else None

    def native_io_path(self, path: Path) -> Path:
        """Extended-length form so deep LibreOffice profile trees survive the 260-character path limit."""
        text = str(Path(path).resolve())
        return Path(text if text.startswith("\\\\?\\") else "\\\\?\\" + text)

    def reveal_path(self, path: Path) -> ServiceResult[None]:
        target = Path(path)
        if not target.exists():
            return ServiceResult.fail("invalid_input", "Không tìm thấy tệp để mở thư mục chứa nó.")
        try:
            import subprocess

            # Explorer cần đối số một mảnh dạng /select,<đường dẫn> để chọn đúng tệp.
            subprocess.Popen(["explorer.exe", f"/select,{target.resolve()}"])
            return ServiceResult.ok()
        except Exception:
            return ServiceResult.fail("not_available", "Không mở được thư mục chứa tệp.")

    def show_error(self, title: str, message: str) -> ServiceResult[None]:
        try:
            import ctypes

            ctypes.windll.user32.MessageBoxW(0, message, title, 0x10)
            return ServiceResult.ok()
        except Exception:
            print(f"[3T Office] {message}", file=sys.stderr)
            return ServiceResult.fail("not_available", "Không hiện được hộp thông báo lỗi.")


# ERROR_INVALID_FUNCTION, ERROR_NOT_SUPPORTED, ERROR_INVALID_PARAMETER, ERROR_CALL_NOT_IMPLEMENTED: the file system
# or redirector does not implement the flush. Disk full, device, and network errors are real failures.
_FLUSH_REFUSED_WINERRORS = frozenset({1, 50, 87, 120})
# A directory handle needs write access, which some shares deny (ERROR_ACCESS_DENIED, ERROR_SHARING_VIOLATION).
_DIRECTORY_FLUSH_REFUSED_WINERRORS = _FLUSH_REFUSED_WINERRORS | {5, 32}
_GENERIC_WRITE = 0x40000000
_FILE_SHARE_ALL = 0x7
_OPEN_EXISTING = 3
_FILE_FLAG_BACKUP_SEMANTICS = 0x02000000


class WindowsDurableFiles:
    """Uses FlushFileBuffers directly: os.fsync reports every failure as EBADF, so its cause cannot be told apart."""

    @staticmethod
    def _kernel32():
        import ctypes
        from ctypes import wintypes

        # A private instance, so these prototypes cannot affect other ctypes users of kernel32 in this process.
        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel32.CreateFileW.argtypes = [
            wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, wintypes.LPVOID,
            wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE,
        ]
        kernel32.CreateFileW.restype = wintypes.HANDLE
        kernel32.FlushFileBuffers.argtypes = [wintypes.HANDLE]
        kernel32.FlushFileBuffers.restype = wintypes.BOOL
        kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
        kernel32.CloseHandle.restype = wintypes.BOOL
        return kernel32

    def flush_file(self, fd: int) -> None:
        import ctypes
        import msvcrt

        if not self._kernel32().FlushFileBuffers(msvcrt.get_osfhandle(fd)):
            self._handle_failure(ctypes.get_last_error(), _FLUSH_REFUSED_WINERRORS, "File")

    def flush_directory(self, path: Path) -> None:
        import ctypes
        from ctypes import wintypes

        kernel32 = self._kernel32()
        handle = kernel32.CreateFileW(
            str(path), _GENERIC_WRITE, _FILE_SHARE_ALL, None, _OPEN_EXISTING, _FILE_FLAG_BACKUP_SEMANTICS, None,
        )
        if handle in (None, wintypes.HANDLE(-1).value):
            self._handle_failure(ctypes.get_last_error(), _DIRECTORY_FLUSH_REFUSED_WINERRORS, "Directory")
            return
        try:
            if not kernel32.FlushFileBuffers(handle):
                self._handle_failure(ctypes.get_last_error(), _DIRECTORY_FLUSH_REFUSED_WINERRORS, "Directory")
        finally:
            kernel32.CloseHandle(handle)

    @staticmethod
    def _handle_failure(code: int, refused: frozenset[int], what: str) -> None:
        import ctypes

        if code not in refused:
            raise ctypes.WinError(code)
        logging.getLogger("vnoffice.save").info("%s flush refused by the filesystem: error %s", what, code)


def build_services() -> OSServices:
    return OSServices(data_dirs=WindowsDataDirs(), launcher=WindowsLauncher(), durable_files=WindowsDurableFiles())
