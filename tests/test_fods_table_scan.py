"""The find-based FODS table scan must give exactly what the lazy regex gave (it only avoids the 9 s regex walk on lan14)."""

from __future__ import annotations

import os
import sys
import unittest
from unittest import mock

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import main as vnmain  # noqa: E402

P = vnmain._ooxml_zip_patch()


def regex_sub(xml, fn):
    return P._FODS_TABLE_RE.sub(fn, xml)


def mark(match):
    # Uses every group so a wrong split shows up.
    return f"[{match.group(1)}|{len(match.group(2))}|{match.group(3)}|{len(match.group(0))}]"


CASES = {
    "no table": "<a><b/></a>",
    "one table": "<x><table:table table:name='A'><table:table-row/></table:table><y/>",
    "two tables": "<table:table table:name='A'>rows1</table:table>mid<table:table table:name='B'>rows2</table:table>tail",
    "table at start and end": "<table:table a='1'></table:table>",
    "unclosed table": "pre<table:table a='1'>body without close",
    "close before nothing": "</table:table>stray",
    "row-like tag before table (word boundary)": "<table:table-row x='1'>r</table:table-row><table:table a='b'>t</table:table>",
    "attribute with >-free value": "<table:table table:name='Sheet 1' table:style-name='ta1'>x</table:table>",
    "adjacent tables": "<table:table n='1'>a</table:table><table:table n='2'>b</table:table>",
}


class TableScanEquivalenceTests(unittest.TestCase):
    def test_find_scan_equals_the_regex_on_the_shapes_libreoffice_writes(self):
        for name, xml in CASES.items():
            with self.subTest(name=name):
                self.assertEqual(P._sub_fods_tables(xml, mark), regex_sub(xml, mark))

    def test_unchanged_text_is_returned_as_is_when_no_table_matches(self):
        text = "<office:document><text/></office:document>"
        self.assertEqual(P._sub_fods_tables(text, mark), text)

    def test_closing_tags_with_blanks_and_the_regex_flag_keep_the_original_path(self):
        xml = "<table:table n='1'>body</table:table >after"
        self.assertEqual(P._sub_fods_tables(xml, mark), regex_sub(xml, mark))
        with mock.patch.dict(os.environ, {"VNO_FODS_TABLE_REGEX": "1"}):
            plain = "<table:table n='1'>body</table:table>"
            self.assertEqual(P._sub_fods_tables(plain, mark), regex_sub(plain, mark))

    def test_optimizer_output_is_identical_with_either_scan(self):
        row = "<table:table-row><table:table-cell table:style-name='ce1' table:number-columns-repeated='200'/></table:table-row>"
        xml = "<office:body>" + "".join(
            f"<table:table table:name='S{i}'>{row * 3}<table:table-row><table:table-cell office:value-type='float' office:value='{i}'/></table:table-row></table:table>"
            for i in range(3)
        ) + "</office:body>"
        with mock.patch.dict(os.environ, {"VNO_FODS_TABLE_REGEX": "1"}):
            expected = P.optimize_fods_streaming(xml)
        self.assertEqual(P.optimize_fods_streaming(xml), expected)


if __name__ == "__main__":
    unittest.main()


class OpenTagScanEquivalenceTests(unittest.TestCase):
    def test_find_path_matches_regex_for_sheet_open_tag_shapes(self):
        xml = (
            "<office:spreadsheet><table:table-cell/></office:spreadsheet>"
            "<table:table table:name=\"First\"></table:table>"
            "<table:table\ntable:name=\"Newline\">x</table:table>"
            "<table:table table:name=\"Last\">y</table:table>"
            "<table:table></table:table>"
            "<table:table/>"
            "<table:table-row><table:table-cell/></table:table-row>"
        )
        def replace(match):
            return f"<table:table{match.group(1)} scanned=\"yes\">"
        expected = P._FODS_TABLE_OPEN_TAG_RE.sub(replace, xml)
        self.assertEqual(P._sub_fods_table_open_tags(xml, replace), expected)

    def test_many_cell_prefix_decoys_are_ignored(self):
        xml = "<table:table-cell/>" * 20000 + "<table:table table:name=\"Sheet\">body</table:table>"
        replace = lambda match: match.group(0) + "<!--found-->"
        expected = P._FODS_TABLE_OPEN_TAG_RE.sub(replace, xml)
        self.assertEqual(P._sub_fods_table_open_tags(xml, replace), expected)

    def test_freeze_self_closing_delimiter_matches_regex(self):
        xml = "<table:table/>"
        replace = lambda match: match.group(0) + "!"
        expected = P._FREEZE_TABLE_TAG_RE.sub(replace, xml)
        self.assertEqual(P._sub_fods_table_open_tags(xml, replace, P._FREEZE_TABLE_TAG_RE), expected)
