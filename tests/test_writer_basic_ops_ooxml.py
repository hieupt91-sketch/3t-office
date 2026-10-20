import unittest
import io
import zipfile

from adapters.libreoffice.common.ooxml_zip_patch import (
    _writer_clone_lower_alpha_suffix,
    _writer_insert_page_field,
    _restore_writer_html_page_breaks,
    _writer_restore_heading_styles,
    _writer_restore_toc_field,
    _writer_restore_created_paragraph_css,
    _writer_restore_created_run_highlight,
    postprocess_writer_toc_field,
    postprocess_writer_section_metadata,
    read_zip_entry,
)


class WriterBasicOpsOoxmlTests(unittest.TestCase):
    def test_new_writer_docx_links_created_header_footer_parts(self):
        relationships = (
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>'
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'
            '</Relationships>'
        )
        package = io.BytesIO()
        with zipfile.ZipFile(package, "w") as archive:
            archive.writestr("word/document.xml", '<w:document><w:body><w:p/><w:sectPr><w:pgSz/></w:sectPr></w:body></w:document>')
            archive.writestr("word/_rels/document.xml.rels", relationships)
            archive.writestr("word/header1.xml", '<w:hdr><w:p><w:r><w:t>Đầu trang Q13</w:t></w:r></w:p></w:hdr>')
            archive.writestr("word/footer1.xml", '<w:ftr><w:p><w:r><w:t>Chân trang Q13</w:t></w:r></w:p></w:ftr>')
        section = {
            "id": "section-1",
            "headerFooter": {
                "header": "<p>Đầu trang Q13</p>",
                "footer": "<p>Chân trang Q13</p>",
                "headers": {"default": "<p>Đầu trang Q13</p>"},
                "footers": {"default": "<p>Chân trang Q13</p>"},
            },
        }
        source_html = "<!--vno-sections-meta: " + __import__("json").dumps([section], ensure_ascii=False) + " -->"
        result = postprocess_writer_section_metadata(package.getvalue(), source_html=source_html)
        document = read_zip_entry(result, "word/document.xml").decode("utf-8")
        self.assertIn('<w:headerReference w:type="default" r:id="rId1"/>', document)
        self.assertIn('<w:footerReference w:type="default" r:id="rId2"/>', document)
        self.assertIn("Đầu trang Q13", read_zip_entry(result, "word/header1.xml").decode("utf-8"))
        self.assertIn("Chân trang Q13", read_zip_entry(result, "word/footer1.xml").decode("utf-8"))

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

    def test_multilevel_presets_restore_decimal_letter_and_roman_levels(self):
        source = (
            '<ol class="vno-ml-letter"><li>Cấp 1'
            '<ol class="vno-ml-letter"><li>Cấp 2'
            '<ol class="vno-ml-letter"><li>Cấp 3</li></ol>'
            '</li></ol></li></ol>'
        )
        document = "".join(
            f'<w:p><w:pPr><w:numPr><w:ilvl w:val="{level}"/><w:numId w:val="1"/>'
            f'</w:numPr></w:pPr><w:r><w:t>Cấp {level + 1}</w:t></w:r></w:p>'
            for level in range(3)
        )
        levels = "".join(
            f'<w:lvl w:ilvl="{level}"><w:numFmt w:val="decimal"/>'
            f'<w:lvlText w:val="%{level + 1}."/></w:lvl>'
            for level in range(3)
        )
        numbering = (
            f'<w:numbering><w:abstractNum w:abstractNumId="1">{levels}</w:abstractNum>'
            '<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num></w:numbering>'
        )
        updated_doc, updated_nums = _writer_clone_lower_alpha_suffix(document, numbering, source)
        self.assertEqual(updated_doc.count('<w:numId w:val="2"/>'), 3)
        self.assertIn('<w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/>', updated_nums)
        self.assertIn('<w:numFmt w:val="lowerLetter"/><w:suff w:val="tab"/><w:lvlText w:val="%2."/>', updated_nums)
        self.assertIn('<w:numFmt w:val="lowerRoman"/><w:suff w:val="tab"/><w:lvlText w:val="%3."/>', updated_nums)

    def test_heading_styles_are_word_builtin_and_toc_fallback_becomes_live_field(self):
        source = (
            '<div data-vno-toc="true"><p>MỤC LỤC</p><p>Tiêu đề cấp 1 .... 1</p></div>'
            '<h1>Tiêu đề cấp 1</h1><h2>Tiêu đề cấp 2</h2>'
        )
        document = (
            '<w:document><w:body>'
            '<w:p><w:pPr><w:pStyle w:val="BodyText"/></w:pPr><w:r><w:t>MỤC LỤC</w:t></w:r></w:p>'
            '<w:p><w:pPr><w:pStyle w:val="BodyText"/></w:pPr><w:r><w:t>Tiêu đề cấp 1 .... 1</w:t></w:r></w:p>'
            '<w:p><w:pPr><w:pStyle w:val="BodyText"/></w:pPr><w:r><w:t>Tiêu đề cấp 1</w:t></w:r></w:p>'
            '<w:p><w:pPr><w:pStyle w:val="BodyText"/></w:pPr><w:r><w:t>Tiêu đề cấp 2</w:t></w:r></w:p>'
            '</w:body></w:document>'
        )
        styles = (
            '<w:styles><w:style w:type="paragraph" w:styleId="Heading1">'
            '<w:name w:val="heading 1"/><w:pPr/></w:style>'
            '<w:style w:type="paragraph" w:styleId="Heading2">'
            '<w:name w:val="heading 2"/><w:pPr></w:pPr></w:style></w:styles>'
        )
        updated_doc, updated_styles = _writer_restore_heading_styles(document, styles, source)
        updated_doc = _writer_restore_toc_field(updated_doc, source)
        self.assertEqual(updated_doc.count('<w:pStyle w:val="Heading1"/>'), 1)
        self.assertEqual(updated_doc.count('<w:pStyle w:val="Heading2"/>'), 1)
        self.assertIn('<w:name w:val="Heading 1"/>', updated_styles)
        self.assertIn('<w:outlineLvl w:val="0"/>', updated_styles)
        self.assertIn('<w:name w:val="Heading 2"/>', updated_styles)
        self.assertIn('<w:outlineLvl w:val="1"/>', updated_styles)
        self.assertIn(' TOC \\o "1-3" \\h \\z \\u ', updated_doc)
        self.assertEqual(updated_doc.count('w:fldCharType="begin"'), 1)
        self.assertEqual(updated_doc.count('w:fldCharType="separate"'), 1)
        self.assertEqual(updated_doc.count('w:fldCharType="end"'), 1)

    def test_edited_docx_save_restores_toc_field_after_html_roundtrip(self):
        source_html = (
            '<div data-vno-toc="true"><p>MỤC LỤC</p>'
            '<div class="vno-toc-item"><a>1. KẾT QUẢ THỰC HIỆN .... 1</a></div></div>'
            '<h1>1. KẾT QUẢ THỰC HIỆN</h1>'
        )
        package = io.BytesIO()
        with zipfile.ZipFile(package, "w") as archive:
            archive.writestr(
                "word/document.xml",
                '<w:document><w:body>'
                '<w:p><w:r><w:t>MỤC LỤC</w:t></w:r></w:p>'
                '<w:p><w:r><w:t>1. KẾT QUẢ THỰC HIỆN .... 1</w:t></w:r></w:p>'
                '<w:p><w:r><w:t>1. KẾT QUẢ THỰC HIỆN</w:t></w:r></w:p>'
                '</w:body></w:document>',
            )
        result = postprocess_writer_toc_field(package.getvalue(), source_html=source_html)
        document = read_zip_entry(result, "word/document.xml").decode("utf-8")
        self.assertIn(' TOC \\o "1-3" \\h \\z \\u ', document)
        self.assertEqual(document.count('w:fldCharType="begin"'), 1)

    def test_edited_imported_docx_save_restores_toc_from_source_field(self):
        source_docx = io.BytesIO()
        with zipfile.ZipFile(source_docx, "w") as archive:
            archive.writestr(
                "word/document.xml",
                '<w:document><w:body>'
                '<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r>'
                '<w:r><w:instrText> TOC \\o "1-3" \\h </w:instrText></w:r>'
                '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
                '<w:r><w:t>MỤC LỤC</w:t></w:r></w:p>'
                '<w:p><w:r><w:t>1. KẾT QUẢ THỰC HIỆN 1</w:t></w:r></w:p>'
                '<w:p><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>'
                '</w:body></w:document>',
            )
        converted = io.BytesIO()
        with zipfile.ZipFile(converted, "w") as archive:
            archive.writestr(
                "word/document.xml",
                '<w:document><w:body>'
                '<w:p><w:r><w:t>MỤC LỤC</w:t></w:r></w:p>'
                '<w:p><w:r><w:t>1. KẾT QUẢ THỰC HIỆN 1</w:t></w:r></w:p>'
                '<w:p><w:r><w:t>1. KẾT QUẢ THỰC HIỆN</w:t></w:r></w:p>'
                '</w:body></w:document>',
            )
        result = postprocess_writer_toc_field(
            converted.getvalue(), source_docx=source_docx.getvalue(),
        )
        document = read_zip_entry(result, "word/document.xml").decode("utf-8")
        self.assertIn(' TOC \\o "1-3" \\h \\z \\u ', document)

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
