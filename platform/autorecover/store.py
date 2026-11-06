"""Local, bounded AutoRecover storage used by the Python desktop bridge."""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import tempfile
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_SETTINGS = {"enabled": True, "interval_minutes": 2}
MIN_INTERVAL_MINUTES = 1
MAX_INTERVAL_MINUTES = 60
MAX_SNAPSHOT_BYTES = 64 * 1024 * 1024
MAX_SNAPSHOT_COUNT = 20
MAX_TOTAL_BYTES = 256 * 1024 * 1024
FORMATS = {"writer": "html", "sheet": "fods", "slides": "fodp"}
_UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)


def _canonical_uuid(value: object) -> str | None:
    candidate = str(value or "")
    if not _UUID_RE.fullmatch(candidate):
        return None
    try:
        return str(uuid.UUID(candidate))
    except ValueError:
        return None


def _atomic_write(path: Path, payload: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp_name, path)
    except BaseException:
        try:
            os.unlink(temp_name)
        except OSError:
            pass
        raise


class AutoRecoverStore:
    """Owns one process session under ``<app-data>/recovery/<session-id>``."""

    def __init__(self, app_data_dir: str | Path, *, session_id: str | None = None):
        self.app_data_dir = Path(app_data_dir)
        self.root = self.app_data_dir / "recovery"
        self.session_id = _canonical_uuid(session_id) or str(uuid.uuid4())
        self.session_dir = self.root / self.session_id
        self.settings_path = self.app_data_dir / "autorecover" / "settings.json"
        self.root.mkdir(parents=True, exist_ok=True)
        self._clean_orphan_files()

    def get_settings(self) -> dict[str, object]:
        try:
            value = json.loads(self.settings_path.read_text(encoding="utf-8"))
        except (OSError, ValueError, TypeError):
            return dict(DEFAULT_SETTINGS)
        if not isinstance(value, dict):
            return dict(DEFAULT_SETTINGS)
        return self._normalize_settings(value)

    def set_settings(self, value: object) -> dict[str, object]:
        if not isinstance(value, dict):
            return dict(DEFAULT_SETTINGS)
        settings = self._normalize_settings(value)
        _atomic_write(self.settings_path, json.dumps(settings, ensure_ascii=False).encode("utf-8"))
        return settings

    @staticmethod
    def _normalize_settings(value: dict[str, object]) -> dict[str, object]:
        try:
            minutes = int(value.get("interval_minutes", DEFAULT_SETTINGS["interval_minutes"]))
        except (TypeError, ValueError, OverflowError):
            minutes = int(DEFAULT_SETTINGS["interval_minutes"])
        return {
            "enabled": value.get("enabled") is not False,
            "interval_minutes": min(MAX_INTERVAL_MINUTES, max(MIN_INTERVAL_MINUTES, minutes)),
        }

    def _snapshot_paths(self, session_id: str, doc_id: str, extension: str) -> tuple[Path, Path]:
        folder = self.root / session_id
        snapshot = folder / f"{doc_id}.{extension}"
        return snapshot, snapshot.with_suffix(snapshot.suffix + ".json")

    def write_snapshot(
        self,
        *,
        doc_id: object,
        app_kind: object,
        content: object,
        original_path: object = None,
        title: object = "Tài liệu chưa đặt tên",
        file_format: object = None,
    ) -> dict[str, object]:
        safe_doc_id = _canonical_uuid(doc_id)
        if not safe_doc_id:
            return {"status": "error", "message": "Mã tài liệu khôi phục không hợp lệ."}
        app = str(app_kind or "")
        extension = FORMATS.get(app)
        if not extension or str(file_format or extension).lower().lstrip(".") != extension:
            return {"status": "error", "message": "Định dạng bản khôi phục không hợp lệ."}
        if not isinstance(content, str):
            return {"status": "error", "message": "Nội dung bản khôi phục không hợp lệ."}
        try:
            payload = content.encode("utf-8")
        except UnicodeError:
            return {"status": "error", "message": "Nội dung bản khôi phục không phải văn bản UTF-8 hợp lệ."}
        if not payload or len(payload) > MAX_SNAPSHOT_BYTES:
            return {"status": "error", "message": "Tài liệu vượt quá giới hạn lưu khôi phục 64 MiB."}

        snapshot, manifest_path = self._snapshot_paths(self.session_id, safe_doc_id, extension)
        try:
            with self._storage_lock():
                if snapshot.is_file() and manifest_path.is_file() and snapshot.read_bytes() == payload:
                    # No disk rewrite when the document has not changed since its last snapshot.
                    manifest = self._read_manifest(manifest_path)
                    updated = self._manifest(
                        safe_doc_id, app, original_path, title, extension,
                        saved_at=manifest.get("saved_at") if manifest else None,
                    )
                    if manifest != updated:
                        _atomic_write(manifest_path, json.dumps(updated, ensure_ascii=False).encode("utf-8"))
                    return {"status": "ok", "written": False, "snapshot_id": f"{self.session_id}/{safe_doc_id}"}

                _atomic_write(snapshot, payload)
                manifest = self._manifest(safe_doc_id, app, original_path, title, extension)
                _atomic_write(manifest_path, json.dumps(manifest, ensure_ascii=False).encode("utf-8"))
                self._enforce_limits()
                if not snapshot.is_file():
                    return {"status": "error", "message": "Bản khôi phục đã bị giới hạn dung lượng dọn khỏi máy."}
                return {"status": "ok", "written": True, "snapshot_id": f"{self.session_id}/{safe_doc_id}"}
        except OSError as exc:
            return {"status": "error", "message": f"Không thể ghi bản khôi phục cục bộ: {exc}"}

    @contextmanager
    def _storage_lock(self):
        lock_path = self.root / ".autorecover.lock"
        lock_path.parent.mkdir(parents=True, exist_ok=True)
        with lock_path.open("a+b") as lock_file:
            if os.name == "nt":
                import msvcrt
                lock_file.seek(0, os.SEEK_END)
                if lock_file.tell() == 0:
                    lock_file.write(b"0")
                    lock_file.flush()
                lock_file.seek(0)
                msvcrt.locking(lock_file.fileno(), msvcrt.LK_LOCK, 1)
                try:
                    yield
                finally:
                    lock_file.seek(0)
                    msvcrt.locking(lock_file.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
                try:
                    yield
                finally:
                    fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)

    def _clean_orphan_files(self) -> None:
        """Clean crash-left temp/orphan files while writes from other processes are locked out."""
        with self._storage_lock():
            for path in self.root.rglob("*"):
                if not path.is_file():
                    continue
                extension = path.suffix.lower().lstrip(".")
                try:
                    if extension == "tmp":
                        path.unlink(missing_ok=True)
                    elif extension in FORMATS.values():
                        if not path.with_suffix(path.suffix + ".json").is_file():
                            path.unlink(missing_ok=True)
                    elif path.name.lower().endswith(".json"):
                        snapshot = path.with_suffix("")
                        if snapshot.suffix.lower().lstrip(".") in FORMATS.values() and not snapshot.is_file():
                            path.unlink(missing_ok=True)
                except OSError:
                    continue
            self._enforce_limits()

    @staticmethod
    def _manifest(doc_id: str, app: str, original_path: object, title: object, extension: str, *, saved_at: str | None = None) -> dict[str, object]:
        return {
            "doc_id": doc_id,
            "app_kind": app,
            "original_path": str(original_path)[:4096] if original_path else "",
            "title": str(title or "Tài liệu chưa đặt tên")[:512],
            "saved_at": saved_at or datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "format": extension,
        }

    @staticmethod
    def _read_manifest(path: Path) -> dict[str, object] | None:
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
            return value if isinstance(value, dict) else None
        except (OSError, ValueError, TypeError):
            return None

    def list_leftovers(self) -> list[dict[str, object]]:
        records: list[dict[str, object]] = []
        if not self.root.exists():
            return records
        for manifest_path in self.root.glob("*/*.json"):
            session_id = _canonical_uuid(manifest_path.parent.name)
            if not session_id or session_id == self.session_id:
                continue
            snapshot_path = manifest_path.with_suffix("")
            doc_id = _canonical_uuid(snapshot_path.stem)
            extension = snapshot_path.suffix.lower().lstrip(".")
            if not doc_id or extension not in FORMATS.values() or not snapshot_path.is_file():
                continue
            manifest = self._read_manifest(manifest_path)
            corrupt_manifest = manifest is None
            if manifest is None:
                try:
                    saved_at = datetime.fromtimestamp(snapshot_path.stat().st_mtime, timezone.utc).isoformat(timespec="seconds")
                except OSError:
                    saved_at = ""
                manifest = {
                    "app_kind": {value: key for key, value in FORMATS.items()}.get(extension, "unknown"),
                    "original_path": "", "title": "Tệp khôi phục không đọc được",
                    "saved_at": saved_at, "format": extension,
                }
            records.append({
                "snapshot_id": f"{session_id}/{doc_id}",
                "app_kind": manifest.get("app_kind", "unknown"),
                "original_path": manifest.get("original_path", ""),
                "title": manifest.get("title", "Tài liệu chưa đặt tên"),
                "saved_at": manifest.get("saved_at", ""),
                "format": extension,
                "corrupt_manifest": corrupt_manifest,
            })
        records.sort(key=lambda item: str(item.get("saved_at") or ""), reverse=True)
        return records

    def read_snapshot(self, snapshot_id: object) -> dict[str, object]:
        session_id, doc_id = self._parse_snapshot_id(snapshot_id)
        if not session_id:
            return {"status": "error", "message": "Mã bản khôi phục không hợp lệ."}
        folder = self.root / session_id
        for extension in FORMATS.values():
            snapshot, manifest_path = self._snapshot_paths(session_id, doc_id, extension)
            if not snapshot.is_file():
                continue
            manifest = self._read_manifest(manifest_path)
            if not manifest or manifest.get("format") != extension:
                return {"status": "error", "message": "Không thể đọc thông tin bản khôi phục. Tệp vẫn được giữ nguyên."}
            try:
                if snapshot.stat().st_size > MAX_SNAPSHOT_BYTES:
                    return {"status": "error", "message": "Bản khôi phục vượt quá giới hạn đọc. Tệp vẫn được giữ nguyên."}
                content = snapshot.read_text(encoding="utf-8")
            except (OSError, UnicodeError) as exc:
                return {"status": "error", "message": f"Không thể đọc bản khôi phục ({exc}). Tệp vẫn được giữ nguyên."}
            return {"status": "ok", "manifest": manifest, "content": content}
        return {"status": "error", "message": "Không tìm thấy bản khôi phục. Tệp vẫn được giữ nguyên nếu còn trên máy."}

    @staticmethod
    def _parse_snapshot_id(snapshot_id: object) -> tuple[str | None, str | None]:
        parts = str(snapshot_id or "").split("/")
        if len(parts) != 2:
            return None, None
        session_id, doc_id = map(_canonical_uuid, parts)
        return (session_id, doc_id) if session_id and doc_id else (None, None)

    def delete_snapshot(self, snapshot_id: object) -> bool:
        session_id, doc_id = self._parse_snapshot_id(snapshot_id)
        if not session_id:
            return False
        with self._storage_lock():
            for extension in FORMATS.values():
                snapshot, manifest_path = self._snapshot_paths(session_id, doc_id, extension)
                existed = snapshot.exists() or manifest_path.exists()
                try:
                    snapshot.unlink(missing_ok=True)
                    manifest_path.unlink(missing_ok=True)
                except OSError:
                    return False
                if existed:
                    return True
            return False

    def delete_document_snapshot(self, doc_id: object) -> bool:
        safe_doc_id = _canonical_uuid(doc_id)
        if not safe_doc_id:
            return False
        with self._storage_lock():
            for extension in FORMATS.values():
                snapshot, manifest = self._snapshot_paths(self.session_id, safe_doc_id, extension)
                existed = snapshot.exists() or manifest.exists()
                try:
                    snapshot.unlink(missing_ok=True)
                    manifest.unlink(missing_ok=True)
                except OSError:
                    return False
                if existed:
                    return True
            return False

    def cleanup_session(self) -> None:
        # Only this generated session UUID is eligible for normal-close cleanup.
        if self.session_dir.parent != self.root or not _canonical_uuid(self.session_dir.name):
            return
        with self._storage_lock():
            shutil.rmtree(self.session_dir, ignore_errors=True)

    def _enforce_limits(self) -> None:
        items: list[tuple[float, int, Path, Path]] = []
        try:
            total_bytes = (self.root / ".autorecover.lock").stat().st_size
        except OSError:
            total_bytes = 0
        for manifest_path in self.root.glob("*/*.json"):
            session_id = _canonical_uuid(manifest_path.parent.name)
            snapshot_path = manifest_path.with_suffix("")
            if not session_id or not _canonical_uuid(snapshot_path.stem) or not snapshot_path.is_file():
                continue
            try:
                stat = snapshot_path.stat()
                manifest_size = manifest_path.stat().st_size
            except OSError:
                continue
            size = stat.st_size + manifest_size
            total_bytes += size
            items.append((stat.st_mtime, size, snapshot_path, manifest_path))
        items.sort(key=lambda item: item[0])
        while len(items) > MAX_SNAPSHOT_COUNT or total_bytes > MAX_TOTAL_BYTES:
            _modified, size, snapshot_path, manifest_path = items.pop(0)
            try:
                snapshot_path.unlink(missing_ok=True)
                manifest_path.unlink(missing_ok=True)
            except OSError:
                pass
            total_bytes -= size


MAX_BACKUP_FILE_BYTES = 256 * 1024 * 1024
MAX_BACKUP_COUNT = 20
MAX_BACKUP_TOTAL_BYTES = 1024 * 1024 * 1024
MAX_BACKUP_LOG_BYTES = 64 * 1024
_STALE_BACKUP_TEMP_SECONDS = 3600


class SaveBackupStore:
    """Keeps the version a save is about to replace: one generation per document, in app data.

    Living in app data keeps the user's folder clean and works when that folder is read-only or on a network share.
    Bounded like AutoRecover: the least recently saved documents are dropped first.
    """

    _storage_lock = AutoRecoverStore._storage_lock

    def __init__(self, app_data_dir: str | Path):
        self.root = Path(app_data_dir) / "save-backups"
        self.log_path = self.root / "backup-errors.log"

    def folder_for(self, document_path: str | Path) -> Path:
        key = os.path.normcase(os.path.abspath(str(document_path)))
        return self.root / hashlib.sha256(key.encode("utf-8", "surrogatepass")).hexdigest()[:32]

    def keep(self, document_path: str | Path) -> bool:
        """Copy the current file into the store. Returns False when it is too large to keep. OSError means failure."""
        source = Path(document_path)
        if source.stat().st_size > MAX_BACKUP_FILE_BYTES:
            self.discard(source)
            return False
        self.root.mkdir(parents=True, exist_ok=True)
        self._remove_stale_temp_files()
        # The copy runs outside the lock: a slow network read must not hold up other windows.
        fd, temp_name = tempfile.mkstemp(prefix=".backup.", suffix=".tmp", dir=self.root)
        try:
            with os.fdopen(fd, "wb") as stream, open(source, "rb") as original:
                shutil.copyfileobj(original, stream, 1024 * 1024)
                stream.flush()
                os.fsync(stream.fileno())
            folder = self.folder_for(source)
            with self._storage_lock():
                folder.mkdir(parents=True, exist_ok=True)
                for stale in folder.iterdir():
                    if stale.name not in {source.name, "backup.json"}:
                        stale.unlink(missing_ok=True)
                os.replace(temp_name, folder / source.name)
                manifest = {
                    "original_path": str(source)[:4096],
                    "file_name": source.name,
                    "saved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                }
                _atomic_write(folder / "backup.json", json.dumps(manifest, ensure_ascii=False).encode("utf-8"))
                self._enforce_limits(folder)
        except BaseException:
            try:
                os.unlink(temp_name)
            except OSError:
                pass
            raise
        return True

    def discard(self, document_path: str | Path) -> None:
        folder = self.folder_for(document_path)
        if not folder.is_dir():
            return
        with self._storage_lock():
            shutil.rmtree(folder)

    def record_failure(self, reason: str) -> None:
        """Local record of a failed backup, without document names. The app has no log file for warnings otherwise."""
        self.root.mkdir(parents=True, exist_ok=True)
        if self.log_path.is_file() and self.log_path.stat().st_size > MAX_BACKUP_LOG_BYTES:
            self.log_path.unlink()
        with self.log_path.open("a", encoding="utf-8") as stream:
            stream.write(f"{datetime.now(timezone.utc).isoformat(timespec='seconds')} {reason}\n")

    def _remove_stale_temp_files(self) -> None:
        cutoff = time.time() - _STALE_BACKUP_TEMP_SECONDS
        for path in self.root.glob(".backup.*.tmp"):
            try:
                if path.stat().st_mtime < cutoff:
                    path.unlink()
            except OSError:
                continue  # Held by another window, or already gone.

    def _enforce_limits(self, newest: Path) -> None:
        entries: list[tuple[float, int, Path]] = []
        total_bytes = 0
        for manifest_path in self.root.glob("*/backup.json"):
            folder = manifest_path.parent
            try:
                modified = manifest_path.stat().st_mtime
                size = sum(path.stat().st_size for path in folder.iterdir())
            except OSError:
                continue
            total_bytes += size
            if folder != newest:
                entries.append((modified, size, folder))
        entries.sort(key=lambda item: item[0])
        count = len(entries) + 1
        while entries and (count > MAX_BACKUP_COUNT or total_bytes > MAX_BACKUP_TOTAL_BYTES):
            _modified, size, folder = entries.pop(0)
            shutil.rmtree(folder, ignore_errors=True)
            total_bytes -= size
            count -= 1


__all__ = [
    "AutoRecoverStore", "DEFAULT_SETTINGS", "MAX_SNAPSHOT_BYTES", "MAX_SNAPSHOT_COUNT", "MAX_TOTAL_BYTES",
    "MAX_BACKUP_COUNT", "MAX_BACKUP_FILE_BYTES", "MAX_BACKUP_TOTAL_BYTES", "SaveBackupStore",
]
