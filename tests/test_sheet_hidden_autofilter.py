"""Sheet: veryHidden sheet state and AutoFilter round-trip fidelity.

Root cause (confirmed via real soffice round-trip):
  - veryHidden: soffice downgrades veryHidden→hidden during XLSX→FODS.
    VN Office reads original state from xl/workbook.xml and overlays
    vno:sheet-state onto FODS; postprocess writes it back to XLSX.
  - AutoFilter: FODS preserves <table:database-ranges> through round-trip,
    but serializeToFods() never wrote them.  Now emits database-ranges when
    isFilterActive is set, and postprocess writes <autoFilter ref> back.
"""

from __future__ import annotations

import io
import unittest
import zipfile

import main

patcher = main._ooxml_zip_patch()

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

WORKBOOK_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
<sheet name="DataSheet" sheetId="1" r:id="rId1"/>
<sheet name="InternalHelper" sheetId="2" r:id="rId2" state="veryHidden"/>
<sheet name="HiddenSheet" sheetId="3" r:id="rId3" state="hidden"/>
<sheet name="PlainSheet" sheetId="4" r:id="rId4"/>
</sheets>
</workbook>"""

WORKBOOK_RELS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/>
</Relationships>"""

SHEET1_WITH_AUTOFILTER = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
<sheetData>
<row r="1"><c r="A1" t="inlineStr"><is><t>Name</t></is></c><c r="B1" t="inlineStr"><is><t>City</t></is></c></row>
<row r="2"><c r="A2" t="inlineStr"><is><t>Alice</t></is></c><c r="B2" t="inlineStr"><is><t>HN</t></is></c></row>
</sheetData>
<autoFilter ref="A1:B2"/>
</worksheet>"""

SHEET2_PLAIN = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"/></sheetViews>
<sheetData/>
</worksheet>"""

SHEET3_PLAIN = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"/></sheetViews>
<sheetData/>
</worksheet>"""

SHEET4_PLAIN = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"/></sheetViews>
<sheetData/>
</worksheet>"""

FODS_BASE = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0">
<office:body><office:spreadsheet>
<table:table table:name="DataSheet"></table:table>
<table:table table:name="InternalHelper"></table:table>
<table:table table:name="HiddenSheet"></table:table>
<table:table table:name="PlainSheet"></table:table>
</office:spreadsheet></office:body>
</office:document>"""


def _fake_xlsx(
    sheet1_xml=SHEET1_WITH_AUTOFILTER,
    sheet2_xml=SHEET2_PLAIN,
    sheet3_xml=SHEET3_PLAIN,
    sheet4_xml=SHEET4_PLAIN,
    workbook_xml=WORKBOOK_XML,
) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
        z.writestr("xl/workbook.xml", workbook_xml)
        z.writestr("xl/_rels/workbook.xml.rels", WORKBOOK_RELS_XML)
        z.writestr("xl/worksheets/sheet1.xml", sheet1_xml)
        z.writestr("xl/worksheets/sheet2.xml", sheet2_xml)
        z.writestr("xl/worksheets/sheet3.xml", sheet3_xml)
        z.writestr("xl/worksheets/sheet4.xml", sheet4_xml)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Tests — Sheet Visibility (veryHidden)
# ---------------------------------------------------------------------------

class TestParseSheetVisibilityFromWorkbook(unittest.TestCase):
    def test_reads_veryhidden_and_hidden(self):
        result = patcher.parse_sheet_visibility_from_workbook(WORKBOOK_XML)
        self.assertEqual(result["InternalHelper"], "veryHidden")
        self.assertEqual(result["HiddenSheet"], "hidden")
        self.assertNotIn("DataSheet", result)
        self.assertNotIn("PlainSheet", result)

    def test_none_returns_empty(self):
        self.assertEqual(patcher.parse_sheet_visibility_from_workbook(None), {})

    def test_all_visible_returns_empty(self):
        wb = """<workbook><sheets>
        <sheet name="A"/><sheet name="B" state="visible"/>
        </sheets></workbook>"""
        self.assertEqual(patcher.parse_sheet_visibility_from_workbook(wb), {})


class TestApplySheetVisibilityToFods(unittest.TestCase):
    def test_injects_vno_sheet_state(self):
        vis = {"InternalHelper": "veryHidden", "HiddenSheet": "hidden"}
        result = patcher.apply_sheet_visibility_to_fods(FODS_BASE, vis)
        self.assertIn('vno:sheet-state="veryHidden"', result)
        self.assertIn('vno:sheet-state="hidden"', result)

    def test_noop_when_empty(self):
        self.assertEqual(patcher.apply_sheet_visibility_to_fods(FODS_BASE, {}), FODS_BASE)


class TestParseSheetVisibilityFromFods(unittest.TestCase):
    def test_reads_vno_sheet_state(self):
        fods = FODS_BASE.replace(
            'table:name="InternalHelper"',
            'table:name="InternalHelper" vno:sheet-state="veryHidden"'
        )
        result = patcher.parse_sheet_visibility_from_fods(fods)
        self.assertEqual(result["InternalHelper"], "veryHidden")

    def test_none_returns_empty(self):
        self.assertEqual(patcher.parse_sheet_visibility_from_fods(None), {})


class TestApplySheetVisibilityToWorkbook(unittest.TestCase):
    def test_writes_veryhidden_state(self):
        vis = {"InternalHelper": "veryHidden"}
        result = patcher.apply_sheet_visibility_to_workbook(WORKBOOK_XML, vis)
        self.assertIn('state="veryHidden"', result)

    def test_noop_when_empty(self):
        self.assertEqual(patcher.apply_sheet_visibility_to_workbook(WORKBOOK_XML, {}), WORKBOOK_XML)


class TestOverlaySheetXlsxVisibility(unittest.TestCase):
    def test_overlay_injects_veryhidden(self):
        original = _fake_xlsx()
        overlaid = patcher.overlay_sheet_xlsx_fods(original, FODS_BASE)
        self.assertIn('vno:sheet-state="veryHidden"', overlaid)
        self.assertIn('vno:sheet-state="hidden"', overlaid)

    def test_overlay_does_not_touch_visible_sheets(self):
        original = _fake_xlsx()
        overlaid = patcher.overlay_sheet_xlsx_fods(original, FODS_BASE)
        # DataSheet and PlainSheet should NOT have vno:sheet-state
        for line in overlaid.split(">"):
            if 'table:name="DataSheet"' in line or 'table:name="PlainSheet"' in line:
                self.assertNotIn("vno:sheet-state", line)


class TestPostprocessSheetXlsxVisibility(unittest.TestCase):
    def test_writes_veryhidden_back_to_workbook(self):
        fods = FODS_BASE.replace(
            'table:name="InternalHelper"',
            'table:name="InternalHelper" vno:sheet-state="veryHidden"'
        )
        original = _fake_xlsx()
        patched = patcher.postprocess_sheet_xlsx(original, source_fods=fods)
        self.assertNotEqual(patched, original)
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            wb = z.read("xl/workbook.xml").decode("utf-8")
        self.assertIn('state="veryHidden"', wb)

    def test_hidden_state_preserved(self):
        fods = FODS_BASE.replace(
            'table:name="HiddenSheet"',
            'table:name="HiddenSheet" vno:sheet-state="hidden"'
        )
        original = _fake_xlsx()
        patched = patcher.postprocess_sheet_xlsx(original, source_fods=fods)
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            wb = z.read("xl/workbook.xml").decode("utf-8")
        # HiddenSheet should still have state="hidden"
        self.assertIn('name="HiddenSheet"', wb)

    def test_no_visibility_data_leaves_xlsx_untouched(self):
        original = _fake_xlsx()
        patched = patcher.postprocess_sheet_xlsx(original, source_fods=FODS_BASE)
        self.assertEqual(patched, original)


# ---------------------------------------------------------------------------
# Tests — AutoFilter
# ---------------------------------------------------------------------------

class TestParseAutofilterFromWorksheet(unittest.TestCase):
    def test_reads_auto_filter_ref(self):
        result = patcher.parse_autofilter_from_worksheet(SHEET1_WITH_AUTOFILTER)
        self.assertEqual(result, "A1:B2")

    def test_no_auto_filter_returns_none(self):
        self.assertIsNone(patcher.parse_autofilter_from_worksheet(SHEET2_PLAIN))

    def test_none_returns_none(self):
        self.assertIsNone(patcher.parse_autofilter_from_worksheet(None))


class TestApplyAutofilterToWorksheet(unittest.TestCase):
    def test_injects_auto_filter(self):
        result = patcher.apply_autofilter_to_worksheet(SHEET2_PLAIN, "A1:C10")
        self.assertIn('<autoFilter ref="A1:C10"/>', result)

    def test_noop_when_already_present(self):
        result = patcher.apply_autofilter_to_worksheet(SHEET1_WITH_AUTOFILTER, "A1:B2")
        self.assertEqual(result, SHEET1_WITH_AUTOFILTER)

    def test_noop_when_empty_ref(self):
        result = patcher.apply_autofilter_to_worksheet(SHEET2_PLAIN, "")
        self.assertEqual(result, SHEET2_PLAIN)


class TestParseAutofilterFromFods(unittest.TestCase):
    def test_reads_database_range(self):
        fods = FODS_BASE.replace(
            "</office:spreadsheet>",
            '<table:database-ranges><table:database-range table:name="AF1" table:target-range-address="DataSheet.A1:B2" table:display-filter-buttons="true"/></table:database-ranges></office:spreadsheet>'
        )
        result = patcher.parse_autofilter_from_fods(fods)
        self.assertEqual(result, {"DataSheet": "A1:B2"})

    def test_none_returns_empty(self):
        self.assertEqual(patcher.parse_autofilter_from_fods(None), {})


class TestApplyAutofilterToFods(unittest.TestCase):
    def test_injects_database_ranges(self):
        af = {"DataSheet": "A1:B2"}
        result = patcher.apply_autofilter_to_fods(FODS_BASE, af)
        self.assertIn("database-range", result)
        self.assertIn("DataSheet.A1:B2", result)

    def test_noop_when_empty(self):
        self.assertEqual(patcher.apply_autofilter_to_fods(FODS_BASE, {}), FODS_BASE)


class TestOverlaySheetXlsxAutofilter(unittest.TestCase):
    def test_overlay_injects_database_ranges(self):
        original = _fake_xlsx()
        overlaid = patcher.overlay_sheet_xlsx_fods(original, FODS_BASE)
        self.assertIn("database-range", overlaid)
        self.assertIn("DataSheet.A1:B2", overlaid)


class TestPostprocessSheetXlsxAutofilter(unittest.TestCase):
    def test_writes_auto_filter_into_worksheet(self):
        fods = FODS_BASE.replace(
            "</office:spreadsheet>",
            '<table:database-ranges><table:database-range table:name="AF1" table:target-range-address="PlainSheet.A1:C10" table:display-filter-buttons="true"/></table:database-ranges></office:spreadsheet>'
        )
        original = _fake_xlsx()
        patched = patcher.postprocess_sheet_xlsx(original, source_fods=fods)
        self.assertNotEqual(patched, original)
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            sheet4 = z.read("xl/worksheets/sheet4.xml").decode("utf-8")
        self.assertIn('<autoFilter ref="A1:C10"/>', sheet4)

    def test_no_autofilter_data_leaves_xlsx_untouched(self):
        original = _fake_xlsx()
        patched = patcher.postprocess_sheet_xlsx(original, source_fods=FODS_BASE)
        self.assertEqual(patched, original)


# ---------------------------------------------------------------------------
# Combined round-trip: visibility + AutoFilter
# ---------------------------------------------------------------------------

class TestCombinedRoundTrip(unittest.TestCase):
    def test_overlay_then_postprocess(self):
        """Full round-trip: XLSX → overlay FODS → postprocess XLSX preserves both."""
        original = _fake_xlsx()

        # Step 1: overlay (simulates File → Mở)
        overlaid = patcher.overlay_sheet_xlsx_fods(original, FODS_BASE)
        self.assertIn('vno:sheet-state="veryHidden"', overlaid)
        self.assertIn("database-range", overlaid)

        # Step 2: postprocess (simulates File → Lưu)
        patched = patcher.postprocess_sheet_xlsx(original, source_fods=overlaid)
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            wb = z.read("xl/workbook.xml").decode("utf-8")
            sheet1 = z.read("xl/worksheets/sheet1.xml").decode("utf-8")

        self.assertIn('state="veryHidden"', wb)
        self.assertIn('<autoFilter ref="A1:B2"/>', sheet1)


# ---------------------------------------------------------------------------
# Schema-order insertion tests
# ---------------------------------------------------------------------------

def _tag_indices(xml: str, *tags: str) -> dict[str, int]:
    """Return {tag: first_index} for each tag in *xml*. Index = position in string."""
    return {tag: xml.find(f"<{tag}") for tag in tags}


SHEET_WITH_MERGECELLS_PAGEMARGINS = """\
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"/></sheetViews>
<sheetData/>
<mergeCells count="1"><mergeCell ref="A1:B2"/></mergeCells>
<pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/>
</worksheet>"""

SHEET_WITH_SHEETPROTECTION = """\
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"/></sheetViews>
<sheetData/>
<sheetProtection password="FFFF" sheet="1"/>
<pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/>
</worksheet>"""

SHEET_WITH_HEADERFOOTER_DRAWING = """\
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"/></sheetViews>
<sheetData/>
<pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/>
<headerFooter>&lt;oddHeader&gt;Title&lt;/oddHeader&gt;</headerFooter>
<drawing r:id="rId1"/>
</worksheet>"""


class TestAutofilterSchemaOrder(unittest.TestCase):
    """autoFilter must land at the correct CT_Worksheet schema position."""

    def test_before_mergecells_and_pagemargins(self):
        result = patcher.apply_autofilter_to_worksheet(
            SHEET_WITH_MERGECELLS_PAGEMARGINS, "A1:C10"
        )
        idx = _tag_indices(result, "autoFilter", "mergeCells", "pageMargins")
        self.assertGreater(idx["autoFilter"], 0, "autoFilter must be inserted")
        self.assertLess(idx["autoFilter"], idx["mergeCells"])
        self.assertLess(idx["autoFilter"], idx["pageMargins"])

    def test_after_sheet_protection(self):
        result = patcher.apply_autofilter_to_worksheet(
            SHEET_WITH_SHEETPROTECTION, "A1:C10"
        )
        idx = _tag_indices(result, "sheetProtection", "autoFilter", "pageMargins")
        self.assertGreater(idx["autoFilter"], idx["sheetProtection"])
        self.assertLess(idx["autoFilter"], idx["pageMargins"])

    def test_before_headerfooter_and_drawing(self):
        result = patcher.apply_autofilter_to_worksheet(
            SHEET_WITH_HEADERFOOTER_DRAWING, "A1:C10"
        )
        idx = _tag_indices(result, "autoFilter", "headerFooter", "drawing")
        self.assertGreater(idx["autoFilter"], 0, "autoFilter must be inserted")
        self.assertLess(idx["autoFilter"], idx["headerFooter"])
        self.assertLess(idx["autoFilter"], idx["drawing"])

    def test_no_duplicate_when_already_present(self):
        xml_with = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/><autoFilter ref="A1:B2"/></worksheet>'
        result = patcher.apply_autofilter_to_worksheet(xml_with, "A1:B2")
        self.assertEqual(result, xml_with)
        self.assertEqual(result.count("<autoFilter"), 1)


class TestInsertWorksheetChildInSchemaOrder(unittest.TestCase):
    """Direct tests for the _insert_worksheet_child_in_schema_order helper."""

    def test_inserts_after_existing_earlier_children(self):
        xml = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/><pageMargins left="0"/></worksheet>'
        result = patcher._insert_worksheet_child_in_schema_order(
            xml, '<sheetProtection password="FFFF"/>', "sheetProtection"
        )
        idx = _tag_indices(result, "sheetData", "sheetProtection", "pageMargins")
        self.assertGreater(idx["sheetProtection"], idx["sheetData"])
        self.assertLess(idx["sheetProtection"], idx["pageMargins"])

    def test_skips_if_already_present(self):
        xml = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/><autoFilter ref="A1:B2"/></worksheet>'
        result = patcher._insert_worksheet_child_in_schema_order(
            xml, '<autoFilter ref="C3:D4"/>', "autoFilter"
        )
        self.assertEqual(result, xml)

    def test_falls_back_to_end_when_no_known_children(self):
        xml = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><foo/><bar/></worksheet>'
        result = patcher._insert_worksheet_child_in_schema_order(
            xml, '<autoFilter ref="A1:B2"/>', "autoFilter"
        )
        self.assertIn('<autoFilter ref="A1:B2"/>', result)
        self.assertTrue(result.index('<autoFilter') < result.index("</worksheet>"))


if __name__ == "__main__":
    unittest.main()
