from __future__ import annotations

import asyncio
import base64
import json
import uuid
from pathlib import Path

import httpx

from app import MAX_REPORT_BYTES, Settings, create_app, _SAFE_DOWNLOAD_NAME


def make_client(tmp_path: Path, **overrides):
    paths = {
        "data_dir": tmp_path / "data",
        "updates_dir": tmp_path / "updates",
        "reports_dir": tmp_path / "reports",
        "backups_dir": tmp_path / "backups",
        "logs_dir": None,
        "install_token_secret": "test-only-signing-secret-with-32-bytes-minimum",
        "admin_username": "test-admin",
        "admin_password": "test-admin-password",
        **overrides,
    }
    app = create_app(Settings(**paths))
    transport = httpx.ASGITransport(app=app, client=("203.0.113.9", 12345))
    return httpx.AsyncClient(transport=transport, base_url="http://testserver"), paths


def valid_payload(installation_id: str | None = None, **changes):
    return {
        "event_id": str(uuid.uuid4()),
        "app": "writer",
        "version": "0.9.6",
        "os": "Windows 11",
        "error_type": "RuntimeError",
        "message": "Không thể mở tài liệu do lỗi hệ thống.",
        "stack": "Traceback (most recent call last):\nFile <path>, line 12, in open_document",
        "installation_id": installation_id or str(uuid.uuid4()),
        **changes,
    }


async def issued_token(client: httpx.AsyncClient, installation_id: str) -> str:
    response = await client.post("/api/v1/reports/token", json={"installation_id": installation_id})
    assert response.status_code == 200
    return response.json()["token"]


def test_health_and_report_token_is_bound_to_anonymous_installation(tmp_path):
    async def run():
        client, _ = make_client(tmp_path)
        async with client:
            health = await client.get("/health")
            assert health.status_code == 200
            assert health.json() == {"status": "ok"}
            installation_id = str(uuid.uuid4())
            token = await issued_token(client, installation_id)
            payload = valid_payload(installation_id)
            report = await client.post("/api/v1/reports", json=payload, headers={"X-Install-Token": token})
            assert report.status_code == 200
            assert report.json() == {"accepted": True, "duplicate": False}
            duplicate = await client.post("/api/v1/reports", json=payload, headers={"X-Install-Token": token})
            assert duplicate.status_code == 200
            assert duplicate.json()["duplicate"] is True
    asyncio.run(run())


def test_report_requires_valid_token_and_matching_installation_id(tmp_path):
    async def run():
        client, _ = make_client(tmp_path)
        async with client:
            installation_id = str(uuid.uuid4())
            token = await issued_token(client, installation_id)
            report = await client.post("/api/v1/reports", json=valid_payload(installation_id), headers={"X-Install-Token": "invalid"})
            assert report.status_code == 401
            another_id = str(uuid.uuid4())
            report = await client.post("/api/v1/reports", json=valid_payload(another_id), headers={"X-Install-Token": token})
            assert report.status_code == 401
    asyncio.run(run())


def test_report_size_schema_and_document_content_are_rejected(tmp_path):
    async def run():
        client, _ = make_client(tmp_path)
        async with client:
            installation_id = str(uuid.uuid4())
            token = await issued_token(client, installation_id)
            headers = {"X-Install-Token": token}
            too_large = await client.post("/api/v1/reports", content=b" " * (MAX_REPORT_BYTES + 1), headers=headers)
            assert too_large.status_code == 413
            extra = await client.post("/api/v1/reports", json=valid_payload(installation_id, document_content="private text"), headers=headers)
            assert extra.status_code == 400
            path = await client.post("/api/v1/reports", json=valid_payload(installation_id, message=r"Failed opening C:\Users\A\salary.xlsx"), headers=headers)
            assert path.status_code == 400
            markup = await client.post("/api/v1/reports", json=valid_payload(installation_id, message="<w:document>document text</w:document>"), headers=headers)
            assert markup.status_code == 400
    asyncio.run(run())


def test_report_is_grouped_by_signature_and_version_and_admin_requires_basic_auth(tmp_path):
    async def run():
        client, paths = make_client(tmp_path)
        async with client:
            installation_id = str(uuid.uuid4())
            token = await issued_token(client, installation_id)
            report = valid_payload(installation_id)
            accepted = await client.post("/api/v1/reports", json=report, headers={"X-Install-Token": token})
            assert accepted.status_code == 200
            unauthorized = await client.get("/api/v1/admin/reports")
            assert unauthorized.status_code == 401
            authorized = await client.get("/api/v1/admin/reports", auth=("test-admin", "test-admin-password"))
            assert authorized.status_code == 200
            groups = authorized.json()["groups"]
            assert len(groups) == 1
            assert groups[0]["version"] == "0.9.6"
            assert groups[0]["occurrences"] == 1
            assert groups[0]["installations"] == 1
            assert groups[0]["apps"] == "writer"
            records = list(paths["reports_dir"].glob("reports-*.jsonl"))
            assert len(records) == 1
            stored = json.loads(records[0].read_text(encoding="utf-8").splitlines()[0])
            assert set(stored) == set(report) | {"received_at", "signature"}
            assert "document_content" not in stored
    asyncio.run(run())


def test_latest_manifest_api_and_static_range_support(tmp_path):
    async def run():
        client, paths = make_client(tmp_path)
        updates = paths["updates_dir"]
        (updates / "channels").mkdir(parents=True)
        (updates / "0.9.6").mkdir()
        (updates / "files").mkdir()
        manifest_raw = b'{"channel":"pilot","version":"0.9.6","schema_version":1}\n'
        signature = b"s" * 384
        (updates / "channels" / "pilot.json").write_text('{"channel":"pilot","version":"0.9.6"}', encoding="utf-8")
        (updates / "0.9.6" / "manifest.json").write_bytes(manifest_raw)
        (updates / "0.9.6" / "manifest.sig").write_bytes(signature)
        (updates / "files" / ("a" * 64)).write_bytes(b"0123456789")
        async with client:
            latest = await client.get("/api/v1/updates/3t-office/pilot/latest")
            assert latest.status_code == 200
            assert base64.b64decode(latest.json()["manifest_base64"]) == manifest_raw
            assert base64.b64decode(latest.json()["signature_base64"]) == signature
            assert latest.json()["up_to_date"] is False and "manifest" in latest.json()
            # Periodic check: same version -> tiny answer without the signed manifest.
            same = await client.get("/api/v1/updates/3t-office/pilot/latest", params={"current": "0.9.6"})
            assert same.status_code == 200
            assert same.json() == {"product": "3t-office", "channel": "pilot", "version": "0.9.6", "up_to_date": True}
            older = await client.get("/api/v1/updates/3t-office/pilot/latest", params={"current": "0.9.5", "compact": "1"})
            assert older.json()["up_to_date"] is False
            assert "manifest" not in older.json() and older.json()["manifest_base64"]
            bogus = await client.get("/api/v1/updates/3t-office/pilot/latest", params={"current": "<script>"})
            assert bogus.status_code == 200 and bogus.json()["up_to_date"] is False
            static = await client.get("/updates/0.9.6/manifest.json")
            assert static.status_code == 200
            assert static.content == manifest_raw
            partial = await client.get("/updates/files/" + "a" * 64, headers={"Range": "bytes=2-5"})
            assert partial.status_code == 206
            assert partial.content == b"2345"
            assert partial.headers["content-range"] == "bytes 2-5/10"
            assert partial.headers["accept-ranges"] == "bytes"
            assert (await client.get("/api/v1/updates/other-product/pilot/latest")).status_code == 404
    asyncio.run(run())


def test_report_rate_limit(tmp_path):
    async def run():
        client, _ = make_client(tmp_path, report_rate=1)
        async with client:
            installation_id = str(uuid.uuid4())
            token = await issued_token(client, installation_id)
            headers = {"X-Install-Token": token}
            assert (await client.post("/api/v1/reports", json=valid_payload(installation_id), headers=headers)).status_code == 200
            assert (await client.post("/api/v1/reports", json=valid_payload(installation_id), headers=headers)).status_code == 429
    asyncio.run(run())


def test_website_is_served_without_shadowing_the_api(tmp_path: Path):
    """Trang web tĩnh phải phục vụ ở /, nhưng không được che /health và /api/v1/*."""
    web = tmp_path / "web"
    web.mkdir()
    (web / "index.html").write_text("<!doctype html><title>3T Office</title>Trang chu", encoding="utf-8")
    (web / "404.html").write_text("<!doctype html><title>Khong tim thay</title>404", encoding="utf-8")
    (web / "robots.txt").write_text("User-agent: *\n", encoding="utf-8")

    async def scenario():
        client, _ = make_client(tmp_path, web_dir=web)
        async with client:
            health = await client.get("/health")
            assert health.status_code == 200 and health.json() == {"status": "ok"}

            home = await client.get("/")
            assert home.status_code == 200
            assert "3T Office" in home.text

            robots = await client.get("/robots.txt")
            assert robots.status_code == 200

            missing = await client.get("/khong-co-trang-nay")
            assert missing.status_code == 404
            assert "Khong tim thay" in missing.text

            # Đường dẫn API vẫn trả lỗi của API (401/429/400), không phải trang 404 của web.
            api = await client.post("/api/v1/reports/token", json={})
            assert api.status_code != 404

    asyncio.run(scenario())


def test_website_is_optional(tmp_path: Path):
    """Không cấu hình WEB_DIR thì API vẫn chạy và / trả 404 của API."""

    async def scenario():
        client, _ = make_client(tmp_path)
        async with client:
            health = await client.get("/health")
            assert health.status_code == 200
            home = await client.get("/")
            assert home.status_code == 404

    asyncio.run(scenario())


def test_download_installer_file_with_range_and_security(tmp_path: Path):
    """Tải bộ cài đặt /downloads/{file_name} hỗ trợ Range, Content-Disposition và bảo vệ an toàn."""
    downloads = tmp_path / "downloads"
    downloads.mkdir()
    installer_data = b"VNOffice Setup 0.9.7 binary payload for tests 0123456789"
    installer_name = "VNOffice-Setup-0.9.7.exe"
    (downloads / installer_name).write_bytes(installer_data)

    async def scenario():
        client, _ = make_client(tmp_path, downloads_dir=downloads)
        async with client:
            res = await client.get(f"/downloads/{installer_name}")
            assert res.status_code == 200
            assert res.content == installer_data
            assert res.headers["accept-ranges"] == "bytes"
            assert f'attachment; filename="{installer_name}"' in res.headers.get("content-disposition", "")
            assert res.headers["content-length"] == str(len(installer_data))

            head_res = await client.head(f"/downloads/{installer_name}")
            assert head_res.status_code == 200
            assert head_res.headers["accept-ranges"] == "bytes"

            partial = await client.get(f"/downloads/{installer_name}", headers={"Range": "bytes=0-13"})
            assert partial.status_code == 206
            assert partial.content == installer_data[0:14]
            assert partial.headers["content-range"] == f"bytes 0-13/{len(installer_data)}"
            assert partial.headers["content-length"] == "14"

            missing = await client.get("/downloads/NonExistent-0.9.7.exe")
            assert missing.status_code == 404

            bad_ext = await client.get("/downloads/malicious_script.sh")
            assert bad_ext.status_code == 404

            traversal = await client.get("/downloads/..%2Fsecret.txt")
            assert traversal.status_code == 404

    asyncio.run(scenario())


def test_download_macos_dmg_and_pkg_with_regex_security(tmp_path: Path):
    """Kiem tra _SAFE_DOWNLOAD_NAME regex va endpoint /downloads cho file .dmg, .pkg, .zip."""
    # 1. Kiem tra regex voi cac ten hop le
    valid_names = [
        "3T-Office-0.9.11-arm64-unsigned-final-v2.pkg",
        "VNOffice-macOS-0.9.11-universal.dmg",
        "VNOffice-macOS-0.9.11-arm64.dmg",
        "VNOffice-macOS-0.9.11-x64.dmg",
        "VNOffice-macOS-0.9.11.dmg",
        "VNOffice-macOS-0.9.11.pkg",
        "VNOffice-Setup-0.9.11.exe",
        "VNOffice-0.9.11.msi",
        "VNOffice-0.9.11.zip",
        "VNOffice-0.9.11.tar.gz",
    ]
    for name in valid_names:
        assert _SAFE_DOWNLOAD_NAME.fullmatch(name) is not None, f"{name} phai duoc regex chap nhan"

    # 2. Kiem tra regex tu choi cac ten doc hai hoac khong hop le
    invalid_names = [
        "../VNOffice-macOS-0.9.11.dmg",
        "..\\VNOffice-macOS-0.9.11.dmg",
        "downloads/VNOffice.dmg",
        "VNOffice macOS 0.9.11.dmg",  # khoang trang
        "VNOffice.sh",
        "VNOffice.command",
        "VNOffice.app",
        "VNOffice.bat",
        "VNOffice.py",
        "VNOffice.dmg.sh",
        "VNOffice.dmg..",
        "VNOffice",
        "",
    ]
    for name in invalid_names:
        assert _SAFE_DOWNLOAD_NAME.fullmatch(name) is None, f"{name} phai bi regex tu choi"

    # 3. Kiem tra tai file .dmg va .pkg qua API
    downloads = tmp_path / "downloads"
    downloads.mkdir(parents=True, exist_ok=True)

    dmg_name = "VNOffice-macOS-0.9.11-universal.dmg"
    dmg_data = b"DMG binary image payload 1234567890"
    (downloads / dmg_name).write_bytes(dmg_data)

    pkg_name = "3T-Office-0.9.11-arm64-unsigned-final-v2.pkg"
    pkg_data = b"PKG installer binary payload 0987654321"
    (downloads / pkg_name).write_bytes(pkg_data)

    async def scenario():
        client, _ = make_client(tmp_path, downloads_dir=downloads)
        async with client:
            # GET .dmg
            dmg_res = await client.get(f"/downloads/{dmg_name}")
            assert dmg_res.status_code == 200
            assert dmg_res.content == dmg_data
            assert dmg_res.headers["accept-ranges"] == "bytes"
            assert f'attachment; filename="{dmg_name}"' in dmg_res.headers.get("content-disposition", "")
            assert dmg_res.headers["content-length"] == str(len(dmg_data))

            # HEAD .dmg
            dmg_head = await client.head(f"/downloads/{dmg_name}")
            assert dmg_head.status_code == 200
            assert dmg_head.headers["accept-ranges"] == "bytes"
            assert dmg_head.headers["content-length"] == str(len(dmg_data))

            # Range request .dmg
            dmg_range = await client.get(f"/downloads/{dmg_name}", headers={"Range": "bytes=0-9"})
            assert dmg_range.status_code == 206
            assert dmg_range.content == dmg_data[0:10]
            assert dmg_range.headers["content-range"] == f"bytes 0-9/{len(dmg_data)}"
            assert dmg_range.headers["content-length"] == "10"

            # GET .pkg
            pkg_res = await client.get(f"/downloads/{pkg_name}")
            assert pkg_res.status_code == 200
            assert pkg_res.content == pkg_data
            assert f'attachment; filename="{pkg_name}"' in pkg_res.headers.get("content-disposition", "")

            # Tu choi file nguy hiem hoac khong co
            res_sh = await client.get("/downloads/script.sh")
            assert res_sh.status_code == 404

            res_app = await client.get("/downloads/VNOffice.app")
            assert res_app.status_code == 404

            res_space = await client.get("/downloads/VNOffice%20macOS.dmg")
            assert res_space.status_code == 404

    asyncio.run(scenario())



def test_update_api_is_platform_aware_and_windows_layout_is_unchanged(tmp_path):
    async def run():
        client, paths = make_client(tmp_path)
        updates = paths["updates_dir"]
        for base, version in (("", "0.9.8"), ("macos/", "1.0.0")):
            (updates / (base + "channels")).mkdir(parents=True)
            (updates / (base + version)).mkdir(parents=True)
            (updates / (base + "channels/pilot.json")).write_text(
                '{"channel":"pilot","version":"%s"}' % version, encoding="utf-8")
            (updates / (base + version + "/manifest.json")).write_bytes(
                b'{"channel":"pilot","version":"%s","schema_version":1}\n' % version.encode())
            (updates / (base + version + "/manifest.sig")).write_bytes(b"s" * 384)
        async with client:
            default = await client.get("/api/v1/updates/3t-office/pilot/latest")
            assert default.status_code == 200 and default.json()["version"] == "0.9.8"
            windows = await client.get("/api/v1/updates/3t-office/pilot/latest", params={"platform": "windows"})
            assert windows.json()["version"] == "0.9.8"
            mac = await client.get("/api/v1/updates/3t-office/pilot/latest", params={"platform": "macos"})
            assert mac.status_code == 200 and mac.json()["version"] == "1.0.0"
            assert (await client.get("/updates/macos/1.0.0/manifest.json")).status_code == 200
            assert (await client.get("/updates/macos/channels/pilot.json")).status_code == 200
            assert (await client.get("/api/v1/updates/3t-office/pilot/latest", params={"platform": "ios"})).status_code == 404
            assert (await client.get("/api/v1/updates/3t-office/pilot/latest", params={"platform": "../x"})).status_code == 404
    asyncio.run(run())