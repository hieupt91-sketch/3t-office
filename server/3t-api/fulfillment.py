"""Module cap key tu dong, dam bao tinh Idempotent va thu hoi ban quyen."""

from __future__ import annotations

import sqlite3
import time
import uuid
from typing import Any

try:
    import license as lic_mod
except ImportError:
    from . import license as lic_mod

from emails.service import EmailService


def fulfill_order_idempotent(
    conn: sqlite3.Connection,
    order_id: str,
    secret_for_email_enc: str = "",
    email_service: EmailService | None = None,
) -> tuple[bool, list[str], str]:
    """Cấp mã bản quyền tự động và chuẩn idempotent trong 1 giao dịch cơ sở dữ liệu.
    
    Quy trình:
    1. Kiểm tra trạng thái đơn: nếu đã 'fulfilled', trả về thành công ngay lập tức mà KHÔNG cấp trùng.
    2. Nếu trạng thái 'paid': sinh đúng `quantity` key, thêm vào license_keys, xếp email vào outbox.
    3. Cập nhật trạng thái đơn thành 'fulfilled'.
    Trả về: (thanh_cong, danh_sach_key_tho_trong_bo_nho, thong_diep).
    """
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # Khóa và đọc thông tin đơn hàng
    order = conn.execute(
        """SELECT o.id, o.code, o.customer_id, o.plan_id, o.quantity, o.seats_per_key,
                  o.amount_vnd, o.status, o.source, c.email, c.full_name, p.platforms, p.name AS plan_name
           FROM orders o
           JOIN customers c ON o.customer_id = c.id
           JOIN plans p ON o.plan_id = p.id
           WHERE o.id = ?""",
        (order_id,),
    ).fetchone()

    if not order:
        return False, [], "Không tìm thấy đơn hàng"

    # 1. Idempotency: Đơn đã fulfilled thì không cấp lại
    if order["status"] == "fulfilled":
        existing_hints = [
            r["key_hint"] for r in conn.execute(
                "SELECT key_hint FROM license_keys WHERE order_id = ?", (order_id,)
            ).fetchall()
        ]
        return True, [], f"Đơn hàng đã được cấp {len(existing_hints)} key trước đó (idempotent)"

    if order["status"] not in ("paid", "draft", "pending_payment"):
        return False, [], f"Trạng thái đơn hàng ({order['status']}) không hợp lệ để cấp key"

    # Cập nhật trạng thái đơn sang paid nếu chưa
    if order["status"] != "paid":
        conn.execute(
            "UPDATE orders SET status = 'paid', updated_at = ? WHERE id = ?",
            (now_iso, order_id),
        )

    quantity = max(1, order["quantity"])
    seats_per_key = max(1, order["seats_per_key"])
    platforms = order["platforms"] or "windows"
    customer_id = order["customer_id"]
    customer_email = order["email"]
    order_code = order["code"]

    generated_keys: list[str] = []
    rows_to_insert = []

    for _ in range(quantity):
        raw_key = lic_mod.generate_license_key()
        canonical = lic_mod.normalize_and_validate_key(raw_key)
        if not canonical:
            continue
        key_hash = lic_mod.hash_key(canonical)
        key_hint = lic_mod.extract_hint(canonical)
        lid = str(uuid.uuid4())
        rows_to_insert.append((
            lid,
            key_hash,
            key_hint,
            f"Đơn hàng #{order_code}",
            customer_email,
            seats_per_key,
            "active",
            now_iso,
            order_id,
            customer_id,
            order["source"] or "web",
            order["plan_id"],
            platforms,
        ))
        generated_keys.append(canonical)

    if not generated_keys:
        return False, [], "Không thể sinh mã bản quyền hợp lệ"

    # Ghi vào bảng license_keys
    conn.executemany(
        """INSERT INTO license_keys (id, key_hash, key_hint, note, email, seats_max, status, created_at,
                                     order_id, customer_id, source, plan_id, platforms)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        rows_to_insert,
    )

    # Đánh dấu đơn hàng fulfilled
    conn.execute(
        "UPDATE orders SET status = 'fulfilled', updated_at = ? WHERE id = ?",
        (now_iso, order_id),
    )

    # Xếp email bàn giao key vào outbox (key thô chỉ nằm trong bộ nhớ và được mã hóa AES-GCM trong payload_json)
    if email_service is None:
        email_service = EmailService()

    email_data = {
        "order_code": order_code,
        "customer_name": order["full_name"],
        "plan_name": order["plan_name"],
        "quantity": len(generated_keys),
        "key_hints": [k[-4:] for k in generated_keys],
    }

    email_service.queue_email(
        conn=conn,
        to_email=customer_email,
        template="order_fulfilled",
        data=email_data,
        raw_keys=generated_keys,
        encryption_secret=secret_for_email_enc,
    )

    return True, generated_keys, f"Đã cấp thành công {len(generated_keys)} mã bản quyền"


def revoke_order_keys(
    conn: sqlite3.Connection,
    order_id: str,
    reason: str = "Hoàn tiền hoặc hủy đơn",
    admin_user: str = "system",
    secret_for_email_enc: str = "",
) -> tuple[bool, int, str]:
    """Thu hồi toàn bộ mã bản quyền của một đơn hàng khi hoàn tiền hoặc hủy."""
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    order = conn.execute(
        "SELECT id, code, customer_id, status FROM orders WHERE id = ?", (order_id,)
    ).fetchone()
    if not order:
        return False, 0, "Không tìm thấy đơn hàng"

    # Lấy danh sách key đang active của đơn
    keys = conn.execute(
        "SELECT id, key_hint, email FROM license_keys WHERE order_id = ? AND status = 'active'",
        (order_id,),
    ).fetchall()

    if not keys:
        conn.execute("UPDATE orders SET status = 'refunded', updated_at = ? WHERE id = ?", (now_iso, order_id))
        return True, 0, "Đơn hàng không có mã bản quyền nào đang hoạt động"

    # Đổi trạng thái đơn sang refunded
    conn.execute("UPDATE orders SET status = 'refunded', updated_at = ? WHERE id = ?", (now_iso, order_id))

    # Đổi trạng thái toàn bộ key sang revoked
    conn.execute(
        "UPDATE license_keys SET status = 'revoked', revoked_at = ? WHERE order_id = ? AND status = 'active'",
        (now_iso, order_id),
    )

    # Ghi nhật ký quản trị
    hints = [k["key_hint"] for k in keys]
    conn.execute(
        "INSERT INTO admin_audit (id, at, admin, action, target, ip, user_agent, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (str(uuid.uuid4()), now_iso, admin_user, "revoke_order_keys", f"order={order['code']},keys={','.join(hints)}", "127.0.0.1", "system", "success"),
    )

    # Gửi email thông báo thu hồi
    customer_email = keys[0]["email"] if keys else ""
    if customer_email:
        email_svc = EmailService()
        email_svc.queue_email(
            conn=conn,
            to_email=customer_email,
            template="license_revoked",
            data={"order_code": order["code"], "key_hints": hints, "reason": reason},
            encryption_secret=secret_for_email_enc,
        )

    return True, len(keys), f"Đã thu hồi {len(keys)} mã bản quyền"
