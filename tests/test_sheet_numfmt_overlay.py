import importlib.util
import io
import os
import re
import unittest
import zipfile


ROOT = os.path.dirname(os.path.dirname(__file__))
PATH = os.path.join(ROOT, "adapters", "libreoffice", "common", "ooxml_zip_patch.py")
SPEC = importlib.util.spec_from_file_location("numfmt_overlay", PATH)
patcher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(patcher)


def make_xlsx():
    parts = {
        "xl/workbook.xml": '<workbook xmlns:r="r"><sheets><sheet name="Data" r:id="rId1"/></sheets></workbook>',
        "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
        "xl/styles.xml": '<styleSheet><numFmts count="2"><numFmt numFmtId="164" formatCode="[$₫-42A] #,##0"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts><cellXfs count="4"><xf numFmtId="0"/><xf numFmtId="3"/><xf numFmtId="164"/><xf numFmtId="165"/></cellXfs></styleSheet>',
        "xl/sharedStrings.xml": '<sst><si><t xml:space="preserve">  Giữ &amp; nguyên  </t></si></sst>',
        "xl/worksheets/sheet1.xml": '<worksheet><sheetData><row r="2"><c r="A2" s="1"><v>1234</v></c><c r="B2" s="2"><v>5000</v></c><c r="C2" s="3"><f>TODAY()</f><v>45000</v></c><c r="D2" s="1"/><c r="E2" s="1" t="s"><v>0</v></c><c r="F2" s="1" t="str"><v>24 thang</v></c><c r="G2" s="1" t="inlineStr"><is><t>inline</t></is></c></row></sheetData></worksheet>',
    }
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as package:
        for name, value in parts.items():
            package.writestr(name, value)
    return stream.getvalue()


FODS = '<office:document xmlns:office="urn:o" xmlns:table="urn:t"><office:body><office:spreadsheet><table:table table:name="Data"><table:table-row table:number-rows-repeated="3"><table:table-cell table:number-columns-repeated="4" office:value-type="float" office:value="1"/></table:table-row></table:table></office:spreadsheet></office:body></office:document>'


class SheetNumberFormatOverlayTests(unittest.TestCase):
    def test_sparse_overlay_splits_repeated_row_and_cells(self):
        result = patcher.overlay_sheet_xlsx_fods(make_xlsx(), FODS)
        # FODS has 4 columns, XLSX has 7 cells with formats - only 4 get applied
        self.assertEqual(result.count("vno:number-format="), 4)
        self.assertIn('vno:number-format="#,##0"', result)
        self.assertIn('vno:number-format="[$₫-42A] #,##0"', result)
        self.assertIn('vno:number-format="dd/mm/yyyy"', result)
        self.assertEqual(result.count("<table:table-row"), 3)
        self.assertEqual(result.count("<table:table-cell"), 6)
        self.assertNotIn('vno:number-format="General"', result)

    def test_all_cells_with_format_receive_overlay(self):
        result = patcher.overlay_sheet_xlsx_fods(make_xlsx(), FODS)
        # FODS has 4 columns, so 4 formats applied per row
        self.assertEqual(len(re.findall(r"vno:number-format=", result)), 4)

    def test_text_and_empty_cells_receive_format_overlay(self):
        formats = patcher._xlsx_cells_with_number_formats(make_xlsx())["Data"]
        # String cells (E2, F2, G2) and empty cell (D2) should also get format overlay
        self.assertIn((2, 4), formats)  # D2 - empty cell
        self.assertIn((2, 5), formats)  # E2 - shared string
        self.assertIn((2, 6), formats)  # F2 - inline string
        self.assertIn((2, 7), formats)  # G2 - inlineStr
        # All should have the same format code as the column style
        self.assertEqual(formats[(2, 4)], "#,##0")
        self.assertEqual(formats[(2, 5)], "#,##0")
        self.assertEqual(formats[(2, 6)], "#,##0")
        self.assertEqual(formats[(2, 7)], "#,##0")

    def test_original_shared_string_is_overlaid_exactly(self):
        result = patcher._set_original_string_attr('<table:table-cell office:value-type="string"/>', "  Giữ & nguyên  ")
        self.assertIn('vno:original-string="  Giữ &amp; nguyên  "', result)

    def test_original_string_newlines_survive_dom_attribute_normalization(self):
        # Raw \n / \r\n inside an attribute is turned into spaces by DOM parsers
        # (the app's parseFods DOM branch) — must be written as &#10; / &#13;.
        result = patcher._set_original_string_attr('<table:table-cell office:value-type="string"/>', "Từ 5 bộ\r\nck 30%\tx")
        self.assertIn('vno:original-string="Từ 5 bộ&#13;&#10;ck 30%&#9;x"', result)
        self.assertNotIn("\n", result.split("vno:original-string=")[1].split('"')[1])
        import xml.dom.minidom as minidom
        doc = minidom.parseString(
            '<r xmlns:table="urn:t" xmlns:office="urn:o" xmlns:vno="urn:v">' + result + "</r>"
        )
        cell = doc.getElementsByTagName("table:table-cell")[0]
        self.assertEqual(cell.getAttribute("vno:original-string"), "Từ 5 bộ\r\nck 30%\tx")

    def test_original_strings_parser_skips_self_closing_cells(self):
        strings = patcher._xlsx_cells_with_original_strings(make_xlsx())["Data"]
        self.assertEqual(strings[(2, 5)], "  Giữ & nguyên  ")
        self.assertEqual(strings[(2, 6)], "24 thang")
        self.assertEqual(strings[(2, 7)], "inline")


if __name__ == "__main__":
    unittest.main()
