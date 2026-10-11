"""Kiem thu dau-cuoi (E2E) va bao mat cho he thong Thuong mai, Ban hang va Quan tri (GD-A).

Kich ban bat buoc:
1. Don 0 dong tu hoan tat -> key -> email -> activate -> quan tri thay
2. Don co tien: webhook dung 3 lan chi cap 1 lan (Idempotent)
3. Webhook sai chu ky / thieu tien / khong ma don / het han -> khong cap key
4. Hoan tien thu hoi key -> validate tra revoked
5. Cap lai key tu cong khach hang -> key cu bi vo hieu, key moi hoat dong
6. Phan quyen may chu: support khong danh dau thu tien (403), viewer khong ghi duoc (403), khong dang nhap (401), sai CSRF (403)
7. Gioi han toc do va khoa tam dang nhap theo IP that (CF-Connecting-IP)
8. Bao mat: Khong co key/token/mat khau trong nhat ky, chong replay boi event_id, dau vao di dang
"""

from __future__ import annotations

import base64
import json
import sqlite3
import time
import uuid
from pathlib import Path

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519
from fastapi.testclient import TestClient

from app import Settings, create_app
import license as lic_mod
from payments.bank_transfer import sign_bank_webhook
from auth import hash_password, get_totp_code

TEST_WEBHOOK_SECRET = "3t-webhook-secret-key-for-bank-reconcile"  # test-only value, never a server default


@pytest.fixture
def commerce_env(tmp_path: Path):
    priv = ed25519.Ed25519PrivateKey.generate()
    pub = priv.public_key()
    priv_raw = priv.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption(),
    )
    priv_b64 = base64.b64encode(priv_raw).decode("ascii")

    data_dir = tmp_path / "data"
    updates_dir = tmp_path / "updates"
    reports_dir = tmp_path / "reports"
    backups_dir = tmp_path / "backups"
    logs_dir = tmp_path / "logs"

    # Setup pilot channel
    ch_dir = updates_dir / "channels"
    ch_dir.mkdir(parents=True, exist_ok=True)
    (ch_dir / "pilot.json").write_text(json.dumps({
        "channel": "pilot",
        "version": "0.9.8",
        "date": "2026-10-03",
        "manifest_sha256": "abcdef",
    }), encoding="utf-8")

    settings = Settings(
        data_dir=data_dir,
        updates_dir=updates_dir,
        reports_dir=reports_dir,
        backups_dir=backups_dir,
        logs_dir=logs_dir,
        install_token_secret="a" * 32,
        admin_username="admin_owner",
        admin_password="secretpassword123",
        product="3t-office",
        license_signing_key=priv_b64,
        # Test-only receiving account and webhook secret; the server has NO built-in defaults for these.
        payment_webhook_secret=TEST_WEBHOOK_SECRET,
        payment_bank_code="TEST",
        payment_bank_account="0000000000",
        payment_account_holder="TEST HOLDER",
    )
    app = create_app(settings)
    client = TestClient(app, base_url="https://testserver")
    db_path = data_dir / "3t-office-cloud.sqlite3"

    # Seed extra admin users with different roles for testing
    with sqlite3.connect(db_path) as conn:
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        # Support user
        conn.execute(
            """INSERT OR REPLACE INTO admin_users (id, username, password_hash, role, active, created_at, updated_at)
               VALUES ('u-support', 'support_user', ?, 'support', 1, ?, ?)""",
            (hash_password("supportpass123"), now_iso, now_iso),
        )
        # Viewer user
        conn.execute(
            """INSERT OR REPLACE INTO admin_users (id, username, password_hash, role, active, created_at, updated_at)
               VALUES ('u-viewer', 'viewer_user', ?, 'viewer', 1, ?, ?)""",
            (hash_password("viewerpass123"), now_iso, now_iso),
        )
        conn.commit()

    return {
        "client": client,
        "db_path": db_path,
        "settings": settings,
        "signing_key": priv,
        "public_key": pub,
    }


def test_scenario_1_zero_cost_order_flow(commerce_env):
    """Kịch bản 1: Đơn 0 đồng tự hoàn tất -> key cấp -> email outbox -> activate thành công -> admin thấy."""
    client = commerce_env["client"]
    db_path = commerce_env["db_path"]

    # 1. Tạo đơn giá 0 (gói perpetual mặc định có giá 0)
    order_req = {
        "plan": "perpetual",
        "quantity": 1,
        "customer": {
            "email": "khach0dong@example.vn",
            "name": "Nguyễn Văn Không Đồng",
            "phone": "0912345678",
            "company": "Công ty Thử Nghiệm",
            "tax_code": "0123456789",
            "address": "Hà Nội",
        },
        "want_invoice": True,
        "source": "web",
    }
    res = client.post("/api/v1/shop/orders", json=order_req)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "fulfilled"
    assert data["amount_vnd"] == 0
    assert len(data["keys"]) == 1
    issued_key = data["keys"][0]
    order_code = data["order_code"]
    assert issued_key.startswith("3TO-")

    # 2. Email đã nằm trong email_outbox
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        outbox_row = conn.execute(
            "SELECT * FROM email_outbox WHERE to_email = ?", ("khach0dong@example.vn",)
        ).fetchone()
        assert outbox_row is not None
        assert outbox_row["template"] == "order_fulfilled"
        # Đảm bảo outbox KHÔNG lưu key thô dưới dạng plain text
        assert issued_key not in outbox_row["payload_json"]

    # 3. Kích hoạt ứng dụng với key vừa cấp qua /api/v1/license/activate
    act_res = client.post("/api/v1/license/activate", json={
        "product": "3t-office",
        "key": issued_key,
        "device_fingerprint": "dev_fp_zero_001",
        "device_name": "PC-KETOAN-01",
        "app_version": "0.9.8",
        "platform": "windows",
    })
    assert act_res.status_code == 200
    act_data = act_res.json()
    assert "token" in act_data
    assert act_data["license"]["seats_used"] == 1
    assert act_data["license"]["edition"] == "perpetual"

    # 4. Quản trị viên đăng nhập và thấy đơn, key, thiết bị
    login_res = client.post("/api/v1/admin/login", json={"username": "admin_owner", "password": "secretpassword123"})
    assert login_res.status_code == 200
    csrf = login_res.json()["csrf_token"]

    # Kiểm tra danh sách đơn
    orders_res = client.get("/api/v1/admin/orders")
    assert orders_res.status_code == 200
    order_list = orders_res.json()["orders"]
    found_order = next((o for o in order_list if o["code"] == order_code), None)
    assert found_order is not None
    assert found_order["status"] == "fulfilled"

    # Kiểm tra key trong admin
    keys_res = client.get(f"/api/v1/admin/keys?q={issued_key[-4:]}")
    assert keys_res.status_code == 200
    assert len(keys_res.json()["keys"]) >= 1

    # Kiểm tra thiết bị trong chi tiết key
    key_id = keys_res.json()["keys"][0]["id"]
    detail_res = client.get(f"/api/v1/admin/keys/{key_id}")
    assert detail_res.status_code == 200
    assert len(detail_res.json()["activations"]) == 1
    assert detail_res.json()["activations"][0]["device_name"] == "PC-KETOAN-01"


def test_scenario_2_paid_order_and_idempotent_webhook(commerce_env):
    """Kịch bản 2: Đơn có tiền -> pending_payment -> webhook đúng 3 lần CHỈ cấp key đúng 1 lần."""
    client = commerce_env["client"]
    db_path = commerce_env["db_path"]

    # Đặt giá gói vĩnh viễn là 500.000 VND
    with sqlite3.connect(db_path) as conn:
        conn.execute("UPDATE plans SET price_vnd = 500000 WHERE code = 'perpetual'")
        conn.commit()

    # 1. Tạo đơn hàng
    order_res = client.post("/api/v1/shop/orders", json={
        "plan": "perpetual",
        "quantity": 1,
        "customer": {"email": "khachhang@congty.vn", "name": "Trần Thị B"},
        "source": "web",
    })
    assert order_res.status_code == 200
    order_data = order_res.json()
    assert order_data["status"] == "pending_payment"
    assert order_data["amount_vnd"] == 500000
    order_code = order_data["order_code"]
    transfer_content = order_data["payment"]["transfer_content"]
    assert transfer_content == order_code

    # 2. Gửi Webhook lần 1 với HMAC hợp lệ
    webhook_secret = "3t-webhook-secret-key-for-bank-reconcile"
    event_id_1 = "bank_evt_001"
    payload_1 = {
        "id": event_id_1,
        "content": f"Chuyen tien mua ban quyen {order_code}",
        "amount": 500000,
        "gateway": "MB",
    }
    body_bytes_1 = json.dumps(payload_1).encode("utf-8")
    sig_1 = sign_bank_webhook(body_bytes_1, webhook_secret)

    wh_res_1 = client.post(
        "/api/v1/payments/webhook/bank_transfer",
        content=body_bytes_1,
        headers={"x-signature": sig_1, "content-type": "application/json"},
    )
    assert wh_res_1.status_code == 200
    assert wh_res_1.json()["result"] == "fulfilled"

    # Kiểm tra cơ sở dữ liệu: đã cấp đúng 1 key
    with sqlite3.connect(db_path) as conn:
        keys_count_1 = conn.execute(
            "SELECT COUNT(*) FROM license_keys lk JOIN orders o ON lk.order_id = o.id WHERE o.code = ?",
            (order_code,),
        ).fetchone()[0]
        assert keys_count_1 == 1

    # 3. Gửi Webhook lần 2: Trùng event_id (Replay attack / duplicate delivery)
    wh_res_2 = client.post(
        "/api/v1/payments/webhook/bank_transfer",
        content=body_bytes_1,
        headers={"x-signature": sig_1, "content-type": "application/json"},
    )
    assert wh_res_2.status_code == 200
    assert wh_res_2.json()["duplicate"] is True

    # 4. Gửi Webhook lần 3: event_id khác nhưng cùng mã đơn đã fulfilled
    event_id_3 = "bank_evt_003"
    payload_3 = {
        "id": event_id_3,
        "content": f"Chuyen tien {order_code}",
        "amount": 500000,
    }
    body_bytes_3 = json.dumps(payload_3).encode("utf-8")
    sig_3 = sign_bank_webhook(body_bytes_3, webhook_secret)

    wh_res_3 = client.post(
        "/api/v1/payments/webhook/bank_transfer",
        content=body_bytes_3,
        headers={"x-signature": sig_3, "content-type": "application/json"},
    )
    assert wh_res_3.status_code == 200

    # Khẳng định IDEMPOTENT: Số key vẫn chính xác là 1, KHÔNG cấp thêm!
    with sqlite3.connect(db_path) as conn:
        keys_count_final = conn.execute(
            "SELECT COUNT(*) FROM license_keys lk JOIN orders o ON lk.order_id = o.id WHERE o.code = ?",
            (order_code,),
        ).fetchone()[0]
        assert keys_count_final == 1


def test_scenario_3_invalid_webhooks_do_not_issue_keys(commerce_env):
    """Kịch bản 3: Webhook sai chữ ký / thiếu tiền / không mã đơn / đơn hết hạn -> không cấp key."""
    client = commerce_env["client"]
    db_path = commerce_env["db_path"]
    webhook_secret = "3t-webhook-secret-key-for-bank-reconcile"

    # Đặt giá gói 200.000 VND
    with sqlite3.connect(db_path) as conn:
        conn.execute("UPDATE plans SET price_vnd = 200000 WHERE code = 'perpetual'")
        conn.commit()

    # Tạo đơn hàng
    order_res = client.post("/api/v1/shop/orders", json={
        "plan": "perpetual",
        "quantity": 1,
        "customer": {"email": "khach3@example.com", "name": "Lê Văn C"},
    })
    order_code = order_res.json()["order_code"]

    # 3.1 Sai chữ ký -> Trả 400 invalid_signature
    body_bad_sig = json.dumps({"id": "evt_bad_sig", "content": order_code, "amount": 200000}).encode("utf-8")
    res_bad_sig = client.post(
        "/api/v1/payments/webhook/bank_transfer",
        content=body_bad_sig,
        headers={"x-signature": "invalid_hmac_hex", "content-type": "application/json"},
    )
    assert res_bad_sig.status_code == 400
    assert res_bad_sig.json()["error"] == "invalid_signature"

    # 3.2 Thiếu tiền (Chuyển 50.000 thay vì 200.000) -> Không cấp key, trả underpaid
    body_underpaid = json.dumps({"id": "evt_underpaid", "content": order_code, "amount": 50000}).encode("utf-8")
    sig_underpaid = sign_bank_webhook(body_underpaid, webhook_secret)
    res_underpaid = client.post(
        "/api/v1/payments/webhook/bank_transfer",
        content=body_underpaid,
        headers={"x-signature": sig_underpaid, "content-type": "application/json"},
    )
    assert res_underpaid.status_code == 200
    assert res_underpaid.json()["result"] == "underpaid"

    # 3.3 Không có mã đơn trong nội dung -> Vào hàng đợi unmatched_order
    body_no_code = json.dumps({"id": "evt_no_code", "content": "Nguyen Van A ung ho quy", "amount": 200000}).encode("utf-8")
    sig_no_code = sign_bank_webhook(body_no_code, webhook_secret)
    res_no_code = client.post(
        "/api/v1/payments/webhook/bank_transfer",
        content=body_no_code,
        headers={"x-signature": sig_no_code, "content-type": "application/json"},
    )
    assert res_no_code.status_code == 200
    assert res_no_code.json()["result"] == "unmatched_order"

    # 3.4 Đơn hết hạn (expires_at trong quá khứ) -> Không cấp key, trả order_expired
    past_iso = "2026-01-01T00:00:00Z"
    with sqlite3.connect(db_path) as conn:
        conn.execute("UPDATE orders SET expires_at = ? WHERE code = ?", (past_iso, order_code))
        conn.commit()

    body_expired = json.dumps({"id": "evt_expired_order", "content": order_code, "amount": 200000}).encode("utf-8")
    sig_expired = sign_bank_webhook(body_expired, webhook_secret)
    res_expired = client.post(
        "/api/v1/payments/webhook/bank_transfer",
        content=body_expired,
        headers={"x-signature": sig_expired, "content-type": "application/json"},
    )
    assert res_expired.status_code == 200
    assert res_expired.json()["result"] == "order_expired"

    # Kiểm tra: Đơn hàng chuyển sang status 'expired' và chưa được cấp key nào
    with sqlite3.connect(db_path) as conn:
        row = conn.execute("SELECT status FROM orders WHERE code = ?", (order_code,)).fetchone()
        assert row[0] == "expired"
        key_count = conn.execute("SELECT COUNT(*) FROM license_keys lk JOIN orders o ON lk.order_id = o.id WHERE o.code = ?", (order_code,)).fetchone()[0]
        assert key_count == 0


def test_scenario_4_refund_revokes_key_and_validate_returns_revoked(commerce_env):
    """Kịch bản 4: Hoàn tiền -> Thu hồi key -> /license/validate trả revoked."""
    client = commerce_env["client"]
    db_path = commerce_env["db_path"]

    # 1. Tạo và hoàn tất đơn 0đ để lấy key
    res = client.post("/api/v1/shop/orders", json={
        "plan": "perpetual",
        "quantity": 1,
        "customer": {"email": "khach4@example.com", "name": "Khách Hoàn Tiền"},
    })
    issued_key = res.json()["keys"][0]
    order_code = res.json()["order_code"]

    # 2. Máy kích hoạt key thành công
    act_res = client.post("/api/v1/license/activate", json={
        "product": "3t-office",
        "key": issued_key,
        "device_fingerprint": "dev_fp_refund_004",
        "device_name": "PC-HOANTIEN",
        "app_version": "0.9.8",
    })
    assert act_res.status_code == 200
    token = act_res.json()["token"]

    # Kiểm tra validate trước khi thu hồi: còn hiệu lực
    val_before = client.post("/api/v1/license/validate", json={"token": token})
    assert val_before.status_code == 200
    assert val_before.json()["valid"] is True

    # 3. Quản trị viên (owner) hoàn tiền đơn hàng qua admin API
    login_res = client.post("/api/v1/admin/login", json={"username": "admin_owner", "password": "secretpassword123"})
    csrf = login_res.json()["csrf_token"]

    with sqlite3.connect(db_path) as conn:
        oid = conn.execute("SELECT id FROM orders WHERE code = ?", (order_code,)).fetchone()[0]

    refund_res = client.post(
        f"/api/v1/admin/orders/{oid}/refund",
        json={"reason": "Khách hàng đổi ý"},
        headers={"x-csrf-token": csrf},
    )
    assert refund_res.status_code == 200
    assert refund_res.json()["revoked_count"] == 1

    # 4. Kiểm tra lại /license/validate -> Phải trả 403 revoked và valid: False
    val_after = client.post("/api/v1/license/validate", json={"token": token})
    assert val_after.status_code == 403
    assert val_after.json()["error"] == "revoked"
    assert val_after.json()["valid"] is False

    # Kiểm tra /api/v1/license/status -> valid: False, status: revoked
    status_res = client.get(f"/api/v1/license/status?key={issued_key}")
    assert status_res.status_code == 200
    assert status_res.json()["valid"] is False
    assert status_res.json()["status"] == "revoked"


def test_scenario_5_reissue_key_from_customer_portal(commerce_env):
    """Kịch bản 5: Cấp lại key từ Cổng khách hàng -> Key cũ bị vô hiệu, key mới hoạt động."""
    client = commerce_env["client"]
    db_path = commerce_env["db_path"]

    cust_email = "khach5_reissue@example.com"
    # Tạo đơn lấy key
    order_res = client.post("/api/v1/shop/orders", json={
        "plan": "perpetual",
        "quantity": 1,
        "customer": {"email": cust_email, "name": "Ngô Văn E"},
    })
    old_key = order_res.json()["keys"][0]

    # Khách đăng nhập Cổng khách hàng bằng mã 6 số
    code_req = client.post("/api/v1/portal/login", json={"email": cust_email})
    assert code_req.status_code == 200

    # Lấy mã 6 số từ CSDL (thay vì đọc email thật)
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        email_row = conn.execute(
            "SELECT payload_json FROM email_outbox WHERE to_email = ? AND template = 'portal_login_code' ORDER BY rowid DESC",
            (cust_email,),
        ).fetchone()
        code_data = json.loads(email_row["payload_json"])
        code_6 = code_data["code"]

    verify_res = client.post("/api/v1/portal/verify", json={"email": cust_email, "code": code_6})
    assert verify_res.status_code == 200
    assert "portal_session_id" in client.cookies

    # Lấy danh sách key của khách trong cổng
    lic_res = client.get("/api/v1/portal/licenses")
    assert lic_res.status_code == 200
    licenses = lic_res.json()["licenses"]
    assert len(licenses) == 1
    target_lid = licenses[0]["id"]
    assert licenses[0]["status"] == "active"

    # Gọi cấp lại key
    reissue_res = client.post(f"/api/v1/portal/licenses/{target_lid}/reissue")
    assert reissue_res.status_code == 200
    reissue_data = reissue_res.json()
    assert reissue_data["ok"] is True
    new_key = reissue_data["new_key"]
    assert new_key != old_key

    # Kích hoạt thử bằng key cũ -> Phải thất bại 403 revoked
    act_old = client.post("/api/v1/license/activate", json={
        "product": "3t-office",
        "key": old_key,
        "device_fingerprint": "dev_reissue_01",
        "device_name": "PC-OLD",
        "app_version": "0.9.8",
    })
    assert act_old.status_code == 403
    assert act_old.json()["error"] == "revoked"

    # Kích hoạt bằng key mới -> Phải thành công 200
    act_new = client.post("/api/v1/license/activate", json={
        "product": "3t-office",
        "key": new_key,
        "device_fingerprint": "dev_reissue_01",
        "device_name": "PC-NEW",
        "app_version": "0.9.8",
    })
    assert act_new.status_code == 200
    assert act_new.json()["license"]["seats_used"] == 1


def test_scenario_6_role_based_access_control(commerce_env):
    """Kịch bản 6: Phân quyền máy chủ: support không được đánh dấu thu tiền (403), viewer không ghi được (403), không đăng nhập (401), thiếu CSRF (403)."""
    client = commerce_env["client"]
    db_path = commerce_env["db_path"]

    # 1. Chưa đăng nhập -> 401
    assert client.get("/api/v1/admin/orders").status_code == 401
    assert client.get("/api/v1/admin/customers").status_code == 401

    # Tạo đơn mẫu
    order_res = client.post("/api/v1/shop/orders", json={
        "plan": "perpetual",
        "quantity": 1,
        "customer": {"email": "khach6@example.com", "name": "Vũ Văn F"},
    })
    with sqlite3.connect(db_path) as conn:
        oid = conn.execute("SELECT id FROM orders WHERE code = ?", (order_res.json()["order_code"],)).fetchone()[0]

    # 2. Đăng nhập tài khoản SUPPORT
    client.cookies.clear()
    sup_login = client.post("/api/v1/admin/login", json={"username": "support_user", "password": "supportpass123"})
    assert sup_login.status_code == 200
    assert sup_login.json()["role"] == "support"
    sup_csrf = sup_login.json()["csrf_token"]

    # Support xem đơn được (200)
    assert client.get("/api/v1/admin/orders").status_code == 200

    # Support cố tình đánh dấu thu tiền -> 403 Forbidden
    sup_mark = client.post(
        f"/api/v1/admin/orders/{oid}/mark-paid",
        headers={"x-csrf-token": sup_csrf},
    )
    assert sup_mark.status_code == 403
    assert sup_mark.json()["detail"]["error"] == "owner_required"

    # Support cố tình cập nhật giá gói -> 403 Forbidden
    sup_price = client.post(
        "/api/v1/admin/settings/plans/perpetual",
        json={"price_vnd": 999999, "seats_default": 2, "platforms": "windows", "active": True},
        headers={"x-csrf-token": sup_csrf},
    )
    assert sup_price.status_code == 403

    # 3. Đăng nhập tài khoản VIEWER
    client.cookies.clear()
    view_login = client.post("/api/v1/admin/login", json={"username": "viewer_user", "password": "viewerpass123"})
    assert view_login.status_code == 200
    assert view_login.json()["role"] == "viewer"
    view_csrf = view_login.json()["csrf_token"]

    # Viewer xem được (200)
    assert client.get("/api/v1/admin/overview").status_code == 200
    assert client.get("/api/v1/admin/customers").status_code == 200

    # Viewer cố tình ghi bất kỳ thao tác nào -> 403 permission_denied
    view_write = client.post(
        "/api/v1/admin/keys",
        json={"count": 1},
        headers={"x-csrf-token": view_csrf},
    )
    assert view_write.status_code == 403
    assert view_write.json()["detail"]["error"] == "permission_denied"

    # 4. Thiếu CSRF khi đăng nhập vai trò OWNER -> 403 invalid_csrf
    client.cookies.clear()
    owner_login = client.post("/api/v1/admin/login", json={"username": "admin_owner", "password": "secretpassword123"})
    assert owner_login.status_code == 200
    # Gọi ghi mà KHÔNG truyền x-csrf-token
    no_csrf = client.post(f"/api/v1/admin/orders/{oid}/mark-paid")
    assert no_csrf.status_code == 403
    assert no_csrf.json()["detail"]["error"] == "invalid_csrf"


def test_scenario_7_rate_limit_and_real_ip_lockout(commerce_env):
    """Kịch bản 7: Giới hạn tốc độ và khóa tạm theo IP thật (CF-Connecting-IP)."""
    client = commerce_env["client"]

    # Giả lập IP 203.0.113.88 gửi 5 lần đăng nhập sai
    attacker_ip = "203.0.113.88"
    headers = {"cf-connecting-ip": attacker_ip}

    for i in range(4):
        res = client.post("/api/v1/admin/login", json={"username": "admin_owner", "password": "wrongpassword"}, headers=headers)
        assert res.status_code == 401
        assert res.json()["attempts_left"] == 4 - i

    # Lần 5 sai -> Bị khóa
    res5 = client.post("/api/v1/admin/login", json={"username": "admin_owner", "password": "wrongpassword"}, headers=headers)
    assert res5.status_code == 401
    assert res5.json()["attempts_left"] == 0

    # Lần 6 từ IP đó -> Trả 429
    res6 = client.post("/api/v1/admin/login", json={"username": "admin_owner", "password": "secretpassword123"}, headers=headers)
    assert res6.status_code == 429
    assert res6.json()["error"] == "temporarily_locked"

    # Trong khi IP KHÁC (198.51.100.12) vẫn đăng nhập bình thường
    clean_ip = "198.51.100.12"
    res_clean = client.post("/api/v1/admin/login", json={"username": "admin_owner", "password": "secretpassword123"}, headers={"cf-connecting-ip": clean_ip})
    assert res_clean.status_code == 200
    assert res_clean.json()["ok"] is True


def test_security_checks_no_secrets_in_logs_and_malformed_inputs(commerce_env):
    """Kiểm tra bảo mật bổ sung: Không lưu mật khẩu/key vào audit log, chống replay, đầu vào dị dạng."""
    client = commerce_env["client"]
    db_path = commerce_env["db_path"]

    # 1. Đăng nhập và tạo key
    login = client.post("/api/v1/admin/login", json={"username": "admin_owner", "password": "secretpassword123"})
    csrf = login.json()["csrf_token"]

    create_res = client.post("/api/v1/admin/keys", json={"count": 2, "note": "Test Security"}, headers={"x-csrf-token": csrf})
    assert create_res.status_code == 200
    keys = create_res.json()["keys"]

    # 2. Đọc bảng admin_audit: Tuyệt đối không chứa raw key hoặc mật khẩu
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        logs = conn.execute("SELECT * FROM admin_audit").fetchall()
        for log in logs:
            target_str = str(log["target"])
            assert "secretpassword123" not in target_str
            for k in keys:
                assert k not in target_str
                # Chỉ được lưu hint (4 ký tự cuối)
                assert k[-4:] in target_str or "count=" in target_str or "admin_owner" in target_str

    # 3. Đầu vào dị dạng: JSON rác, trường lạ, kiểu dữ liệu sai -> Trả 422 hoặc 400
    malformed_json = client.post("/api/v1/shop/orders", content=b"INVALID_JSON_BODY", headers={"content-type": "application/json"})
    assert malformed_json.status_code == 422

    # Extra forbidden field
    extra_field = client.post("/api/v1/shop/orders", json={
        "plan": "perpetual",
        "quantity": 1,
        "customer": {"email": "abc@def.vn", "name": "Test"},
        "malicious_extra_field": "hacked",
    })
    assert extra_field.status_code == 422


def test_owner_totp_2fa_enforcement(commerce_env):
    """Kiểm tra quy trình bắt buộc 2FA TOTP cho vai trò Owner:
    1. Đăng nhập lần đầu khi chưa setup -> requires_totp_setup: True
    2. Khởi tạo khóa TOTP và xác thực thành công
    3. Đăng nhập sau đó BẮT BUỘC có totp_code (thiếu -> 403, sai -> 401, đúng -> 200).
    """
    client = commerce_env["client"]
    db_path = commerce_env["db_path"]

    # 1. Đăng nhập ban đầu (chưa cấu hình TOTP)
    login1 = client.post("/api/v1/admin/login", json={"username": "admin_owner", "password": "secretpassword123"})
    assert login1.status_code == 200
    assert login1.json()["role"] == "owner"
    assert login1.json().get("requires_totp_setup") is True
    csrf = login1.json()["csrf_token"]

    # 2. Khởi tạo TOTP bí mật
    setup_res = client.post("/api/v1/admin/setup-totp", headers={"x-csrf-token": csrf})
    assert setup_res.status_code == 200
    secret = setup_res.json()["secret"]
    assert len(secret) >= 16
    assert "otpauth://" in setup_res.json()["otpauth_url"]

    # Xác thực mã TOTP đầu tiên
    valid_code = get_totp_code(secret)
    verify_res = client.post(
        "/api/v1/admin/verify-totp",
        json={"secret": secret, "totp_code": valid_code},
        headers={"x-csrf-token": csrf},
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["ok"] is True

    # Kiểm tra CSDL: user đã có totp_secret_enc
    with sqlite3.connect(db_path) as conn:
        u_row = conn.execute("SELECT totp_secret_enc FROM admin_users WHERE username = 'admin_owner'").fetchone()
        assert u_row is not None
        assert u_row[0] == secret

    # 3. Đăng xuất (xóa cookie phiên)
    client.cookies.clear()

    # 3a. Đăng nhập lại KHÔNG truyền mã TOTP -> 403 totp_required
    login_no_totp = client.post("/api/v1/admin/login", json={"username": "admin_owner", "password": "secretpassword123"})
    assert login_no_totp.status_code == 403
    assert login_no_totp.json()["error"] == "totp_required"

    # 3b. Đăng nhập với mã TOTP SAI -> 401 invalid_totp
    login_bad_totp = client.post(
        "/api/v1/admin/login",
        json={"username": "admin_owner", "password": "secretpassword123", "totp_code": "000000"},
    )
    assert login_bad_totp.status_code == 401
    assert login_bad_totp.json()["error"] == "invalid_totp"

    # 3c. Đăng nhập với mã TOTP ĐÚNG -> 200 thành công
    fresh_code = get_totp_code(secret)
    login_ok_totp = client.post(
        "/api/v1/admin/login",
        json={"username": "admin_owner", "password": "secretpassword123", "totp_code": fresh_code},
    )
    assert login_ok_totp.status_code == 200
    assert login_ok_totp.json()["ok"] is True
    assert login_ok_totp.json()["role"] == "owner"


def test_customer_portal_full_management(commerce_env):
    """Kiểm tra trọn vẹn nghiệp vụ Cổng khách hàng (Customer Portal):
    - Đăng nhập mã 6 số gửi qua email
    - Xem hồ sơ khách /portal/me
    - Xem lịch sử đơn hàng /portal/orders
    - Quản lý danh sách thiết bị /portal/devices và gỡ máy /portal/devices/{id}/remove
    - Kích hoạt ngoại tuyến /portal/offline-activation
    """
    client = commerce_env["client"]
    db_path = commerce_env["db_path"]
    client.cookies.clear()

    cust_email = "khach_portal_full@example.vn"
    # 1. Tạo đơn mua bản quyền
    order_res = client.post("/api/v1/shop/orders", json={
        "plan": "perpetual",
        "quantity": 1,
        "customer": {
            "email": cust_email,
            "name": "Đặng Thị Thảo",
            "phone": "0934567890",
            "company": "Công ty TNHH Phần Mềm",
            "tax_code": "0109988776",
        },
    })
    assert order_res.status_code == 200
    issued_key = order_res.json()["keys"][0]
    order_code = order_res.json()["order_code"]

    # 2. Kích hoạt 1 máy với key
    act_res = client.post("/api/v1/license/activate", json={
        "product": "3t-office",
        "key": issued_key,
        "device_fingerprint": "dev_fp_full_pt_01",
        "device_name": "PC-LAPTOP-THAO",
        "app_version": "0.9.8",
        "platform": "windows",
    })
    assert act_res.status_code == 200

    # 3. Đăng nhập Cổng khách hàng bằng mã 6 số
    code_req = client.post("/api/v1/portal/login", json={"email": cust_email})
    assert code_req.status_code == 200

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        outbox_row = conn.execute(
            "SELECT payload_json FROM email_outbox WHERE to_email = ? AND template = 'portal_login_code' ORDER BY rowid DESC",
            (cust_email,),
        ).fetchone()
        code_6 = json.loads(outbox_row["payload_json"])["code"]

    # Nhập sai mã -> 400 invalid_code
    bad_verify = client.post("/api/v1/portal/verify", json={"email": cust_email, "code": "999999"})
    assert bad_verify.status_code == 400
    assert bad_verify.json()["error"] == "invalid_code"

    # Nhập đúng mã -> 200 và có cookie session
    ok_verify = client.post("/api/v1/portal/verify", json={"email": cust_email, "code": code_6})
    assert ok_verify.status_code == 200

    # 4. GET /portal/me
    me_res = client.get("/api/v1/portal/me")
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == cust_email
    assert me_data["full_name"] == "Đặng Thị Thảo"
    assert me_data["company_name"] == "Công ty TNHH Phần Mềm"

    # 5. GET /portal/orders
    orders_res = client.get("/api/v1/portal/orders")
    assert orders_res.status_code == 200
    orders = orders_res.json()["orders"]
    assert len(orders) >= 1
    found_order = next((o for o in orders if o["code"] == order_code), None)
    assert found_order is not None
    assert found_order["status"] == "fulfilled"

    # 6. GET /portal/devices
    dev_res = client.get("/api/v1/portal/devices")
    assert dev_res.status_code == 200
    devices = dev_res.json()["devices"]
    assert len(devices) >= 1
    target_dev = next((d for d in devices if d["device_name"] == "PC-LAPTOP-THAO"), None)
    assert target_dev is not None
    dev_id = target_dev["id"]

    # 7. POST /portal/devices/{id}/remove -> Gỡ máy thành công
    remove_res = client.post(f"/api/v1/portal/devices/{dev_id}/remove")
    assert remove_res.status_code == 200
    assert remove_res.json()["ok"] is True

    # Kiểm tra lại /portal/devices: danh sách máy hoạt động không còn máy này
    dev_after = client.get("/api/v1/portal/devices")
    active_after = [d for d in dev_after.json()["devices"] if d["id"] == dev_id]
    assert len(active_after) == 0

    # 8. POST /portal/offline-activation -> Kích hoạt ngoại tuyến
    offline_res = client.post("/api/v1/portal/offline-activation", json={
        "key": issued_key,
        "device_code": "device_fingerprint_offline_machine_555",
        "device_name": "PC-MAY-OFFLINE",
    })
    assert offline_res.status_code == 200
    assert "activation_code" in offline_res.json()
    assert len(offline_res.json()["activation_code"]) > 20


def test_email_outbox_encryption_and_dispatch(commerce_env):
    """Kiểm tra module Email Outbox & SMTP Dispatcher:
    - Mã hóa payload AES-256-GCM, không lưu key thô dạng văn bản rõ
    - Render mẫu email chuẩn tiếng Việt
    - Gửi nền (dispatch) cập nhật trạng thái 'sent' và 'failed' kèm xử lý lỗi.
    """
    import smtplib
    from emails.service import EmailService, encrypt_payload, decrypt_payload
    from emails.templates import render_template
    db_path = commerce_env["db_path"]
    secret_key = "test_encryption_secret_key_32bytes"

    # 1. Kiểm tra mã hóa và giải mã AES-256-GCM
    sample_data = {"raw_keys": ["3TO-TEST-ABCD-EFGH-1234"]}
    enc_token = encrypt_payload(sample_data, secret_key)
    assert enc_token != json.dumps(sample_data)
    dec = decrypt_payload(enc_token, secret_key)
    assert dec == sample_data

    # Giải mã bằng secret sai -> trả None
    assert decrypt_payload(enc_token, "wrong_secret_key_abcdef") is None

    # 2. Xếp email vào CSDL với EmailService
    svc = EmailService(
        smtp_host="smtp.example.com",
        smtp_port=587,
        smtp_user="test@example.com",
        smtp_password="testpassword",
    )
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        email_id = svc.queue_email(
            conn=conn,
            to_email="khach_outbox@example.vn",
            template="order_fulfilled",
            data={"customer_name": "Trần Thị C", "order_code": "3T-261004-TEST"},
            raw_keys=["3TO-SECRET-KEY-1111"],
            encryption_secret=secret_key,
        )
        conn.commit()

        # Kiểm tra CSDL: KHÔNG chứa key thô dạng plaintext
        row = conn.execute("SELECT * FROM email_outbox WHERE id = ?", (email_id,)).fetchone()
        assert row is not None
        assert row["status"] == "queued"
        assert "3TO-SECRET-KEY-1111" not in row["payload_json"]
        # Phải chứa key_hints
        assert "1111" in row["payload_json"]

    # 3. Giả lập gửi thành công
    sent_messages = []
    def mock_send(to_email, subject, body_text):
        sent_messages.append((to_email, subject, body_text))

    svc.send_smtp_message = mock_send

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        res = svc.dispatch_queued_emails(conn, encryption_secret=secret_key)
        assert res["sent"] >= 1
        assert res["failed"] == 0

        # Kiểm tra trạng thái đã chuyển thành sent
        updated_row = conn.execute("SELECT status, sent_at FROM email_outbox WHERE id = ?", (email_id,)).fetchone()
        assert updated_row["status"] == "sent"
        assert updated_row["sent_at"] is not None

    # Đảm bảo nội dung email gửi đi có key sau khi giải mã
    assert len(sent_messages) >= 1
    target_msg = next((m for m in sent_messages if m[0] == "khach_outbox@example.vn"), None)
    assert target_msg is not None
    assert "3TO-SECRET-KEY-1111" in target_msg[2]

    # 4. Giả lập gửi thất bại (SMTP ném ngoại lệ)
    def mock_send_fail(to_email, subject, body_text):
        raise smtplib.SMTPException("Kết nối máy chủ gửi thư bị từ chối")

    svc.send_smtp_message = mock_send_fail

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        fail_email_id = svc.queue_email(
            conn=conn,
            to_email="khach_fail@example.vn",
            template="portal_login_code",
            data={"code": "123456", "expires_minutes": 15},
        )
        conn.commit()

        res_fail = svc.dispatch_queued_emails(conn)
        assert res_fail["failed"] >= 1

        fail_row = conn.execute("SELECT status, attempts, last_error FROM email_outbox WHERE id = ?", (fail_email_id,)).fetchone()
        assert fail_row["status"] == "queued"
        assert fail_row["attempts"] == 1
        assert "SMTPException" in fail_row["last_error"]



def _post_webhook(client, payload: dict, secret: str = TEST_WEBHOOK_SECRET, signature: str | None = None):
    body = json.dumps(payload).encode("utf-8")
    sig = signature if signature is not None else sign_bank_webhook(body, secret)
    return client.post(
        "/api/v1/payments/webhook/bank_transfer",
        content=body,
        headers={"x-signature": sig, "content-type": "application/json"},
    )


def _make_paid_order(client, db_path, email: str, price: int = 300000) -> str:
    with sqlite3.connect(db_path) as conn:
        conn.execute("UPDATE plans SET price_vnd = ? WHERE code = 'perpetual'", (price,))
        conn.commit()
    res = client.post("/api/v1/shop/orders", json={"plan": "perpetual", "quantity": 1, "customer": {"email": email, "name": "Khach"}, "source": "web"})
    assert res.status_code == 200, res.text
    return res.json()["order_code"]


def test_forged_webhook_cannot_reserve_a_real_event_id(commerce_env):
    """An unsigned sender must not be able to make a genuine payment look like a duplicate."""
    client, db_path = commerce_env["client"], commerce_env["db_path"]
    order_code = _make_paid_order(client, db_path, "poison@example.com")
    forged = _post_webhook(client, {"id": "evt_reserved", "content": order_code, "amount": 300000}, signature="deadbeef")
    assert forged.status_code == 400
    genuine = _post_webhook(client, {"id": "evt_reserved", "content": order_code, "amount": 300000})
    assert genuine.status_code == 200
    assert genuine.json().get("result") == "fulfilled", genuine.text
    assert genuine.json().get("duplicate") is not True


def test_oversized_webhook_body_is_rejected(commerce_env):
    client = commerce_env["client"]
    big = {"id": "evt_big", "content": "x" * 70000, "amount": 1}
    assert _post_webhook(client, big).status_code == 413


def test_server_without_payment_configuration_fails_closed(commerce_env):
    """No built-in secret or bank account: unconfigured means no paid orders and no accepted webhooks."""
    from payments import PAYMENT_ADAPTERS

    client, db_path = commerce_env["client"], commerce_env["db_path"]
    order_code = _make_paid_order(client, db_path, "closed@example.com", 250000)
    adapter = PAYMENT_ADAPTERS["bank_transfer"]
    saved = (adapter.bank_code, adapter.bank_account, adapter.account_holder, adapter.webhook_secret)
    adapter.configure(bank_code="", bank_account="", account_holder="", webhook_secret="")
    try:
        # A webhook signed with the old hard-coded string must be refused, not accepted.
        refused = _post_webhook(client, {"id": "evt_old_default", "content": order_code, "amount": 250000},
                                secret="3t-webhook-secret-key-for-bank-reconcile")
        assert refused.status_code == 400
        with sqlite3.connect(db_path) as conn:
            issued = conn.execute("SELECT COUNT(*) FROM license_keys lk JOIN orders o ON lk.order_id = o.id WHERE o.code = ?",
                                  (order_code,)).fetchone()[0]
        assert issued == 0
        # A new paid order cannot be created without a configured receiving account.
        order = client.post("/api/v1/shop/orders", json={"plan": "perpetual", "quantity": 1,
                                                          "customer": {"email": "noacct@example.com", "name": "Khach"}, "source": "web"})
        assert order.status_code == 503
        assert order.json()["error"] == "payment_not_configured"
    finally:
        adapter.configure(bank_code=saved[0], bank_account=saved[1], account_holder=saved[2], webhook_secret=saved[3])
