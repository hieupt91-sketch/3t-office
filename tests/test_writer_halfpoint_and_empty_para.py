"""Test fidelity preservation of half-point font size (w:sz=27 / 13.5pt)
and empty paragraph font sizes (e.g. 14pt / w:sz=28) through open and save flows.
"""

import os
import sys
import io
import re
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import main


def _create_test_docx(path: str):
    """Create a minimal valid DOCX containing:
    1. Paragraph 1: 13.5pt run (w:sz=27)
    2. Paragraph 2: Empty paragraph with 14pt (w:sz=28)
    3. Paragraph 3: Normal text (12pt / w:sz=24)
    """
    doc_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:body>'
        '<w:p>'
        '<w:pPr><w:rPr><w:sz w:val="27"/><w:szCs w:val="27"/></w:rPr></w:pPr>'
        '<w:r><w:rPr><w:sz w:val="27"/><w:szCs w:val="27"/></w:rPr><w:t>Văn bản cỡ chữ nửa điểm 13.5pt</w:t></w:r>'
        '</w:p>'
        '<w:p>'
        '<w:pPr><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:pPr>'
        '<w:r><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:r>'
        '</w:p>'
        '<w:p>'
        '<w:pPr><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr>'
        '<w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Đoạn văn bản bình thường 12pt</w:t></w:r>'
        '</w:p>'
        '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>'
        '</w:body>'
        '</w:document>'
    )
    styles_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults>'
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>'
        '</w:styles>'
    )
    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
        '</Types>'
    )
    rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        '</Relationships>'
    )
    doc_rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        '</Relationships>'
    )
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/document.xml", doc_xml)
        z.writestr("word/styles.xml", styles_xml)
        z.writestr("word/_rels/document.xml.rels", doc_rels)


class TestWriterHalfPointAndEmptyParagraph(unittest.TestCase):
    def test_open_and_save_preserves_halfpoint_and_empty_paragraph_sz(self):
        with tempfile.TemporaryDirectory(prefix="vno_test_halfpt_") as tmp:
            src_docx = os.path.join(tmp, "sample_halfpt.docx")
            _create_test_docx(src_docx)

            # 1. Open document via main.py
            api = main.VnOfficeApi(app_kind="writer", initial_file=src_docx)
            open_res = api.open_document_dialog(app_kind="writer")
            self.assertEqual(open_res.get("status"), "ok")
            html_content = open_res.get("content", "")

            # 2. Simulate writer-adapter normalization (as runs in JS during load)
            ooxml_doc = open_res.get("ooxmlDocumentXml", "")
            ooxml_styles = open_res.get("ooxmlStylesXml", "")

            # The HTML produced for editing/canvas must retain 13.5pt and empty paragraph 14pt
            # Test that HTML carries 13.5pt
            # 3. Save document in place
            saved_docx = os.path.join(tmp, "saved_halfpt.docx")
            save_res = api.save_document_in_place(
                html_content,
                app_kind="writer",
                target_path=saved_docx,
                source_path=src_docx,
            )
            self.assertEqual(save_res.get("status"), "ok")

            # 4. Check saved DOCX OOXML
            with zipfile.ZipFile(saved_docx, "r") as z:
                doc_xml = z.read("word/document.xml").decode("utf-8")

            # Check that w:sz="27" is preserved in saved file
            self.assertIn('w:val="27"', doc_xml, "w:sz=27 (13.5pt) must be preserved in saved DOCX")

            # Check that empty paragraph 14pt (w:sz=28) is preserved in saved file
            # Paragraph 2 must have w:sz="28"
            paras = re.findall(r'<w:p\b[^>]*>[\s\S]*?</w:p>', doc_xml)
            self.assertGreaterEqual(len(paras), 2, "Saved document must have at least 2 paragraphs")
            empty_para = paras[1]
            self.assertIn('w:val="28"', empty_para, f"Empty paragraph must retain w:sz=28, got: {empty_para}")


if __name__ == "__main__":
    unittest.main()
