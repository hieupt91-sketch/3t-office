"""Giao dien co so cho Bo chuyen doi Thanh toan (Payment Adapter Interface)."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class PaymentInstruction:
    method: str
    status: str
    amount_vnd: int
    qr_url: str | None = None
    transfer_content: str | None = None
    bank_account: str | None = None
    bank_name: str | None = None
    account_holder: str | None = None
    expires_at: str | None = None
    extra: dict[str, Any] | None = None


@dataclass(frozen=True, slots=True)
class WebhookVerificationResult:
    is_valid: bool
    event_id: str | None
    provider: str
    order_code: str | None
    amount_vnd: int
    raw_payload: dict[str, Any]
    error_message: str | None = None


class PaymentAdapter(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Ten dinh danh cua nha cung cap thanh toan."""
        ...

    @abstractmethod
    def create_payment(self, order: dict[str, Any]) -> PaymentInstruction:
        """Sinh huong dan thanh toan cho don hang."""
        ...

    @abstractmethod
    def verify_webhook(
        self,
        raw_body: bytes,
        headers: dict[str, str],
        webhook_secret: str = "",
    ) -> WebhookVerificationResult:
        """Xac thuc chu ky webhook tu nha cung cap thanh toan bang so sanh hang thoi gian."""
        ...
