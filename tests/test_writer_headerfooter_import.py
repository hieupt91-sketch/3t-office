"""Writer Header/Footer import: StarWriter HTML keeps title=header/footer.

No native file dialog and no SendKeys. The helper reads the committed DOCX
fixture (FODT → soffice, never VN Office serialize). Optional integration
opens the same file through VnOfficeApi.open_document_dialog() when soffice
is available.

Unlike Track Changes / Comments, main.py does NOT need an OOXML sidecar:
filter HTML (StarWriter) already emits <div title="header|footer">.
"""

from __future__ import annotations

import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

import main

ROOT = Path(__file__).resolve().parents[1]
FIXTURE_DOCX = ROOT / "tests" / "fixtures" / "real-office-samples" / "sample-writer-headerfooter.docx"

HEADER_COMPANY = "Công ty TNHH Sao Việt"
HEADER_DEPT = "Phòng Kế hoạch"
FOOTER_DATE = "05/09/2026"


class WriterHeaderFooterImportTests(unittest.TestCase):
    def test_fixture_docx_has_native_header_footer_parts(self):
        self.assertTrue(FIXTURE_DOCX.is_file())
        with zipfile.ZipFile(FIXTURE_DOCX) as package:
            names = package.namelist()
            self.assertIn("word/header1.xml", names)
            self.assertIn("word/footer1.xml", names)
            document_xml = package.read("word/document.xml").decode("utf-8", errors="replace")
            header_xml = package.read("word/header1.xml").decode("utf-8", errors="replace")
            footer_xml = package.read("word/footer1.xml").decode("utf-8", errors="replace")
        self.assertIn("w:headerReference", document_xml)
        self.assertIn("w:footerReference", document_xml)
        self.assertNotIn(HEADER_COMPANY, document_xml)
        self.assertNotIn(FOOTER_DATE, document_xml)
        self.assertIn("<w:hdr", header_xml)
        self.assertIn(HEADER_COMPANY, header_xml)
        self.assertIn(HEADER_DEPT, header_xml)
        self.assertIn("<w:ftr", footer_xml)
        self.assertIn(FOOTER_DATE, footer_xml)
        self.assertIn("PAGE", footer_xml)
        self.assertIn("NUMPAGES", footer_xml)

    def test_non_docx_zip_helper_still_rejects_path_escape(self):
        self.assertIsNone(main._read_docx_zip_entry(str(ROOT / "README.md"), "word/header1.xml"))
        self.assertIsNone(main._read_docx_zip_entry("", "word/header1.xml"))
        self.assertIsNone(main._read_docx_zip_entry(str(FIXTURE_DOCX), "../word/header1.xml"))

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    def test_open_document_dialog_html_keeps_header_footer_divs(self):
        api = main.VnOfficeApi("writer", str(FIXTURE_DOCX))
        with patch.object(main, "_active_window", return_value=None):
            result = api.open_document_dialog("writer")
        self.assertEqual(result.get("status"), "ok")
        html = result.get("content") or ""
        self.assertIn('title="header"', html)
        self.assertIn(HEADER_COMPANY, html)
        self.assertIn(HEADER_DEPT, html)
        self.assertIn('title="footer"', html)
        self.assertIn(FOOTER_DATE, html)
        self.assertIn("Trang", html)
        self.assertRegex(html, r"Nội\s+dung")
        self.assertRegex(html, r"128/KH-ĐT")
        # PAGE fields survive as sdfield in the HTML string (adapter unwraps later).
        self.assertRegex(html, r"<sdfield\b")
        # Quy ước W26b: payload chứa ooxmlHeaderXml và ooxmlFooterXml
        self.assertIn("ooxmlHeaderXml", result)
        self.assertIn("ooxmlFooterXml", result)
        self.assertIn("<w:hdr", result["ooxmlHeaderXml"])
        self.assertIn("<w:ftr", result["ooxmlFooterXml"])

    def test_w26b_read_docx_header_footer_xmls_order_and_payload(self):
        h, f = main._read_docx_header_footer_xmls(str(FIXTURE_DOCX))
        self.assertIsNotNone(h)
        self.assertIsNotNone(f)
        self.assertIn("<w:hdr", h)
        self.assertIn("<w:ftr", f)
        self.assertIn(HEADER_COMPANY, h)
        self.assertIn(FOOTER_DATE, f)
        self.assertEqual(main._read_docx_header_footer_xmls(""), (None, None))
        self.assertEqual(main._read_docx_header_footer_xmls(str(ROOT / "README.md")), (None, None))


if __name__ == "__main__":
    unittest.main()
