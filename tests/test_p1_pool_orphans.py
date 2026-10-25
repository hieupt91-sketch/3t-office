"""P1b pool workers must not outlive the app process that owns them."""

from __future__ import annotations

import json
import multiprocessing
import os
import subprocess
import sys
import time
import unittest
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CHILD = r"""
import json, os, sys
sys.path.insert(0, {root!r})
import adapters.libreoffice.common.ooxml_zip_patch as P
pool = P._p1_process_pool()
pids = sorted(set(pool.submit(os.getpid).result() for _ in range(8)))
print(json.dumps(pids), flush=True)
sys.stdin.readline()  # stay alive until the test kills us
"""


def _pid_alive(pid: int) -> bool:
    if os.name == "nt":
        import ctypes
        from ctypes import wintypes

        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
        kernel32.OpenProcess.restype = wintypes.HANDLE
        kernel32.GetExitCodeProcess.argtypes = [wintypes.HANDLE, ctypes.POINTER(wintypes.DWORD)]
        handle = kernel32.OpenProcess(0x1000, False, pid)
        if not handle:
            return False
        try:
            code = wintypes.DWORD()
            return bool(kernel32.GetExitCodeProcess(handle, ctypes.byref(code))) and code.value == 259
        finally:
            kernel32.CloseHandle(handle)
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _worker_reports_parent_alive(parent_pid: int) -> tuple[int, int, bool]:
    import adapters.libreoffice.common.ooxml_zip_patch as patch

    return os.getpid(), os.getppid(), patch._p1_parent_alive(parent_pid)


class PoolOrphanTests(unittest.TestCase):
    @unittest.skipIf(os.name == "nt", "POSIX parent probe must run in a spawned worker on POSIX")
    def test_parent_alive_probe_from_spawned_worker(self):
        parent_pid = os.getpid()
        context = multiprocessing.get_context("spawn")
        with ProcessPoolExecutor(max_workers=1, mp_context=context) as pool:
            worker_pid, worker_parent_pid, parent_alive = pool.submit(
                _worker_reports_parent_alive, parent_pid
            ).result(timeout=15)
        self.assertNotEqual(worker_pid, parent_pid, "probe must run in a child worker")
        self.assertEqual(worker_parent_pid, parent_pid, "spawned worker must inspect its actual parent")
        self.assertTrue(parent_alive, "worker must report its live parent as alive")

    def test_workers_exit_after_their_parent_is_killed(self):
        child = subprocess.Popen(
            [sys.executable, "-s", "-c", CHILD.format(root=str(ROOT))],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True,
        )
        try:
            worker_pids = [pid for pid in json.loads(child.stdout.readline()) if pid != child.pid]
            self.assertTrue(worker_pids, "the pool should have started worker processes")
            self.assertTrue(all(_pid_alive(pid) for pid in worker_pids))
        finally:
            child.kill()  # simulate a crash: no pool shutdown runs
            child.wait(timeout=10)
        deadline = time.time() + 12
        while time.time() < deadline and any(_pid_alive(pid) for pid in worker_pids):
            time.sleep(0.5)
        survivors = [pid for pid in worker_pids if _pid_alive(pid)]
        for pid in survivors:  # never leave strays behind, whatever the result
            try:
                os.kill(pid, 9)
            except OSError:
                pass
        self.assertEqual(survivors, [], "pool workers must exit when the parent process dies")

    @unittest.skipUnless(sys.platform == "win32", "the parent-alive probe uses Windows process inspection")
    def test_parent_alive_probe_reports_a_dead_pid_as_dead(self):
        sys.path.insert(0, str(ROOT))
        import main as vnmain

        P = vnmain._ooxml_zip_patch()
        self.assertTrue(P._p1_parent_alive(os.getpid()))
        dead = subprocess.Popen([sys.executable, "-c", "pass"])
        dead.wait()
        self.assertFalse(P._p1_parent_alive(dead.pid))


if __name__ == "__main__":
    unittest.main()
