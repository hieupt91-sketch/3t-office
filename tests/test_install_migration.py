"""Patch-only updates must bring an older install to the same state as the new Setup."""

import json
import tempfile
import unittest
from pathlib import Path

from adapters import install_migration as migration


class FakeWinreg:
    """Minimal in-memory HKCU so the registration logic is testable on any machine."""

    HKEY_CURRENT_USER = "HKCU"
    KEY_SET_VALUE = 2
    REG_SZ = 1

    def __init__(self, preset=None):
        self.keys = {}
        for path, values in (preset or {}).items():
            self.keys[path.lower()] = dict(values)

    class _Key:
        def __init__(self, path):
            self.path = path

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    def CreateKeyEx(self, hive, path, reserved, access):
        self.keys.setdefault(path.lower(), {})
        return self._Key(path.lower())

    def OpenKey(self, hive, path, reserved=0, access=0):
        if path.lower() not in self.keys:
            raise FileNotFoundError(path)
        return self._Key(path.lower())

    def SetValueEx(self, key, name, reserved, kind, value):
        self.keys[key.path][name] = value

    def QueryValueEx(self, key, name):
        values = self.keys[key.path]
        if name not in values:
            raise FileNotFoundError(name)
        return values[name], self.REG_SZ

    def DeleteValue(self, key, name):
        if name not in self.keys[key.path]:
            raise FileNotFoundError(name)
        del self.keys[key.path][name]


class ConfigMigrationTests(unittest.TestCase):
    def _write(self, directory, data):
        path = Path(directory) / "vnoffice-config.json"
        path.write_text(json.dumps(data), encoding="utf-8")
        return path

    def test_old_lan_only_config_gains_internet_source_and_report_endpoint(self):
        with tempfile.TemporaryDirectory() as directory:
            lan = r"\\192.168.1.252\company1\Software\VNOffice\updates"
            path = self._write(directory, {
                "errorReporting": {"enabled": True, "endpoint": "", "token": ""},
                "update": {"source": lan, "channel": "pilot"},
            })
            self.assertTrue(migration.migrate_client_config(path))
            config = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(config["update"]["sources"], [lan, migration.DEFAULT_INTERNET_UPDATE_SOURCE])
            self.assertEqual(config["update"]["channel"], "pilot")
            self.assertEqual(config["errorReporting"]["endpoint"], migration.DEFAULT_REPORT_ENDPOINT)
            self.assertNotIn("token", config["errorReporting"])

    def test_migration_is_idempotent_and_keeps_owner_choices(self):
        with tempfile.TemporaryDirectory() as directory:
            path = self._write(directory, {
                "errorReporting": {"enabled": False, "endpoint": "https://example.test"},
                "update": {"sources": ["D:\\updates"], "channel": "stable"},
            })
            before = path.read_text(encoding="utf-8")
            self.assertFalse(migration.migrate_client_config(path))
            self.assertEqual(path.read_text(encoding="utf-8"), before)

    def test_missing_or_invalid_config_is_left_alone(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertFalse(migration.migrate_client_config(Path(directory) / "missing.json"))
            bad = Path(directory) / "bad.json"
            bad.write_text("{not json", encoding="utf-8")
            self.assertFalse(migration.migrate_client_config(bad))
            self.assertEqual(bad.read_text(encoding="utf-8"), "{not json")


class ShellRegistrationTests(unittest.TestCase):
    def _install(self, directory, names=("Doc.exe", "Sheet.exe", "Slide.exe")):
        launchers = Path(directory) / "app" / "launchers"
        launchers.mkdir(parents=True, exist_ok=True)
        for name in names:
            (launchers / name).write_bytes(b"MZ")

    def test_registers_open_with_for_each_launcher_and_removes_legacy_python_entry(self):
        legacy = {
            r"software\classes\.docx\openwithprogids": {"VNOffice.Writer.Document": ""},
            r"software\classes\vnoffice.writer.document\shell\open\command": {"": '"pythonw.exe" -s main.py'},
        }
        registry = FakeWinreg(legacy)
        with tempfile.TemporaryDirectory() as directory:
            self._install(directory)
            registered = migration.ensure_shell_registration(Path(directory), registry)
            self.assertEqual(registered, ["Doc.exe", "Sheet.exe", "Slide.exe"])
            app = registry.keys[r"software\classes\applications\doc.exe"]
            self.assertEqual(app["FriendlyAppName"], "Doc")
            self.assertEqual(registry.keys[r"software\classes\applications\doc.exe\defaulticon"][""],
                             f"{Path(directory) / 'app' / 'launchers' / 'Doc.exe'},0")
            self.assertIn(r"software\classes\.xlsx\openwithlist\sheet.exe", registry.keys)
            self.assertIn(r"software\classes\.pptx\openwithlist\slide.exe", registry.keys)
            self.assertNotIn("VNOffice.Writer.Document", registry.keys[r"software\classes\.docx\openwithprogids"])
            command = registry.keys[r"software\classes\vnoffice.writer.document\shell\open\command"][""]
            self.assertIn("Doc.exe", command)
            self.assertNotIn("pythonw", command)

    def test_does_not_create_file_type_progids_that_never_existed(self):
        registry = FakeWinreg()
        with tempfile.TemporaryDirectory() as directory:
            self._install(directory)
            migration.ensure_shell_registration(Path(directory), registry)
        self.assertNotIn(r"software\classes\vnoffice.sheet.workbook\shell\open\command", registry.keys)

    def test_only_installed_launchers_are_registered(self):
        registry = FakeWinreg()
        with tempfile.TemporaryDirectory() as directory:
            self._install(directory, names=("Sheet.exe",))
            self.assertEqual(migration.ensure_shell_registration(Path(directory), registry), ["Sheet.exe"])
        self.assertNotIn(r"software\classes\applications\doc.exe", registry.keys)

    def test_shell_migration_runs_once_per_version(self):
        calls = []
        original = migration.ensure_shell_registration
        original_retarget = migration.retarget_shortcuts
        migration.ensure_shell_registration = lambda root, *a, **k: calls.append("register") or ["Doc.exe"]
        migration.retarget_shortcuts = lambda root, *a, **k: calls.append("retarget") or True
        try:
            with tempfile.TemporaryDirectory() as root, tempfile.TemporaryDirectory() as data:
                self.assertTrue(migration.run_shell_migrations_once(Path(root), Path(data), "9.9.9"))
                self.assertFalse(migration.run_shell_migrations_once(Path(root), Path(data), "9.9.9"))
                self.assertTrue(migration.run_shell_migrations_once(Path(root), Path(data), "9.9.10"))
            self.assertEqual(calls, ["register", "retarget", "register", "retarget"])
        finally:
            migration.ensure_shell_registration = original
            migration.retarget_shortcuts = original_retarget

    def test_shell_migration_failure_never_raises_and_retries_next_launch(self):
        original = migration.ensure_shell_registration

        def boom(*args, **kwargs):
            raise PermissionError("registry locked")

        migration.ensure_shell_registration = boom
        try:
            with tempfile.TemporaryDirectory() as root, tempfile.TemporaryDirectory() as data:
                self.assertFalse(migration.run_shell_migrations_once(Path(root), Path(data), "9.9.9"))
                self.assertFalse((Path(data) / "shell-registration-9.9.9.done").exists())
        finally:
            migration.ensure_shell_registration = original


if __name__ == "__main__":
    unittest.main()
