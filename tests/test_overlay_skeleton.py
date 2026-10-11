"""Skeleton overlay (table bodies cut out while the head steps run) must equal the whole-document sequence."""

import os
import re
import unittest
from pathlib import Path
from unittest.mock import patch

import main


ROOT = Path(__file__).resolve().parents[1]
SAMPLES = ROOT / "tests" / "fixtures" / "real-office-samples"


class OverlaySkeletonTests(unittest.TestCase):
    def setUp(self):
        self.patcher = main._ooxml_zip_patch()

    def test_table_open_tag_scan_matches_the_regex(self):
        xml = (
            '<a><table:table table:name="A" x="1"><table:table-row><table:table-cell/></table:table-row></table:table>'
            '<table:table\ttable:name="B"/><table:table-column/><table:table></table:table>'
            '<table:table table:name="C>'  # a quote left open: both stop at the first '>'
            '<table:table-row/><table:table'  # no closing '>' at all: neither finds a tag
        )
        pattern = re.compile(r"<table:table(?=[\s>/])([^>]*)>")

        def mark(match):
            return f"<T{match.group(1).upper()}|{match.group(0).count('=')}>"

        self.assertEqual(self.patcher._sub_table_open_tags(xml, mark), pattern.sub(mark, xml))
        self.assertEqual(self.patcher._sub_table_open_tags(xml, lambda match: match.group(0)), xml)

    def test_skeleton_overlay_equals_whole_document_overlay(self):
        fods = (SAMPLES / "src" / "sample-sheet.fods").read_text(encoding="utf-8")
        xlsx = (SAMPLES / "sample-sheet.xlsx").read_bytes()
        patcher = self.patcher
        with patch.dict(os.environ, {"VNO_OVERLAY_SKELETON": "0"}):
            patcher._INDEX_MEMO.clear()
            expected = patcher.overlay_sheet_xlsx_fods_p1(xlsx, fods)
        with patch.object(patcher, "_P1_PARALLEL_FODS_CHARS", 1), patch.dict(os.environ, {"VNO_OVERLAY_SKELETON": "1"}):
            patcher._INDEX_MEMO.clear()
            actual = patcher.overlay_sheet_xlsx_fods_p1(xlsx, fods)
        patcher._shutdown_p1_process_pool()
        self.assertEqual(actual, expected)

    def test_put_back_restores_every_body_in_order(self):
        skeleton = '<o><table:table a="1"></table:table><x/><table:table a="2"></table:table></o>'
        result = self.patcher._put_back_table_bodies(skeleton, ["<r>1</r>", "<r>2</r>"])
        self.assertEqual(result, '<o><table:table a="1"><r>1</r></table:table><x/><table:table a="2"><r>2</r></table:table></o>')
        with self.assertRaises(ValueError):
            self.patcher._put_back_table_bodies(skeleton, ["only one"])


if __name__ == "__main__":
    unittest.main()
