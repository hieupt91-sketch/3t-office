"""Writer Footnotes/Endnotes import: StarWriter HTML keeps sdfootnote/sdendnote.

No native file dialog and no SendKeys. The helper reads the committed DOCX
fixture (FODT → soffice, never VN Office serialize). Optional integration
opens the same file through VnOfficeApi.open_document_dialog() when soffice
is available.

Unlike Track Changes / Comments, main.py does NOT need an OOXML sidecar:
filter HTML (StarWriter) already emits a.sdfootnoteanc / a.sdendnoteanc and
div#sdfootnoteN / #sdendnoteN. The Writer adapter maps those to VN markup.
"""

from __future__ import annotations

import re
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

import main

ROOT = Path(__file__).resolve().parents[1]
FIXTURE_DOCX = ROOT / "tests" / "fixtures" / "real-office-samples" / "sample-writer-footnotes.docx"

FN1_BODY = "thay thế một số điều của Nghị định 59/2015/NĐ-CP"
FN2_BODY = "do Bộ Xây dựng ban hành ngày 25/8/2021"
EN1_BODY = "bảng khối lượng đào đắp Đăk Bla"
BODY_KENH = "phương án kênh chính"


def _collapse(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


class WriterFootnotesImportTests(unittest.TestCase):
    def test_fixture_docx_has_native_footnote_endnote_parts(self):
        self.assertTrue(FIXTURE_DOCX.is_file())
        with zipfile.ZipFile(FIXTURE_DOCX) as package:
            names = package.namelist()
            self.assertIn("word/footnotes.xml", names)
            self.assertIn("word/endnotes.xml", names)
            document_xml = package.read("word/document.xml").decode("utf-8", errors="replace")
            footnotes_xml = package.read("word/footnotes.xml").decode("utf-8", errors="replace")
            endnotes_xml = package.read("word/endnotes.xml").decode("utf-8", errors="replace")
        self.assertIn("w:footnoteReference", document_xml)
        self.assertIn("w:endnoteReference", document_xml)
        self.assertNotIn(FN1_BODY, document_xml)
        self.assertNotIn(EN1_BODY, document_xml)
        self.assertIn("<w:footnotes", footnotes_xml)
        self.assertIn(FN1_BODY, footnotes_xml)
        self.assertIn(FN2_BODY, footnotes_xml)
        self.assertNotIn(EN1_BODY, footnotes_xml)
        self.assertIn("<w:endnotes", endnotes_xml)
        self.assertIn(EN1_BODY, endnotes_xml)
        self.assertNotIn(FN1_BODY, endnotes_xml)

    def test_non_docx_zip_helper_still_rejects_path_escape(self):
        self.assertIsNone(main._read_docx_zip_entry(str(ROOT / "README.md"), "word/footnotes.xml"))
        self.assertIsNone(main._read_docx_zip_entry("", "word/footnotes.xml"))
        self.assertIsNone(main._read_docx_zip_entry(str(FIXTURE_DOCX), "../word/footnotes.xml"))

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    def test_open_document_dialog_html_keeps_starwriter_notes(self):
        api = main.VnOfficeApi("writer", str(FIXTURE_DOCX))
        with patch.object(main, "_active_window", return_value=None):
            result = api.open_document_dialog("writer")
        self.assertEqual(result.get("status"), "ok")
        html = result.get("content") or ""
        self.assertIn('class="sdfootnoteanc"', html)
        self.assertIn('class="sdendnoteanc"', html)
        self.assertIn('id="sdfootnote1"', html)
        self.assertIn('id="sdendnote1"', html)
        collapsed = _collapse(html)
        self.assertIn(FN1_BODY, collapsed)
        self.assertIn(FN2_BODY, collapsed)
        self.assertIn(EN1_BODY, collapsed)
        self.assertIn(BODY_KENH, collapsed)
        # Adapter maps StarWriter → VN markup; main.py does not need a sidecar.
        self.assertNotIn("ooxmlFootnotesXml", result)
        self.assertNotIn("ooxmlEndnotesXml", result)


if __name__ == "__main__":
    unittest.main()
