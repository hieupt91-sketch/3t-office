"""Bo chuyen doi thanh toan chuyen khoan ngan hang VietQR va Webhook doi soat."""

from __future__ import annotations

import hashlib
import hmac
import json
import re
from typing import Any
from urllib.parse import quote

from .base import PaymentAdapter, PaymentInstruction, WebhookVerificationResult

# Tai khoan nhan tien va bi mat webhook KHONG co gia tri mac dinh: chu so huu chua chot nha cung cap/tai khoan.
# Chung duoc nap tu cau hinh may chu (PAYMENT_BANK_CODE, PAYMENT_BANK_ACCOUNT, PAYMENT_ACCOUNT_HOLDER,
# PAYMENT_WEBHOOK_SECRET). Thieu cau hinh thi KHONG tao thanh toan va TU CHOI moi webhook (dong an toan).
MIN_WEBHOOK_SECRET_LENGTH = 16


def sign_bank_webhook(body_bytes: bytes, secret: str) -> str:
    """Sinh chu ky HMAC-SHA256 chuan de kiem thu webhook."""
    return hmac.new(secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()


class BankTransferAdapter(PaymentAdapter):
    def __init__(
        self,
        bank_code: str = "",
        bank_account: str = "",
        account_holder: str = "",
        webhook_secret: str = "",
    ) -> None:
        self.bank_code = bank_code
        self.bank_account = bank_account
        self.account_holder = account_holder
        self.webhook_secret = webhook_secret

    def configure(self, *, bank_code: str, bank_account: str, account_holder: str, webhook_secret: str) -> None:
        self.bank_code = bank_code.strip()
        self.bank_account = bank_account.strip()
        self.account_holder = account_holder.strip()
        self.webhook_secret = webhook_secret.strip()

    @property
    def is_configured(self) -> bool:
        """Co the nhan thanh toan that: da co tai khoan nhan tien VA bi mat webhook du dai."""
        return bool(
            self.bank_code and self.bank_account and self.account_holder
            and len(self.webhook_secret) >= MIN_WEBHOOK_SECRET_LENGTH
        )

    @property
    def provider_name(self) -> str:
        return "bank_transfer"

    def create_payment(self, order: dict[str, Any]) -> PaymentInstruction:
        order_code = order["code"]
        amount_vnd = order["amount_vnd"]

        # Chuoi VietQR chuan (chu hoa khong dau cho noi dung chuyen khoan)
        content_safe = quote(order_code)
        holder_safe = quote(self.account_holder)
        qr_url = (
            f"https://img.vietqr.io/image/{self.bank_code}-{self.bank_account}-compact2.png"
            f"?amount={amount_vnd}&addInfo={content_safe}&accountName={holder_safe}"
        )

        return PaymentInstruction(
            method="bank_transfer",
            status="pending",
            amount_vnd=amount_vnd,
            qr_url=qr_url,
            transfer_content=order_code,
            bank_account=self.bank_account,
            bank_name=self.bank_code,
            account_holder=self.account_holder,
            expires_at=order.get("expires_at"),
            extra={"vietqr_url": qr_url},
        )

    def verify_webhook(
        self,
        raw_body: bytes,
        headers: dict[str, str],
        webhook_secret: str = "",
    ) -> WebhookVerificationResult:
        secret = webhook_secret or self.webhook_secret
        if len(secret) < MIN_WEBHOOK_SECRET_LENGTH:
            # Dong an toan: khong co bi mat du dai thi khong the xac thuc -> tu choi, khong tinh chu ky voi khoa rong.
            return WebhookVerificationResult(
                is_valid=False,
                event_id=None,
                provider="bank_transfer",
                order_code=None,
                amount_vnd=0,
                raw_payload={},
                error_message="Webhook secret is not configured",
            )

        # 1. Lay chu ky tu header
        signature = (
            headers.get("x-signature")
            or headers.get("x-hub-signature-256")
            or headers.get("x-sepay-signature")
            or headers.get("x-casso-signature")
            or ""
        ).strip()

        if signature.startswith("sha256="):
            signature = signature[7:]

        # Tinh chu ky ky vong
        expected_sig = sign_bank_webhook(raw_body, secret)
        sig_ok = bool(signature and hmac.compare_digest(signature.lower(), expected_sig.lower()))

        # 2. Parse payload JSON an toan
        try:
            payload = json.loads(raw_body.decode("utf-8"))
            if not isinstance(payload, dict):
                return WebhookVerificationResult(
                    is_valid=False,
                    event_id=None,
                    provider="bank_transfer",
                    order_code=None,
                    amount_vnd=0,
                    raw_payload={},
                    error_message="Payload must be a JSON object",
                )
        except Exception as exc:
            return WebhookVerificationResult(
                is_valid=False,
                event_id=None,
                provider="bank_transfer",
                order_code=None,
                amount_vnd=0,
                raw_payload={},
                error_message=f"Invalid JSON payload: {type(exc).__name__}",
            )

        # 3. Trich xuat thong tin doi soat
        # Cac he thong SePay/Casso/Ngan hang thuong gui truong id hoac transaction_id
        event_id = str(payload.get("event_id") or payload.get("id") or payload.get("transaction_id") or "").strip()
        description = str(
            payload.get("content")
            or payload.get("description")
            or payload.get("order_code")
            or payload.get("reference")
            or ""
        ).strip()

        amount_raw = payload.get("amount") or payload.get("transfer_amount") or payload.get("amount_in") or 0
        try:
            amount_vnd = int(amount_raw)
        except (ValueError, TypeError):
            amount_vnd = 0

        # Trich xuat ma don hang dinh dang 3T-XXXXXX-XXXX tu noi dung chuyen khoan
        order_match = re.search(r"3T-[0-9A-Za-z]+-[0-9A-Za-z]+", description, re.IGNORECASE)
        order_code = order_match.group(0).upper() if order_match else None

        # Loai bo du lieu nhay cam truoc khi luu log/event
        sanitized = {
            k: v for k, v in payload.items()
            if not any(sub in k.lower() for sub in ("card", "cvv", "pass", "secret", "token", "auth"))
        }

        if not sig_ok:
            return WebhookVerificationResult(
                is_valid=False,
                event_id=event_id or None,
                provider="bank_transfer",
                order_code=order_code,
                amount_vnd=amount_vnd,
                raw_payload=sanitized,
                error_message="Invalid HMAC signature",
            )

        if not event_id:
            return WebhookVerificationResult(
                is_valid=False,
                event_id=None,
                provider="bank_transfer",
                order_code=order_code,
                amount_vnd=amount_vnd,
                raw_payload=sanitized,
                error_message="Missing event_id in webhook payload",
            )

        return WebhookVerificationResult(
            is_valid=True,
            event_id=event_id,
            provider="bank_transfer",
            order_code=order_code,
            amount_vnd=amount_vnd,
            raw_payload=sanitized,
        )
