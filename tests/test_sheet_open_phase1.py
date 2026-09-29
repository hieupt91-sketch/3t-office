import io
import os
import tempfile
import unittest
import xml.etree.ElementTree as ET
import zipfile
from unittest.mock import patch

from adapters.libreoffice.common import ooxml_zip_patch
import main as vn_main


TABLE_NS = "urn:oasis:names:tc:opendocument:xmlns:table:1.0"
OFFICE_NS = "urn:oasis:names:tc:opendocument:xmlns:office:1.0"
VNO_NS = "https://vnoffice.vn/ns/spreadsheet/1.0"

FODS_WITH_EXTERNAL_CACHE = (
    '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
    'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" '
    'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" '
    'xmlns:calcext="urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0" '
    'xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0">'
    '<office:body><office:spreadsheet><table:table table:name="Data">'
    '<table:table-row><table:table-cell table:style-name="ce1" '
    'table:number-columns-repeated="4"/><table:table-cell table:formula="of:=VLOOKUP([.A1];'
    '[&apos;file:///E:/other.xlsx&apos;#$Sheet1.A$1:.B$10];2;0)" office:value-type="string" '
    'office:string-value="Nga" calcext:value-type="string"><text:p>Nga</text:p>'
    '</table:table-cell></table:table-row>'
    '<table:table-row><table:table-cell table:style-name="ce1" '
    'table:number-columns-repeated="4"/><table:table-cell table:formula="of:=VLOOKUP([.A2];'
    '[&apos;file:///E:/other.xlsx&apos;#$Sheet1.A$1:.B$10];2;0)" office:value-type="string" '
    'office:string-value="" calcext:value-type="error"><text:p>#N/A</text:p>'
    '</table:table-cell></table:table-row></table:table></office:spreadsheet></office:body>'
    '</office:document>'
)


def _source_xlsx() -> bytes:
    entries = {
        "xl/workbook.xml": (
            '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>'
        ),
        "xl/_rels/workbook.xml.rels": (
            '<Relationships><Relationship Id="rId1" '
            'Target="worksheets/sheet1.xml"/></Relationships>'
        ),
        "xl/styles.xml": (
            '<styleSheet><numFmts count="0"/><cellXfs count="2">'
            '<xf numFmtId="0"/><xf numFmtId="0"/></cellXfs></styleSheet>'
        ),
        "xl/worksheets/sheet1.xml": (
            '<worksheet><sheetData><row r="1"><c r="B1" s="1"/>'
            '<c r="E1" s="1" t="str"><f>VLOOKUP(A1,[1]other.xlsx]Sheet1!A1:B10,2,0)</f>'
            '<v>Nga</v></c></row><row r="2"><c r="B2" s="1"/>'
            '<c r="E2" s="1" t="e"><f>VLOOKUP(A2,[1]other.xlsx]Sheet1!A1:B10,2,0)</f>'
            '<v>#N/A</v></c></row></sheetData></worksheet>'
        ),
    }
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as archive:
        for name, content in entries.items():
            archive.writestr(name, content)
    return stream.getvalue()


class SheetOpenPhase1Tests(unittest.TestCase):
    def test_skip_initial_xf_flag_is_opt_in(self):
        with patch.dict(os.environ, {"SHEET_OPEN_SKIP_INITIAL_XF": ""}):
            self.assertFalse(vn_main._sheet_open_skip_initial_xf_enabled())
        for value in ("1", "true", "yes", "on"):
            with self.subTest(value=value), patch.dict(os.environ, {"SHEET_OPEN_SKIP_INITIAL_XF": value}):
                self.assertTrue(vn_main._sheet_open_skip_initial_xf_enabled())
        for value in ("0", "false", "off", "unexpected"):
            with self.subTest(value=value), patch.dict(os.environ, {"SHEET_OPEN_SKIP_INITIAL_XF": value}):
                self.assertFalse(vn_main._sheet_open_skip_initial_xf_enabled())

    def test_main_overlay_routes_the_explicit_flag(self):
        xlsx = _source_xlsx()
        with tempfile.TemporaryDirectory() as temp_dir:
            source_path = os.path.join(temp_dir, "sample.xlsx")
            with open(source_path, "wb") as handle:
                handle.write(xlsx)
            with patch.dict(os.environ, {"SHEET_OPEN_SKIP_INITIAL_XF": "0"}):
                legacy = vn_main._apply_native_import_overlay(source_path, FODS_WITH_EXTERNAL_CACHE, "sheet")
            with patch.dict(os.environ, {"SHEET_OPEN_SKIP_INITIAL_XF": "1"}):
                phase1 = vn_main._apply_native_import_overlay(source_path, FODS_WITH_EXTERNAL_CACHE, "sheet")

        self.assertIn('vno:xf="1"', legacy)
        self.assertNotIn('vno:xf="', phase1)
        self.assertIn('vno:original-string="Nga"', phase1)

    def test_skip_xf_overlay_preserves_external_formula_and_cache_after_reoverlay(self):
        xlsx = _source_xlsx()
        overlaid = ooxml_zip_patch.overlay_sheet_xlsx_fods(
            xlsx,
            FODS_WITH_EXTERNAL_CACHE,
            skip_initial_xf=True,
        )
        self.assertNotIn('vno:xf="', overlaid)
        self.assertIn('vno:original-string="Nga"', overlaid)

        optimized = ooxml_zip_patch.optimize_fods_streaming(overlaid)
        final_fods = ooxml_zip_patch.reoverlay_sheet_xf_indices(xlsx, optimized)
        root = ET.fromstring(final_fods)
        table = root.find(f".//{{{TABLE_NS}}}table")
        rows = table.findall(f".//{{{TABLE_NS}}}table-row")
        formula_cells = []
        style_at_b1 = False
        for row_number, row in enumerate(rows, start=1):
            column = 1
            for cell in list(row):
                if cell.tag not in (f"{{{TABLE_NS}}}table-cell", f"{{{TABLE_NS}}}covered-table-cell"):
                    continue
                repeat = int(cell.get(f"{{{TABLE_NS}}}number-columns-repeated", "1"))
                if row_number == 1 and column <= 2 < column + repeat and cell.get(f"{{{VNO_NS}}}xf") == "1":
                    style_at_b1 = True
                formula = cell.get(f"{{{TABLE_NS}}}formula")
                if formula:
                    text = "".join(item.text or "" for item in cell.findall(f".//{{urn:oasis:names:tc:opendocument:xmlns:text:1.0}}p"))
                    formula_cells.append((row_number, column, formula, cell.get(f"{{{OFFICE_NS}}}string-value"), cell.get("{urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0}value-type"), text))
                column += repeat

        self.assertTrue(style_at_b1)
        self.assertEqual([(row, column) for row, column, *_ in formula_cells], [(1, 5), (2, 5)])
        self.assertIn("VLOOKUP", formula_cells[0][2])
        self.assertEqual(formula_cells[0][3], "Nga")
        self.assertEqual(formula_cells[1][3], "")
        self.assertEqual(formula_cells[1][4], "error")
        self.assertEqual(formula_cells[1][5], "#N/A")
        self.assertIn('vno:original-string="Nga"', final_fods)


if __name__ == "__main__":
    unittest.main()
