"""Bo chuyen doi thanh toan mien phi (Free Payment Adapter, gia 0 VND)."""

from __future__ import annotations

from typing import Any
from .base import PaymentAdapter, PaymentInstruction, WebhookVerificationResult


class FreePaymentAdapter(PaymentAdapter):
    @property
    def provider_name(self) -> str:
        return "free"

    def create_payment(self, order: dict[str, Any]) -> PaymentInstruction:
        return PaymentInstruction(
            method="free",
            status="succeeded",
            amount_vnd=0,
            qr_url=None,
            transfer_content=None,
            expires_at=None,
        )

    def verify_webhook(
        self,
        raw_body: bytes,
        headers: dict[str, str],
        webhook_secret: str = "",
    ) -> WebhookVerificationResult:
        # Gói miễn phí tự động hoàn tất nội bộ, không dùng webhook công khai
        return WebhookVerificationResult(
            is_valid=False,
            event_id=None,
            provider="free",
            order_code=None,
            amount_vnd=0,
            raw_payload={},
            error_message="free provider does not accept external webhooks",
        )
