"""Sheet: soffice khong khoi phuc Freeze Panes (<pane state="frozen">) vao ODF
office:settings khi chuyen doi headless XLSX<->FODS (xac nhan qua vong chuyen
doi soffice that voi mot XLSX co <pane> chuan OOXML - xem
docs/HANDOFF-SHEET-FREEZE-PANES.md). postprocess_sheet_xlsx() ghi lai <pane>
dua theo vno:frozen-rows/cols VN Office tu luu trong FODS nguon;
overlay_sheet_xlsx_fods() doc lai <pane> that tu XLSX goc va ghi vao FODS
truoc khi SheetAdapter.parseFods() chay.
"""

from __future__ import annotations

import io
import re
import unittest
import zipfile

import main

patcher = main._ooxml_zip_patch()

WORKBOOK_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
<sheet name="Sheet1" sheetId="1" r:id="rId1"/>
<sheet name="Sheet2" sheetId="2" r:id="rId2"/>
</sheets>
</workbook>"""

WORKBOOK_RELS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>"""

SHEET1_XML_NO_FREEZE = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
<sheetData/>
</worksheet>"""

SHEET2_XML_NO_FREEZE = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"/></sheetViews>
<sheetData/>
</worksheet>"""

SHEET1_XML_FROZEN = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView tabSelected="1" workbookViewId="0">
<pane xSplit="2" ySplit="3" topLeftCell="C4" activePane="bottomRight" state="frozen"/>
<selection pane="bottomRight" activeCell="C4" sqref="C4"/>
</sheetView></sheetViews>
<sheetData/>
</worksheet>"""

FODS_WITH_FREEZE_ATTR = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0">
<office:body><office:spreadsheet>
<table:table table:name="Sheet1" vno:frozen-rows="3" vno:frozen-cols="2"></table:table>
<table:table table:name="Sheet2"></table:table>
</office:spreadsheet></office:body>
</office:document>"""

FODS_NO_FREEZE = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0">
<office:body><office:spreadsheet>
<table:table table:name="Sheet1"></table:table>
</office:spreadsheet></office:body>
</office:document>"""


def _fake_xlsx(sheet1_xml: str = SHEET1_XML_NO_FREEZE, sheet2_xml: str = SHEET2_XML_NO_FREEZE) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
        package.writestr("xl/workbook.xml", WORKBOOK_XML)
        package.writestr("xl/_rels/workbook.xml.rels", WORKBOOK_RELS_XML)
        package.writestr("xl/worksheets/sheet1.xml", sheet1_xml)
        package.writestr("xl/worksheets/sheet2.xml", sheet2_xml)
    return buffer.getvalue()


class TestColumnLabelFromIndex(unittest.TestCase):
    def test_basic_labels(self):
        self.assertEqual(patcher.column_label_from_index(1), "A")
        self.assertEqual(patcher.column_label_from_index(26), "Z")
        self.assertEqual(patcher.column_label_from_index(27), "AA")


class TestParseFreezePanesFromFods(unittest.TestCase):
    def test_reads_vno_attrs_per_sheet(self):
        result = patcher.parse_freeze_panes_from_fods(FODS_WITH_FREEZE_ATTR)
        self.assertEqual(result, {"Sheet1": {"rows": 3, "cols": 2}})

    def test_no_freeze_returns_empty(self):
        self.assertEqual(patcher.parse_freeze_panes_from_fods(FODS_NO_FREEZE), {})
        self.assertEqual(patcher.parse_freeze_panes_from_fods(None), {})


class TestApplyFreezePaneToSheetXml(unittest.TestCase):
    def test_writes_pane_both_axes(self):
        result = patcher.apply_freeze_pane_to_sheet_xml(SHEET1_XML_NO_FREEZE, 3, 2)
        self.assertIn('xSplit="2"', result)
        self.assertIn('ySplit="3"', result)
        self.assertIn('topLeftCell="C4"', result)
        self.assertIn('activePane="bottomRight"', result)
        self.assertIn('state="frozen"', result)

    def test_noop_when_no_freeze(self):
        result = patcher.apply_freeze_pane_to_sheet_xml(SHEET1_XML_NO_FREEZE, 0, 0)
        self.assertEqual(result, SHEET1_XML_NO_FREEZE)


class TestParseFreezePaneFromSheetXml(unittest.TestCase):
    def test_reads_real_pane(self):
        result = patcher.parse_freeze_pane_from_sheet_xml(SHEET1_XML_FROZEN)
        self.assertEqual(result, {"rows": 3, "cols": 2})

    def test_ignores_split_mode(self):
        split_xml = '<sheetView><pane xSplit="200" ySplit="0" state="split"/></sheetView>'
        self.assertIsNone(patcher.parse_freeze_pane_from_sheet_xml(split_xml))

    def test_no_pane_returns_none(self):
        self.assertIsNone(patcher.parse_freeze_pane_from_sheet_xml(SHEET1_XML_NO_FREEZE))


class TestPostprocessSheetXlsxFreezePanes(unittest.TestCase):
    def test_writes_pane_into_correct_sheet_by_name(self):
        """Truong hop pho bien nhat: khong dung workbookProtection, chi Freeze
        Panes - truoc day ham nay se KHONG duoc main.py goi toi (cong chan
        early-return chi kiem tra structure-protected)."""
        original = _fake_xlsx()
        patched = patcher.postprocess_sheet_xlsx(original, source_fods=FODS_WITH_FREEZE_ATTR)
        self.assertNotEqual(patched, original)
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            sheet1 = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
            sheet2 = z.read("xl/worksheets/sheet2.xml").decode("utf-8")
        self.assertIn('xSplit="2"', sheet1)
        self.assertIn('ySplit="3"', sheet1)
        self.assertNotIn("<pane", sheet2, "Sheet2 khong freeze thi khong duoc vá gi")

    def test_new_workbook_without_freeze_still_gets_s24_defaults(self):
        original = _fake_xlsx()
        patched = patcher.postprocess_sheet_xlsx(original, source_fods=FODS_NO_FREEZE)
        self.assertNotEqual(patched, original)
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            sheet1 = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
        self.assertIn('defaultRowHeight="15.0"', sheet1)
        self.assertNotIn("<pane", sheet1)


class TestOverlaySheetXlsxFods(unittest.TestCase):
    def test_reads_real_pane_and_overlays_fods(self):
        original = _fake_xlsx(sheet1_xml=SHEET1_XML_FROZEN)
        overlaid = patcher.overlay_sheet_xlsx_fods(original, FODS_NO_FREEZE)
        self.assertIn('vno:frozen-rows="3" vno:frozen-cols="2"', overlaid)

    def test_no_pane_in_original_leaves_fods_untouched(self):
        original = _fake_xlsx()
        overlaid = patcher.overlay_sheet_xlsx_fods(original, FODS_NO_FREEZE)
        # S30c: overlay bố cục luôn ghi vno:xlsx-layout (defaultCol) — chỉ kiểm không có thuộc tính cố định
        self.assertNotIn("vno:frozen", overlaid)
        stripped = re.sub(r' vno:xlsx-layout="[^"]*"', "", overlaid)
        self.assertEqual(stripped, FODS_NO_FREEZE)


if __name__ == "__main__":
    unittest.main()
