"""End-to-end: the real client talks HTTP to the real 3T license API (server/3t-api) running locally.

Uses a throw-away signing key and database.  Skipped when fastapi/uvicorn/cryptography are not installed
(they are server/dev dependencies, not part of the desktop build).
"""
from __future__ import annotations

import base64
import json
import socket
import sqlite3
import sys
import tempfile
import threading
import time
import unittest
import uuid
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SERVER_DIR = ROOT / "server" / "3t-api"
sys.path.insert(0, str(ROOT))

try:
    import uvicorn
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ed25519
    sys.path.insert(0, str(SERVER_DIR))
    from app import Settings, create_app  # type: ignore
    import license as server_license  # type: ignore
    HAVE_SERVER = True
except Exception:  # pragma: no cover
    HAVE_SERVER = False
    if str(SERVER_DIR) in sys.path:
        sys.path.remove(str(SERVER_DIR))
# On success SERVER_DIR stays on sys.path: create_app() imports its sibling modules (commerce_db, ...) lazily.

from adapters.license import device as device_mod  # noqa: E402
from adapters.license import tokens as tokens_mod  # noqa: E402
from adapters.license.manager import LicenseError, LicenseManager  # noqa: E402


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


@unittest.skipUnless(HAVE_SERVER, "server dependencies not installed")
class LicenseEndToEnd(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)  # Windows keeps the sqlite file open a moment
        base = Path(cls.tmp.name)
        private = ed25519.Ed25519PrivateKey.generate()
        private_b64 = base64.b64encode(private.private_bytes(
            serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())).decode()
        cls.public_b64 = base64.b64encode(private.public_key().public_bytes(
            serialization.Encoding.Raw, serialization.PublicFormat.Raw)).decode()
        settings = Settings(
            data_dir=base / "data", updates_dir=base / "updates", reports_dir=base / "reports",
            backups_dir=base / "backups", logs_dir=base / "logs", install_token_secret="a" * 32,
            admin_username="admin", admin_password="secretpassword123", product="3t-office",
            license_signing_key=private_b64,
        )
        cls.db_path = base / "data" / "3t-office-cloud.sqlite3"
        cls.port = free_port()
        config = uvicorn.Config(create_app(settings), host="127.0.0.1", port=cls.port, log_level="error")
        cls.server = uvicorn.Server(config)
        cls.thread = threading.Thread(target=cls.server.run, daemon=True)
        cls.thread.start()
        for _ in range(100):
            if cls.server.started:
                break
            time.sleep(0.1)
        else:
            raise RuntimeError("local license server did not start")
        cls.api_base = f"http://127.0.0.1:{cls.port}/api/v1/license"

    @classmethod
    def tearDownClass(cls):
        cls.server.should_exit = True
        cls.thread.join(timeout=10)
        cls.tmp.cleanup()

    def seed_key(self, seats_max=2):
        key = server_license.generate_license_key()
        canonical = server_license.normalize_and_validate_key(key)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO license_keys (id, key_hash, key_hint, note, email, seats_max, status, created_at) VALUES (?,?,?,?,?,?,?,?)",
                (str(uuid.uuid4()), server_license.hash_key(canonical), server_license.extract_hint(canonical),
                 "e2e", "e2e@example.com", seats_max, "active", server_license.now_utc_iso()),
            )
        return key

    def manager(self, machine, *, platform_name="windows"):
        return LicenseManager(
            tempfile.mkdtemp(), "0.9.9", api_base=self.api_base, public_keys=(self.public_b64,),
            fingerprint=device_mod.device_fingerprint(machine, "PC-" + machine),
            platform_name=platform_name,
        )

    def post_json(self, path, payload, *, basic_auth=None):
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if basic_auth:
            encoded = base64.b64encode(f"{basic_auth[0]}:{basic_auth[1]}".encode()).decode()
            headers["Authorization"] = "Basic " + encoded
        request = urllib.request.Request(
            f"http://127.0.0.1:{self.port}{path}",
            data=json.dumps(payload).encode(),
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=5) as response:  # noqa: S310 - localhost E2E server
            return response.status, json.loads(response.read())

    def test_activate_refresh_deactivate_and_seats(self):
        key = self.seed_key(seats_max=1)
        first = self.manager("guid-1")
        activated = first.activate(key)
        self.assertEqual(activated["state"], "active")
        self.assertEqual(activated["seats"]["seats_used"], 1)
        self.assertEqual(first.refresh()["state"], "active")

        second = self.manager("guid-2")
        with self.assertRaises(LicenseError) as ctx:
            second.activate(key)
        self.assertEqual(ctx.exception.code, "seats_exhausted")
        self.assertIn(device_mod.device_name(), ctx.exception.extra.get("active_devices", []))

        self.assertFalse(first.deactivate()["licensed"])
        self.assertEqual(second.activate(key)["state"], "active")

    def test_unknown_key_and_wrong_format(self):
        unknown = server_license.generate_license_key()
        with self.assertRaises(LicenseError) as ctx:
            self.manager("guid-3").activate(unknown)
        self.assertEqual(ctx.exception.code, "unknown_key")

    def test_revoked_key_is_refused_and_dropped_on_refresh(self):
        key = self.seed_key()
        manager = self.manager("guid-4")
        manager.activate(key)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("UPDATE license_keys SET status='revoked' WHERE key_hash=?",
                         (server_license.hash_key(server_license.normalize_and_validate_key(key)),))
        result = manager.refresh()
        self.assertEqual(result["refresh_error"], "revoked")
        self.assertFalse(result["licensed"])
        with self.assertRaises(LicenseError) as ctx:
            self.manager("guid-5").activate(key)
        self.assertEqual(ctx.exception.code, "revoked")

    def test_windows_and_macos_share_key_seats_and_macos_platform_survives_refresh(self):
        key = self.seed_key(seats_max=2)
        windows = self.manager("windows-guid", platform_name="windows")
        macos = self.manager("macos-guid", platform_name="macos")

        self.assertEqual(windows.activate(key)["seats"]["seats_used"], 1)
        macos_activation = macos.activate(key)
        self.assertEqual(macos_activation["seats"]["seats_used"], 2)

        initial_token = macos._read()["token"]
        initial_claims = tokens_mod.verify_token(initial_token, (self.public_b64,))
        self.assertEqual(initial_claims["plat"], "macos")

        # The legacy validate shape (license_id + fingerprint, no token) must also
        # recover the platform from the activation row instead of assuming Windows.
        status, legacy_refresh = self.post_json(
            "/api/v1/license/validate",
            {
                "license_id": macos_activation["seats"]["id"],
                "device_fingerprint": macos._fingerprint,
            },
        )
        self.assertEqual(status, 200)
        legacy_claims = tokens_mod.verify_token(legacy_refresh["token"], (self.public_b64,))
        self.assertEqual(legacy_claims["plat"], "macos")

        self.assertEqual(macos.refresh()["state"], "active")
        refreshed_token = macos._read()["token"]
        refreshed_claims = tokens_mod.verify_token(refreshed_token, (self.public_b64,))
        self.assertEqual(refreshed_claims["plat"], "macos")

        with sqlite3.connect(self.db_path) as conn:
            platforms = {
                row[0]
                for row in conn.execute(
                    "SELECT platform FROM activations WHERE removed_at IS NULL"
                ).fetchall()
            }
        self.assertEqual(platforms, {"windows", "macos"})

        third = self.manager("third-guid", platform_name="macos")
        with self.assertRaises(LicenseError) as ctx:
            third.activate(key)
        self.assertEqual(ctx.exception.code, "seats_exhausted")

        def offline_post(_url, _payload, _timeout):
            raise LicenseError("network", "offline")

        macos._http_post = offline_post
        offline = macos.refresh()
        self.assertEqual(offline["state"], "active")
        self.assertEqual(offline["refresh_error"], "network")
        self.assertTrue(offline["licensed"])

        # Restore real HTTP, release the shared seat, then prove another Mac can reuse it.
        from adapters.license.manager import default_http_post
        macos._http_post = default_http_post
        self.assertFalse(macos.deactivate()["licensed"])
        self.assertEqual(third.activate(key)["seats"]["seats_used"], 2)

    def test_macos_offline_activation_over_real_http_records_platform(self):
        key = self.seed_key(seats_max=1)
        macos = self.manager("offline-macos-guid", platform_name="macos")
        status, body = self.post_json(
            "/api/v1/admin/license/activate-offline",
            {
                "key": key,
                "device_code": macos.device_code,
                "device_name": "Mac pilot offline",
                "platform": "macos",
            },
            basic_auth=("admin", "secretpassword123"),
        )
        self.assertEqual(status, 200)
        activation_code = body["activation_code"]
        claims = tokens_mod.verify_token(activation_code, (self.public_b64,))
        self.assertEqual(claims["plat"], "macos")
        self.assertEqual(macos.apply_activation_code(activation_code)["state"], "active")

        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT platform, app_version FROM activations "
                "WHERE removed_at IS NULL AND device_name = ?",
                ("Mac pilot offline",),
            ).fetchone()
        self.assertEqual(row, ("macos", "offline"))


if __name__ == "__main__":
    unittest.main()
