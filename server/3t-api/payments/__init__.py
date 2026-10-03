"""Khoi tao cac bo chuyen doi thanh toan 3T Office."""

from .base import PaymentAdapter, PaymentInstruction, WebhookVerificationResult
from .free import FreePaymentAdapter
from .bank_transfer import BankTransferAdapter, sign_bank_webhook
from .manual import ManualPaymentAdapter

PAYMENT_ADAPTERS: dict[str, PaymentAdapter] = {
    "free": FreePaymentAdapter(),
    "bank_transfer": BankTransferAdapter(),
    "manual": ManualPaymentAdapter(),
}

__all__ = [
    "PaymentAdapter",
    "PaymentInstruction",
    "WebhookVerificationResult",
    "FreePaymentAdapter",
    "BankTransferAdapter",
    "ManualPaymentAdapter",
    "PAYMENT_ADAPTERS",
    "sign_bank_webhook",
]
