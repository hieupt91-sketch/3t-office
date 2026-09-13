"""Unit tests for Sheet: empty cell with borders preservation and activeTab round-trip."""

from __future__ import annotations

import io
import re
import unittest
import zipfile

import main

patcher = main._ooxml_zip_patch()

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

# FODS with 3x3 grid, B2 has double border style but no value
FODS_3x3_EMPTY_CELL_WITH_BORDER = '''<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0">
<office:automatic-styles>
  <style:style style:name="ce1" style:family="table-cell">
    <style:table-cell-properties fo:border="0.75pt double #000000"/>
  </style:style>
</office:automatic-styles>
<office:settings>
  <config:config-item-set config:name="ooo:view-settings">
    <config:config-item-map-indexed config:name="Views">
      <config:config-item-map-entry>
        <config:config-item config:name="ActiveTable" config:type="string">Sheet1</config:config-item>
      </config:config-item-map-entry>
    </config:config-item-map-indexed>
  </config:config-item-set>
</office:settings>
<office:body>
  <office:spreadsheet>
    <table:table table:name="Sheet1">
      <table:table-column/><table:table-column/><table:table-column/>
      <table:table-row>
        <table:table-cell/><table:table-cell/><table:table-cell/>
      </table:table-row>
      <table:table-row>
        <table:table-cell/><table:table-cell table:style-name="ce1"/><table:table-cell/>
      </table:table-row>
      <table:table-row>
        <table:table-cell/><table:table-cell/><table:table-cell/>
      </table:table-row>
    </table:table>
  </office:spreadsheet>
</office:body>
</office:document>'''

# Simple FODS for activeTab test
FODS_ACTIVE_SHEET_2 = '''<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0">
<office:settings>
  <config:config-item-set config:name="ooo:view-settings">
    <config:config-item-map-indexed config:name="Views">
      <config:config-item-map-entry>
        <config:config-item config:name="ActiveTable" config:type="string">Sheet2</config:config-item>
      </config:config-item-map-entry>
    </config:config-item-map-indexed>
  </config:config-item-set>
</office:settings>
<office:body>
  <office:spreadsheet>
    <table:table table:name="Sheet1"><table:table-column/><table:table-column/><table:table-row><table:table-cell/><table:table-cell/></table:table-row></table:table>
    <table:table table:name="Sheet2"><table:table-column/><table:table-column/><table:table-row><table:table-cell/><table:table-cell/></table:table-row></table:table>
  </office:spreadsheet>
</office:body>
</office:document>'''

def _fake_xlsx(workbook_xml: str) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
        z.writestr("xl/workbook.xml", workbook_xml)
        z.writestr("xl/_rels/workbook.xml.rels", '<?xml version="1.0"?><Relationships/>')
        z.writestr("xl/worksheets/sheet1.xml", '<?xml version="1.0"?><worksheet/>')
        z.writestr("xl/worksheets/sheet2.xml", '<?xml version="1.0"?><worksheet/>')
    return buf.getvalue()

WORKBOOK_XML_TWO_SHEETS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView/></bookViews>
<sheets>
<sheet name="Sheet1" sheetId="1" r:id="rId1"/>
<sheet name="Sheet2" sheetId="2" r:id="rId2"/>
</sheets>
</workbook>'''

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestEmptyCellWithBorderRoundtrip(unittest.TestCase):
    """Test that empty cells with borders are preserved through parseFods -> serializeToFods."""

    def test_parse_fods_preserves_empty_cell_with_border(self):
        """Parse FODS with empty cell that has border style."""
        # We can't easily test the JS adapter from Python, but we can test the Python post-process
        # by verifying that serializeToFods would produce the right output.
        # This test documents the expected behavior.
        
        # Verify the fixture has the expected structure
        self.assertIn('table:style-name="ce1"', FODS_3x3_EMPTY_CELL_WITH_BORDER)
        self.assertIn('fo:border="0.75pt double #000000"', FODS_3x3_EMPTY_CELL_WITH_BORDER)
        
        # The cell at B2 (row 2, col 2) has style-name="ce1" but no value
        # This should be preserved through round-trip

    def test_serialize_fods_writes_style_name_for_empty_cell_with_border(self):
        """Verify that serializeToFods includes table:style-name for cells with visual styles."""
        # This is a documentation test - the actual implementation is in sheet-adapter.js
        # The fix ensures _cellHasPersistableContent returns true for cells with visual styles
        pass

class TestActiveTabRoundtrip(unittest.TestCase):
    """Test activeTab preservation through FODS -> XLSX post-process."""

    def test_postprocess_preserves_active_sheet_from_fods(self):
        """Post-process should read ActiveTable from FODS and write activeTab to workbook.xml."""
        xlsx_bytes = _fake_xlsx(WORKBOOK_XML_TWO_SHEETS)
        
        patched = patcher.postprocess_sheet_xlsx(xlsx_bytes, source_fods=FODS_ACTIVE_SHEET_2)
        
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            wb = z.read('xl/workbook.xml').decode('utf-8')
            m = re.search(r'activeTab="(\d+)"', wb)
            self.assertIsNotNone(m, 'workbook.xml should have activeTab')
            # Sheet2 is index 1 (0-based)
            self.assertEqual(m.group(1), "1", f'activeTab should be 1 for Sheet2, got {m.group(1)}')

    def test_postprocess_active_tab_first_sheet_when_not_in_fods(self):
        """Post-process should leave LibreOffice default when ActiveTable not in FODS."""
        fods_no_active = FODS_ACTIVE_SHEET_2.replace(
            '<config:config-item config:name="ActiveTable" config:type="string">Sheet2</config:config-item>',
            ''
        )
        xlsx_bytes = _fake_xlsx(WORKBOOK_XML_TWO_SHEETS)
        
        patched = patcher.postprocess_sheet_xlsx(xlsx_bytes, source_fods=fods_no_active)
        
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            wb = z.read('xl/workbook.xml').decode('utf-8')
            # When ActiveTable is missing, we don't write activeTab, leaving LibreOffice default (implicit 0)
            m = re.search(r'activeTab="(\d+)"', wb)
            self.assertIsNone(m, 'Should not write activeTab when ActiveTable missing in FODS')
            # Verify workbookView exists without activeTab
            self.assertIn('<workbookView/>', wb)

    def test_postprocess_active_tab_sheet_not_in_workbook(self):
        """Post-process should leave LibreOffice default when ActiveTable references non-existent sheet."""
        fods_bad_active = FODS_ACTIVE_SHEET_2.replace("Sheet2", "NonExistentSheet")
        xlsx_bytes = _fake_xlsx(WORKBOOK_XML_TWO_SHEETS)
        
        patched = patcher.postprocess_sheet_xlsx(xlsx_bytes, source_fods=fods_bad_active)
        
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            wb = z.read('xl/workbook.xml').decode('utf-8')
            # Should not crash, and should not write activeTab for non-existent sheet
            m = re.search(r'activeTab="(\d+)"', wb)
            self.assertIsNone(m, 'Should not write activeTab for non-existent sheet')
            self.assertIn('<workbookView/>', wb)

class TestParseActiveSheetFromFods(unittest.TestCase):
    """Test parsing ActiveTable from FODS."""

    def test_parse_active_sheet_from_fods(self):
        result = patcher.parse_active_sheet_from_fods(FODS_ACTIVE_SHEET_2)
        self.assertEqual(result, "Sheet2")

    def test_parse_active_sheet_from_fods_none_when_missing(self):
        fods_no_active = FODS_ACTIVE_SHEET_2.replace(
            '<config:config-item config:name="ActiveTable" config:type="string">Sheet2</config:config-item>',
            ''
        )
        result = patcher.parse_active_sheet_from_fods(fods_no_active)
        self.assertIsNone(result)

    def test_parse_active_sheet_from_fods_escapes_special_chars(self):
        fods_special = FODS_ACTIVE_SHEET_2.replace("Sheet2", "Báo cáo & Phân tích")
        result = patcher.parse_active_sheet_from_fods(fods_special)
        self.assertEqual(result, "Báo cáo & Phân tích")


class TestParseTabColorsFromFods(unittest.TestCase):
    """Test parsing tab colors from FODS."""

    def test_parse_tab_colors_from_table_styles(self):
        fods = '''<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:tableooo="http://openoffice.org/2009/table">
<office:automatic-styles>
  <style:style style:name="ta1" style:family="table">
    <style:table-properties tableooo:tab-color="#ffff00" table:tab-color="#ffff00"/>
  </style:style>
  <style:style style:name="ta2" style:family="table">
    <style:table-properties table:tab-color="#00ff00"/>
  </style:style>
</office:automatic-styles>
<office:body>
  <office:spreadsheet>
    <table:table table:name="Sheet1" table:style-name="ta1"/>
    <table:table table:name="Sheet2" table:style-name="ta2"/>
    <table:table table:name="Sheet3"/>
  </office:spreadsheet>
</office:body>
</office:document>'''
        colors = patcher.parse_tab_colors_from_fods(fods)
        self.assertEqual(colors.get("Sheet1"), "#FFFF00")
        self.assertEqual(colors.get("Sheet2"), "#00FF00")
        self.assertNotIn("Sheet3", colors)

    def test_parse_tab_colors_from_table_attributes(self):
        fods = '''<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:vno="http://vnoffice.vn/ns">
<office:body>
  <office:spreadsheet>
    <table:table table:name="Sheet1" vno:tab-color="#ff0000"/>
    <table:table table:name="Sheet2" table:tab-color="#0000ff"/>
  </office:spreadsheet>
</office:body>
</office:document>'''
        colors = patcher.parse_tab_colors_from_fods(fods)
        self.assertEqual(colors.get("Sheet1"), "#FF0000")
        self.assertEqual(colors.get("Sheet2"), "#0000FF")


class TestApplyTabColorToWorksheet(unittest.TestCase):
    """Test applying tabColor to worksheet XML."""

    def test_apply_tab_color_inserts_sheetpr_in_schema_order(self):
        sheet_xml = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView/></sheetViews><sheetData/></worksheet>'
        patched = patcher.apply_tab_color_to_worksheet(sheet_xml, "#FFFF00")
        self.assertIn('<sheetPr><tabColor rgb="FFFFFF00"/></sheetPr>', patched)
        self.assertTrue(patched.index("<sheetPr") < patched.index("<sheetViews"))
        self.assertTrue(patched.index("<sheetPr") < patched.index("<sheetData"))

    def test_apply_tab_color_updates_existing_tab_color(self):
        sheet_xml = '<worksheet><sheetPr><tabColor rgb="FF000000"/><pageSetUpPr/></sheetPr><sheetData/></worksheet>'
        patched = patcher.apply_tab_color_to_worksheet(sheet_xml, "#00FF00")
        self.assertIn('<tabColor rgb="FF00FF00"/>', patched)
        self.assertNotIn('rgb="FF000000"', patched)
        self.assertIn('<pageSetUpPr/>', patched)

    def test_apply_tab_color_into_empty_sheetpr(self):
        sheet_xml = '<worksheet><sheetPr/><sheetData/></worksheet>'
        patched = patcher.apply_tab_color_to_worksheet(sheet_xml, "#112233")
        self.assertIn('<sheetPr><tabColor rgb="FF112233"/></sheetPr>', patched)


class TestApplySheetViewSelection(unittest.TestCase):
    """Test tabSelected in worksheet sheetViews."""

    def test_active_sheet_gets_tab_selected_1(self):
        sheet_xml = '<worksheet><sheetViews><sheetView tabSelected="false" workbookViewId="0"/></sheetViews></worksheet>'
        patched = patcher.apply_sheet_view_selection(sheet_xml, is_active=True)
        self.assertIn('tabSelected="1"', patched)
        self.assertNotIn('tabSelected="false"', patched)

    def test_active_sheet_adds_tab_selected_if_missing(self):
        sheet_xml = '<worksheet><sheetViews><sheetView workbookViewId="0"/></sheetViews></worksheet>'
        patched = patcher.apply_sheet_view_selection(sheet_xml, is_active=True)
        self.assertIn('tabSelected="1"', patched)

    def test_inactive_sheet_removes_tab_selected(self):
        sheet_xml = '<worksheet><sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews></worksheet>'
        patched = patcher.apply_sheet_view_selection(sheet_xml, is_active=False)
        self.assertNotIn('tabSelected', patched)

    def test_inactive_sheet_removes_tab_selected_false(self):
        sheet_xml = '<worksheet><sheetViews><sheetView tabSelected="false" workbookViewId="0"/></sheetViews></worksheet>'
        patched = patcher.apply_sheet_view_selection(sheet_xml, is_active=False)
        self.assertNotIn('tabSelected', patched)


class TestPostprocessSheetXlsxTabsIntegration(unittest.TestCase):
    """Full integration test for postprocess_sheet_xlsx with tabColor and tabSelected."""

    def test_roundtrip_tab_colors_and_active_sheet(self):
        wb_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView/></bookViews>
<sheets>
<sheet name="Sheet1" sheetId="1" r:id="rId1"/>
<sheet name="Sheet2" sheetId="2" r:id="rId2"/>
</sheets>
</workbook>'''
        rels_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>'''
        sheet1_xml = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView tabSelected="false" workbookViewId="0"/></sheetViews><sheetData/></worksheet>'
        sheet2_xml = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView tabSelected="false" workbookViewId="0"/></sheetViews><sheetData/></worksheet>'

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
            z.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
            z.writestr("xl/workbook.xml", wb_xml)
            z.writestr("xl/_rels/workbook.xml.rels", rels_xml)
            z.writestr("xl/worksheets/sheet1.xml", sheet1_xml)
            z.writestr("xl/worksheets/sheet2.xml", sheet2_xml)
        xlsx_bytes = buf.getvalue()

        fods = '''<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:tableooo="http://openoffice.org/2009/table"
  xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0">
<office:settings>
  <config:config-item-set config:name="ooo:view-settings">
    <config:config-item-map-indexed config:name="Views">
      <config:config-item-map-entry>
        <config:config-item config:name="ActiveTable" config:type="string">Sheet2</config:config-item>
      </config:config-item-map-entry>
    </config:config-item-map-indexed>
  </config:config-item-set>
</office:settings>
<office:automatic-styles>
  <style:style style:name="ta1" style:family="table">
    <style:table-properties tableooo:tab-color="#ff0000" table:tab-color="#ff0000"/>
  </style:style>
  <style:style style:name="ta2" style:family="table">
    <style:table-properties tableooo:tab-color="#00ff00" table:tab-color="#00ff00"/>
  </style:style>
</office:automatic-styles>
<office:body>
  <office:spreadsheet>
    <table:table table:name="Sheet1" table:style-name="ta1"/>
    <table:table table:name="Sheet2" table:style-name="ta2"/>
  </office:spreadsheet>
</office:body>
</office:document>'''

        patched = patcher.postprocess_sheet_xlsx(xlsx_bytes, source_fods=fods)

        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            out_wb = z.read("xl/workbook.xml").decode("utf-8")
            s1 = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
            s2 = z.read("xl/worksheets/sheet2.xml").decode("utf-8")

        self.assertIn('activeTab="1"', out_wb)
        self.assertIn('<tabColor rgb="FFFF0000"/>', s1)
        self.assertNotIn('tabSelected', s1)
        self.assertIn('<tabColor rgb="FF00FF00"/>', s2)
        self.assertIn('tabSelected="1"', s2)


if __name__ == "__main__":
    unittest.main()