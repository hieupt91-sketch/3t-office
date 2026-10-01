"""Manual Windows desktop smoke test for multi-window single-instance flow.

Run from the repository root with ``python scripts/test_single_instance_live.py``.
It uses only local fixture documents and an isolated LOCALAPPDATA directory.
"""

from __future__ import annotations

import ctypes
import os
import shutil
import subprocess
import sys
import tempfile
import time
from ctypes import wintypes
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures" / "real-office-samples"
CREATE_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)
WM_CLOSE = 0x0010


class NativeWindow(ctypes.Structure):
    _fields_ = [("handle", wintypes.HWND), ("process_id", wintypes.DWORD), ("title", ctypes.c_wchar_p)]


_EnumWindowsProc = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
_user32 = ctypes.WinDLL("user32", use_last_error=True)
_user32.EnumWindows.argtypes = [_EnumWindowsProc, wintypes.LPARAM]
_user32.EnumWindows.restype = wintypes.BOOL
_user32.IsWindowVisible.argtypes = [wintypes.HWND]
_user32.IsWindowVisible.restype = wintypes.BOOL
_user32.GetWindowTextLengthW.argtypes = [wintypes.HWND]
_user32.GetWindowTextLengthW.restype = ctypes.c_int
_user32.GetWindowTextW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
_user32.GetWindowTextW.restype = ctypes.c_int
_user32.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
_user32.GetWindowThreadProcessId.restype = wintypes.DWORD
_user32.PostMessageW.argtypes = [wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM]
_user32.PostMessageW.restype = wintypes.BOOL


def _windows_for_pid(process_id: int) -> list[NativeWindow]:
    windows: list[NativeWindow] = []

    @_EnumWindowsProc
    def visit(handle, _lparam):
        if not _user32.IsWindowVisible(handle):
            return True
        actual_pid = wintypes.DWORD()
        _user32.GetWindowThreadProcessId(handle, ctypes.byref(actual_pid))
        length = _user32.GetWindowTextLengthW(handle)
        if actual_pid.value == process_id and length:
            title = ctypes.create_unicode_buffer(length + 1)
            _user32.GetWindowTextW(handle, title, len(title))
            windows.append(NativeWindow(handle, actual_pid.value, title.value))
        return True

    _user32.EnumWindows(visit, 0)
    return windows


def _doc_windows(process_id: int) -> list[NativeWindow]:
    doc_names = ("sample-writer.docx", "sample-writer-trackchanges.docx", "sample-writer-tables.docx")
    return [window for window in _windows_for_pid(process_id) if any(name in window.title for name in doc_names)]


def _start_writer(path: Path, log_path: Path, env: dict[str, str]):
    log = log_path.open("wb")
    started = time.perf_counter()
    process = subprocess.Popen(
        [sys.executable, str(ROOT / "main.py"), "--app=writer", str(path)],
        cwd=ROOT,
        env=env,
        stdout=log,
        stderr=subprocess.STDOUT,
        creationflags=CREATE_NO_WINDOW,
    )
    return process, started, log


def _wait_title(process: subprocess.Popen, started: float, filename: str, timeout: float) -> tuple[NativeWindow, int]:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"Launcher {process.pid} exited before {filename} became visible.")
        match = next((window for window in _windows_for_pid(process.pid) if filename in window.title), None)
        if match is not None:
            return match, round((time.perf_counter() - started) * 1000)
        time.sleep(0.05)
    raise TimeoutError(f"Timed out waiting for visible title {filename} in process {process.pid}.")


def _wait_launcher_exit(process: subprocess.Popen, timeout: float = 5) -> None:
    try:
        process.wait(timeout=timeout)
    except subprocess.TimeoutExpired as exc:
        raise TimeoutError(f"Secondary launcher {process.pid} did not exit after forwarding.") from exc
    if process.returncode != 0:
        raise RuntimeError(f"Secondary launcher {process.pid} exited with code {process.returncode}.")


def _wait_doc_window_count(process_id: int, expected: int, timeout: float = 10) -> list[NativeWindow]:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        windows = _doc_windows(process_id)
        if len(windows) == expected:
            return windows
        time.sleep(0.05)
    titles = [window.title for window in _windows_for_pid(process_id)]
    raise TimeoutError(f"Process {process_id} had {len(_doc_windows(process_id))} document windows, expected {expected}: {titles}")


def _close_window(window: NativeWindow) -> None:
    if not _user32.PostMessageW(window.handle, WM_CLOSE, 0, 0):
        raise ctypes.WinError(ctypes.get_last_error())


def _remove_test_data(temp_dir: str) -> None:
    target_arg = Path(temp_dir)
    target = target_arg.resolve()
    temp_root = Path(tempfile.gettempdir()).resolve()
    if target.parent != temp_root or not target.name.startswith("g11-"):
        raise RuntimeError(f"Refusing to remove unexpected live-test directory: {target}")
    short_buffer = ctypes.create_unicode_buffer(32768)
    short_length = ctypes.windll.kernel32.GetShortPathNameW(str(target_arg), short_buffer, len(short_buffer))
    removable_path = short_buffer.value if short_length else str(target_arg)
    for attempt in range(10):
        try:
            shutil.rmtree(removable_path)
            return
        except FileNotFoundError:
            return
        except OSError:
            if attempt == 9:
                raise
            time.sleep(0.3)


def run() -> None:
    if os.name != "nt":
        raise RuntimeError("This live desktop check requires Windows and a visible desktop session.")
    files = [
        FIXTURES / "sample-writer.docx",
        FIXTURES / "sample-writer-trackchanges.docx",
        FIXTURES / "sample-writer-tables.docx",
    ]
    for path in files:
        if not path.is_file():
            raise FileNotFoundError(path)

    processes: list[subprocess.Popen] = []
    logs = []
    temp_root = Path(tempfile.gettempdir())
    short_temp_buffer = ctypes.create_unicode_buffer(32768)
    short_temp_length = ctypes.windll.kernel32.GetShortPathNameW(str(temp_root), short_temp_buffer, len(short_temp_buffer))
    short_temp_root = short_temp_buffer.value if short_temp_length else str(temp_root)
    temporary_directory = tempfile.TemporaryDirectory(
        prefix="g11-", dir=short_temp_root, ignore_cleanup_errors=True
    )
    temp_dir = temporary_directory.name
    try:
        env = os.environ.copy()
        env["LOCALAPPDATA"] = temp_dir
        Path(env["LOCALAPPDATA"]).mkdir(parents=True, exist_ok=True)
        try:
            cold, cold_started, log = _start_writer(files[0], Path(temp_dir) / "cold.log", env)
            processes.append(cold)
            logs.append(log)
            cold_window, cold_ms = _wait_title(cold, cold_started, files[0].name, 120)
            print(f"cold_fixture_open_ms={cold_ms}; pid={cold.pid}; title={cold_window.title}")
            time.sleep(5)  # allow the app's background LibreOffice worker warm-up to finish

            for index, path in enumerate(files[1:], start=2):
                launcher, started, log = _start_writer(path, Path(temp_dir) / f"warm-{index}.log", env)
                processes.append(launcher)
                logs.append(log)
                _wait_launcher_exit(launcher)
                _window, elapsed_ms = _wait_title(cold, started, path.name, 35)
                print(f"warm_fixture_open_{index}_ms={elapsed_ms}; owner_pid={cold.pid}; launcher_pid={launcher.pid}")

            windows = _wait_doc_window_count(cold.pid, 3)
            print(f"three_windows_same_process=PASS; owner_pid={cold.pid}; window_count={len(windows)}")
            for remaining, path in zip((2, 1, 0), files):
                target = next(window for window in _wait_doc_window_count(cold.pid, remaining + 1) if path.name in window.title)
                _close_window(target)
                if remaining:
                    _wait_doc_window_count(cold.pid, remaining, 20)
                    print(f"close_window={path.name}; remaining={remaining}")
                else:
                    cold.wait(timeout=45)
                    print(f"close_window={path.name}; remaining=0; process_exit={cold.returncode}")

            killed, killed_started, log = _start_writer(files[0], Path(temp_dir) / "kill-owner.log", env)
            processes.append(killed)
            logs.append(log)
            _wait_title(killed, killed_started, files[0].name, 120)
            killed.kill()
            killed.wait(timeout=10)
            recovered, recovered_started, log = _start_writer(files[1], Path(temp_dir) / "recovered.log", env)
            processes.append(recovered)
            logs.append(log)
            recovered_window, recovered_ms = _wait_title(recovered, recovered_started, files[1].name, 120)
            print(f"killed_owner_recovery=PASS; open_ms={recovered_ms}; pid={recovered.pid}; title={recovered_window.title}")
            _close_window(recovered_window)
            recovered.wait(timeout=45)
            print(f"recovered_owner_closed=PASS; process_exit={recovered.returncode}")
        finally:
            for process in processes:
                if process.poll() is None:
                    process.kill()
                    process.wait(timeout=10)
            for log in logs:
                log.close()
    finally:
        temporary_directory.cleanup()
        if Path(temp_dir).exists():
            _remove_test_data(temp_dir)


if __name__ == "__main__":
    run()
