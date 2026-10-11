import importlib.util
import io
import json
import sys
import unittest
import zipfile
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "perf-proto" / "direct_xlsx_reader.py"
SPEC = importlib.util.spec_from_file_location("direct_xlsx_reader", MODULE_PATH)
reader = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = reader
SPEC.loader.exec_module(reader)


CONTENT_TYPES = '''<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'''
WORKBOOK = '''<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
 <workbookPr date1904="0"/><sheets><sheet name="Data" sheetId="1" r:id="rId1"/>
 <sheet name="Hidden" sheetId="2" state="hidden" r:id="rId2"/></sheets></workbook>'''
RELS = '''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="worksheet"/>
 <Relationship Id="rId2" Target="worksheets/sheet2.xml" Type="worksheet"/></Relationships>'''
STYLES = '''<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
 <numFmts count="1"><numFmt numFmtId="164" formatCode="#.##0 [$₫-vi-VN]"/></numFmts>
 <fonts count="1"><font><b/><sz val="11"/><name val="Aptos"/><color rgb="FF112233"/></font></fonts>
 <fills count="1"><fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/></patternFill></fill></fills>
 <borders count="1"><border><left style="thin"><color rgb="FF000000"/></left><right/><top/><bottom/></border></borders>
 <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
 <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0"><alignment horizontal="right" wrapText="1"/></xf></cellXfs>
 </styleSheet>'''
SHEET1 = '''<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
 <dimension ref="A1:C3"/><cols><col min="2" max="2" width="18.5" hidden="1" customWidth="1"/></cols>
 <sheetData><row r="1" ht="24" customHeight="1"><c r="A1" t="s"><v>0</v></c><c r="B1" s="1"><v>12</v></c></row>
 <row r="3" hidden="1"><c r="C3" s="1"><f>SUM(B1:B2)</f><v>12</v></c></row></sheetData>
 <mergeCells count="1"><mergeCell ref="A1:A2"/></mergeCells></worksheet>'''
SHEET2 = '''<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
 <dimension ref="A1"/><sheetData><row r="1"><c r="A1" t="b"><v>1</v></c></row></sheetData></worksheet>'''
SHARED = '''<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Tiếng Việt</t></si></sst>'''


def workbook_bytes(*, sheet1=SHEET1, shared=SHARED, extra_parts=None):
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", CONTENT_TYPES)
        zf.writestr("xl/workbook.xml", WORKBOOK)
        zf.writestr("xl/_rels/workbook.xml.rels", RELS)
        zf.writestr("xl/styles.xml", STYLES)
        zf.writestr("xl/sharedStrings.xml", shared)
        zf.writestr("xl/worksheets/sheet1.xml", sheet1)
        zf.writestr("xl/worksheets/sheet2.xml", SHEET2)
        for name, data in (extra_parts or {}).items():
            zf.writestr(name, data)
    return out.getvalue()


class DirectXlsxReaderTests(unittest.TestCase):
    def test_reads_simple_values_formula_styles_and_layout(self):
        payload = reader.read_simple_xlsx(workbook_bytes())
        self.assertIsNotNone(payload)
        self.assertEqual(payload["sheetCount"], 2)
        self.assertEqual(payload["cellCount"], 4)
        data = payload["sheets"][0]
        self.assertEqual(data["name"], "Data")
        self.assertEqual(data["usedRange"]["ref"], "A1:C3")
        self.assertEqual(data["merges"], ["A1:A2"])
        self.assertEqual(data["columns"][0]["width"], 18.5)
        self.assertTrue(data["columns"][0]["hidden"])
        self.assertEqual(data["rows"], [{"r": 1, "height": 24, "hidden": False, "customHeight": True, "style": 0}, {"r": 3, "height": "", "hidden": True, "customHeight": False, "style": 0}])
        cells = {cell["ref"]: cell for cell in data["cells"]}
        self.assertEqual(cells["A1"]["value"], "Tiếng Việt")
        self.assertEqual(cells["C3"]["formula"], "=SUM(B1:B2)")
        self.assertEqual(cells["B1"]["numberFormat"], "#.##0 [$₫-vi-VN]")
        self.assertTrue(payload["styles"][cells["B1"]["styleIndex"]]["font"]["bold"])
        self.assertEqual(payload["sheets"][1]["state"], "hidden")

    def test_returns_none_for_drawing(self):
        source = workbook_bytes(extra_parts={"xl/drawings/drawing1.xml": "<x/>"})
        check = reader.detect_simple_xlsx(source)
        self.assertFalse(check.simple)
        self.assertTrue(any("drawing1.xml" in reason for reason in check.reasons))
        self.assertIsNone(reader.read_simple_xlsx(source))

    def test_returns_none_for_complex_formula(self):
        complex_sheet = SHEET1.replace("<f>SUM(B1:B2)</f>", '<f t="array" ref="C3:C4">SUM(B1:B2)</f>')
        check = reader.detect_simple_xlsx(workbook_bytes(sheet1=complex_sheet))
        self.assertFalse(check.simple)
        self.assertIn("Data: non-scalar formula", check.reasons)

    def test_returns_none_for_rich_shared_string(self):
        source = workbook_bytes(shared=SHARED.replace(
            "<si><t>Tiếng Việt</t></si>",
            "<si><r><t>Tiếng Việt</t></r></si>",
        ))
        self.assertIsNone(reader.read_simple_xlsx(source))


if __name__ == "__main__":
    unittest.main()
