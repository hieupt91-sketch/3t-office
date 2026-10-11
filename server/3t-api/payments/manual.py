"""Bo chuyen doi thu tien thu cong (Manual Payment Adapter cho quan tri vien)."""

from __future__ import annotations

from typing import Any
from .base import PaymentAdapter, PaymentInstruction, WebhookVerificationResult


class ManualPaymentAdapter(PaymentAdapter):
    @property
    def provider_name(self) -> str:
        return "manual"

    def create_payment(self, order: dict[str, Any]) -> PaymentInstruction:
        return PaymentInstruction(
            method="manual",
            status="pending",
            amount_vnd=order["amount_vnd"],
            transfer_content=f"Thu tiền trực tiếp đơn {order['code']}",
            expires_at=order.get("expires_at"),
        )

    def verify_webhook(
        self,
        raw_body: bytes,
        headers: dict[str, str],
        webhook_secret: str = "",
    ) -> WebhookVerificationResult:
        return WebhookVerificationResult(
            is_valid=False,
            event_id=None,
            provider="manual",
            order_code=None,
            amount_vnd=0,
            raw_payload={},
            error_message="manual provider does not accept external webhooks",
        )
