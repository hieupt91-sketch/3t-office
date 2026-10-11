"""Sheet: activeTab (XLSX) -> ActiveTable (FODS) overlay fidelity.

Root cause:
  - LibreOffice headless XLSX->FODS drops config:name="ActiveTable" in office:settings.
  - parseFods() in SheetAdapter reads ActiveTable to set activeSheet; when missing,
    it falls back to the first sheet. In workbooks where sheet 1 is empty or hidden
    (e.g., Dahua price list where sheet 1 is veryHidden "foxz" and activeTab="1"
    points to "Thông báo Sản phẩm mới"), users see a blank sheet instead of real data.
  - Solution: overlay_sheet_xlsx_fods() reads activeTab from xl/workbook.xml, maps
    it to the N-th sheet in <sheets> (0-indexed, including hidden sheets), and injects
    ActiveTable into FODS office:settings if not already present.
"""

from __future__ import annotations

import io
import os
import re
import tempfile
import unittest
import zipfile

import main

patcher = main._ooxml_zip_patch()

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

WORKBOOK_XML_ACTIVE_1 = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView activeTab="1"/></bookViews>
<sheets>
<sheet name="foxz" sheetId="1" state="veryHidden" r:id="rId1"/>
<sheet name="Thông báo Sản phẩm mới" sheetId="2" r:id="rId2"/>
<sheet name="Camera IP" sheetId="3" r:id="rId3"/>
</sheets>
</workbook>"""

WORKBOOK_XML_NO_ACTIVE_TAB = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<bookViews><workbookView/></bookViews>
<sheets>
<sheet name="foxz" sheetId="1" r:id="rId1"/>
<sheet name="Thông báo Sản phẩm mới" sheetId="2" r:id="rId2"/>
<sheet name="Camera IP" sheetId="3" r:id="rId3"/>
</sheets>
</workbook>"""

WORKBOOK_XML_SPECIAL_CHARS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<bookViews><workbookView activeTab="1"/></bookViews>
<sheets>
<sheet name="Sheet1" sheetId="1" r:id="rId1"/>
<sheet name="Báo cáo &amp; Phân tích &lt;2023&gt; &quot;Chi tiết&quot;" sheetId="2" r:id="rId2"/>
</sheets>
</workbook>"""

FODS_3_SHEETS = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0">
<office:body><office:spreadsheet>
<table:table table:name="foxz"></table:table>
<table:table table:name="Thông báo Sản phẩm mới"></table:table>
<table:table table:name="Camera IP"></table:table>
</office:spreadsheet></office:body>
</office:document>"""

FODS_WITH_ACTIVE_TABLE = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0">
<office:settings>
  <config:config-item-set config:name="ooo:view-settings">
    <config:config-item-map-indexed config:name="Views">
      <config:config-item-map-entry>
        <config:config-item config:name="ActiveTable" config:type="string">PreExistingSheet</config:config-item>
      </config:config-item-map-entry>
    </config:config-item-map-indexed>
  </config:config-item-set>
</office:settings>
<office:body><office:spreadsheet>
<table:table table:name="foxz"></table:table>
<table:table table:name="Thông báo Sản phẩm mới"></table:table>
<table:table table:name="Camera IP"></table:table>
</office:spreadsheet></office:body>
</office:document>"""

FODS_WITH_LO_VIEW_SETTINGS = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0">
<office:settings>
  <config:config-item-set config:name="ooo:view-settings">
    <config:config-item config:name="VisibleAreaTop" config:type="int">0</config:config-item>
    <config:config-item config:name="VisibleAreaLeft" config:type="int">0</config:config-item>
  </config:config-item-set>
</office:settings>
<office:body><office:spreadsheet>
<table:table table:name="foxz"></table:table>
<table:table table:name="Thông báo Sản phẩm mới"></table:table>
<table:table table:name="Camera IP"></table:table>
</office:spreadsheet></office:body>
</office:document>"""


def _fake_xlsx(workbook_xml: str) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
        z.writestr("xl/workbook.xml", workbook_xml)
        z.writestr("xl/_rels/workbook.xml.rels", '<?xml version="1.0"?><Relationships/>')
        z.writestr("xl/worksheets/sheet1.xml", '<?xml version="1.0"?><worksheet/>')
        z.writestr("xl/worksheets/sheet2.xml", '<?xml version="1.0"?><worksheet/>')
        z.writestr("xl/worksheets/sheet3.xml", '<?xml version="1.0"?><worksheet/>')
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Unit Tests
# ---------------------------------------------------------------------------

class TestParseActiveTabFromWorkbook(unittest.TestCase):
    def test_reads_active_tab_1(self):
        self.assertEqual(patcher.parse_active_tab_from_workbook(WORKBOOK_XML_ACTIVE_1), 1)

    def test_active_tab_missing_defaults_to_0(self):
        self.assertEqual(patcher.parse_active_tab_from_workbook(WORKBOOK_XML_NO_ACTIVE_TAB), 0)

    def test_none_returns_0(self):
        self.assertEqual(patcher.parse_active_tab_from_workbook(None), 0)

    def test_empty_string_returns_0(self):
        self.assertEqual(patcher.parse_active_tab_from_workbook(""), 0)


class TestParseActiveSheetFromWorkbook(unittest.TestCase):
    def test_maps_active_tab_1_to_second_sheet(self):
        sheet = patcher.parse_active_sheet_from_workbook(WORKBOOK_XML_ACTIVE_1)
        self.assertEqual(sheet, "Thông báo Sản phẩm mới")

    def test_missing_active_tab_maps_to_first_sheet(self):
        sheet = patcher.parse_active_sheet_from_workbook(WORKBOOK_XML_NO_ACTIVE_TAB)
        self.assertEqual(sheet, "foxz")

    def test_out_of_bounds_active_tab_falls_back_to_first_sheet(self):
        wb = WORKBOOK_XML_ACTIVE_1.replace('activeTab="1"', 'activeTab="99"')
        sheet = patcher.parse_active_sheet_from_workbook(wb)
        self.assertEqual(sheet, "foxz")

    def test_unescapes_special_chars_in_sheet_name(self):
        sheet = patcher.parse_active_sheet_from_workbook(WORKBOOK_XML_SPECIAL_CHARS)
        self.assertEqual(sheet, 'Báo cáo & Phân tích <2023> "Chi tiết"')

    def test_none_returns_none(self):
        self.assertIsNone(patcher.parse_active_sheet_from_workbook(None))


class TestApplyActiveSheetToFods(unittest.TestCase):
    def test_injects_into_fods_without_settings(self):
        res = patcher.apply_active_sheet_to_fods(FODS_3_SHEETS, "Thông báo Sản phẩm mới")
        self.assertIn('config:name="ActiveTable"', res)
        self.assertIn(">Thông báo Sản phẩm mới<", res)
        self.assertIn("xmlns:config=", res)

    def test_injects_into_lo_view_settings(self):
        res = patcher.apply_active_sheet_to_fods(FODS_WITH_LO_VIEW_SETTINGS, "Thông báo Sản phẩm mới")
        self.assertIn('config:name="ActiveTable"', res)
        self.assertIn(">Thông báo Sản phẩm mới<", res)
        self.assertIn('config:name="VisibleAreaTop"', res)

    def test_replaces_existing_active_table_with_xlsx_active_sheet(self):
        res = patcher.apply_active_sheet_to_fods(FODS_WITH_ACTIVE_TABLE, "Thông báo Sản phẩm mới")
        self.assertNotEqual(res, FODS_WITH_ACTIVE_TABLE)
        self.assertIn(">Thông báo Sản phẩm mới<", res)
        self.assertNotIn(">PreExistingSheet<", res)

    def test_escapes_xml_special_characters(self):
        res = patcher.apply_active_sheet_to_fods(FODS_3_SHEETS, 'Báo cáo & Tổng kết <2023> "Q1"')
        self.assertIn('config:name="ActiveTable"', res)
        self.assertIn('Báo cáo &amp; Tổng kết &lt;2023&gt; &quot;Q1&quot;', res)


class TestOverlaySheetXlsxActiveTab(unittest.TestCase):
    def test_overlay_injects_active_sheet_2_when_active_tab_1(self):
        xlsx = _fake_xlsx(WORKBOOK_XML_ACTIVE_1)
        overlaid = patcher.overlay_sheet_xlsx_fods(xlsx, FODS_3_SHEETS)
        match = re.search(r'config:name="ActiveTable"[^>]*>([^<]*)<', overlaid)
        self.assertIsNotNone(match)
        self.assertEqual(match.group(1), "Thông báo Sản phẩm mới")

    def test_overlay_defaults_to_first_sheet_when_active_tab_missing(self):
        xlsx = _fake_xlsx(WORKBOOK_XML_NO_ACTIVE_TAB)
        overlaid = patcher.overlay_sheet_xlsx_fods(xlsx, FODS_3_SHEETS)
        match = re.search(r'config:name="ActiveTable"[^>]*>([^<]*)<', overlaid)
        self.assertIsNotNone(match)
        self.assertEqual(match.group(1), "foxz")

    def test_overlay_replaces_pre_existing_active_table_with_xlsx_active_sheet(self):
        xlsx = _fake_xlsx(WORKBOOK_XML_ACTIVE_1)
        overlaid = patcher.overlay_sheet_xlsx_fods(xlsx, FODS_WITH_ACTIVE_TABLE)
        match = re.search(r'config:name="ActiveTable"[^>]*>([^<]*)<', overlaid)
        self.assertIsNotNone(match)
        self.assertEqual(match.group(1), patcher.parse_active_sheet_from_workbook(WORKBOOK_XML_ACTIVE_1))

    def test_overlay_escapes_special_characters_and_vietnamese(self):
        xlsx = _fake_xlsx(WORKBOOK_XML_SPECIAL_CHARS)
        overlaid = patcher.overlay_sheet_xlsx_fods(xlsx, FODS_3_SHEETS)
        match = re.search(r'config:name="ActiveTable"[^>]*>([^<]*)<', overlaid)
        self.assertIsNotNone(match)
        self.assertEqual(match.group(1), 'Báo cáo &amp; Phân tích &lt;2023&gt; &quot;Chi tiết&quot;')


REAL_FILE_PATH = r"E:\VN OFice\file test\DSS_Báo giá Dahua HN-T11.2023.xlsx"


class TestRealFileActiveTabOverlay(unittest.TestCase):
    @unittest.skipUnless(os.path.exists(REAL_FILE_PATH), f"File không tồn tại: {REAL_FILE_PATH}")
    def test_real_dahua_file_active_table_overlay(self):
        with tempfile.TemporaryDirectory() as t:
            out = main._run_soffice_convert(REAL_FILE_PATH, "fods", t, app_kind="sheet")
            with open(out, encoding="utf-8", errors="replace") as handle:
                fods = handle.read()
        fods = main._apply_native_import_overlay(REAL_FILE_PATH, fods, "sheet")
        match = re.search(r'config:name="ActiveTable"[^>]*>([^<]*)<', fods)
        self.assertIsNotNone(match, 'FODS sau overlay phải chứa config:name="ActiveTable"')
        self.assertEqual(match.group(1), "Thông báo Sản phẩm mới")


if __name__ == "__main__":
    unittest.main()
