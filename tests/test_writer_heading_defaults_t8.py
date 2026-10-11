import unittest

from adapters.libreoffice.common import ooxml_zip_patch as patcher


class WriterHeadingDefaultsT8Tests(unittest.TestCase):
    def setUp(self):
        self.document = (
            '<w:document><w:body>'
            '<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:jc w:val="center"/>'
            '<w:spacing w:before="280" w:after="200"/><w:rPr><w:b/></w:rPr></w:pPr>'
            '<w:r><w:t>New heading</w:t></w:r></w:p>'
            '<w:p><w:pPr><w:pStyle w:val="Heading2"/><w:jc w:val="right"/></w:pPr>'
            '<w:r><w:t>Explicit heading</w:t></w:r></w:p>'
            '</w:body></w:document>'
        )
        self.styles = (
            '<w:styles>'
            '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/>'
            '<w:pPr><w:spacing w:before="280" w:after="200"/><w:jc w:val="center"/></w:pPr>'
            '<w:rPr><w:b/><w:sz w:val="48"/></w:rPr></w:style>'
            '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/>'
            '<w:pPr/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>'
            '</w:styles>'
        )

    def test_new_document_heading_defaults_match_word_and_remove_direct_browser_defaults(self):
        html = (
            '<!--vno-new-document-style-defaults-->'
            '<h1 data-vno-export-defaults="true">New heading</h1>'
            '<h2 data-vno-export-defaults="true" style="color:red">Explicit heading</h2>'
        )
        document, styles = patcher._writer_apply_word_default_heading_styles_for_new_documents(
            self.document, self.styles, html
        )

        paragraphs = document.split('<w:p>')[1:]
        self.assertIn('<w:pStyle w:val="Heading1"/>', paragraphs[0])
        self.assertNotIn('<w:jc', paragraphs[0])
        self.assertNotIn('<w:spacing', paragraphs[0])
        self.assertNotIn('<w:b/>', paragraphs[0])
        self.assertIn('<w:jc w:val="right"/>', paragraphs[1])
        self.assertIn('w:before="240" w:after="0"', styles)
        self.assertIn('w:asciiTheme="majorHAnsi"', styles)
        self.assertIn('w:themeColor="accent1" w:themeShade="BF"', styles)
        self.assertIn('<w:sz w:val="32"/>', styles)
        self.assertIn('<w:sz w:val="26"/>', styles)

    def test_imported_document_without_new_document_marker_is_unchanged(self):
        document, styles = patcher._writer_apply_word_default_heading_styles_for_new_documents(
            self.document, self.styles,
            '<h1 data-vno-export-defaults="true">New heading</h1>',
        )
        self.assertEqual(document, self.document)
        self.assertEqual(styles, self.styles)

    def test_new_document_major_theme_font_resolves_to_word_heading_font(self):
        theme = '<a:theme><a:themeElements><a:fontScheme><a:majorFont><a:latin typeface="Arial"/><a:ea typeface="DejaVu Sans"/></a:majorFont></a:fontScheme></a:themeElements></a:theme>'
        html = '<!--vno-new-document-style-defaults--><h1 data-vno-export-defaults="true">Title</h1>'
        result = patcher._writer_apply_word_default_heading_theme_for_new_documents(theme, html)
        self.assertIn('<a:latin typeface="Calibri Light"/>', result)
        self.assertIn('<a:ea typeface="DejaVu Sans"/>', result)

    def test_imported_document_theme_is_unchanged(self):
        theme = '<a:majorFont><a:latin typeface="Arial"/></a:majorFont>'
        self.assertEqual(
            patcher._writer_apply_word_default_heading_theme_for_new_documents(
                theme, '<h1 data-vno-export-defaults="true">Imported</h1>'
            ),
            theme,
        )

    def test_new_document_textbox_margins_match_word_defaults(self):
        document = '<w:document><wp:anchor><wps:bodyPr lIns="0" tIns="0" rIns="0" bIns="0"><a:noAutofit/></wps:bodyPr><w:txbxContent><w:p/></w:txbxContent></wp:anchor></w:document>'
        html = '<!--vno-new-document-style-defaults--><div class="vno-writer-textbox-body">Text</div>'
        result = patcher._writer_apply_word_default_textbox_margins_for_new_documents(document, html)
        self.assertIn('lIns="91440" tIns="45720" rIns="91440" bIns="45720"', result)

    def test_imported_document_textbox_margins_are_unchanged(self):
        document = '<w:document><wp:anchor><wps:bodyPr lIns="0"/><w:txbxContent/></wp:anchor></w:document>'
        self.assertEqual(
            patcher._writer_apply_word_default_textbox_margins_for_new_documents(
                document, '<div class="vno-writer-textbox-body">Imported</div>'
            ),
            document,
        )


if __name__ == "__main__":
    unittest.main()

