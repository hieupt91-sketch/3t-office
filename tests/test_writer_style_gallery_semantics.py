import unittest
import tempfile
from pathlib import Path
import zipfile

from adapters.libreoffice.common.ooxml_zip_patch import _writer_restore_gallery_builtin_styles
import main


class WriterStyleGallerySemanticsTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
