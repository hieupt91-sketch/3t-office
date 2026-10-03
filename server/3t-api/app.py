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
        )


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


def _basic_auth(request: Request, settings: Settings) -> None:
    auth = request.headers.get("authorization", "")
    scheme, _, value = auth.partition(" ")
    if scheme.lower() != "basic":
        raise HTTPException(status_code=401, detail="Authentication required", headers={"WWW-Authenticate": "Basic"})
    try:
        username, password = base64.b64decode(value, validate=True).decode("utf-8").split(":", 1)
    except (ValueError, UnicodeError):
        username, password = "", ""
    user_ok = hmac.compare_digest(username.encode("utf-8"), settings.admin_username.encode("utf-8"))
    pass_ok = hmac.compare_digest(password.encode("utf-8"), settings.admin_password.encode("utf-8"))
    if not (user_ok and pass_ok):
        raise HTTPException(status_code=401, detail="Authentication required", headers={"WWW-Authenticate": "Basic"})


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

    @app.get("/api/v1/admin/reports")
    async def admin_reports(request: Request, limit: int = 500) -> dict[str, object]:
        _basic_auth(request, cfg)
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
