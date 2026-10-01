import json
import getpass
import inspect
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from adapters.error_reporting.reporter import (
    ErrorReporter,
    MAX_QUEUE_BYTES,
    MAX_QUEUE_COUNT,
    load_client_config,
    sanitize_text,
)


class _CaptureHandler(BaseHTTPRequestHandler):
    received = []

    def log_message(self, *_args):
        pass

    def do_POST(self):
        size = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(size)
        if self.path.endswith("/token"):
            type(self).received.append((self.path, self.headers.get("Content-Type", ""), body))
            token_body = json.dumps({"token": "test-issued-token", "expires_at": int(time.time()) + 3600}).encode("ascii")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(token_body)))
            self.end_headers()
            self.wfile.write(token_body)
            return
        if self.headers.get("Authorization") != "Bearer test-token" and self.headers.get("X-Install-Token") != "test-issued-token":
            self.send_response(401)
            self.end_headers()
            return
        type(self).received.append((self.path, self.headers.get("Content-Type", ""), body))
        self.send_response(200)
        self.end_headers()


class ErrorReportingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.data_dir = Path(self.temp.name) / "app-data"

    def test_sanitizer_removes_vietnamese_windows_unc_file_uri_and_stack_paths(self):
        value = (
            "Lỗi ở C:\\Users\\Nguyễn Văn An\\Tài liệu\\Báo cáo quý.xlsx; "
            "\\\\may-chu\\phong-ban\\Hợp đồng.docx; "
            "file:///C:/Users/Nguy%E1%BB%85n%20V%C4%83n%20An/Documents/B%E1%BA%A3ng%20l%C6%B0%C6%A1ng.xlsx"
        )
        cleaned = sanitize_text(value)
        for secret in ("Nguyễn Văn An", "Báo cáo quý.xlsx", "may-chu", "Hợp đồng.docx", "Bảng lương.xlsx"):
            self.assertNotIn(secret, cleaned)
        unc_with_spaced_directories = sanitize_text(r"\\server\share\Tài liệu nội bộ\Hợp đồng.docx; next")
        self.assertNotIn("Tài liệu nội bộ", unc_with_spaced_directories)
        self.assertNotIn("Hợp đồng.docx", unc_with_spaced_directories)
        filename_only = sanitize_text("Không đọc được Báo cáo quý.xlsx")
        self.assertNotIn("Báo cáo", filename_only)
        self.assertIn("<file.xlsx>", filename_only)

        stack = "Traceback (most recent call last):\n  File 'C:\\Users\\Nguyễn Văn An\\Tài liệu\\Biên bản.docx', line 7\nRuntimeError: bad"
        cleaned_stack = sanitize_text(stack, limit=8000)
        self.assertNotIn("C:\\Users", cleaned_stack)
        self.assertNotIn("Nguyễn Văn An", cleaned_stack)
        self.assertNotIn("Biên bản.docx", cleaned_stack)
        self.assertIn("\n", cleaned_stack)
        username = getpass.getuser()
        if username:
            self.assertNotIn(username.lower(), sanitize_text(f"user={username}").lower())

    def test_quoted_document_text_is_redacted_but_identifiers_kept(self):
        cleaned = sanitize_text("Giá trị không hợp lệ 'Lương tháng 9 - Nguyễn Văn A' tại ô \"Tổng cộng\"")
        self.assertNotIn("Nguyễn", cleaned)
        self.assertNotIn("Tổng cộng", cleaned)
        self.assertIn("'<text>'", cleaned)
        identifiers = sanitize_text("'NoneType' object has no attribute 'get'")
        self.assertEqual(identifiers, "'NoneType' object has no attribute 'get'")
        smart_quotes = sanitize_text("Không tìm thấy “Hợp đồng lao động”")
        self.assertNotIn("Hợp đồng", smart_quotes)

    def test_long_message_token_is_redacted_and_output_is_bounded(self):
        cleaned = sanitize_text("lỗi " + ("bí mật" * 100))
        self.assertLessEqual(len(cleaned), 240)
        self.assertNotIn("bí mật" * 30, cleaned)

    def test_frontend_payload_is_allowlisted_and_sanitized_again_in_python(self):
        reporter = ErrorReporter("0.9.0-pilot1", "slides", self.data_dir, sender_thread=False)
        result = reporter.report_frontend_error({
            "type": "TypeError",
            "message": "Không tải được C:\\Users\\An\\Documents\\Báo cáo.pptx",
            "stack": "at open (file:///C:/Users/An/Documents/Bao%20cao.pptx:9:2)",
            "operation": "D:\\private\\Báo cáo.pptx",
            "documentContent": "Nội dung trang chiếu không được gửi",
        })
        self.assertTrue(result["queued"])
        event = json.loads(next(reporter.queue_dir.glob("*.json")).read_text(encoding="utf-8"))
        self.assertEqual(event["operation"], "unknown")
        self.assertEqual(event["stack"], "at <path>:9:2")
        serialized = json.dumps(event, ensure_ascii=False)
        for secret in ("Báo cáo.pptx", "file:///C:", "Documents", "documentContent", "Nội dung trang chiếu"):
            self.assertNotIn(secret, serialized)

    def test_stack_sanitizer_keeps_frames_but_drops_injected_non_frame_text(self):
        reporter = ErrorReporter("0.9.0-pilot1", "writer", self.data_dir, sender_thread=False)
        reporter.report_frontend_error({
            "type": "Thông tin ô bí mật",
            "message": "Lỗi giao diện",
            "stack": "Thông tin ô bí mật\n  at renderCell (file:///C:/Users/An/Bảng lương.xlsx:18:3)\nNội dung ô: 123456",
        })
        event = json.loads(next(reporter.queue_dir.glob("*.json")).read_text(encoding="utf-8"))
        self.assertEqual(event["error_type"], "FrontendError")
        self.assertEqual(event["stack"], "at <path>:18:3")
        self.assertNotIn("Bảng lương.xlsx", json.dumps(event, ensure_ascii=False))
        self.assertNotIn("Nội dung ô", json.dumps(event, ensure_ascii=False))

    def test_config_missing_defaults_offline_and_env_overrides_config(self):
        self.assertEqual(load_client_config(self.data_dir, {}), {"enabled": True, "endpoint": "", "token": ""})
        config_path = self.data_dir / "vnoffice-config.json"
        config_path.parent.mkdir(parents=True)
        config_path.write_text(json.dumps({"errorReporting": {"enabled": False, "endpoint": "https://config", "token": "config-token"}}), encoding="utf-8")
        value = load_client_config(self.data_dir, {"VNOFFICE_REPORT_ENDPOINT": "http://127.0.0.1:9/api/v1/reports", "VNOFFICE_REPORT_TOKEN": "env-token"})
        self.assertEqual(value, {"enabled": False, "endpoint": "http://127.0.0.1:9/api/v1/reports", "token": ""})

    def test_cloud_base_config_derives_reporting_endpoint_without_baking_in_a_host(self):
        config_path = self.data_dir / "vnoffice-config.json"
        config_path.parent.mkdir(parents=True)
        config_path.write_text(json.dumps({
            "cloudBaseUrl": "https://cloud.example.test/office",
            "errorReporting": {"enabled": True},
        }), encoding="utf-8")
        value = load_client_config(self.data_dir, {})
        self.assertEqual(value["endpoint"], "https://cloud.example.test/office/api/v1/reports")
        self.assertEqual(value["token"], "")

    def test_update_source_config_orders_cloud_before_lan(self):
        import main

        config_path = self.data_dir / "vnoffice-config.json"
        config_path.parent.mkdir(parents=True)
        config_path.write_text(json.dumps({
            "cloudBaseUrl": "https://cloud.example.test/office",
            "update": {"source": r"\\192.168.1.252\company1\Software\VNOffice\updates", "channel": "pilot"},
        }), encoding="utf-8")
        with patch.object(main, "ROOT_DIR", self.data_dir):
            value = main._load_update_config()
        self.assertEqual(value["sources"], [
            "https://cloud.example.test/office/updates",
            r"\\192.168.1.252\company1\Software\VNOffice\updates",
        ])
        self.assertEqual(value["channel"], "pilot")

    def test_consent_unknown_granted_denied_and_persists(self):
        reporter = ErrorReporter("0.9.0-pilot1", "writer", self.data_dir, sender_thread=False)
        self.assertEqual(reporter.get_state()["consent"], "unknown")
        reporter.set_consent(True)
        self.assertEqual(reporter.get_state()["consent"], "granted")
        another = ErrorReporter("0.9.0-pilot1", "sheet", self.data_dir, sender_thread=False)
        self.assertEqual(another.get_state()["consent"], "granted")
        another.set_consent(False)
        self.assertEqual(reporter.get_state()["consent"], "denied")

    def test_queue_count_limit_drops_oldest_and_records_only_allowlisted_data(self):
        reporter = ErrorReporter("0.9.0-pilot1", "writer", self.data_dir, sender_thread=False)
        for index in range(MAX_QUEUE_COUNT + 3):
            reporter.record_error(error_type="RuntimeError", message=f"failed {index} at C:\\Users\\A\\Secret.docx", operation="open.docx")
        files = sorted(reporter.queue_dir.glob("*.json"))
        self.assertEqual(len(files), MAX_QUEUE_COUNT)
        stored = json.loads(files[-1].read_text(encoding="utf-8"))
        self.assertEqual(stored["operation"], "open.docx")
        serialized = json.dumps(stored, ensure_ascii=False)
        self.assertNotIn("Secret.docx", serialized)
        self.assertNotIn("C:\\Users", serialized)
        self.assertNotIn("filename", stored)

    def test_queue_total_size_limit_drops_oldest(self):
        import adapters.error_reporting.reporter as module

        with patch.object(module, "MAX_QUEUE_BYTES", 1000):
            reporter = ErrorReporter("0.9.0-pilot1", "sheet", self.data_dir / "small", sender_thread=False)
            for _ in range(8):
                reporter.record_error(error_type="Error", message="x" * 220, operation="open.xlsx")
            self.assertLessEqual(sum(path.stat().st_size for path in reporter.queue_dir.glob("*.json")), 1000)
            self.assertLess(len(list(reporter.queue_dir.glob("*.json"))), 8)

    def test_consent_gates_sender_and_local_server_receives_sanitized_report(self):
        _CaptureHandler.received = []
        server = ThreadingHTTPServer(("127.0.0.1", 0), _CaptureHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(lambda: server.shutdown())
        reporter = ErrorReporter(
            "0.9.0-pilot1", "slides", self.data_dir, endpoint=f"http://127.0.0.1:{server.server_port}/api/v1/reports",
            token="test-token", sender_thread=False, timeout=1,
        )
        reporter.record_error(
            error_type="RuntimeError", message="Không mở được C:\\Users\\Lan\\Tài liệu\\Tuyệt mật.pptx",
            stack="File C:\\Users\\Lan\\Tài liệu\\Tuyệt mật.pptx, line 3", operation="open.pptx",
        )
        self.assertFalse(reporter.send_once())
        self.assertEqual(len(_CaptureHandler.received), 0)
        reporter.set_consent(True)
        self.assertTrue(reporter.send_once())
        self.assertEqual(len(_CaptureHandler.received), 1)
        path, content_type, body = _CaptureHandler.received[0]
        self.assertEqual(path, "/api/v1/reports")
        self.assertEqual(content_type, "application/json")
        sent = body.decode("utf-8")
        self.assertNotIn("Lan", sent)
        self.assertNotIn("Tuyệt mật.pptx", sent)
        self.assertNotIn("C:\\Users", sent)

    def test_dynamic_install_token_is_requested_only_after_consent_and_sends_allowlisted_fields(self):
        _CaptureHandler.received = []
        server = ThreadingHTTPServer(("127.0.0.1", 0), _CaptureHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        reporter = ErrorReporter(
            "0.9.6", "writer", self.data_dir,
            endpoint=f"http://127.0.0.1:{server.server_port}/api/v1/reports",
            sender_thread=False, timeout=1,
        )
        reporter.record_error(error_type="RuntimeError", message="Lỗi giao diện", stack="at render (<anonymous>:4:2)")
        self.assertFalse(reporter.send_once())
        self.assertEqual(_CaptureHandler.received, [])
        reporter.set_consent(True)
        self.assertTrue(reporter.send_once())
        self.assertEqual([record[0] for record in _CaptureHandler.received], [
            "/api/v1/reports/token", "/api/v1/reports",
        ])
        token_request = json.loads(_CaptureHandler.received[0][2])
        sent_report = json.loads(_CaptureHandler.received[1][2])
        self.assertEqual(set(token_request), {"installation_id"})
        self.assertEqual(set(sent_report), {
            "event_id", "app", "version", "os", "error_type", "message", "stack", "installation_id",
        })
        self.assertEqual(sent_report["version"], "0.9.6")

    def test_unreachable_endpoint_keeps_report_queued(self):
        reporter = ErrorReporter(
            "0.9.0-pilot1", "writer", self.data_dir, endpoint="http://127.0.0.1:9/api/v1/reports",
            token="test-token", sender_thread=False, timeout=0.1,
        )
        reporter.set_consent(True)
        reporter.record_error(error_type="OSError", message="offline", operation="save.docx")
        self.assertFalse(reporter.send_once())
        self.assertEqual(len(list(reporter.queue_dir.glob("*.json"))), 1)

    def test_background_sender_without_endpoint_or_with_unreachable_endpoint_stays_offline(self):
        no_endpoint = ErrorReporter("0.9.0-pilot1", "writer", self.data_dir / "no-endpoint", sender_thread=True)
        self.addCleanup(no_endpoint.stop)
        no_endpoint.set_consent(True)
        started = time.monotonic()
        no_endpoint.record_error(error_type="RuntimeError", message="offline-only", operation="open.docx")
        self.assertLess(time.monotonic() - started, 0.2)
        time.sleep(0.1)
        self.assertEqual(len(list(no_endpoint.queue_dir.glob("*.json"))), 1)

        unreachable = ErrorReporter(
            "0.9.0-pilot1", "sheet", self.data_dir / "unreachable",
            endpoint="http://127.0.0.1:9/api/v1/reports", token="test-token", sender_thread=True, timeout=0.1,
        )
        self.addCleanup(unreachable.stop)
        unreachable.set_consent(True)
        started = time.monotonic()
        unreachable.record_error(error_type="ConnectionError", message="offline", operation="save.xlsx")
        self.assertLess(time.monotonic() - started, 0.2)
        time.sleep(0.2)
        self.assertEqual(len(list(unreachable.queue_dir.glob("*.json"))), 1)

    def test_background_sender_does_not_bypass_backoff_when_new_reports_arrive(self):
        reporter = ErrorReporter(
            "0.9.0-pilot1", "writer", self.data_dir / "backoff",
            endpoint="https://reports.example.invalid/api/v1/reports", token="test-token", sender_thread=True,
        )
        self.addCleanup(reporter.stop)
        attempts = []

        def fail_send(_event):
            attempts.append(time.monotonic())
            raise OSError("temporary outage")

        reporter._post_json = fail_send
        reporter.set_consent(True)
        reporter.record_error(error_type="RuntimeError", message="first", operation="open.docx")
        deadline = time.monotonic() + 1
        while not attempts and time.monotonic() < deadline:
            time.sleep(0.01)
        self.assertEqual(len(attempts), 1)
        reporter.record_error(error_type="RuntimeError", message="second", operation="open.docx")
        time.sleep(0.2)
        self.assertEqual(len(attempts), 1, "new reports must not skip the exponential retry delay")

    def test_feedback_is_local_only_and_document_attachments_are_rejected(self):
        source = Path(self.temp.name) / "Tài liệu riêng.docx"
        source.write_bytes(b"private document bytes")
        reporter = ErrorReporter("0.9.0-pilot1", "writer", self.data_dir, sender_thread=False)
        local_feedback = reporter.submit_user_feedback("Nút lưu báo lỗi", current_file=source, attach_current_file=False)
        self.assertTrue(local_feedback["queued"])
        self.assertEqual(list(reporter.attachments_dir.glob("*")), [])
        attached_feedback = reporter.submit_user_feedback("Nút lưu báo lỗi", current_file=source, attach_current_file=True)
        self.assertFalse(attached_feedback["queued"])
        self.assertIn("không gửi", attached_feedback["error"])
        self.assertEqual(list(reporter.attachments_dir.glob("*")), [])
        self.assertEqual(list(reporter.queue_dir.glob("*.json")), [])
        feedback_files = list((reporter.reports_dir / "local-feedback").glob("*.json"))
        self.assertEqual(len(feedback_files), 1)
        stored = feedback_files[0].read_text(encoding="utf-8")
        self.assertIn("Nút lưu báo lỗi", stored)
        self.assertNotIn("private document bytes", stored)

    def test_local_feedback_is_never_sent_to_configured_server(self):
        _CaptureHandler.received = []
        server = ThreadingHTTPServer(("127.0.0.1", 0), _CaptureHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        reporter = ErrorReporter(
            "0.9.0-pilot1", "writer", self.data_dir, endpoint=f"http://127.0.0.1:{server.server_port}/api/v1/reports",
            token="test-token", sender_thread=False,
        )
        reporter.set_consent(True)
        result = reporter.submit_user_feedback("Góp ý chỉ được lưu trên máy")
        self.assertTrue(result["queued"])
        self.assertEqual(result["status"], "saved_local")
        self.assertFalse(reporter.send_once())
        self.assertEqual(_CaptureHandler.received, [])

    def test_pywebview_save_api_failure_reports_safe_operation_and_never_content(self):
        import main

        reporter = ErrorReporter("0.9.0-pilot1", "writer", self.data_dir, sender_thread=False)
        target = Path(self.temp.name) / "Bảng lương.docx"
        with patch.object(main, "_ERROR_REPORTER", reporter), patch.object(
            main.VnOfficeApi,
            "_save_document_in_place_impl",
            return_value={"status": "error", "message": f"Không ghi được {target}"},
        ):
            api = main.VnOfficeApi(app_kind="writer")
            result = api.save_document_in_place("nội dung ô riêng tư", app_kind="writer", target_path=str(target))
        self.assertEqual(result["status"], "error")
        reports = [json.loads(path.read_text(encoding="utf-8")) for path in reporter.queue_dir.glob("*.json")]
        self.assertEqual(reports[0]["operation"], "save.docx")
        serialized = json.dumps(reports[0], ensure_ascii=False)
        self.assertNotIn("Bảng lương.docx", serialized)
        self.assertNotIn("nội dung ô riêng tư", serialized)

    def test_document_api_wrappers_keep_pywebview_argument_signatures(self):
        import main

        expected = {
            "open_document_dialog": ["app_kind"],
            "save_document_in_place": ["content", "app_kind", "target_path", "source_path"],
            "save_document_dialog": ["content", "app_kind", "target_format", "suggested_name", "source_path"],
            "export_pdf_dialog": ["content", "app_kind", "suggested_name", "source_path"],
        }
        for name, arguments in expected.items():
            with self.subTest(method=name):
                exposed = inspect.getfullargspec(getattr(main.VnOfficeApi(), name)).args[1:]
                self.assertEqual(exposed, arguments)

    def test_soffice_nonzero_exit_reports_convert_operation_and_duration(self):
        import main

        reporter = ErrorReporter("0.9.0-pilot1", "writer", self.data_dir, sender_thread=False)
        source = Path(self.temp.name) / "Hợp đồng.xlsx"
        source.write_bytes(b"test")
        with patch.object(main, "_ERROR_REPORTER", reporter), patch.object(main, "SOFFICE_PATH", "soffice"), patch.object(
            main, "_profile_uri", return_value="file:///profile"
        ), patch.object(
            main.subprocess,
            "run",
            return_value=SimpleNamespace(returncode=2, stderr=f"failed {source}", stdout=""),
        ):
            with self.assertRaises(main.DocumentEngineError):
                main._run_soffice_convert(str(source), "pdf", self.temp.name, app_kind="sheet")
        reports = [json.loads(path.read_text(encoding="utf-8")) for path in reporter.queue_dir.glob("*.json")]
        self.assertEqual(reports[0]["operation"], "convert.pdf")
        self.assertEqual(reports[0]["error_type"], "SofficeExitError")
        self.assertGreaterEqual(reports[0]["duration_ms"], 0)
        self.assertEqual(reports[0]["app"], "sheet")

    def test_save_conversion_failure_is_reported_once_as_convert(self):
        import main

        reporter = ErrorReporter("0.9.0-pilot1", "writer", self.data_dir, sender_thread=False)
        target = Path(self.temp.name) / "Báo cáo.docx"
        with patch.object(main, "_ERROR_REPORTER", reporter), patch.object(main, "SOFFICE_PATH", "soffice"), patch.object(
            main, "_profile_uri", return_value="file:///profile"
        ), patch.object(
            main.subprocess,
            "run",
            return_value=SimpleNamespace(returncode=2, stderr=f"failed {target}", stdout=""),
        ):
            api = main.VnOfficeApi(app_kind="writer")
            result = api.save_document_in_place(
                "<p>private body</p>", app_kind="writer", target_path=str(target)
            )
        self.assertEqual(result["status"], "error")
        reports = [json.loads(path.read_text(encoding="utf-8")) for path in reporter.queue_dir.glob("*.json")]
        self.assertEqual(len(reports), 1)
        self.assertEqual(reports[0]["operation"], "convert.docx")


if __name__ == "__main__":
    unittest.main()
