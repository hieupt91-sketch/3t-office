"""Tests for adapters/license (client side of the 3T license system)."""
from __future__ import annotations

import base64
import importlib.util
import json
import random
import sys
import tempfile
import time
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from adapters.license import device as device_mod  # noqa: E402
from adapters.license import ed25519_verify  # noqa: E402
from adapters.license import keys as keys_mod  # noqa: E402
from adapters.license import tokens as tokens_mod  # noqa: E402
from adapters.license.manager import DAY, LicenseError, LicenseManager  # noqa: E402

try:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ed25519 as crypto_ed25519
except ImportError:  # the desktop build does not ship it; only dev machines run the parity tests
    crypto_ed25519 = None

SERVER_LICENSE = ROOT / "server" / "3t-api" / "license.py"


def load_server_license():
    spec = importlib.util.spec_from_file_location("server_license_under_test", SERVER_LICENSE)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def b64(raw: bytes) -> str:
    return base64.b64encode(raw).decode("ascii")


class Ed25519Tests(unittest.TestCase):
    def test_rfc8032_vector_1(self):
        public = bytes.fromhex("d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a")
        signature = bytes.fromhex(
            "e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e06522490155"
            "5fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b"
        )
        self.assertTrue(ed25519_verify.verify(public, b"", signature))
        self.assertFalse(ed25519_verify.verify(public, b"x", signature))
        bad = bytearray(signature)
        bad[10] ^= 1
        self.assertFalse(ed25519_verify.verify(public, b"", bytes(bad)))

    def test_rejects_malformed_inputs(self):
        public = bytes(32)
        self.assertFalse(ed25519_verify.verify(public, b"m", bytes(63)))
        self.assertFalse(ed25519_verify.verify(b"short", b"m", bytes(64)))
        self.assertFalse(ed25519_verify.verify(public, b"m", b"\xff" * 64))
        self.assertFalse(ed25519_verify.verify("not bytes", b"m", bytes(64)))  # type: ignore[arg-type]

    @unittest.skipIf(crypto_ed25519 is None, "cryptography not installed")
    def test_matches_cryptography_library(self):
        rng = random.Random(7)
        for _ in range(12):
            private = crypto_ed25519.Ed25519PrivateKey.generate()
            public = private.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
            message = bytes(rng.getrandbits(8) for _ in range(rng.randint(0, 200)))
            signature = private.sign(message)
            self.assertTrue(ed25519_verify.verify(public, message, signature))
            self.assertFalse(ed25519_verify.verify(public, message + b"!", signature))


@unittest.skipIf(crypto_ed25519 is None, "cryptography not installed")
class ServerParityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = load_server_license()

    def test_key_validation_matches_server(self):
        rng = random.Random(11)
        alphabet = keys_mod.CROCKFORD_ALPHABET
        for _ in range(300):
            key = self.server.generate_license_key()
            self.assertEqual(keys_mod.normalize_key(key), self.server.normalize_and_validate_key(key))
            self.assertEqual(keys_mod.normalize_key(key), key)
            mutated = list(key.replace("-", ""))
            position = rng.randrange(3, len(mutated))
            mutated[position] = rng.choice(alphabet + "oil ")
            text = "".join(mutated)
            self.assertEqual(keys_mod.normalize_key(text), self.server.normalize_and_validate_key(text), text)
            self.assertEqual(keys_mod.normalize_key(key.lower()), key)
            self.assertEqual(keys_mod.normalize_key("  " + key.replace("-", " ") + "  "), key)

    def test_token_issued_by_server_verifies_on_client(self):
        private = crypto_ed25519.Ed25519PrivateKey.generate()
        public_b64 = self.server.export_public_key_b64(private)
        token, _ = self.server.issue_license_token(private, "lic-1", "f" * 64, "ABCD")
        claims = tokens_mod.verify_token(token, (public_b64,))
        self.assertIsNotNone(claims)
        self.assertEqual(claims["lid"], "lic-1")
        self.assertEqual(claims["fp"], "f" * 64)
        other = crypto_ed25519.Ed25519PrivateKey.generate()
        self.assertIsNone(tokens_mod.verify_token(token, (self.server.export_public_key_b64(other),)))
        payload, signature = token.split(".")
        forged_payload = tokens_mod.b64url_decode(payload).replace(b'"perpetual"', b'"perpetuaX"')
        forged = base64.urlsafe_b64encode(forged_payload).rstrip(b"=").decode() + "." + signature
        self.assertIsNone(tokens_mod.verify_token(forged, (public_b64,)))
        self.assertIsNone(tokens_mod.verify_token("garbage", (public_b64,)))
        self.assertIsNone(tokens_mod.verify_token(None, (public_b64,)))


class KeyTests(unittest.TestCase):
    def test_checksum_detects_single_character_errors(self):
        body = "0123456789ABCDEFGHJ"
        key = "3TO" + body + keys_mod.compute_checksum(body)
        self.assertIsNotNone(keys_mod.normalize_key(key))
        for position in range(len(body)):
            for replacement in keys_mod.CROCKFORD_ALPHABET:
                if replacement == body[position]:
                    continue
                broken = "3TO" + body[:position] + replacement + body[position + 1:] + keys_mod.compute_checksum(body)
                self.assertIsNone(keys_mod.normalize_key(broken), (position, replacement))

    def test_format_while_typing(self):
        self.assertEqual(keys_mod.format_while_typing(""), "3TO-")
        self.assertEqual(keys_mod.format_while_typing("3to12345678"), "3TO-12345-678")
        self.assertEqual(keys_mod.format_while_typing("12345 67890 abcde fghjk zz"), "3TO-12345-67890-ABCDE-FGHJK")
        self.assertEqual(keys_mod.format_while_typing("3TO-3TO-ABCDE-FGHJK-MNPQR-STVW1"), "3TO-ABCDE-FGHJK-MNPQR-STVW1")
        self.assertEqual(keys_mod.format_while_typing("3TO-3TO12"), "3TO-3TO12")

    def test_device_code_format_and_checksum(self):
        fingerprint = device_mod.device_fingerprint("machine-guid", "PC-01")
        self.assertEqual(len(fingerprint), 64)
        code = device_mod.device_code(fingerprint)
        self.assertRegex(code, r"^3TD(-[0-9A-HJKMNP-TV-Z]{5}){5}$")
        self.assertTrue(device_mod.is_valid_device_code(code))
        self.assertTrue(device_mod.is_valid_device_code(code.lower().replace("-", " ")))
        broken = code[:-1] + ("0" if code[-1] != "0" else "1")
        self.assertFalse(device_mod.is_valid_device_code(broken))
        self.assertEqual(code, device_mod.device_code(fingerprint))
        self.assertNotEqual(code, device_mod.device_code(device_mod.device_fingerprint("machine-guid", "PC-02")))


@unittest.skipIf(crypto_ed25519 is None, "cryptography not installed")
class ManagerTests(unittest.TestCase):
    def setUp(self):
        self.server = load_server_license()
        self.private = crypto_ed25519.Ed25519PrivateKey.generate()
        self.public_b64 = self.server.export_public_key_b64(self.private)
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        self.clock = [time.time()]  # tokens carry real issue times, so the fake clock starts at the real now
        self.calls: list[tuple[str, dict]] = []
        self.responses: dict[str, tuple[int, dict]] = {}
        self.fingerprint = device_mod.device_fingerprint("guid-A", "PC-A")
        self.manager = self.make_manager()
        self.key = self.server.generate_license_key()

    def make_manager(self):
        def http_post(url, payload, timeout):
            endpoint = url.rsplit("/", 1)[-1]
            self.calls.append((endpoint, payload))
            response = self.responses.get(endpoint)
            if response is None:
                raise LicenseError("network", "offline")
            return response

        return LicenseManager(
            self.dir.name, "0.9.9", http_post=http_post, now=lambda: self.clock[0],
            fingerprint=self.fingerprint, public_keys=(self.public_b64,),
        )

    def token_for(self, fingerprint=None, *, check_days=30, grace_days=30, issued_offset=0):
        token, _ = self.server.issue_license_token(
            self.private, "lic-1", fingerprint or self.fingerprint, "WXYZ", check_days=check_days, grace_days=grace_days,
        )
        return token

    def test_trial_starts_on_first_status_and_expires(self):
        first = self.manager.status()
        self.assertEqual(first["state"], "trial")
        self.assertEqual(first["trial_days_left"], 30)
        self.clock[0] += 10 * DAY
        self.assertEqual(self.manager.status()["trial_days_left"], 20)
        self.clock[0] += 21 * DAY
        expired = self.manager.status()
        self.assertEqual(expired["state"], "trial_expired")
        self.assertFalse(expired["licensed"])

    def test_activate_stores_verified_token(self):
        token = self.token_for()
        self.responses["activate"] = (200, {"token": token, "license": {"seats_used": 1, "seats_max": 2}})
        result = self.manager.activate(self.key.lower())
        self.assertEqual(result["state"], "active")
        self.assertTrue(result["licensed"])
        self.assertEqual(result["seats"]["seats_max"], 2)
        sent = self.calls[-1][1]
        self.assertEqual(sent["key"], self.key)
        self.assertEqual(sent["device_fingerprint"], self.fingerprint)
        self.assertEqual(sent["platform"], "windows")
        # a fresh manager (new process) reads the same state without any network
        self.responses.clear()
        self.assertEqual(self.make_manager().status()["state"], "active")

    def test_invalid_key_is_rejected_locally_without_network(self):
        with self.assertRaises(LicenseError) as ctx:
            self.manager.activate("3TO-AAAAA-AAAAA-AAAAA-AAAAA")
        self.assertEqual(ctx.exception.code, "invalid_key")
        self.assertEqual(self.calls, [])

    def test_server_errors_are_reported(self):
        self.responses["activate"] = (409, {"error": "seats_exhausted", "message": "Hết máy", "active_devices": ["PC-X"]})
        with self.assertRaises(LicenseError) as ctx:
            self.manager.activate(self.key)
        self.assertEqual(ctx.exception.code, "seats_exhausted")
        self.assertEqual(ctx.exception.extra["active_devices"], ["PC-X"])
        self.assertEqual(self.manager.status()["state"], "trial")

    def test_network_failure_keeps_state(self):
        with self.assertRaises(LicenseError) as ctx:
            self.manager.activate(self.key)
        self.assertEqual(ctx.exception.code, "network")

    def test_token_for_another_machine_is_not_accepted(self):
        self.responses["activate"] = (200, {"token": self.token_for("f" * 64)})
        with self.assertRaises(LicenseError) as ctx:
            self.manager.activate(self.key)
        self.assertEqual(ctx.exception.code, "bad_token")

    def test_forged_token_in_the_file_is_dropped(self):
        other = crypto_ed25519.Ed25519PrivateKey.generate()
        forged, _ = self.server.issue_license_token(other, "lic-1", self.fingerprint, "WXYZ")
        (Path(self.dir.name) / "license.json").write_text(json.dumps({"token": forged}), encoding="utf-8")
        status = self.manager.status()
        self.assertEqual(status["state"], "trial")
        self.assertNotIn("token", json.loads((Path(self.dir.name) / "license.json").read_text(encoding="utf-8")))

    def test_check_by_then_grace_then_reminder(self):
        self.responses["activate"] = (200, {"token": self.token_for(check_days=30, grace_days=30)})
        self.manager.activate(self.key)
        self.clock[0] += 29 * DAY
        self.assertEqual(self.manager.status()["state"], "active")
        self.clock[0] += 5 * DAY
        self.assertEqual(self.manager.status()["state"], "active_grace")
        self.clock[0] += 40 * DAY
        later = self.manager.status()
        self.assertEqual(later["state"], "check_required")
        self.assertTrue(later["licensed"], "an offline license is never silently turned off")

    def test_refresh_replaces_token_and_survives_network_loss(self):
        self.responses["activate"] = (200, {"token": self.token_for(check_days=30)})
        self.manager.activate(self.key)
        self.clock[0] += 25 * DAY
        self.responses.pop("activate")
        offline = self.manager.refresh()
        self.assertEqual(offline["refresh_error"], "network")
        self.assertEqual(offline["state"], "active")
        renewed = self.token_for(check_days=60)
        self.responses["validate"] = (200, {"valid": True, "token": renewed})
        self.assertEqual(self.manager.refresh()["state"], "active")
        self.assertGreater(self.manager.status()["days_until_check"], 30)

    def test_revoked_license_is_removed_on_refresh(self):
        self.responses["activate"] = (200, {"token": self.token_for()})
        self.manager.activate(self.key)
        self.responses["validate"] = (403, {"error": "revoked", "message": "Đã thu hồi", "valid": False})
        result = self.manager.refresh()
        self.assertEqual(result["refresh_error"], "revoked")
        self.assertFalse(result["licensed"])

    def test_deactivate_clears_token_only_when_server_confirms(self):
        self.responses["activate"] = (200, {"token": self.token_for()})
        self.manager.activate(self.key)
        with self.assertRaises(LicenseError):
            self.manager.deactivate()  # no response configured = offline
        self.assertTrue(self.manager.status()["licensed"])
        self.responses["deactivate"] = (200, {"ok": True})
        self.assertFalse(self.manager.deactivate()["licensed"])

    def test_offline_activation_code_bound_to_the_device_code(self):
        offline_fp = device_mod.offline_fingerprint(self.manager.device_code)
        code = self.token_for(offline_fp)
        wrapped = code[:60] + "\n " + code[60:120] + " " + code[120:]
        self.assertTrue(self.manager.apply_activation_code(wrapped)["licensed"])
        elsewhere = LicenseManager(
            tempfile.mkdtemp(), "0.9.9", now=lambda: self.clock[0], public_keys=(self.public_b64,),
            fingerprint=device_mod.device_fingerprint("guid-B", "PC-B"),
        )
        with self.assertRaises(LicenseError) as ctx:
            elsewhere.apply_activation_code(code)
        self.assertEqual(ctx.exception.code, "bad_activation_code")


if __name__ == "__main__":
    unittest.main()
