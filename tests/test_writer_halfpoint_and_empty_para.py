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

    def test_empty_para_adjacent_to_drawing_produces_valid_xml(self):
        """Test that empty paragraphs adjacent to drawing/anchor paragraphs with nested
        textboxes do not corrupt XML in _restore_writer_matched_formatting and postprocess_writer_docx.
        """
        import xml.etree.ElementTree as ET
        from adapters.libreoffice.common.ooxml_zip_patch import (
            _restore_writer_matched_formatting,
            _document_paragraph_ranges,
        )

        original_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
            'xmlns:v="urn:schemas-microsoft-com:vml" '
            'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">'
            '<w:body>'
            '<w:p><w:r><w:t>Heading Before</w:t></w:r></w:p>'
            '<w:p>'
            '<w:pPr><w:jc w:val="center"/></w:pPr>'
            '<w:r>'
            '<mc:AlternateContent>'
            '<mc:Choice Requires="wps"/>'
            '<mc:Fallback>'
            '<w:pict>'
            '<v:rect style="position:absolute;width:100pt;height:100pt">'
            '<v:textbox>'
            '<w:txbxContent>'
            '<w:p><w:pPr><w:pStyle w:val="BodyText"/><w:spacing w:before="0" w:after="142"/></w:pPr>'
            '<w:r><w:t>Text inside textbox</w:t></w:r>'
            '</w:p>'
            '</w:txbxContent>'
            '</v:textbox>'
            '</v:rect>'
            '</w:pict>'
            '</mc:Fallback>'
            '</mc:AlternateContent>'
            '</w:r>'
            '</w:p>'
            '<w:p><w:pPr><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="28"/></w:rPr></w:r></w:p>'
            '<w:p><w:pPr><w:ind w:left="0" w:right="0"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Next Paragraph</w:t></w:r></w:p>'
            '</w:body>'
            '</w:document>'
        )

        converted_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
            'xmlns:v="urn:schemas-microsoft-com:vml" '
            'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">'
            '<w:body>'
            '<w:p><w:r><w:t>Heading Before</w:t></w:r></w:p>'
            '<w:p>'
            '<w:pPr><w:jc w:val="center"/></w:pPr>'
            '<w:r>'
            '<mc:AlternateContent>'
            '<mc:Choice Requires="wps"/>'
            '<mc:Fallback>'
            '<w:pict>'
            '<v:rect style="position:absolute;width:100pt;height:100pt">'
            '<v:textbox>'
            '<w:txbxContent>'
            '<w:p><w:pPr><w:pStyle w:val="BodyText"/><w:spacing w:before="0" w:after="142"/></w:pPr>'
            '<w:r><w:t>Text inside textbox</w:t></w:r>'
            '</w:p>'
            '</w:txbxContent>'
            '</v:textbox>'
            '</v:rect>'
            '</w:pict>'
            '</mc:Fallback>'
            '</mc:AlternateContent>'
            '</w:r>'
            '</w:p>'
            '<w:p><w:pPr><w:pStyle w:val="BodyText"/><w:spacing w:lineRule="auto" w:line="259" w:before="0" w:after="159"/><w:ind w:hanging="0" w:left="0" w:right="0"/><w:rPr></w:rPr></w:pPr><w:r><w:rPr></w:rPr></w:r></w:p>'
            '<w:p><w:pPr><w:pStyle w:val="BodyText"/><w:spacing w:lineRule="auto" w:line="259" w:before="0" w:after="159"/><w:ind w:hanging="0" w:left="0" w:right="0"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Next Paragraph</w:t></w:r></w:p>'
            '</w:body>'
            '</w:document>'
        )

        # Paragraph ranges must not have nested/overlapping ranges
        ranges = _document_paragraph_ranges(converted_xml)
        for i in range(len(ranges)):
            for j in range(i + 1, len(ranges)):
                s1, e1 = ranges[i]
                s2, e2 = ranges[j]
                self.assertFalse(s1 <= s2 < e1 or s1 < e2 <= e1, f"Overlapping ranges: {ranges[i]} and {ranges[j]}")

        # _restore_writer_matched_formatting must produce valid XML that parses with ElementTree
        res_xml = _restore_writer_matched_formatting(
            converted_xml, original_xml,
            trusted_untouched_texts={"Heading Before", "Next Paragraph"},
            trust_all_exact=False,
        )
        try:
            root = ET.fromstring(res_xml)
        except Exception as e:
            self.fail(f"_restore_writer_matched_formatting produced invalid XML: {e}\nXML snippet:\n{res_xml}")
        self.assertIsNotNone(root)
        self.assertIn("Next Paragraph", res_xml)


if __name__ == "__main__":
    unittest.main()
