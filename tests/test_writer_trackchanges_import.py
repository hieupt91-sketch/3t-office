"""Writer Track Changes import: desktop bridge forwards word/document.xml.

No native file dialog and no SendKeys. The helper reads the committed DOCX
fixture (FODT → soffice, never VN Office serialize). Optional integration
opens the same file through VnOfficeApi.open_document_dialog() when soffice
is available.
"""

from __future__ import annotations

import unittest
from pathlib import Path
from unittest.mock import patch

import main

ROOT = Path(__file__).resolve().parents[1]
FIXTURE_DOCX = ROOT / "tests" / "fixtures" / "real-office-samples" / "sample-writer-trackchanges.docx"


class WriterTrackChangesImportTests(unittest.TestCase):
    def test_read_docx_document_xml_keeps_native_revisions(self):
        xml = main._read_docx_document_xml(str(FIXTURE_DOCX))
        self.assertIsNotNone(xml)
        self.assertIn("<w:ins", xml)
        self.assertIn("<w:del", xml)
        self.assertIn('w:author="Nguyen Van An"', xml)
        self.assertIn("theo yêu cầu khẩn", xml)
        self.assertIn("bản nháp nội bộ", xml)

    def test_non_docx_returns_none(self):
        self.assertIsNone(main._read_docx_document_xml(str(ROOT / "README.md")))
        self.assertIsNone(main._read_docx_document_xml(""))

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    def test_open_document_dialog_forwards_ooxml_with_html(self):
        api = main.VnOfficeApi("writer", str(FIXTURE_DOCX))
        with patch.object(main, "_active_window", return_value=None):
            result = api.open_document_dialog("writer")
        self.assertEqual(result.get("status"), "ok")
        html = result.get("content") or ""
        xml = result.get("ooxmlDocumentXml") or ""
        self.assertIn("theo yêu cầu khẩn", html)
        self.assertNotRegex(html, r"<(ins|del)\b")
        self.assertIn("<w:ins", xml)
        self.assertIn("<w:del", xml)
        self.assertIn("Nguyen Van An", xml)


if __name__ == "__main__":
    unittest.main()
