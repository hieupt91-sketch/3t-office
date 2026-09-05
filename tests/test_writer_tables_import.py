"""Writer Tables import: StarWriter HTML keeps merge/border/shading.

No native file dialog and no SendKeys. The helper reads the committed DOCX
fixture (FODT → soffice, never VN Office serialize). Optional integration
opens the same file through VnOfficeApi.open_document_dialog() when soffice
is available.

Unlike Track Changes / Comments, main.py does NOT need an OOXML sidecar:
filter HTML (StarWriter) already emits <table rowspan/colspan> with inline
per-edge borders and cell background. The Writer adapter keeps that markup.
"""

from __future__ import annotations

import re
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

import main

ROOT = Path(__file__).resolve().parents[1]
FIXTURE_DOCX = ROOT / "tests" / "fixtures" / "real-office-samples" / "sample-writer-tables.docx"

ROWSPAN_TEXT = "Nhóm dự án thủy lợi"
COLSPAN_TEXT = "Phân bổ ngân sách năm 2026"
CELL_DA001 = "DA-001 Đăk Bla"
CELL_PER_EDGE = "980.000.000"


def _collapse(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


class WriterTablesImportTests(unittest.TestCase):
    def test_fixture_docx_has_native_table_merge_border_shading(self):
        self.assertTrue(FIXTURE_DOCX.is_file())
        with zipfile.ZipFile(FIXTURE_DOCX) as package:
            names = package.namelist()
            self.assertIn("word/document.xml", names)
            document_xml = package.read("word/document.xml").decode("utf-8", errors="replace")
        self.assertIn("<w:tbl", document_xml)
        self.assertIn("<w:gridSpan", document_xml)
        self.assertIn("<w:vMerge", document_xml)
        self.assertIn('w:val="restart"', document_xml)
        self.assertIn('w:val="continue"', document_xml)
        self.assertIn("<w:tcBorders", document_xml)
        self.assertIn("<w:shd", document_xml)
        self.assertIn('w:fill="FEF3C7"', document_xml)
        self.assertIn('w:fill="DBEAFE"', document_xml)
        self.assertIn('w:fill="DCFCE7"', document_xml)
        self.assertIn('w:fill="FECACA"', document_xml)
        self.assertIn('w:color="1D4ED8"', document_xml)
        self.assertIn('w:color="6D28D9"', document_xml)
        self.assertIn('w:color="B45309"', document_xml)
        self.assertIn(ROWSPAN_TEXT, document_xml)
        self.assertIn(COLSPAN_TEXT, document_xml)
        self.assertIn(CELL_DA001, document_xml)
        self.assertIn(CELL_PER_EDGE, document_xml)

    def test_non_docx_zip_helper_still_rejects_path_escape(self):
        self.assertIsNone(main._read_docx_zip_entry(str(ROOT / "README.md"), "word/document.xml"))
        self.assertIsNone(main._read_docx_zip_entry("", "word/document.xml"))
        self.assertIsNone(main._read_docx_zip_entry(str(FIXTURE_DOCX), "../word/document.xml"))

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    def test_open_document_dialog_html_keeps_table_merge_border_shading(self):
        api = main.VnOfficeApi("writer", str(FIXTURE_DOCX))
        with patch.object(main, "_active_window", return_value=None):
            result = api.open_document_dialog("writer")
        self.assertEqual(result.get("status"), "ok")
        html = result.get("content") or ""
        collapsed = _collapse(html)
        self.assertIn("<table", html)
        self.assertIn('rowspan="2"', html)
        self.assertIn('colspan="2"', html)
        self.assertIn("#fef3c7", html)
        self.assertIn("#dbeafe", html)
        self.assertIn("#dcfce7", html)
        self.assertIn("#fecaca", html)
        self.assertIn("#b45309", html)
        self.assertIn("#1d4ed8", html)
        self.assertIn("#6d28d9", html)
        self.assertIn("border-left: 2.25pt solid #b45309", html)
        self.assertIn("border-bottom: 1.50pt solid #6d28d9", html)
        self.assertIn(ROWSPAN_TEXT, collapsed)
        self.assertIn(COLSPAN_TEXT, collapsed)
        self.assertIn(CELL_DA001, collapsed)
        self.assertIn(CELL_PER_EDGE, collapsed)
        self.assertNotIn("#94a3b8", html)
        self.assertNotIn("ooxmlTableXml", result)


if __name__ == "__main__":
    unittest.main()
