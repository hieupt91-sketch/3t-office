import unittest
import tempfile
import base64
import json
import io
from pathlib import Path
import zipfile

from adapters.libreoffice.common.ooxml_zip_patch import _writer_restore_gallery_builtin_styles, _writer_restore_custom_paragraph_styles
import main


class WriterStyleGallerySemanticsTests(unittest.TestCase):
    def test_custom_paragraph_style_is_written_and_referenced_from_docx(self):
        style = {
            "id": "VnoKieuThu1", "name": "Kiểu thử 1", "basedOn": "Normal", "next": "Normal",
            "font": "Arial", "size": 13, "bold": True, "italic": False, "color": "#1f2937",
            "alignment": "center", "spaceAfter": 12, "lineSpacing": 1.15, "leftIndent": 0, "firstLineIndent": 0,
        }
        encoded = base64.b64encode(json.dumps(style, ensure_ascii=False).encode("utf-8")).decode("ascii")
        source_html = f'<p data-vno-style-id="{style["id"]}" data-vno-style-definition="{encoded}">Sample paragraph</p>'
        package = io.BytesIO()
        with zipfile.ZipFile(package, "w") as output:
            output.writestr("word/document.xml", '<w:document><w:body><w:p><w:r><w:t>Sample paragraph</w:t></w:r></w:p></w:body></w:document>')
            output.writestr("word/styles.xml", '<w:styles><w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>')
        result = _writer_restore_custom_paragraph_styles(package.getvalue(), source_html)
        with zipfile.ZipFile(io.BytesIO(result)) as saved:
            document = saved.read("word/document.xml").decode("utf-8")
            styles = saved.read("word/styles.xml").decode("utf-8")
        self.assertIn('<w:pStyle w:val="VnoKieuThu1"/>', document)
        self.assertIn('w:customStyle="1"', styles)
        self.assertIn('w:name w:val="Kiểu thử 1"', styles)
        self.assertIn('w:ascii="Arial"', styles)
        self.assertIn('<w:sz w:val="26"/>', styles)
        self.assertIn('<w:b/>', styles)
        self.assertIn('<w:jc w:val="center"/>', styles)

    def test_gallery_styles_use_word_builtin_paragraph_style_ids(self):
        source = (
            '<p class="vno-style-title">Document title</p>'
            '<p class="vno-style-subtitle">Document subtitle</p>'
            '<p class="vno-style-quote">Quoted words</p>'
            '<p class="vno-style-list-paragraph">List item text</p>'
        )
        document = (
            '<w:document><w:body>'
            '<w:p><w:r><w:t>Document title</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Document subtitle</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Quoted words</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>List item text</w:t></w:r></w:p>'
            '</w:body></w:document>'
        )
        result, styles = _writer_restore_gallery_builtin_styles(document, '<w:styles></w:styles>', source)
        for style_id in ("Title", "Subtitle", "Quote", "ListParagraph"):
            with self.subTest(style_id=style_id):
                self.assertIn(f'<w:pStyle w:val="{style_id}"/>', result)
                self.assertIn(f'w:styleId="{style_id}"', styles)

    def test_style_mapping_does_not_touch_unmatched_or_heading_paragraphs(self):
        source = '<p class="vno-style-title">New title</p>'
        document = (
            '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Heading</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Other paragraph</w:t></w:r></w:p>'
        )
        result, _styles = _writer_restore_gallery_builtin_styles(document, '<w:styles></w:styles>', source)
        self.assertEqual(result, document)

    def test_existing_template_style_definition_is_replaced_with_word_default(self):
        source = '<p class="vno-style-list-paragraph">List item</p>'
        document = '<w:p><w:r><w:t>List item</w:t></w:r></w:p>'
        styles = (
            '<w:styles><w:style w:type="paragraph" w:styleId="ListParagraph">'
            '<w:name w:val="List Paragraph"/><w:rPr><w:rFonts w:ascii="Times New Roman"/>'
            '<w:sz w:val="24"/></w:rPr></w:style></w:styles>'
        )
        _result, updated = _writer_restore_gallery_builtin_styles(document, styles, source)
        self.assertIn('w:ascii="Calibri"', updated)
        self.assertIn('w:sz w:val="22"', updated)

    def test_docx_export_includes_semantic_styles_and_word_default_definitions(self):
        html = (
            '<p class="vno-style-title">Document title</p>'
            '<p class="vno-style-subtitle">Document subtitle</p>'
            '<p class="vno-style-quote">Quoted words</p>'
            '<p class="vno-style-list-paragraph">List item text</p>'
        )
        with tempfile.TemporaryDirectory() as temp_dir:
            target = Path(temp_dir) / "styles.docx"
            result = main.VnOfficeApi().save_document_in_place(html, "writer", str(target), None)
            self.assertEqual(result.get("status"), "ok", result)
            with zipfile.ZipFile(target) as package:
                document = package.read("word/document.xml").decode("utf-8")
                styles = package.read("word/styles.xml").decode("utf-8")
            for style_id in ("Title", "Subtitle", "Quote", "ListParagraph"):
                self.assertIn(f'<w:pStyle w:val="{style_id}"/>', document)
                self.assertIn(f'w:styleId="{style_id}"', styles)
            self.assertIn('w:ascii="Calibri Light"', styles)

    def test_saved_custom_style_round_trips_through_writer_export_path(self):
        style = {"id": "VnoKieuThu", "name": "Kiểu thử 1", "basedOn": "Normal", "next": "Normal", "font": "Arial", "size": 13, "bold": True, "italic": False, "color": "#000000", "alignment": "center", "spaceAfter": 12, "lineSpacing": 1, "leftIndent": 0, "firstLineIndent": 0}
        encoded = base64.b64encode(json.dumps(style, ensure_ascii=False).encode("utf-8")).decode("ascii")
        html = f'<p data-vno-style-id="{style["id"]}" data-vno-style-definition="{encoded}">Styled paragraph</p>'
        with tempfile.TemporaryDirectory() as temp_dir:
            target = Path(temp_dir) / "custom-style.docx"
            result = main.VnOfficeApi().save_document_in_place(html, "writer", str(target), None)
            self.assertEqual(result.get("status"), "ok", result)
            with zipfile.ZipFile(target) as package:
                document = package.read("word/document.xml").decode("utf-8")
                styles = package.read("word/styles.xml").decode("utf-8")
            self.assertIn('<w:pStyle w:val="VnoKieuThu"/>', document)
            self.assertIn('w:customStyle="1"', styles)
            self.assertIn('w:name w:val="Kiểu thử 1"', styles)
            self.assertIn('w:ascii="Arial"', styles)


if __name__ == "__main__":
    unittest.main()
