"""Format Cells native OOXML import/export regression tests."""

from __future__ import annotations

import io
import unittest
import xml.etree.ElementTree as ET
import zipfile
from unittest import mock

from adapters.libreoffice.common import ooxml_zip_patch as patcher


def make_xlsx(sheet_xml: str) -> bytes:
    styles = '''<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
      <fonts count="2"><font/><font><u val="doubleAccounting"/><vertAlign val="superscript"/></font></fonts>
      <fills count="2"><fill><patternFill patternType="none"/></fill><fill><gradientFill type="linear" degree="90"><stop position="0"><color rgb="FF0070C0"/></stop><stop position="1"><color rgb="FFFFFFFF"/></stop></gradientFill></fill></fills>
      <borders count="2"><border/><border diagonalUp="1" diagonalDown="1"><diagonal style="double"><color rgb="FFFF0000"/></diagonal></border></borders>
      <cellXfs count="2"><xf fontId="0" fillId="0" borderId="0"><protection locked="1" hidden="0"/></xf><xf fontId="1" fillId="1" borderId="1" applyAlignment="1" applyProtection="1"><alignment horizontal="centerContinuous" vertical="distributed" indent="3" wrapText="1" shrinkToFit="1" readingOrder="2" textRotation="37"/><protection locked="0" hidden="1"/></xf></cellXfs>
    </styleSheet>'''
    workbook = '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>'
    rels = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as package:
        package.writestr("xl/workbook.xml", workbook)
        package.writestr("xl/_rels/workbook.xml.rels", rels)
        package.writestr("xl/styles.xml", styles)
        package.writestr("xl/worksheets/sheet1.xml", sheet_xml)
    return output.getvalue()


def fods(cell_xml: str) -> str:
    return f'''<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:vno="{patcher.SHEET_VNO_NS}"><office:body><office:spreadsheet><table:table table:name="Sheet1"><table:table-row>{cell_xml}</table:table-row></table:table></office:spreadsheet></office:body></office:document>'''


class SheetFormatCellsNativeTests(unittest.TestCase):
    def test_repeated_native_cell_format_configs_reuse_serialized_attribute(self):
        config = {"horizontalAlignment": "centerContinuous", "indentLevel": 3}
        cells = [
            '<table:table-cell table:style-name="ce1"><text:p>1</text:p></table:table-cell>',
            '<table:table-cell table:style-name="ce1"><text:p>2</text:p></table:table-cell>',
            '<table:table-cell table:style-name="ce1"><text:p>3</text:p></table:table-cell>',
        ]
        original_dumps = patcher.json.dumps
        with mock.patch.dict("os.environ", {"VNO_XLSX_CACHE_NATIVE_CELL_FORMAT_ATTR": "1"}), mock.patch.object(
            patcher.json, "dumps", wraps=original_dumps
        ) as dumps:
            actual = [patcher._set_native_cell_format_attr(cell, config) for cell in cells]
        expected = [
            patcher._set_native_cell_format_attr(cell, config)
            for cell in cells
        ]
        self.assertEqual(expected, actual)
        self.assertEqual(1, dumps.call_count, "identical style objects should serialize once")

    def test_structured_formula_candidate_check_ignores_brackets_outside_formula_tags(self):
        self.assertTrue(
            patcher._has_structured_formula_candidate(
                '<c r="A1"><f>SUM(Table1[Value])</f></c>'
            )
        )
        self.assertFalse(
            patcher._has_structured_formula_candidate(
                '<c r="A1"><f>SUM(A2)</f><v>[text]</v></c>'
            )
        )
        self.assertFalse(
            patcher._has_structured_formula_candidate(
                '<c r="A1"><f>[1]Sheet1!A2</f></c>'
            )
        )

    def test_structured_formula_scanner_keeps_only_table_references(self):
        sheet = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1"><f>SUM(Table1[Value])</f></c><c r="B1"><f>SUM(A1)</f></c><c r="C1"><f>"[literal]"</f></c></row></sheetData></worksheet>'
        self.assertEqual(
            {"Sheet1": {(1, 1): "=SUM(Table1[Value])"}},
            patcher._xlsx_structured_formulas(make_xlsx(sheet)),
        )

    def test_native_format_overlay_reuses_preparsed_xf_indices(self):
        sheet = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" s="1"><v>1</v></c></row></sheetData></worksheet>'
        package = make_xlsx(sheet)
        source = fods('<table:table-cell office:value-type="float" office:value="1"><text:p>1</text:p></table:table-cell>')
        expected = patcher._overlay_native_cell_formats_from_xlsx(package, source)
        cell_indices = patcher._xlsx_cells_with_xf_indices(package)
        actual = patcher._overlay_native_cell_formats_from_xlsx(
            package, source, cells_by_sheet=cell_indices
        )
        self.assertEqual(expected, actual)

    def test_p1_metadata_overlay_can_stamp_native_format_in_the_same_pass(self):
        sheet = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" s="1"><v>1</v></c></row></sheetData></worksheet>'
        package = make_xlsx(sheet)
        source = fods('<table:table-cell office:value-type="float" office:value="1"><text:p>1</text:p></table:table-cell>')
        metadata = patcher._xlsx_cells_with_metadata_p1(
            package, include_xf=True, parallel=False
        )
        expected = patcher._overlay_sheet_cell_metadata_from_xlsx_p1(
            package, source, parsed_metadata=metadata
        )
        expected = patcher._overlay_native_cell_formats_from_xlsx(
            package, expected, cells_by_sheet=metadata[2]
        )
        config = patcher._xlsx_native_formats_by_xf(package)[1]
        actual = patcher._overlay_sheet_cell_metadata_from_xlsx_p1(
            package,
            source,
            parsed_metadata=metadata,
            native_cell_formats={"Sheet1": {(1, 1): config}},
        )
        self.assertEqual(expected, actual)

    def test_open_overlay_restores_native_format_cells_properties(self):
        sheet = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" s="1"><v>1</v></c></row></sheetData></worksheet>'
        opened = patcher.overlay_sheet_xlsx_fods(make_xlsx(sheet), fods('<table:table-cell office:value-type="float" office:value="1"><text:p>1</text:p></table:table-cell>'))
        config = patcher._fods_cells_with_native_format(opened)["Sheet1"]["A1"]
        self.assertEqual("centerContinuous", config["horizontalAlignment"])
        self.assertEqual("distributed", config["verticalAlignment"])
        self.assertEqual(3, config["indentLevel"])
        self.assertEqual("rtl", config["textDirection"])
        self.assertEqual("doubleAccounting", config["fontUnderline"])
        self.assertEqual("super", config["fontPosition"])
        self.assertEqual(False, config["locked"])
        self.assertEqual(True, config["formulaHidden"])
        self.assertEqual("vertical", config["fillGradient"]["direction"])
        self.assertIn("double", config["borderDiagonalUp"])

    def test_export_patch_keeps_self_closing_cell_xml_well_formed(self):
        sheet = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1"/><c r="H1"/></row></sheetData></worksheet>'
        package = make_xlsx(sheet)
        metadata = fods('<table:table-cell table:number-columns-repeated="7"/><table:table-cell vno:cell-format="{&quot;horizontalAlignment&quot;:&quot;centerContinuous&quot;}"/>')
        replacements: dict[str, str] = {}
        patcher._apply_native_cell_formats_from_fods(package, metadata, replacements)
        patched = replacements["xl/worksheets/sheet1.xml"]
        ET.fromstring(patched)
        self.assertRegex(patched, r'<c r="H1" s="\d+"\s*/>')
        self.assertNotIn('/ s="', patched)
        styles_root = ET.fromstring(replacements["xl/styles.xml"])
        ns = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
        last_xf = list(styles_root.find(ns + "cellXfs"))[-1]
        self.assertEqual([ns + "alignment", ns + "protection"], [node.tag for node in last_xf])


if __name__ == "__main__":
    unittest.main()
