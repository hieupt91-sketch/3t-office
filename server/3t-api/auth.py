"""Module xac thuc, phan quyen va bao mat quan tri (Admin Security & Auth).

Bao gom:
- Bam mat khau bang hashlib.scrypt (chuan Python, an toan)
- TOTP 2FA chuan RFC 6238 bang thu vien chuan (khong can thu vien ngoai)
- Phan quyen may chu cho owner, support, viewer
- Quan ly phien Cookie HttpOnly, CSRF token, het han sau 30 phut khong hoat dong
- Khoa tam 5 lan sai theo IP that (CF-Connecting-IP) trong 15 phut
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import ipaddress
import secrets
import struct
import time
from typing import Any
from fastapi import HTTPException, Request

SESSION_INACTIVITY_TIMEOUT = 30 * 60  # 30 phut
LOCKOUT_ATTEMPTS = 5
LOCKOUT_DURATION = 15 * 60  # 15 phut


def hash_password(password: str) -> str:
    """Bam mat khau bang scrypt va salt ngau nhien 16 bytes."""
    salt = secrets.token_bytes(16)
    dk = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=16384, r=8, p=1)
    return f"scrypt${salt.hex()}${dk.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Kiem tra mat khau voi chuoi hash scrypt."""
    if not hashed.startswith("scrypt$"):
        return False
    parts = hashed.split("$")
    if len(parts) != 3:
        return False
    _, salt_hex, dk_hex = parts
    try:
        salt = bytes.fromhex(salt_hex)
        expected_dk = bytes.fromhex(dk_hex)
        dk = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=16384, r=8, p=1)
        return hmac.compare_digest(dk, expected_dk)
    except (ValueError, TypeError):
        return False


def generate_totp_secret() -> str:
    """Sinh khoa bi mat TOTP 20 bytes ma hoa Base32 (RFC 6238)."""
    raw = secrets.token_bytes(20)
    return base64.b32encode(raw).decode("ascii").replace("=", "")


def get_totp_code(secret_b32: str, intervals_no: int | None = None) -> str:
    """Tinh ma TOTP 6 so tai chu ky 30 giay chi dinh."""
    key = base64.b32decode(secret_b32.upper() + "=" * (-len(secret_b32) % 8), casefold=True)
    if intervals_no is None:
        intervals_no = int(time.time()) // 30
    msg = struct.pack(">Q", intervals_no)
    h = hmac.new(key, msg, hashlib.sha1).digest()
    o = h[19] & 15
    code = (struct.unpack(">I", h[o:o+4])[0] & 0x7fffffff) % 1000000
    return f"{code:06d}"


def verify_totp(secret_b32: str, code: str, window: int = 1) -> bool:
    """Xac thuc ma TOTP 6 so voi cua so window buoc thoi gian."""
    if not code or len(code.strip()) != 6 or not code.strip().isdigit():
        return False
    curr_interval = int(time.time()) // 30
    cleaned_code = code.strip()
    for w in range(-window, window + 1):
        expected = get_totp_code(secret_b32, curr_interval + w)
        if hmac.compare_digest(expected, cleaned_code):
            return True
    return False


def get_real_client_ip(request: Request) -> str:
    """Lay dia chi IP that cua nguoi dung qua CF-Connecting-IP hoac client host."""
    forwarded = request.headers.get("cf-connecting-ip", "").strip()
    if forwarded:
        try:
            return str(ipaddress.ip_address(forwarded))
        except ValueError:
            pass
    return request.client.host if request.client else "127.0.0.1"


class AdminSessionManager:
    """Quan ly phien dang nhap cua quan tri vien."""

    def __init__(self) -> None:
        self._sessions: dict[str, dict[str, Any]] = {}
        self._lockouts: dict[str, dict[str, Any]] = {}

    def is_locked(self, ip: str, username: str) -> tuple[bool, int]:
        """Kiem tra xem IP hoac username co dang bi khoa tam khong."""
        now_ts = time.time()
        for key in (f"ip:{ip}", f"user:{username.lower()}"):
            record = self._lockouts.get(key)
            if record and record.get("locked_until", 0) > now_ts:
                rem = int(record["locked_until"] - now_ts) + 1
                return True, rem
        return False, 0

    def record_failed_attempt(self, ip: str, username: str) -> int:
        """Ghi nhan lan dang nhap that bai. Khoa 15 phut neu qua 5 lan."""
        now_ts = time.time()
        left = LOCKOUT_ATTEMPTS
        for key in (f"ip:{ip}", f"user:{username.lower()}"):
            record = self._lockouts.setdefault(key, {"attempts": 0, "locked_until": 0.0})
            if record["locked_until"] > 0 and record["locked_until"] <= now_ts:
                record["attempts"] = 0
                record["locked_until"] = 0.0

            record["attempts"] += 1
            if record["attempts"] >= LOCKOUT_ATTEMPTS:
                record["locked_until"] = now_ts + LOCKOUT_DURATION
            left = min(left, max(0, LOCKOUT_ATTEMPTS - record["attempts"]))
        return left

    def reset_lockout(self, ip: str, username: str) -> None:
        """Xoa khoa tam khi dang nhap thanh cong."""
        self._lockouts.pop(f"ip:{ip}", None)
        self._lockouts.pop(f"user:{username.lower()}", None)

    def create_session(
        self,
        username: str,
        role: str,
        must_change_password: bool = False,
        requires_totp_setup: bool = False,
    ) -> tuple[str, str]:
        """Tao phien moi, tra ve (session_id, csrf_token)."""
        session_id = secrets.token_urlsafe(32)
        csrf_token = secrets.token_urlsafe(32)
        now_ts = time.time()
        self._sessions[session_id] = {
            "username": username,
            "role": role,
            "csrf_token": csrf_token,
            "created_at": now_ts,
            "last_active_at": now_ts,
            "must_change_password": must_change_password,
            "requires_totp_setup": requires_totp_setup,
        }
        return session_id, csrf_token

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        """Lay phien dang nhap va kiem tra het han 30 phut khong hoat dong."""
        session = self._sessions.get(session_id)
        if not session:
            return None
        now_ts = time.time()
        if now_ts - session.get("last_active_at", 0) > SESSION_INACTIVITY_TIMEOUT:
            self._sessions.pop(session_id, None)
            return None
        # Cap nhat thoi gian hoat dong cuoi
        session["last_active_at"] = now_ts
        return session

    def destroy_session(self, session_id: str) -> None:
        """Huy phien dang nhap."""
        self._sessions.pop(session_id, None)


def require_admin(
    request: Request,
    session_manager: AdminSessionManager,
    conn: Any,
    settings: Any,
    required_role: str | None = None,
) -> dict[str, Any]:
    """Kiem tra xac thuc va phan quyen quan tri vien o may chu.
    
    Tra ve dict thong tin admin: {username, role, session_id, csrf_token}.
    Ném HTTPException 401 neu chua dang nhap, 403 neu thieu quyen hoac sai CSRF.
    """
    admin_info: dict[str, Any] | None = None

    # 1. Thu xac thuc qua Cookie phien
    session_id = request.cookies.get("session_id")
    if session_id:
        session = session_manager.get_session(session_id)
        if session:
            # Kiem tra CSRF token cho cac yeu cau ghi (POST, PUT, DELETE, PATCH)
            if request.method in ("POST", "PUT", "DELETE", "PATCH"):
                csrf_header = request.headers.get("x-csrf-token", "")
                expected_csrf = session.get("csrf_token", "")
                if not csrf_header or not hmac.compare_digest(csrf_header.encode("utf-8"), expected_csrf.encode("utf-8")):
                    raise HTTPException(
                        status_code=403,
                        detail={"error": "invalid_csrf", "message": "CSRF token bị thiếu hoặc không hợp lệ"}
                    )
            admin_info = {
                "username": session.get("username") or session.get("admin") or "",
                "role": session.get("role", "owner"),
                "session_id": session_id,
                "csrf_token": session.get("csrf_token", ""),
                "must_change_password": session.get("must_change_password", False),
            }


    # 2. Thu xac thuc qua HTTP Basic Auth (du phong khẩn cấp hoac test)
    if not admin_info:
        auth = request.headers.get("authorization", "")
        scheme, _, value = auth.partition(" ")
        if scheme.lower() == "basic":
            try:
                username, password = base64.b64decode(value, validate=True).decode("utf-8").split(":", 1)
            except (ValueError, UnicodeError):
                username, password = "", ""

            # Kiem tra trong bang admin_users
            row = conn.execute(
                "SELECT username, password_hash, role, active, must_change_password FROM admin_users WHERE username = ?",
                (username,)
            ).fetchone() if conn else None

            if row and row["active"] and verify_password(password, row["password_hash"]):
                admin_info = {
                    "username": row["username"],
                    "role": row["role"],
                    "session_id": None,
                    "csrf_token": "",
                    "must_change_password": bool(row["must_change_password"]),
                }
            # Kiem tra du phong voi env credentials (vai tro owner)
            elif (
                settings.admin_username
                and settings.admin_password
                and hmac.compare_digest(username.encode("utf-8"), settings.admin_username.encode("utf-8"))
                and hmac.compare_digest(password.encode("utf-8"), settings.admin_password.encode("utf-8"))
            ):
                admin_info = {
                    "username": settings.admin_username,
                    "role": "owner",
                    "session_id": None,
                    "csrf_token": "",
                    "must_change_password": False,
                }

    if not admin_info:
        raise HTTPException(
            status_code=401,
            detail={"error": "unauthorized", "message": "Yêu cầu đăng nhập quản trị viên"},
            headers={"WWW-Authenticate": "Basic"}
        )

    # 3. Kiem tra phan quyen (Server-side Role Check)
    role = admin_info["role"]

    # Viewer khong duoc thuc hien bat ky thao tac ghi nao
    if role == "viewer" and request.method in ("POST", "PUT", "DELETE", "PATCH"):
        raise HTTPException(
            status_code=403,
            detail={"error": "permission_denied", "message": "Tài khoản chỉ có quyền xem (viewer), không thể thao tác"}
        )

    # Kiem tra vai tro bat buoc cu the
    if required_role == "owner" and role != "owner":
        raise HTTPException(
            status_code=403,
            detail={"error": "owner_required", "message": "Thao tác này yêu cầu quyền quản trị cấp cao (owner)"}
        )

    if required_role == "support" and role not in ("owner", "support"):
        raise HTTPException(
            status_code=403,
            detail={"error": "support_required", "message": "Thao tác này yêu cầu quyền hỗ trợ (support)"}
        )

    return admin_info
