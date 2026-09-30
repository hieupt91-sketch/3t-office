import unittest
import io
import json
import re
import zipfile

from adapters.libreoffice.common.ooxml_zip_patch import (
    _writer_add_created_toc_field,
    _writer_apply_created_review_state,
    _writer_enable_setting,
    _writer_mark_created_different_first_page,
    patch_ooxml_zip,
    _writer_clone_lower_alpha_suffix,
    _writer_insert_page_field,
    _restore_writer_html_page_breaks,
    _writer_restore_created_paragraph_css,
    _writer_restore_created_run_highlight,
    postprocess_created_writer_docx,
)


class WriterBasicOpsOoxmlTests(unittest.TestCase):
    def test_toc_result_is_wrapped_in_a_native_word_field(self):
        source = (
            '<div data-vno-toc="true"><span class="vno-toc-text">BÁO CÁO</span>'
            '<span class="vno-toc-page">1</span><span class="vno-toc-text">Điều 1</span>'
            '<span class="vno-toc-page">2</span></div>'
        )
        document = (
            '<w:document><w:body><w:p><w:r><w:t>BÁO CÁO 1</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Điều 1 2</w:t></w:r></w:p>'
            '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>BÁO CÁO</w:t></w:r></w:p>'
            '</w:body></w:document>'
        )
        updated = _writer_add_created_toc_field(document, source)
        self.assertIn(' TOC \\o "1-3" \\h \\z \\u ', updated)
        self.assertIn('<w:fldChar w:fldCharType="begin"/>', updated)
        self.assertIn('<w:fldChar w:fldCharType="separate"/>', updated)
        self.assertIn('<w:fldChar w:fldCharType="end"/>', updated)
        settings = _writer_enable_setting('<w:settings></w:settings>', "updateFields")
        self.assertIn('<w:updateFields w:val="true"/>', settings)

    def test_different_first_page_is_a_native_section_property(self):
        source = '<p data-vno-different-first-page="true"></p>'
        document = '<w:document><w:body><w:p/><w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>'
        updated = _writer_mark_created_different_first_page(document, source)
        self.assertIn('<w:titlePg/>', updated)
        self.assertEqual(_writer_mark_created_different_first_page(updated, source).count('<w:titlePg/>'), 1)

    def test_created_review_state_exports_native_revisions_comments_replies_and_resolution(self):
        tracked_paragraph = "VĂN BẢN CẦN THEO DÕI:  và thêm "
        delete_prefix = "VĂN BẢN CẦN THEO DÕI: "
        state = {
            "changes": [
                {"type": "delete", "text": "xóa", "author": "Nguyễn An", "date": "2026-09-30T01:00:00Z",
                 "paragraphText": tracked_paragraph, "offset": len(delete_prefix)},
                {"type": "insert", "text": "mới", "author": "Nguyễn An", "date": "2026-09-30T01:01:00Z",
                 "paragraphText": tracked_paragraph, "offset": len(tracked_paragraph)},
            ],
            "comments": [{
                "anchorText": "DÒNG CÓ NHẬN XÉT", "content": "Ghi chú gốc", "author": "Nguyễn An",
                "createdAt": "2026-09-30T01:02:00Z", "resolved": True,
                "replies": [{"content": "Đã cập nhật", "author": "Trần Bình", "createdAt": "2026-09-30T01:03:00Z"}],
            }],
        }
        encoded = json.dumps(state, ensure_ascii=False).encode("utf-8").hex()
        source = f'<div data-vno-review-state="{encoded}"></div>'
        document = (
            '<w:document><w:body><w:p><w:r><w:t>DÒNG CÓ NHẬN XÉT</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>VĂN BẢN CẦN THEO DÕI: </w:t></w:r><w:r><w:t> và thêm </w:t></w:r></w:p>'
            '<w:sectPr/></w:body></w:document>'
        )
        source_package = io.BytesIO()
        with zipfile.ZipFile(source_package, "w") as package:
            package.writestr("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>')
            package.writestr("word/document.xml", document)
            package.writestr("word/settings.xml", '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"></w:settings>')
            package.writestr("word/_rels/document.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>')
        with zipfile.ZipFile(io.BytesIO(source_package.getvalue())) as package:
            source_bytes = package.read("word/document.xml")
        updated_document, parts, has_revisions, has_comments = _writer_apply_created_review_state(
            source_package.getvalue(), source_bytes.decode("utf-8"), source
        )
        self.assertTrue(has_revisions)
        self.assertTrue(has_comments)
        self.assertIn("<w:del", updated_document)
        self.assertIn("<w:delText", updated_document)
        self.assertIn("xóa", updated_document)
        self.assertIn("<w:ins", updated_document)
        self.assertIn("mới", updated_document)
        self.assertIn("<w:commentRangeStart", updated_document)
        patched = patch_ooxml_zip(source_package.getvalue(), {"word/document.xml": updated_document, **parts})
        with zipfile.ZipFile(io.BytesIO(patched)) as package:
            comments = package.read("word/comments.xml").decode("utf-8")
            comments_ex = package.read("word/commentsExtended.xml").decode("utf-8")
            relationships = package.read("word/_rels/document.xml.rels").decode("utf-8")
        self.assertIn("Ghi chú gốc", comments)
        self.assertIn("Đã cập nhật", comments)
        self.assertGreaterEqual(comments.count("<w:comment "), 2, "reply phải là comment riêng trong thread")
        self.assertIn('w15:done="1"', comments_ex)
        self.assertIn("paraIdParent", comments_ex)
        self.assertIn("commentsExtended.xml", relationships)

    def test_created_section_page_sizes_follow_each_section_css(self):
        source = (
            '<style>@page vno-section-1 { size:210mm 297mm; } '
            '@page vno-section-2 { size:297mm 210mm; }</style>'
            '<div data-vno-export-section="section-1"></div>'
            '<div data-vno-export-section="section-2"></div>'
        )
        document = (
            '<w:document><w:body><w:p><w:pPr><w:sectPr><w:pgSz w:w="16838" w:h="11906"/>'
            '</w:sectPr></w:pPr><w:r><w:t>Trang dọc</w:t></w:r></w:p>'
            '<w:sectPr><w:pgSz w:w="16838" w:h="11906"/></w:sectPr></w:body></w:document>'
        )
        package = io.BytesIO()
        with zipfile.ZipFile(package, "w") as archive:
            archive.writestr("word/document.xml", document)
        updated = postprocess_created_writer_docx(package.getvalue(), source_html=source)
        with zipfile.ZipFile(io.BytesIO(updated)) as archive:
            xml = archive.read("word/document.xml").decode("utf-8")
        sizes = re.findall(r'<w:pgSz\b[^>]*w:w="(\d+)"[^>]*w:h="(\d+)"[^>]*/>', xml)
        self.assertEqual(sizes, [("11906", "16838"), ("16838", "11906")])
        self.assertIn('w:orient="landscape"', xml)

    def test_created_floating_picture_wrap_size_and_alignment_are_native(self):
        source = (
            '<img data-vno-wrap="square" data-vno-position="topLeft" data-vno-width-mm="20.00" data-vno-height-mm="10.00">'
            '<img data-vno-wrap="tight" data-vno-position="topRight" data-vno-width-mm="10.00" data-vno-height-mm="5.00">'
            '<img data-vno-wrap="inline" data-vno-width-mm="20.00" data-vno-height-mm="10.00">'
        )
        inline = lambda ident: (
            f'<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="714375" cy="352425"/>'
            f'<wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="{ident}" name="Image{ident}"/>'
            '<wp:cNvGraphicFramePr/><a:graphic><a:graphicData><pic:pic><pic:blipFill>'
            f'<a:blip r:embed="rId{ident}"/>'
            '</pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline>'
        )
        document = '<w:document><w:body>' + ''.join(
            f'<w:p><w:r><w:drawing>{inline(index)}</w:drawing></w:r></w:p>' for index in range(1, 4)
        ) + '<w:sectPr/></w:body></w:document>'
        package = io.BytesIO()
        with zipfile.ZipFile(package, "w") as archive:
            archive.writestr("word/document.xml", document)
        updated = postprocess_created_writer_docx(package.getvalue(), source_html=source)
        with zipfile.ZipFile(io.BytesIO(updated)) as archive:
            xml = archive.read("word/document.xml").decode("utf-8")
        self.assertEqual(xml.count('<wp:anchor '), 2)
        self.assertEqual(xml.count('<wp:inline '), 1)
        self.assertIn('<wp:wrapSquare wrapText="bothSides"/>', xml)
        self.assertIn('<wp:wrapTight wrapText="bothSides">', xml)
        self.assertIn('<wp:align>left</wp:align>', xml)
        self.assertIn('<wp:align>right</wp:align>', xml)
        self.assertIn('cx="720000" cy="360000"', xml)
        self.assertIn('cx="360000" cy="180000"', xml)

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
