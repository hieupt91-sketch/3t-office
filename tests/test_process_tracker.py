from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
TRACKER_PATH = ROOT / "platform" / "process_lifecycle" / "process_tracker.py"
SPEC = importlib.util.spec_from_file_location("vno_test_process_tracker", TRACKER_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)
ProcessTracker = MODULE.ProcessTracker


class ProcessTrackerTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.data_dir = Path(self.temp_dir.name) / "3TOffice"

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_register_is_identity_scoped_fsynced_and_deduplicated(self):
        identities = {10: "owner-created", 20: "child-created"}
        tracker = ProcessTracker(
            self.data_dir,
            root_pid=10,
            root_created_at="owner-created",
            identity_reader=identities.get,
            terminator=lambda _pid: None,
        )
        self.assertTrue(tracker.register(20, "uno-worker"))
        self.assertTrue(tracker.register(20, "uno-worker"))

        records = tracker._read_records()
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["pid"], 20)
        self.assertEqual(records[0]["created_at"], "child-created")
        self.assertEqual(records[0]["owner_pid"], 10)
        self.assertEqual(records[0]["role"], "uno-worker")

    def test_cleanup_stops_only_this_owner_and_retains_live_other_session(self):
        identities = {10: "owner-a", 20: "child-a", 30: "owner-b", 31: "child-b"}
        stopped = []

        def terminate(pid):
            stopped.append(pid)
            identities.pop(pid, None)

        tracker = ProcessTracker(
            self.data_dir, root_pid=10, root_created_at="owner-a",
            identity_reader=identities.get, terminator=terminate,
        )
        tracker.register(20, "uno-worker")
        tracker.record_external(31, "child-b", "other-worker", 30, "owner-b")

        result = tracker.cleanup()
        self.assertEqual(result, {"stopped": 1, "removed": 1})
        self.assertEqual(stopped, [20])
        remaining = tracker._read_records()
        self.assertEqual([(item["owner_pid"], item["pid"]) for item in remaining], [(30, 31)])

    def test_startup_sweep_requires_dead_owner_and_matching_child_identity(self):
        identities = {10: "owner-a", 20: "child-a", 30: "owner-b", 31: "child-b"}
        stopped = []

        def terminate(pid):
            stopped.append(pid)
            identities.pop(pid, None)

        tracker = ProcessTracker(
            self.data_dir, root_pid=99, root_created_at="new-owner",
            identity_reader=identities.get, terminator=terminate,
        )
        tracker.record_external(20, "child-a", "stale-helper", 10, "owner-a")
        tracker.record_external(31, "child-b", "live-helper", 30, "owner-b")
        tracker.record_external(40, "old-child", "reused-pid", 41, "dead-owner")
        identities.pop(10)
        identities[40] = "new-unrelated-process"

        result = tracker.startup_sweep()
        self.assertEqual(stopped, [20])
        self.assertEqual(result, {"stopped": 1, "retained": 1, "removed": 2})
        self.assertEqual([item["pid"] for item in tracker._read_records()], [31])

    def test_register_tree_records_descendants_by_parent_chain_without_names(self):
        identities = {10: "owner", 20: "wrapper", 21: "soffice-bin", 22: "helper-child"}
        tracker = ProcessTracker(
            self.data_dir, root_pid=10, root_created_at="owner",
            identity_reader=identities.get, terminator=lambda _pid: None,
        )
        with mock.patch.object(MODULE, "process_tree", return_value=[(21, 20), (22, 21)]):
            registered = tracker.register_tree(20, "soffice")

        self.assertEqual(registered, [20, 21, 22])
        records = tracker._read_records()
        self.assertEqual([item["parent_pid"] for item in records], [10, 20, 21])
        self.assertEqual([item["role"] for item in records], ["soffice", "soffice-child", "soffice-child"])

    def test_cleanup_rescans_and_stops_late_descendants_before_owned_root(self):
        identities = {10: "owner", 20: "helper", 21: "late-child"}
        stopped = []
        tracker = ProcessTracker(
            self.data_dir, root_pid=10, root_created_at="owner",
            identity_reader=identities.get,
            terminator=lambda pid: (stopped.append(pid), identities.pop(pid, None)),
        )
        tracker.register(20, "uno-helper")
        with mock.patch.object(MODULE, "process_tree", return_value=[(21, 20)]):
            result = tracker.cleanup()
        self.assertEqual(result, {"stopped": 1, "removed": 1})
        self.assertEqual(stopped, [21, 20])

    def test_cleanup_terminates_a_real_child_started_by_the_test(self):
        process = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(30)"], creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        try:
            tracker = ProcessTracker(self.data_dir)
            self.assertTrue(tracker.register(process.pid, "test-helper"))
            result = tracker.cleanup()
            process.wait(timeout=5)
            self.assertEqual(result["stopped"], 1)
            self.assertIsNotNone(process.returncode)
            self.assertEqual(tracker._read_records(), [])
        finally:
            if process.poll() is None:
                process.kill()
                process.wait(timeout=5)

    def test_append_from_env_uses_existing_owner_identity(self):
        identities = {10: "owner", 20: "child"}
        tracker = ProcessTracker(
            self.data_dir, root_pid=10, root_created_at="owner",
            identity_reader=identities.get, terminator=lambda _pid: None,
        )
        tracker.state_path.parent.mkdir(parents=True, exist_ok=True)
        env = {
            "VNO_PROCESS_TRACKER_STATE": str(tracker.state_path),
            "VNO_PROCESS_TRACKER_ROOT_PID": "10",
            "VNO_PROCESS_TRACKER_ROOT_CREATED_AT": "owner",
        }
        with mock.patch.dict(os.environ, env, clear=False):
            self.assertTrue(MODULE.append_process_record_from_env(20, "child", "office-com-worker", parent_pid=15))
        record = json.loads(tracker.state_path.read_text(encoding="utf-8"))
        self.assertEqual((record["owner_pid"], record["pid"], record["parent_pid"]), (10, 20, 15))


if __name__ == "__main__":
    unittest.main()
