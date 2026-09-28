"""VND() (amount in words) must survive Save: LibreOffice turns the unknown add-in
call into #NAME? (xlsx) / #N/A (xls) and drops the text (measured 28/9/2026)."""
from __future__ import annotations

import importlib.util
import io
import re
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("vnd_export_patcher", ROOT / "adapters" / "libreoffice" / "common" / "ooxml_zip_patch.py")
patcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(patcher)

TEXT = "Ba triệu một trăm chín mươi ba ngàn không trăm tám mươi đồng chẵn."
FODS = f"""<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="t" xmlns:text="x" xmlns:vno="v" xmlns:calcext="c">
<office:body><office:spreadsheet><table:table table:name="xi măng">
<table:table-row table:number-rows-repeated="13"><table:table-cell/></table:table-row>
<table:table-row><table:table-cell table:number-columns-repeated="2"/><table:table-cell office:value-type="string" table:formula="of:=VND([.H13])" vno:formula="=VND(H13)"><text:p>{TEXT}</text:p></table:table-cell><table:table-cell office:value-type="float" office:value="1" table:formula="of:=1" vno:formula="=1"><text:p>1</text:p></table:table-cell></table:table-row>
</table:table></office:spreadsheet></office:body></office:document>"""


def make_xlsx(cell_c14: str) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as z:
        z.writestr("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
        z.writestr("xl/workbook.xml", '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="xi măng" sheetId="1" r:id="rId1"/></sheets></workbook>')
        z.writestr("xl/_rels/workbook.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')
        z.writestr("xl/worksheets/sheet1.xml", f'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="14">{cell_c14}<c r="D14"><f>1</f><v>1</v></c></row></sheetData></worksheet>')
    return buffer.getvalue()


class SheetVndExportTests(unittest.TestCase):
    def test_fods_vnd_cells_found_with_row_and_column_repeats(self):
        cells = patcher._fods_vnd_cells(FODS)
        self.assertEqual(cells, {"xi măng": {(14, 3): ("_xll.VND(H13)", TEXT)}})

    def test_xlsx_gets_xll_formula_and_cached_text(self):
        # LibreOffice's own export of that cell (measured): <f>vnd(H13)</f><v>#NAME?</v>, t="e".
        xlsx = make_xlsx('<c r="C14" s="22" t="e"><f aca="false">vnd(H13)</f><v>#NAME?</v></c>')
        out = patcher.postprocess_sheet_xlsx(xlsx, source_fods=FODS)
        xml = zipfile.ZipFile(io.BytesIO(out)).read("xl/worksheets/sheet1.xml").decode()
        self.assertIn(f'<c r="C14" s="22" t="str"><f>_xll.VND(H13)</f><v>{TEXT}</v></c>', xml)
        self.assertIn('<c r="D14"><f>1</f><v>1</v></c>', xml)

    def test_xls_export_keeps_text_as_value(self):
        out = patcher.fods_vnd_cells_as_text(FODS)
        cell = re.search(r"<table:table-cell[^>]*>(?:<text:p>" + re.escape(TEXT) + ")", out).group(0)
        self.assertNotIn("formula", cell)
        self.assertIn('office:value-type="string"', cell)
        self.assertIn('vno:formula="=1"', out)  # other formulas untouched

    def test_no_vnd_is_a_no_op(self):
        plain = FODS.replace("VND", "SUM")
        self.assertIs(patcher.fods_vnd_cells_as_text(plain), plain)
        self.assertEqual(patcher._fods_vnd_cells(plain), {})


if __name__ == "__main__":
    unittest.main()
