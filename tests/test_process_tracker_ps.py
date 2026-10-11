"""macOS support in the process tracker: identity and child tree come from `ps` when there is no /proc."""

from __future__ import annotations

import importlib.util
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "vno_process_tracker_ps", ROOT / "platform" / "process_lifecycle" / "process_tracker.py",
)
tracker = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = tracker
spec.loader.exec_module(tracker)


class PsParsingTests(unittest.TestCase):
    def test_start_time_is_normalised_and_empty_means_gone(self):
        self.assertEqual(tracker.parse_ps_start_time("Sun Oct  5 11:20:33 2026\n"), "Sun Oct 5 11:20:33 2026")
        self.assertEqual(tracker.parse_ps_start_time("Sun   Oct 5 11:20:33 2026"), "Sun Oct 5 11:20:33 2026")
        self.assertIsNone(tracker.parse_ps_start_time(""))
        self.assertIsNone(tracker.parse_ps_start_time("  \n"))

    def test_parent_table_parses_pairs_and_skips_noise(self):
        table = tracker.parse_ps_parent_table("  1     0\n 100   1\n 101 100\nbad line here\nabc 5\n 7 x\n")
        self.assertEqual(table, {1: 0, 100: 1, 101: 100})
        self.assertEqual(tracker.parse_ps_parent_table(""), {})

    def test_ps_helpers_use_the_c_locale_and_degrade_to_none_or_empty(self):
        with mock.patch.object(tracker, "_run_ps", return_value=None):
            self.assertIsNone(tracker._ps_start_time(123))
            self.assertEqual(tracker._ps_parent_table(), {})
        with mock.patch.object(tracker, "_run_ps", return_value="Mon Oct  6 01:02:03 2026\n") as run:
            self.assertEqual(tracker._ps_start_time(42), "Mon Oct 6 01:02:03 2026")
            run.assert_called_once_with("-o", "lstart=", "-p", "42")
        with mock.patch.object(tracker, "_run_ps", return_value=" 5 1\n 6 5\n") as run:
            self.assertEqual(tracker._ps_parent_table(), {5: 1, 6: 5})
            run.assert_called_once_with("-axo", "pid=,ppid=")

    def test_macos_process_identity_uses_start_time_and_rejects_zombies(self):
        normal = "Sun Oct 11 22:50:10 2026     S+\n"
        with mock.patch.object(tracker.Path, "is_dir", return_value=False):
            with mock.patch.object(tracker, "_run_ps", return_value=normal) as run:
                self.assertEqual(tracker.process_identity(123), "Sun Oct 11 22:50:10 2026")
                run.assert_called_once_with("-o", "lstart=,stat=", "-p", "123")
            with mock.patch.object(tracker, "_run_ps", return_value="Sun Oct 11 22:50:10 2026     Z+\n"):
                self.assertIsNone(tracker.process_identity(123))

    def test_run_ps_forces_the_c_locale_and_survives_a_missing_ps(self):
        seen = {}

        def fake_run(command, **kwargs):
            seen["command"] = command
            seen["lc_all"] = kwargs["env"]["LC_ALL"]
            return mock.Mock(returncode=0, stdout="x")

        with mock.patch("subprocess.run", side_effect=fake_run):
            self.assertEqual(tracker._run_ps("-o", "lstart=", "-p", "1"), "x")
        self.assertEqual(seen["lc_all"], "C")
        self.assertEqual(seen["command"][0], "ps")
        with mock.patch("subprocess.run", side_effect=FileNotFoundError):
            self.assertIsNone(tracker._run_ps("-axo", "pid=,ppid="))
        with mock.patch("subprocess.run", return_value=mock.Mock(returncode=1, stdout="junk")):
            self.assertIsNone(tracker._run_ps("-axo", "pid=,ppid="))


class UnchangedBehaviourTests(unittest.TestCase):
    @unittest.skipUnless(os.name == "nt", "Windows kernel32 path")
    def test_windows_identity_and_tree_do_not_use_ps(self):
        with mock.patch.object(tracker, "_run_ps", side_effect=AssertionError("ps must not run on Windows")):
            self.assertIsNotNone(tracker.process_identity(os.getpid()))
            self.assertIsInstance(tracker.process_tree(os.getpid()), list)


if __name__ == "__main__":
    unittest.main()
