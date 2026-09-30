import csv
import importlib.util
import io
import json
import sys
import tempfile
import unittest
import uuid
from contextlib import redirect_stderr
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SERVER_DIR = REPO_ROOT / "tools" / "error-report-server"


def _load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


# export_csv.py does "from server import ..."; register the real server module
# under that name so the import resolves without changing sys.path globally.
_server = _load_module("server", SERVER_DIR / "server.py")
export_csv = _load_module("vno_error_report_export", SERVER_DIR / "export_csv.py")
del sys.modules["server"]


def make_report(**overrides):
    report = {
        "schema_version": 1,
        "event_id": str(uuid.uuid4()),
        "timestamp": "2026-09-29T10:00:00+00:00",
        "app_version": "0.9.0",
        "app": "writer",
        "error_type": "RuntimeError",
        "message": "Lỗi không mong đợi khi mở tài liệu",
        "stack": "Traceback\n  File <path>, line 9",
        "operation": "open.docx",
        "file_extension": "docx",
        "file_size_bucket": 1024,
        "duration_ms": 10,
        "os_version": "Windows 11",
        "installation_id": str(uuid.uuid4()),
        "fingerprint": "fp-open-docx",
        "fingerprint_label": "RuntimeError: File <path>",
        "received_at": "2026-09-29T10:00:00+00:00",
    }
    report.update(overrides)
    return json.dumps(report, ensure_ascii=False)


class ErrorReportExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.data_dir = Path(self.temp.name) / "data"
        self.data_dir.mkdir()
        self.out_csv = Path(self.temp.name) / "out.csv"

    def write_log(self, day, lines):
        path = self.data_dir / f"errors-{day}.jsonl"
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return path

    def run_export(self, *extra_args):
        stderr = io.StringIO()
        with redirect_stderr(stderr):
            code = export_csv.main([str(self.data_dir), str(self.out_csv), *extra_args])
        return code, stderr.getvalue()

    def read_rows(self):
        raw = self.out_csv.read_bytes()
        self.assertTrue(raw.startswith(b"\xef\xbb\xbf"), "CSV must start with UTF-8 BOM")
        with self.out_csv.open("r", encoding="utf-8-sig", newline="") as stream:
            return list(csv.reader(stream))

    def test_groups_sorts_and_reports_malformed_lines(self):
        self.write_log("2026-09-29", [
            make_report(),
            make_report(event_id=str(uuid.uuid4()), installation_id="11111111-1111-1111-1111-111111111111"),
            make_report(
                event_id=str(uuid.uuid4()),
                error_type="ValueError",
                fingerprint="fp-read-ods",
                fingerprint_label="ValueError: ods",
                message="Đọc tệp .ods thất bại: định dạng không hợp lệ",
                operation="read.ods",
                file_extension="ods",
                app="sheet",
                received_at="2026-09-29T11:00:00+00:00",
            ),
            "{not valid json",
        ])
        self.write_log("2026-09-30", [
            make_report(
                event_id=str(uuid.uuid4()),
                installation_id="22222222-2222-2222-2222-222222222222",
                app_version="0.9.1",
                message="Lỗi mới nhất: tài liệu bị hỏng",
                received_at="2026-09-30T08:00:00+00:00",
            ),
        ])

        code, stderr = self.run_export()

        self.assertEqual(code, 0)
        self.assertIn("Skipped 1 malformed JSONL line(s).", stderr)
        rows = self.read_rows()
        self.assertEqual(rows[0], [
            "fingerprint", "error_type", "operation", "app", "count",
            "installations", "first_seen", "last_seen", "latest_app_version",
            "file_extensions", "example_message",
        ])
        self.assertEqual(len(rows), 3)
        top, second = rows[1], rows[2]
        self.assertEqual(top[0], "fp-open-docx")
        self.assertEqual(top[4], "3")
        self.assertEqual(top[5], "3")
        self.assertEqual(top[6], "2026-09-29T10:00:00+00:00")
        self.assertEqual(top[7], "2026-09-30T08:00:00+00:00")
        self.assertEqual(top[8], "0.9.1")
        self.assertEqual(top[9], "docx")
        self.assertEqual(top[10], "Lỗi mới nhất: tài liệu bị hỏng")
        self.assertEqual(second[0], "fp-read-ods")
        self.assertEqual(second[4], "1")
        self.assertEqual(second[5], "1")
        self.assertEqual(second[8], "0.9.0")
        self.assertEqual(second[9], "ods")
        self.assertEqual(second[10], "Đọc tệp .ods thất bại: định dạng không hợp lệ")

    def test_date_filter_excludes_old_files(self):
        self.write_log("2026-09-29", [make_report()])
        self.write_log("2026-09-30", [
            make_report(
                event_id=str(uuid.uuid4()),
                error_type="ValueError",
                fingerprint="fp-read-ods",
                fingerprint_label="ValueError: ods",
                message="Đọc tệp .ods thất bại",
                operation="read.ods",
                file_extension="ods",
                app="sheet",
                received_at="2026-09-30T09:00:00+00:00",
            ),
        ])

        code, stderr = self.run_export("--since", "2026-09-30")

        self.assertEqual(code, 0)
        self.assertEqual(stderr, "")
        rows = self.read_rows()
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[1][0], "fp-read-ods")
        self.assertEqual(rows[1][6], "2026-09-30T09:00:00+00:00")

    def test_until_filter_is_inclusive(self):
        self.write_log("2026-09-29", [make_report()])
        self.write_log("2026-09-30", [
            make_report(
                event_id=str(uuid.uuid4()),
                error_type="ValueError",
                fingerprint="fp-read-ods",
                fingerprint_label="ValueError: ods",
                message="Đọc tệp .ods thất bại",
                operation="read.ods",
                file_extension="ods",
                app="sheet",
                received_at="2026-09-30T09:00:00+00:00",
            ),
        ])

        code, _ = self.run_export("--until", "2026-09-29")

        self.assertEqual(code, 0)
        rows = self.read_rows()
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[1][0], "fp-open-docx")

    def test_filter_with_no_matching_files_fails_without_output(self):
        self.write_log("2026-09-29", [make_report()])

        code, stderr = self.run_export("--since", "2026-10-01")

        self.assertEqual(code, 1)
        self.assertIn("No matching JSONL files found.", stderr)
        self.assertFalse(self.out_csv.exists())

    def test_missing_data_dir_fails(self):
        missing = Path(self.temp.name) / "missing"
        stderr = io.StringIO()
        with redirect_stderr(stderr):
            code = export_csv.main([str(missing), str(self.out_csv)])

        self.assertEqual(code, 1)
        self.assertIn("data directory not found", stderr.getvalue())

    def test_invalid_date_format_is_rejected(self):
        self.write_log("2026-09-29", [make_report()])

        with self.assertRaises(SystemExit) as ctx:
            self.run_export("--since", "2026/09/29")

        self.assertEqual(ctx.exception.code, 2)


if __name__ == "__main__":
    unittest.main()
