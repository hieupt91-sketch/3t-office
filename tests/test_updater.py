from __future__ import annotations

import hashlib
import importlib.util
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

from adapters.updater.crypto import (
    _generate_prime,
    private_key_from_pem,
    private_key_to_pem,
    sign_sha256_pkcs1v15,
    verify_sha256_pkcs1v15,
)
from adapters.updater.manifest import ManifestError, compare_versions, validate_manifest
from adapters.updater.source import UpdateSourceError, download_blob, is_unc_path
from adapters.updater.updater import UpdateRefused, UpdaterManager, queue_rollback_report

REPO_ROOT = Path(__file__).resolve().parents[1]
TOOL_PATH = REPO_ROOT / "scripts" / "release" / "make-update.py"
spec = importlib.util.spec_from_file_location("vnoffice_make_update_test", TOOL_PATH)
release_tool = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = release_tool
spec.loader.exec_module(release_tool)


def make_test_key(bits: int = 512) -> dict[str, int]:
    half = bits // 2
    while True:
        p = _generate_prime(half)
        q = _generate_prime(half)
        modulus = p * q
        if p == q or modulus.bit_length() != bits:
            continue
        exponent = 65537
        phi = (p - 1) * (q - 1)
        if math.gcd(exponent, phi) != 1:
            continue
        private = pow(exponent, -1, phi)
        return {"n": modulus, "e": exponent, "d": private, "p": p, "q": q,
                "dp": private % (p - 1), "dq": private % (q - 1), "qi": pow(q, -1, p)}


def canonical_manifest(version: str, files: list[dict[str, object]], *, channel: str = "pilot") -> bytes:
    value = {
        "schema_version": 1,
        "version": version,
        "min_version": "0.9.0",
        "channel": channel,
        "release_notes": "Cải thiện hiệu năng và sửa lỗi.",
        "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "files": files,
    }
    validate_manifest(value, expected_channel=channel)
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def write_source(source: Path, package: Path, version: str, key: dict[str, int], *, notes: str = "Cải thiện hiệu năng.", min_version: str = "0.9.0") -> None:
    """Use the release tool publisher while replacing only its production-size key gate."""
    with mock.patch.object(release_tool, "_load_key", return_value=key):
        release_tool.publish(package, source, version, min_version, "pilot", notes, Path("test-key.pem"))


def create_fake_package(base: Path, version: str, payload: bytes, *, broken_start: bool = False, key: dict[str, int] | None = None) -> Path:
    package = base / f"VNOffice-{version}"
    app = package / "app"
    helper = app / "adapters" / "updater" / "apply-helper.ps1"
    helper.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(REPO_ROOT / "adapters" / "updater" / "apply-helper.ps1", helper)
    if key:
        (helper.parent / "trust.py").write_bytes(release_tool._public_module(key))
    (app / "main.py").write_text(f'APP_VERSION = "{version}"\n', encoding="utf-8")
    (app / "fake_start.py").write_text(
        "import json, os, pathlib, sys\n"
        "app = pathlib.Path(__file__).parent\n"
        "version = (app.parent / 'VERSION.txt').read_text(encoding='ascii').strip()\n"
        "with pathlib.Path(sys.argv[1]).open('a', encoding='utf-8') as stream: stream.write(version + '\\n')\n"
        "pathlib.Path(sys.argv[1] + '.args').write_text(json.dumps(sys.argv[2:], ensure_ascii=False), encoding='utf-8')\n"
        "if (app / 'fail-start.txt').exists(): raise SystemExit(7)\n"
        "health = os.environ.get('VNO_UPDATE_HEALTH_FILE')\n"
        "if health:\n"
        " pathlib.Path(health).write_text('healthy', encoding='ascii')\n"
        " pathlib.Path(sys.argv[1] + '.health').write_text('OK', encoding='ascii')\n",
        encoding="utf-8",
    )
    (app / "payload.bin").write_bytes(payload)
    if broken_start:
        (app / "fail-start.txt").write_text("crash on startup", encoding="ascii")
    (package / "VERSION.txt").write_text(version + "\n", encoding="ascii")
    return package


class UpdaterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.key = make_test_key()
        cls.wrong_key = make_test_key()
        cls.public_key = (cls.key["n"], cls.key["e"])

    def test_rsa_pkcs1_v15_signature_valid_tampered_wrong_key_and_truncated(self):
        data = b'{"version":"0.9.1","release_notes":"Ban cap nhat"}'
        signature = sign_sha256_pkcs1v15(data, self.key["n"], self.key["d"])
        self.assertTrue(verify_sha256_pkcs1v15(data, signature, *self.public_key))
        self.assertFalse(verify_sha256_pkcs1v15(data + b" ", signature, *self.public_key))
        self.assertFalse(verify_sha256_pkcs1v15(data, signature, self.wrong_key["n"], self.wrong_key["e"]))
        self.assertFalse(verify_sha256_pkcs1v15(data, signature[:-1], *self.public_key))
        self.assertFalse(verify_sha256_pkcs1v15(data, signature, 0, self.key["e"]))

    def test_private_pkcs1_pem_round_trip(self):
        restored = private_key_from_pem(private_key_to_pem(self.key))
        self.assertEqual(restored, self.key)

    def test_release_tool_refuses_signer_that_differs_from_embedded_public_key(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            package = create_fake_package(root, "0.9.1", b"package", key=self.key)
            with mock.patch.object(release_tool, "_load_key", return_value=self.wrong_key):
                with self.assertRaisesRegex(ValueError, "does not match"):
                    release_tool.publish(package, root / "source", "0.9.1", "0.9.0", "pilot", "Sửa lỗi.", root / "key.pem")
            self.assertFalse((root / "source" / "channels" / "pilot.json").exists())

    def test_manifest_version_and_windows_path_validation(self):
        self.assertEqual(compare_versions("0.9.10", "0.9.2"), 1)
        self.assertEqual(compare_versions("1.0.0", "1.0.0-rc.1"), 1)
        for path in ("../escape", "app/..\\escape", "C:/temp", "app/CON.txt", "app/name."):
            with self.subTest(path=path), self.assertRaises(ManifestError):
                validate_manifest({
                    "version": "0.9.1", "min_version": "0.9.0", "channel": "pilot",
                    "release_notes": "Sửa lỗi.", "created_at": datetime.now(timezone.utc).isoformat(),
                    "files": [
                        {"path": "VERSION.txt", "size": 6, "sha256": hashlib.sha256(b"0.9.1\n").hexdigest()},
                        {"path": path, "size": 0, "sha256": hashlib.sha256(b"").hexdigest()},
                    ],
                })

    def test_delta_only_contains_changed_or_missing_installed_files(self):
        with tempfile.TemporaryDirectory() as temp:
            install = Path(temp) / "install"
            (install / "app").mkdir(parents=True)
            (install / "app" / "same.js").write_bytes(b"same")
            (install / "app" / "changed.js").write_bytes(b"old")
            (install / "app" / "vnoffice-config.json").write_text('{"update":{"source":"private"}}')
            version_bytes = b"0.9.0\n"
            (install / "VERSION.txt").write_bytes(version_bytes)
            entries = [
                {"path": "VERSION.txt", "size": 6, "sha256": hashlib.sha256(b"0.9.1\n").hexdigest()},
                {"path": "app/same.js", "size": 4, "sha256": hashlib.sha256(b"same").hexdigest()},
                {"path": "app/changed.js", "size": 3, "sha256": hashlib.sha256(b"new").hexdigest()},
                {"path": "app/new.js", "size": 3, "sha256": hashlib.sha256(b"new").hexdigest()},
            ]
            from adapters.updater.updater import compute_delta
            delta = compute_delta(install, validate_manifest({
                "version": "0.9.1", "min_version": "0.9.0", "channel": "pilot",
                "release_notes": "Đổi giao diện.", "created_at": datetime.now(timezone.utc).isoformat(), "files": entries,
            }))
            self.assertEqual({item["path"] for item in delta}, {"VERSION.txt", "app/changed.js", "app/new.js"})
            self.assertTrue((install / "app" / "vnoffice-config.json").exists())

    def test_local_source_download_resumes_partial_blob(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            content = b"content addressed update payload"
            digest = hashlib.sha256(content).hexdigest()
            (root / "files").mkdir()
            (root / "files" / digest).write_bytes(content)
            stage = root / "stage" / digest
            stage.parent.mkdir()
            stage.with_name(digest + ".part").write_bytes(content[:9])
            fetched = download_blob(str(root), digest, stage, expected_size=len(content))
            self.assertEqual(fetched, len(content) - 9)
            self.assertEqual(stage.read_bytes(), content)
            self.assertFalse(stage.with_name(digest + ".part").exists())

    def _publish_package(self, source: Path, work: Path, version: str, payload: bytes, *, broken_start: bool = False, min_version: str = "0.9.0") -> Path:
        package = create_fake_package(work, version, payload, broken_start=broken_start, key=self.key)
        write_source(source, package, version, self.key, min_version=min_version)
        return package

    def _manager(self, install: Path, updates: Path, source: Path, version: str = "0.9.0") -> UpdaterManager:
        return UpdaterManager(
            install_dir=install,
            updates_dir=updates,
            current_version=version,
            source=str(source),
            channel="pilot",
            public_key=self.public_key,
        )

    def test_signed_delta_stages_only_missing_blobs_and_refuses_downgrade(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source, package_dir = root / "source", root / "packages"
            source.mkdir(); package_dir.mkdir()
            install_package = create_fake_package(package_dir, "0.9.0", b"same", key=self.key)
            install = root / "install"
            shutil.copytree(install_package, install)
            (install / "app" / "vnoffice-config.json").write_text('{"user":"setting"}', encoding="utf-8")
            target_package = self._publish_package(source, package_dir, "0.9.1", b"only changed bytes")
            manager = self._manager(install, root / "updates", source)
            state = manager.check_and_stage()
            delta_paths = {item["path"] for item in manager._changed}
            self.assertEqual(delta_paths, {"VERSION.txt", "app/main.py", "app/payload.bin"})
            expected = sum(item["size"] for item in manager._changed if item["sha256"] not in {
                item2["sha256"] for item2 in manager._changed[:manager._changed.index(item)]
            })
            self.assertEqual(state["bytes_downloaded"], expected)
            package_bytes = sum(path.stat().st_size for path in target_package.rglob("*") if path.is_file())
            self.assertLess(state["bytes_downloaded"], package_bytes)
            print(f"END-TO-END 0.9.1 downloaded_bytes={state['bytes_downloaded']} package_bytes={package_bytes}")
            self.assertEqual((install / "app" / "vnoffice-config.json").read_text(encoding="utf-8"), '{"user":"setting"}')

            # A valid signed downgrade is refused before blob access.
            self._publish_package(source, package_dir, "0.8.9", b"older payload", min_version="0.0.0")
            downgrade_manager = self._manager(install, root / "downgrade-stage", source)
            with self.assertRaises(UpdateRefused):
                downgrade_manager.check_and_stage()
            self.assertFalse((root / "downgrade-stage" / "0.8.9" / "blobs").exists())

    def test_resume_staging_reuses_partial_and_verified_blobs(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source, package_dir = root / "source", root / "packages"
            source.mkdir(); package_dir.mkdir()
            old_package = create_fake_package(package_dir, "0.9.0", b"same", key=self.key)
            install = root / "install"
            shutil.copytree(old_package, install)
            new_package = self._publish_package(source, package_dir, "0.9.1", b"a longer changed payload")
            manifest_raw = (source / "0.9.1" / "manifest.json").read_bytes()
            manifest = json.loads(manifest_raw)
            payload_entry = next(item for item in manifest["files"] if item["path"] == "app/payload.bin")
            digest = payload_entry["sha256"]
            blob = source / "files" / digest
            stage_blob = root / "updates" / "0.9.1" / "blobs" / digest
            stage_blob.parent.mkdir(parents=True)
            stage_blob.with_name(digest + ".part").write_bytes(blob.read_bytes()[:5])
            manager = self._manager(install, root / "updates", source)
            state = manager.check_and_stage()
            self.assertTrue(stage_blob.exists())
            self.assertEqual(stage_blob.read_bytes(), blob.read_bytes())
            self.assertEqual(state["bytes_downloaded"], sum(
                max(0, int(item["size"]) - (5 if item["sha256"] == digest else 0))
                for item in manager._changed
                if item["sha256"] not in {prior["sha256"] for prior in manager._changed[:manager._changed.index(item)]}
            ))

    def test_unreachable_source_is_silent_and_unc_path_recognized(self):
        self.assertTrue(is_unc_path(r"\\192.168.1.252\company1\VNOffice-updates"))
        self.assertFalse(is_unc_path(r"C:\VNOffice-updates"))
        with tempfile.TemporaryDirectory() as temp:
            manager = self._manager(Path(temp) / "install", Path(temp) / "updates", Path(temp) / "unreachable")
            manager._background_check()
            self.assertEqual(manager.get_state()["status"], "unavailable")

    def test_power_shell_helper_applies_relaunches_and_rolls_back_failed_health(self):
        if os.name != "nt":
            self.skipTest("PowerShell apply helper is Windows-only")
        powershell = shutil.which("powershell.exe") or shutil.which("powershell")
        if not powershell:
            self.skipTest("Windows PowerShell 5.1 is unavailable")
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "VN Office scratch root"
            root.mkdir()
            source, package_dir = root / "source", root / "packages"
            source.mkdir(); package_dir.mkdir()
            package_090 = create_fake_package(package_dir, "0.9.5", b"old payload", key=self.key)
            install = root / "Local AppData" / "VNOffice" / "app-install"
            install.parent.mkdir(parents=True)
            shutil.copytree(package_090, install)
            (install / "app" / "vnoffice-config.json").write_text('{"update":{"source":"\\\\server\\share"}}', encoding="utf-8")
            updates = root / "Local AppData" / "VNOffice" / "updates"
            launch_log = root / "launches.txt"
            document_path = root / "Tài liệu kiểm tra.docx"
            document_path.write_bytes(b"scratch document fixture")

            def run_helper(manager: UpdaterManager, app_version: str, expected_code: int):
                task_path = manager.create_apply_task(
                    app_kind="writer", install_root=install, restore_documents=[str(document_path)]
                )
                task = json.loads(task_path.read_text(encoding="utf-8"))
                task["launch_executable"] = sys.executable
                task["launch_prefix_args"] = ["-u", str(install / "app" / "fake_start.py")]
                task["launch_args"] = [str(launch_log)]
                task["health_timeout_seconds"] = 15
                task_path.write_text(json.dumps(task), encoding="utf-8")
                result = subprocess.run(
                    [powershell, "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", str(task_path.parent / "apply-helper.ps1"), "-Task", str(task_path)],
                    cwd=str(root), capture_output=True, text=True, timeout=45,
                )
                error_log = updates / "apply-error.txt"
                helper_error = error_log.read_text(encoding="utf-8") if error_log.exists() else ""
                self.assertEqual(result.returncode, expected_code, result.stdout + result.stderr + helper_error)
                self.assertEqual((install / "VERSION.txt").read_text(encoding="ascii").strip(), app_version)

            package_091 = self._publish_package(source, package_dir, "0.9.6", b"new payload")
            manager_091 = self._manager(install, updates, source, version="0.9.5")
            state = manager_091.check_and_stage()
            self.assertTrue(state["ready"])
            run_helper(manager_091, "0.9.6", 0)
            self.assertEqual((install / "app" / "vnoffice-config.json").read_text(encoding="utf-8"), '{"update":{"source":"\\\\server\\share"}}')
            self.assertEqual(launch_log.read_text(encoding="utf-8").splitlines(), ["0.9.6"])
            self.assertEqual(Path(str(launch_log) + ".health").read_text(encoding="ascii"), "OK")
            restored_args = json.loads(Path(str(launch_log) + ".args").read_text(encoding="utf-8"))
            self.assertEqual(restored_args[0], f"--restore-document={document_path}")
            self.assertTrue(restored_args[1].startswith("--update-health-token=") and len(restored_args[1].split("=", 1)[1]) == 32)
            self.assertTrue((install / "app" / "payload.bin").read_bytes() == b"new payload")
            self.assertIn('APP_VERSION = "0.9.6"', (install / "app" / "main.py").read_text(encoding="utf-8"))
            self.assertTrue((updates / "update-log.txt").is_file())
            update_log = (updates / "update-log.txt").read_text(encoding="utf-8")
            self.assertIn("STEP old-app-exited", update_log)
            self.assertIn("STEP health-check-passed version=0.9.6", update_log)
            print("END-TO-END 0.9.5 -> 0.9.6 apply=OK health_marker=OK relaunch=OK path-with-spaces=OK")

            self._publish_package(source, package_dir, "0.9.7", b"broken payload", broken_start=True)
            manager_092 = self._manager(install, updates, source, version="0.9.6")
            state = manager_092.check_and_stage()
            self.assertTrue(state["ready"])
            run_helper(manager_092, "0.9.6", 2)
            self.assertFalse((install / "app" / "fail-start.txt").exists())
            self.assertEqual((install / "app" / "payload.bin").read_bytes(), b"new payload")
            self.assertEqual(launch_log.read_text(encoding="utf-8").splitlines(), ["0.9.6", "0.9.7", "0.9.6"])
            self.assertTrue((updates / "rollback-report.json").is_file())
            self.assertTrue((updates / "update-failure.json").is_file())
            self.assertIn("STEP rollback-complete restored-version=0.9.6", (updates / "update-log.txt").read_text(encoding="utf-8"))
            print("END-TO-END 0.9.7 health-failure=detected rollback=OK relaunch_old=OK")

            # Tampering a signed manifest is rejected before any content-addressed blob is read.
            manifest_path = source / "0.9.7" / "manifest.json"
            manifest_path.write_bytes(manifest_path.read_bytes() + b" ")
            tampered_manager = self._manager(install, updates, source, version="0.9.6")
            with mock.patch("adapters.updater.updater.download_blob") as download:
                with self.assertRaises(UpdateRefused):
                    tampered_manager.check_and_stage()
                download.assert_not_called()
            print("END-TO-END tampered_manifest=refused blobs_downloaded=0")

    def test_rollback_report_uses_existing_reporter_without_document_data(self):
        class Reporter:
            def __init__(self): self.events = []
            def record_error(self, **event): self.events.append(event)

        with tempfile.TemporaryDirectory() as temp:
            updates = Path(temp)
            (updates / "rollback-report.json").write_text(json.dumps({"old_version": "0.9.1", "new_version": "0.9.2"}))
            reporter = Reporter()
            self.assertTrue(queue_rollback_report(reporter, updates))
            self.assertEqual(reporter.events[0]["error_type"], "UpdateRollback")
            self.assertNotIn("document", json.dumps(reporter.events).lower())


if __name__ == "__main__":
    unittest.main()
