"""Router chua toan bo API Thuong mai, Ban hang, Cong khach hang va Quan tri mo rong.

Bao gom:
- Shop API (/api/v1/shop/*)
- Payments & Webhook (/api/v1/payments/*)
- License Status (/api/v1/license/status)
- Customer Portal (/api/v1/portal/*)
- Admin Commerce (/api/v1/admin/*)
"""

from __future__ import annotations

import csv
import hashlib
import hmac
import io
import json
import logging
import re
import secrets
import sqlite3
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from auth import (
    AdminSessionManager,
    generate_totp_secret,
    get_real_client_ip,
    get_totp_code,
    hash_password,
    require_admin,
    verify_password,
    verify_totp,
)
from emails.service import EmailService
from fulfillment import fulfill_order_idempotent, revoke_order_keys
from payments import PAYMENT_ADAPTERS, sign_bank_webhook

try:
    import license as lic_mod
except ImportError:
    from . import license as lic_mod

logger = logging.getLogger("3t-office-cloud")
_EMAIL_RE = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ==================== PYDANTIC MODELS ====================


class CustomerInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    email: str = Field(min_length=5, max_length=255)
    name: str = Field(min_length=1, max_length=128)
    phone: str = Field(default="", max_length=32)
    company: str = Field(default="", max_length=255)
    tax_code: str = Field(default="", max_length=32)
    address: str = Field(default="", max_length=255)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not _EMAIL_RE.fullmatch(cleaned):
            raise ValueError("Email không đúng định dạng")
        return cleaned


class ShopOrderCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    plan: str = Field(default="perpetual", max_length=64)
    quantity: int = Field(default=1, ge=1, le=500)
    customer: CustomerInput
    want_invoice: bool = Field(default=False)
    source: str = Field(default="web", pattern=r"^(web|admin|apple_iap|google_play)$")


class PortalLoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    email: str = Field(min_length=5, max_length=255)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not _EMAIL_RE.fullmatch(cleaned):
            raise ValueError("Email không đúng định dạng")
        return cleaned


class PortalVerifyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    email: str = Field(min_length=5, max_length=255)
    code: str = Field(min_length=6, max_length=6)


class PortalOfflineActivateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    key: str = Field(min_length=10, max_length=64)
    device_code: str = Field(min_length=8, max_length=256)
    device_name: str | None = Field(default=None, max_length=128)


class AdminLoginWithTotpRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)
    totp_code: str | None = Field(default=None, max_length=8)


class AdminChangePasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    old_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class AdminSetupTotpVerifyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    secret: str = Field(min_length=16, max_length=64)
    totp_code: str = Field(min_length=6, max_length=6)


class AdminCreateUserRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=128)
    role: Literal["owner", "support", "viewer"] = "support"


class AdminUpdatePlanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    price_vnd: int = Field(ge=0)
    seats_default: int = Field(default=2, ge=1, le=100)
    platforms: str = Field(default="windows", max_length=64)
    active: bool = Field(default=True)


class AdminUpdateInvoiceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    status: Literal["none", "requested", "issued"]
    number: str | None = Field(default=None, max_length=64)
    pdf_path: str | None = Field(default=None, max_length=255)


class AdminAssignPaymentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    order_code: str = Field(min_length=5, max_length=32)


class AdminRefundOrderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    reason: str = Field(default="Hoàn tiền theo yêu cầu", max_length=255)


class AdminTestEmailRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    to_email: str = Field(min_length=5, max_length=255)


# ==================== ROUTE REGISTRATION ====================


def register_commerce_routes(
    app: FastAPI,
    db_path: Any,
    cfg: Any,
    session_manager: AdminSessionManager,
    limiter: Any,
    email_service: EmailService,
    signing_key: Any,
    public_key: Any,
) -> None:
    router = APIRouter()

    def get_db() -> sqlite3.Connection:
        conn = sqlite3.connect(db_path, timeout=15)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def get_customer_from_portal_session(request: Request) -> dict[str, Any]:
        """Xac thuc phien cong khach hang."""
        session_id = request.cookies.get("portal_session_id")
        if not session_id:
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                session_id = auth_header[7:].strip()

        if not session_id:
            raise HTTPException(status_code=401, detail={"error": "unauthorized", "message": "Vui lòng đăng nhập cổng khách hàng"})

        now_ts = int(time.time())
        with get_db() as conn:
            row = conn.execute(
                """SELECT s.session_id, s.customer_id, s.email, s.expires_at, s.last_active_at,
                          c.full_name, c.phone, c.company_name, c.tax_code, c.address
                   FROM portal_sessions s
                   JOIN customers c ON s.customer_id = c.id
                   WHERE s.session_id = ?""",
                (session_id,),
            ).fetchone()

            if not row or row["expires_at"] < now_ts or (now_ts - row["last_active_at"] > 1800):
                if row:
                    conn.execute("DELETE FROM portal_sessions WHERE session_id = ?", (session_id,))
                raise HTTPException(status_code=401, detail={"error": "session_expired", "message": "Phiên đăng nhập đã hết hạn"})

            # Gia han phien 30 phut
            new_exp = now_ts + 1800
            conn.execute(
                "UPDATE portal_sessions SET last_active_at = ?, expires_at = ? WHERE session_id = ?",
                (now_ts, new_exp, session_id),
            )

        return dict(row)

    # ----------------------------------------------------
    # 1. SHOP API (Cong khai)
    # ----------------------------------------------------

    @router.get("/api/v1/shop/plans")
    async def get_shop_plans() -> dict[str, Any]:
        """Lay danh sach cac goi ban quyen dang ban."""
        with get_db() as conn:
            rows = conn.execute(
                """SELECT id, code, name, price_vnd, seats_default, platforms
                   FROM plans WHERE active = 1 ORDER BY price_vnd ASC"""
            ).fetchall()
        return {"plans": [dict(r) for r in rows]}

    @router.post("/api/v1/shop/orders")
    async def create_shop_order(request: Request, payload: ShopOrderCreateRequest) -> Response:
        """Tao don hang mua ban quyen. Don gia 0 tu dong hoan tat va cap key."""
        peer = get_real_client_ip(request)
        if not limiter.allow(f"shop_ord:{peer}", 30, cfg.rate_window_seconds):
            return JSONResponse(status_code=429, content={"error": "rate_limited", "message": "Quá nhiều yêu cầu tạo đơn từ địa chỉ này"})

        now_iso = now_utc_iso()
        now_dt = datetime.now(timezone.utc)
        date_prefix = now_dt.strftime("%y%m%d")

        with get_db() as conn:
            # 1. Tim plan
            plan = conn.execute(
                "SELECT id, code, name, price_vnd, seats_default, platforms FROM plans WHERE (code = ? OR id = ?) AND active = 1",
                (payload.plan, payload.plan),
            ).fetchone()
            if not plan:
                return JSONResponse(status_code=400, content={"error": "invalid_plan", "message": "Gói bản quyền không tồn tại hoặc đã ngừng cung cấp"})

            # 2. Xu ly khach hang (Customer)
            cust_row = conn.execute(
                "SELECT id FROM customers WHERE email = ?", (payload.customer.email,)
            ).fetchone()
            if cust_row:
                customer_id = cust_row["id"]
                conn.execute(
                    """UPDATE customers SET full_name = ?, phone = ?, company_name = ?, tax_code = ?, address = ?, updated_at = ?
                       WHERE id = ?""",
                    (payload.customer.name, payload.customer.phone, payload.customer.company, payload.customer.tax_code, payload.customer.address, now_iso, customer_id),
                )
            else:
                customer_id = str(uuid.uuid4())
                conn.execute(
                    """INSERT INTO customers (id, email, full_name, phone, company_name, tax_code, address, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (customer_id, payload.customer.email, payload.customer.name, payload.customer.phone, payload.customer.company, payload.customer.tax_code, payload.customer.address, now_iso, now_iso),
                )

            # 3. Tinh tien va sinh ma don
            amount_vnd = plan["price_vnd"] * payload.quantity
            order_id = str(uuid.uuid4())

            # Sinh ma don doc duoc: 3T-YYMMDD-XXXX
            order_code = ""
            for _ in range(10):
                candidate_code = f"3T-{date_prefix}-{secrets.token_hex(2).upper()}"
                exists = conn.execute("SELECT 1 FROM orders WHERE code = ?", (candidate_code,)).fetchone()
                if not exists:
                    order_code = candidate_code
                    break
            if not order_code:
                order_code = f"3T-{date_prefix}-{str(uuid.uuid4())[:4].upper()}"

            expires_at = datetime.fromtimestamp(time.time() + 86400, tz=timezone.utc).isoformat(timespec="seconds")
            initial_status = "paid" if amount_vnd == 0 else "pending_payment"

            conn.execute(
                """INSERT INTO orders (id, code, customer_id, plan_id, quantity, seats_per_key, amount_vnd, discount_vnd,
                                       status, note, expires_at, source, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, '', ?, ?, ?, ?)""",
                (order_id, order_code, customer_id, plan["id"], payload.quantity, plan["seats_default"],
                 amount_vnd, initial_status, expires_at, payload.source, now_iso, now_iso),
            )

            # Xu ly hoa don neu duoc yeu cau
            if payload.want_invoice:
                conn.execute(
                    """INSERT INTO invoices (id, order_id, number, status, buyer_name, buyer_tax_code, buyer_address, created_at, updated_at)
                       VALUES (?, ?, NULL, 'requested', ?, ?, ?, ?, ?)""",
                    (str(uuid.uuid4()), order_id, payload.customer.name, payload.customer.tax_code, payload.customer.address, now_iso, now_iso),
                )

            # 4. Neu gia = 0: Tu dong hoan tat, ghi nhan payment free va cap key
            if amount_vnd == 0:
                payment_id = str(uuid.uuid4())
                conn.execute(
                    """INSERT INTO payments (id, order_id, provider, provider_ref, amount_vnd, currency, status, paid_at, created_at, updated_at)
                       VALUES (?, ?, 'free', ?, 0, 'VND', 'succeeded', ?, ?, ?)""",
                    (payment_id, order_id, f"free_{order_code}", now_iso, now_iso, now_iso),
                )

                ok, keys, msg = fulfill_order_idempotent(
                    conn=conn,
                    order_id=order_id,
                    secret_for_email_enc=cfg.install_token_secret,
                    email_service=email_service,
                )

                conn.commit()

                return JSONResponse(
                    status_code=200,
                    content={
                        "order_code": order_code,
                        "amount_vnd": 0,
                        "status": "fulfilled",
                        "message": "Đơn hàng miễn phí đã được hoàn tất và cấp mã bản quyền",
                        "keys": keys,
                        "payment": {
                            "method": "free",
                            "status": "succeeded",
                            "amount_vnd": 0,
                        },
                    },
                )

            # 5. Neu gia > 0: Sinh thong tin chuyen khoan VietQR
            order_dict = {
                "id": order_id,
                "code": order_code,
                "amount_vnd": amount_vnd,
                "expires_at": expires_at,
            }
            bank_adapter = PAYMENT_ADAPTERS["bank_transfer"]
            instruction = bank_adapter.create_payment(order_dict)

            # Ghi payment pending
            conn.execute(
                """INSERT INTO payments (id, order_id, provider, provider_ref, amount_vnd, currency, status, created_at, updated_at)
                   VALUES (?, ?, 'bank_transfer', ?, ?, 'VND', 'pending', ?, ?)""",
                (str(uuid.uuid4()), order_id, order_code, amount_vnd, now_iso, now_iso),
            )

            # Xep email xac nhan don hang vao outbox
            email_service.queue_email(
                conn=conn,
                to_email=payload.customer.email,
                template="order_confirmation",
                data={
                    "order_code": order_code,
                    "plan_name": plan["name"],
                    "quantity": payload.quantity,
                    "amount_vnd": amount_vnd,
                    "transfer_content": instruction.transfer_content,
                    "bank_name": instruction.bank_name,
                    "bank_account": instruction.bank_account,
                    "account_holder": instruction.account_holder,
                    "expires_at": expires_at,
                },
                encryption_secret=cfg.install_token_secret,
            )

            conn.commit()

            return JSONResponse(
                status_code=200,
                content={
                    "order_code": order_code,
                    "amount_vnd": amount_vnd,
                    "status": "pending_payment",
                    "payment": {
                        "method": "bank_transfer",
                        "qr_url": instruction.qr_url,
                        "transfer_content": instruction.transfer_content,
                        "bank_account": instruction.bank_account,
                        "bank_name": instruction.bank_name,
                        "account_holder": instruction.account_holder,
                        "expires_at": expires_at,
                    },
                },
            )

    @router.get("/api/v1/shop/orders/{code}")
    async def get_shop_order_status(code: str) -> dict[str, Any]:
        """Kiem tra trang thai don hang bang ma don (Web hoi lai moi 3-5s)."""
        clean_code = code.strip().upper()
        with get_db() as conn:
            row = conn.execute(
                """SELECT o.code, o.amount_vnd, o.status, o.quantity, o.created_at, p.name AS plan_name,
                          (SELECT paid_at FROM payments pm WHERE pm.order_id = o.id AND pm.status = 'succeeded' LIMIT 1) AS paid_at
                   FROM orders o
                   JOIN plans p ON o.plan_id = p.id
                   WHERE o.code = ?""",
                (clean_code,),
            ).fetchone()

            if not row:
                raise HTTPException(status_code=404, detail={"error": "order_not_found", "message": "Không tìm thấy đơn hàng"})

            key_hints = []
            if row["status"] == "fulfilled":
                key_hints = [
                    k["key_hint"] for k in conn.execute(
                        "SELECT key_hint FROM license_keys lk JOIN orders o ON lk.order_id = o.id WHERE o.code = ?",
                        (clean_code,),
                    ).fetchall()
                ]

        return {
            "order_code": row["code"],
            "status": row["status"],
            "amount_vnd": row["amount_vnd"],
            "quantity": row["quantity"],
            "plan_name": row["plan_name"],
            "paid_at": row["paid_at"],
            "created_at": row["created_at"],
            "key_hints": key_hints,
        }

    # ----------------------------------------------------
    # 2. WEBHOOK & THANH TOAN
    # ----------------------------------------------------

    @router.post("/api/v1/payments/webhook/{provider}")
    async def payment_webhook(provider: str, request: Request) -> Response:
        """Nhan webhook tu nha cung cap thanh toan, kiem chu ky, doi soat va cap key tu dong."""
        adapter = PAYMENT_ADAPTERS.get(provider)
        if not adapter:
            raise HTTPException(status_code=404, detail={"error": "provider_not_found", "message": "Nhà cung cấp không tồn tại"})

        peer = get_real_client_ip(request)
        if not limiter.allow(f"wh_{provider}:{peer}", 60, cfg.rate_window_seconds):
            return JSONResponse(status_code=429, content={"error": "rate_limited", "message": "Tần suất gửi webhook quá cao"})

        raw_body = await request.body()
        headers_dict = {k.lower(): v for k, v in request.headers.items()}
        res = adapter.verify_webhook(raw_body, headers_dict)

        now_iso = now_utc_iso()

        with get_db() as conn:
            # 1. Kiem tra tinh hop le cua chu ky
            if not res.is_valid:
                logger.warning("webhook invalid signature from %s provider=%s err=%s", peer, provider, res.error_message)
                if res.event_id:
                    conn.execute(
                        """INSERT OR IGNORE INTO payment_events (id, provider, event_id, received_at, signature_ok, payload_json, result)
                           VALUES (?, ?, ?, ?, 0, ?, ?)""",
                        (str(uuid.uuid4()), provider, res.event_id, now_iso, json.dumps(res.raw_payload, ensure_ascii=False), "invalid_signature"),
                    )
                    conn.commit()
                return JSONResponse(status_code=400, content={"error": "invalid_signature", "message": res.error_message or "Chữ ký webhook không hợp lệ"})

            event_id = res.event_id
            # 2. Chống Replay: Kiểm tra xem event_id đã từng được xử lý chưa
            existing_event = conn.execute(
                "SELECT id, result FROM payment_events WHERE provider = ? AND event_id = ?",
                (provider, event_id),
            ).fetchone()

            if existing_event:
                logger.info("webhook duplicate event_id=%s provider=%s -> skipped (idempotent)", event_id, provider)
                return JSONResponse(status_code=200, content={"ok": True, "duplicate": True, "message": "Sự kiện đã được xử lý"})

            # Ghi nhận event mới
            event_row_id = str(uuid.uuid4())
            conn.execute(
                """INSERT INTO payment_events (id, provider, event_id, received_at, signature_ok, payload_json, result)
                   VALUES (?, ?, ?, ?, 1, ?, 'processing')""",
                (event_row_id, provider, event_id, now_iso, json.dumps(res.raw_payload, ensure_ascii=False)),
            )

            # 3. Đối soát: Khớp mã đơn hàng trong nội dung chuyển khoản
            order = None
            if res.order_code:
                order = conn.execute(
                    "SELECT id, code, amount_vnd, status, expires_at FROM orders WHERE code = ?",
                    (res.order_code,),
                ).fetchone()

            if not order:
                # Không tìm thấy đơn hàng tương ứng -> đưa vào hàng đợi "Giao dịch chưa khớp"
                logger.warning("webhook unmatched transaction event_id=%s order_code=%s amount=%s", event_id, res.order_code, res.amount_vnd)
                conn.execute(
                    """INSERT OR IGNORE INTO payments (id, order_id, provider, provider_ref, amount_vnd, currency, status, raw_event_id, paid_at, created_at, updated_at)
                       VALUES (?, NULL, ?, ?, ?, 'VND', 'unmatched', ?, ?, ?, ?)""",
                    (str(uuid.uuid4()), provider, f"unmatched_{event_id}", res.amount_vnd, event_id, now_iso, now_iso, now_iso),
                )
                conn.execute(
                    "UPDATE payment_events SET processed_at = ?, result = 'unmatched_order' WHERE id = ?",
                    (now_iso, event_row_id),
                )
                conn.commit()
                return JSONResponse(status_code=200, content={"ok": True, "result": "unmatched_order", "message": "Giao dịch chưa khớp mã đơn hàng"})

            # Kiểm tra đơn đã hết hạn chưa
            if order["expires_at"]:
                try:
                    exp_dt = datetime.fromisoformat(order["expires_at"].replace("Z", "+00:00"))
                    if datetime.now(timezone.utc) > exp_dt and order["status"] == "pending_payment":
                        conn.execute("UPDATE orders SET status = 'expired', updated_at = ? WHERE id = ?", (now_iso, order["id"]))
                        conn.execute("UPDATE payment_events SET processed_at = ?, result = 'order_expired' WHERE id = ?", (now_iso, event_row_id))
                        conn.commit()
                        return JSONResponse(status_code=200, content={"ok": True, "result": "order_expired", "message": "Đơn hàng đã hết hạn"})
                except Exception:
                    pass

            # Kiểm tra số tiền chuyển
            if res.amount_vnd < order["amount_vnd"]:
                # Thiếu tiền: không cấp key, cập nhật note cảnh báo
                logger.warning("webhook underpaid order=%s expected=%s got=%s", order["code"], order["amount_vnd"], res.amount_vnd)
                conn.execute(
                    """UPDATE orders SET note = ?, updated_at = ? WHERE id = ?""",
                    (f"Cảnh báo: Khách chuyển thiếu tiền ({res.amount_vnd}/{order['amount_vnd']} VND)", now_iso, order["id"]),
                )
                conn.execute(
                    "UPDATE payment_events SET processed_at = ?, result = 'underpaid' WHERE id = ?",
                    (now_iso, event_row_id),
                )
                conn.commit()
                return JSONResponse(status_code=200, content={"ok": True, "result": "underpaid", "message": "Số tiền chuyển nhỏ hơn giá trị đơn hàng"})

            # Số tiền đủ hoặc dư: Ghi nhận thanh toán thành công
            conn.execute(
                """INSERT OR REPLACE INTO payments (id, order_id, provider, provider_ref, amount_vnd, currency, status, raw_event_id, paid_at, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, 'VND', 'succeeded', ?, ?, ?, ?)""",
                (str(uuid.uuid4()), order["id"], provider, event_id, res.amount_vnd, event_id, now_iso, now_iso, now_iso),
            )

            # Cấp key tự động Idempotent trong cùng giao dịch
            ok, keys, msg = fulfill_order_idempotent(
                conn=conn,
                order_id=order["id"],
                secret_for_email_enc=cfg.install_token_secret,
                email_service=email_service,
            )

            conn.execute(
                "UPDATE payment_events SET processed_at = ?, result = 'fulfilled' WHERE id = ?",
                (now_iso, event_row_id),
            )
            conn.commit()

        return JSONResponse(status_code=200, content={"ok": True, "result": "fulfilled", "message": msg})

    # ----------------------------------------------------
    # 3. TRANG THAI BAN QUYEN CHO UNG DUNG (/license/status)
    # ----------------------------------------------------

    @router.get("/api/v1/license/status")
    async def get_license_status(
        key: str | None = None,
        token: str | None = None,
        src: str = "app",
        platform: str = "windows",
        version: str = "",
    ) -> dict[str, Any]:
        """API cho ung dung hoi trang thai: key con hieu luc? thu hoi? so may? co ban cap nhat hop le?"""
        if not key and not token:
            raise HTTPException(status_code=400, detail={"error": "missing_param", "message": "Cần cung cấp mã key hoặc token bản quyền"})

        license_id = None
        key_status = "unknown"
        seats_used = 0
        seats_max = 2
        key_hint = ""
        platforms = "windows"

        with get_db() as conn:
            if key:
                canonical = lic_mod.normalize_and_validate_key(key)
                if not canonical:
                    return {"valid": False, "status": "invalid_key", "message": "Mã bản quyền sai định dạng"}
                khash = lic_mod.hash_key(canonical)
                row = conn.execute(
                    "SELECT id, status, seats_max, key_hint, platforms FROM license_keys WHERE key_hash = ?",
                    (khash,),
                ).fetchone()
                if row:
                    license_id = row["id"]
                    key_status = row["status"]
                    seats_max = row["seats_max"]
                    key_hint = row["key_hint"]
                    platforms = row["platforms"]
            elif token and public_key:
                claims = lic_mod.verify_license_token(token, public_key)
                if claims:
                    license_id = claims.get("lid")
                    row = conn.execute(
                        "SELECT status, seats_max, key_hint, platforms FROM license_keys WHERE id = ?",
                        (license_id,),
                    ).fetchone()
                    if row:
                        key_status = row["status"]
                        seats_max = row["seats_max"]
                        key_hint = row["key_hint"]
                        platforms = row["platforms"]

            if not license_id:
                return {"valid": False, "status": "unknown_key", "message": "Không tìm thấy mã bản quyền trên hệ thống"}

            seats_used = conn.execute(
                "SELECT COUNT(*) FROM activations WHERE license_id = ? AND removed_at IS NULL",
                (license_id,),
            ).fetchone()[0]

            # Kiem tra ban cap nhat moi nhat
            latest_version = ""
            if cfg.updates_dir.is_dir():
                ptr_path = cfg.updates_dir / "channels" / "pilot.json"
                if ptr_path.is_file():
                    try:
                        pdata = json.loads(ptr_path.read_text(encoding="utf-8"))
                        latest_version = pdata.get("version", "")
                    except Exception:
                        pass

        is_valid = (key_status == "active")
        has_update = bool(latest_version and version and latest_version != version)

        return {
            "valid": is_valid,
            "status": key_status,
            "key_hint": f"…{key_hint}",
            "edition": "perpetual",
            "seats_used": seats_used,
            "seats_max": seats_max,
            "platforms": platforms,
            "has_update": has_update,
            "latest_version": latest_version,
            "updates_until": None,
        }

    # ----------------------------------------------------
    # 4. CONG KHACH HANG (/api/v1/portal/*)
    # ----------------------------------------------------

    @router.post("/api/v1/portal/login")
    async def portal_request_login_code(request: Request, payload: PortalLoginRequest) -> dict[str, Any]:
        """Gui ma 6 so qua email de dang nhap cong khach hang."""
        peer = get_real_client_ip(request)
        if not limiter.allow(f"port_login_ip:{peer}", 10, cfg.rate_window_seconds):
            raise HTTPException(status_code=429, detail={"error": "rate_limited", "message": "Quá nhiều yêu cầu đăng nhập từ IP này"})

        code_6 = f"{secrets.randbelow(1000000):06d}"
        code_hash = hashlib.sha256(code_6.encode("utf-8")).hexdigest()
        now_ts = int(time.time())
        exp_ts = now_ts + 15 * 60  # 15 phut

        with get_db() as conn:
            # Xoa ma cu cua email nay neu co
            conn.execute("DELETE FROM login_codes WHERE email = ?", (payload.email,))
            conn.execute(
                """INSERT INTO login_codes (id, email, code_hash, expires_at, attempts, created_at)
                   VALUES (?, ?, ?, ?, 0, ?)""",
                (str(uuid.uuid4()), payload.email, code_hash, exp_ts, now_utc_iso()),
            )

            # Đảm bảo khách hàng có bản ghi trong bảng customers
            cust = conn.execute("SELECT id FROM customers WHERE email = ?", (payload.email,)).fetchone()
            if not cust:
                conn.execute(
                    """INSERT INTO customers (id, email, full_name, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?)""",
                    (str(uuid.uuid4()), payload.email, payload.email.split("@")[0], now_utc_iso(), now_utc_iso()),
                )

            # Xếp email mã xác thực vào outbox
            email_service.queue_email(
                conn=conn,
                to_email=payload.email,
                template="portal_login_code",
                data={"code": code_6, "expires_minutes": 15},
                encryption_secret=cfg.install_token_secret,
            )
            conn.commit()

        return {"ok": True, "message": "Mã xác thực 6 số đã được gửi tới email của Quý khách"}

    @router.post("/api/v1/portal/verify")
    async def portal_verify_code(request: Request, payload: PortalVerifyRequest) -> Response:
        """Kiem tra ma 6 so va tao phien dang nhap cong khach hang."""
        now_ts = int(time.time())
        with get_db() as conn:
            row = conn.execute(
                "SELECT id, code_hash, expires_at, attempts FROM login_codes WHERE email = ?",
                (payload.email,),
            ).fetchone()

            if not row or row["expires_at"] < now_ts:
                return JSONResponse(
                    status_code=400,
                    content={"error": "code_expired", "message": "Mã xác thực đã hết hạn hoặc không tồn tại. Vui lòng lấy mã mới"},
                )

            if row["attempts"] >= 5:
                conn.execute("DELETE FROM login_codes WHERE id = ?", (row["id"],))
                conn.commit()
                return JSONResponse(
                    status_code=400,
                    content={"error": "max_attempts", "message": "Đã nhập sai quá 5 lần. Mã xác thực đã bị hủy"},
                )

            # Kiem tra ma
            input_hash = hashlib.sha256(payload.code.strip().encode("utf-8")).hexdigest()
            if not hmac.compare_digest(input_hash, row["code_hash"]):
                conn.execute("UPDATE login_codes SET attempts = attempts + 1 WHERE id = ?", (row["id"],))
                conn.commit()
                left = 5 - (row["attempts"] + 1)
                return JSONResponse(
                    status_code=400,
                    content={"error": "invalid_code", "message": "Mã xác thực không chính xác", "attempts_left": max(0, left)},
                )

            # Dung ma -> Xoa ma va tao phien
            conn.execute("DELETE FROM login_codes WHERE id = ?", (row["id"],))

            cust = conn.execute("SELECT id FROM customers WHERE email = ?", (payload.email,)).fetchone()
            customer_id = cust["id"] if cust else str(uuid.uuid4())

            session_id = secrets.token_urlsafe(32)
            exp_session = now_ts + 1800  # 30 phut

            conn.execute(
                """INSERT INTO portal_sessions (session_id, customer_id, email, expires_at, created_at, last_active_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (session_id, customer_id, payload.email, exp_session, now_utc_iso(), now_ts),
            )
            conn.commit()

        resp = JSONResponse(
            status_code=200,
            content={"ok": True, "email": payload.email, "session_id": session_id, "expires_in": 1800},
        )
        resp.set_cookie(
            key="portal_session_id",
            value=session_id,
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=1800,
            path="/",
        )
        return resp

    @router.post("/api/v1/portal/logout")
    async def portal_logout(request: Request) -> Response:
        session_id = request.cookies.get("portal_session_id")
        if session_id:
            with get_db() as conn:
                conn.execute("DELETE FROM portal_sessions WHERE session_id = ?", (session_id,))
                conn.commit()
        resp = JSONResponse(status_code=200, content={"ok": True, "message": "Đã đăng xuất"})
        resp.delete_cookie(key="portal_session_id", path="/")
        return resp

    @router.get("/api/v1/portal/me")
    async def portal_me(request: Request) -> dict[str, Any]:
        cust = get_customer_from_portal_session(request)
        return {
            "email": cust["email"],
            "full_name": cust["full_name"],
            "phone": cust["phone"],
            "company_name": cust["company_name"],
            "tax_code": cust["tax_code"],
            "address": cust["address"],
        }

    @router.get("/api/v1/portal/orders")
    async def portal_orders(request: Request) -> dict[str, Any]:
        cust = get_customer_from_portal_session(request)
        with get_db() as conn:
            rows = conn.execute(
                """SELECT o.id, o.code, o.amount_vnd, o.status, o.quantity, o.created_at, p.name AS plan_name,
                          (SELECT COUNT(*) FROM license_keys lk WHERE lk.order_id = o.id) AS keys_count
                   FROM orders o
                   JOIN plans p ON o.plan_id = p.id
                   WHERE o.customer_id = ?
                   ORDER BY o.created_at DESC""",
                (cust["customer_id"],),
            ).fetchall()
        return {"orders": [dict(r) for r in rows]}

    @router.get("/api/v1/portal/licenses")
    async def portal_licenses(request: Request) -> dict[str, Any]:
        cust = get_customer_from_portal_session(request)
        with get_db() as conn:
            rows = conn.execute(
                """SELECT k.id, k.key_hint, k.seats_max, k.status, k.created_at, k.platforms,
                          (SELECT COUNT(*) FROM activations a WHERE a.license_id = k.id AND a.removed_at IS NULL) AS seats_used
                   FROM license_keys k
                   WHERE k.customer_id = ? OR k.email = ?
                   ORDER BY k.created_at DESC""",
                (cust["customer_id"], cust["email"]),
            ).fetchall()
        return {"licenses": [dict(r) for r in rows]}

    @router.get("/api/v1/portal/devices")
    async def portal_devices(request: Request) -> dict[str, Any]:
        cust = get_customer_from_portal_session(request)
        with get_db() as conn:
            rows = conn.execute(
                """SELECT a.id, a.license_id, a.device_name, a.first_at, a.last_check_at, a.app_version, a.platform,
                          k.key_hint
                   FROM activations a
                   JOIN license_keys k ON a.license_id = k.id
                   WHERE (k.customer_id = ? OR k.email = ?) AND a.removed_at IS NULL
                   ORDER BY a.first_at DESC""",
                (cust["customer_id"], cust["email"]),
            ).fetchall()
        return {"devices": [dict(r) for r in rows]}

    @router.post("/api/v1/portal/devices/{device_id}/remove")
    async def portal_remove_device(device_id: str, request: Request) -> dict[str, Any]:
        cust = get_customer_from_portal_session(request)
        now_iso = now_utc_iso()
        with get_db() as conn:
            act = conn.execute(
                """SELECT a.id, a.license_id, k.key_hint FROM activations a
                   JOIN license_keys k ON a.license_id = k.id
                   WHERE a.id = ? AND (k.customer_id = ? OR k.email = ?) AND a.removed_at IS NULL""",
                (device_id, cust["customer_id"], cust["email"]),
            ).fetchone()

            if not act:
                raise HTTPException(status_code=404, detail={"error": "device_not_found", "message": "Không tìm thấy thiết bị hoặc đã bị gỡ"})

            conn.execute("UPDATE activations SET removed_at = ? WHERE id = ?", (now_iso, device_id))
            conn.commit()

        return {"ok": True, "message": "Đã gỡ thiết bị khỏi mã bản quyền thành công"}

    @router.post("/api/v1/portal/licenses/{license_id}/reissue")
    async def portal_reissue_key(license_id: str, request: Request) -> dict[str, Any]:
        """Cap lai key cho khach hang: thu hoi key cu, tao key moi, gui email."""
        cust = get_customer_from_portal_session(request)
        now_iso = now_utc_iso()

        with get_db() as conn:
            old_key = conn.execute(
                """SELECT id, key_hint, email, note, seats_max, order_id, customer_id, plan_id, platforms, status
                   FROM license_keys WHERE id = ? AND (customer_id = ? OR email = ?)""",
                (license_id, cust["customer_id"], cust["email"]),
            ).fetchone()

            if not old_key:
                raise HTTPException(status_code=404, detail={"error": "license_not_found", "message": "Không tìm thấy mã bản quyền"})

            if old_key["status"] == "revoked":
                raise HTTPException(status_code=400, detail={"error": "already_revoked", "message": "Mã bản quyền này đã bị thu hồi trước đó"})

            # Thu hoi key cu
            conn.execute("UPDATE license_keys SET status = 'revoked', revoked_at = ? WHERE id = ?", (now_iso, license_id))

            # Sinh key moi
            raw_new_key = lic_mod.generate_license_key()
            norm = lic_mod.normalize_and_validate_key(raw_new_key)
            if not norm:
                raise HTTPException(status_code=500, detail={"error": "generation_failed", "message": "Lỗi sinh mã bản quyền mới"})

            khash = lic_mod.hash_key(norm)
            khint = lic_mod.extract_hint(norm)
            new_id = str(uuid.uuid4())

            conn.execute(
                """INSERT INTO license_keys (id, key_hash, key_hint, note, email, seats_max, status, created_at,
                                             order_id, customer_id, source, plan_id, platforms)
                   VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, 'portal_reissue', ?, ?)""",
                (new_id, khash, khint, f"Cấp lại từ mã {old_key['key_hint']}", old_key["email"],
                 old_key["seats_max"], now_iso, old_key["order_id"], old_key["customer_id"],
                 old_key["plan_id"], old_key["platforms"]),
            )

            # Xếp email gửi mã mới
            email_service.queue_email(
                conn=conn,
                to_email=old_key["email"],
                template="license_reissued",
                data={"old_hint": old_key["key_hint"], "new_hint": khint},
                raw_keys=[norm],
                encryption_secret=cfg.install_token_secret,
            )
            conn.commit()

        return {
            "ok": True,
            "old_hint": old_key["key_hint"],
            "new_hint": khint,
            "new_key": norm,
            "message": "Đã cấp lại mã bản quyền mới thành công và gửi thông tin về email của Quý khách",
        }

    @router.post("/api/v1/portal/offline-activation")
    async def portal_offline_activate(request: Request, payload: PortalOfflineActivateRequest) -> dict[str, Any]:
        """Kich hoat ngoai tuyen tu cong khach hang bang ma key + ma thiet bi."""
        if signing_key is None:
            raise HTTPException(status_code=503, detail={"error": "not_configured", "message": "Máy chủ chưa cấu hình khóa ký"})

        canonical = lic_mod.normalize_and_validate_key(payload.key)
        if not canonical:
            raise HTTPException(status_code=400, detail={"error": "invalid_key", "message": "Mã bản quyền không đúng định dạng"})

        khash = lic_mod.hash_key(canonical)
        device_fp = hashlib.sha256(payload.device_code.encode("utf-8")).hexdigest()
        device_hash = hashlib.sha256(device_fp.encode("utf-8")).hexdigest()
        device_name = payload.device_name or f"Ngoại tuyến ({payload.device_code[:8]})"
        now_iso = now_utc_iso()

        with get_db() as conn:
            krow = conn.execute(
                "SELECT id, key_hint, seats_max, status FROM license_keys WHERE key_hash = ?",
                (khash,),
            ).fetchone()

            if not krow:
                raise HTTPException(status_code=404, detail={"error": "unknown_key", "message": "Mã bản quyền không tồn tại"})

            if krow["status"] == "revoked":
                raise HTTPException(status_code=403, detail={"error": "revoked", "message": "Mã bản quyền này đã bị thu hồi"})

            license_id = krow["id"]
            key_hint = krow["key_hint"]
            seats_max = krow["seats_max"]

            # Kiểm tra số lượng máy
            act = conn.execute(
                "SELECT id, removed_at FROM activations WHERE license_id = ? AND device_hash = ?",
                (license_id, device_hash),
            ).fetchone()

            if act and act["removed_at"] is None:
                conn.execute("UPDATE activations SET last_check_at = ? WHERE id = ?", (now_iso, act["id"]))
            else:
                active_count = conn.execute(
                    "SELECT COUNT(*) FROM activations WHERE license_id = ? AND removed_at IS NULL",
                    (license_id,),
                ).fetchone()[0]

                if active_count >= seats_max:
                    raise HTTPException(status_code=409, detail={"error": "seats_exhausted", "message": "Mã bản quyền đã hết số máy cho phép"})

                if act and act["removed_at"] is not None:
                    conn.execute("UPDATE activations SET removed_at = NULL, last_check_at = ? WHERE id = ?", (now_iso, act["id"]))
                else:
                    conn.execute(
                        """INSERT INTO activations (id, license_id, device_hash, device_name, first_at, last_check_at, app_version, removed_at)
                           VALUES (?, ?, ?, ?, ?, ?, 'offline', NULL)""",
                        (str(uuid.uuid4()), license_id, device_hash, device_name, now_iso, now_iso),
                    )

            conn.commit()

        token, _ = lic_mod.issue_license_token(
            signing_key,
            license_id=license_id,
            device_fingerprint=device_fp,
            key_hint=key_hint,
        )

        return {"activation_code": token}

    # ----------------------------------------------------
    # ----------------------------------------------------
    # 5. ADMIN AUTH & CAI DAT (Quan tri vien & 2FA TOTP)
    # ----------------------------------------------------


    @router.post("/api/v1/admin/setup-totp")
    async def admin_setup_totp(request: Request) -> dict[str, Any]:
        """Khoi tao khoa bi mat TOTP cho quan tri vien cai dat ung dung Authenticator."""
        with get_db() as conn:
            admin_info = require_admin(request, session_manager, conn, cfg)
            secret = generate_totp_secret()
            otpauth_url = f"otpauth://totp/3T%20Office%20Cloud:{admin_info['username']}?secret={secret}&issuer=3T%20Office"
        return {"secret": secret, "otpauth_url": otpauth_url}

    @router.post("/api/v1/admin/verify-totp")
    async def admin_verify_totp_setup(request: Request, payload: AdminSetupTotpVerifyRequest) -> dict[str, Any]:
        """Kiem tra ma xac thuc lan dau va luu khoa TOTP vao CSDL."""
        with get_db() as conn:
            admin_info = require_admin(request, session_manager, conn, cfg)
            if not verify_totp(payload.secret, payload.totp_code):
                raise HTTPException(status_code=400, detail={"error": "invalid_totp", "message": "Mã xác thực TOTP không chính xác"})

            # Luu vao bang admin_users
            now_iso = now_utc_iso()
            user_row = conn.execute("SELECT id FROM admin_users WHERE username = ?", (admin_info["username"],)).fetchone()
            if user_row:
                conn.execute(
                    "UPDATE admin_users SET totp_secret_enc = ?, updated_at = ? WHERE id = ?",
                    (payload.secret, now_iso, user_row["id"]),
                )
            else:
                # Tao user trong CSDL neu truoc do dang dung env fallback
                conn.execute(
                    """INSERT INTO admin_users (id, username, password_hash, role, totp_secret_enc, active, created_at, updated_at)
                       VALUES (?, ?, ?, 'owner', ?, 1, ?, ?)""",
                    (str(uuid.uuid4()), admin_info["username"], hash_password(cfg.admin_password), payload.secret, now_iso, now_iso),
                )
            conn.commit()

        return {"ok": True, "message": "Đã thiết lập xác thực 2FA TOTP thành công"}

    @router.post("/api/v1/admin/change-password")
    async def admin_change_password(request: Request, payload: AdminChangePasswordRequest) -> dict[str, Any]:
        """Doi mat khau quan tri vien (ho tro buoc doi mat khau lan dau)."""
        with get_db() as conn:
            admin_info = require_admin(request, session_manager, conn, cfg)
            user = conn.execute(
                "SELECT id, password_hash FROM admin_users WHERE username = ?", (admin_info["username"],)
            ).fetchone()

            if user:
                if not verify_password(payload.old_password, user["password_hash"]):
                    raise HTTPException(status_code=400, detail={"error": "wrong_password", "message": "Mật khẩu cũ không chính xác"})
            else:
                if not hmac.compare_digest(payload.old_password.encode("utf-8"), cfg.admin_password.encode("utf-8")):
                    raise HTTPException(status_code=400, detail={"error": "wrong_password", "message": "Mật khẩu cũ không chính xác"})

            new_hash = hash_password(payload.new_password)
            now_iso = now_utc_iso()

            if user:
                conn.execute(
                    "UPDATE admin_users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?",
                    (new_hash, now_iso, user["id"]),
                )
            else:
                conn.execute(
                    """INSERT INTO admin_users (id, username, password_hash, role, active, must_change_password, created_at, updated_at)
                       VALUES (?, ?, ?, ?, 1, 0, ?, ?)""",
                    (str(uuid.uuid4()), admin_info["username"], new_hash, admin_info["role"], now_iso, now_iso),
                )
            conn.commit()

        return {"ok": True, "message": "Đã đổi mật khẩu thành công"}

    @router.get("/api/v1/admin/users")
    async def admin_list_users(request: Request) -> dict[str, Any]:
        """Danh sach tai khoan quan tri (chi owner)."""
        with get_db() as conn:
            require_admin(request, session_manager, conn, cfg, required_role="owner")
            rows = conn.execute(
                """SELECT id, username, role, active, must_change_password, last_login_at, created_at,
                          CASE WHEN totp_secret_enc IS NOT NULL AND totp_secret_enc != '' THEN 1 ELSE 0 END AS has_totp
                   FROM admin_users ORDER BY created_at ASC"""
            ).fetchall()
        return {"users": [dict(r) for r in rows]}

    @router.post("/api/v1/admin/users")
    async def admin_create_user(request: Request, payload: AdminCreateUserRequest) -> dict[str, Any]:
        """Tao tai khoan quan tri vien moi (chi owner)."""
        with get_db() as conn:
            admin_info = require_admin(request, session_manager, conn, cfg, required_role="owner")
            exists = conn.execute("SELECT 1 FROM admin_users WHERE username = ?", (payload.username,)).fetchone()
            if exists:
                raise HTTPException(status_code=400, detail={"error": "user_exists", "message": "Tên đăng nhập đã tồn tại"})

            p_hash = hash_password(payload.password)
            now_iso = now_utc_iso()
            user_id = str(uuid.uuid4())

            conn.execute(
                """INSERT INTO admin_users (id, username, password_hash, role, active, must_change_password, created_at, updated_at)
                   VALUES (?, ?, ?, ?, 1, 1, ?, ?)""",
                (user_id, payload.username, p_hash, payload.role, now_iso, now_iso),
            )
            conn.commit()

        return {"ok": True, "user_id": user_id, "username": payload.username, "role": payload.role}

    # ----------------------------------------------------
    # 6. ADMIN COMMERCE (Don hang, Doi soat, Khach, Hoa don)
    # ----------------------------------------------------

    @router.get("/api/v1/admin/orders")
    async def admin_list_orders(
        request: Request,
        status: str = "all",
        q: str = "",
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        """Danh sach don hang kem bo loc va phan trang."""
        with get_db() as conn:
            require_admin(request, session_manager, conn, cfg)
            page = max(1, page)
            page_size = min(max(1, page_size), 100)
            offset = (page - 1) * page_size

            where = []
            params: list[Any] = []

            if status != "all":
                where.append("o.status = ?")
                params.append(status)

            if q.strip():
                where.append("(o.code LIKE ? OR c.email LIKE ? OR c.full_name LIKE ?)")
                term = f"%{q.strip()}%"
                params.extend([term, term, term])

            where_str = ("WHERE " + " AND ".join(where)) if where else ""

            total = conn.execute(f"SELECT COUNT(*) FROM orders o JOIN customers c ON o.customer_id = c.id {where_str}", params).fetchone()[0]

            rows = conn.execute(
                f"""SELECT o.id, o.code, o.amount_vnd, o.status, o.quantity, o.created_at, o.source,
                           c.email AS customer_email, c.full_name AS customer_name, p.name AS plan_name,
                           (SELECT COUNT(*) FROM license_keys lk WHERE lk.order_id = o.id) AS keys_count
                    FROM orders o
                    JOIN customers c ON o.customer_id = c.id
                    JOIN plans p ON o.plan_id = p.id
                    {where_str}
                    ORDER BY o.created_at DESC
                    LIMIT ? OFFSET ?""",
                params + [page_size, offset],
            ).fetchall()

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "orders": [dict(r) for r in rows],
        }

    @router.get("/api/v1/admin/orders/{order_id}")
    async def admin_get_order_detail(order_id: str, request: Request) -> dict[str, Any]:
        """Chi tiet mot don hang: dong thoi gian, thanh toan, key da cap, hoa don, email da gui."""
        with get_db() as conn:
            require_admin(request, session_manager, conn, cfg)
            order = conn.execute(
                """SELECT o.*, c.email, c.full_name, c.phone, c.company_name, c.tax_code, c.address, p.name AS plan_name
                   FROM orders o
                   JOIN customers c ON o.customer_id = c.id
                   JOIN plans p ON o.plan_id = p.id
                   WHERE o.id = ? OR o.code = ?""",
                (order_id, order_id),
            ).fetchone()

            if not order:
                raise HTTPException(status_code=404, detail={"error": "order_not_found", "message": "Không tìm thấy đơn hàng"})

            oid = order["id"]
            payments = conn.execute("SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC", (oid,)).fetchall()
            keys = conn.execute(
                """SELECT id, key_hint, seats_max, status, created_at, revoked_at,
                          (SELECT COUNT(*) FROM activations a WHERE a.license_id = k.id AND a.removed_at IS NULL) AS seats_used
                   FROM license_keys k WHERE order_id = ?""",
                (oid,),
            ).fetchall()
            invoices = conn.execute("SELECT * FROM invoices WHERE order_id = ?", (oid,)).fetchall()
            emails = conn.execute("SELECT id, template, to_email, status, created_at, sent_at FROM email_outbox WHERE payload_json LIKE ? ORDER BY created_at DESC", (f"%{order['code']}%",)).fetchall()

        return {
            "order": dict(order),
            "payments": [dict(p) for p in payments],
            "keys": [dict(k) for k in keys],
            "invoices": [dict(i) for i in invoices],
            "emails": [dict(e) for e in emails],
        }

    @router.post("/api/v1/admin/orders/{order_id}/mark-paid")
    async def admin_mark_order_paid(order_id: str, request: Request) -> dict[str, Any]:
        """Danh dau don hang da thu tien (bat buoc quyen OWNER)."""
        peer = get_real_client_ip(request)
        with get_db() as conn:
            admin_info = require_admin(request, session_manager, conn, cfg, required_role="owner")
            order = conn.execute("SELECT id, code, amount_vnd, status FROM orders WHERE id = ?", (order_id,)).fetchone()
            if not order:
                raise HTTPException(status_code=404, detail={"error": "order_not_found", "message": "Không tìm thấy đơn hàng"})

            now_iso = now_utc_iso()
            # Ghi payment thu cong
            conn.execute(
                """INSERT OR REPLACE INTO payments (id, order_id, provider, provider_ref, amount_vnd, currency, status, paid_at, reconciled_by, created_at, updated_at)
                   VALUES (?, ?, 'manual', ?, ?, 'VND', 'succeeded', ?, ?, ?, ?)""",
                (str(uuid.uuid4()), order_id, f"manual_{order['code']}", order["amount_vnd"], now_iso, admin_info["username"], now_iso, now_iso),
            )

            # Cap key
            ok, keys, msg = fulfill_order_idempotent(
                conn=conn,
                order_id=order_id,
                secret_for_email_enc=cfg.install_token_secret,
                email_service=email_service,
            )

            conn.execute(
                """INSERT INTO admin_audit (id, at, admin, action, target, ip, user_agent, result)
                   VALUES (?, ?, ?, 'mark_paid', ?, ?, ?, 'success')""",
                (str(uuid.uuid4()), now_iso, admin_info["username"], f"order={order['code']}", peer, request.headers.get("user-agent", "")[:128]),
            )
            conn.commit()

        return {"ok": True, "message": msg, "keys": keys}

    @router.post("/api/v1/admin/orders/{order_id}/refund")
    async def admin_refund_order(order_id: str, request: Request, payload: AdminRefundOrderRequest) -> dict[str, Any]:
        """Hoan tien don hang va thu hoi toan bo ma ban quyen (bat buoc quyen OWNER)."""
        peer = get_real_client_ip(request)
        with get_db() as conn:
            admin_info = require_admin(request, session_manager, conn, cfg, required_role="owner")
            ok, count, msg = revoke_order_keys(
                conn=conn,
                order_id=order_id,
                reason=payload.reason,
                admin_user=admin_info["username"],
                secret_for_email_enc=cfg.install_token_secret,
            )
            if not ok:
                raise HTTPException(status_code=400, detail={"error": "refund_failed", "message": msg})
            conn.commit()

        return {"ok": True, "revoked_count": count, "message": msg}

    @router.get("/api/v1/admin/payments")
    async def admin_list_payments(request: Request, status: str = "all", limit: int = 50) -> dict[str, Any]:
        """Danh sach cac giao dich thanh toan."""
        with get_db() as conn:
            require_admin(request, session_manager, conn, cfg)
            limit = min(max(1, limit), 200)
            where = ""
            params: list[Any] = []
            if status != "all":
                where = "WHERE p.status = ?"
                params.append(status)

            rows = conn.execute(
                f"""SELECT p.*, o.code AS order_code
                    FROM payments p
                    LEFT JOIN orders o ON p.order_id = o.id
                    {where}
                    ORDER BY p.created_at DESC LIMIT ?""",
                params + [limit],
            ).fetchall()
        return {"payments": [dict(r) for r in rows]}

    @router.get("/api/v1/admin/payments/unmatched")
    async def admin_unmatched_payments(request: Request) -> dict[str, Any]:
        """Hang doi cac giao dich chua khop ma don hang."""
        with get_db() as conn:
            require_admin(request, session_manager, conn, cfg)
            rows = conn.execute(
                """SELECT * FROM payments WHERE status = 'unmatched' ORDER BY created_at DESC"""
            ).fetchall()
        return {"unmatched_payments": [dict(r) for r in rows]}

    @router.post("/api/v1/admin/payments/unmatched/{payment_id}/assign")
    async def admin_assign_unmatched_payment(
        payment_id: str,
        request: Request,
        payload: AdminAssignPaymentRequest,
    ) -> dict[str, Any]:
        """Gan mot giao dich chua khop vao don hang bang tay."""
        peer = get_real_client_ip(request)
        with get_db() as conn:
            admin_info = require_admin(request, session_manager, conn, cfg, required_role="owner")
            pmt = conn.execute("SELECT * FROM payments WHERE id = ? AND status = 'unmatched'", (payment_id,)).fetchone()
            if not pmt:
                raise HTTPException(status_code=404, detail={"error": "payment_not_found", "message": "Không tìm thấy giao dịch chưa khớp"})

            order = conn.execute("SELECT id, code, amount_vnd FROM orders WHERE code = ?", (payload.order_code.strip().upper(),)).fetchone()
            if not order:
                raise HTTPException(status_code=404, detail={"error": "order_not_found", "message": "Không tìm thấy mã đơn hàng đích"})

            now_iso = now_utc_iso()
            conn.execute(
                "UPDATE payments SET order_id = ?, status = 'succeeded', reconciled_by = ?, updated_at = ? WHERE id = ?",
                (order["id"], admin_info["username"], now_iso, payment_id),
            )

            # Cap key neu so tien phu hop
            ok, keys, msg = fulfill_order_idempotent(
                conn=conn,
                order_id=order["id"],
                secret_for_email_enc=cfg.install_token_secret,
                email_service=email_service,
            )
            conn.commit()

        return {"ok": True, "message": f"Đã gán giao dịch thành công cho đơn {order['code']}"}

    @router.get("/api/v1/admin/payments/export-csv")
    async def admin_export_payments_csv(request: Request) -> Response:
        """Xuat bao cao doi soat thanh toan dinh dang CSV."""
        with get_db() as conn:
            require_admin(request, session_manager, conn, cfg)
            rows = conn.execute(
                """SELECT p.id, o.code AS order_code, p.provider, p.amount_vnd, p.currency, p.status, p.paid_at, p.reconciled_by
                   FROM payments p LEFT JOIN orders o ON p.order_id = o.id ORDER BY p.created_at DESC"""
            ).fetchall()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Ma don", "Cong thanh toan", "So tien (VND)", "Tien te", "Trang thai", "Ngay thanh toan", "Doi soat boi"])
        for r in rows:
            writer.writerow([r["id"], r["order_code"] or "", r["provider"], r["amount_vnd"], r["currency"], r["status"], r["paid_at"] or "", r["reconciled_by"] or ""])

        csv_data = output.getvalue().encode("utf-8-sig")
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="3t-office-payments.csv"'},
        )

    @router.get("/api/v1/admin/customers")
    async def admin_list_customers(request: Request, q: str = "", limit: int = 50) -> dict[str, Any]:
        """Danh sach ho so khach hang."""
        with get_db() as conn:
            require_admin(request, session_manager, conn, cfg)
            limit = min(max(1, limit), 200)
            where = ""
            params: list[Any] = []
            if q.strip():
                where = "WHERE email LIKE ? OR full_name LIKE ? OR phone LIKE ? OR company_name LIKE ?"
                t = f"%{q.strip()}%"
                params.extend([t, t, t, t])

            rows = conn.execute(
                f"""SELECT c.*,
                           (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS orders_count,
                           (SELECT COUNT(*) FROM license_keys k WHERE k.customer_id = c.id) AS keys_count
                    FROM customers c
                    {where}
                    ORDER BY c.created_at DESC LIMIT ?""",
                params + [limit],
            ).fetchall()
        return {"customers": [dict(r) for r in rows]}

    @router.get("/api/v1/admin/invoices")
    async def admin_list_invoices(request: Request, status: str = "all") -> dict[str, Any]:
        """Danh sach yeu cau hoa don VAT."""
        with get_db() as conn:
            require_admin(request, session_manager, conn, cfg)
            where = ""
            params: list[Any] = []
            if status != "all":
                where = "WHERE i.status = ?"
                params.append(status)

            rows = conn.execute(
                f"""SELECT i.*, o.code AS order_code, o.amount_vnd
                    FROM invoices i
                    JOIN orders o ON i.order_id = o.id
                    {where}
                    ORDER BY i.created_at DESC""",
                params,
            ).fetchall()
        return {"invoices": [dict(r) for r in rows]}

    @router.post("/api/v1/admin/invoices/{invoice_id}/update")
    async def admin_update_invoice(
        invoice_id: str,
        request: Request,
        payload: AdminUpdateInvoiceRequest,
    ) -> dict[str, Any]:
        """Cap nhat trang thai hoa don, so hoa don va duong dan PDF (nhap tay Giai doan A)."""
        now_iso = now_utc_iso()
        with get_db() as conn:
            require_admin(request, session_manager, conn, cfg)
            conn.execute(
                """UPDATE invoices SET status = ?, number = ?, pdf_path = ?, updated_at = ? WHERE id = ?""",
                (payload.status, payload.number or "", payload.pdf_path or "", now_iso, invoice_id),
            )
            conn.commit()
        return {"ok": True, "message": "Đã cập nhật thông tin hóa đơn thành công"}

    @router.get("/api/v1/admin/emails")
    async def admin_list_emails(request: Request, status: str = "all", limit: int = 50) -> dict[str, Any]:
        """Hang doi email outbox."""
        with get_db() as conn:
            require_admin(request, session_manager, conn, cfg)
            limit = min(max(1, limit), 200)
            where = ""
            params: list[Any] = []
            if status != "all":
                where = "WHERE status = ?"
                params.append(status)

            rows = conn.execute(
                f"""SELECT id, to_email, template, status, attempts, last_error, scheduled_at, sent_at, created_at
                    FROM email_outbox {where} ORDER BY created_at DESC LIMIT ?""",
                params + [limit],
            ).fetchall()
        return {"emails": [dict(r) for r in rows]}

    @router.post("/api/v1/admin/emails/{email_id}/retry")
    async def admin_retry_email(email_id: str, request: Request) -> dict[str, Any]:
        """Thu gui lai mot email bi loi hoac dang queued."""
        now_iso = now_utc_iso()
        with get_db() as conn:
            require_admin(request, session_manager, conn, cfg)
            conn.execute(
                "UPDATE email_outbox SET status = 'queued', attempts = 0, last_error = NULL, scheduled_at = ?, updated_at = ? WHERE id = ?",
                (now_iso, now_iso, email_id),
            )
            conn.commit()
        return {"ok": True, "message": "Đã đặt lại trạng thái email thành queued để gửi lại"}

    @router.post("/api/v1/admin/emails/test-send")
    async def admin_test_send_email(request: Request, payload: AdminTestEmailRequest) -> dict[str, Any]:
        """Gui thu mot email kiem tra cau hinh SMTP."""
        with get_db() as conn:
            require_admin(request, session_manager, conn, cfg, required_role="owner")
            if not email_service.is_configured:
                raise HTTPException(status_code=400, detail={"error": "smtp_not_configured", "message": "Máy chủ chưa cấu hình SMTP"})
            try:
                email_service.send_smtp_message(
                    to_email=payload.to_email,
                    subject="Kiểm tra kết nối gửi thư — 3T Office",
                    body_text="Đây là thư kiểm tra kết nối SMTP từ máy chủ 3T Office Cloud. Hệ thống đã cấu hình thành công!",
                )
            except Exception as exc:
                raise HTTPException(status_code=500, detail={"error": "send_failed", "message": f"Gửi thư thất bại: {str(exc)}"})
        return {"ok": True, "message": f"Đã gửi thư kiểm tra thành công tới {payload.to_email}"}

    @router.get("/api/v1/admin/settings")
    async def admin_get_settings(request: Request) -> dict[str, Any]:
        """Lay thong tin cau hinh he thong, cac goi gia va trang thai SMTP."""
        with get_db() as conn:
            require_admin(request, session_manager, conn, cfg)
            plans = conn.execute("SELECT * FROM plans ORDER BY price_vnd ASC").fetchall()

        return {
            "plans": [dict(p) for p in plans],
            "smtp": {
                "configured": email_service.is_configured,
                "host": email_service.smtp_host or "(chưa cấu hình)",
                "port": email_service.smtp_port,
                "from": email_service.smtp_from,
            },
            "system": {
                "product": cfg.product,
                "grace_days": 30,
                "check_days": 30,
                "default_seats": 2,
            },
        }

    @router.post("/api/v1/admin/settings/plans/{plan_id}")
    async def admin_update_plan(plan_id: str, request: Request, payload: AdminUpdatePlanRequest) -> dict[str, Any]:
        """Cap nhat gia ban va cau hinh goi (chi OWNER)."""
        now_iso = now_utc_iso()
        with get_db() as conn:
            require_admin(request, session_manager, conn, cfg, required_role="owner")
            conn.execute(
                """UPDATE plans SET price_vnd = ?, seats_default = ?, platforms = ?, active = ?, updated_at = ?
                   WHERE id = ? OR code = ?""",
                (payload.price_vnd, payload.seats_default, payload.platforms, 1 if payload.active else 0, now_iso, plan_id, plan_id),
            )
            conn.commit()
        return {"ok": True, "message": "Đã cập nhật gói bản quyền thành công"}

    @router.post("/api/v1/admin/releases/rollback")
    async def admin_rollback_release(request: Request, channel: str = "pilot", target_version: str = "") -> dict[str, Any]:
        """Rut lai ban phat hanh (dua con tro kenh ve phien ban truoc)."""
        with get_db() as conn:
            admin_info = require_admin(request, session_manager, conn, cfg, required_role="owner")
            ch_dir = cfg.updates_dir / "channels"
            ch_file = ch_dir / f"{channel}.json"
            if not ch_file.is_file():
                raise HTTPException(status_code=404, detail={"error": "channel_not_found", "message": "Kênh phát hành không tồn tại"})

            # Doc danh sach phien ban kha dung
            available_versions = []
            for d in cfg.updates_dir.iterdir():
                if d.is_dir() and (d / "manifest.json").is_file():
                    available_versions.append(d.name)
            available_versions.sort(reverse=True)

            if not target_version:
                curr_data = json.loads(ch_file.read_text(encoding="utf-8"))
                curr_v = curr_data.get("version", "")
                older = [v for v in available_versions if v != curr_v]
                if not older:
                    raise HTTPException(status_code=400, detail={"error": "no_previous_version", "message": "Không tìm thấy phiên bản trước để rút lại"})
                target_version = older[0]

            new_content = {
                "channel": channel,
                "version": target_version,
                "updated_at": now_utc_iso(),
            }
            ch_file.write_text(json.dumps(new_content, indent=2), encoding="utf-8")

            # Ghi nhat ky
            conn.execute(
                """INSERT INTO admin_audit (id, at, admin, action, target, ip, user_agent, result)
                   VALUES (?, ?, ?, 'rollback_release', ?, '127.0.0.1', 'admin', 'success')""",
                (str(uuid.uuid4()), now_utc_iso(), admin_info["username"], f"channel={channel},to={target_version}"),
            )
            conn.commit()

        return {"ok": True, "channel": channel, "target_version": target_version, "message": f"Đã chuyển con trỏ kênh {channel} về {target_version}"}

    @router.get("/api/v1/admin/audit/export-csv")
    async def admin_export_audit_csv(request: Request) -> Response:
        """Xuat nhat ky kiem toan quan tri ra tep CSV."""
        with get_db() as conn:
            require_admin(request, session_manager, conn, cfg)
            rows = conn.execute(
                """SELECT id, at, admin, action, target, ip, user_agent, result
                   FROM admin_audit ORDER BY at DESC LIMIT 1000"""
            ).fetchall()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Thoi gian", "Quan tri vien", "Hanh dong", "Doi tuong", "Dia chi IP", "Trinh duyet", "Ket qua"])
        for r in rows:
            writer.writerow([r["id"], r["at"], r["admin"], r["action"], r["target"], r["ip"] or "", r["user_agent"] or "", r["result"] or ""])

        csv_data = output.getvalue().encode("utf-8-sig")
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="3t-office-admin-audit.csv"'},
        )

    # Gắn router vào ứng dụng
    app.include_router(router)
