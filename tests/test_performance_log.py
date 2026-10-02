from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LOGGER_PATH = ROOT / "platform" / "performance" / "performance_log.py"
SPEC = importlib.util.spec_from_file_location("vno_test_performance_log", LOGGER_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)
PerformanceLog = MODULE.PerformanceLog


class PerformanceLogTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.data_dir = Path(self.temp_dir.name) / "3TOffice"

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_default_is_off_and_disabled_record_creates_no_jsonl(self):
        log = PerformanceLog(self.data_dir, memory_reader=lambda: 123)
        self.assertEqual(log.get_settings(), {"enabled": False})
        self.assertFalse(log.record("open", app="writer", duration_ms=10))
        self.assertEqual(list(log.directory.glob("*.jsonl")), [])

    def test_opt_in_settings_are_atomic_and_persisted(self):
        log = PerformanceLog(self.data_dir)
        self.assertEqual(log.set_settings({"enabled": True}), {"enabled": True})
        self.assertEqual(PerformanceLog(self.data_dir).get_settings(), {"enabled": True})
        self.assertEqual(list(log.directory.glob(".settings-*.tmp")), [])
        self.assertEqual(log.set_settings({"enabled": False}), {"enabled": False})

    def test_jsonl_schema_has_duration_memory_and_no_document_data(self):
        log = PerformanceLog(self.data_dir, memory_reader=lambda: 987654)
        log.set_settings({"enabled": True})
        self.assertTrue(log.record("export_pdf", app="slides", duration_ms=12.345, outcome="ok"))
        entry = json.loads(log.log_path.read_text(encoding="utf-8"))
        self.assertEqual(entry["operation"], "export_pdf")
        self.assertEqual(entry["app"], "slides")
        self.assertEqual(entry["duration_ms"], 12.3)
        self.assertEqual(entry["memory_bytes"], 987654)
        self.assertEqual(entry["outcome"], "ok")
        self.assertNotIn("path", entry)
        self.assertNotIn("content", entry)
        self.assertNotIn("document", entry)

    def test_rotation_keeps_active_plus_two_backups_at_five_mb_contract(self):
        self.assertEqual(MODULE.MAX_FILE_BYTES, 5 * 1024 * 1024)
        self.assertEqual(MODULE.MAX_FILES, 3)
        log = PerformanceLog(self.data_dir, max_file_bytes=1024, max_files=3, memory_reader=lambda: 1)
        log.set_settings({"enabled": True})
        for index in range(100):
            log.record("soffice_start", app="sheet", duration_ms=index, event="soffice_start")

        files = sorted(log.directory.glob("performance*.jsonl"))
        self.assertEqual([item.name for item in files], ["performance.1.jsonl", "performance.2.jsonl", "performance.jsonl"])
        self.assertTrue(all(item.stat().st_size <= 1024 for item in files))
        for item in files:
            for line in item.read_text(encoding="utf-8").splitlines():
                json.loads(line)

    def test_folder_path_is_local_data_directory(self):
        log = PerformanceLog(self.data_dir)
        folder = Path(log.folder_path())
        self.assertTrue(folder.is_dir())
        self.assertEqual(folder, (self.data_dir / "performance").resolve())


if __name__ == "__main__":
    unittest.main()
