from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
import uuid
from pathlib import Path
from unittest import mock

from adapters.error_reporting.reporter import ErrorReporter


ROOT = Path(__file__).resolve().parents[1]
STORE_PATH = ROOT / "platform" / "autorecover" / "store.py"
STORE_SPEC = importlib.util.spec_from_file_location("vno_test_autorecover_store", STORE_PATH)
assert STORE_SPEC and STORE_SPEC.loader
STORE_MODULE = importlib.util.module_from_spec(STORE_SPEC)
sys.modules[STORE_SPEC.name] = STORE_MODULE
STORE_SPEC.loader.exec_module(STORE_MODULE)
AutoRecoverStore = STORE_MODULE.AutoRecoverStore


class AutoRecoverStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.data_dir = Path(self.temp_dir.name) / "VNOffice"
        self.store = AutoRecoverStore(self.data_dir)
        self.doc_id = str(uuid.uuid4())

    def tearDown(self):
        self.temp_dir.cleanup()

    def write(self, store=None, *, content="<p>draft</p>", doc_id=None, app="writer"):
        return (store or self.store).write_snapshot(
            doc_id=doc_id or self.doc_id,
            app_kind=app,
            content=content,
            original_path=r"C:\Users\Pilot\Documents\draft.docx",
            title="draft.docx",
            file_format={"writer": "html", "sheet": "fods", "slides": "fodp"}[app],
        )

    def test_atomic_replace_keeps_previous_complete_snapshot_when_replace_fails(self):
        result = self.write(content="version one")
        self.assertEqual(result["status"], "ok")
        snapshot = self.store.session_dir / f"{self.doc_id}.html"

        with mock.patch.object(STORE_MODULE.os, "replace", side_effect=OSError("simulated replace failure")):
            failed = self.write(content="version two")

        self.assertEqual(failed["status"], "error")
        self.assertEqual(snapshot.read_text(encoding="utf-8"), "version one")
        self.assertEqual(list(self.store.session_dir.glob("*.tmp")), [])

    def test_unchanged_content_is_not_rewritten_and_format_manifest_is_saved(self):
        first = self.write(content="<p>unchanged</p>")
        snapshot = self.store.session_dir / f"{self.doc_id}.html"
        original_mtime = snapshot.stat().st_mtime_ns
        second = self.write(content="<p>unchanged</p>")
        manifest_path = snapshot.with_suffix(".html.json")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

        self.assertTrue(first["written"])
        self.assertFalse(second["written"])
        self.assertEqual(snapshot.stat().st_mtime_ns, original_mtime)
        self.assertEqual(manifest["app_kind"], "writer")
        self.assertEqual(manifest["original_path"], r"C:\Users\Pilot\Documents\draft.docx")
        self.assertEqual(manifest["title"], "draft.docx")
        self.assertEqual(manifest["format"], "html")
        self.assertTrue(manifest["saved_at"])

    def test_snapshot_format_and_size_limits_are_enforced(self):
        bad_format = self.store.write_snapshot(
            doc_id=self.doc_id, app_kind="sheet", content="<table/>", file_format="html"
        )
        self.assertEqual(bad_format["status"], "error")

        with mock.patch.object(STORE_MODULE, "MAX_SNAPSHOT_BYTES", 4):
            too_large = self.write(content="12345")
        self.assertEqual(too_large["status"], "error")
        self.assertFalse((self.store.session_dir / f"{self.doc_id}.html").exists())

    def test_global_count_and_total_byte_limits_prune_old_snapshots(self):
        with mock.patch.object(STORE_MODULE, "MAX_SNAPSHOT_COUNT", 2):
            for _ in range(3):
                result = self.write(content=f"snapshot-{uuid.uuid4()}", doc_id=str(uuid.uuid4()))
                self.assertEqual(result["status"], "ok")
        manifests = list(self.store.root.glob("*/*.json"))
        self.assertEqual(len(manifests), 2)

        small_doc = str(uuid.uuid4())
        with mock.patch.object(STORE_MODULE, "MAX_TOTAL_BYTES", 128):
            result = self.write(content="x" * 80, doc_id=small_doc)
        self.assertEqual(result["status"], "error")
        self.assertLessEqual(
            sum(path.stat().st_size for path in self.store.root.rglob("*") if path.is_file()),
            128,
        )

    def test_save_cleanup_and_session_cleanup_are_scoped(self):
        own = self.write()
        other = AutoRecoverStore(self.data_dir)
        other_id = str(uuid.uuid4())
        external = self.write(other, doc_id=other_id, content="other session")

        self.assertTrue(self.store.delete_document_snapshot(self.doc_id))
        self.assertFalse((self.store.session_dir / f"{self.doc_id}.html").exists())
        self.assertTrue(other.read_snapshot(external["snapshot_id"])["status"] == "ok")

        self.write(content="clean-close")
        self.store.cleanup_session()
        self.assertFalse(self.store.session_dir.exists())
        self.assertTrue(other.session_dir.exists())

    def test_leftover_detection_excludes_current_session_and_reads_recovery_copy(self):
        result = self.write(content="<p>recover me</p>")
        self.assertEqual(self.store.list_leftovers(), [])

        next_session = AutoRecoverStore(self.data_dir)
        leftovers = next_session.list_leftovers()
        self.assertEqual(len(leftovers), 1)
        self.assertEqual(leftovers[0]["snapshot_id"], result["snapshot_id"])
        recovered = next_session.read_snapshot(result["snapshot_id"])
        self.assertEqual(recovered["status"], "ok")
        self.assertEqual(recovered["content"], "<p>recover me</p>")

    def test_corrupt_snapshot_is_reported_and_kept(self):
        result = self.write()
        snapshot = self.store.session_dir / f"{self.doc_id}.html"
        snapshot.write_bytes(b"\xff\xfe")
        next_session = AutoRecoverStore(self.data_dir)

        failure = next_session.read_snapshot(result["snapshot_id"])
        self.assertEqual(failure["status"], "error")
        self.assertIn("vẫn được giữ", failure["message"])
        self.assertTrue(snapshot.exists())

    def test_settings_default_and_clamp_to_supported_interval(self):
        self.assertEqual(self.store.get_settings(), {"enabled": True, "interval_minutes": 5})
        saved = self.store.set_settings({"enabled": False, "interval_minutes": 999})
        self.assertEqual(saved, {"enabled": False, "interval_minutes": 60})
        self.assertEqual(self.store.get_settings(), saved)

    def test_killed_process_leaves_snapshot_offered_by_next_session(self):
        script = r"""
import importlib.util, sys, time, uuid
spec = importlib.util.spec_from_file_location('crash_store', sys.argv[1])
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
store = module.AutoRecoverStore(sys.argv[2])
result = store.write_snapshot(doc_id=str(uuid.uuid4()), app_kind='sheet', content='<office:spreadsheet/>', title='lan06.xlsx', original_path='lan06.xlsx', file_format='fods')
print(result['snapshot_id'], flush=True)
time.sleep(45)
"""
        process = subprocess.Popen(
            [sys.executable, "-c", script, str(STORE_PATH), str(self.data_dir)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        try:
            snapshot_id = process.stdout.readline().strip()
            self.assertRegex(snapshot_id, r"^[0-9a-f-]{36}/[0-9a-f-]{36}$")
            process.kill()
            process.wait(timeout=10)
        finally:
            if process.poll() is None:
                process.kill()
                process.wait(timeout=10)
            if process.stdout:
                process.stdout.close()
            if process.stderr:
                process.stderr.close()

        next_session = AutoRecoverStore(self.data_dir)
        offered = next_session.list_leftovers()
        self.assertEqual(len(offered), 1)
        self.assertEqual(offered[0]["title"], "lan06.xlsx")
        self.assertEqual(offered[0]["app_kind"], "sheet")

    def test_error_report_queue_and_attachments_never_include_recovery_files(self):
        result = self.write(content="private recovery data")
        recovery_path = self.store.session_dir / f"{self.doc_id}.html"
        reporter = ErrorReporter("0.9.0", "writer", self.data_dir, sender_thread=False)

        feedback = reporter.submit_user_feedback(
            "Please help", attach_current_file=True, current_file=recovery_path, app_kind="writer"
        )
        direct = reporter.record_error(
            error_type="RuntimeError", message="failure", file_path=recovery_path, operation="open.docx"
        )
        self.assertFalse(feedback["queued"])
        self.assertIsNone(direct)
        self.assertEqual(list(reporter.queue_dir.glob("*.json")), [])
        self.assertEqual(list(reporter.attachments_dir.iterdir()), [])
        self.assertEqual(reporter.get_state()["queue_count"], 0)
        self.assertEqual(self.store.read_snapshot(result["snapshot_id"])["content"], "private recovery data")
        reporter.stop()


if __name__ == "__main__":
    unittest.main()
