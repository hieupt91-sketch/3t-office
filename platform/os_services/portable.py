"""Portable backend for macOS / Linux until a dedicated macos.py exists (Q2: keep today's behaviour).

Behaviour is moved verbatim from the non-Windows branches of main.py (_user_data_dir, find_soffice, error output).
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

from .base import OSServices, ServiceResult

APP_DATA_DIR_NAME = "VNOffice"
VALID_APP_KINDS = ("writer", "sheet", "slides")


class PortableDataDirs:
    def user_data_dir(self) -> Path:
        if sys.platform == "darwin":
            return Path.home() / "Library" / "Application Support" / APP_DATA_DIR_NAME
        base = os.environ.get("XDG_DATA_HOME") or str(Path.home() / ".local" / "share")
        return Path(base) / APP_DATA_DIR_NAME

    def document_profile_dir(self, app_kind: str) -> Path:
        kind = app_kind if app_kind in VALID_APP_KINDS else "shared"
        return self.user_data_dir() / f"lo-profile-{kind}"


class PortableLauncher:
    def find_document_engine(self, app_root: Path, override: str | None = None) -> Path | None:
        candidates: list[str] = []
        if override:
            candidates.append(override)
        for name in ("soffice.exe", "soffice"):
            candidates.append(str(Path(app_root) / "tools" / "libreoffice" / "program" / name))
        if sys.platform == "darwin":
            candidates.append("/Applications/LibreOffice.app/Contents/MacOS/soffice")
        else:
            candidates += [
                "/usr/bin/soffice",
                "/usr/lib/libreoffice/program/soffice",
                "/opt/libreoffice/program/soffice",
                "/snap/bin/libreoffice.soffice",
            ]
        for candidate in candidates:
            if candidate and os.path.isfile(candidate):
                return Path(candidate)
        found = shutil.which("soffice") or shutil.which("soffice.exe")
        return Path(found) if found else None

    def native_io_path(self, path: Path) -> Path:
        return Path(str(Path(path).resolve()))

    def show_error(self, title: str, message: str) -> ServiceResult[None]:
        print(f"[3T Office] {message}", file=sys.stderr)
        return ServiceResult.ok()


def build_services() -> OSServices:
    return OSServices(data_dirs=PortableDataDirs(), launcher=PortableLauncher())
