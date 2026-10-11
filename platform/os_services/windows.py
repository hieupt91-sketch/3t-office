"""Windows backend (P2: data directories and the parts of the launcher that find/show things).

Behaviour is moved verbatim from main.py (_user_data_dir, find_soffice, long-path prefix, start-up error box);
the other Launcher methods (worker command, child processes) and the remaining services arrive in later steps.
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

from .base import LaunchSpec, OSServices, ServiceResult

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

    def document_worker_endpoint(self, engine: Path, identity: str) -> ServiceResult[str]:
        if not identity or any(char not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_" for char in identity):
            return ServiceResult.fail("invalid_input", "Mã kết nối bộ xử lý tài liệu không hợp lệ.")
        return ServiceResult.ok(f"pipe,name={identity}")

    def document_worker_command(self, engine: Path, worker: Path, profile_uri: str,
                                endpoint: str, app_kind: str) -> ServiceResult[LaunchSpec]:
        python_path = engine.resolve().parent / "python.exe"
        if not python_path.is_file():
            return ServiceResult.fail("not_available", "Không tìm thấy Python đi kèm LibreOffice.")
        if app_kind not in VALID_APP_KINDS:
            return ServiceResult.fail("invalid_input", "Loại ứng dụng không hợp lệ.")
        return ServiceResult.ok(LaunchSpec(
            executable=python_path,
            arguments=("-u", str(worker), str(engine), profile_uri, endpoint, app_kind),
            working_directory=engine.resolve().parent,
        ))

    def show_error(self, title: str, message: str) -> ServiceResult[None]:
        try:
            import ctypes

            ctypes.windll.user32.MessageBoxW(0, message, title, 0x10)
            return ServiceResult.ok()
        except Exception:
            print(f"[3T Office] {message}", file=sys.stderr)
            return ServiceResult.fail("not_available", "Không hiện được hộp thông báo lỗi.")


def build_services() -> OSServices:
    return OSServices(data_dirs=WindowsDataDirs(), launcher=WindowsLauncher())
