import io
import re
import unittest
import zipfile

from adapters.libreoffice.common import ooxml_zip_patch as patcher


def _docx(body: str) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as package:
        package.writestr(
            "word/document.xml",
            '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            f"<w:body>{body}</w:body></w:document>",
        )
    return buffer.getvalue()


def _document(docx_bytes: bytes) -> str:
    return patcher.read_zip_entry(docx_bytes, "word/document.xml").decode("utf-8")


class RunEffectsImportTests(unittest.TestCase):
    def test_marks_double_strike_and_underline_style_by_non_space_offsets(self):
        docx = _docx(
            "<w:p><w:r><w:rPr><w:dstrike/></w:rPr><w:t>Gach doi</w:t></w:r>"
            '<w:r><w:t xml:space="preserve"> thuong </w:t></w:r>'
            '<w:r><w:rPr><w:u w:val="wave" w:color="FF0000"/></w:rPr><w:t>song</w:t></w:r></w:p>'
        )
        html = "<p>Gach\ndoi thuong <u>song</u></p>"
        out = patcher.inject_docx_run_effects(docx, html)
        self.assertIn('<span data-vno-fx="dstrike">Gach\ndoi</span>', out)
        self.assertIn('<u><span data-vno-fx="ul=wave;ulc=FF0000">song</span></u>', out)

    def test_plain_documents_are_untouched(self):
        docx = _docx("<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Dam</w:t></w:r></w:p>")
        html = "<p><b>Dam</b></p>"
        self.assertEqual(patcher.inject_docx_run_effects(docx, html), html)

    def test_identical_paragraphs_are_matched_in_order(self):
        docx = _docx(
            "<w:p><w:r><w:t>Lap</w:t></w:r></w:p>"
            "<w:p><w:r><w:rPr><w:vanish/></w:rPr><w:t>Lap</w:t></w:r></w:p>"
        )
        out = patcher.inject_docx_run_effects(docx, "<p>Lap</p><p>Lap</p>")
        self.assertEqual(out, '<p>Lap</p><p><span data-vno-fx="vanish">Lap</span></p>')


class RunEffectsExportTests(unittest.TestCase):
    def test_restores_double_strike_over_single_and_splits_runs(self):
        # LibreOffice đã hạ dstrike thành strike và gộp cả câu vào một run.
        docx = _docx('<w:p><w:r><w:rPr><w:strike/></w:rPr><w:t>Gach doi them</w:t></w:r></w:p>')
        html = '<p><span data-vno-fx="dstrike">Gach doi</span> them</p>'
        out = _document(patcher.postprocess_writer_run_effects(docx, source_html=html))
        self.assertIn("<w:dstrike/>", out)
        self.assertNotIn("<w:strike/><w:t", out)
        self.assertEqual(len(re.findall(r"<w:r>", out)), 2)
        self.assertRegex(out, r"<w:dstrike/></w:rPr><w:t xml:space=\"preserve\">Gach doi</w:t>")

    def test_position_replaces_vertalign_and_restores_original_size(self):
        docx = _docx('<w:p><w:r><w:rPr><w:sz w:val="18"/><w:vertAlign w:val="superscript"/></w:rPr><w:t>Nang</w:t></w:r></w:p>')
        html = '<p><sup><span data-vno-fx="pos=8;sz=-;vb=1">Nang</span></sup></p>'
        out = _document(patcher.postprocess_writer_run_effects(docx, source_html=html))
        self.assertIn('<w:position w:val="8"/>', out)
        self.assertNotIn("vertAlign", out)
        self.assertNotIn("<w:sz ", out)

    def test_position_restored_even_when_libreoffice_dropped_the_script_base(self):
        # d05 trong kho tài liệu thật: HTML còn <sup> nhưng DOCX trung gian không còn vertAlign lẫn position.
        docx = _docx('<w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>I.</w:t></w:r></w:p>')
        html = '<p><sup style="font-size: 16px;"><span data-vno-fx="pos=8;sz=24;vb=1">I.</span></sup></p>'
        out = _document(patcher.postprocess_writer_run_effects(docx, source_html=html))
        self.assertIn('<w:position w:val="8"/>', out)
        self.assertIn('<w:sz w:val="24"/>', out)

    def test_import_marks_position_with_script_base_only_when_sup_exists(self):
        docx = _docx(
            '<w:p><w:r><w:rPr><w:position w:val="8"/></w:rPr><w:t>Nang</w:t></w:r>'
            '<w:r><w:rPr><w:position w:val="8"/><w:sz w:val="24"/></w:rPr><w:t>Khac</w:t></w:r></w:p>'
        )
        out = patcher.inject_docx_run_effects(docx, "<p><sup>Nang</sup>Khac</p>")
        self.assertIn('<sup><span data-vno-fx="pos=8;sz=-;vb=1">Nang</span></sup>', out)
        self.assertIn('<span data-vno-fx="pos=8;sz=24">Khac</span>', out)

    def test_position_without_script_base_is_kept_and_size_untouched(self):
        docx = _docx('<w:p><w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t>Khac</w:t></w:r></w:p>')
        html = '<p><span data-vno-fx="pos=8;sz=24">Khac</span></p>'
        out = _document(patcher.postprocess_writer_run_effects(docx, source_html=html))
        self.assertIn('<w:position w:val="8"/>', out)
        self.assertIn('<w:sz w:val="24"/>', out)

    def test_removed_superscript_is_not_resurrected_when_script_base_was_present(self):
        docx = _docx('<w:p><w:r><w:t>Nang</w:t></w:r></w:p>')
        html = '<p><span data-vno-fx="pos=8;sz=-;vb=1">Nang</span></p>'
        out = _document(patcher.postprocess_writer_run_effects(docx, source_html=html))
        self.assertNotIn("w:position", out)

    def test_posx_from_font_dialog_needs_no_base_property(self):
        docx = _docx('<w:p><w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t>Nang</w:t></w:r></w:p>')
        html = '<p><span data-vno-fx="posx=8">Nang</span></p>'
        out = _document(patcher.postprocess_writer_run_effects(docx, source_html=html))
        self.assertIn('<w:position w:val="8"/>', out)
        self.assertIn('<w:sz w:val="24"/>', out)

    def test_underline_style_and_color(self):
        docx = _docx('<w:p><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>Song</w:t></w:r></w:p>')
        html = '<p><u><span data-vno-fx="ul=wave;ulc=FF0000">Song</span></u></p>'
        out = _document(patcher.postprocess_writer_run_effects(docx, source_html=html))
        self.assertIn('<w:u w:val="wave" w:color="FF0000"/>', out)

    def test_user_removed_underline_is_not_resurrected(self):
        docx = _docx("<w:p><w:r><w:t>Song</w:t></w:r></w:p>")
        html = '<p><span data-vno-fx="ul=wave">Song</span></p>'
        out = _document(patcher.postprocess_writer_run_effects(docx, source_html=html))
        self.assertNotIn("<w:u", out)

    def test_schema_order_of_rpr_children(self):
        docx = _docx('<w:p><w:r><w:rPr><w:sz w:val="24"/><w:strike/></w:rPr><w:t>Doi</w:t></w:r></w:p>')
        html = '<p><span data-vno-fx="dstrike;vanish;emboss">Doi</span></p>'
        out = _document(patcher.postprocess_writer_run_effects(docx, source_html=html))
        order = [out.index(tag) for tag in ("<w:dstrike/>", "<w:emboss/>", "<w:vanish/>", "<w:sz ")]
        self.assertEqual(order, sorted(order))

    def test_text_edit_after_import_still_matches(self):
        docx = _docx(
            '<w:p><w:r><w:rPr><w:strike/></w:rPr><w:t>Gach</w:t></w:r><w:r><w:t xml:space="preserve"> ZZ</w:t></w:r></w:p>'
        )
        html = '<p><span data-vno-fx="dstrike">Gach</span> ZZ</p>'
        out = _document(patcher.postprocess_writer_run_effects(docx, source_html=html))
        self.assertIn("<w:dstrike/>", out)
        self.assertIn("ZZ", out)

    def test_adjacent_spaces_stay_outside_the_effect(self):
        docx = _docx('<w:p><w:r><w:t xml:space="preserve">truoc Giua sau</w:t></w:r></w:p>')
        html = '<p>truoc <span data-vno-fx="vanish">Giua</span> sau</p>'
        out = _document(patcher.postprocess_writer_run_effects(docx, source_html=html))
        self.assertRegex(out, r"<w:vanish/></w:rPr><w:t xml:space=\"preserve\">Giua</w:t>")

    def test_no_marker_is_a_noop(self):
        docx = _docx("<w:p><w:r><w:t>A</w:t></w:r></w:p>")
        self.assertEqual(patcher.postprocess_writer_run_effects(docx, source_html="<p>A</p>"), docx)


if __name__ == "__main__":
    unittest.main()
