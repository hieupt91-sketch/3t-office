"""
Tests for OOXML Postprocessing of Writer Table Styles, Formulas, and Shapes.
Ticket: AGY-WRITER1 (Khớp Word 2016 - Round 2).
"""

import io
import unittest
import zipfile

from adapters.libreoffice.common.ooxml_zip_patch import (
    _writer_restore_native_writer_shapes,
    postprocess_created_writer_docx,
)


class TestWriterTableFormulaStyleExport(unittest.TestCase):
    def _create_minimal_docx(self, document_xml: str) -> bytes:
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
            zf.writestr("word/document.xml", document_xml)
        return buf.getvalue()

    def test_table_style_and_look_injected(self):
        """Test that data-vno-table-style injects w:tblStyle and w:tblLook conforming to CT_TblPrBase."""
        document_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            '<w:body>'
            '<w:tbl>'
            '<w:tblPr><w:tblW w:w="5000" w:type="pct"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="2500"/><w:gridCol w:w="2500"/></w:tblGrid>'
            '<w:tr><w:tc><w:p><w:r><w:t>A1</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>B1</w:t></w:r></w:p></w:tc></w:tr>'
            '</w:tbl>'
            '<w:p/>'
            '</w:body>'
            '</w:document>'
        )
        source_html = (
            '<html><body>'
            '<table data-vno-table-style="TableGrid" data-vno-header-row="true" data-vno-banded-rows="true">'
            '<tr><td>A1</td><td>B1</td></tr>'
            '</table>'
            '</body></html>'
        )
        docx_bytes = self._create_minimal_docx(document_xml)
        patched_bytes = postprocess_created_writer_docx(docx_bytes, source_html=source_html)

        with zipfile.ZipFile(io.BytesIO(patched_bytes), "r") as zf:
            out_xml = zf.read("word/document.xml").decode("utf-8")

        self.assertIn('<w:tblStyle w:val="TableGrid"/>', out_xml)
        self.assertIn('<w:tblLook w:val="04A0"', out_xml)
        self.assertIn('w:firstRow="1"', out_xml)
        self.assertIn('w:noHBand="0"', out_xml)

    def test_table_formula_field_injected(self):
        """Test that data-vno-field='formula' injects w:fldSimple with proper instruction."""
        document_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            '<w:body>'
            '<w:tbl>'
            '<w:tblPr><w:tblW w:w="5000" w:type="pct"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="2500"/><w:gridCol w:w="2500"/></w:tblGrid>'
            '<w:tr><w:tc><w:p><w:r><w:t>100</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>120</w:t></w:r></w:p></w:tc></w:tr>'
            '<w:tr><w:tc><w:p><w:r><w:t>100</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>220</w:t></w:r></w:p></w:tc></w:tr>'
            '</w:tbl>'
            '<w:p/>'
            '</w:body>'
            '</w:document>'
        )
        source_html = (
            '<html><body>'
            '<table>'
            '<tr><td>100</td><td><span class="vno-table-formula-field" data-vno-field="formula" data-vno-formula="=SUM(LEFT)" data-vno-numfmt="#,##0">120</span></td></tr>'
            '<tr><td>100</td><td><span class="vno-table-formula-field" data-vno-field="formula" data-vno-formula="=SUM(ABOVE)" data-vno-numfmt="#,##0">220</span></td></tr>'
            '</table>'
            '</body></html>'
        )
        docx_bytes = self._create_minimal_docx(document_xml)
        patched_bytes = postprocess_created_writer_docx(docx_bytes, source_html=source_html)

        with zipfile.ZipFile(io.BytesIO(patched_bytes), "r") as zf:
            out_xml = zf.read("word/document.xml").decode("utf-8")

        self.assertIn('<w:fldSimple w:instr="=SUM(LEFT) \\# &quot;#,##0&quot;"><w:r><w:t>120</w:t></w:r></w:fldSimple>', out_xml)
        self.assertIn('<w:fldSimple w:instr="=SUM(ABOVE) \\# &quot;#,##0&quot;"><w:r><w:t>220</w:t></w:r></w:fldSimple>', out_xml)

    def test_shape_name_and_visibility_preserved(self):
        """Test that shape name and visibility are written into DrawingML wp:docPr."""
        # 100 px * 9525 = 952500 EMU
        document_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
            'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
            'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">'
            '<w:body><w:p><w:r><w:drawing>'
            '<wp:anchor>'
            '<wp:extent cx="952500" cy="952500"/>'
            '<wp:positionH><wp:posOffset>952500</wp:posOffset></wp:positionH>'
            '<wp:positionV><wp:posOffset>952500</wp:posOffset></wp:positionV>'
            '<wp:docPr id="1" name="Shape 1"/>'
            '<wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr><a:prstGeom prst="rect"/></wps:spPr><wps:txbx/></wps:wsp>'
            '</wp:anchor>'
            '</w:drawing></w:r></w:p></w:body></w:document>'
        )
        import json
        metadata = {
            "type": "rectangle",
            "isNew": True,
            "x": 100,
            "y": 100,
            "w": 100,
            "h": 100,
            "fill": "#2563eb",
            "stroke": "#1d4ed8",
            "strokeWidth": 2,
            "name": "Logo Cong Ty",
            "visible": False,
        }
        marker = bytes(json.dumps(metadata), "utf-8").hex()
        source_html = f"<!--vno-writer-shape-v1:{marker}-->"

        patched_xml = _writer_restore_native_writer_shapes(document_xml, source_html)

        self.assertIn('name="Logo Cong Ty"', patched_xml)
        self.assertIn('hidden="1"', patched_xml)


if __name__ == "__main__":
    unittest.main()
