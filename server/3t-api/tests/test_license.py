"""Bộ kiểm thử đơn vị và tích hợp cho hệ thống bản quyền 3T Office."""

from __future__ import annotations

import base64
import hashlib
import hmac
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
    pub_raw = pub.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    pub_b64 = base64.b64encode(pub_raw).decode("ascii")
    return priv, pub, priv_b64, pub_b64


@pytest.fixture
def test_env(tmp_path: Path, keypair):
    _, _, priv_b64, pub_b64 = keypair
    data_dir = tmp_path / "data"
    updates_dir = tmp_path / "updates"
    reports_dir = tmp_path / "reports"
    backups_dir = tmp_path / "backups"
    logs_dir = tmp_path / "logs"

    settings = Settings(
        data_dir=data_dir,
        updates_dir=updates_dir,
        reports_dir=reports_dir,
        backups_dir=backups_dir,
        logs_dir=logs_dir,
        install_token_secret="a" * 32,
        admin_username="admin",
        admin_password="secretpassword123",
        product="3t-office",
        license_signing_key=priv_b64,
    )
    app = create_app(settings)
    client = TestClient(app)
    db_path = data_dir / "3t-office-cloud.sqlite3"
    return {
        "client": client,
        "db_path": db_path,
        "settings": settings,
        "pub_key_b64": pub_b64,
        "priv_b64": priv_b64,
    }


def _seed_key(db_path: Path, raw_key: str, seats_max: int = 2, note: str = "Test User", status: str = "active") -> str:
    norm = lic_mod.normalize_and_validate_key(raw_key)
    assert norm is not None
    khash = lic_mod.hash_key(norm)
    khint = lic_mod.extract_hint(norm)
    lid = str(uuid.uuid4())
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """INSERT INTO license_keys (id, key_hash, key_hint, note, email, seats_max, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (lid, khash, khint, note, "user@example.com", seats_max, status, lic_mod.now_utc_iso()),
        )
    return lid


# 1. Kiểm thử sinh key & checksum
def test_key_generation_and_checksum():
    key = lic_mod.generate_license_key()
    assert key.startswith("3TO-")
    parts = key.split("-")
    assert len(parts) == 5
    for p in parts[1:]:
        assert len(p) == 5

    # Chuẩn hóa & kiểm tra tính hợp lệ
    norm = lic_mod.normalize_and_validate_key(key)
    assert norm == key

    # Crockford: bỏ I, L, O, U
    raw_chars = "".join(parts[1:])
    for bad_char in ("I", "L", "O", "U"):
        assert bad_char not in raw_chars

    # Tự động sửa nhầm ký tự: 'o' -> '0', 'i' -> '1', 'l' -> '1'
    typo_key = key.replace("-", "").lower()
    typo_key = typo_key.replace("0", "o").replace("1", "i")
    norm_typo = lic_mod.normalize_and_validate_key(typo_key)
    assert norm_typo == key

    # Sửa 1 ký tự bất kỳ -> checksum phải phát hiện và từ chối
    body = list("".join(parts[1:]))
    orig_char = body[0]
    body[0] = "A" if orig_char != "A" else "B"
    bad_key = f"3TO-{body[0]}{''.join(body[1:5])}-{''.join(body[5:10])}-{''.join(body[10:15])}-{''.join(body[15:20])}"
    assert lic_mod.normalize_and_validate_key(bad_key) is None

    # Đổi 2 ký tự liền kề -> checksum phát hiện (chọn cặp không cách nhau đúng 16)
    body2 = list("".join(parts[1:]))
    for i in range(18):
        c0, c1 = body2[i], body2[i + 1]
        v0, v1 = lic_mod.CHAR_TO_VAL[c0], lic_mod.CHAR_TO_VAL[c1]
        if v0 != v1 and abs(v0 - v1) != 16:
            body2[i], body2[i + 1] = body2[i + 1], body2[i]
            swapped_key = f"3TO-{''.join(body2[0:5])}-{''.join(body2[5:10])}-{''.join(body2[10:15])}-{''.join(body2[15:20])}"
            assert lic_mod.normalize_and_validate_key(swapped_key) is None
            break



# 2. Kiểm thử token Ed25519 và phát hiện can thiệp (tamper resistance)
def test_token_sign_verify_and_tamper(keypair):
    priv, pub, _, _ = keypair
    token, next_check = lic_mod.issue_license_token(
        priv,
        license_id="test-lic-1",
        device_fingerprint="fp-device-12345",
        key_hint="WXYZ",
        check_days=30,
    )
    assert "." in token
    claims = lic_mod.verify_license_token(token, pub)
    assert claims is not None
    assert claims["lid"] == "test-lic-1"
    assert claims["fp"] == "fp-device-12345"
    assert claims["key_hint"] == "…WXYZ"
    assert claims["edition"] == "perpetual"
    assert claims["check_by"] > time.time()

    # Can thiệp sửa 1 byte ở payload -> từ chối
    p_b64, s_b64 = token.split(".", 1)
    p_bytes = lic_mod.b64url_decode(p_b64)
    tampered_p_bytes = p_bytes[:-1] + bytes([p_bytes[-1] ^ 0x01])
    tampered_token_p = f"{lic_mod.b64url_encode(tampered_p_bytes)}.{s_b64}"
    assert lic_mod.verify_license_token(tampered_token_p, pub) is None

    # Can thiệp sửa 1 byte ở chữ ký -> từ chối
    s_bytes = lic_mod.b64url_decode(s_b64)
    tampered_s_bytes = s_bytes[:-1] + bytes([s_bytes[-1] ^ 0x01])
    tampered_token_s = f"{p_b64}.{lic_mod.b64url_encode(tampered_s_bytes)}"
    assert lic_mod.verify_license_token(tampered_token_s, pub) is None


# 3. Kích hoạt đúng, kích hoạt lại cùng máy không tốn chỗ, kích hoạt hết chỗ
def test_license_activate_flow(test_env):
    client = test_env["client"]
    db_path = test_env["db_path"]

    raw_key = lic_mod.generate_license_key()
    lid = _seed_key(db_path, raw_key, seats_max=2)

    # Lần 1: Kích hoạt Máy A
    res = client.post("/api/v1/license/activate", json={
        "product": "3t-office",
        "key": raw_key,
        "device_fingerprint": "device-fingerprint-pc-a-12345678",
        "device_name": "PC May A",
        "app_version": "0.9.7",
    })
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["license"]["seats_used"] == 1
    assert data["license"]["seats_max"] == 2
    token_a = data["token"]

    # Kích hoạt lại cùng Máy A -> thành công, seats_used vẫn là 1 (không tốn chỗ)
    res_a2 = client.post("/api/v1/license/activate", json={
        "product": "3t-office",
        "key": raw_key,
        "device_fingerprint": "device-fingerprint-pc-a-12345678",
        "device_name": "PC May A (Cap nhat)",
        "app_version": "0.9.8",
    })
    assert res_a2.status_code == 200
    assert res_a2.json()["license"]["seats_used"] == 1

    # Lần 2: Kích hoạt Máy B -> seats_used = 2
    res_b = client.post("/api/v1/license/activate", json={
        "product": "3t-office",
        "key": raw_key,
        "device_fingerprint": "device-fingerprint-pc-b-87654321",
        "device_name": "Laptop May B",
        "app_version": "0.9.7",
    })
    assert res_b.status_code == 200
    assert res_b.json()["license"]["seats_used"] == 2

    # Lần 3: Kích hoạt Máy C -> Bị từ chối vì hết chỗ (seats_exhausted)
    res_c = client.post("/api/v1/license/activate", json={
        "product": "3t-office",
        "key": raw_key,
        "device_fingerprint": "device-fingerprint-pc-c-00000000",
        "device_name": "PC May C",
        "app_version": "0.9.7",
    })
    assert res_c.status_code == 409
    err = res_c.json()
    assert err["error"] == "seats_exhausted"
    assert "active_devices" in err
    assert len(err["active_devices"]) == 2


# 4. Kích hoạt sai định dạng, key không tồn tại, key bị thu hồi
def test_license_activate_errors(test_env):
    client = test_env["client"]
    db_path = test_env["db_path"]

    # Sai checksum
    res_bad = client.post("/api/v1/license/activate", json={
        "product": "3t-office",
        "key": "3TO-AAAAA-BBBBB-CCCCC-DDDDD",
        "device_fingerprint": "device-fp-12345678",
        "device_name": "PC Test",
        "app_version": "0.9.7",
    })
    assert res_bad.status_code == 400
    assert res_bad.json()["error"] == "invalid_key"

    # Key hợp lệ nhưng không có trong cơ sở dữ liệu
    good_fake_key = lic_mod.generate_license_key()
    res_unknown = client.post("/api/v1/license/activate", json={
        "product": "3t-office",
        "key": good_fake_key,
        "device_fingerprint": "device-fp-12345678",
        "device_name": "PC Test",
        "app_version": "0.9.7",
    })
    assert res_unknown.status_code == 404
    assert res_unknown.json()["error"] == "unknown_key"

    # Key bị thu hồi (revoked)
    revoked_key = lic_mod.generate_license_key()
    _seed_key(db_path, revoked_key, status="revoked")
    res_revoked = client.post("/api/v1/license/activate", json={
        "product": "3t-office",
        "key": revoked_key,
        "device_fingerprint": "device-fp-12345678",
        "device_name": "PC Test",
        "app_version": "0.9.7",
    })
    assert res_revoked.status_code == 403
    assert res_revoked.json()["error"] == "revoked"


# 5. Kiểm tra validate, heartbeat và deactivate
def test_validate_and_deactivate(test_env):
    client = test_env["client"]
    db_path = test_env["db_path"]

    raw_key = lic_mod.generate_license_key()
    lid = _seed_key(db_path, raw_key, seats_max=2)

    fp = "device-pc-val-12345678"
    act_res = client.post("/api/v1/license/activate", json={
        "product": "3t-office",
        "key": raw_key,
        "device_fingerprint": fp,
        "device_name": "PC Validate Test",
        "app_version": "0.9.7",
    })
    token = act_res.json()["token"]

    # Validate qua token
    val_res = client.post("/api/v1/license/validate", json={"token": token})
    assert val_res.status_code == 200
    assert val_res.json()["valid"] is True
    new_token = val_res.json()["token"]

    # Validate qua cặp license_id + fingerprint
    val_res2 = client.post("/api/v1/license/validate", json={
        "license_id": lid,
        "device_fingerprint": fp,
    })
    assert val_res2.status_code == 200
    assert val_res2.json()["valid"] is True

    # Deactivate thiết bị
    deact_res = client.post("/api/v1/license/deactivate", json={"token": new_token})
    assert deact_res.status_code == 200
    assert deact_res.json()["ok"] is True

    # Sau khi deactivate, validate sẽ trả 403 device_removed
    val_after = client.post("/api/v1/license/validate", json={"token": new_token})
    assert val_after.status_code == 403
    assert val_after.json()["error"] == "device_removed"


# 6. Khi thiếu signing key -> API license trả 503 thông báo rõ
def test_missing_signing_key(tmp_path: Path):
    settings = Settings(
        data_dir=tmp_path / "data",
        updates_dir=tmp_path / "updates",
        reports_dir=tmp_path / "reports",
        backups_dir=tmp_path / "backups",
        logs_dir=tmp_path / "logs",
        install_token_secret="b" * 32,
        admin_username="admin",
        admin_password="secretpassword123",
        license_signing_key="",
    )
    app = create_app(settings)
    client = TestClient(app)

    res = client.post("/api/v1/license/activate", json={
        "product": "3t-office",
        "key": "3TO-AAAAA-BBBBB-CCCCC-DDDDD",
        "device_fingerprint": "device-fp-12345678",
        "device_name": "PC Test",
        "app_version": "0.9.7",
    })
    # Kể cả key hợp lệ
    key = lic_mod.generate_license_key()
    res = client.post("/api/v1/license/activate", json={
        "product": "3t-office",
        "key": key,
        "device_fingerprint": "device-fp-12345678",
        "device_name": "PC Test",
        "app_version": "0.9.7",
    })
    assert res.status_code == 503
    assert res.json()["error"] == "signing_key_not_configured"


# 7. Kích hoạt ngoại tuyến (offline activation) yêu cầu quyền admin
def test_offline_activation(test_env):
    client = test_env["client"]
    db_path = test_env["db_path"]

    raw_key = lic_mod.generate_license_key()
    _seed_key(db_path, raw_key, seats_max=2)

    # Chưa xác thực admin -> 401
    res_unauth = client.post("/api/v1/admin/license/activate-offline", json={
        "key": raw_key,
        "device_code": "OFFLINE-DEV-CODE-12345678",
    })
    assert res_unauth.status_code == 401

    # Xác thực Basic Auth admin -> 200 và sinh activation_code
    basic_auth = base64.b64encode(b"admin:secretpassword123").decode("ascii")
    res_admin = client.post(
        "/api/v1/admin/license/activate-offline",
        json={
            "key": raw_key,
            "device_code": "OFFLINE-DEV-CODE-12345678",
        },
        headers={"Authorization": f"Basic {basic_auth}"},
    )
    assert res_admin.status_code == 200
    data = res_admin.json()
    assert "activation_code" in data
    # Xác minh activation_code là token Ed25519 hợp lệ
    pub = lic_mod.load_public_key(test_env["pub_key_b64"])
    claims = lic_mod.verify_license_token(data["activation_code"], pub)
    assert claims is not None
    assert claims["v"] == 1

    # Kiểm tra admin_audit ghi nhận không chứa key thô
    with sqlite3.connect(db_path) as conn:
        row = conn.execute("SELECT action, target FROM admin_audit WHERE action = 'activate_offline'").fetchone()
        assert row is not None
        assert raw_key not in row[1]


# 8. Kiểm thử Rate limit theo key và IP
def test_license_rate_limiting(test_env):
    client = test_env["client"]
    db_path = test_env["db_path"]

    raw_key = lic_mod.generate_license_key()
    _seed_key(db_path, raw_key, seats_max=100)

    # Gửi liên tục vượt quá limit (limit 10 theo key trong 60s)
    hit_rate_limit = False
    for i in range(15):
        res = client.post("/api/v1/license/activate", json={
            "product": "3t-office",
            "key": raw_key,
            "device_fingerprint": f"fp-rate-limit-{i}",
            "device_name": f"Device {i}",
            "app_version": "0.9.7",
        })
        if res.status_code == 429:
            hit_rate_limit = True
            assert res.json()["error"] == "rate_limited"
            break
    assert hit_rate_limit is True

