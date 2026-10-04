"""Background license refresh policy: network only when licensed and due; real version sent to the server."""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import main as vnmain  # noqa: E402


class RefreshPolicyTests(unittest.TestCase):
    def test_trial_and_unlicensed_never_touch_the_network(self):
        self.assertFalse(vnmain._license_refresh_due({"licensed": False, "state": "trial"}))
        self.assertFalse(vnmain._license_refresh_due({"licensed": False, "state": "trial_expired"}))

    def test_active_is_refreshed_only_within_seven_days_of_the_check_date(self):
        self.assertFalse(vnmain._license_refresh_due({"licensed": True, "state": "active", "days_until_check": 20}))
        self.assertTrue(vnmain._license_refresh_due({"licensed": True, "state": "active", "days_until_check": 7}))
        self.assertTrue(vnmain._license_refresh_due({"licensed": True, "state": "active", "days_until_check": 0}))
        self.assertFalse(vnmain._license_refresh_due({"licensed": True, "state": "active"}))

    def test_grace_and_overdue_are_always_refreshed(self):
        self.assertTrue(vnmain._license_refresh_due({"licensed": True, "state": "active_grace"}))
        self.assertTrue(vnmain._license_refresh_due({"licensed": True, "state": "check_required"}))


class AppVersionTests(unittest.TestCase):
    def test_reads_version_txt_of_the_install(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "VERSION.txt").write_text("0.9.9\n", encoding="ascii")
            with mock.patch.object(vnmain, "_update_install_root", return_value=Path(tmp)):
                self.assertEqual(vnmain._license_app_version(), "0.9.9")

    def test_falls_back_without_an_install(self):
        with mock.patch.object(vnmain, "_update_install_root", return_value=None):
            self.assertEqual(vnmain._license_app_version(), vnmain.APP_VERSION)

    def test_falls_back_on_unreadable_version_and_caps_length(self):
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch.object(vnmain, "_update_install_root", return_value=Path(tmp)):
                self.assertEqual(vnmain._license_app_version(), vnmain.APP_VERSION)  # no VERSION.txt
            (Path(tmp) / "VERSION.txt").write_text("1" * 100, encoding="ascii")
            with mock.patch.object(vnmain, "_update_install_root", return_value=Path(tmp)):
                self.assertEqual(len(vnmain._license_app_version()), 40)


if __name__ == "__main__":
    unittest.main()
