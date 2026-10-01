"""Offline-tolerant signed update checks and content-addressed delta staging."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import shutil
import subprocess
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from .crypto import verify_sha256_pkcs1v15
from .manifest import (
    MAX_MANIFEST_BYTES,
    MAX_PACKAGE_BYTES,
    ManifestError,
    compare_versions,
    parse_manifest,
    sha256_file,
    validate_package_path,
    version_key,
)
from .source import UpdateSourceError, download_blob, read_source_bytes

LOG = logging.getLogger("vnoffice.updater")
MAX_CHANNEL_BYTES = 16 * 1024
MAX_SIGNATURE_BYTES = 1024
MAX_STAGE_AGE_SECONDS = 14 * 24 * 60 * 60
DISK_HEADROOM_BYTES = 64 * 1024 * 1024
CHECK_INTERVAL_SECONDS = 4 * 60 * 60


class UpdateRefused(ValueError):
    pass


def is_update_allowed(manifest: dict[str, object], license_info: object = None) -> bool:
    """Future subscription/perpetual entitlement hook. All tiers are allowed during pilot."""
    del manifest, license_info
    return True


def _atomic_write(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    with temp.open("wb") as stream:
        stream.write(content)
        stream.flush()
        os.fsync(stream.fileno())
    temp.replace(path)


def _safe_install_path(install_dir: Path, relative: str) -> Path:
    relative = validate_package_path(relative)
    root = install_dir.resolve(strict=False)
    candidate = root.joinpath(*relative.split("/"))
    try:
        resolved = candidate.resolve(strict=False)
        if os.path.commonpath((str(root), str(resolved))).casefold() != str(root).casefold():
            raise UpdateRefused(f"Cài đặt có đường dẫn thoát thư mục: {relative}")
    except ValueError as exc:
        raise UpdateRefused(f"Đường dẫn cài đặt không hợp lệ: {relative}") from exc
    return candidate


def installed_hash(path: Path) -> tuple[int, str] | None:
    try:
        if not path.is_file() or path.is_symlink():
            return None
        return sha256_file(path)
    except OSError:
        return None


def compute_delta(install_dir: str | Path, manifest: dict[str, object]) -> list[dict[str, object]]:
    root = Path(install_dir)
    changed = []
    for item in manifest["files"]:
        destination = _safe_install_path(root, item["path"])
        if installed_hash(destination) != (item["size"], item["sha256"]):
            changed.append(dict(item))
    return changed


def _managed_install_files(install_dir: Path) -> set[str]:
    results: set[str] = set()
    for name in ("app", "python", "icons", "THIRD-PARTY-NOTICES"):
        root = install_dir / name
        if not root.is_dir():
            continue
        for path in root.rglob("*"):
            if path.is_file() and not path.is_symlink():
                relative = path.relative_to(install_dir).as_posix()
                if relative not in {"app/vnoffice-config.json"}:
                    results.add(relative)
    for name in ("VERSION.txt", "BUILD-INFO.txt", "install-pilot.ps1", "CAI-DAT.txt"):
        path = install_dir / name
        if path.is_file() and not path.is_symlink():
            results.add(name)
    return results


class UpdaterManager:
    def __init__(
        self,
        *,
        install_dir: str | Path,
        updates_dir: str | Path,
        current_version: str,
        source: str,
        channel: str = "pilot",
        public_key: tuple[int, int] | None = None,
        timeout: int = 12,
        max_package_bytes: int = MAX_PACKAGE_BYTES,
        on_state: Callable[[dict[str, object]], None] | None = None,
    ) -> None:
        self.install_dir = Path(install_dir)
        self.updates_dir = Path(updates_dir)
        self.current_version = str(current_version)
        version_key(self.current_version)
        self.source = str(source or "").strip()
        self.channel = str(channel or "pilot")
        self.public_key = public_key
        self.timeout = timeout
        self.max_package_bytes = min(int(max_package_bytes), MAX_PACKAGE_BYTES)
        self.on_state = on_state
        self._lock = threading.RLock()
        self._check_lock = threading.Lock()
        self._periodic_stop = threading.Event()
        self._periodic_thread: threading.Thread | None = None
        self._check_thread: threading.Thread | None = None
        self._launch_args: list[str] = []
        self._state: dict[str, object] = {
            "current_version": self.current_version,
            "available_version": None,
            "channel": self.channel,
            "release_notes": "",
            "ready": False,
            "bytes_downloaded": 0,
            "status": "idle" if self.source and self.public_key is not None else ("disabled" if not self.source else "unavailable"),
            "checked_at": None,
        }
        self._manifest: dict[str, object] | None = None
        self._manifest_bytes: bytes | None = None
        self._signature: bytes | None = None
        self._changed: list[dict[str, object]] = []
        self._removals: list[str] = []

    def set_launch_args(self, args: list[str]) -> None:
        self._launch_args = [str(arg) for arg in args if not str(arg).startswith("--update-health-token=")]

    def get_state(self) -> dict[str, object]:
        with self._lock:
            return dict(self._state)

    def _set_state(self, **values: object) -> dict[str, object]:
        with self._lock:
            self._state.update(values)
            state = dict(self._state)
        if self.on_state:
            try:
                self.on_state(state)
            except Exception:
                LOG.debug("Unable to notify update UI", exc_info=True)
        return state

    def start(self, *, interval_seconds: int = CHECK_INTERVAL_SECONDS) -> bool:
        if not self.source or self.public_key is None:
            return False
        if self._periodic_thread and self._periodic_thread.is_alive():
            return True
        self._periodic_stop.clear()
        self._periodic_thread = threading.Thread(
            target=self._periodic_loop,
            args=(max(60, int(interval_seconds)),),
            name="vnoffice-updater",
            daemon=True,
        )
        self._periodic_thread.start()
        self.schedule_check()
        return True

    def stop(self) -> None:
        self._periodic_stop.set()

    def _periodic_loop(self, interval_seconds: int) -> None:
        while not self._periodic_stop.wait(interval_seconds):
            self.schedule_check()

    def schedule_check(self) -> bool:
        if not self.source or self.public_key is None:
            return False
        if self._check_thread and self._check_thread.is_alive():
            return False
        self._check_thread = threading.Thread(target=self._background_check, name="vnoffice-update-check", daemon=True)
        self._check_thread.start()
        return True

    def _background_check(self) -> None:
        try:
            self.check_and_stage()
        except Exception as exc:
            # Update failures are deliberately silent; only a short local debug line is retained.
            LOG.debug("Background update check unavailable: %s", type(exc).__name__)
            self._set_state(status="unavailable", checked_at=_utc_now(), ready=False)

    def check_and_stage(self) -> dict[str, object]:
        if not self.source:
            raise UpdateSourceError("Chưa cấu hình nguồn cập nhật")
        if self.public_key is None:
            raise UpdateRefused("Chưa nhúng khóa công khai phát hành vào ứng dụng")
        with self._check_lock:
            self._set_state(status="checking", checked_at=None, ready=False, bytes_downloaded=0)
            self.updates_dir.mkdir(parents=True, exist_ok=True)
            self._cleanup_old_stages()
            pointer_raw = read_source_bytes(
                self.source,
                f"channels/{self.channel}.json",
                max_bytes=MAX_CHANNEL_BYTES,
                timeout=self.timeout,
            )
            try:
                pointer = json.loads(pointer_raw.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise UpdateRefused("Con trỏ kênh phát hành không hợp lệ") from exc
            if not isinstance(pointer, dict) or pointer.get("channel") != self.channel:
                raise UpdateRefused("Con trỏ phát hành không khớp kênh đã cấu hình")
            version = pointer.get("version")
            if not isinstance(version, str):
                raise UpdateRefused("Con trỏ phát hành thiếu version")
            version_key(version)
            # The pointer is untrusted. Fetch only the signed metadata before any package blob.
            manifest_raw = read_source_bytes(
                self.source,
                f"{version}/manifest.json",
                max_bytes=MAX_MANIFEST_BYTES,
                timeout=self.timeout,
            )
            signature = read_source_bytes(
                self.source,
                f"{version}/manifest.sig",
                max_bytes=MAX_SIGNATURE_BYTES,
                timeout=self.timeout,
            )
            modulus, exponent = self.public_key
            if not verify_sha256_pkcs1v15(manifest_raw, signature, modulus, exponent):
                raise UpdateRefused("Chữ ký manifest không hợp lệ")
            manifest = parse_manifest(manifest_raw, expected_channel=self.channel)
            if manifest["version"] != version:
                raise UpdateRefused("Version trong manifest không khớp con trỏ kênh")
            version_order = compare_versions(version, self.current_version)
            if version_order == 0:
                self._manifest = None
                self._manifest_bytes = None
                self._signature = None
                self._changed = []
                self._removals = []
                return self._set_state(
                    current_version=self.current_version,
                    available_version=None,
                    release_notes="",
                    ready=False,
                    bytes_downloaded=0,
                    checked_at=_utc_now(),
                    status="up-to-date",
                )
            if version_order < 0:
                raise UpdateRefused("Từ chối hạ cấp hoặc cài lại cùng phiên bản")
            if compare_versions(self.current_version, manifest["min_version"]) < 0:
                raise UpdateRefused("Bản cập nhật yêu cầu cài mới 3T Office trước")
            if not is_update_allowed(manifest):
                raise UpdateRefused("Giấy phép hiện tại chưa được phép cập nhật")
            changed = compute_delta(self.install_dir, manifest)
            if sum(int(item["size"]) for item in manifest["files"]) > self.max_package_bytes:
                raise UpdateRefused("Gói cập nhật vượt quá giới hạn cấu hình")
            sizes: dict[str, int] = {}
            for item in manifest["files"]:
                digest, size = str(item["sha256"]), int(item["size"])
                if digest in sizes and sizes[digest] != size:
                    raise UpdateRefused("Manifest gán nhiều kích thước cho cùng một blob")
                sizes[digest] = size
            required: dict[str, int] = {}
            for item in changed:
                required[item["sha256"]] = item["size"]
            stage_dir = self.updates_dir / version
            blob_dir = stage_dir / "blobs"
            blob_dir.mkdir(parents=True, exist_ok=True)
            self._ensure_disk_space(blob_dir, required)
            downloaded = 0
            for digest, size in required.items():
                downloaded += download_blob(
                    self.source,
                    digest,
                    blob_dir / digest,
                    expected_size=size,
                    timeout=self.timeout,
                )
            _atomic_write(stage_dir / "manifest.json", manifest_raw)
            _atomic_write(stage_dir / "manifest.sig", signature)
            manifest_paths = {str(item["path"]) for item in manifest["files"]}
            removals = sorted(_managed_install_files(self.install_dir) - manifest_paths)
            self._manifest = manifest
            self._manifest_bytes = manifest_raw
            self._signature = signature
            self._changed = changed
            self._removals = removals
            state = self._set_state(
                current_version=self.current_version,
                available_version=version,
                channel=self.channel,
                release_notes=manifest["release_notes"],
                ready=True,
                bytes_downloaded=downloaded,
                changed_files=len(changed),
                removed_files=len(removals),
                checked_at=_utc_now(),
                status="update-ready",
            )
            return state

    def _ensure_disk_space(self, stage_dir: Path, required: dict[str, int]) -> None:
        bytes_needed = 0
        for digest, size in required.items():
            target = stage_dir / digest
            if target.is_file():
                try:
                    existing_size, existing_digest = sha256_file(target)
                    if existing_size == size and existing_digest == digest:
                        continue
                except OSError:
                    pass
            partial = target.with_name(target.name + ".part")
            try:
                offset = min(partial.stat().st_size, size)
            except OSError:
                offset = 0
            bytes_needed += size - offset
        if bytes_needed > self.max_package_bytes:
            raise UpdateRefused("Delta vượt quá giới hạn tải xuống")
        try:
            free = shutil.disk_usage(stage_dir).free
        except OSError:
            free = self.max_package_bytes + DISK_HEADROOM_BYTES
        if bytes_needed + DISK_HEADROOM_BYTES > free:
            raise UpdateRefused("Không đủ dung lượng trống để tải bản cập nhật an toàn")

    def _cleanup_old_stages(self) -> None:
        if not self.updates_dir.exists():
            return
        cutoff = time.time() - MAX_STAGE_AGE_SECONDS
        for child in self.updates_dir.iterdir():
            if not child.is_dir() or child.name.startswith("backup-"):
                continue
            try:
                version_key(child.name)
                if child.stat().st_mtime < cutoff:
                    shutil.rmtree(child)
            except (ManifestError, OSError):
                continue

    def create_apply_task(
        self,
        *,
        app_kind: str,
        install_root: str | Path,
        launch_args: list[str] | None = None,
        restore_documents: list[str] | None = None,
    ) -> Path:
        if not self._manifest or not self._manifest_bytes or not self._signature:
            raise UpdateRefused("Chưa có bản cập nhật đã xác minh để áp dụng")
        if app_kind not in {"writer", "sheet", "slides"}:
            raise UpdateRefused("Ứng dụng khởi chạy không hợp lệ")
        install = Path(install_root).resolve()
        stage = self.updates_dir / str(self._manifest["version"])
        source_helper = self.install_dir / "app" / "adapters" / "updater" / "apply-helper.ps1"
        if not source_helper.is_file():
            raise UpdateRefused("Thiếu helper cập nhật Windows trong gói đã cài")
        staged_helper = stage / "apply-helper.ps1"
        shutil.copyfile(source_helper, staged_helper)
        token = uuid.uuid4().hex
        health_file = self.updates_dir / f"health-{token}.ok"
        managed_new = {str(item["path"]) for item in self._manifest["files"]}
        removals = sorted(_managed_install_files(install) - managed_new)
        task = {
            "install_dir": str(install),
            "stage_dir": str(stage.resolve()),
            "updates_dir": str(self.updates_dir.resolve()),
            "health_file": str(health_file),
            "old_version": self.current_version,
            "new_version": self._manifest["version"],
            "manifest": self._manifest,
            "replacements": self._changed,
            "removals": removals,
            "launch_app": app_kind,
            "launch_args": list(self._launch_args if launch_args is None else launch_args),
            "restore_documents": [str(path) for path in (restore_documents or [])],
            "launch_executable": str((install / "python" / "pythonw.exe").resolve()),
            "launch_prefix_args": ["-s", "-E", str((install / "app" / "main.py").resolve())],
            "health_token": token,
            "health_timeout_seconds": 90,
            "process_wait_seconds": 45,
            "soffice_exit_wait_seconds": 12,
            "log_file": str((self.updates_dir / "update-log.txt").resolve()),
        }
        task_path = stage / "apply-task.json"
        encoded = json.dumps(task, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        _atomic_write(task_path, encoded)
        return task_path

    def launch_apply_helper(self, task_path: str | Path) -> bool:
        if os.name != "nt":
            return False
        powershell = shutil.which("powershell.exe") or shutil.which("powershell")
        if not powershell:
            raise UpdateRefused("Không tìm thấy Windows PowerShell")
        helper_path = Path(task_path).parent / "apply-helper.ps1"
        if not helper_path.is_file():
            raise UpdateRefused("Không tìm thấy apply-helper.ps1 trong staging")
        flags = getattr(subprocess, "DETACHED_PROCESS", 0x00000008) | getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)
        subprocess.Popen(
            [powershell, "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", str(helper_path), "-Task", str(task_path)],
            cwd=str(helper_path.parent),
            creationflags=flags,
            close_fds=True,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return True


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def write_health_marker(updates_dir: str | Path, token: str) -> bool:
    if not token or len(token) > 64 or any(char not in "0123456789abcdef" for char in token.lower()):
        return False
    try:
        _atomic_write(Path(updates_dir) / f"health-{token}.ok", b"ok\n")
        return True
    except OSError:
        return False


def queue_rollback_report(reporter, updates_dir: str | Path) -> bool:
    path = Path(updates_dir) / "rollback-report.json"
    try:
        event = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(event, dict) or not reporter:
            return False
        reporter.record_error(
            error_type="UpdateRollback",
            message=f"Bản cập nhật {str(event.get('new_version', ''))[:40]} không khởi động được; đã phục hồi {str(event.get('old_version', ''))[:40]}.",
            operation="frontend",
        )
        path.unlink(missing_ok=True)
        return True
    except (OSError, ValueError, TypeError):
        return False
