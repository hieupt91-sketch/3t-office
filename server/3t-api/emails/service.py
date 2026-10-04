"""Dich vu hang doi email outbox va gui SMTP cau hinh duoc."""

from __future__ import annotations

import base64
import hashlib
import json
import logging
import os
import smtplib
import sqlite3
import time
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from .templates import render_template

logger = logging.getLogger("3t-office-cloud")


def _derive_aes_key(secret: str) -> bytes:
    """Tao khoa 256-bit tu chuoi bi mat bang SHA-256."""
    return hashlib.sha256(secret.encode("utf-8")).digest()


def encrypt_payload(data: dict[str, Any], secret: str) -> str:
    """Ma hoa payload chua key bang AES-256-GCM truoc khi luu vao outbox."""
    key = _derive_aes_key(secret)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    plaintext = json.dumps(data, separators=(",", ":")).encode("utf-8")
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)
    return base64.b64encode(nonce + ciphertext).decode("ascii")


def decrypt_payload(token_b64: str, secret: str) -> dict[str, Any] | None:
    """Giai ma payload tu outbox bang AES-256-GCM."""
    try:
        key = _derive_aes_key(secret)
        raw = base64.b64decode(token_b64.strip(), validate=True)
        nonce = raw[:12]
        ciphertext = raw[12:]
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        return json.loads(plaintext.decode("utf-8"))
    except Exception:
        return None


class EmailService:
    def __init__(
        self,
        smtp_host: str = "",
        smtp_port: int = 587,
        smtp_user: str = "",
        smtp_password: str = "",
        smtp_from: str = "3T Office <no-reply@3tcomputer.com>",
    ) -> None:
        self.smtp_host = smtp_host or os.environ.get("SMTP_HOST", "")
        self.smtp_port = int(os.environ.get("SMTP_PORT", str(smtp_port)))
        self.smtp_user = smtp_user or os.environ.get("SMTP_USER", "")
        self.smtp_password = smtp_password or os.environ.get("SMTP_PASSWORD", "")
        self.smtp_from = smtp_from or os.environ.get("SMTP_FROM", "3T Office <no-reply@3tcomputer.com>")

    @property
    def is_configured(self) -> bool:
        """Kiem tra xem SMTP da duoc nguoi phu trach cau hinh chua."""
        return bool(self.smtp_host and self.smtp_port)

    def queue_email(
        self,
        conn: sqlite3.Connection,
        to_email: str,
        template: str,
        data: dict[str, Any],
        raw_keys: list[str] | None = None,
        encryption_secret: str = "",
    ) -> str:
        """Xep email vao email_outbox. Key duoc ma hoa AES-GCM trong payload_json."""
        outbox_id = str(uuid.uuid4())
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        # An key thô: chi luu hint trong public data, encrypt raw_keys neu co
        public_data = dict(data)
        if raw_keys:
            hints = [k[-4:] for k in raw_keys]
            public_data["key_hints"] = hints
            if encryption_secret:
                enc_token = encrypt_payload({"raw_keys": raw_keys}, encryption_secret)
                public_data["keys_enc"] = enc_token

        payload_json = json.dumps(public_data, ensure_ascii=False)

        conn.execute(
            """INSERT INTO email_outbox (id, to_email, template, payload_json, status, attempts, scheduled_at, created_at, updated_at)
               VALUES (?, ?, ?, ?, 'queued', 0, ?, ?, ?)""",
            (outbox_id, to_email.strip().lower(), template, payload_json, now_iso, now_iso, now_iso),
        )
        return outbox_id

    def send_smtp_message(self, to_email: str, subject: str, body_text: str) -> None:
        """Thuc hien gui email qua SMTP voi STARTTLS hoac SSL."""
        if not self.is_configured:
            raise RuntimeError("SMTP chưa được cấu hình trên máy chủ")

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.smtp_from
        msg["To"] = to_email
        msg.attach(MIMEText(body_text, "plain", "utf-8"))

        if self.smtp_port == 465:
            with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, timeout=15) as server:
                if self.smtp_user and self.smtp_password:
                    server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=15) as server:
                server.ehlo()
                try:
                    server.starttls()
                    server.ehlo()
                except Exception:
                    pass
                if self.smtp_user and self.smtp_password:
                    server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

    def dispatch_queued_emails(
        self,
        conn: sqlite3.Connection,
        encryption_secret: str = "",
        limit: int = 20,
    ) -> dict[str, int]:
        """Tien trinh nen: Duyet outbox va gui cac email dang o trang thai queued."""
        if not self.is_configured:
            return {"sent": 0, "failed": 0, "unconfigured": 1}

        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        rows = conn.execute(
            """SELECT id, to_email, template, payload_json, attempts
               FROM email_outbox
               WHERE status = 'queued' AND scheduled_at <= ? AND attempts < 5
               ORDER BY scheduled_at ASC LIMIT ?""",
            (now_iso, limit),
        ).fetchall()

        sent_count = 0
        failed_count = 0

        for row in rows:
            email_id = row["id"]
            to_email = row["to_email"]
            template = row["template"]
            attempts = row["attempts"] + 1

            try:
                data = json.loads(row["payload_json"])
                raw_keys = None
                if "keys_enc" in data and encryption_secret:
                    dec = decrypt_payload(data["keys_enc"], encryption_secret)
                    if dec and "raw_keys" in dec:
                        raw_keys = dec["raw_keys"]

                subject, body = render_template(template, data, raw_keys=raw_keys)
                self.send_smtp_message(to_email, subject, body)

                sent_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                conn.execute(
                    """UPDATE email_outbox SET status = 'sent', sent_at = ?, attempts = ?, updated_at = ? WHERE id = ?""",
                    (sent_iso, attempts, sent_iso, email_id),
                )
                sent_count += 1
            except Exception as exc:
                err_msg = f"{type(exc).__name__}: {str(exc)}"
                logger.warning("email dispatch error for %s: %s", to_email, err_msg)
                next_try_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + (attempts * 60)))
                new_status = "failed" if attempts >= 5 else "queued"
                conn.execute(
                    """UPDATE email_outbox
                       SET status = ?, attempts = ?, last_error = ?, scheduled_at = ?, updated_at = ?
                       WHERE id = ?""",
                    (new_status, attempts, err_msg, next_try_iso, time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), email_id),
                )
                failed_count += 1

        conn.commit()
        return {"sent": sent_count, "failed": failed_count, "unconfigured": 0}
