"""Module quản lý bản quyền vĩnh viễn và token Ed25519 cho 3T Office."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import re
import secrets
import sqlite3
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519

# Bảng chữ số Crockford Base32 (32 ký tự, loại bỏ I, L, O, U để tránh nhầm lẫn khi đọc/gõ tay)
CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
CHAR_TO_VAL = {char: idx for idx, char in enumerate(CROCKFORD_ALPHABET)}

# Mảng trọng số lẻ (nguyên tố cùng nhau với 32) phát hiện 100% lỗi đơn ký tự và hầu hết lỗi đảo ký tự
KEY_WEIGHTS = (1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 3, 5, 7)

_CLEAN_KEY_RE = re.compile(r"^[0-9A-HJKMNP-TV-Z]{20}$")
_DEVICE_FP_RE = re.compile(r"^[A-Za-z0-9_.-]{8,128}$")


def now_utc_iso() -> str:
    """Trả về thời gian hiện tại chuẩn ISO-8601 UTC."""
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def b64url_encode(data: bytes) -> str:
    """Mã hóa base64 an toàn cho URL (bỏ padding =)."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def b64url_decode(value: str) -> bytes:
    """Giải mã chuỗi base64url có hoặc không có padding."""
    rem = len(value) % 4
    if rem:
        value += "=" * (4 - rem)
    return base64.urlsafe_b64decode(value)


def compute_key_checksum(raw_19: str) -> str:
    """Tính ký tự kiểm tra (checksum) cho 19 ký tự Crockford base32."""
    if len(raw_19) != 19:
        raise ValueError("Yêu cầu đúng 19 ký tự để tính checksum")
    total = 0
    for idx, char in enumerate(raw_19):
        val = CHAR_TO_VAL.get(char)
        if val is None:
            raise ValueError(f"Ký tự không hợp lệ trong chuỗi Crockford base32: {char}")
        total += val * KEY_WEIGHTS[idx]
    return CROCKFORD_ALPHABET[total % 32]


def generate_license_key() -> str:
    """Sinh mã bản quyền định dạng 3TO-XXXXX-XXXXX-XXXXX-XXXXX dùng CSPRNG secrets."""
    first_19 = "".join(secrets.choice(CROCKFORD_ALPHABET) for _ in range(19))
    checksum_char = compute_key_checksum(first_19)
    raw_20 = first_19 + checksum_char
    return f"3TO-{raw_20[0:5]}-{raw_20[5:10]}-{raw_20[10:15]}-{raw_20[15:20]}"


def normalize_and_validate_key(key: str) -> str | None:
    """Chuẩn hóa và kiểm tra mã bản quyền.
    
    Quy tắc Crockford:
    - Bỏ khoảng trắng, dấu gạch nối
    - Chuyển chữ hoa
    - O -> 0, I -> 1, L -> 1
    - Kiểm tra tiền tố 3TO
    - Kiểm tra checksum ký tự thứ 20
    Trả về định dạng chuẩn 3TO-XXXXX-XXXXX-XXXXX-XXXXX hoặc None nếu sai.
    """
    if not isinstance(key, str):
        return None
    cleaned = key.strip().upper().replace("-", "").replace(" ", "")
    if not cleaned.startswith("3TO"):
        return None
    body = cleaned[3:]
    # Thay thế các ký tự dễ nhầm theo chuẩn Crockford
    body_trans = []
    for char in body:
        if char == "O":
            body_trans.append("0")
        elif char in ("I", "L"):
            body_trans.append("1")
        else:
            body_trans.append(char)
    body_clean = "".join(body_trans)
    if not _CLEAN_KEY_RE.fullmatch(body_clean):
        return None

    first_19 = body_clean[:19]
    chk_expected = compute_key_checksum(first_19)
    if not hmac.compare_digest(body_clean[19], chk_expected):
        return None

    return f"3TO-{body_clean[0:5]}-{body_clean[5:10]}-{body_clean[10:15]}-{body_clean[15:20]}"


def hash_key(canonical_key: str) -> str:
    """Tính mã băm SHA-256 của key chuẩn."""
    return hashlib.sha256(canonical_key.encode("ascii")).hexdigest()


def extract_hint(canonical_key: str) -> str:
    """Lấy 4 ký tự cuối của key làm gợi ý (ví dụ: WXYZ)."""
    return canonical_key[-4:]


def load_private_key(
    key_b64: str | None = None,
    key_file: str | Path | None = None,
) -> ed25519.Ed25519PrivateKey | None:
    """Tải khóa riêng Ed25519 từ biến môi trường base64 hoặc tệp chỉ định."""
    raw_str = ""
    if key_b64 and key_b64.strip():
        raw_str = key_b64.strip()
    elif key_file:
        path = Path(key_file)
        if path.is_file():
            try:
                raw_str = path.read_text(encoding="utf-8").strip()
            except OSError:
                return None

    if not raw_str:
        return None

    try:
        raw_bytes = base64.b64decode(raw_str, validate=True)
        if len(raw_bytes) == 32:
            return ed25519.Ed25519PrivateKey.from_private_bytes(raw_bytes)
        # Thử nạp theo định dạng PKCS8
        return serialization.load_der_private_key(raw_bytes, password=None)  # type: ignore[return-value]
    except Exception:
        pass

    # Thử nạp theo định dạng PEM nếu chuỗi có header PEM
    try:
        return serialization.load_pem_private_key(raw_str.encode("utf-8"), password=None)  # type: ignore[return-value]
    except Exception:
        return None


def export_public_key_b64(private_key: ed25519.Ed25519PrivateKey) -> str:
    """Xuất khóa công khai raw 32 bytes dưới dạng base64."""
    public_key = private_key.public_key()
    raw = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return base64.b64encode(raw).decode("ascii")


def load_public_key(pub_b64: str) -> ed25519.Ed25519PublicKey | None:
    """Tải khóa công khai từ base64 32 bytes."""
    try:
        raw = base64.b64decode(pub_b64.strip(), validate=True)
        if len(raw) == 32:
            return ed25519.Ed25519PublicKey.from_public_bytes(raw)
        return serialization.load_der_public_key(raw)  # type: ignore[return-value]
    except Exception:
        return None


def issue_license_token(
    private_key: ed25519.Ed25519PrivateKey,
    license_id: str,
    device_fingerprint: str,
    key_hint: str,
    edition: str = "perpetual",
    grace_days: int = 30,
    check_days: int = 30,
    updates_until: str | None = None,
    platform: str = "windows",
) -> tuple[str, str]:
    """Tạo token bản quyền ký bằng Ed25519.
    
    Trả về tuple (token_string, next_check_iso).
    """
    now_ts = int(time.time())
    check_by_ts = now_ts + check_days * 86400
    next_check_dt = datetime.fromtimestamp(check_by_ts, tz=timezone.utc)
    next_check_iso = next_check_dt.isoformat(timespec="seconds")

    payload = {
        "v": 1,
        "lid": license_id,
        "edition": edition,
        "fp": device_fingerprint,
        "issued_at": now_ts,
        "check_by": check_by_ts,
        "grace_days": grace_days,
        "updates_until": updates_until,
        "plat": platform,
        "key_hint": f"…{key_hint}" if not key_hint.startswith("…") else key_hint,
    }

    payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    sig_bytes = private_key.sign(payload_bytes)
    token = f"{b64url_encode(payload_bytes)}.{b64url_encode(sig_bytes)}"
    return token, next_check_iso


def verify_license_token(
    token: str,
    public_key: ed25519.Ed25519PublicKey,
) -> dict[str, Any] | None:
    """Xác thực token bản quyền bằng khóa công khai Ed25519.
    
    Trả về payload dict nếu chữ ký hợp lệ, hoặc None nếu giả mạo / hỏng.
    """
    if not isinstance(token, str) or "." not in token:
        return None
    try:
        payload_b64, sig_b64 = token.split(".", 1)
        payload_bytes = b64url_decode(payload_b64)
        sig_bytes = b64url_decode(sig_b64)
        if len(sig_bytes) != 64:
            return None
        public_key.verify(sig_bytes, payload_bytes)
        payload = json.loads(payload_bytes.decode("utf-8"))
        if not isinstance(payload, dict):
            return None
        if payload.get("v") != 1:
            return None
        if not payload.get("lid") or not payload.get("fp"):
            return None
        return payload
    except Exception:
        return None


def init_license_schema(conn: sqlite3.Connection) -> None:
    """Khởi tạo các bảng SQLite cho hệ thống bản quyền."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS license_keys (
            id TEXT PRIMARY KEY,
            key_hash TEXT NOT NULL UNIQUE,
            key_hint TEXT NOT NULL,
            note TEXT NOT NULL DEFAULT '',
            email TEXT NOT NULL DEFAULT '',
            seats_max INTEGER NOT NULL DEFAULT 2,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL,
            revoked_at TEXT
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS license_keys_hash_idx ON license_keys(key_hash)")
    conn.execute("CREATE INDEX IF NOT EXISTS license_keys_status_idx ON license_keys(status)")

    conn.execute("""
        CREATE TABLE IF NOT EXISTS activations (
            id TEXT PRIMARY KEY,
            license_id TEXT NOT NULL REFERENCES license_keys(id),
            device_hash TEXT NOT NULL,
            device_name TEXT NOT NULL,
            first_at TEXT NOT NULL,
            last_check_at TEXT NOT NULL,
            app_version TEXT NOT NULL,
            removed_at TEXT,
            platform TEXT NOT NULL DEFAULT 'windows'
        )
    """)
    # Databases created before the platform column existed (Windows-only era).
    columns = {row[1] for row in conn.execute("PRAGMA table_info(activations)").fetchall()}
    if "platform" not in columns:
        conn.execute("ALTER TABLE activations ADD COLUMN platform TEXT NOT NULL DEFAULT 'windows'")
    conn.execute("CREATE INDEX IF NOT EXISTS activations_license_idx ON activations(license_id, removed_at)")
    conn.execute("CREATE INDEX IF NOT EXISTS activations_device_idx ON activations(license_id, device_hash)")

    conn.execute("""
        CREATE TABLE IF NOT EXISTS admin_audit (
            id TEXT PRIMARY KEY,
            at TEXT NOT NULL,
            admin TEXT NOT NULL,
            action TEXT NOT NULL,
            target TEXT NOT NULL
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS admin_audit_at_idx ON admin_audit(at DESC)")
