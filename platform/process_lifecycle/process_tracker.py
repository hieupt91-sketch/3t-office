"""Track only child processes started by this 3T Office process session."""

from __future__ import annotations

import json
import os
import signal
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Callable


def process_identity(pid: int) -> str | None:
    """Return a stable process-creation token suitable for detecting PID reuse."""
    try:
        if os.name == "nt":
            import ctypes
            from ctypes import wintypes

            class FILETIME(ctypes.Structure):
                _fields_ = [("low", wintypes.DWORD), ("high", wintypes.DWORD)]

            kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
            kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
            kernel32.OpenProcess.restype = wintypes.HANDLE
            kernel32.GetProcessTimes.argtypes = [wintypes.HANDLE, ctypes.POINTER(FILETIME), ctypes.POINTER(FILETIME), ctypes.POINTER(FILETIME), ctypes.POINTER(FILETIME)]
            kernel32.GetProcessTimes.restype = wintypes.BOOL
            kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
            handle = kernel32.OpenProcess(0x1000, False, int(pid))  # PROCESS_QUERY_LIMITED_INFORMATION
            if not handle:
                return None
            try:
                created, exited, kernel, user = FILETIME(), FILETIME(), FILETIME(), FILETIME()
                if not kernel32.GetProcessTimes(handle, ctypes.byref(created), ctypes.byref(exited), ctypes.byref(kernel), ctypes.byref(user)):
                    return None
                return str((int(created.high) << 32) | int(created.low))
            finally:
                kernel32.CloseHandle(handle)

        stat_path = Path(f"/proc/{int(pid)}/stat")
        if stat_path.is_file():
            value = stat_path.read_text(encoding="ascii")
            # comm is parenthesized and can itself contain spaces or parentheses.
            fields = value[value.rfind(")") + 2:].split()
            return fields[19] if len(fields) > 19 else None  # field 22: starttime
        os.kill(int(pid), 0)
        return "alive"
    except (OSError, ValueError, IndexError):
        return None


def _terminate(pid: int) -> None:
    try:
        os.kill(int(pid), signal.SIGTERM)
    except (OSError, ValueError, ProcessLookupError):
        pass


@contextmanager
def _file_lock(lock_path: Path):
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    with lock_path.open("a+b") as stream:
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


class ProcessTracker:
    """An append-only, app-local PID ledger with identity-checked cleanup."""

    def __init__(
        self,
        data_dir: str | Path,
        *,
        root_pid: int | None = None,
        root_created_at: str | None = None,
        identity_reader: Callable[[int], str | None] = process_identity,
        terminator: Callable[[int], None] = _terminate,
    ):
        self.data_dir = Path(data_dir)
        self.state_path = self.data_dir / "processes" / "started-processes.jsonl"
        self.lock_path = self.state_path.with_suffix(".lock")
        self.root_pid = int(root_pid or os.getpid())
        self.identity_reader = identity_reader
        self.terminator = terminator
        self.root_created_at = str(root_created_at or identity_reader(self.root_pid) or "")

    @staticmethod
    def _record_valid(record: object) -> bool:
        if not isinstance(record, dict):
            return False
        try:
            return int(record.get("pid", 0)) > 0 and int(record.get("owner_pid", 0)) > 0 and bool(record.get("created_at")) and bool(record.get("owner_created_at"))
        except (TypeError, ValueError, OverflowError):
            return False

    def _read_records(self) -> list[dict[str, object]]:
        try:
            lines = self.state_path.read_text(encoding="utf-8").splitlines()
        except OSError:
            return []
        records = []
        for line in lines:
            try:
                value = json.loads(line)
            except (ValueError, TypeError):
                continue
            if self._record_valid(value):
                records.append(value)
        return records

    def _write_records(self, records: list[dict[str, object]]) -> None:
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        payload = "".join(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n" for record in records)
        temp_path = self.state_path.with_suffix(".tmp")
        temp_path.write_text(payload, encoding="utf-8")
        os.replace(temp_path, self.state_path)

    def register(self, pid: int, role: str, *, created_at: str | None = None, parent_pid: int | None = None) -> bool:
        """Record a PID only when its current creation identity can be verified."""
        process_id = int(pid)
        identity = str(created_at or self.identity_reader(process_id) or "")
        if process_id <= 0 or process_id == self.root_pid or not identity or not self.root_created_at:
            return False
        record = {
            "pid": process_id,
            "created_at": identity,
            "role": str(role or "child")[:64],
            "owner_pid": self.root_pid,
            "owner_created_at": self.root_created_at,
            "parent_pid": int(parent_pid or self.root_pid),
            "recorded_at": time.time(),
        }
        with _file_lock(self.lock_path):
            records = self._read_records()
            if any(int(item["pid"]) == process_id and str(item["created_at"]) == identity for item in records):
                return True
            self.state_path.parent.mkdir(parents=True, exist_ok=True)
            with self.state_path.open("a", encoding="utf-8", newline="\n") as stream:
                stream.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
                stream.flush()
                os.fsync(stream.fileno())
        return True

    def record_external(self, pid: int, created_at: str, role: str, owner_pid: int, owner_created_at: str, *, parent_pid: int | None = None) -> bool:
        """Append a child record from a trusted app-owned COM worker process."""
        process_id = int(pid)
        if process_id <= 0 or process_id == self.root_pid or not created_at or not owner_created_at:
            return False
        record = {
            "pid": process_id,
            "created_at": str(created_at),
            "role": str(role or "child")[:64],
            "owner_pid": int(owner_pid),
            "owner_created_at": str(owner_created_at),
            "parent_pid": int(parent_pid or owner_pid),
            "recorded_at": time.time(),
        }
        with _file_lock(self.lock_path):
            records = self._read_records()
            if any(int(item["pid"]) == process_id and str(item["created_at"]) == str(created_at) for item in records):
                return True
            self.state_path.parent.mkdir(parents=True, exist_ok=True)
            with self.state_path.open("a", encoding="utf-8", newline="\n") as stream:
                stream.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
                stream.flush()
                os.fsync(stream.fileno())
        return True

    def _is_same_process(self, pid: int, created_at: str) -> bool:
        return str(self.identity_reader(int(pid)) or "") == str(created_at)

    def startup_sweep(self) -> dict[str, int]:
        """Stop recorded processes only when their recorded app owner has exited."""
        stopped = 0
        retained = 0
        removed = 0
        with _file_lock(self.lock_path):
            records = self._read_records()
            remaining = []
            for record in records:
                pid = int(record["pid"])
                owner_pid = int(record["owner_pid"])
                owner_created_at = str(record["owner_created_at"])
                child_identity = str(record["created_at"])
                owner_alive = self._is_same_process(owner_pid, owner_created_at)
                if owner_alive:
                    remaining.append(record)
                    retained += 1
                    continue
                removed += 1
                if self._is_same_process(pid, child_identity):
                    self.terminator(pid)
                    stopped += 1
            self._write_records(remaining)
        return {"stopped": stopped, "retained": retained, "removed": removed}

    def cleanup(self) -> dict[str, int]:
        """Terminate this session's tracked children and remove its ledger rows."""
        stopped = 0
        removed = 0
        with _file_lock(self.lock_path):
            records = self._read_records()
            remaining = []
            for record in records:
                same_owner = (
                    int(record["owner_pid"]) == self.root_pid
                    and str(record["owner_created_at"]) == self.root_created_at
                )
                if not same_owner:
                    remaining.append(record)
                    continue
                removed += 1
                pid = int(record["pid"])
                if self._is_same_process(pid, str(record["created_at"])):
                    self.terminator(pid)
                    stopped += 1
            self._write_records(remaining)
        return {"stopped": stopped, "removed": removed}


def append_process_record_from_env(pid: int, created_at: str, role: str, *, parent_pid: int | None = None) -> bool:
    """Register a COM-created Office PID using owner context inherited from 3T."""
    state_path = os.environ.get("VNO_PROCESS_TRACKER_STATE", "")
    try:
        owner_pid = int(os.environ.get("VNO_PROCESS_TRACKER_ROOT_PID", "0"))
    except ValueError:
        return False
    owner_created_at = os.environ.get("VNO_PROCESS_TRACKER_ROOT_CREATED_AT", "")
    if not state_path or owner_pid <= 0 or not owner_created_at:
        return False
    tracker = ProcessTracker(Path(state_path).parent.parent, root_pid=owner_pid, root_created_at=owner_created_at)
    return tracker.record_external(pid, created_at, role, owner_pid, owner_created_at, parent_pid=parent_pid)
