"""Privacy-filtered, offline-first error reporting (standard library only)."""

from __future__ import annotations

import getpass
import json
import os
import platform
import re
import shutil
import sys
import threading
import time
import traceback
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, Request, build_opener


MAX_MESSAGE_CHARS = 1000
MAX_STACK_CHARS = 8000
MAX_QUEUE_COUNT = 200
MAX_QUEUE_BYTES = 20 * 1024 * 1024
MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
SIZE_BUCKET_BYTES = 256 * 1024
SEND_TIMEOUT_SECONDS = 3
MAX_BACKOFF_SECONDS = 300


class _RejectRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_HTTP_OPENER = build_opener(_RejectRedirects())

_APP_KINDS = {"writer", "sheet", "slides"}
_EXTENSIONS = {
    "doc", "docx", "odt", "rtf", "txt", "html", "htm", "fodt",
    "xls", "xlsx", "ods", "csv", "fods", "ppt", "pptx", "odp",
    "fodp", "pdf", "png", "jpg", "jpeg", "gif", "bmp", "webp",
}
_FILE_URI = re.compile(r"(?i)file://[^\r\n;,\)\"'<>]+")
_STACK_URL = re.compile(r"(?i)(?:https?|file)://[^\r\n)\"'<>]*")
_UNC_PATH = re.compile(r"(?<!\w)(?:\\\\|//)[^\\/\s]+[\\/][^\\/\s]+(?:[\\/][^\r\n;,\)\"'<>]*)?")
_WINDOWS_PATH = re.compile(r"(?i)(?<![\w])(?:[a-z]:[\\/])(?:[^\\/\r\n\"'<>]+[\\/])*[^\\/\r\n\"'<>]*")
_POSIX_PATH = re.compile(r"(?<![:\w])/(?:[^/\s\"'<>]+/)*[^/\s\"'<>]+")
_QUOTED_FILENAME = re.compile(
    r"([\"'])([^\"'\r\n]{1,240}\.([A-Za-z0-9]{1,8}))\1"
)
_BARE_FILENAME = re.compile(
    r"(?i)(?<![\w/\\])(?:[\w\u00c0-\u024f.-]+\s+){0,8}[\w\u00c0-\u024f.-]+\.([a-z0-9]{1,8})(?![\w])"
)
_LONG_TOKEN = re.compile(r"\S{161,}")
# Quoted text in an error message is often a cell value, heading or other document content
# ("Invalid value 'Lương tháng 9 - Nguyễn Văn A'"). Short ASCII identifiers such as
# 'NoneType' or "get" stay — they are what makes a report debuggable.
_QUOTED_TEXT = re.compile(r"([\"'“‘])([^\"'”’\r\n]*)([\"'”’])")
_SAFE_QUOTED_IDENTIFIER = re.compile(r"[A-Za-z_][A-Za-z0-9_.$<>-]{0,39}")
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def _top_sanitized_frame(stack: str, fallback: str) -> str:
    lines = [line.strip() for line in stack.splitlines() if line.strip()]
    for line in lines:
        if line.startswith(("Traceback ", "During handling of ", "The above exception")):
            continue
        if re.search(r"\bFile <path>|^at\s+|^<anonymous>", line):
            return line
    return lines[0] if lines else fallback


def _sanitize_stack(value: object, secrets: tuple[str, ...] = ()) -> str:
    """Keep recognizable stack frames only; discard arbitrary text a JS caller could inject."""
    raw = _CONTROL_CHARS.sub(" ", str(value if value is not None else ""))
    safe_lines = []
    py_frame = re.compile(
        r"^File\s+(?:\"?(?:<path>|<file(?:\.[a-z0-9]+)?>)\"?),\s*line\s+(\d+)(?:,\s*in\s+([A-Za-z0-9_.$<>]+))?$"
    )
    js_frame = re.compile(
        r"^at\s+(?:(?P<function>[A-Za-z0-9_.$<> ]+)\s+\()?(?P<source><path>|<file(?:\.[a-z0-9]+)?>|<anonymous>|native)(?:\))?$"
    )
    firefox_frame = re.compile(r"^(?P<function>[A-Za-z0-9_.$<> ]*)@(?P<source><path>|<file(?:\.[a-z0-9]+)?>)$")
    for raw_line in raw.splitlines():
        if raw_line.strip().startswith(("Traceback (most recent call last):", "Traceback (innermost last):")):
            safe_lines.append("Traceback (most recent call last):")
            continue
        raw_python_frame = re.fullmatch(
            r"File\s+[\"'][^\"']*[\"'],\s*line\s+(\d+)(?:,\s*in\s+([A-Za-z0-9_.$<>]+))?",
            raw_line.strip(),
        )
        if raw_python_frame:
            normalized = f"File <path>, line {raw_python_frame.group(1)}"
            if raw_python_frame.group(2):
                normalized += f", in {raw_python_frame.group(2)}"
            safe_lines.append(normalized)
            continue
        source_line = re.search(r":(\d+)(?::(\d+))?\)?$", raw_line.strip())
        line = _STACK_URL.sub("<path>", raw_line.strip())
        line = sanitize_text(line, secrets=secrets, limit=MAX_STACK_CHARS)
        python_match = py_frame.fullmatch(line)
        if python_match:
            normalized = f"File <path>, line {python_match.group(1)}"
            if python_match.group(2):
                normalized += f", in {python_match.group(2)}"
            safe_lines.append(normalized)
            continue
        js_match = js_frame.fullmatch(line)
        if js_match:
            location = f":{source_line.group(1)}" if source_line else ""
            if source_line and source_line.group(2):
                location += f":{source_line.group(2)}"
            safe_lines.append(f"at <path>{location}")
            continue
        firefox_match = firefox_frame.fullmatch(line)
        if firefox_match:
            location = f":{source_line.group(1)}" if source_line else ""
            if source_line and source_line.group(2):
                location += f":{source_line.group(2)}"
            safe_lines.append(f"<path>@<path>{location}")
    return "\n".join(safe_lines)[:MAX_STACK_CHARS]


def _current_username() -> str:
    try:
        return getpass.getuser().strip()
    except Exception:
        return ""


def sanitize_text(value: object, *, secrets: tuple[str, ...] = (), limit: int = MAX_MESSAGE_CHARS) -> str:
    """Remove absolute paths, file names, local identity, secrets and long tokens."""
    text = str(value if value is not None else "")
    text = _CONTROL_CHARS.sub(" ", text)
    text = _FILE_URI.sub("<path>", text)
    text = _UNC_PATH.sub("<path>", text)
    text = _WINDOWS_PATH.sub("<path>", text)
    text = _POSIX_PATH.sub("<path>", text)
    text = _QUOTED_FILENAME.sub(lambda match: f"<file.{match.group(3).lower()}>", text)

    def replace_bare_filename(match: re.Match[str]) -> str:
        extension = match.group(1).lower()
        return f"<file.{extension}>" if extension in _EXTENSIONS else "<file>"

    text = _BARE_FILENAME.sub(replace_bare_filename, text)

    def replace_quoted_text(match: re.Match[str]) -> str:
        inner = match.group(2)
        if inner == "" or inner.startswith("<") or _SAFE_QUOTED_IDENTIFIER.fullmatch(inner):
            return match.group(0)
        return f"{match.group(1)}<text>{match.group(3)}"

    text = _QUOTED_TEXT.sub(replace_quoted_text, text)
    username = _current_username()
    for secret in (username, *secrets):
        if secret and len(secret) >= 2:
            text = re.sub(re.escape(secret), "<redacted>", text, flags=re.IGNORECASE)
    text = _LONG_TOKEN.sub("<redacted>", text)
    if limit == MAX_STACK_CHARS:
        text = "\n".join(re.sub(r"[\t\f\v ]+", " ", line).strip() for line in text.splitlines() if line.strip())
    else:
        text = re.sub(r"\s+", " ", text).strip()
    if len(text) > limit:
        if limit == MAX_MESSAGE_CHARS:
            return "<long message redacted>"
        text = text[: max(0, limit - 12)].rstrip() + " <truncated>"
    return text


def load_client_config(app_dir: str | Path, environ: dict[str, str] | None = None) -> dict[str, object]:
    """Load optional side-by-side config and apply explicit environment overrides."""
    env = os.environ if environ is None else environ
    config: dict[str, object] = {}
    config_path = Path(app_dir) / "vnoffice-config.json"
    try:
        parsed = json.loads(config_path.read_text(encoding="utf-8"))
        if isinstance(parsed, dict) and isinstance(parsed.get("errorReporting"), dict):
            config = parsed["errorReporting"]
    except (OSError, ValueError, TypeError):
        pass
    endpoint = str(env.get("VNOFFICE_REPORT_ENDPOINT", config.get("endpoint", "")) or "").strip()
    enabled = config.get("enabled", True)
    return {"enabled": enabled is not False, "endpoint": endpoint}


def _rounded_size(path: str | Path | None) -> int | None:
    if not path:
        return None
    try:
        size = Path(path).stat().st_size
    except OSError:
        return None
    return int(round(size / SIZE_BUCKET_BYTES) * SIZE_BUCKET_BYTES)


def _file_extension(path: str | Path | None) -> str | None:
    if not path:
        return None
    suffix = Path(path).suffix.lower().lstrip(".")
    return suffix if suffix in _EXTENSIONS else None


def _report_endpoint(endpoint: str, suffix: str = "") -> str:
    parts = urlsplit(endpoint)
    path = parts.path.rstrip("/")
    return urlunsplit((parts.scheme, parts.netloc, path + suffix, parts.query, parts.fragment))


class ErrorReporter:
    """Local queue, consent store and best-effort background sender."""

    def __init__(
        self,
        app_version: str,
        app_kind: str | None,
        data_dir: str | Path,
        *,
        endpoint: str = "",
        enabled: bool = True,
        sender_thread: bool = True,
        timeout: float = SEND_TIMEOUT_SECONDS,
    ) -> None:
        self.app_version = sanitize_text(app_version, limit=40)
        self.app_kind = app_kind if app_kind in _APP_KINDS else "writer"
        self.data_dir = Path(data_dir)
        self.recovery_dir = self.data_dir / "recovery"
        self.reports_dir = self.data_dir / "reports"
        self.queue_dir = self.reports_dir / "queue"
        self.attachments_dir = self.reports_dir / "attachments"
        self.consent_path = self.reports_dir / "consent.json"
        self.installation_path = self.reports_dir / "installation.json"
        self.endpoint = endpoint.strip()
        self._token = ""
        self._token_expires_at = 0.0
        self.last_token_status_code: int | None = None
        self.last_status_code: int | None = None
        self.enabled = bool(enabled)
        self.timeout = timeout
        self._lock = threading.RLock()
        self._wake = threading.Event()
        self._stop = threading.Event()
        self._backoff_seconds = 1
        self._previous_sys_hook = sys.excepthook
        self._previous_thread_hook = getattr(threading, "excepthook", None)
        self._installation_id = self._load_installation_id()
        self.queue_dir.mkdir(parents=True, exist_ok=True)
        self.attachments_dir.mkdir(parents=True, exist_ok=True)
        self._persist_installation_id()
        self._enforce_queue_limits()
        self._thread: threading.Thread | None = None
        if sender_thread:
            self._thread = threading.Thread(target=self._sender_loop, name="vno-error-reporter", daemon=True)
            self._thread.start()

    def _read_consent(self) -> tuple[str, str]:
        try:
            data = json.loads(self.consent_path.read_text(encoding="utf-8"))
            consent = data.get("consent")
            install_id = data.get("installation_id")
            if consent in {"unknown", "granted", "denied"} and isinstance(install_id, str):
                return consent, install_id
        except (OSError, ValueError, TypeError):
            pass
        return "unknown", self._installation_id

    def _load_installation_id(self) -> str:
        for path in (self.installation_path, self.consent_path):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                candidate = str(data.get("installation_id", ""))
                parsed = uuid.UUID(candidate)
                if parsed.version == 4:
                    return str(parsed)
            except (OSError, ValueError, TypeError, AttributeError):
                continue
        return str(uuid.uuid4())

    def _persist_installation_id(self) -> None:
        try:
            _atomic_write_json(self.installation_path, {"installation_id": self._installation_id})
        except OSError:
            # Reporting storage must never prevent offline document work.
            pass

    def get_state(self) -> dict[str, object]:
        try:
            consent, _ = self._read_consent()
            queue_count = len(list(self.queue_dir.glob("*.json")))
        except Exception:
            consent, queue_count = "unknown", 0
        return {"enabled": self.enabled, "consent": consent, "endpoint_configured": bool(self.endpoint), "queue_count": queue_count}

    def set_consent(self, granted: bool) -> dict[str, object]:
        try:
            with self._lock:
                self.reports_dir.mkdir(parents=True, exist_ok=True)
                _atomic_write_json(self.consent_path, {
                    "consent": "granted" if bool(granted) else "denied",
                    "installation_id": self._installation_id,
                    "updated_at": _utc_now(),
                })
            if granted:
                self._wake.set()
        except Exception:
            pass
        return self.get_state()

    def capture_exception(
        self,
        exc_type: type[BaseException] | str,
        exception: BaseException | str,
        tb=None,
        *,
        operation: str = "",
        file_path: str | Path | None = None,
        duration_ms: float | None = None,
        app_kind: str | None = None,
    ) -> str | None:
        try:
            error_type = exc_type.__name__ if isinstance(exc_type, type) else str(exc_type)
            stack = "".join(traceback.format_exception(exc_type, exception, tb)) if isinstance(exc_type, type) else ""
            return self.record_error(
                error_type=error_type,
                message=str(exception),
                stack=stack,
                operation=operation,
                file_path=file_path,
                duration_ms=duration_ms,
                app_kind=app_kind,
            )
        except Exception:
            return None

    def record_error(
        self,
        *,
        error_type: object,
        message: object,
        stack: object = "",
        operation: object = "",
        file_path: str | Path | None = None,
        duration_ms: float | None = None,
        file_extension: object = None,
        file_size_bucket: object = None,
        feedback_description: str | None = None,
        attachment_path: str | Path | None = None,
        app_kind: object = None,
    ) -> str | None:
        if not self.enabled:
            return None
        if self._is_recovery_path(file_path) or self._is_recovery_path(attachment_path):
            return None
        try:
            candidate_type = sanitize_text(error_type, limit=80)
            safe_type = candidate_type if re.fullmatch(r"[A-Za-z][A-Za-z0-9_.-]{0,79}", candidate_type) else "FrontendError"
            candidate_operation = str(operation or "")
            known_operation = candidate_operation in {
                "frontend", "python.unhandled", "python.thread", "user.feedback", "open.dialog", "document.operation",
            }
            file_operation = re.fullmatch(r"(?:open|save|export|convert)\.([a-z0-9]{1,8})", candidate_operation)
            if file_operation and file_operation.group(1) in _EXTENSIONS:
                known_operation = True
            safe_operation = candidate_operation if known_operation else "unknown"
            ext = _file_extension(file_path) or (str(file_extension).lower().lstrip(".") if file_extension else None)
            if ext not in _EXTENSIONS:
                ext = None
            size_bucket = _rounded_size(file_path) if file_path else file_size_bucket
            if not isinstance(size_bucket, int) or size_bucket < 0:
                size_bucket = None
            if size_bucket is not None:
                size_bucket = int(round(size_bucket / SIZE_BUCKET_BYTES) * SIZE_BUCKET_BYTES)
            secrets = (self._token,) if self._token else ()
            safe_message = sanitize_text(message, secrets=secrets, limit=MAX_MESSAGE_CHARS)
            safe_stack = _sanitize_stack(stack, secrets=secrets)
            duration = None
            if duration_ms is not None:
                try:
                    duration = max(0, int(round(float(duration_ms))))
                except (TypeError, ValueError, OverflowError):
                    pass
            event_id = str(uuid.uuid4())
            timestamp = _utc_now()
            frame = _top_sanitized_frame(safe_stack, safe_type)
            fingerprint = f"{safe_type}:{sanitize_text(frame, limit=160)}"
            event: dict[str, object] = {
                "schema_version": 1,
                "event_id": event_id,
                "timestamp": timestamp,
                "app_version": self.app_version,
                "app": app_kind if app_kind in _APP_KINDS else self.app_kind,
                "error_type": safe_type,
                "message": safe_message,
                "stack": safe_stack,
                "operation": safe_operation,
                "file_extension": ext,
                "file_size_bucket": size_bucket,
                "duration_ms": duration,
                "os_version": sanitize_text(f"{platform.system()} {platform.release()}", limit=80),
                "installation_id": self._installation_id,
                "fingerprint": fingerprint,
            }
            if feedback_description is not None:
                event["error_type"] = "UserFeedback"
                event["message"] = "Người dùng gửi góp ý"
                event["feedback_description"] = sanitize_text(feedback_description, secrets=secrets, limit=4000)
                event["fingerprint"] = "UserFeedback"
            if attachment_path:
                event["_attachment_id"] = event_id
                event["_attachment_path"] = str(attachment_path)
                event["_report_sent"] = False
            with self._lock:
                if self._consent_state() == "denied":
                    # Local-only logs are retained for this run's local diagnostics; sender stays gated.
                    pass
                _atomic_write_json(self.queue_dir / f"{timestamp.replace(':', '').replace('-', '')}-{event_id}.json", event)
                self._enforce_queue_limits()
            self._wake.set()
            return event_id
        except Exception:
            return None

    def report_frontend_error(self, payload: object) -> dict[str, object]:
        """Accept only a small, allow-listed JS payload and sanitize it again here."""
        if not isinstance(payload, dict):
            return {"queued": False}
        event_id = self.record_error(
            error_type=payload.get("type", "FrontendError"),
            message=payload.get("message", ""),
            stack=payload.get("stack", ""),
            operation=payload.get("operation", "frontend"),
            file_extension=payload.get("file_extension"),
            file_size_bucket=payload.get("file_size_bucket"),
            duration_ms=payload.get("duration_ms"),
            app_kind=payload.get("app"),
        )
        return {"queued": bool(event_id), "event_id": event_id}

    def submit_user_feedback(
        self,
        description: object,
        *,
        attach_current_file: bool = False,
        current_file: str | Path | None = None,
        app_kind: str | None = None,
    ) -> dict[str, object]:
        if not self.enabled:
            return {"queued": False, "error": "Báo cáo lỗi đang bị tắt trong cấu hình."}
        desc = str(description or "").strip()
        if not desc:
            return {"queued": False, "error": "Vui lòng nhập mô tả lỗi hoặc góp ý."}
        if len(desc) > 4000:
            return {"queued": False, "error": "Mô tả tối đa 4.000 ký tự."}
        attachment_copy: Path | None = None
        if attach_current_file:
            if self._is_recovery_path(current_file):
                return {"queued": False, "error": "Bản khôi phục cục bộ không được đưa vào báo cáo lỗi."}
            if not current_file or not Path(current_file).is_file():
                return {"queued": False, "error": "Không tìm thấy tệp hiện đang mở để đính kèm."}
            try:
                size = Path(current_file).stat().st_size
            except OSError:
                return {"queued": False, "error": "Không thể đọc thông tin tệp đang mở."}
            if size > MAX_ATTACHMENT_BYTES:
                return {"queued": False, "error": "Tệp đính kèm vượt quá giới hạn 5 MiB."}
            attachment_copy = self.attachments_dir / f"{uuid.uuid4()}.bin"
            try:
                shutil.copyfile(current_file, attachment_copy)
            except OSError:
                return {"queued": False, "error": "Không thể sao chép tệp vào hàng đợi cục bộ."}
            try:
                if attachment_copy.stat().st_size > MAX_ATTACHMENT_BYTES:
                    attachment_copy.unlink(missing_ok=True)
                    return {"queued": False, "error": "Tệp đính kèm vượt quá giới hạn 5 MiB."}
            except OSError:
                attachment_copy.unlink(missing_ok=True)
                return {"queued": False, "error": "Không thể kiểm tra kích thước tệp đính kèm."}
        event_id = self.record_error(
            error_type="UserFeedback",
            message="Người dùng gửi góp ý",
            operation="user.feedback",
            file_path=current_file if attach_current_file else None,
            feedback_description=desc,
            attachment_path=attachment_copy,
            app_kind=app_kind,
        )
        if not event_id and attachment_copy:
            attachment_copy.unlink(missing_ok=True)
        state = self.get_state()
        if state["consent"] == "granted" and self.endpoint:
            self._wake.set()
            return {"queued": bool(event_id), "event_id": event_id, "status": "queued"}
        return {"queued": bool(event_id), "event_id": event_id, "status": "saved_local"}

    def install_exception_hooks(self) -> None:
        reporter = self

        def sys_hook(exc_type, exception, tb):
            reporter.capture_exception(exc_type, exception, tb, operation="python.unhandled")
            reporter._previous_sys_hook(exc_type, exception, tb)

        sys.excepthook = sys_hook
        if hasattr(threading, "excepthook"):
            def thread_hook(args):
                reporter.capture_exception(args.exc_type, args.exc_value, args.exc_traceback, operation="python.thread")
                if reporter._previous_thread_hook:
                    reporter._previous_thread_hook(args)

            threading.excepthook = thread_hook

    def wake_sender(self) -> None:
        self._wake.set()

    def stop(self) -> None:
        self._stop.set()
        self._wake.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=0.1)

    def send_once(self) -> bool:
        """Attempt to send the oldest queued record. Returns whether work completed."""
        state = self.get_state()
        if not (self.enabled and self.endpoint and state["consent"] == "granted"):
            return False
        for queue_file in sorted(self.queue_dir.glob("*.json"), key=lambda item: item.stat().st_mtime):
            try:
                local = json.loads(queue_file.read_text(encoding="utf-8"))
                if not isinstance(local, dict):
                    queue_file.unlink(missing_ok=True)
                    continue
                report_sent = bool(local.pop("_report_sent", False))
                attachment_path = local.pop("_attachment_path", None)
                local.pop("_attachment_id", None)
                if not report_sent:
                    self._post_json(local)
                    local["_report_sent"] = True
                    if attachment_path:
                        local["_attachment_path"] = attachment_path
                        _atomic_write_json(queue_file, local)
                queue_file.unlink(missing_ok=True)
                if attachment_path:
                    Path(attachment_path).unlink(missing_ok=True)
                self._backoff_seconds = 1
                self._enforce_queue_limits()
                return True
            except Exception:
                return False
        return False

    def _post_json(self, event: dict[str, object]) -> None:
        secrets = (self._token,) if self._token else ()
        message = event.get("feedback_description", event.get("message", ""))
        payload = {
            "event_id": str(event.get("event_id", "")),
            "app": str(event.get("app")) if event.get("app") in _APP_KINDS else self.app_kind,
            "version": sanitize_text(event.get("app_version", ""), secrets=secrets, limit=80),
            "os": sanitize_text(event.get("os_version", ""), secrets=secrets, limit=80),
            "error_type": sanitize_text(event.get("error_type", "FrontendError"), secrets=secrets, limit=80),
            "message": sanitize_text(message, secrets=secrets, limit=MAX_MESSAGE_CHARS),
            "stack": _sanitize_stack(event.get("stack", ""), secrets=secrets),
            "installation_id": self._installation_id,
        }
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        for attempt in range(2):
            token = self._get_install_token(force=attempt > 0)
            self.last_status_code = None
            request = Request(
                _report_endpoint(self.endpoint, "/api/v1/reports"),
                data=body,
                headers={
                    "X-Install-Token": token,
                    "Content-Type": "application/json",
                    "User-Agent": "3TOffice-ErrorReporter/1",
                },
                method="POST",
            )
            try:
                with _HTTP_OPENER.open(request, timeout=self.timeout) as response:
                    self.last_status_code = response.status
                    if not 200 <= response.status < 300:
                        raise OSError(f"Report endpoint returned {response.status}")
                    return
            except HTTPError as exc:
                self.last_status_code = exc.code
                if exc.code == 401 and attempt == 0:
                    self._clear_install_token()
                    continue
                raise OSError(f"Report endpoint returned {exc.code}") from exc
        raise OSError("Report endpoint authentication failed")

    def _get_install_token(self, *, force: bool = False) -> str:
        if not force and self._token and time.time() < self._token_expires_at - 30:
            return self._token
        body = json.dumps({"installation_id": self._installation_id}, separators=(",", ":")).encode("utf-8")
        request = Request(
            _report_endpoint(self.endpoint, "/api/v1/reports/token"),
            data=body,
            headers={"Content-Type": "application/json", "User-Agent": "3TOffice-ErrorReporter/1"},
            method="POST",
        )
        try:
            with _HTTP_OPENER.open(request, timeout=self.timeout) as response:
                self.last_token_status_code = response.status
                if not 200 <= response.status < 300:
                    raise OSError(f"Token endpoint returned {response.status}")
                raw = response.read(64 * 1024 + 1)
        except HTTPError as exc:
            self.last_token_status_code = exc.code
            raise OSError(f"Token endpoint returned {exc.code}") from exc
        if len(raw) > 64 * 1024:
            raise OSError("Token response exceeds size limit")
        try:
            result = json.loads(raw.decode("utf-8"))
            token = str(result["token"])
            expires_at = str(result["expires_at"])
            expires = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            expiry_timestamp = expires.timestamp()
        except (KeyError, TypeError, ValueError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise OSError("Token response is invalid") from exc
        if not token or expiry_timestamp <= time.time():
            raise OSError("Token response is already expired")
        self._token = token
        self._token_expires_at = expiry_timestamp
        return token

    def _clear_install_token(self) -> None:
        self._token = ""
        self._token_expires_at = 0.0

    def _post_attachment(self, event_id: str, attachment_path: Path) -> None:
        del event_id, attachment_path
        raise OSError("VPS error reporting does not accept document attachments")

    def _is_recovery_path(self, path: object) -> bool:
        if not path:
            return False
        try:
            candidate = Path(path).resolve(strict=False)
            recovery_root = self.recovery_dir.resolve(strict=False)
            return candidate == recovery_root or recovery_root in candidate.parents
        except (OSError, TypeError, ValueError):
            return False

    def _consent_state(self) -> str:
        return self._read_consent()[0]

    def _sender_loop(self) -> None:
        retry_at = 0.0
        while not self._stop.is_set():
            timeout = max(0.0, retry_at - time.monotonic()) if retry_at else None
            self._wake.wait(timeout=timeout)
            self._wake.clear()
            if self._stop.is_set():
                return
            if retry_at and time.monotonic() < retry_at:
                continue
            try:
                can_send = self.enabled and self.endpoint and self._consent_state() == "granted"
            except Exception:
                can_send = False
            if not can_send:
                continue
            while not self._stop.is_set():
                try:
                    sent = self.send_once()
                except Exception:
                    sent = False
                if sent:
                    continue
                if not list(self.queue_dir.glob("*.json")):
                    self._backoff_seconds = 1
                    retry_at = 0.0
                    break
                retry_at = time.monotonic() + self._backoff_seconds
                self._backoff_seconds = min(MAX_BACKOFF_SECONDS, max(1, self._backoff_seconds * 2))
                break

    def _enforce_queue_limits(self) -> None:
        files = sorted(self.queue_dir.glob("*.json"), key=lambda item: item.stat().st_mtime)
        while files:
            total = sum(item.stat().st_size for item in files if item.exists())
            total += sum(item.stat().st_size for item in self.attachments_dir.glob("*.*") if item.is_file())
            if len(files) <= MAX_QUEUE_COUNT and total <= MAX_QUEUE_BYTES:
                break
            oldest = files.pop(0)
            attachment_path = None
            try:
                local = json.loads(oldest.read_text(encoding="utf-8"))
                attachment_path = local.get("_attachment_path")
            except (OSError, ValueError, TypeError):
                pass
            oldest.unlink(missing_ok=True)
            if attachment_path:
                Path(attachment_path).unlink(missing_ok=True)


def _atomic_write_json(path: Path, value: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    temp_path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temp_path.replace(path)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")
