"""macOS-specific OS services.

The 0.9.11 delta adds Finder reveal support. Other services continue to use
the portable implementations until the native macOS backend is integrated.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import uuid
from pathlib import Path
from typing import Mapping

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


class MacOSUpdateApplier:
    """Create and launch version-tree update tasks without modifying the signed app bundle."""

    def __init__(self, data_dirs: PortableDataDirs | None = None, *, python_executable: str | None = None,
                 helper_path: Path | None = None) -> None:
        self._data_dirs = data_dirs or PortableDataDirs()
        self._python_executable = python_executable or sys.executable
        self._helper_path = helper_path or Path(__file__).resolve().parents[2] / "ports" / "macos" / "apply_helper.py"

    def install_root(self, app_dir: Path) -> Path | None:
        candidate = Path(app_dir).parent
        version_file = candidate / "VERSION.txt"
        current = candidate.parent / "current"
        if app_dir.name.lower() != "app" or not version_file.is_file() or not current.is_symlink():
            return None
        try:
            return candidate if current.resolve(strict=False) == candidate.resolve(strict=False) else None
        except OSError:
            return None

    def validate_package_path(self, relative_path: str) -> ServiceResult[str]:
        if not isinstance(relative_path, str):
            return ServiceResult.fail("invalid_input", "Đường dẫn gói cập nhật không hợp lệ.")
        normalized = relative_path.replace("\\", "/")
        parts = normalized.split("/")
        if (not normalized or normalized.startswith("/") or any(part in {"", ".", ".."} for part in parts)
                or "\x00" in normalized):
            return ServiceResult.fail("invalid_input", "Đường dẫn gói cập nhật không hợp lệ.")
        return ServiceResult.ok(normalized)

    def create_apply_task(self, request: Mapping[str, object]) -> ServiceResult[Path]:
        try:
            install_dir = Path(str(request["install_dir"])).resolve(strict=False)
            stage_dir = Path(str(request["stage_dir"])).resolve(strict=False)
            updates_dir = Path(str(request["updates_dir"])).resolve(strict=False)
            old_version = str(request["old_version"])
            new_version = str(request["new_version"])
            app_root = self._data_dirs.user_data_dir().resolve(strict=False)
            if install_dir.parent != app_root or install_dir.name != f"app-{old_version}":
                raise ValueError("install tree")
            if stage_dir.parent != updates_dir or not stage_dir.is_dir() or stage_dir.is_symlink():
                raise ValueError("stage tree")
            token = uuid.uuid4().hex
            launch_args = request.get("launch_args", [])
            if not isinstance(launch_args, list) or not all(isinstance(item, str) for item in launch_args):
                raise ValueError("launch args")
            task = {
                "app_root": str(app_root),
                "stage_dir": str(stage_dir),
                "updates_dir": str(updates_dir),
                "health_file": str(updates_dir / f"health-{token}.ok"),
                "old_version": old_version,
                "new_version": new_version,
                "manifest": request["manifest"],
                "replacements": request["replacements"],
                "removals": request["removals"],
                "launch_app": request["app_kind"],
                "restore_documents": request.get("restore_documents", []),
                "launch_executable": self._python_executable,
                "launch_args": [str(app_root / f"app-{new_version}" / "app" / "main.py"), *launch_args],
                "health_token": token,
                "health_timeout_seconds": 90,
            }
            task_path = stage_dir / "apply-task.json"
            temporary = stage_dir / f".apply-task.{uuid.uuid4().hex}.tmp"
            encoded = json.dumps(task, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            with temporary.open("wb") as stream:
                stream.write(encoded)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, task_path)
            return ServiceResult.ok(task_path)
        except (KeyError, OSError, TypeError, ValueError):
            return ServiceResult.fail("invalid_input", "Không thể tạo tác vụ cập nhật macOS an toàn.")

    def launch(self, task_path: Path) -> ServiceResult[int]:
        task = Path(task_path).resolve(strict=False)
        if not task.is_file() or task.is_symlink() or not self._helper_path.is_file():
            return ServiceResult.fail("invalid_input", "Thiếu helper hoặc tác vụ cập nhật macOS.")
        try:
            process = subprocess.Popen(
                [self._python_executable, "-m", "ports.macos.apply_helper", "--task", str(task)],
                cwd=str(self._helper_path.parents[2]),
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
                close_fds=True,
            )
        except PermissionError:
            return ServiceResult.fail("permission_denied", "Không có quyền khởi chạy trình cập nhật macOS.")
        except OSError:
            return ServiceResult.fail("not_available", "Không khởi chạy được trình cập nhật macOS.")
        threading.Thread(target=process.wait, name="vnoffice-macos-update-helper-reaper", daemon=True).start()
        return ServiceResult.ok(process.pid)


def build_services() -> OSServices:
    data_dirs = PortableDataDirs()
    return OSServices(
        data_dirs=data_dirs,
        launcher=MacOSLauncher(),
        update_applier=MacOSUpdateApplier(data_dirs),
        desktop_webview_gui="qt",
    )
