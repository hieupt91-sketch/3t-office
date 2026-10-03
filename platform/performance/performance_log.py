"""Opt-in local JSONL performance log with bounded size and rotation."""

from __future__ import annotations

import ctypes
import json
import os
import tempfile
import threading
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_FILES = 3
DEFAULT_SETTINGS = {"enabled": False}
_THREAD_LOCK = threading.RLock()


@contextmanager
def _file_lock(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a+b") as stream:
        if os.name == "nt":
            import msvcrt
            stream.seek(0, os.SEEK_END)
            if stream.tell() == 0:
                stream.write(b"0")
                stream.flush()
            stream.seek(0)
            msvcrt.locking(stream.fileno(), msvcrt.LK_LOCK, 1)
            try:
                yield
            finally:
                stream.seek(0)
                msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
        else:
            import fcntl
            fcntl.flock(stream.fileno(), fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


def current_memory_bytes() -> int | None:
    """Return resident memory for the current 3T process without an extra dependency."""
    try:
        if os.name == "nt":
            class PROCESS_MEMORY_COUNTERS_EX(ctypes.Structure):
                _fields_ = [
                    ("cb", ctypes.c_ulong), ("PageFaultCount", ctypes.c_ulong),
                    ("PeakWorkingSetSize", ctypes.c_size_t), ("WorkingSetSize", ctypes.c_size_t),
                    ("QuotaPeakPagedPoolUsage", ctypes.c_size_t), ("QuotaPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t), ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                    ("PagefileUsage", ctypes.c_size_t), ("PeakPagefileUsage", ctypes.c_size_t),
                    ("PrivateUsage", ctypes.c_size_t),
                ]

            counters = PROCESS_MEMORY_COUNTERS_EX()
            counters.cb = ctypes.sizeof(counters)
            kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
            psapi = ctypes.WinDLL("psapi", use_last_error=True)
            psapi.GetProcessMemoryInfo.argtypes = [ctypes.c_void_p, ctypes.POINTER(PROCESS_MEMORY_COUNTERS_EX), ctypes.c_ulong]
            psapi.GetProcessMemoryInfo.restype = ctypes.c_int
            if psapi.GetProcessMemoryInfo(kernel32.GetCurrentProcess(), ctypes.byref(counters), counters.cb):
                return int(counters.WorkingSetSize)
            return None
        statm = Path("/proc/self/statm")
        if statm.is_file():
            resident_pages = int(statm.read_text(encoding="ascii").split()[1])
            return resident_pages * int(os.sysconf("SC_PAGE_SIZE"))
        import resource
        value = int(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)
        return value if os.uname().sysname == "Darwin" else value * 1024
    except (OSError, ValueError, IndexError, AttributeError, ImportError):
        return None


class PerformanceLog:
    def __init__(self, app_data_dir: str | Path, *, max_file_bytes: int = MAX_FILE_BYTES, max_files: int = MAX_FILES, memory_reader=current_memory_bytes):
        self.directory = Path(app_data_dir) / "performance"
        self.settings_path = self.directory / "settings.json"
        self.log_path = self.directory / "performance.jsonl"
        self.lock_path = self.directory / "performance.lock"
        self.max_file_bytes = max(1024, int(max_file_bytes))
        self.max_files = max(1, int(max_files))
        self.memory_reader = memory_reader
        self._enabled = self.get_settings()["enabled"]

    def get_settings(self) -> dict[str, bool]:
        try:
            value = json.loads(self.settings_path.read_text(encoding="utf-8"))
        except (OSError, ValueError, TypeError):
            return dict(DEFAULT_SETTINGS)
        return {"enabled": value.get("enabled") is True} if isinstance(value, dict) else dict(DEFAULT_SETTINGS)

    def set_settings(self, value: object) -> dict[str, bool]:
        enabled = isinstance(value, dict) and value.get("enabled") is True
        settings = {"enabled": bool(enabled)}
        payload = json.dumps(settings, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.directory.mkdir(parents=True, exist_ok=True)
        fd, temp_name = tempfile.mkstemp(prefix=".settings-", suffix=".tmp", dir=self.directory)
        try:
            with os.fdopen(fd, "wb") as stream:
                stream.write(payload)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temp_name, self.settings_path)
        except BaseException:
            try:
                os.unlink(temp_name)
            except OSError:
                pass
            raise
        self._enabled = settings["enabled"]
        return settings

    def _rotated_path(self, index: int) -> Path:
        return self.log_path.with_name(f"{self.log_path.stem}.{index}{self.log_path.suffix}")

    def _rotate(self) -> None:
        if self.max_files <= 1:
            self.log_path.unlink(missing_ok=True)
            return
        self._rotated_path(self.max_files - 1).unlink(missing_ok=True)
        for index in range(self.max_files - 2, 0, -1):
            source = self._rotated_path(index)
            if source.exists():
                os.replace(source, self._rotated_path(index + 1))
        if self.log_path.exists():
            os.replace(self.log_path, self._rotated_path(1))

    def record(self, operation: str, *, app: str, duration_ms: float, outcome: str = "ok", event: str = "operation") -> bool:
        if not self._enabled:
            return False
        safe_operation = str(operation or "operation")[:64]
        safe_app = str(app or "suite")[:16]
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
            "event": str(event or "operation")[:32],
            "operation": safe_operation,
            "app": safe_app,
            "duration_ms": round(max(0.0, float(duration_ms)), 1),
            "outcome": str(outcome or "ok")[:16],
            "memory_bytes": self.memory_reader(),
        }
        payload = (json.dumps(entry, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
        try:
            self.directory.mkdir(parents=True, exist_ok=True)
            with _THREAD_LOCK, _file_lock(self.lock_path):
                current_size = self.log_path.stat().st_size if self.log_path.is_file() else 0
                if current_size + len(payload) > self.max_file_bytes:
                    self._rotate()
                with self.log_path.open("ab") as stream:
                    stream.write(payload)
                    stream.flush()
            return True
        except OSError:
            return False

    def folder_path(self) -> str:
        self.directory.mkdir(parents=True, exist_ok=True)
        return str(self.directory.resolve())
