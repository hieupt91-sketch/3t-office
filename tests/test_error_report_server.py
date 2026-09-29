import base64
import importlib.util
import json
import tempfile
import threading
import unittest
import uuid
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from adapters.error_reporting.reporter import ErrorReporter


SERVER_PATH = Path(__file__).resolve().parents[1] / "tools" / "error-report-server" / "server.py"
SPEC = importlib.util.spec_from_file_location("vno_error_report_server", SERVER_PATH)
server_module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(server_module)


class ErrorReportReceiverTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.data_dir = Path(self.temp.name) / "data"
        self.server = server_module.create_server("127.0.0.1", 0, self.data_dir, "server-test-token", "viewer", "view-password")
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)
        self.base_url = f"http://127.0.0.1:{self.server.server_port}"

    def _valid_report(self, **changes):
        report = {
            "schema_version": 1,
            "event_id": str(uuid.uuid4()),
            "timestamp": "2026-09-29T03:00:00+00:00",
            "app_version": "0.9.0-pilot1",
            "app": "writer",
            "error_type": "RuntimeError",
            "message": "Không mở được <path>",
            "stack": "Traceback\n  File <path>, line 9",
            "operation": "open.docx",
            "file_extension": "docx",
            "file_size_bucket": 262144,
            "duration_ms": 230,
            "os_version": "Windows 11",
            "installation_id": str(uuid.uuid4()),
            "fingerprint": "RuntimeError: File <path>",
        }
        report.update(changes)
        return report

    def _request(self, path, body, *, token="server-test-token", content_type="application/json"):
        request = Request(
            self.base_url + path,
            data=body,
            headers={"Authorization": f"Bearer {token}", "Content-Type": content_type},
            method="POST",
        )
        return urlopen(request, timeout=2)

    def test_bad_token_is_401(self):
        body = json.dumps(self._valid_report()).encode("utf-8")
        with self.assertRaises(HTTPError) as caught:
            self._request("/api/v1/reports", body, token="bad-token")
        self.assertEqual(caught.exception.code, 401)

    def test_viewer_basic_credentials_do_not_authorize_report_post(self):
        body = json.dumps(self._valid_report()).encode("utf-8")
        request = Request(
            self.base_url + "/api/v1/reports",
            data=body,
            headers={
                "Authorization": "Basic " + base64.b64encode(b"viewer:view-password").decode("ascii"),
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with self.assertRaises(HTTPError) as caught:
            urlopen(request, timeout=2)
        self.assertEqual(caught.exception.code, 401)

    def test_oversized_payload_is_413(self):
        body = b" " * (server_module.MAX_REPORT_BYTES + 1)
        with self.assertRaises(HTTPError) as caught:
            self._request("/api/v1/reports", body)
        self.assertEqual(caught.exception.code, 413)

    def test_valid_report_returns_200_and_writes_daily_jsonl(self):
        report = self._valid_report()
        response = self._request("/api/v1/reports", json.dumps(report).encode("utf-8"))
        self.assertEqual(response.status, 200)
        self.assertEqual(json.loads(response.read())["report_id"], report["event_id"])
        logs = list(self.data_dir.glob("errors-*.jsonl"))
        self.assertEqual(len(logs), 1)
        stored = json.loads(logs[0].read_text(encoding="utf-8").strip())
        self.assertEqual(stored["event_id"], report["event_id"])
        self.assertEqual(len(stored["fingerprint"]), 64)
        self.assertIn("File <path>, line 9", stored["fingerprint_label"])
        self.assertNotIn("Traceback", stored["fingerprint_label"])
        self.assertNotIn("C:\\Users", logs[0].read_text(encoding="utf-8"))

    def test_json_schema_rejects_extra_fields(self):
        report = self._valid_report(document_content="must never be accepted")
        with self.assertRaises(HTTPError) as caught:
            self._request("/api/v1/reports", json.dumps(report).encode("utf-8"))
        self.assertEqual(caught.exception.code, 400)

    def test_attachment_is_separate_multipart_and_viewer_is_protected(self):
        report = self._valid_report(
            error_type="UserFeedback", message="Người dùng gửi góp ý", fingerprint="UserFeedback",
            feedback_description="Nút mở báo lỗi khi tôi chọn tài liệu",
        )
        response = self._request("/api/v1/reports", json.dumps(report).encode("utf-8"))
        self.assertEqual(response.status, 200)
        boundary = "vno-unit-test"
        contents = b"private attachment contents"
        body = (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"document.docx\"\r\n"
            "Content-Type: application/octet-stream\r\n\r\n"
        ).encode("ascii") + contents + f"\r\n--{boundary}--\r\n".encode("ascii")
        response = self._request(
            f"/api/v1/reports/{report['event_id']}/attachment", body,
            content_type=f"multipart/form-data; boundary={boundary}",
        )
        self.assertEqual(response.status, 200)
        attachments = list((self.data_dir / "attachments").glob("*.bin"))
        self.assertEqual(len(attachments), 1)
        self.assertEqual(attachments[0].read_bytes(), contents)
        self.assertNotIn(contents.decode(), next(self.data_dir.glob("errors-*.jsonl")).read_text(encoding="utf-8"))

        with self.assertRaises(HTTPError) as caught:
            urlopen(self.base_url + "/", timeout=2)
        self.assertEqual(caught.exception.code, 401)
        auth = "Basic " + base64.b64encode(b"viewer:view-password").decode("ascii")
        page = urlopen(Request(self.base_url + "/", headers={"Authorization": auth}), timeout=2)
        self.assertEqual(page.status, 200)
        self.assertIn("Báo cáo lỗi VN Office", page.read().decode("utf-8"))

    def test_client_sender_posts_feedback_json_then_attachment_as_second_request(self):
        source = Path(self.temp.name) / "Bản thử.docx"
        source.write_bytes(b"contents selected by the user")
        local_data = Path(self.temp.name) / "client-data"
        reporter = ErrorReporter(
            "0.9.0-pilot1", "writer", local_data,
            endpoint=f"{self.base_url}/api/v1/reports", token="server-test-token", sender_thread=False,
        )
        reporter.set_consent(True)
        queued = reporter.submit_user_feedback(
            "Tôi xác nhận gửi tệp để tái hiện lỗi.", attach_current_file=True, current_file=source,
        )
        self.assertTrue(queued["queued"])
        self.assertTrue(reporter.send_once())
        report_line = next(self.data_dir.glob("errors-*.jsonl")).read_text(encoding="utf-8")
        self.assertIn("Tôi xác nhận gửi tệp", report_line)
        self.assertEqual(len(list((self.data_dir / "attachments").glob("*.bin"))), 1)
        self.assertEqual(list((local_data / "reports" / "queue").glob("*.json")), [])


if __name__ == "__main__":
    unittest.main()
