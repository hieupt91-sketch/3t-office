"""Writer Comments import: desktop bridge forwards word/comments.xml.

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
FIXTURE_DOCX = ROOT / "tests" / "fixtures" / "real-office-samples" / "sample-writer-comments.docx"


class WriterCommentsImportTests(unittest.TestCase):
    def test_read_docx_comments_xml_keeps_native_comments(self):
        comments_xml = main._read_docx_comments_xml(str(FIXTURE_DOCX))
        document_xml = main._read_docx_document_xml(str(FIXTURE_DOCX))
        self.assertIsNotNone(comments_xml)
        self.assertIsNotNone(document_xml)
        self.assertIn("<w:comment", comments_xml)
        self.assertIn('w:author="Tran Thi Hoa"', comments_xml)
        self.assertIn('w:author="Pham Minh Duc"', comments_xml)
        self.assertIn("Cần đối chiếu số liệu quý II trước khi trình.", comments_xml)
        self.assertIn("Xác nhận chữ ký người soạn.", comments_xml)
        self.assertIn("w:commentRangeStart", document_xml)
        self.assertIn("w:commentReference", document_xml)
        self.assertIn("dự toán năm 2026", document_xml)
        self.assertIn("Lê Văn Cường", document_xml)

    def test_non_docx_returns_none(self):
        self.assertIsNone(main._read_docx_comments_xml(str(ROOT / "README.md")))
        self.assertIsNone(main._read_docx_comments_xml(""))
        self.assertIsNone(main._read_docx_zip_entry(str(FIXTURE_DOCX), "../word/comments.xml"))

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    def test_open_document_dialog_forwards_comments_xml_with_html(self):
        api = main.VnOfficeApi("writer", str(FIXTURE_DOCX))
        with patch.object(main, "_active_window", return_value=None):
            result = api.open_document_dialog("writer")
        self.assertEqual(result.get("status"), "ok")
        html = result.get("content") or ""
        document_xml = result.get("ooxmlDocumentXml") or ""
        comments_xml = result.get("ooxmlCommentsXml") or ""
        self.assertIn("dự toán năm 2026", html)
        self.assertIn("Lê Văn Cường", html)
        self.assertNotRegex(html, r"<mark\b")
        self.assertNotIn("Tran Thi Hoa", html)
        self.assertNotIn("Pham Minh Duc", html)
        self.assertIn("Cần đối chiếu số liệu quý II trước khi trình.", html)
        self.assertIn("w:commentRangeStart", document_xml)
        self.assertIn('w:author="Tran Thi Hoa"', comments_xml)
        self.assertIn("Xác nhận chữ ký người soạn.", comments_xml)


if __name__ == "__main__":
    unittest.main()
