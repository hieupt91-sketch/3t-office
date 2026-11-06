"""Portable backend for macOS / Linux until a dedicated macos.py exists (Q2: keep today's behaviour).

Behaviour is moved verbatim from the non-Windows branches of main.py (_user_data_dir, find_soffice, error output).
"""

from __future__ import annotations

import errno
import logging
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

    def reveal_path(self, path: Path) -> ServiceResult[None]:
        # Bản portable chưa có trình quản lý tệp chuẩn để gọi; báo rõ thay vì im lặng.
        return ServiceResult.fail("not_supported", "Hệ điều hành này chưa hỗ trợ mở thư mục chứa tệp.")


# The filesystem does not implement the request. Everything else (EIO, ENOSPC, EDQUOT, ...) is a real write failure.
_FLUSH_REFUSED_ERRNOS = frozenset({errno.EINVAL, errno.ENOTSUP, errno.EOPNOTSUPP, errno.ENOSYS})
# Opening or syncing a directory is also refused for plain permission reasons on some mounts.
_DIRECTORY_FLUSH_REFUSED_ERRNOS = _FLUSH_REFUSED_ERRNOS | {errno.EACCES, errno.EPERM, errno.EBADF, errno.EISDIR}


class PortableDurableFiles:
    def flush_file(self, fd: int) -> None:
        try:
            os.fsync(fd)
        except OSError as exc:
            if exc.errno not in _FLUSH_REFUSED_ERRNOS:
                raise
            logging.getLogger("vnoffice.save").info("File flush refused by the filesystem: errno %s", exc.errno)

    def flush_directory(self, path: Path) -> None:
        try:
            fd = os.open(str(path), os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            try:
                os.fsync(fd)
            finally:
                os.close(fd)
        except OSError as exc:
            if exc.errno not in _DIRECTORY_FLUSH_REFUSED_ERRNOS:
                raise
            logging.getLogger("vnoffice.save").info("Directory flush refused by the filesystem: errno %s", exc.errno)


def build_services() -> OSServices:
    return OSServices(data_dirs=PortableDataDirs(), launcher=PortableLauncher(), durable_files=PortableDurableFiles())
