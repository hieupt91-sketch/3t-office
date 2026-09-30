import unittest

from adapters.libreoffice.common.ooxml_zip_patch import (
    _writer_clone_lower_alpha_suffix,
    _writer_insert_page_field,
    _restore_writer_html_page_breaks,
    _writer_restore_created_paragraph_css,
    _writer_restore_created_run_highlight,
)


class WriterBasicOpsOoxmlTests(unittest.TestCase):
    def test_justify_and_exact_line_spacing_restore_from_html_css(self):
        source = '<p style="text-align:justify;line-height:18pt">Đoạn chính</p>'
        paragraph = (
            '<w:p><w:pPr><w:spacing w:before="80" w:after="100" w:line="360" w:lineRule="atLeast"/>'
            '</w:pPr><w:r><w:t>Đoạn chính</w:t></w:r></w:p>'
        )
        updated = _writer_restore_created_paragraph_css(paragraph, source)
        self.assertIn('<w:jc w:val="both"/>', updated)
        self.assertIn('w:line="360"', updated)
        self.assertIn('w:lineRule="exact"', updated)
        self.assertIn('w:before="80"', updated)
        self.assertIn('w:after="100"', updated)

    def test_run_highlight_uses_word_highlight_instead_of_run_shading(self):
        run = (
            '<w:r><w:rPr><w:color w:val="C00000"/><w:shd w:val="clear" w:fill="FFFF00"/>'
            '</w:rPr><w:t>MỨC PHẠT</w:t></w:r>'
        )
        updated = _writer_restore_created_run_highlight(run, {"MỨC PHẠT": "yellow"})
        self.assertIn('<w:highlight w:val="yellow"/>', updated)
        self.assertNotIn("<w:shd", updated)
        self.assertIn('w:color w:val="C00000"', updated)

    def test_lower_alpha_list_gets_word_a_parenthesis_suffix(self):
        document = (
            '<w:p><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr>'
            '<w:r><w:t>Lập biên bản</w:t></w:r></w:p>'
            '<w:p><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr>'
            '<w:r><w:t>Lưu hồ sơ</w:t></w:r></w:p>'
        )
        numbering = (
            '<w:numbering><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0">'
            '<w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%1."/>'
            '</w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>'
        )
        source = '<ol type="a"><li>Lập biên bản</li><li>Lưu hồ sơ</li></ol>'
        updated_doc, updated_nums = _writer_clone_lower_alpha_suffix(document, numbering, source)
        self.assertIn('<w:numId w:val="2"/>', updated_doc)
        self.assertIn('<w:abstractNum w:abstractNumId="1">', updated_nums)
        self.assertIn('<w:lvlText w:val="%1)"/>', updated_nums)
        self.assertIn('<w:lvlText w:val="%1."/>', updated_nums)

    def test_footer_fallback_becomes_live_page_field(self):
        footer = (
            '<w:ftr><w:p><w:r><w:t>Trang 1 / 1</w:t></w:r></w:p></w:ftr>'
        )
        page = _writer_insert_page_field(footer, "PAGE", "1")
        updated = _writer_insert_page_field(page, "NUMPAGES", "1")
        self.assertEqual(updated.count("<w:instrText"), 2)
        self.assertIn("> PAGE </w:instrText>", updated)
        self.assertIn("> NUMPAGES </w:instrText>", updated)
        self.assertIn("Trang ", updated)
        self.assertIn(" / ", updated)

    def test_empty_page_break_marker_exports_as_break_without_ui_label(self):
        source = (
            '<p>Trang một.</p>'
            '<p data-vno-page-break="true" style="page-break-before:always;break-before:page"><br></p>'
            '<p><br></p><p>Trang hai.</p>'
        )
        document = '<w:document><w:body><w:p><w:r><w:t>Trang hai.</w:t></w:r></w:p></w:body></w:document>'
        updated = _restore_writer_html_page_breaks(document, source)
        self.assertIn('<w:br w:type="page"/>', updated)
        self.assertNotIn("Phân tách trang", updated)


if __name__ == "__main__":
    unittest.main()
