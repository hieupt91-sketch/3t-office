from __future__ import annotations

import asyncio
import base64
import json
import uuid
from pathlib import Path

import httpx

from app import MAX_REPORT_BYTES, Settings, create_app


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
