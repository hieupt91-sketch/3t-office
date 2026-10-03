"""Bộ kiểm thử đơn vị cho toàn bộ API quản trị (Admin API) của 3T Office."""

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


@pytest.fixture
def keypair():
    priv = ed25519.Ed25519PrivateKey.generate()
    pub = priv.public_key()
    priv_raw = priv.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption(),
    )
    priv_b64 = base64.b64encode(priv_raw).decode("ascii")
    return priv_b64


@pytest.fixture
def admin_env(tmp_path: Path, keypair):
    priv_b64 = keypair
    data_dir = tmp_path / "data"
    updates_dir = tmp_path / "updates"
    reports_dir = tmp_path / "reports"
    backups_dir = tmp_path / "backups"
    logs_dir = tmp_path / "logs"
    downloads_dir = tmp_path / "downloads"
    downloads_dir.mkdir(parents=True, exist_ok=True)

    # Tạo tệp cài đặt mẫu trong downloads_dir
    sample_installer = downloads_dir / "3t-office-setup-0.9.7.exe"
    sample_installer.write_bytes(b"dummy installer binary data for testing")

    # Tạo kênh cập nhật mẫu
    ch_dir = updates_dir / "channels"
    ch_dir.mkdir(parents=True, exist_ok=True)
    (ch_dir / "stable.json").write_text(json.dumps({
        "channel": "stable",
        "version": "0.9.7",
        "date": "2026-10-03",
        "manifest_sha256": "abcdef123456",
    }), encoding="utf-8")

    settings = Settings(
        data_dir=data_dir,
        updates_dir=updates_dir,
        reports_dir=reports_dir,
        backups_dir=backups_dir,
        logs_dir=logs_dir,
        downloads_dir=downloads_dir,
        install_token_secret="a" * 32,
        admin_username="admin",
        admin_password="secretpassword123",
        product="3t-office",
        license_signing_key=priv_b64,
    )
    app = create_app(settings)
    client = TestClient(app, base_url="https://testserver")
    db_path = data_dir / "3t-office-cloud.sqlite3"
    return {
        "client": client,
        "db_path": db_path,
        "settings": settings,
        "downloads_dir": downloads_dir,
    }


def test_admin_disabled_when_empty_password(tmp_path: Path):
    """Admin API không mở khi ADMIN_PASSWORD rỗng."""
    settings = Settings(
        data_dir=tmp_path / "data",
        updates_dir=tmp_path / "updates",
        reports_dir=tmp_path / "reports",
        backups_dir=tmp_path / "backups",
        logs_dir=tmp_path / "logs",
        install_token_secret="a" * 32,
        admin_username="admin",
        admin_password="",  # Rỗng
    )
    # create_app ném RuntimeError khi ADMIN_PASSWORD rỗng lúc khởi tạo
    with pytest.raises(RuntimeError):
        create_app(settings)


def test_admin_unauthorized_when_not_logged_in(admin_env):
    """Chưa đăng nhập -> 401 khi truy cập các endpoint quản trị."""
    client = admin_env["client"]
    assert client.get("/api/v1/admin/me").status_code == 401
    assert client.get("/api/v1/admin/overview").status_code == 401
    assert client.get("/api/v1/admin/keys").status_code == 401
    assert client.post("/api/v1/admin/keys", json={"count": 1}).status_code == 401
    assert client.get("/api/v1/admin/audit").status_code == 401
    assert client.get("/api/v1/admin/releases").status_code == 401


def test_admin_login_lockout_after_5_failures(admin_env):
    """Khóa tạm thời sau 5 lần đăng nhập sai mật khẩu."""
    client = admin_env["client"]

    for i in range(4):
        res = client.post("/api/v1/admin/login", json={"username": "admin", "password": "wrongpassword"})
        assert res.status_code == 401
        assert res.json()["error"] == "invalid_credentials"
        assert res.json()["attempts_left"] == 4 - i

    # Lần thứ 5 sai -> bị khóa
    res5 = client.post("/api/v1/admin/login", json={"username": "admin", "password": "wrongpassword"})
    assert res5.status_code == 401
    assert res5.json()["attempts_left"] == 0

    # Lần thứ 6 -> Trả 429 tạm khóa
    res6 = client.post("/api/v1/admin/login", json={"username": "admin", "password": "wrongpassword"})
    assert res6.status_code == 429
    assert res6.json()["error"] == "temporarily_locked"


def test_admin_login_success_and_cookie_session(admin_env):
    """Đăng nhập thành công, nhận cookie phiên HttpOnly; Secure; SameSite=Strict và CSRF token."""
    client = admin_env["client"]

    res = client.post("/api/v1/admin/login", json={"username": "admin", "password": "secretpassword123"})
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["admin"] == "admin"
    assert "csrf_token" in data
    assert "session_id" in client.cookies

    # Kiểm tra /api/v1/admin/me
    res_me = client.get("/api/v1/admin/me")
    assert res_me.status_code == 200
    assert res_me.json()["authenticated"] is True
    assert res_me.json()["admin"] == "admin"


def test_csrf_protection_on_write_operations(admin_env):
    """Thiếu hoặc sai CSRF token trong thao tác ghi khi dùng cookie phiên -> 403."""
    client = admin_env["client"]

    # Đăng nhập lấy cookie
    login_res = client.post("/api/v1/admin/login", json={"username": "admin", "password": "secretpassword123"})
    assert login_res.status_code == 200
    csrf_token = login_res.json()["csrf_token"]

    # Thao tác ghi POST không có header x-csrf-token -> 403
    res_no_csrf = client.post("/api/v1/admin/keys", json={"count": 1})
    assert res_no_csrf.status_code == 403

    # Thao tác ghi POST với csrf sai -> 403
    res_bad_csrf = client.post("/api/v1/admin/keys", json={"count": 1}, headers={"x-csrf-token": "wrong-csrf"})
    assert res_bad_csrf.status_code == 403

    # Thao tác ghi POST với csrf đúng -> 200
    res_ok = client.post("/api/v1/admin/keys", json={"count": 1}, headers={"x-csrf-token": csrf_token})
    assert res_ok.status_code == 200


def test_create_keys_returns_once_and_db_has_no_raw_keys(admin_env):
    """Tạo key trả danh sách key MỘT LẦN DUY NHẤT và DB trực tiếp không chứa key gốc."""
    client = admin_env["client"]
    db_path = admin_env["db_path"]

    login_res = client.post("/api/v1/admin/login", json={"username": "admin", "password": "secretpassword123"})
    csrf = login_res.json()["csrf_token"]

    # Tạo 5 key
    create_res = client.post(
        "/api/v1/admin/keys",
        json={"count": 5, "note": "Khách hàng Doanh nghiệp ABC", "email": "abc@corp.vn", "seats_max": 3},
        headers={"x-csrf-token": csrf},
    )
    assert create_res.status_code == 200
    data = create_res.json()
    assert data["count"] == 5
    assert len(data["keys"]) == 5
    created_keys = data["keys"]

    for k in created_keys:
        assert k.startswith("3TO-")
        assert lic_mod.normalize_and_validate_key(k) == k

    # Đọc TRỰC TIẾP SQLite để xác nhận cơ sở dữ liệu KHÔNG chứa key gốc
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT * FROM license_keys").fetchall()
        assert len(rows) == 5
        for row in rows:
            row_dict = dict(row)
            # Chỉ có key_hash và key_hint
            assert "key_hash" in row_dict
            assert "key_hint" in row_dict
            # Đảm bảo tuyệt đối không lưu raw key trong bất cứ cột nào
            for val in row_dict.values():
                val_str = str(val)
                for raw_k in created_keys:
                    assert raw_k not in val_str

        # Kiểm tra admin_audit cũng không chứa key gốc
        audit_rows = conn.execute("SELECT * FROM admin_audit").fetchall()
        for a_row in audit_rows:
            target_str = str(a_row["target"])
            for raw_k in created_keys:
                assert raw_k not in target_str


def test_reissue_key_revokes_old_and_issues_new(admin_env):
    """Cấp lại key: thu hồi key cũ, tạo key mới cùng cấu hình."""
    client = admin_env["client"]
    db_path = admin_env["db_path"]

    login_res = client.post("/api/v1/admin/login", json={"username": "admin", "password": "secretpassword123"})
    csrf = login_res.json()["csrf_token"]

    # Tạo 1 key ban đầu
    cr = client.post(
        "/api/v1/admin/keys",
        json={"count": 1, "note": "Key Cần Cấp Lại", "email": "user@old.com", "seats_max": 4},
        headers={"x-csrf-token": csrf},
    )
    old_raw_key = cr.json()["keys"][0]

    # Lấy id của key cũ từ danh sách
    list_res = client.get("/api/v1/admin/keys?q=old.com")
    assert list_res.status_code == 200
    old_key_info = list_res.json()["keys"][0]
    old_id = old_key_info["id"]
    assert old_key_info["status"] == "active"

    # Gọi cấp lại (reissue)
    reissue_res = client.post(f"/api/v1/admin/keys/{old_id}/reissue", headers={"x-csrf-token": csrf})
    assert reissue_res.status_code == 200
    r_data = reissue_res.json()
    assert r_data["ok"] is True
    assert r_data["old_id"] == old_id
    new_raw_key = r_data["key"]
    assert new_raw_key != old_raw_key
    assert r_data["seats_max"] == 4
    assert r_data["note"] == "Key Cần Cấp Lại"

    # Xác nhận key cũ trong DB đã chuyển sang 'revoked'
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        old_row = conn.execute("SELECT status, revoked_at FROM license_keys WHERE id = ?", (old_id,)).fetchone()
        assert old_row["status"] == "revoked"
        assert old_row["revoked_at"] is not None

        # Key mới đang active
        new_row = conn.execute("SELECT status FROM license_keys WHERE id = ?", (r_data["new_id"],)).fetchone()
        assert new_row["status"] == "active"


def test_update_seats_and_remove_device(admin_env):
    """Cập nhật số máy tối đa và gỡ thiết bị kích hoạt."""
    client = admin_env["client"]

    login_res = client.post("/api/v1/admin/login", json={"username": "admin", "password": "secretpassword123"})
    csrf = login_res.json()["csrf_token"]

    # Tạo 1 key với 1 máy
    cr = client.post(
        "/api/v1/admin/keys",
        json={"count": 1, "note": "Test Seats", "seats_max": 1},
        headers={"x-csrf-token": csrf},
    )
    raw_key = cr.json()["keys"][0]

    # Kích hoạt máy 1
    act_res = client.post("/api/v1/license/activate", json={
        "product": "3t-office",
        "key": raw_key,
        "device_fingerprint": "dev-fp-seat-1",
        "device_name": "PC Seat 1",
        "app_version": "0.9.7",
    })
    assert act_res.status_code == 200
    lid = act_res.json()["license"]["id"]

    # Kích hoạt máy 2 -> 409 do seats_max=1
    act_res2 = client.post("/api/v1/license/activate", json={
        "product": "3t-office",
        "key": raw_key,
        "device_fingerprint": "dev-fp-seat-2",
        "device_name": "PC Seat 2",
        "app_version": "0.9.7",
    })
    assert act_res2.status_code == 409

    # Sửa seats_max lên 2
    seats_res = client.post(f"/api/v1/admin/keys/{lid}/seats", json={"seats_max": 2}, headers={"x-csrf-token": csrf})
    assert seats_res.status_code == 200
    assert seats_res.json()["seats_max"] == 2

    # Giờ kích hoạt máy 2 -> thành công
    act_res2_again = client.post("/api/v1/license/activate", json={
        "product": "3t-office",
        "key": raw_key,
        "device_fingerprint": "dev-fp-seat-2",
        "device_name": "PC Seat 2",
        "app_version": "0.9.7",
    })
    assert act_res2_again.status_code == 200

    # Lấy chi tiết key để xem activations
    detail_res = client.get(f"/api/v1/admin/keys/{lid}")
    assert detail_res.status_code == 200
    activations = detail_res.json()["activations"]
    assert len(activations) == 2
    device_to_remove = activations[0]["id"]

    # Gỡ máy 1
    rm_res = client.post(f"/api/v1/admin/keys/{lid}/devices/{device_to_remove}/remove", headers={"x-csrf-token": csrf})
    assert rm_res.status_code == 200

    # Kiểm tra seats_used giảm còn 1
    detail_after = client.get(f"/api/v1/admin/keys/{lid}")
    assert detail_after.json()["key"]["seats_used"] == 1


def test_admin_overview_releases_and_audit(admin_env):
    """Kiểm tra overview, releases (kênh + bộ cài kèm sha256), và nhật ký audit."""
    client = admin_env["client"]

    login_res = client.post("/api/v1/admin/login", json={"username": "admin", "password": "secretpassword123"})
    csrf = login_res.json()["csrf_token"]

    # Overview
    ov_res = client.get("/api/v1/admin/overview")
    assert ov_res.status_code == 200
    ov = ov_res.json()
    assert "total_keys" in ov
    assert "active_keys" in ov
    assert "channels" in ov

    # Releases
    rel_res = client.get("/api/v1/admin/releases")
    assert rel_res.status_code == 200
    rel = rel_res.json()
    assert len(rel["channels"]) >= 1
    assert rel["channels"][0]["channel"] == "stable"
    assert len(rel["downloads"]) >= 1
    assert "sha256" in rel["downloads"][0]
    assert rel["downloads"][0]["file_name"] == "3t-office-setup-0.9.7.exe"

    # Audit
    audit_res = client.get("/api/v1/admin/audit")
    assert audit_res.status_code == 200
    logs = audit_res.json()["audit_logs"]
    assert len(logs) >= 1
    assert logs[0]["admin"] == "admin"
