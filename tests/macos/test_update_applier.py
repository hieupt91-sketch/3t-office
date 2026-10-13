from __future__ import annotations

import hashlib
import json
import sys
import tempfile
import unicodedata
import unittest
import warnings
from pathlib import Path

from ports.macos.apply_helper import ApplyError, apply_task


def _entry(path: str, payload: bytes) -> dict[str, object]:
    return {"path": path, "size": len(payload), "sha256": hashlib.sha256(payload).hexdigest()}


class MacUpdateApplierTests(unittest.TestCase):
    def _fixture(self, root: Path, *, corrupt_blob: bool = False, malicious_path: str | None = None):
        app_root = root / "Application Support" / "3T Office có dấu"
        updates = root / "Cập nhật thử" / "updates"
        download_stage = updates / "0.9.11"
        blobs = download_stage / "blobs"
        old = app_root / "app-0.9.10"
        (old / "app").mkdir(parents=True)
        blobs.mkdir(parents=True)
        old_main = b"print('old')\n"
        new_main = b"print('new')\n"
        keep = "Nội dung tiếng Việt\n".encode("utf-8")
        old_version = b"0.9.10\n"
        new_version = b"0.9.11\n"
        (old / "app" / "main.py").write_bytes(old_main)
        (old / "app" / "giữ nguyên.txt").write_bytes(keep)
        (old / "app" / "xóa tôi.txt").write_bytes(b"remove\n")
        (old / "VERSION.txt").write_bytes(old_version)
        app_root.mkdir(parents=True, exist_ok=True)
        (app_root / "current").symlink_to(old.name, target_is_directory=True)

        entries = [
            _entry("app/main.py", new_main),
            _entry("app/giữ nguyên.txt", keep),
            _entry("VERSION.txt", new_version),
        ]
        if malicious_path:
            entries.append(_entry(malicious_path, b"escape"))
        replacements = [entries[0], entries[2]]
        for item, payload in ((entries[0], new_main), (entries[2], new_version)):
            blob = blobs / str(item["sha256"])
            blob.write_bytes((b"tampered" if corrupt_blob and item is entries[0] else payload))
        task = {
            "app_root": str(app_root),
            "stage_dir": str(download_stage),
            "updates_dir": str(updates),
            "old_version": "0.9.10",
            "new_version": "0.9.11",
            "manifest": {"version": "0.9.11", "files": entries},
            "replacements": replacements,
            "removals": ["app/xóa tôi.txt"],
            "log_file": str(updates / "update-log.txt"),
        }
        task_path = download_stage / "apply-task.json"
        task_path.write_text(json.dumps(task, ensure_ascii=False), encoding="utf-8")
        return task_path, app_root, old, new_main, keep, updates

    def test_success_promotes_verified_tree_and_switches_current_atomically(self):
        with tempfile.TemporaryDirectory() as temp:
            task_path, app_root, old, new_main, keep, _ = self._fixture(Path(temp))
            observations = []

            def healthy(_task, target):
                observations.append((app_root / "current").resolve() == target.resolve())
                return True

            result = apply_task(task_path, health_check=healthy)
            target = app_root / "app-0.9.11"
            self.assertEqual(result.status, "applied")
            self.assertFalse(result.rolled_back)
            self.assertEqual((app_root / "current").resolve(), target.resolve())
            self.assertEqual((target / "app" / "main.py").read_bytes(), new_main)
            self.assertEqual((target / "app" / "giữ nguyên.txt").read_bytes(), keep)
            self.assertFalse((target / "app" / "xóa tôi.txt").exists())
            self.assertEqual((old / "app" / "main.py").read_bytes(), b"print('old')\n")
            self.assertFalse((app_root / "app-0.9.11.staging").exists())
            self.assertEqual(observations, [True])

    def test_bad_blob_hash_is_refused_before_promote_and_old_version_is_untouched(self):
        with tempfile.TemporaryDirectory() as temp:
            task_path, app_root, old, _, _, _ = self._fixture(Path(temp), corrupt_blob=True)
            with self.assertRaisesRegex(ApplyError, "hash"):
                apply_task(task_path, health_check=lambda *_: True)
            self.assertEqual((app_root / "current").resolve(), old.resolve())
            self.assertFalse((app_root / "app-0.9.11").exists())
            self.assertFalse((app_root / "app-0.9.11.staging").exists())
            self.assertEqual((old / "app" / "main.py").read_bytes(), b"print('old')\n")

    def test_manifest_path_traversal_is_refused(self):
        with tempfile.TemporaryDirectory() as temp:
            task_path, app_root, old, _, _, _ = self._fixture(Path(temp), malicious_path="app/../../thoát.txt")
            with self.assertRaises(ApplyError):
                apply_task(task_path, health_check=lambda *_: True)
            self.assertEqual((app_root / "current").resolve(), old.resolve())
            self.assertFalse((Path(temp) / "thoát.txt").exists())

    def test_symlink_inside_old_version_tree_is_refused(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            task_path, app_root, old, _, _, _ = self._fixture(root)
            outside = root / "outside.txt"
            outside.write_text("safe", encoding="utf-8")
            (old / "app" / "escape-link").symlink_to(outside)
            with self.assertRaisesRegex(ApplyError, "symlink"):
                apply_task(task_path, health_check=lambda *_: True)
            self.assertEqual(outside.read_text(encoding="utf-8"), "safe")
            self.assertEqual((app_root / "current").resolve(), old.resolve())

    def test_health_failure_rolls_current_back_and_records_report(self):
        with tempfile.TemporaryDirectory() as temp:
            task_path, app_root, old, _, _, updates = self._fixture(Path(temp))
            with self.assertRaisesRegex(ApplyError, "health check"):
                apply_task(task_path, health_check=lambda *_: False)
            self.assertEqual((app_root / "current").resolve(), old.resolve())
            self.assertFalse((app_root / "app-0.9.11").exists())
            report = json.loads((updates / "rollback-report.json").read_text(encoding="utf-8"))
            self.assertEqual(report["old_version"], "0.9.10")
            self.assertEqual(report["new_version"], "0.9.11")
            self.assertNotIn("document", json.dumps(report).lower())

    def test_health_exception_also_rolls_back(self):
        with tempfile.TemporaryDirectory() as temp:
            task_path, app_root, old, _, _, _ = self._fixture(Path(temp))

            def broken(*_args):
                raise RuntimeError("probe crashed")

            with self.assertRaisesRegex(ApplyError, "Không thể áp dụng"):
                apply_task(task_path, health_check=broken)
            self.assertEqual((app_root / "current").resolve(), old.resolve())
            self.assertFalse((app_root / "app-0.9.11").exists())

    def test_default_health_check_launches_promoted_tree_and_waits_for_marker(self):
        with tempfile.TemporaryDirectory() as temp:
            task_path, app_root, _, _, _, updates = self._fixture(Path(temp))
            task = json.loads(task_path.read_text(encoding="utf-8"))
            health_file = updates / "health" / "ready.json"
            health_file.parent.mkdir()
            task.update({
                "launch_executable": sys.executable,
                "launch_args": [
                    "-c",
                    "import os,pathlib; pathlib.Path(os.environ['VNO_UPDATE_HEALTH_FILE']).write_text(os.getcwd(), encoding='utf-8')",
                ],
                "health_file": str(health_file),
                "health_token": "test-token",
                "health_timeout_seconds": 2,
            })
            task_path.write_text(json.dumps(task, ensure_ascii=False), encoding="utf-8")

            # The successful health process is deliberately allowed to keep
            # running: production launches the new desktop app, not a child to
            # reap. This tiny probe may still be exiting when Popen is collected.
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", ResourceWarning)
                result = apply_task(task_path)

            self.assertEqual(result.status, "applied")
            self.assertEqual((app_root / "current").resolve(), (app_root / "app-0.9.11").resolve())
            self.assertFalse(health_file.exists())

    def test_health_marker_outside_updates_is_refused_and_rolled_back(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            task_path, app_root, old, _, _, _ = self._fixture(root)
            task = json.loads(task_path.read_text(encoding="utf-8"))
            task.update({
                "launch_executable": sys.executable,
                "launch_args": ["-c", "pass"],
                "health_file": str(root / "outside-health.txt"),
                "health_timeout_seconds": 1,
            })
            task_path.write_text(json.dumps(task, ensure_ascii=False), encoding="utf-8")

            with self.assertRaisesRegex(ApplyError, "health_file"):
                apply_task(task_path)

            self.assertEqual((app_root / "current").resolve(), old.resolve())
            self.assertFalse((root / "outside-health.txt").exists())

    def test_existing_target_version_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as temp:
            task_path, app_root, old, _, _, _ = self._fixture(Path(temp))
            target = app_root / "app-0.9.11"
            target.mkdir()
            sentinel = target / "sentinel.txt"
            sentinel.write_text("keep", encoding="utf-8")
            with self.assertRaisesRegex(ApplyError, "đã tồn tại"):
                apply_task(task_path, health_check=lambda *_: True)
            self.assertEqual(sentinel.read_text(encoding="utf-8"), "keep")
            self.assertEqual((app_root / "current").resolve(), old.resolve())

    def test_unicode_nfd_and_spaces_are_preserved(self):
        with tempfile.TemporaryDirectory() as temp:
            nfd_name = unicodedata.normalize("NFD", "Người dùng thử")
            root = Path(temp) / nfd_name / "Thư mục có khoảng trắng"
            root.mkdir(parents=True)
            task_path, app_root, _, _, _, _ = self._fixture(root)
            result = apply_task(task_path, health_check=lambda *_: True)
            self.assertEqual(result.current_dir.name, "app-0.9.11")
            self.assertTrue((app_root / "current" / "app" / "giữ nguyên.txt").is_file())


if __name__ == "__main__":
    unittest.main()
