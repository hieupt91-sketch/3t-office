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
    def test_new_full_width_table_restores_word_text_area_width(self):
        cells = "".join(
            '<w:tc><w:tcPr><w:tcW w:w="110" w:type="dxa"/></w:tcPr><w:p/></w:tc>'
            for _ in range(4)
        )
        source = (
            '<w:document><w:body><w:tbl><w:tblPr><w:tblW w:w="440" w:type="dxa"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="110"/><w:gridCol w:w="110"/><w:gridCol w:w="110"/><w:gridCol w:w="110"/></w:tblGrid>'
            f'<w:tr>{cells}</w:tr></w:tbl>'
            '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:left="1440" w:right="1440"/></w:sectPr>'
            '</w:body></w:document>'
        )
        html = '<table style="width: 100%; margin: 14pt 0;"><tbody><tr>' + "".join("<td><br></td>" for _ in range(4)) + "</tr></tbody></table>"
        result = document_from(patcher.postprocess_created_writer_docx(make_docx(source), source_html=html))
        self.assertIn('<w:tblW w:w="9360" w:type="dxa"/>', result)
        self.assertEqual(result.count('<w:gridCol w:w="2340"/>'), 4)
        self.assertEqual(result.count('<w:tcW w:w="2340" w:type="dxa"/>'), 4)

    def test_full_width_table_does_not_override_explicit_column_widths(self):
        source = (
            '<w:document><w:body><w:tbl><w:tblPr><w:tblW w:w="2000" w:type="dxa"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="2000"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="2000"/></w:tcPr><w:p/></w:tc></w:tr></w:tbl>'
            '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:left="1440" w:right="1440"/></w:sectPr>'
            '</w:body></w:document>'
        )
        html = '<table style="width:100%"><tr><td style="width: 3cm">x</td></tr></table>'
        result = document_from(patcher.postprocess_created_writer_docx(make_docx(source), source_html=html))
        self.assertIn('<w:tblW w:w="1700" w:type="dxa"/>', result)
        self.assertIn('<w:gridCol w:w="1700"/>', result)

    def test_full_width_table_preserves_dragged_pixel_column_width(self):
        row = (
            '<w:tr>'
            + ''.join('<w:tc><w:tcPr><w:tcW w:w="110" w:type="dxa"/></w:tcPr><w:p/></w:tc>' for _ in range(3))
            + '</w:tr>'
        )
        source = (
            '<w:document><w:body><w:tbl><w:tblPr><w:tblW w:w="330" w:type="dxa"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="110"/><w:gridCol w:w="110"/><w:gridCol w:w="110"/></w:tblGrid>'
            + row * 3
            + '</w:tbl><w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:left="1440" w:right="1440"/></w:sectPr>'
            + '</w:body></w:document>'
        )
        html = (
            '<table style="width:100%"><tbody><tr><td style="width: 72px">Alpha</td><td><br></td><td><br></td></tr>'
            '<tr><td style="width: 72px">Beta</td><td><br></td><td><br></td></tr>'
            '<tr><td style="width: 72px">Gamma</td><td><br></td><td><br></td></tr></tbody></table>'
        )
        result = document_from(patcher.postprocess_created_writer_docx(make_docx(source), source_html=html))
        self.assertIn('<w:tblW w:w="9360" w:type="dxa"/>', result)
        self.assertEqual(result.count('<w:gridCol w:w="1080"/>'), 1)
        self.assertEqual(result.count('<w:gridCol w:w="4140"/>'), 2)
        self.assertEqual(result.count('<w:tcW w:w="1080" w:type="dxa"/>'), 3)
        self.assertEqual(result.count('<w:tcW w:w="4140" w:type="dxa"/>'), 6)

    def test_dragged_table_row_height_is_saved_as_word_exact_height(self):
        rows = "".join('<w:tr><w:trPr></w:trPr><w:tc><w:p/></w:tc></w:tr>' for _ in range(3))
        source = (
            '<w:document><w:body><w:tbl><w:tblPr/><w:tblGrid><w:gridCol w:w="9000"/></w:tblGrid>'
            + rows
            + '</w:tbl><w:sectPr/></w:body></w:document>'
        )
        html = '<table style="width:100%"><tr style="height:56px"><td>One</td></tr><tr><td>Two</td></tr><tr><td>Three</td></tr></table>'
        result = document_from(patcher.postprocess_created_writer_docx(make_docx(source), source_html=html))
        self.assertEqual(result.count('<w:trHeight w:val="840" w:hRule="exact"/>'), 1)

    def test_table_autofit_contents_uses_word_native_auto_layout(self):
        cells = ''.join('<w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/></w:tcPr><w:p/></w:tc>' for _ in range(2))
        source = (
            '<w:document><w:body><w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="4500"/><w:gridCol w:w="4500"/></w:tblGrid><w:tr>' + cells + '</w:tr></w:tbl>'
            '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:left="1440" w:right="1440"/></w:sectPr></w:body></w:document>'
        )
        html = '<table style="width:auto" data-vno-table-autofit="contents"><tr><td>Alpha</td><td><br></td></tr></table>'
        result = document_from(patcher.postprocess_created_writer_docx(make_docx(source), source_html=html))
        self.assertIn('<w:tblW w:w="0" w:type="auto"/>', result)
        self.assertNotIn('<w:tblLayout', result)
        self.assertEqual(result.count('<w:tcW w:w="0" w:type="auto"/>'), 2)

    def test_table_autofit_window_uses_word_native_percent_layout(self):
        cells = ''.join('<w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/></w:tcPr><w:p/></w:tc>' for _ in range(2))
        source = (
            '<w:document><w:body><w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="4500"/><w:gridCol w:w="4500"/></w:tblGrid><w:tr>' + cells + '</w:tr></w:tbl>'
            '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:left="1440" w:right="1440"/></w:sectPr></w:body></w:document>'
        )
        html = '<table style="width:100%" data-vno-table-autofit="window"><tr><td>Alpha</td><td><br></td></tr></table>'
        result = document_from(patcher.postprocess_created_writer_docx(make_docx(source), source_html=html))
        self.assertIn('<w:tblW w:w="5000" w:type="pct"/>', result)
        self.assertNotIn('<w:tblLayout', result)
        self.assertEqual(result.count('<w:tcW w:w="2500" w:type="pct"/>'), 2)

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
