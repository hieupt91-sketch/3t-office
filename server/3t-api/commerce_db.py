"""Module quan ly co so du lieu thuong mai va ban quyen cho 3T Office.

Cac bang:
- customers
- products
- plans
- orders
- payments
- payment_events
- license_keys (mo rong)
- activations (mo rong)
- invoices
- email_outbox
- admin_users
- admin_audit (mo rong)
- portal_sessions
- login_codes
"""

from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def now_utc_iso() -> str:
    """Tra ve thoi gian hien tai chuan ISO-8601 UTC."""
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def open_db(db_path: Path) -> sqlite3.Connection:
    """Mo ket noi SQLite voi cau hinh WAL va Row factory."""
    conn = sqlite3.connect(db_path, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def migrate_commerce_schema(conn: sqlite3.Connection) -> None:
    """Khoi tao va cap nhat schema CSDL thuong mai ma KHONG lam mat du lieu cu."""
    # 1. Bang customers
    conn.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            phone TEXT NOT NULL DEFAULT '',
            company_name TEXT NOT NULL DEFAULT '',
            tax_code TEXT NOT NULL DEFAULT '',
            address TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            email_verified_at TEXT
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS customers_email_idx ON customers(email)")

    # 2. Bang products
    conn.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # 3. Bang plans
    conn.execute("""
        CREATE TABLE IF NOT EXISTS plans (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL REFERENCES products(id),
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            price_vnd INTEGER NOT NULL DEFAULT 0,
            seats_default INTEGER NOT NULL DEFAULT 2,
            platforms TEXT NOT NULL DEFAULT 'windows',
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # 4. Bang orders
    conn.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            customer_id TEXT NOT NULL REFERENCES customers(id),
            plan_id TEXT NOT NULL REFERENCES plans(id),
            quantity INTEGER NOT NULL DEFAULT 1,
            seats_per_key INTEGER NOT NULL DEFAULT 2,
            amount_vnd INTEGER NOT NULL DEFAULT 0,
            discount_vnd INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'draft',
            note TEXT NOT NULL DEFAULT '',
            expires_at TEXT,
            source TEXT NOT NULL DEFAULT 'web',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status)")
    conn.execute("CREATE INDEX IF NOT EXISTS orders_code_idx ON orders(code)")

    # 5. Bang payments
    conn.execute("""
        CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            order_id TEXT REFERENCES orders(id),
            provider TEXT NOT NULL,
            provider_ref TEXT NOT NULL,
            amount_vnd INTEGER NOT NULL,
            currency TEXT NOT NULL DEFAULT 'VND',
            status TEXT NOT NULL DEFAULT 'pending',
            raw_event_id TEXT,
            paid_at TEXT,
            reconciled_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(provider, provider_ref)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS payments_order_idx ON payments(order_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status)")

    # 6. Bang payment_events
    conn.execute("""
        CREATE TABLE IF NOT EXISTS payment_events (
            id TEXT PRIMARY KEY,
            provider TEXT NOT NULL,
            event_id TEXT NOT NULL,
            received_at TEXT NOT NULL,
            signature_ok INTEGER NOT NULL,
            payload_json TEXT NOT NULL,
            processed_at TEXT,
            result TEXT,
            UNIQUE(provider, event_id)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS payment_events_provider_idx ON payment_events(provider, event_id)")

    # 7. Mo rong bang license_keys neu da ton tai tu GD1/GD2
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
    lk_cols = {row[1] for row in conn.execute("PRAGMA table_info(license_keys)").fetchall()}
    if "order_id" not in lk_cols:
        conn.execute("ALTER TABLE license_keys ADD COLUMN order_id TEXT REFERENCES orders(id)")
    if "customer_id" not in lk_cols:
        conn.execute("ALTER TABLE license_keys ADD COLUMN customer_id TEXT REFERENCES customers(id)")
    if "source" not in lk_cols:
        conn.execute("ALTER TABLE license_keys ADD COLUMN source TEXT NOT NULL DEFAULT 'admin'")
    if "plan_id" not in lk_cols:
        conn.execute("ALTER TABLE license_keys ADD COLUMN plan_id TEXT REFERENCES plans(id)")
    if "platforms" not in lk_cols:
        conn.execute("ALTER TABLE license_keys ADD COLUMN platforms TEXT NOT NULL DEFAULT 'windows'")
    conn.execute("CREATE INDEX IF NOT EXISTS license_keys_order_idx ON license_keys(order_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS license_keys_customer_idx ON license_keys(customer_id)")

    # 8. Mo rong bang activations neu da ton tai
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
    act_cols = {row[1] for row in conn.execute("PRAGMA table_info(activations)").fetchall()}
    if "platform" not in act_cols:
        conn.execute("ALTER TABLE activations ADD COLUMN platform TEXT NOT NULL DEFAULT 'windows'")

    # 9. Bang invoices (hoa don)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL REFERENCES orders(id),
            number TEXT,
            status TEXT NOT NULL DEFAULT 'none',
            buyer_name TEXT NOT NULL DEFAULT '',
            buyer_tax_code TEXT NOT NULL DEFAULT '',
            buyer_address TEXT NOT NULL DEFAULT '',
            issued_at TEXT,
            external_ref TEXT,
            pdf_path TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS invoices_order_idx ON invoices(order_id)")

    # 10. Bang email_outbox
    conn.execute("""
        CREATE TABLE IF NOT EXISTS email_outbox (
            id TEXT PRIMARY KEY,
            to_email TEXT NOT NULL,
            template TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'queued',
            attempts INTEGER NOT NULL DEFAULT 0,
            last_error TEXT,
            scheduled_at TEXT NOT NULL,
            sent_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS email_outbox_status_idx ON email_outbox(status, scheduled_at)")

    # 11. Bang admin_users
    conn.execute("""
        CREATE TABLE IF NOT EXISTS admin_users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'support',
            totp_secret_enc TEXT,
            active INTEGER NOT NULL DEFAULT 1,
            must_change_password INTEGER NOT NULL DEFAULT 0,
            last_login_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS admin_users_user_idx ON admin_users(username)")

    # 12. Mo rong bang admin_audit
    conn.execute("""
        CREATE TABLE IF NOT EXISTS admin_audit (
            id TEXT PRIMARY KEY,
            at TEXT NOT NULL,
            admin TEXT NOT NULL,
            action TEXT NOT NULL,
            target TEXT NOT NULL
        )
    """)
    audit_cols = {row[1] for row in conn.execute("PRAGMA table_info(admin_audit)").fetchall()}
    if "ip" not in audit_cols:
        conn.execute("ALTER TABLE admin_audit ADD COLUMN ip TEXT NOT NULL DEFAULT ''")
    if "user_agent" not in audit_cols:
        conn.execute("ALTER TABLE admin_audit ADD COLUMN user_agent TEXT NOT NULL DEFAULT ''")
    if "result" not in audit_cols:
        conn.execute("ALTER TABLE admin_audit ADD COLUMN result TEXT NOT NULL DEFAULT 'success'")

    # 13. Bang portal_sessions va login_codes
    conn.execute("""
        CREATE TABLE IF NOT EXISTS portal_sessions (
            session_id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL REFERENCES customers(id),
            email TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            last_active_at INTEGER NOT NULL
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS portal_sessions_email_idx ON portal_sessions(email)")

    conn.execute("""
        CREATE TABLE IF NOT EXISTS login_codes (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            code_hash TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS login_codes_email_idx ON login_codes(email)")

    # 14. Seed du lieu mac dinh: san pham va goi ban quyen mac dinh (gia = 0)
    now_iso = now_utc_iso()
    conn.execute("""
        INSERT OR IGNORE INTO products (id, name, active, created_at, updated_at)
        VALUES ('3t-office', '3T Office', 1, ?, ?)
    """, (now_iso, now_iso))

    conn.execute("""
        INSERT OR IGNORE INTO plans (id, product_id, code, name, price_vnd, seats_default, platforms, active, created_at, updated_at)
        VALUES ('plan-perpetual', '3t-office', 'perpetual', 'Bản quyền vĩnh viễn', 0, 2, 'windows,macos', 1, ?, ?)
    """, (now_iso, now_iso))

    conn.commit()
