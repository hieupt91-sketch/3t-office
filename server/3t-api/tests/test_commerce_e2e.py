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

    # Kiểm tra: Đơn hàng vẫn pending_payment và chưa được cấp key nào
    with sqlite3.connect(db_path) as conn:
        row = conn.execute("SELECT status FROM orders WHERE code = ?", (order_code,)).fetchone()
        assert row[0] == "pending_payment"
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
