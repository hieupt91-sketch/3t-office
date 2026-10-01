from __future__ import annotations

import contextlib
import importlib.util
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "layout-audit" / "_print_page_audit.py"
SPEC = importlib.util.spec_from_file_location("vno_print_page_audit", MODULE_PATH)
AUDIT = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(AUDIT)


class PrintPageAuditTests(unittest.TestCase):
    def _run_one(self, app_result, office_result):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "sample.docx"
            source.write_bytes(b"local synthetic placeholder")
            output = root / "out"
            with (
                patch.object(AUDIT, "_run_app_audit", return_value=app_result),
                patch.object(AUDIT, "_run_office_oracle", return_value=office_result) as oracle,
                contextlib.redirect_stdout(io.StringIO()),
            ):
                row = AUDIT._run_one(output, source)
            return row, oracle

    def test_reports_separate_app_and_office_page_counts_and_deltas(self):
        row, _ = self._run_one(
            {
                "status": "PASS",
                "canvas_pages": 2,
                "print_pages": 3,
                "export_pages": 4,
                "app_print_engine": "LibreOffice",
            },
            ("PASS", "3", "OK pages=3"),
        )
        self.assertEqual(row["status"], "PASS")
        self.assertEqual(row["app_status"], "PASS")
        self.assertEqual(row["office_pages"], "3")
        self.assertEqual(row["print_delta_vs_office"], 0)
        self.assertEqual(row["export_delta_vs_office"], 1)
        self.assertEqual(row["print_export_delta"], -1)

    def test_keeps_office_page_count_when_desktop_app_fails(self):
        row, oracle = self._run_one(
            {"status": "FAIL", "error": "synthetic desktop failure"},
            ("PASS", "2", "OK pages=2"),
        )
        self.assertEqual(row["status"], "FAIL")
        self.assertEqual(row["app_status"], "FAIL")
        self.assertEqual(row["office_pages"], "2")
        oracle.assert_called_once()

    def test_marks_missing_office_oracle_as_blocked(self):
        row, _ = self._run_one(
            {"status": "PASS", "print_pages": 1, "export_pages": 1, "app_print_engine": "LibreOffice"},
            ("BLOCKED", "-", "PowerShell is unavailable"),
        )
        self.assertEqual(row["app_status"], "PASS")
        self.assertEqual(row["office_status"], "BLOCKED")
        self.assertEqual(row["status"], "BLOCKED")


if __name__ == "__main__":
    unittest.main()
