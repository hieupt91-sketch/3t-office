"""Chunked hand-over of very large save content from the page to Python (lan14 save crash, 04/10/2026)."""
from __future__ import annotations

import sys
import time
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import main as vnmain  # noqa: E402


def make_api():
    return vnmain.VnOfficeApi.__new__(vnmain.VnOfficeApi)


def stage(api, text, chunk=1000):
    begun = api.begin_content_stage()
    assert begun["ok"], begun
    for offset in range(0, len(text), chunk):
        piece = text[offset:offset + chunk]
        assert api.append_content_stage(begun["id"], piece)["ok"]
    return {"vnoContentStage": begun["id"], "chars": len(text)}


class ContentStageTests(unittest.TestCase):
    def test_round_trip_is_lossless_including_vietnamese_and_emoji(self):
        api = make_api()
        text = ("<office:document>Việt Nam — Hà Nội 😀 𝒜 \"quote\" \n\t" * 5000)
        ref = stage(api, text, chunk=777)
        self.assertEqual(api._resolve_staged_content(ref), text)

    def test_plain_content_passes_through(self):
        api = make_api()
        self.assertEqual(api._resolve_staged_content("abc"), "abc")
        self.assertEqual(api._resolve_staged_content({"other": 1}), {"other": 1})

    def test_stage_is_consumed_once_and_file_removed(self):
        api = make_api()
        ref = stage(api, "x" * 5000)
        path = Path(api._content_stage_state()["stages"][ref["vnoContentStage"]]["path"])
        self.assertTrue(path.exists())
        api._resolve_staged_content(ref)
        self.assertFalse(path.exists())
        with self.assertRaises(vnmain.DocumentEngineError):
            api._resolve_staged_content(ref)

    def test_missing_chunks_are_detected(self):
        api = make_api()
        begun = api.begin_content_stage()
        api.append_content_stage(begun["id"], "only part")
        with self.assertRaises(vnmain.DocumentEngineError):
            api._resolve_staged_content({"vnoContentStage": begun["id"], "chars": 10_000})

    def test_unknown_stage_and_bad_chunk_are_refused(self):
        api = make_api()
        self.assertFalse(api.append_content_stage("nope", "x")["ok"])
        begun = api.begin_content_stage()
        self.assertFalse(api.append_content_stage(begun["id"], 123)["ok"])
        api.abort_content_stage(begun["id"])
        self.assertFalse(api.append_content_stage(begun["id"], "x")["ok"])

    def test_abort_removes_the_file(self):
        api = make_api()
        begun = api.begin_content_stage()
        path = Path(api._content_stage_state()["stages"][begun["id"]]["path"])
        api.append_content_stage(begun["id"], "data")
        api.abort_content_stage(begun["id"])
        self.assertFalse(path.exists())

    def test_stale_stages_are_pruned_on_begin(self):
        api = make_api()
        old = api.begin_content_stage()
        state = api._content_stage_state()
        state["stages"][old["id"]]["at"] = time.time() - 7200
        stale_path = Path(state["stages"][old["id"]]["path"])
        api.begin_content_stage()
        self.assertNotIn(old["id"], state["stages"])
        self.assertFalse(stale_path.exists())

    def test_a_300_million_character_scale_payload_is_handled_in_chunks(self):
        api = make_api()
        block = "<table:table-cell office:value=\"1\"/>" * 1000
        text = block * 1000  # ~35 million characters, the same code path as a 327 million one
        started = time.time()
        ref = stage(api, text, chunk=4 * 1024 * 1024)
        resolved = api._resolve_staged_content(ref)
        self.assertEqual(len(resolved), len(text))
        self.assertTrue(resolved == text)
        self.assertLess(time.time() - started, 60)

    def test_in_place_save_resolves_staged_content_before_converting(self):
        api = make_api()
        ref = stage(api, "x" * 100)
        captured = {}

        original_write = vnmain._write_save_source

        def fake_write(content, app_kind, temp_dir, target_format):
            captured["content"] = content
            raise vnmain.DocumentEngineError("stop here")

        vnmain._write_save_source = fake_write
        try:
            result = api._save_document_in_place_impl(ref, "sheet", str(ROOT / "nonexistent-target.xlsx"), None)
        finally:
            vnmain._write_save_source = original_write
        self.assertEqual(captured["content"], "x" * 100)
        self.assertEqual(result["status"], "error")


if __name__ == "__main__":
    unittest.main()
