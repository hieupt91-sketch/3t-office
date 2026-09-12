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
        self.assertEqual(result.count("vno:number-format="), 3)
        self.assertIn('vno:number-format="#,##0"', result)
        self.assertIn('vno:number-format="[$₫-42A] #,##0"', result)
        self.assertIn('vno:number-format="dd/mm/yyyy"', result)
        self.assertEqual(result.count("<table:table-row"), 3)
        self.assertEqual(result.count("<table:table-cell"), 6)
        self.assertNotIn('vno:number-format="General"', result)

    def test_only_cells_with_value_or_formula_are_overlaid(self):
        result = patcher.overlay_sheet_xlsx_fods(make_xlsx(), FODS)
        self.assertEqual(len(re.findall(r"vno:number-format=", result)), 3)

    def test_text_cells_do_not_receive_numeric_format_overlay(self):
        formats = patcher._xlsx_cells_with_number_formats(make_xlsx())["Data"]
        self.assertNotIn((2, 5), formats)
        self.assertNotIn((2, 6), formats)
        self.assertNotIn((2, 7), formats)

    def test_original_shared_string_is_overlaid_exactly(self):
        result = patcher._set_original_string_attr('<table:table-cell office:value-type="string"/>', "  Giữ & nguyên  ")
        self.assertIn('vno:original-string="  Giữ &amp; nguyên  "', result)

    def test_original_strings_parser_skips_self_closing_cells(self):
        strings = patcher._xlsx_cells_with_original_strings(make_xlsx())["Data"]
        self.assertEqual(strings[(2, 5)], "  Giữ & nguyên  ")
        self.assertEqual(strings[(2, 6)], "24 thang")
        self.assertEqual(strings[(2, 7)], "inline")


if __name__ == "__main__":
    unittest.main()
