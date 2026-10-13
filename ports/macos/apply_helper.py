"""Apply a verified 3T Office code update outside the signed macOS app bundle.

The signed shell/runtime stays in ``.app``.  This helper only manages versioned
application-code directories below the user data root::

    app-0.9.10/
    app-0.9.11.staging/  ->  app-0.9.11/
    current -> app-0.9.11

It deliberately has no dependency outside the Python standard library and the
existing updater manifest policy.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Mapping

from adapters.updater.manifest import sha256_file, validate_package_path, version_key

MAX_TASK_BYTES = 32 * 1024 * 1024


class ApplyError(RuntimeError):
    """The update was refused or could not be applied safely."""


@dataclass(frozen=True)
class ApplyResult:
    status: str
    old_version: str
    new_version: str
    current_dir: Path
    rolled_back: bool = False


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _append_log(path: Path, message: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8", newline="\n") as stream:
        stream.write(f"{_utc_now()} STEP {message}\n")
        stream.flush()
        os.fsync(stream.fileno())


def _atomic_json(path: Path, value: Mapping[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    encoded = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    with temp.open("wb") as stream:
        stream.write(encoded)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temp, path)


def _load_task(task_path: Path) -> dict[str, object]:
    if not task_path.is_file() or task_path.is_symlink():
        raise ApplyError("Apply task không phải tệp thường")
    if task_path.stat().st_size > MAX_TASK_BYTES:
        raise ApplyError("Apply task vượt giới hạn kích thước")
    try:
        value = json.loads(task_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ApplyError("Không đọc được apply task") from exc
    if not isinstance(value, dict):
        raise ApplyError("Apply task phải là JSON object")
    return value


def _required_path(task: Mapping[str, object], key: str) -> Path:
    raw = task.get(key)
    if not isinstance(raw, str) or not raw or "\x00" in raw:
        raise ApplyError(f"Apply task thiếu đường dẫn {key}")
    return Path(raw).expanduser().resolve(strict=False)


def _path_below(path: Path, root: Path, field: str) -> Path:
    try:
        path.relative_to(root)
    except ValueError as exc:
        raise ApplyError(f"Đường dẫn {field} phải nằm trong thư mục updates") from exc
    if path == root:
        raise ApplyError(f"Đường dẫn {field} phải là tệp")
    return path


def _version(value: object, field: str) -> str:
    if not isinstance(value, str):
        raise ApplyError(f"Apply task thiếu {field}")
    try:
        version_key(value)
    except ValueError as exc:
        raise ApplyError(f"Phiên bản {field} không hợp lệ") from exc
    return value


def _reject_symlinks(root: Path) -> None:
    if root.is_symlink():
        raise ApplyError(f"Từ chối version tree là symlink: {root}")
    for path in root.rglob("*"):
        if path.is_symlink():
            raise ApplyError(f"Từ chối symlink trong version tree: {path.relative_to(root)}")


def _safe_remove_tree(path: Path, root: Path) -> None:
    expected_parent = root.resolve(strict=False)
    if path.parent.resolve(strict=False) != expected_parent or not path.name.startswith("app-"):
        raise ApplyError("Từ chối xóa thư mục ngoài app root")
    if path.is_symlink():
        raise ApplyError("Từ chối xóa staging dạng symlink")
    if path.exists():
        shutil.rmtree(path)


def _atomic_current(app_root: Path, target: Path) -> None:
    if target.parent != app_root or not target.is_dir() or target.is_symlink():
        raise ApplyError("Target version không hợp lệ")
    temporary = app_root / f".current-{uuid.uuid4().hex}"
    try:
        temporary.symlink_to(target.name, target_is_directory=True)
        os.replace(temporary, app_root / "current")
    finally:
        temporary.unlink(missing_ok=True)


def _manifest_files(task: Mapping[str, object]) -> dict[str, dict[str, object]]:
    manifest = task.get("manifest")
    if not isinstance(manifest, dict) or not isinstance(manifest.get("files"), list):
        raise ApplyError("Apply task thiếu manifest đã xác minh")
    results: dict[str, dict[str, object]] = {}
    for raw in manifest["files"]:
        if not isinstance(raw, dict):
            raise ApplyError("Manifest chứa file entry không hợp lệ")
        try:
            relative = validate_package_path(raw.get("path"))
            size = int(raw.get("size"))
            digest = str(raw.get("sha256"))
        except (TypeError, ValueError) as exc:
            raise ApplyError("Manifest chứa metadata file không hợp lệ") from exc
        if size < 0 or len(digest) != 64 or any(char not in "0123456789abcdef" for char in digest):
            raise ApplyError(f"Manifest chứa hash/size không hợp lệ: {relative}")
        if relative in results:
            raise ApplyError(f"Manifest lặp đường dẫn: {relative}")
        results[relative] = {"path": relative, "size": size, "sha256": digest}
    return results


def _apply_delta(staging: Path, download_stage: Path, task: Mapping[str, object], manifest: dict[str, dict[str, object]]) -> None:
    replacements = task.get("replacements", [])
    removals = task.get("removals", [])
    if not isinstance(replacements, list) or not isinstance(removals, list):
        raise ApplyError("Danh sách replacement/removal không hợp lệ")
    for raw in replacements:
        if not isinstance(raw, dict):
            raise ApplyError("Replacement entry không hợp lệ")
        relative = validate_package_path(raw.get("path"))
        expected = manifest.get(relative)
        if expected is None:
            raise ApplyError(f"Replacement không có trong manifest: {relative}")
        if int(raw.get("size", -1)) != expected["size"] or str(raw.get("sha256", "")) != expected["sha256"]:
            raise ApplyError(f"Replacement không khớp manifest: {relative}")
        blob = download_stage / "blobs" / str(expected["sha256"])
        if not blob.is_file() or blob.is_symlink():
            raise ApplyError(f"Thiếu blob thường đã xác minh: {relative}")
        if sha256_file(blob) != (expected["size"], expected["sha256"]):
            raise ApplyError(f"Blob sai hash hoặc kích thước: {relative}")
        destination = staging.joinpath(*relative.split("/"))
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.is_symlink() or any(parent.is_symlink() for parent in destination.parents if parent != staging.parent):
            raise ApplyError(f"Symlink chặn replacement: {relative}")
        temp = destination.with_name(f".{destination.name}.{uuid.uuid4().hex}.tmp")
        shutil.copyfile(blob, temp)
        os.replace(temp, destination)
    for raw in removals:
        relative = validate_package_path(raw)
        if relative in manifest:
            raise ApplyError(f"Không thể vừa giữ vừa xóa file manifest: {relative}")
        destination = staging.joinpath(*relative.split("/"))
        if destination.is_symlink():
            raise ApplyError(f"Từ chối removal symlink: {relative}")
        if destination.exists() and not destination.is_file():
            raise ApplyError(f"Removal không phải file thường: {relative}")
        destination.unlink(missing_ok=True)


def _verify_tree(staging: Path, manifest: dict[str, dict[str, object]]) -> None:
    _reject_symlinks(staging)
    for relative, expected in manifest.items():
        path = staging.joinpath(*relative.split("/"))
        if not path.is_file() or path.is_symlink():
            raise ApplyError(f"Thiếu file manifest sau apply: {relative}")
        if sha256_file(path) != (expected["size"], expected["sha256"]):
            raise ApplyError(f"File sau apply sai hash hoặc kích thước: {relative}")


def _default_health_check(task: Mapping[str, object], current_dir: Path) -> bool:
    executable = task.get("launch_executable")
    args = task.get("launch_args", [])
    if not isinstance(executable, str) or not executable or not isinstance(args, list) or not all(isinstance(arg, str) for arg in args):
        raise ApplyError("Apply task thiếu lệnh health check")
    updates_dir = _required_path(task, "updates_dir")
    health_file = _path_below(_required_path(task, "health_file"), updates_dir, "health_file")
    token = str(task.get("health_token", ""))
    timeout = max(1, min(int(task.get("health_timeout_seconds", 90)), 600))
    health_file.unlink(missing_ok=True)
    env = dict(os.environ)
    env["VNO_UPDATE_HEALTH_FILE"] = str(health_file)
    env["VNO_UPDATE_HEALTH_TOKEN"] = token
    process = subprocess.Popen(
        [executable, *args, f"--update-health-token={token}"],
        cwd=str(current_dir),
        env=env,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    deadline = time.monotonic() + timeout
    healthy = False
    while time.monotonic() < deadline:
        if health_file.is_file() and not health_file.is_symlink():
            healthy = True
            break
        if process.poll() is not None:
            break
        time.sleep(0.1)
    if not healthy and process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
    health_file.unlink(missing_ok=True)
    return healthy


def apply_task(task_path: str | Path, *, health_check: Callable[[Mapping[str, object], Path], bool] | None = None) -> ApplyResult:
    """Apply one verified task; raises ApplyError after restoring ``current`` on failure."""
    task_path = Path(task_path).resolve(strict=False)
    task = _load_task(task_path)
    app_root = _required_path(task, "app_root")
    download_stage = _required_path(task, "stage_dir")
    updates_dir = _required_path(task, "updates_dir")
    old_version = _version(task.get("old_version"), "old_version")
    new_version = _version(task.get("new_version"), "new_version")
    if old_version == new_version:
        raise ApplyError("Phiên bản mới phải khác phiên bản hiện tại")
    app_root.mkdir(parents=True, exist_ok=True)
    updates_dir.mkdir(parents=True, exist_ok=True)
    if app_root.is_symlink() or download_stage.is_symlink() or updates_dir.is_symlink():
        raise ApplyError("Từ chối thư mục updater dạng symlink")
    old_dir = app_root / f"app-{old_version}"
    target = app_root / f"app-{new_version}"
    staging = app_root / f"app-{new_version}.staging"
    current = app_root / "current"
    # The task is downloaded input. Keep diagnostics at a fixed local path so a
    # forged task cannot turn logging into an arbitrary-file write primitive.
    log_file = updates_dir / "update-log.txt"
    if not old_dir.is_dir() or old_dir.is_symlink():
        raise ApplyError("Không tìm thấy version tree hiện tại")
    if not current.is_symlink() or current.resolve(strict=False) != old_dir.resolve(strict=False):
        raise ApplyError("Con trỏ current không trỏ đúng phiên bản cũ")
    if target.exists() or target.is_symlink():
        raise ApplyError("Phiên bản đích đã tồn tại")
    _reject_symlinks(old_dir)
    manifest = _manifest_files(task)
    switched = False
    promoted = False
    _append_log(log_file, f"mac-apply-start old={old_version} new={new_version}")
    try:
        _safe_remove_tree(staging, app_root)
        shutil.copytree(old_dir, staging, copy_function=shutil.copy2)
        _apply_delta(staging, download_stage, task, manifest)
        _verify_tree(staging, manifest)
        os.replace(staging, target)
        promoted = True
        _atomic_current(app_root, target)
        switched = True
        _append_log(log_file, f"mac-current-promoted target={target.name}")
        checker = health_check or _default_health_check
        if not checker(task, target):
            raise ApplyError("Phiên bản mới không vượt qua health check")
        _append_log(log_file, f"mac-health-passed version={new_version}")
        return ApplyResult("applied", old_version, new_version, target, False)
    except Exception as exc:
        if switched:
            try:
                _atomic_current(app_root, old_dir)
                _atomic_json(updates_dir / "rollback-report.json", {
                    "old_version": old_version,
                    "new_version": new_version,
                    "reason": "health-or-apply-failure",
                    "created_at": _utc_now(),
                })
                _append_log(log_file, f"mac-rollback-complete restored={old_version}")
            except Exception as rollback_exc:
                raise ApplyError("Apply lỗi và rollback current thất bại") from rollback_exc
        if staging.exists() and not staging.is_symlink():
            _safe_remove_tree(staging, app_root)
        if promoted and target.exists() and not target.is_symlink():
            _safe_remove_tree(target, app_root)
        if isinstance(exc, ApplyError):
            raise
        raise ApplyError("Không thể áp dụng bản cập nhật macOS") from exc


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="3T Office macOS Python update applier")
    parser.add_argument("--task", required=True, help="Đường dẫn apply-task.json đã xác minh")
    args = parser.parse_args(argv)
    try:
        apply_task(args.task)
        return 0
    except ApplyError as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
