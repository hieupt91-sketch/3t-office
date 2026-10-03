"""End-to-end: the real client talks HTTP to the real 3T license API (server/3t-api) running locally.

Uses a throw-away signing key and database.  Skipped when fastapi/uvicorn/cryptography are not installed
(they are server/dev dependencies, not part of the desktop build).
"""
from __future__ import annotations

import base64
import socket
import sqlite3
import sys
import tempfile
import threading
import time
import unittest
import uuid
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
finally:
    if str(SERVER_DIR) in sys.path:
        sys.path.remove(str(SERVER_DIR))

from adapters.license import device as device_mod  # noqa: E402
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

    def manager(self, machine):
        return LicenseManager(
            tempfile.mkdtemp(), "0.9.9", api_base=self.api_base, public_keys=(self.public_b64,),
            fingerprint=device_mod.device_fingerprint(machine, "PC-" + machine),
        )

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


if __name__ == "__main__":
    unittest.main()
