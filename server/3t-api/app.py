"""Small, offline-data-only 3T Office API for GD1."""

from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import ipaddress
import json
import logging
import mimetypes
import os
import re
import secrets
import sqlite3
import threading
import time
import uuid
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import AsyncIterator, Literal

from fastapi import FastAPI, Header, HTTPException, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

try:
    import license as lic_mod
except ImportError:
    from . import license as lic_mod

MAX_REPORT_BYTES = 64 * 1024
TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60
_CHANNEL_RE = re.compile(r"^[a-z][a-z0-9-]{0,31}$")
_VERSION_RE = re.compile(r"^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$")
_ERROR_TYPE_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_.-]{0,79}$")
_SAFE_STACK_LINE = re.compile(
    r"^(?:Traceback \(most recent call last\):|During handling of the above exception, another exception occurred:|"
    r"The above exception was the direct cause of the following exception:|"
    r"File <path>, line [0-9]+(?:, in [A-Za-z0-9_.$<>]+)?|"
    r"at <path>(?::[0-9]+(?::[0-9]+)?)?|<path>@<path>(?::[0-9]+(?::[0-9]+)?)?)$"
)
_DOCUMENT_MARKERS = tuple(re.compile(pattern, re.IGNORECASE) for pattern in (
    r"(?:[a-z]:[\\/])", r"\\\\[^\\/]+[\\/][^\\/]+", r"file://", r"(?:^|\s)/(?:home|users|mnt|tmp)/",
    r"\.(?:docx?|xlsx?|pptx?|odt|ods|odp|pdf|rtf|csv|fods|fodt|fodp)(?:\b|$)",
    r"<\??(?:xml|w:|a:|p:|office:|table:|text:|draw:)", r"\{\\rtf", r"%PDF-", r"PK\x03\x04",
    r"data:(?:application|image)/", r"(?:^|\n)\s*(?:Content_Types\.xml|word/document\.xml|xl/worksheets/|ppt/slides/)",
))
_SAFE_DOWNLOAD_NAME = re.compile(r"^[A-Za-z0-9_.-]+\.(?:exe|msi|zip|tar\.gz)$")


@dataclass(frozen=True, slots=True)
class Settings:
    data_dir: Path
    updates_dir: Path
    reports_dir: Path
    backups_dir: Path
    logs_dir: Path | None
    install_token_secret: str
    admin_username: str
    admin_password: str
    product: str = "3t-office"
    web_dir: Path | None = None
    downloads_dir: Path | None = None
    token_ttl_seconds: int = TOKEN_TTL_SECONDS
    report_rate: int = 30
    token_rate: int = 20
    rate_window_seconds: int = 60
    backup_retention_days: int = 14
    license_signing_key: str = ""
    license_signing_key_file: Path | None = None

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            data_dir=Path(os.environ.get("DATA_DIR", "/data")),
            updates_dir=Path(os.environ.get("UPDATES_DIR", "/updates")),
            reports_dir=Path(os.environ.get("REPORTS_DIR", "/reports")),
            backups_dir=Path(os.environ.get("BACKUPS_DIR", "/backups")),
            logs_dir=Path(os.environ.get("LOGS_DIR", "/logs")),
            web_dir=Path(os.environ["WEB_DIR"]) if os.environ.get("WEB_DIR") else None,
            downloads_dir=Path(os.environ["DOWNLOADS_DIR"]) if os.environ.get("DOWNLOADS_DIR") else None,
            install_token_secret=os.environ.get("INSTALL_TOKEN_SECRET", ""),
            admin_username=os.environ.get("ADMIN_USERNAME", ""),
            admin_password=os.environ.get("ADMIN_PASSWORD", ""),
            product=os.environ.get("PRODUCT", "3t-office"),
            license_signing_key=os.environ.get("LICENSE_SIGNING_KEY", ""),
            license_signing_key_file=Path(os.environ["LICENSE_SIGNING_KEY_FILE"]) if os.environ.get("LICENSE_SIGNING_KEY_FILE") else None,
        )


class LicenseActivateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    product: str = Field(default="3t-office", min_length=1, max_length=64)
    key: str = Field(min_length=10, max_length=64)
    device_fingerprint: str = Field(min_length=8, max_length=128)
    device_name: str = Field(min_length=1, max_length=128)
    app_version: str = Field(min_length=1, max_length=40)
    email: str | None = Field(default=None, max_length=255)


class LicenseValidateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    token: str | None = Field(default=None, max_length=2048)
    license_id: str | None = Field(default=None, max_length=64)
    device_fingerprint: str | None = Field(default=None, max_length=128)


class LicenseDeactivateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    token: str | None = Field(default=None, max_length=2048)
    license_id: str | None = Field(default=None, max_length=64)
    device_fingerprint: str | None = Field(default=None, max_length=128)


class LicenseOfflineActivateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    key: str = Field(min_length=10, max_length=64)
    device_code: str = Field(min_length=8, max_length=256)
    device_name: str | None = Field(default=None, max_length=128)


class AdminLoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class AdminCreateKeysRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    count: int = Field(default=1, ge=1, le=500)
    note: str = Field(default="", max_length=255)
    email: str = Field(default="", max_length=255)
    seats_max: int = Field(default=2, ge=1, le=100)


class AdminUpdateSeatsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    seats_max: int = Field(ge=1, le=100)



class TokenRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    installation_id: str = Field(min_length=36, max_length=36)

    @field_validator("installation_id")
    @classmethod
    def valid_installation_id(cls, value: str) -> str:
        parsed = uuid.UUID(value)
        if str(parsed) != value.lower() or parsed.version != 4:
            raise ValueError("installation_id must be an anonymous UUID v4")
        return str(parsed)


class ReportPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    event_id: str = Field(min_length=36, max_length=36)
    app: Literal["writer", "sheet", "slides"]
    version: str = Field(min_length=1, max_length=40)
    os: str = Field(min_length=1, max_length=80)
    error_type: str = Field(min_length=1, max_length=80)
    message: str = Field(max_length=1000)
    stack: str = Field(max_length=8000)
    installation_id: str = Field(min_length=36, max_length=36)

    @field_validator("event_id", "installation_id")
    @classmethod
    def valid_uuid(cls, value: str) -> str:
        parsed = uuid.UUID(value)
        if str(parsed) != value.lower():
            raise ValueError("UUID must use canonical form")
        return str(parsed)

    @field_validator("version")
    @classmethod
    def valid_version(cls, value: str) -> str:
        if not _VERSION_RE.fullmatch(value):
            raise ValueError("invalid version")
        return value

    @field_validator("error_type")
    @classmethod
    def valid_error_type(cls, value: str) -> str:
        if not _ERROR_TYPE_RE.fullmatch(value):
            raise ValueError("invalid error type")
        return value


class RateLimiter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str, limit: int, window_seconds: int) -> bool:
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            hits = self._hits[key]
            while hits and hits[0] <= cutoff:
                hits.popleft()
            if len(hits) >= limit:
                return False
            hits.append(now)
            return True


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_iso(value: datetime | None = None) -> str:
    return (value or _now()).isoformat(timespec="seconds")


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _unb64url(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _issue_token(secret: str, installation_id: str, expires_at: int) -> str:
    payload = f"{installation_id}:{expires_at}".encode("ascii")
    signature = hmac.digest(secret.encode("utf-8"), payload, "sha256")
    return f"{_b64url(payload)}.{_b64url(signature)}"


def _verify_token(secret: str, token: str) -> tuple[str, int] | None:
    try:
        encoded_payload, encoded_signature = token.split(".", 1)
        payload = _unb64url(encoded_payload)
        signature = _unb64url(encoded_signature)
        expected = hmac.digest(secret.encode("utf-8"), payload, "sha256")
        if not hmac.compare_digest(signature, expected):
            return None
        installation_id, expiry_text = payload.decode("ascii").split(":", 1)
        parsed = uuid.UUID(installation_id)
        expiry = int(expiry_text)
        if str(parsed) != installation_id or parsed.version != 4 or expiry < int(time.time()):
            return None
        return installation_id, expiry
    except (ValueError, TypeError, UnicodeError):
        return None


def _looks_like_document_content(report: ReportPayload) -> bool:
    for value in (report.os, report.error_type, report.message, report.stack):
        scrubbed = re.sub(r"<file\.[a-z0-9]{1,8}>", "<file>", value, flags=re.IGNORECASE)
        if any(pattern.search(scrubbed) for pattern in _DOCUMENT_MARKERS):
            return True
        if any(ord(char) < 32 and char not in "\n\r\t" for char in value):
            return True
    if len(report.message.splitlines()) > 2:
        return True
    if any(("\t" in line and line.count("\t") >= 2) for line in report.message.splitlines()):
        return True
    if report.stack:
        lines = [line.strip() for line in report.stack.splitlines() if line.strip()]
        if len(lines) > 40 or any(not _SAFE_STACK_LINE.fullmatch(line) for line in lines):
            return True
    return False


def _signature(report: ReportPayload) -> tuple[str, str]:
    frames = [line.strip() for line in report.stack.splitlines() if line.strip()]
    frame = next((line for line in frames if line.startswith(("File <path>", "at <path>", "<path>@"))), "")
    stable_frame = re.sub(r":\d+(?::\d+)?$", ":#", frame)
    label = f"{report.error_type}: {stable_frame}" if stable_frame else report.error_type
    digest = hashlib.sha256(label.encode("utf-8")).hexdigest()
    return digest, label[:240]


def _safe_file(root: Path, relative: str) -> Path:
    if not relative or "\\" in relative or relative.startswith("/"):
        raise HTTPException(status_code=404, detail="Update file not found")
    parts = Path(relative).parts
    if any(part in {"", ".", ".."} for part in parts):
        raise HTTPException(status_code=404, detail="Update file not found")
    root_resolved = root.resolve(strict=False)
    candidate = (root / relative).resolve(strict=False)
    if not candidate.is_relative_to(root_resolved) or not candidate.is_file():
        raise HTTPException(status_code=404, detail="Update file not found")
    return candidate


def _public_update_path(relative: str) -> bool:
    if re.fullmatch(r"channels/[a-z][a-z0-9-]{0,31}\.json", relative):
        return True
    if re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?/manifest\.(?:json|sig)", relative):
        return True
    return bool(re.fullmatch(r"files/[0-9a-f]{64}", relative))


def _authenticate_admin(
    request: Request,
    settings: Settings,
    sessions: dict[str, dict[str, Any]] | None = None,
) -> str:
    # Bảo mật: không mở admin API khi ADMIN_PASSWORD rỗng
    if not settings.admin_password or not settings.admin_username:
        raise HTTPException(
            status_code=503,
            detail={"error": "admin_disabled", "message": "Tính năng quản trị chưa được cấu hình"}
        )

    # 1. Thử xác thực qua phiên Cookie (cho trình duyệt quản trị)
    if sessions is not None:
        session_id = request.cookies.get("session_id")
        if session_id and session_id in sessions:
            session = sessions[session_id]
            if time.time() < session.get("expires_at", 0):
                # Kiểm tra CSRF token cho các phương thức ghi
                if request.method in ("POST", "PUT", "DELETE", "PATCH"):
                    csrf_header = request.headers.get("x-csrf-token", "")
                    expected_csrf = session.get("csrf_token", "")
                    if not csrf_header or not hmac.compare_digest(csrf_header.encode("utf-8"), expected_csrf.encode("utf-8")):
                        raise HTTPException(
                            status_code=403,
                            detail={"error": "invalid_csrf", "message": "CSRF token bị thiếu hoặc không hợp lệ"}
                        )
                return str(session.get("admin", settings.admin_username))

    # 2. Thử xác thực qua HTTP Basic Auth (cho script hoặc API)
    auth = request.headers.get("authorization", "")
    scheme, _, value = auth.partition(" ")
    if scheme.lower() == "basic":
        try:
            username, password = base64.b64decode(value, validate=True).decode("utf-8").split(":", 1)
        except (ValueError, UnicodeError):
            username, password = "", ""
        user_ok = hmac.compare_digest(username.encode("utf-8"), settings.admin_username.encode("utf-8"))
        pass_ok = hmac.compare_digest(password.encode("utf-8"), settings.admin_password.encode("utf-8"))
        if user_ok and pass_ok:
            return settings.admin_username

    raise HTTPException(
        status_code=401,
        detail={"error": "unauthorized", "message": "Yêu cầu đăng nhập quản trị viên"},
        headers={"WWW-Authenticate": "Basic"}
    )


def _basic_auth(request: Request, settings: Settings, sessions: dict[str, dict[str, Any]] | None = None) -> None:
    _authenticate_admin(request, settings, sessions)



def _client_address(request: Request) -> str:
    # Cloudflare overwrites this header before forwarding through the private tunnel.
    forwarded = request.headers.get("cf-connecting-ip", "").strip()
    try:
        return str(ipaddress.ip_address(forwarded))
    except ValueError:
        return request.client.host if request.client else "unknown"


def _open_db(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def _ensure_schema(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with _open_db(db_path) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                event_id TEXT PRIMARY KEY,
                received_at TEXT NOT NULL,
                app TEXT NOT NULL,
                version TEXT NOT NULL,
                os TEXT NOT NULL,
                error_type TEXT NOT NULL,
                message TEXT NOT NULL,
                stack TEXT NOT NULL,
                installation_id TEXT NOT NULL,
                signature TEXT NOT NULL,
                signature_label TEXT NOT NULL
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS reports_group_idx ON reports(signature, version, received_at)")
        lic_mod.init_license_schema(conn)


def _write_report_log(directory: Path, received_at: str, payload: ReportPayload, signature: str) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    filename = f"reports-{received_at[:10]}.jsonl"
    path = directory / filename
    record = payload.model_dump()
    record["received_at"] = received_at
    record["signature"] = signature
    fd = os.open(path, os.O_CREAT | os.O_APPEND | os.O_WRONLY, 0o600)
    with os.fdopen(fd, "a", encoding="utf-8") as stream:
        stream.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
    cutoff = time.time() - 90 * 86400
    for old in directory.glob("reports-*.jsonl"):
        try:
            if old != path and old.stat().st_mtime < cutoff:
                old.unlink()
        except OSError:
            continue


def _backup_database(db_path: Path, backup_dir: Path, retention_days: int) -> None:
    if not db_path.exists():
        return
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = _now().strftime("%Y%m%dT%H%M%SZ")
    target = backup_dir / f"3t-office-cloud-{stamp}.sqlite3"
    source = sqlite3.connect(db_path, timeout=10)
    destination = sqlite3.connect(target)
    try:
        source.backup(destination)
    finally:
        destination.close()
        source.close()
    os.chmod(target, 0o600)
    cutoff = time.time() - retention_days * 86400
    for old in backup_dir.glob("3t-office-cloud-*.sqlite3"):
        try:
            if old.stat().st_mtime < cutoff:
                old.unlink()
        except OSError:
            continue


def _parse_range(value: str, size: int) -> tuple[int, int] | None:
    if len(value) > 100:
        return None
    match = re.fullmatch(r"bytes=(\d*)-(\d*)", value.strip())
    if not match or not (match.group(1) or match.group(2)):
        return None
    first, last = match.groups()
    if not first:
        suffix = int(last)
        if suffix <= 0:
            return None
        start = max(0, size - suffix)
        end = size - 1
    else:
        start = int(first)
        end = min(int(last), size - 1) if last else size - 1
    if size == 0 or start >= size or end < start:
        return None
    return start, end


def create_app(settings: Settings | None = None) -> FastAPI:
    cfg = settings or Settings.from_env()
    if len(cfg.install_token_secret.encode("utf-8")) < 32:
        raise RuntimeError("INSTALL_TOKEN_SECRET must contain at least 32 bytes")
    if not cfg.admin_username or not cfg.admin_password:
        raise RuntimeError("ADMIN_USERNAME and ADMIN_PASSWORD must be configured")
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", cfg.product):
        raise RuntimeError("PRODUCT is not a valid product slug")

    for directory in (cfg.data_dir, cfg.updates_dir, cfg.reports_dir, cfg.backups_dir):
        directory.mkdir(parents=True, exist_ok=True)
    for directory in (cfg.data_dir, cfg.reports_dir, cfg.backups_dir):
        try:
            os.chmod(directory, 0o700)
        except OSError:
            pass
    if cfg.logs_dir:
        cfg.logs_dir.mkdir(parents=True, exist_ok=True)
    db_path = cfg.data_dir / "3t-office-cloud.sqlite3"
    _ensure_schema(db_path)
    try:
        os.chmod(db_path, 0o600)
    except OSError:
        pass
    limiter = RateLimiter()
    signing_key = lic_mod.load_private_key(cfg.license_signing_key, cfg.license_signing_key_file)
    public_key = signing_key.public_key() if signing_key is not None else None
    admin_sessions: dict[str, dict[str, Any]] = {}
    login_lockout: dict[str, dict[str, Any]] = {}

    logger = logging.getLogger("3t-office-cloud")
    logger.setLevel(logging.INFO)
    logger.propagate = False
    if cfg.logs_dir:
        for handler in list(logger.handlers):
            logger.removeHandler(handler)
            handler.close()
        file_handler = RotatingFileHandler(cfg.logs_dir / "3t-api.log", maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8")
        file_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
        logger.addHandler(file_handler)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        async def backups() -> None:
            while True:
                try:
                    await asyncio.to_thread(_backup_database, db_path, cfg.backups_dir, cfg.backup_retention_days)
                except Exception as exc:
                    logger.error("database backup failed: %s", type(exc).__name__)
                await asyncio.sleep(24 * 60 * 60)

        backup_task = asyncio.create_task(backups(), name="daily-sqlite-backup")
        try:
            yield
        finally:
            backup_task.cancel()
            try:
                await backup_task
            except asyncio.CancelledError:
                pass

    app = FastAPI(title="3T Office Cloud API", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/api/v1/reports/token")
    async def issue_report_token(request: Request) -> dict[str, object]:
        peer = _client_address(request)
        if not limiter.allow(f"token-peer:{peer}", cfg.token_rate, cfg.rate_window_seconds):
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        content_length = request.headers.get("content-length", "")
        if content_length.isdigit() and int(content_length) > 1024:
            raise HTTPException(status_code=413, detail="Request too large")
        try:
            body_bytes = bytearray()
            async for chunk in request.stream():
                if len(body_bytes) + len(chunk) > 1024:
                    raise HTTPException(status_code=413, detail="Request too large")
                body_bytes.extend(chunk)
            body = json.loads(body_bytes.decode("utf-8"))
            token_request = TokenRequest.model_validate(body)
        except HTTPException:
            raise
        except (UnicodeDecodeError, ValueError, ValidationError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid token request") from None
        key = f"token:{token_request.installation_id}"
        if not limiter.allow(key, cfg.token_rate, cfg.rate_window_seconds):
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        expiry = int(time.time()) + cfg.token_ttl_seconds
        return {"token": _issue_token(cfg.install_token_secret, token_request.installation_id, expiry), "expires_at": expiry}

    @app.post("/api/v1/reports")
    async def receive_report(request: Request, x_install_token: str = Header(default="")) -> dict[str, object]:
        claims = _verify_token(cfg.install_token_secret, x_install_token)
        if claims is None:
            raise HTTPException(status_code=401, detail="Invalid install token")
        installation_id, _ = claims
        peer = _client_address(request)
        if not limiter.allow(f"report:{installation_id}:{peer}", cfg.report_rate, cfg.rate_window_seconds):
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        content_length = request.headers.get("content-length", "")
        if content_length.isdigit() and int(content_length) > MAX_REPORT_BYTES:
            raise HTTPException(status_code=413, detail="Report exceeds 64 KiB")
        chunks = bytearray()
        async for chunk in request.stream():
            if len(chunks) + len(chunk) > MAX_REPORT_BYTES:
                raise HTTPException(status_code=413, detail="Report exceeds 64 KiB")
            chunks.extend(chunk)
        try:
            raw = json.loads(chunks.decode("utf-8"))
            report = ReportPayload.model_validate(raw)
        except (UnicodeDecodeError, json.JSONDecodeError, ValidationError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid report schema") from None
        if report.installation_id != installation_id:
            raise HTTPException(status_code=401, detail="Install token does not match installation")
        if _looks_like_document_content(report):
            raise HTTPException(status_code=400, detail="Report contains data that is not accepted")

        fingerprint, label = _signature(report)
        received_at = _utc_iso()
        try:
            with _open_db(db_path) as conn:
                cursor = conn.execute(
                    """INSERT OR IGNORE INTO reports
                       (event_id,received_at,app,version,os,error_type,message,stack,installation_id,signature,signature_label)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                    (report.event_id, received_at, report.app, report.version, report.os, report.error_type,
                     report.message, report.stack, report.installation_id, fingerprint, label),
                )
                inserted = cursor.rowcount == 1
            if inserted:
                await asyncio.to_thread(_write_report_log, cfg.reports_dir, received_at, report, fingerprint)
        except sqlite3.Error as exc:
            logger.error("report database write failed: %s", type(exc).__name__)
            raise HTTPException(status_code=503, detail="Report storage unavailable") from None
        logger.info("report received signature=%s version=%s", fingerprint[:16], report.version)
        return {"accepted": True, "duplicate": not inserted}

    @app.get("/api/v1/updates/{product}/{channel}/latest")
    async def latest_update(
        product: str, channel: str, current: str | None = None, compact: bool = False
    ) -> dict[str, object]:
        # `current`: the caller's version. Same version -> a tiny "up_to_date" answer, so a periodic check does not
        # download the multi-megabyte signed manifest. `compact`: omit the parsed manifest copy (the signed
        # base64 bytes are what the client verifies and uses).
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", product) or product != cfg.product:
            raise HTTPException(status_code=404, detail="Product not found")
        if not _CHANNEL_RE.fullmatch(channel):
            raise HTTPException(status_code=404, detail="Channel not found")
        try:
            pointer_path = _safe_file(cfg.updates_dir, f"channels/{channel}.json")
            pointer = json.loads(pointer_path.read_text(encoding="utf-8"))
            version = pointer.get("version")
            if pointer.get("channel") != channel or not isinstance(version, str) or not _VERSION_RE.fullmatch(version):
                raise ValueError("bad pointer")
            manifest_path = _safe_file(cfg.updates_dir, f"{version}/manifest.json")
            signature_path = _safe_file(cfg.updates_dir, f"{version}/manifest.sig")
            manifest_raw = manifest_path.read_bytes()
            signature = signature_path.read_bytes()
            manifest = json.loads(manifest_raw.decode("utf-8"))
            if manifest.get("version") != version or manifest.get("channel") != channel:
                raise ValueError("manifest mismatch")
        except (HTTPException, OSError, ValueError, TypeError, json.JSONDecodeError):
            raise HTTPException(status_code=404, detail="Signed update manifest not found") from None
        if current is not None and current == version and _VERSION_RE.fullmatch(current):
            return {"product": product, "channel": channel, "version": version, "up_to_date": True}
        answer: dict[str, object] = {
            "product": product,
            "channel": channel,
            "version": version,
            "up_to_date": False,
            "manifest_base64": base64.b64encode(manifest_raw).decode("ascii"),
            "signature_base64": base64.b64encode(signature).decode("ascii"),
        }
        if not compact:
            answer["manifest"] = manifest
        return answer

    @app.get("/updates/{relative_path:path}")
    async def update_file(relative_path: str, request: Request) -> Response:
        if not _public_update_path(relative_path):
            raise HTTPException(status_code=404, detail="Update file not found")
        path = _safe_file(cfg.updates_dir, relative_path)
        size = path.stat().st_size
        media_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        range_header = request.headers.get("range")
        if range_header:
            parsed = _parse_range(range_header, size)
            if parsed is None:
                return Response(status_code=416, headers={"Content-Range": f"bytes */{size}", "Accept-Ranges": "bytes"})
            start, end = parsed
            length = end - start + 1

            def ranged_file() -> AsyncIterator[bytes]:
                async def iterator() -> AsyncIterator[bytes]:
                    with path.open("rb") as stream:
                        stream.seek(start)
                        remaining = length
                        while remaining:
                            data = await asyncio.to_thread(stream.read, min(64 * 1024, remaining))
                            if not data:
                                break
                            remaining -= len(data)
                            yield data
                return iterator()

            return StreamingResponse(
                ranged_file(), status_code=206, media_type=media_type,
                headers={"Accept-Ranges": "bytes", "Content-Length": str(length), "Content-Range": f"bytes {start}-{end}/{size}"},
            )

        def whole_file() -> AsyncIterator[bytes]:
            async def iterator() -> AsyncIterator[bytes]:
                with path.open("rb") as stream:
                    while True:
                        data = await asyncio.to_thread(stream.read, 64 * 1024)
                        if not data:
                            break
                        yield data
            return iterator()

        return StreamingResponse(whole_file(), media_type=media_type, headers={"Accept-Ranges": "bytes", "Content-Length": str(size)})

    @app.post("/api/v1/license/activate")
    async def license_activate(request: Request, payload: LicenseActivateRequest) -> Response:
        peer = _client_address(request)
        if not limiter.allow(f"lic_act_ip:{peer}", 30, cfg.rate_window_seconds):
            return JSONResponse(status_code=429, content={"error": "rate_limited", "message": "Quá nhiều yêu cầu kích hoạt từ địa chỉ IP này"})

        if payload.product != cfg.product:
            return JSONResponse(status_code=400, content={"error": "invalid_product", "message": f"Sản phẩm không hợp lệ, yêu cầu: {cfg.product}"})

        canonical_key = lic_mod.normalize_and_validate_key(payload.key)
        if not canonical_key:
            return JSONResponse(status_code=400, content={"error": "invalid_key", "message": "Mã kích hoạt không đúng định dạng hoặc sai số kiểm tra"})

        key_hash = lic_mod.hash_key(canonical_key)
        if not limiter.allow(f"lic_act_key:{key_hash}", 10, cfg.rate_window_seconds):
            return JSONResponse(status_code=429, content={"error": "rate_limited", "message": "Quá nhiều yêu cầu kích hoạt cho mã bản quyền này"})

        if signing_key is None:
            return JSONResponse(status_code=503, content={"error": "signing_key_not_configured", "message": "Máy chủ chưa được cấu hình khóa ký bản quyền"})

        device_hash = hashlib.sha256(payload.device_fingerprint.encode("utf-8")).hexdigest()
        now_iso = _utc_iso()

        with _open_db(db_path) as conn:
            key_row = conn.execute(
                """SELECT id, key_hint, note, email, seats_max, status FROM license_keys WHERE key_hash = ?""",
                (key_hash,),
            ).fetchone()

            if not key_row:
                return JSONResponse(status_code=404, content={"error": "unknown_key", "message": "Mã kích hoạt không tồn tại trên hệ thống"})

            if key_row["status"] == "revoked":
                return JSONResponse(status_code=403, content={"error": "revoked", "message": "Mã kích hoạt này đã bị thu hồi"})

            license_id = key_row["id"]
            key_hint = key_row["key_hint"]
            seats_max = key_row["seats_max"]

            # Kiểm tra xem máy này đã từng kích hoạt key này chưa
            act_row = conn.execute(
                """SELECT id, removed_at FROM activations WHERE license_id = ? AND device_hash = ?""",
                (license_id, device_hash),
            ).fetchone()

            if act_row and act_row["removed_at"] is None:
                # Kích hoạt lại cùng máy: cập nhật thông tin, không tốn thêm slot
                conn.execute(
                    """UPDATE activations SET last_check_at = ?, device_name = ?, app_version = ? WHERE id = ?""",
                    (now_iso, payload.device_name, payload.app_version, act_row["id"]),
                )
            else:
                # Kiểm tra số lượng máy đang kích hoạt còn chỗ không
                active_rows = conn.execute(
                    """SELECT device_name FROM activations WHERE license_id = ? AND removed_at IS NULL""",
                    (license_id,),
                ).fetchall()
                if len(active_rows) >= seats_max:
                    active_names = [r["device_name"] for r in active_rows]
                    return JSONResponse(
                        status_code=409,
                        content={
                            "error": "seats_exhausted",
                            "message": "Mã kích hoạt đã hết số lượng máy cho phép",
                            "active_devices": active_names,
                        },
                    )

                if act_row and act_row["removed_at"] is not None:
                    # Máy đã từng bị gỡ, nay kích hoạt lại vào slot trống
                    conn.execute(
                        """UPDATE activations SET removed_at = NULL, last_check_at = ?, device_name = ?, app_version = ? WHERE id = ?""",
                        (now_iso, payload.device_name, payload.app_version, act_row["id"]),
                    )
                else:
                    # Máy mới tinh
                    conn.execute(
                        """INSERT INTO activations (id, license_id, device_hash, device_name, first_at, last_check_at, app_version, removed_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, NULL)""",
                        (str(uuid.uuid4()), license_id, device_hash, payload.device_name, now_iso, now_iso, payload.app_version),
                    )

            seats_used = conn.execute(
                """SELECT COUNT(*) FROM activations WHERE license_id = ? AND removed_at IS NULL""",
                (license_id,),
            ).fetchone()[0]

        token, next_check_iso = lic_mod.issue_license_token(
            signing_key,
            license_id=license_id,
            device_fingerprint=payload.device_fingerprint,
            key_hint=key_hint,
        )

        return JSONResponse(
            status_code=200,
            content={
                "token": token,
                "license": {
                    "id": license_id,
                    "edition": "perpetual",
                    "seats_used": seats_used,
                    "seats_max": seats_max,
                    "updates_until": None,
                },
                "next_check_at": next_check_iso,
            },
        )

    @app.post("/api/v1/license/validate")
    async def license_validate(request: Request, payload: LicenseValidateRequest) -> Response:
        peer = _client_address(request)
        if not limiter.allow(f"lic_val_ip:{peer}", 60, cfg.rate_window_seconds):
            return JSONResponse(status_code=429, content={"error": "rate_limited", "message": "Quá nhiều yêu cầu kiểm tra bản quyền"})

        if signing_key is None or public_key is None:
            return JSONResponse(status_code=503, content={"error": "signing_key_not_configured", "message": "Máy chủ chưa được cấu hình khóa ký bản quyền"})

        license_id: str | None = None
        device_fingerprint: str | None = None

        if payload.token:
            claims = lic_mod.verify_license_token(payload.token, public_key)
            if claims is None:
                return JSONResponse(
                    status_code=401,
                    content={"error": "invalid_token", "message": "Token bản quyền không hợp lệ hoặc đã bị chỉnh sửa", "valid": False},
                )
            license_id = claims.get("lid")
            device_fingerprint = claims.get("fp")
        elif payload.license_id and payload.device_fingerprint:
            license_id = payload.license_id
            device_fingerprint = payload.device_fingerprint
        else:
            return JSONResponse(
                status_code=400,
                content={"error": "missing_parameters", "message": "Cần cung cấp token hoặc cặp (license_id, device_fingerprint)"},
            )

        if not license_id or not device_fingerprint:
            return JSONResponse(status_code=400, content={"error": "invalid_payload", "message": "Thông tin thiết bị hoặc giấy phép không hợp lệ"})

        device_hash = hashlib.sha256(device_fingerprint.encode("utf-8")).hexdigest()
        now_iso = _utc_iso()

        with _open_db(db_path) as conn:
            key_row = conn.execute(
                """SELECT id, key_hint, seats_max, status FROM license_keys WHERE id = ?""",
                (license_id,),
            ).fetchone()

            if not key_row or key_row["status"] == "revoked":
                return JSONResponse(
                    status_code=403,
                    content={"error": "revoked", "message": "Giấy phép này đã bị thu hồi", "valid": False},
                )

            act_row = conn.execute(
                """SELECT id, removed_at FROM activations WHERE license_id = ? AND device_hash = ?""",
                (license_id, device_hash),
            ).fetchone()

            if not act_row or act_row["removed_at"] is not None:
                return JSONResponse(
                    status_code=403,
                    content={"error": "device_removed", "message": "Thiết bị này đã bị gỡ khỏi giấy phép", "valid": False},
                )

            conn.execute(
                """UPDATE activations SET last_check_at = ? WHERE id = ?""",
                (now_iso, act_row["id"]),
            )

            seats_used = conn.execute(
                """SELECT COUNT(*) FROM activations WHERE license_id = ? AND removed_at IS NULL""",
                (license_id,),
            ).fetchone()[0]

            key_hint = key_row["key_hint"]
            seats_max = key_row["seats_max"]

        new_token, next_check_iso = lic_mod.issue_license_token(
            signing_key,
            license_id=license_id,
            device_fingerprint=device_fingerprint,
            key_hint=key_hint,
        )

        return JSONResponse(
            status_code=200,
            content={
                "valid": True,
                "token": new_token,
                "next_check_at": next_check_iso,
                "license": {
                    "id": license_id,
                    "edition": "perpetual",
                    "seats_used": seats_used,
                    "seats_max": seats_max,
                    "updates_until": None,
                },
            },
        )

    @app.post("/api/v1/license/deactivate")
    async def license_deactivate(request: Request, payload: LicenseDeactivateRequest) -> Response:
        if signing_key is None or public_key is None:
            return JSONResponse(status_code=503, content={"error": "signing_key_not_configured", "message": "Máy chủ chưa được cấu hình khóa ký bản quyền"})

        license_id: str | None = None
        device_fingerprint: str | None = None

        if payload.token:
            claims = lic_mod.verify_license_token(payload.token, public_key)
            if claims is None:
                return JSONResponse(status_code=401, content={"error": "invalid_token", "message": "Token bản quyền không hợp lệ"})
            license_id = claims.get("lid")
            device_fingerprint = claims.get("fp")
        elif payload.license_id and payload.device_fingerprint:
            license_id = payload.license_id
            device_fingerprint = payload.device_fingerprint
        else:
            return JSONResponse(status_code=400, content={"error": "missing_parameters", "message": "Cần token hoặc (license_id, device_fingerprint)"})

        if not license_id or not device_fingerprint:
            return JSONResponse(status_code=400, content={"error": "invalid_payload", "message": "Thông tin gỡ kích hoạt không hợp lệ"})

        device_hash = hashlib.sha256(device_fingerprint.encode("utf-8")).hexdigest()
        now_iso = _utc_iso()

        with _open_db(db_path) as conn:
            cursor = conn.execute(
                """UPDATE activations SET removed_at = ? WHERE license_id = ? AND device_hash = ? AND removed_at IS NULL""",
                (now_iso, license_id, device_hash),
            )
            updated = cursor.rowcount > 0

        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "message": "Đã gỡ kích hoạt thiết bị thành công" if updated else "Thiết bị không ở trạng thái kích hoạt",
            },
        )

    @app.post("/api/v1/admin/license/activate-offline")
    async def admin_license_activate_offline(request: Request, payload: LicenseOfflineActivateRequest) -> Response:
        admin_user = _authenticate_admin(request, cfg, admin_sessions)
        if signing_key is None:
            return JSONResponse(status_code=503, content={"error": "signing_key_not_configured", "message": "Máy chủ chưa được cấu hình khóa ký bản quyền"})

        canonical_key = lic_mod.normalize_and_validate_key(payload.key)
        if not canonical_key:
            return JSONResponse(status_code=400, content={"error": "invalid_key", "message": "Mã kích hoạt không đúng định dạng hoặc sai số kiểm tra"})

        key_hash = lic_mod.hash_key(canonical_key)
        device_fingerprint = hashlib.sha256(payload.device_code.encode("utf-8")).hexdigest()
        device_hash = hashlib.sha256(device_fingerprint.encode("utf-8")).hexdigest()
        device_name = payload.device_name or f"Ngoại tuyến ({payload.device_code[:8]})"
        now_iso = _utc_iso()

        with _open_db(db_path) as conn:
            key_row = conn.execute(
                """SELECT id, key_hint, seats_max, status FROM license_keys WHERE key_hash = ?""",
                (key_hash,),
            ).fetchone()

            if not key_row:
                return JSONResponse(status_code=404, content={"error": "unknown_key", "message": "Mã kích hoạt không tồn tại"})

            if key_row["status"] == "revoked":
                return JSONResponse(status_code=403, content={"error": "revoked", "message": "Mã kích hoạt này đã bị thu hồi"})

            license_id = key_row["id"]
            key_hint = key_row["key_hint"]
            seats_max = key_row["seats_max"]

            act_row = conn.execute(
                """SELECT id, removed_at FROM activations WHERE license_id = ? AND device_hash = ?""",
                (license_id, device_hash),
            ).fetchone()

            if act_row and act_row["removed_at"] is None:
                conn.execute(
                    """UPDATE activations SET last_check_at = ?, device_name = ? WHERE id = ?""",
                    (now_iso, device_name, act_row["id"]),
                )
            else:
                active_count = conn.execute(
                    """SELECT COUNT(*) FROM activations WHERE license_id = ? AND removed_at IS NULL""",
                    (license_id,),
                ).fetchone()[0]

                if active_count >= seats_max:
                    return JSONResponse(status_code=409, content={"error": "seats_exhausted", "message": "Mã kích hoạt đã hết số lượng máy cho phép"})

                if act_row and act_row["removed_at"] is not None:
                    conn.execute(
                        """UPDATE activations SET removed_at = NULL, last_check_at = ?, device_name = ? WHERE id = ?""",
                        (now_iso, device_name, act_row["id"]),
                    )
                else:
                    conn.execute(
                        """INSERT INTO activations (id, license_id, device_hash, device_name, first_at, last_check_at, app_version, removed_at)
                           VALUES (?, ?, ?, ?, ?, ?, 'offline', NULL)""",
                        (str(uuid.uuid4()), license_id, device_hash, device_name, now_iso, now_iso),
                    )

            # Ghi nhật ký quản trị (chỉ ghi hint và device_code rút gọn, TUYỆT ĐỐI KHÔNG ghi key thô)
            conn.execute(
                """INSERT INTO admin_audit (id, at, admin, action, target) VALUES (?, ?, ?, ?, ?)""",
                (str(uuid.uuid4()), now_iso, admin_user, "activate_offline", f"hint={key_hint},dev={payload.device_code[:12]}"),
            )

        token, _ = lic_mod.issue_license_token(
            signing_key,
            license_id=license_id,
            device_fingerprint=device_fingerprint,
            key_hint=key_hint,
        )

        return JSONResponse(status_code=200, content={"activation_code": token})

    @app.get("/api/v1/admin/reports")
    async def admin_reports(request: Request, limit: int = 500) -> dict[str, object]:
        _authenticate_admin(request, cfg, admin_sessions)

        limit = min(max(limit, 1), 1000)
        with _open_db(db_path) as conn:
            rows = conn.execute(
                """SELECT version, signature, signature_label, GROUP_CONCAT(DISTINCT app) AS apps,
                          COUNT(*) AS occurrences, COUNT(DISTINCT installation_id) AS installations,
                          MIN(received_at) AS first_seen, MAX(received_at) AS last_seen,
                          MAX(error_type) AS error_type, MAX(message) AS sample_message, MAX(stack) AS sample_stack
                   FROM reports GROUP BY signature, version
                   ORDER BY last_seen DESC LIMIT ?""", (limit,),
            ).fetchall()
        return {"groups": [dict(row) for row in rows]}

    @app.post("/api/v1/admin/login")
    async def admin_login(request: Request, payload: AdminLoginRequest) -> Response:
        if not cfg.admin_password or not cfg.admin_username:
            return JSONResponse(status_code=503, content={"error": "admin_disabled", "message": "Tính năng quản trị chưa được cấu hình"})

        peer = _client_address(request)
        now_ts = time.time()
        record = login_lockout.get(peer, {"attempts": 0, "locked_until": 0.0})
        if record["locked_until"] > now_ts:
            rem = int(record["locked_until"] - now_ts) + 1
            return JSONResponse(
                status_code=429,
                content={"error": "temporarily_locked", "message": f"Tài khoản hoặc IP bị khóa tạm thời. Vui lòng thử lại sau {rem} giây"},
            )

        user_ok = hmac.compare_digest(payload.username.encode("utf-8"), cfg.admin_username.encode("utf-8"))
        pass_ok = hmac.compare_digest(payload.password.encode("utf-8"), cfg.admin_password.encode("utf-8"))
        if not (user_ok and pass_ok):
            record["attempts"] = record.get("attempts", 0) + 1
            if record["attempts"] >= 5:
                record["locked_until"] = now_ts + 15 * 60
            login_lockout[peer] = record
            left = max(0, 5 - record["attempts"])
            return JSONResponse(
                status_code=401,
                content={"error": "invalid_credentials", "message": "Tên đăng nhập hoặc mật khẩu không chính xác", "attempts_left": left},
            )

        login_lockout.pop(peer, None)
        session_id = secrets.token_urlsafe(32)
        csrf_token = secrets.token_urlsafe(32)
        admin_sessions[session_id] = {
            "admin": payload.username,
            "csrf_token": csrf_token,
            "expires_at": now_ts + 86400,
        }

        with _open_db(db_path) as conn:
            conn.execute(
                """INSERT INTO admin_audit (id, at, admin, action, target) VALUES (?, ?, ?, ?, ?)""",
                (str(uuid.uuid4()), _utc_iso(), payload.username, "login", payload.username),
            )

        resp = JSONResponse(status_code=200, content={"ok": True, "admin": payload.username, "csrf_token": csrf_token})
        resp.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=86400,
            path="/",
        )
        return resp

    @app.post("/api/v1/admin/logout")
    async def admin_logout(request: Request) -> Response:
        admin_user = _authenticate_admin(request, cfg, admin_sessions)
        session_id = request.cookies.get("session_id")
        if session_id and session_id in admin_sessions:
            admin_sessions.pop(session_id, None)

        with _open_db(db_path) as conn:
            conn.execute(
                """INSERT INTO admin_audit (id, at, admin, action, target) VALUES (?, ?, ?, ?, ?)""",
                (str(uuid.uuid4()), _utc_iso(), admin_user, "logout", admin_user),
            )

        resp = JSONResponse(status_code=200, content={"ok": True, "message": "Đã đăng xuất"})
        resp.delete_cookie(key="session_id", path="/")
        return resp

    @app.get("/api/v1/admin/me")
    async def admin_me(request: Request) -> dict[str, object]:
        admin_user = _authenticate_admin(request, cfg, admin_sessions)
        session_id = request.cookies.get("session_id")
        csrf = admin_sessions.get(session_id, {}).get("csrf_token", "") if session_id else ""
        return {"authenticated": True, "admin": admin_user, "csrf_token": csrf}

    @app.get("/api/v1/admin/overview")
    async def admin_overview(request: Request) -> dict[str, object]:
        _authenticate_admin(request, cfg, admin_sessions)
        with _open_db(db_path) as conn:
            total_keys = conn.execute("SELECT COUNT(*) FROM license_keys").fetchone()[0]
            active_keys = conn.execute("SELECT COUNT(*) FROM license_keys WHERE status = 'active'").fetchone()[0]
            revoked_keys = conn.execute("SELECT COUNT(*) FROM license_keys WHERE status = 'revoked'").fetchone()[0]
            total_active_devices = conn.execute("SELECT COUNT(*) FROM activations WHERE removed_at IS NULL").fetchone()[0]
            # 7 ngày qua
            activations_7d = conn.execute(
                "SELECT COUNT(*) FROM activations WHERE first_at >= datetime('now', '-7 days')"
            ).fetchone()[0]
            # 24 giờ qua
            error_groups_24h = conn.execute(
                "SELECT COUNT(DISTINCT signature) FROM reports WHERE received_at >= datetime('now', '-1 day')"
            ).fetchone()[0]

        channels = []
        if cfg.updates_dir.is_dir():
            ch_dir = cfg.updates_dir / "channels"
            if ch_dir.is_dir():
                for p in ch_dir.glob("*.json"):
                    try:
                        content = json.loads(p.read_text(encoding="utf-8"))
                        channels.append({
                            "channel": p.stem,
                            "version": content.get("version", "unknown"),
                            "updated_at": content.get("updated_at", ""),
                        })
                    except Exception:
                        pass

        return {
            "total_keys": total_keys,
            "active_keys": active_keys,
            "revoked_keys": revoked_keys,
            "total_active_devices": total_active_devices,
            "activations_7d": activations_7d,
            "error_groups_24h": error_groups_24h,
            "channels": channels,
        }

    @app.get("/api/v1/admin/keys")
    async def admin_list_keys(
        request: Request,
        q: str = "",
        status: str = "all",
        page: int = 1,
        page_size: int = 50,
    ) -> dict[str, object]:
        _authenticate_admin(request, cfg, admin_sessions)
        page = max(1, page)
        page_size = min(max(1, page_size), 200)
        offset = (page - 1) * page_size

        where_clauses = []
        params: list[object] = []

        if status in ("active", "revoked"):
            where_clauses.append("k.status = ?")
            params.append(status)

        if q.strip():
            where_clauses.append("(k.key_hint LIKE ? OR k.note LIKE ? OR k.email LIKE ?)")
            term = f"%{q.strip()}%"
            params.extend([term, term, term])

        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        with _open_db(db_path) as conn:
            count_sql = f"SELECT COUNT(*) FROM license_keys k {where_sql}"
            total = conn.execute(count_sql, params).fetchone()[0]

            query_sql = f"""
                SELECT k.id, k.key_hint, k.note, k.email, k.seats_max, k.status, k.created_at, k.revoked_at,
                       (SELECT COUNT(*) FROM activations a WHERE a.license_id = k.id AND a.removed_at IS NULL) AS seats_used
                FROM license_keys k
                {where_sql}
                ORDER BY k.created_at DESC
                LIMIT ? OFFSET ?
            """
            rows = conn.execute(query_sql, params + [page_size, offset]).fetchall()

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "keys": [dict(r) for r in rows],
        }

    @app.post("/api/v1/admin/keys")
    async def admin_create_keys(request: Request, payload: AdminCreateKeysRequest) -> Response:
        admin_user = _authenticate_admin(request, cfg, admin_sessions)
        now_iso = _utc_iso()

        keys_out: list[str] = []
        rows_to_insert = []
        for _ in range(payload.count):
            raw_key = lic_mod.generate_license_key()
            norm = lic_mod.normalize_and_validate_key(raw_key)
            if not norm:
                continue
            khash = lic_mod.hash_key(norm)
            khint = lic_mod.extract_hint(norm)
            lid = str(uuid.uuid4())
            rows_to_insert.append((lid, khash, khint, payload.note, payload.email, payload.seats_max, "active", now_iso))
            keys_out.append(norm)

        with _open_db(db_path) as conn:
            conn.executemany(
                """INSERT INTO license_keys (id, key_hash, key_hint, note, email, seats_max, status, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                rows_to_insert,
            )
            # Ghi nhật ký quản trị (chỉ ghi số lượng, KHÔNG ghi key thô)
            conn.execute(
                """INSERT INTO admin_audit (id, at, admin, action, target) VALUES (?, ?, ?, ?, ?)""",
                (str(uuid.uuid4()), now_iso, admin_user, "create_keys", f"count={len(keys_out)},seats={payload.seats_max}"),
            )

        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "count": len(keys_out),
                "keys": keys_out,
                "note": payload.note,
                "email": payload.email,
                "seats_max": payload.seats_max,
            },
        )

    @app.get("/api/v1/admin/keys/{key_id}")
    async def admin_get_key(key_id: str, request: Request) -> dict[str, object]:
        _authenticate_admin(request, cfg, admin_sessions)
        with _open_db(db_path) as conn:
            row = conn.execute(
                """SELECT id, key_hint, note, email, seats_max, status, created_at, revoked_at,
                          (SELECT COUNT(*) FROM activations a WHERE a.license_id = k.id AND a.removed_at IS NULL) AS seats_used
                   FROM license_keys k WHERE k.id = ?""",
                (key_id,),
            ).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Không tìm thấy mã bản quyền")

            activations = conn.execute(
                """SELECT id, device_hash, device_name, first_at, last_check_at, app_version, removed_at
                   FROM activations WHERE license_id = ? ORDER BY first_at DESC""",
                (key_id,),
            ).fetchall()

        return {"key": dict(row), "activations": [dict(a) for a in activations]}

    @app.post("/api/v1/admin/keys/{key_id}/revoke")
    async def admin_revoke_key(key_id: str, request: Request) -> dict[str, object]:
        admin_user = _authenticate_admin(request, cfg, admin_sessions)
        now_iso = _utc_iso()
        with _open_db(db_path) as conn:
            cursor = conn.execute(
                "UPDATE license_keys SET status = 'revoked', revoked_at = ? WHERE id = ? AND status != 'revoked'",
                (now_iso, key_id),
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Không tìm thấy mã bản quyền hoặc đã bị thu hồi")
            conn.execute(
                """INSERT INTO admin_audit (id, at, admin, action, target) VALUES (?, ?, ?, ?, ?)""",
                (str(uuid.uuid4()), now_iso, admin_user, "revoke_key", f"id={key_id}"),
            )
        return {"ok": True, "message": "Đã thu hồi mã bản quyền thành công"}

    @app.post("/api/v1/admin/keys/{key_id}/reissue")
    async def admin_reissue_key(key_id: str, request: Request) -> dict[str, object]:
        admin_user = _authenticate_admin(request, cfg, admin_sessions)
        now_iso = _utc_iso()
        with _open_db(db_path) as conn:
            old_row = conn.execute(
                "SELECT note, email, seats_max FROM license_keys WHERE id = ?",
                (key_id,),
            ).fetchone()
            if not old_row:
                raise HTTPException(status_code=404, detail="Không tìm thấy mã bản quyền")

            # Thu hồi key cũ
            conn.execute(
                "UPDATE license_keys SET status = 'revoked', revoked_at = ? WHERE id = ?",
                (now_iso, key_id),
            )

            # Sinh key mới cùng cấu hình
            new_raw = lic_mod.generate_license_key()
            norm = lic_mod.normalize_and_validate_key(new_raw)
            if not norm:
                raise HTTPException(status_code=500, detail="Lỗi sinh key mới")
            khash = lic_mod.hash_key(norm)
            khint = lic_mod.extract_hint(norm)
            new_lid = str(uuid.uuid4())

            conn.execute(
                """INSERT INTO license_keys (id, key_hash, key_hint, note, email, seats_max, status, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, 'active', ?)""",
                (new_lid, khash, khint, old_row["note"], old_row["email"], old_row["seats_max"], now_iso),
            )

            conn.execute(
                """INSERT INTO admin_audit (id, at, admin, action, target) VALUES (?, ?, ?, ?, ?)""",
                (str(uuid.uuid4()), now_iso, admin_user, "reissue_key", f"old={key_id},new={new_lid}"),
            )

        return {
            "ok": True,
            "old_id": key_id,
            "new_id": new_lid,
            "key": norm,
            "note": old_row["note"],
            "email": old_row["email"],
            "seats_max": old_row["seats_max"],
        }

    @app.post("/api/v1/admin/keys/{key_id}/seats")
    async def admin_update_seats(key_id: str, request: Request, payload: AdminUpdateSeatsRequest) -> dict[str, object]:
        admin_user = _authenticate_admin(request, cfg, admin_sessions)
        now_iso = _utc_iso()
        with _open_db(db_path) as conn:
            cursor = conn.execute(
                "UPDATE license_keys SET seats_max = ? WHERE id = ?",
                (payload.seats_max, key_id),
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Không tìm thấy mã bản quyền")
            conn.execute(
                """INSERT INTO admin_audit (id, at, admin, action, target) VALUES (?, ?, ?, ?, ?)""",
                (str(uuid.uuid4()), now_iso, admin_user, "update_seats", f"id={key_id},seats={payload.seats_max}"),
            )
        return {"ok": True, "seats_max": payload.seats_max}

    @app.post("/api/v1/admin/keys/{key_id}/devices/{device_id}/remove")
    async def admin_remove_device(key_id: str, device_id: str, request: Request) -> dict[str, object]:
        admin_user = _authenticate_admin(request, cfg, admin_sessions)
        now_iso = _utc_iso()
        with _open_db(db_path) as conn:
            cursor = conn.execute(
                "UPDATE activations SET removed_at = ? WHERE license_id = ? AND id = ? AND removed_at IS NULL",
                (now_iso, key_id, device_id),
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị hoặc thiết bị đã bị gỡ")
            conn.execute(
                """INSERT INTO admin_audit (id, at, admin, action, target) VALUES (?, ?, ?, ?, ?)""",
                (str(uuid.uuid4()), now_iso, admin_user, "remove_device", f"key={key_id},dev={device_id}"),
            )
        return {"ok": True, "message": "Đã gỡ thiết bị khỏi mã bản quyền"}

    @app.get("/api/v1/admin/releases")
    async def admin_releases(request: Request) -> dict[str, object]:
        _authenticate_admin(request, cfg, admin_sessions)
        channels = []
        if cfg.updates_dir.is_dir():
            ch_dir = cfg.updates_dir / "channels"
            if ch_dir.is_dir():
                for p in ch_dir.glob("*.json"):
                    try:
                        content = json.loads(p.read_text(encoding="utf-8"))
                        channels.append({
                            "channel": p.stem,
                            "version": content.get("version", ""),
                            "manifest_sha256": content.get("manifest_sha256", ""),
                            "date": content.get("date", ""),
                        })
                    except Exception:
                        pass

        downloads = []
        if cfg.downloads_dir and cfg.downloads_dir.is_dir():
            for f in cfg.downloads_dir.glob("*"):
                if f.is_file() and _SAFE_DOWNLOAD_NAME.fullmatch(f.name):
                    h = hashlib.sha256()
                    with f.open("rb") as stream:
                        while chunk := stream.read(64 * 1024):
                            h.update(chunk)
                    downloads.append({
                        "file_name": f.name,
                        "file_size": f.stat().st_size,
                        "sha256": h.hexdigest(),
                    })

        return {"channels": channels, "downloads": downloads}

    @app.get("/api/v1/admin/audit")
    async def admin_audit_log(request: Request, limit: int = 100) -> dict[str, object]:
        _authenticate_admin(request, cfg, admin_sessions)
        limit = min(max(1, limit), 500)
        with _open_db(db_path) as conn:
            rows = conn.execute(
                "SELECT id, at, admin, action, target FROM admin_audit ORDER BY at DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return {"audit_logs": [dict(r) for r in rows]}


    @app.api_route("/downloads/{file_name}", methods=["GET", "HEAD"])
    async def download_file(file_name: str, request: Request) -> Response:
        if not _SAFE_DOWNLOAD_NAME.fullmatch(file_name):
            raise HTTPException(status_code=404, detail="Download file not found")
        if cfg.downloads_dir is None or not cfg.downloads_dir.is_dir():
            raise HTTPException(status_code=404, detail="Download file not found")
        path = _safe_file(cfg.downloads_dir, file_name)
        size = path.stat().st_size
        media_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        disposition = f'attachment; filename="{path.name}"'
        headers = {
            "Accept-Ranges": "bytes",
            "Content-Length": str(size),
            "Content-Disposition": disposition,
        }
        if request.method == "HEAD":
            return Response(status_code=200, media_type=media_type, headers=headers)

        range_header = request.headers.get("range")
        if range_header:
            parsed = _parse_range(range_header, size)
            if parsed is None:
                return Response(status_code=416, headers={"Content-Range": f"bytes */{size}", "Accept-Ranges": "bytes"})
            start, end = parsed
            length = end - start + 1

            def ranged_file() -> AsyncIterator[bytes]:
                async def iterator() -> AsyncIterator[bytes]:
                    with path.open("rb") as stream:
                        stream.seek(start)
                        remaining = length
                        while remaining:
                            data = await asyncio.to_thread(stream.read, min(64 * 1024, remaining))
                            if not data:
                                break
                            remaining -= len(data)
                            yield data
                return iterator()

            return StreamingResponse(
                ranged_file(), status_code=206, media_type=media_type,
                headers={
                    "Accept-Ranges": "bytes",
                    "Content-Length": str(length),
                    "Content-Range": f"bytes {start}-{end}/{size}",
                    "Content-Disposition": disposition,
                },
            )

        def whole_file() -> AsyncIterator[bytes]:
            async def iterator() -> AsyncIterator[bytes]:
                with path.open("rb") as stream:
                    while True:
                        data = await asyncio.to_thread(stream.read, 64 * 1024)
                        if not data:
                            break
                        yield data
            return iterator()

        return StreamingResponse(
            whole_file(), media_type=media_type,
            headers=headers,
        )

    # Trang web sản phẩm (tĩnh). Gắn CUỐI CÙNG để không che /health, /api/v1/* và /updates/*.
    if cfg.web_dir is not None and cfg.web_dir.is_dir():
        app.mount("/", _ProductWebsite(directory=cfg.web_dir, html=True), name="web")

    return app


class _ProductWebsite(StaticFiles):
    """Phục vụ website tĩnh; đường dẫn sai trả về trang 404 tiếng Việt thay vì chữ trần."""

    async def get_response(self, path: str, scope):  # type: ignore[override]
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code != 404:
                raise
            try:
                response = await super().get_response("404.html", scope)
            except StarletteHTTPException:
                raise exc from None
            response.status_code = 404
            return response


app = create_app() if os.environ.get("INSTALL_TOKEN_SECRET") and os.environ.get("ADMIN_PASSWORD") else FastAPI(
    title="3T Office Cloud API", docs_url=None, redoc_url=None, openapi_url=None,
)
