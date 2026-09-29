#!/usr/bin/env python3
"""Small standard-library-only receiver for VN Office pilot reports."""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import html
import json
import os
import re
import secrets
import threading
from datetime import datetime, timezone
from email import policy
from email.parser import BytesParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


MAX_REPORT_BYTES = 1024 * 1024
MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
MAX_MULTIPART_OVERHEAD = 64 * 1024
VALID_APPS = {"writer", "sheet", "slides"}
VALID_EXTENSIONS = {
    "doc", "docx", "odt", "rtf", "txt", "html", "htm", "fodt", "xls", "xlsx",
    "ods", "csv", "fods", "ppt", "pptx", "odp", "fodp", "pdf", "png", "jpg",
    "jpeg", "gif", "bmp", "webp",
}
FILE_PATH_RE = re.compile(r"(?i)(?:file://[^\s\"'<>]+|(?:[a-z]:[\\/])[^\s\"'<>]*|\\\\[^\s\"'<>]+)")
BARE_FILE_RE = re.compile(r"(?i)(?<![\w/\\])[^\s<>\"']{1,180}\.(?:docx?|xlsx?|pptx?|odt|ods|odp|csv|pdf|rtf|fods|fodp)(?![\w])")


def load_server_config(config_path: str | Path | None = None, environ=None) -> dict[str, str]:
    env = os.environ if environ is None else environ
    path = Path(config_path or env.get("VNO_REPORT_SERVER_CONFIG", "/etc/vnoffice-error-report-server.json"))
    data = {}
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(parsed, dict):
            data = parsed
    except (OSError, ValueError, TypeError):
        pass
    return {
        "token": str(env.get("VNO_REPORT_SERVER_TOKEN", data.get("token", ""))),
        "view_user": str(env.get("VNO_REPORT_VIEW_USER", data.get("view_user", ""))),
        "view_password": str(env.get("VNO_REPORT_VIEW_PASSWORD", data.get("view_password", ""))),
    }


def sanitize_frame(value: str) -> str:
    text = FILE_PATH_RE.sub("<path>", str(value))
    return BARE_FILE_RE.sub("<file>", text)[:280]


def top_sanitized_frame(stack: str, fallback: str) -> str:
    lines = [line.strip() for line in stack.splitlines() if line.strip()]
    for line in lines:
        if line.startswith(("Traceback ", "During handling of ", "The above exception")):
            continue
        if re.search(r"\bFile <path>|^at\s+|^<anonymous>", line):
            return line
    return lines[0] if lines else fallback


def validate_report(value: object) -> tuple[bool, str]:
    if not isinstance(value, dict):
        return False, "JSON body must be an object"
    allowed = {
        "schema_version", "event_id", "timestamp", "app_version", "app", "error_type", "message",
        "stack", "operation", "file_extension", "file_size_bucket", "duration_ms", "os_version",
        "installation_id", "fingerprint", "feedback_description",
    }
    required = {
        "schema_version", "event_id", "timestamp", "app_version", "app", "error_type", "message",
        "stack", "operation", "file_extension", "file_size_bucket", "duration_ms", "os_version",
        "installation_id", "fingerprint",
    }
    if set(value) - allowed:
        return False, "unknown fields are not accepted"
    if not required.issubset(value):
        return False, "required fields are missing"
    if value.get("schema_version") != 1 or value.get("app") not in VALID_APPS:
        return False, "unsupported report schema or app"
    try:
        event_id = str(value["event_id"])
        install_id = str(value["installation_id"])
        import uuid

        uuid.UUID(event_id)
        uuid.UUID(install_id)
    except (ValueError, TypeError, AttributeError):
        return False, "invalid report identifier"
    string_limits = {
        "timestamp": 80, "app_version": 40, "error_type": 100, "message": 300,
        "stack": 9000, "operation": 60, "os_version": 80, "fingerprint": 512,
    }
    for key, limit in string_limits.items():
        if not isinstance(value[key], str) or len(value[key]) > limit:
            return False, f"invalid {key}"
    if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_.-]{0,79}", value["error_type"]):
        return False, "invalid error type"
    if not re.fullmatch(r"[A-Za-z0-9_.-]{1,60}", value["operation"]):
        return False, "invalid operation"
    extension = value["file_extension"]
    if extension is not None and (not isinstance(extension, str) or extension not in VALID_EXTENSIONS):
        return False, "invalid file extension"
    size = value["file_size_bucket"]
    if size is not None and (not isinstance(size, int) or isinstance(size, bool) or size < 0 or size > 10**12):
        return False, "invalid file size bucket"
    duration = value["duration_ms"]
    if duration is not None and (not isinstance(duration, int) or isinstance(duration, bool) or duration < 0 or duration > 10**9):
        return False, "invalid duration"
    if "feedback_description" in value:
        if value["error_type"] != "UserFeedback" or not isinstance(value["feedback_description"], str) or len(value["feedback_description"]) > 4000:
            return False, "invalid feedback description"
    elif value["error_type"] == "UserFeedback":
        return False, "feedback description is required"
    return True, ""


def make_handler(data_dir: str | Path, token: str, view_user: str = "", view_password: str = ""):
    root = Path(data_dir)
    root.mkdir(parents=True, exist_ok=True)
    attachment_dir = root / "attachments"
    attachment_dir.mkdir(parents=True, exist_ok=True)
    lock = threading.RLock()
    known_reports: dict[str, dict[str, object]] = {}
    attached_ids: set[str] = set()

    def load_known_reports():
        for log in root.glob("errors-*.jsonl"):
            try:
                with log.open("r", encoding="utf-8") as stream:
                    for line in stream:
                        try:
                            item = json.loads(line)
                            if isinstance(item, dict) and item.get("event_id"):
                                known_reports[str(item["event_id"])] = item
                        except ValueError:
                            continue
            except OSError:
                continue
        for path in attachment_dir.glob("*.bin"):
            attached_ids.add(path.name[:36])

    load_known_reports()

    class ReportHandler(BaseHTTPRequestHandler):
        server_version = "VNOfficeReportReceiver/1.0"
        sys_version = ""

        def log_message(self, _fmt, *_args):
            # Avoid access logs containing query strings, addresses or user data.
            return

        def _send_json(self, status: int, payload: dict[str, object]):
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            if status == 401 and view_user:
                self.send_header("WWW-Authenticate", 'Basic realm="VN Office reports", charset="UTF-8"')
            self.end_headers()
            self.wfile.write(body)

        def _authorized(self) -> bool:
            provided = self.headers.get("Authorization", "")
            bearer = "Bearer " + token if token else ""
            if bearer and hmac.compare_digest(provided, bearer):
                return True
            if view_user and view_password and provided.startswith("Basic "):
                try:
                    decoded = base64.b64decode(provided[6:], validate=True).decode("utf-8")
                    username, separator, password = decoded.partition(":")
                    return bool(separator) and hmac.compare_digest(username, view_user) and hmac.compare_digest(password, view_password)
                except (ValueError, UnicodeError):
                    return False
            return False

        def _bearer_authorized(self) -> bool:
            provided = self.headers.get("Authorization", "")
            bearer = "Bearer " + token if token else ""
            return bool(bearer) and hmac.compare_digest(provided, bearer)

        def _authorized_or_reject(self) -> bool:
            if not token:
                self._discard_small_body()
                self._send_json(503, {"error": "receiver token is not configured"})
                return False
            if not self._authorized():
                self._discard_small_body()
                self._send_json(401, {"error": "unauthorized"})
                return False
            return True

        def _bearer_authorized_or_reject(self) -> bool:
            if not token:
                self._discard_small_body()
                self._send_json(503, {"error": "receiver token is not configured"})
                return False
            if not self._bearer_authorized():
                self._discard_small_body()
                self._send_json(401, {"error": "bearer token required"})
                return False
            return True

        def _discard_small_body(self):
            """Keep HTTP/1.0 clients from seeing a TCP reset on rejected small bodies."""
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                return
            if 0 < length <= MAX_REPORT_BYTES + MAX_MULTIPART_OVERHEAD:
                self.rfile.read(length)

        def _content_length(self, maximum: int) -> int | None:
            try:
                length = int(self.headers.get("Content-Length", "-1"))
            except ValueError:
                length = -1
            if length < 0:
                self._send_json(400, {"error": "Content-Length is required"})
                return None
            if length > maximum:
                if length <= maximum + MAX_MULTIPART_OVERHEAD:
                    self.rfile.read(length)
                self._send_json(413, {"error": "request body is too large"})
                return None
            return length

        def do_GET(self):
            if urlsplit(self.path).path != "/":
                self._send_json(404, {"error": "not found"})
                return
            if not self._authorized_or_reject():
                return
            body = self._dashboard_html().encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self):
            if not self._bearer_authorized_or_reject():
                return
            path = unquote(urlsplit(self.path).path)
            if path == "/api/v1/reports":
                self._receive_report()
                return
            match = re.fullmatch(r"/api/v1/reports/([0-9a-fA-F-]{36})/attachment", path)
            if match:
                self._receive_attachment(match.group(1).lower())
                return
            self._send_json(404, {"error": "not found"})

        def _receive_report(self):
            length = self._content_length(MAX_REPORT_BYTES)
            if length is None:
                return
            if self.headers.get_content_type() != "application/json":
                self._send_json(415, {"error": "application/json required"})
                return
            try:
                body = self.rfile.read(length)
                if len(body) != length:
                    raise ValueError("incomplete request body")
                report = json.loads(body.decode("utf-8"))
            except (UnicodeError, ValueError, json.JSONDecodeError):
                self._send_json(400, {"error": "invalid JSON"})
                return
            valid, reason = validate_report(report)
            if not valid:
                self._send_json(400, {"error": reason})
                return
            stack = str(report.get("stack", ""))
            top_frame = top_sanitized_frame(stack, str(report["error_type"]))
            label = f"{report['error_type']}: {sanitize_frame(top_frame)}"
            fingerprint = hashlib.sha256(label.encode("utf-8", errors="replace")).hexdigest()
            stored = dict(report)
            stored["fingerprint"] = fingerprint
            stored["fingerprint_label"] = label
            stored["received_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
            date_stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            log_path = root / f"errors-{date_stamp}.jsonl"
            try:
                line = json.dumps(stored, ensure_ascii=False, separators=(",", ":")) + "\n"
                with lock:
                    with log_path.open("a", encoding="utf-8", newline="\n") as stream:
                        stream.write(line)
                    known_reports[str(report["event_id"])] = stored
                self._send_json(200, {"ok": True, "report_id": report["event_id"]})
            except OSError:
                self._send_json(500, {"error": "could not persist report"})

        def _receive_attachment(self, event_id: str):
            if event_id not in known_reports:
                self._send_json(404, {"error": "report not found"})
                return
            if known_reports[event_id].get("error_type") != "UserFeedback":
                self._send_json(403, {"error": "attachments are only accepted for user feedback"})
                return
            length = self._content_length(MAX_ATTACHMENT_BYTES + MAX_MULTIPART_OVERHEAD)
            if length is None:
                return
            if not self.headers.get_content_type().startswith("multipart/"):
                self._send_json(415, {"error": "multipart/form-data required"})
                return
            try:
                body = self.rfile.read(length)
                if len(body) != length:
                    raise ValueError("incomplete request body")
                mime_headers = (
                    f"Content-Type: {self.headers.get('Content-Type')}\r\nMIME-Version: 1.0\r\n\r\n".encode("ascii")
                    + body
                )
                message = BytesParser(policy=policy.default).parsebytes(mime_headers)
                parts = [part for part in message.iter_parts() if part.get_content_disposition() == "form-data" and part.get_param("name", header="content-disposition") == "file"]
                if len(parts) != 1:
                    raise ValueError("exactly one file part is required")
                attachment = parts[0].get_payload(decode=True) or b""
                if not attachment or len(attachment) > MAX_ATTACHMENT_BYTES:
                    self._send_json(413 if len(attachment) > MAX_ATTACHMENT_BYTES else 400, {"error": "invalid attachment size"})
                    return
            except (ValueError, TypeError, UnicodeError):
                self._send_json(400, {"error": "invalid multipart attachment"})
                return
            try:
                with lock:
                    if event_id in attached_ids:
                        self._send_json(409, {"error": "attachment already stored"})
                        return
                    name = f"{event_id}-{secrets.token_hex(4)}.bin"
                    (attachment_dir / name).write_bytes(attachment)
                    attached_ids.add(event_id)
                self._send_json(200, {"ok": True, "report_id": event_id})
            except OSError:
                self._send_json(500, {"error": "could not persist attachment"})

        def _dashboard_html(self):
            groups = {}
            for log_path in root.glob("errors-*.jsonl"):
                try:
                    with log_path.open("r", encoding="utf-8") as stream:
                        for line in stream:
                            try:
                                item = json.loads(line)
                            except ValueError:
                                continue
                            key = item.get("fingerprint") or "unknown"
                            group = groups.setdefault(key, {
                                "label": item.get("fingerprint_label", item.get("error_type", "Unknown")),
                                "count": 0, "first": item.get("received_at", ""),
                                "last": item.get("received_at", ""), "version": item.get("app_version", ""),
                                "app": item.get("app", ""),
                            })
                            group["count"] += 1
                            seen = item.get("received_at", "")
                            if seen and (not group["first"] or seen < group["first"]):
                                group["first"] = seen
                            if seen > group["last"]:
                                group["last"] = seen
                except OSError:
                    continue
            rows = "".join(
                "<tr>" + "".join(f"<td>{html.escape(str(value))}</td>" for value in (
                    group["label"], group["count"], group["first"], group["last"], group["version"], group["app"]
                )) + "</tr>"
                for group in sorted(groups.values(), key=lambda group: (-group["count"], str(group["label"])))
            )
            if not rows:
                rows = '<tr><td colspan="6">Chưa có báo cáo.</td></tr>'
            return f"""<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>VN Office — Báo cáo lỗi</title>
<style>body{{font:15px system-ui,sans-serif;margin:32px;color:#17202a}}h1{{font-size:24px}}table{{border-collapse:collapse;width:100%}}th,td{{border:1px solid #ccd3da;text-align:left;padding:9px;vertical-align:top}}th{{background:#edf2f7}}td:first-child{{max-width:620px;overflow-wrap:anywhere}}.muted{{color:#5d6873}}</style>
<h1>Báo cáo lỗi VN Office</h1><p class="muted">Nhóm theo loại lỗi và khung ngăn xếp đầu tiên đã lọc. Dữ liệu cá nhân không được hiển thị.</p>
<table><thead><tr><th>Nhóm lỗi</th><th>Số lần</th><th>Gặp đầu tiên</th><th>Gặp gần nhất</th><th>Phiên bản</th><th>Ứng dụng</th></tr></thead><tbody>{rows}</tbody></table></html>"""

    return ReportHandler


def create_server(host: str, port: int, data_dir: str | Path, token: str, view_user: str = "", view_password: str = ""):
    if not token:
        raise ValueError("Set VNO_REPORT_SERVER_TOKEN or configure a token outside the repository.")
    return ThreadingHTTPServer((host, port), make_handler(data_dir, token, view_user, view_password))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default=os.environ.get("VNO_REPORT_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("VNO_REPORT_PORT", "8765")))
    parser.add_argument("--data-dir", default=os.environ.get("VNO_REPORT_DATA_DIR", "./report-data"))
    parser.add_argument("--config", default=None)
    args = parser.parse_args(argv)
    config = load_server_config(args.config)
    server = create_server(args.host, args.port, args.data_dir, config["token"], config["view_user"], config["view_password"])
    print(f"VN Office report receiver listening on {args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
