import unittest

from adapters.libreoffice.common import ooxml_zip_patch as patcher


class WriterTableOfFiguresT8Tests(unittest.TestCase):
    def test_caption_markers_become_word_sequence_fields(self):
        marker = 'VNO_CAPTION_V1:%7B%22version%22%3A1%2C%22kind%22%3A%22figure%22%2C%22id%22%3A%22cap-1%22%2C%22index%22%3A1%7D'
        document = (
            '<w:document><w:body><w:p><w:pPr><w:pStyle w:val="BodyText"/></w:pPr>'
            '<w:bookmarkStart w:id="1" w:name="cap-1"/><w:bookmarkEnd w:id="1"/>'
            f'<w:r><w:t>Hình 1: Revenue chart{marker}</w:t></w:r></w:p></w:body></w:document>'
        )
        result = patcher._writer_restore_caption_sequence_fields(document)
        self.assertIn('<w:pStyle w:val="Caption"/>', result)
        self.assertIn('w:instr=" SEQ Hình \\* ARABIC "', result)
        self.assertNotIn("VNO_CAPTION_V1:", result)

    def test_caption_list_becomes_native_word_table_of_figures_field(self):
        html = (
            '<div data-vno-tof="true" data-vno-tof-kind="figure">'
            '<div class="vno-tof-item"><a><span class="vno-tof-text">Hình 1: Revenue chart</span>'
            '<span class="vno-tof-leader"></span><span class="vno-tof-page">1</span></a></div></div>'
        )
        document = (
            '<w:document><w:body><w:p><w:r><w:t>DANH MỤC HÌNH</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Hình 1: Revenue chart</w:t><w:tab/><w:t>1</w:t></w:r></w:p>'
            '</w:body></w:document>'
        )
        result = patcher._writer_restore_tof_field(document, html)
        self.assertIn('TOC \\h \\c "Hình"', result)
        self.assertEqual(result.count('w:fldCharType="begin"'), 1)
        self.assertEqual(result.count('w:fldCharType="end"'), 1)

    def test_existing_table_of_figures_field_is_preserved(self):
        html = '<div data-vno-tof="true" data-vno-tof-kind="figure"><div class="vno-tof-item">Hình 1</div></div>'
        document = '<w:document><w:p><w:r><w:instrText> TOC \\h \\c "Figure" </w:instrText></w:r></w:p></w:document>'
        self.assertEqual(patcher._writer_restore_tof_field(document, html), document)

    def test_imported_document_without_tof_is_unchanged(self):
        document = '<w:document><w:p><w:r><w:t>Text</w:t></w:r></w:p></w:document>'
        self.assertEqual(patcher._writer_restore_tof_field(document, '<p>Imported</p>'), document)


if __name__ == "__main__":
    unittest.main()
