from __future__ import annotations

import contextlib
import importlib.util
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "layout-audit" / "_batch_pptx.py"
SPEC = importlib.util.spec_from_file_location("vno_batch_pptx", MODULE_PATH)
assert SPEC and SPEC.loader
BATCH_PPTX = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BATCH_PPTX)


class BatchPptxHookTests(unittest.TestCase):
    def test_compare_pptx_metrics_all_match(self):
        orig = {"slides": 5, "shapes": 12, "pics": 2, "withNotes": 1, "withAnim": 0}
        saved = {"slides": 5, "shapes": 12, "pics": 2, "withNotes": 1, "withAnim": 0}
        matches, diffs = BATCH_PPTX.compare_pptx_metrics(orig, saved)
        self.assertTrue(matches)
        self.assertEqual(diffs, [])

    def test_compare_pptx_metrics_detects_divergence(self):
        orig = {"slides": 5, "shapes": 12, "pics": 2, "withNotes": 1, "withAnim": 0}
        saved = {"slides": 5, "shapes": 11, "pics": 1, "withNotes": 0, "withAnim": 1}
        matches, diffs = BATCH_PPTX.compare_pptx_metrics(orig, saved)
        self.assertFalse(matches)
        self.assertEqual(len(diffs), 4)
        self.assertTrue(any("shape count" in d for d in diffs))
        self.assertTrue(any("picture count" in d for d in diffs))
        self.assertTrue(any("notes count" in d for d in diffs))
        self.assertTrue(any("animation count" in d for d in diffs))

    def test_pptx_inputs_filters_by_name(self):
        with tempfile.TemporaryDirectory() as td:
            dir_path = Path(td)
            (dir_path / "deck1.pptx").touch()
            (dir_path / "deck2.pptx").touch()
            (dir_path / "other.txt").touch()

            all_inputs = BATCH_PPTX._pptx_inputs(dir_path, [])
            self.assertEqual(len(all_inputs), 2)
            self.assertTrue(all(p.suffix == ".pptx" for p in all_inputs))

            selected = BATCH_PPTX._pptx_inputs(dir_path, ["deck1.pptx"])
            self.assertEqual(len(selected), 1)
            self.assertEqual(selected[0].name, "deck1.pptx")

    def test_run_batch_pass_path(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            input_dir = root / "inputs"
            input_dir.mkdir()
            out_dir = root / "outputs"
            sample = input_dir / "test.pptx"
            sample.write_bytes(b"dummy pptx")

            mock_orig_metrics = {
                "status": "PASS",
                "slides": 3,
                "shapes": 8,
                "pics": 1,
                "withNotes": 0,
                "withAnim": 0,
            }
            mock_saved_metrics = dict(mock_orig_metrics)

            def fake_roundtrip(source, destination, edit=True, large_file=False):
                destination.write_bytes(b"saved pptx")
                return {
                    "status": "PASS",
                    "edit": {"pass": True, "detail": "Slide 1 title changed"},
                    "message": "Saved successfully",
                }

            with (
                patch.object(BATCH_PPTX, "_powerpoint_oracle", side_effect=[mock_orig_metrics, mock_saved_metrics]),
                patch.object(BATCH_PPTX, "_run_desktop_roundtrip_pptx", side_effect=fake_roundtrip),
                contextlib.redirect_stdout(io.StringIO()),
            ):
                rows = BATCH_PPTX.run_batch(root, input_dir, out_dir, ["test.pptx"])

            self.assertEqual(len(rows), 1)
            row = rows[0]
            self.assertEqual(row["app"], "3T Slide")
            self.assertEqual(row["status"], "PASS")
            self.assertEqual(row["saved"], "yes")
            self.assertEqual(row["office"], "PASS")
            self.assertEqual(row["edit"], "PASS")
            self.assertEqual(row["Word pages"], "3")
            self.assertEqual(row["saved pages"], "3")
            self.assertEqual(row["page delta"], "0")

    def test_run_batch_fails_when_metric_diverges(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            input_dir = root / "inputs"
            input_dir.mkdir()
            out_dir = root / "outputs"
            sample = input_dir / "deck.pptx"
            sample.write_bytes(b"dummy")

            mock_orig = {"status": "PASS", "slides": 4, "shapes": 10, "pics": 2, "withNotes": 0, "withAnim": 0}
            mock_saved = {"status": "PASS", "slides": 4, "shapes": 9, "pics": 2, "withNotes": 0, "withAnim": 0}

            def fake_roundtrip(source, destination, edit=True, large_file=False):
                destination.write_bytes(b"saved")
                return {"status": "PASS", "edit": {"pass": True}}

            with (
                patch.object(BATCH_PPTX, "_powerpoint_oracle", side_effect=[mock_orig, mock_saved]),
                patch.object(BATCH_PPTX, "_run_desktop_roundtrip_pptx", side_effect=fake_roundtrip),
                contextlib.redirect_stdout(io.StringIO()),
            ):
                rows = BATCH_PPTX.run_batch(root, input_dir, out_dir, ["deck.pptx"])

            self.assertEqual(len(rows), 1)
            row = rows[0]
            self.assertEqual(row["status"], "FAIL")
            self.assertIn("shape count mismatch", row["details"])

    def test_run_batch_blocks_on_missing_input(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            input_dir = root / "inputs"
            input_dir.mkdir()
            out_dir = root / "outputs"

            rows = BATCH_PPTX.run_batch(root, input_dir, out_dir, ["nonexistent.pptx"])
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["status"], "BLOCKED")
            self.assertEqual(rows[0]["saved"], "no")

    def test_batch_document_audit_loads_hook(self):
        audit_path = ROOT / "scripts" / "layout-audit" / "batch_document_audit.py"
        audit_spec = importlib.util.spec_from_file_location("vno_batch_doc_audit", audit_path)
        assert audit_spec and audit_spec.loader
        audit_mod = importlib.util.module_from_spec(audit_spec)
        audit_spec.loader.exec_module(audit_mod)

        with tempfile.TemporaryDirectory() as td:
            td_path = Path(td)
            # Calling _run_pptx with empty directory: should return [] not BLOCKED hook error
            result = audit_mod._run_pptx(td_path, td_path / "out", [])
            self.assertEqual(result, [])


if __name__ == "__main__":
    unittest.main()
