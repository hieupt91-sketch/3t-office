"""macOS-specific OS services.

Only Finder reveal is native in MAC-2. The remaining launcher and data-directory
behaviour stays on the portable implementation until its dedicated macOS task.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

from .base import OSServices, ServiceResult
from .portable import PortableDataDirs, PortableLauncher


class MacOSLauncher(PortableLauncher):
    """Portable launcher behaviour plus Finder-specific file reveal."""

    def reveal_path(self, path: Path) -> ServiceResult[None]:
        target = Path(path)
        if not target.exists():
            return ServiceResult.fail("invalid_input", "Không tìm thấy tệp để mở thư mục chứa nó.")

        try:
            completed = subprocess.run(
                ["open", "-R", str(target.resolve())],
                check=False,
                capture_output=True,
                timeout=15,
            )
        except PermissionError:
            return ServiceResult.fail(
                "permission_denied", "Không có quyền mở thư mục chứa tệp trên máy Mac."
            )
        except subprocess.TimeoutExpired:
            return ServiceResult.fail(
                "timeout", "Finder phản hồi quá lâu khi mở thư mục chứa tệp.", retryable=True
            )
        except OSError:
            return ServiceResult.fail("not_available", "Không mở được thư mục chứa tệp trên máy Mac.")

        if completed.returncode != 0:
            return ServiceResult.fail("not_available", "Không mở được thư mục chứa tệp trên máy Mac.")
        return ServiceResult.ok()


def build_services() -> OSServices:
    return OSServices(data_dirs=PortableDataDirs(), launcher=MacOSLauncher())
