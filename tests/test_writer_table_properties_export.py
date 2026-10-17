"""Test xuat bang Writer sang DOCX: textDirection, splitTable, tblPr (jc, tblInd, tblCellMar, tblCellSpacing)."""

import io
import unittest
import zipfile

from adapters.libreoffice.common import ooxml_zip_patch as patcher


class WriterTableExportTests(unittest.TestCase):
    def test_upsert_tcpr_text_direction(self):
        cell_xml = '<w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>A</w:t></w:r></w:p></w:tc>'
        updated = patcher._writer_upsert_tcpr(cell_xml, "textDirection", '<w:textDirection w:val="tbRl"/>')
        self.assertIn('<w:textDirection w:val="tbRl"/>', updated)
        self.assertIn('<w:tcW', updated)

    def test_upsert_tblpr_properties(self):
        table_xml = '<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/></w:tblPr><w:tr><w:tc><w:p/></w:tc></w:tr></w:tbl>'
        updated = patcher._writer_upsert_tblpr(table_xml, "jc", '<w:jc w:val="center"/>')
        updated = patcher._writer_upsert_tblpr(updated, "tblInd", '<w:tblInd w:w="360" w:type="dxa"/>')
        updated = patcher._writer_upsert_tblpr(updated, "tblCellSpacing", '<w:tblCellSpacing w:w="56" w:type="dxa"/>')
        updated = patcher._writer_upsert_tblpr(
            updated,
            "tblCellMar",
            '<w:tblCellMar><w:top w:w="113" w:type="dxa"/><w:left w:w="170" w:type="dxa"/><w:bottom w:w="113" w:type="dxa"/><w:right w:w="170" w:type="dxa"/></w:tblCellMar>'
        )
        self.assertIn('<w:jc w:val="center"/>', updated)
        self.assertIn('<w:tblInd w:w="360" w:type="dxa"/>', updated)
        self.assertIn('<w:tblCellSpacing w:w="56" w:type="dxa"/>', updated)
        self.assertIn('<w:tblCellMar>', updated)

    def test_postprocess_created_writer_docx_patches_table_and_cells(self):
        source_html = (
            '<table data-vno-table-align="center" data-vno-table-indent="18" data-vno-cell-spacing="1" '
            'data-vno-cell-mar-top="2" data-vno-cell-mar-bottom="2" data-vno-cell-mar-left="3" data-vno-cell-mar-right="3">'
            '<tr><td data-vno-text-direction="tbRl"><p>Doc</p></td><td><p>Ngang</p></td></tr>'
            '</table>'
        )
        document_xml = (
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
            '<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/></w:tblPr>'
            '<w:tr><w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>Doc</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>Ngang</w:t></w:r></w:p></w:tc></w:tr>'
            '</w:tbl>'
            '</w:body></w:document>'
        )
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("word/document.xml", document_xml)
        
        patched_bytes = patcher.postprocess_created_writer_docx(buf.getvalue(), source_html=source_html)
        with zipfile.ZipFile(io.BytesIO(patched_bytes), "r") as z:
            out = z.read("word/document.xml").decode("utf-8")

        self.assertIn('<w:jc w:val="center"/>', out)
        self.assertIn('<w:tblInd w:w="360" w:type="dxa"/>', out)
        self.assertIn('<w:tblCellSpacing w:w="20" w:type="dxa"/>', out)
        self.assertIn('<w:tblCellMar>', out)
        self.assertIn('<w:textDirection w:val="tbRl"/>', out)


if __name__ == "__main__":
    unittest.main()
