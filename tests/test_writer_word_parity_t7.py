import io
import unittest
import zipfile

from adapters.libreoffice.common import ooxml_zip_patch as patcher


def make_docx(document_xml: str) -> bytes:
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as package:
        package.writestr("word/document.xml", document_xml)
        package.writestr("word/numbering.xml", '<w:numbering><w:abstractNum w:abstractNumId="3"><w:multiLevelType w:val="multilevel"/><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:pPr><w:ind w:left="710" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="4"><w:abstractNumId w:val="3"/></w:num></w:numbering>')
    return out.getvalue()


def document_from(docx: bytes) -> str:
    return patcher.read_zip_entry(docx, "word/document.xml").decode("utf-8")


class WriterWordParityT7Tests(unittest.TestCase):
    def test_sup_sub_are_saved_as_word_vertical_alignment(self):
        source = '<w:document><w:body><w:p><w:r><w:t>H</w:t></w:r><w:r><w:rPr><w:b/><w:position w:val="8"/></w:rPr><w:t>2</w:t></w:r><w:r><w:rPr><w:b/><w:position w:val="-2"/></w:rPr><w:t>x</w:t></w:r><w:r><w:rPr><w:i/><w:position w:val="-2"/></w:rPr><w:t>y</w:t></w:r></w:p></w:body></w:document>'
        html = '<p>H<span style="vertical-align: super">2</span><b><sub>xy</sub></b></p>'
        result = document_from(patcher.postprocess_created_writer_docx(make_docx(source), source_html=html))
        self.assertIn('<w:vertAlign w:val="superscript"/>', result)
        self.assertIn('<w:vertAlign w:val="subscript"/>', result)
        self.assertIn("<w:b/>", result)
        self.assertIn("<w:i/>", result)

    def test_standard_highlight_uses_word_highlight_and_custom_background_stays_shading(self):
        source = '<w:document><w:body><w:p><w:r><w:rPr/><w:t>Green</w:t></w:r><w:r><w:rPr><w:shd w:fill="123456"/></w:rPr><w:t>Custom</w:t></w:r></w:p></w:body></w:document>'
        html = '<p><font style="font-size: 12pt; background-color: rgb(0, 255, 0)"><b>Green</b></font><span style="background-color: #123456">Custom</span></p>'
        result = document_from(patcher.postprocess_created_writer_docx(make_docx(source), source_html=html))
        self.assertIn('<w:highlight w:val="green"/>', result)
        self.assertIn("<w:shd", result)
        self.assertIn("Custom", result)

    def test_default_point_28_cm_after_spacing_rounds_to_160_twips_only_for_bottom_margin(self):
        source = '<w:document><w:body><w:p><w:pPr><w:spacing w:after="159"/></w:pPr><w:r><w:t>Default</w:t></w:r></w:p><w:p><w:pPr><w:spacing w:after="159"/></w:pPr><w:r><w:t>Custom</w:t></w:r></w:p></w:body></w:document>'
        html = '<p style="margin-bottom: 0.28cm; --vno-lh: 1.08">Default</p><p style="margin-top: 0.28cm">Custom</p>'
        result = document_from(patcher.postprocess_created_writer_docx(make_docx(source), source_html=html))
        self.assertRegex(result, r'<w:t>Default</w:t></w:r></w:p>')
        paragraphs = result.split("</w:p>")
        self.assertIn('w:after="160"', paragraphs[0])
        self.assertIn('w:before="159"', paragraphs[1])
        self.assertIn('w:after="159"', paragraphs[1])

    def test_simple_list_uses_word_hybrid_numbering_and_36_point_indent(self):
        source = '<w:document><w:body><w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="4"/></w:numPr><w:ind w:left="710" w:hanging="360"/></w:pPr><w:r><w:t>One</w:t></w:r></w:p><w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="4"/></w:numPr><w:ind w:left="710" w:hanging="360"/></w:pPr><w:r><w:t>Two</w:t></w:r></w:p></w:body></w:document>'
        html = '<ul><li>One</li><li>Two</li></ul>'
        result = patcher.postprocess_created_writer_docx(make_docx(source), source_html=html)
        numbering = patcher.read_zip_entry(result, "word/numbering.xml").decode("utf-8")
        document = document_from(result)
        self.assertIn('<w:multiLevelType w:val="hybridMultilevel"/>', numbering)
        self.assertIn('w:left="720"', numbering)
        self.assertEqual(document.count('w:left="720"'), 2)

    def test_nested_list_keeps_multilevel_numbering(self):
        source = '<w:document><w:body><w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="4"/></w:numPr></w:pPr><w:r><w:t>One</w:t></w:r></w:p></w:body></w:document>'
        html = '<ul><li>One<ul><li>Nested</li></ul></li></ul>'
        result = patcher.postprocess_created_writer_docx(make_docx(source), source_html=html)
        numbering = patcher.read_zip_entry(result, "word/numbering.xml").decode("utf-8")
        self.assertIn('<w:multiLevelType w:val="multilevel"/>', numbering)


if __name__ == "__main__":
    unittest.main()
