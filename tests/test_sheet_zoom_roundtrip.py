"""Unit tests for sheet zoomScale preservation in postprocess_sheet_xlsx (TICKET SB13)."""

from __future__ import annotations

import io
import sys
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "adapters" / "libreoffice" / "common"))

from ooxml_zip_patch import postprocess_sheet_xlsx


def make_test_xlsx(sheet1_xml: str, sheet_name: str = "Sheet1") -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(
            "xl/workbook.xml",
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            f'<sheets><sheet name="{sheet_name}" sheetId="1" r:id="rId1"/></sheets></workbook>',
        )
        z.writestr(
            "xl/_rels/workbook.xml.rels",
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
            'Target="worksheets/sheet1.xml"/></Relationships>',
        )
        z.writestr("xl/worksheets/sheet1.xml", sheet1_xml)
        z.writestr(
            "xl/styles.xml",
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<cellXfs count="1"><xf numFmtId="0"/></cellXfs></styleSheet>',
        )
    return buf.getvalue()


def _replace_zip_entry(package_bytes: bytes, path: str, content: str) -> bytes:
    source = io.BytesIO(package_bytes)
    output = io.BytesIO()
    with zipfile.ZipFile(source, "r") as old, zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as new:
        for item in old.infolist():
            new.writestr(item, content.encode("utf-8") if item.filename == path else old.read(item.filename))
    return output.getvalue()


def _add_zip_entry(package_bytes: bytes, path: str, content: str) -> bytes:
    source = io.BytesIO(package_bytes)
    output = io.BytesIO()
    with zipfile.ZipFile(source, "r") as old, zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as new:
        for item in old.infolist():
            new.writestr(item, old.read(item.filename))
        new.writestr(path, content.encode("utf-8"))
    return output.getvalue()


class SheetZoomRoundtripTests(unittest.TestCase):
    def test_zoom_scale_restored_from_source(self):
        source_sheet = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetViews><sheetView zoomScale="85" zoomScaleNormal="85" workbookViewId="0"/></sheetViews>'
            '<sheetData><row r="1"><c r="A1" s="0"><v>100</v></c></row></sheetData>'
            '</worksheet>'
        )
        saved_sheet = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
            '<sheetData><row r="1"><c r="A1" s="0"><v>100</v></c></row></sheetData>'
            '</worksheet>'
        )

        source_bytes = make_test_xlsx(source_sheet, "Báo cáo")
        saved_bytes = make_test_xlsx(saved_sheet, "Báo cáo")

        patched_bytes = postprocess_sheet_xlsx(
            saved_bytes,
            source_xlsx_bytes=source_bytes,
        )

        with zipfile.ZipFile(io.BytesIO(patched_bytes)) as z:
            patched_sheet = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
            self.assertIn('zoomScale="85"', patched_sheet)
            self.assertIn('zoomScaleNormal="85"', patched_sheet)

    def test_explicit_gridlines_and_headings_are_written_to_sheet_view(self):
        saved_sheet = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetViews><sheetView workbookViewId="0" showGridLines="1" showRowColHeaders="1"/></sheetViews>'
            '<sheetData/></worksheet>'
        )
        saved_bytes = make_test_xlsx(saved_sheet)
        fods = ('<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
                'xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0" '
                'vno:show-grid-lines="false" vno:show-row-col-headers="false"></office:document>')

        patched = postprocess_sheet_xlsx(saved_bytes, source_fods=fods)
        with zipfile.ZipFile(io.BytesIO(patched)) as archive:
            xml = archive.read("xl/worksheets/sheet1.xml").decode("utf-8")
        self.assertIn('showGridLines="0"', xml)
        self.assertIn('showRowColHeaders="0"', xml)

    def test_untouched_gridlines_and_headings_are_not_changed(self):
        saved_sheet = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetViews><sheetView workbookViewId="0" showGridLines="0" showRowColHeaders="0"/></sheetViews>'
            '<sheetData/></worksheet>'
        )
        saved_bytes = make_test_xlsx(saved_sheet)

        patched = postprocess_sheet_xlsx(saved_bytes, source_fods="<office:document></office:document>")
        with zipfile.ZipFile(io.BytesIO(patched)) as archive:
            xml = archive.read("xl/worksheets/sheet1.xml").decode("utf-8")
        self.assertIn('showGridLines="0"', xml)
        self.assertIn('showRowColHeaders="0"', xml)

    def test_explicit_formula_display_is_written_to_sheet_view(self):
        saved_sheet = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetViews><sheetView workbookViewId="0" showFormulas="0"/></sheetViews>'
            '<sheetData/></worksheet>'
        )
        saved_bytes = make_test_xlsx(saved_sheet)
        fods = ('<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
                'xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0" vno:show-formulas="true"></office:document>')

        patched = postprocess_sheet_xlsx(saved_bytes, source_fods=fods)
        with zipfile.ZipFile(io.BytesIO(patched)) as archive:
            xml = archive.read("xl/worksheets/sheet1.xml").decode("utf-8")
        self.assertIn('showFormulas="1"', xml)

    def test_explicit_formula_bar_visibility_is_written_to_workbook_view(self):
        source = make_test_xlsx(
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView/></sheetViews><sheetData/></worksheet>'
        )
        source = _replace_zip_entry(source, "xl/workbook.xml", (
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<bookViews><workbookView showFormulaBar="1"/></bookViews>'
            '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>'
        ))
        fods = ('<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
                'xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0" vno:show-formula-bar="false"></office:document>')

        patched = postprocess_sheet_xlsx(source, source_fods=fods)
        with zipfile.ZipFile(io.BytesIO(patched)) as archive:
            xml = archive.read("xl/workbook.xml").decode("utf-8")
        self.assertIn('showFormulaBar="0"', xml)

    def test_explicit_sheet_view_mode_is_written_to_sheet_view(self):
        saved_sheet = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetViews><sheetView workbookViewId="0" view="normal"/></sheetViews><sheetData/></worksheet>'
        )
        fods = ('<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
                'xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0" vno:sheet-view="pageBreakPreview"></office:document>')

        patched = postprocess_sheet_xlsx(make_test_xlsx(saved_sheet), source_fods=fods)
        with zipfile.ZipFile(io.BytesIO(patched)) as archive:
            xml = archive.read("xl/worksheets/sheet1.xml").decode("utf-8")
        self.assertIn('view="pageBreakPreview"', xml)

    def test_explicit_zoom_overrides_source_zoom_after_restore(self):
        source_sheet = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetViews><sheetView workbookViewId="0" zoomScale="85" zoomScaleNormal="85"/></sheetViews>'
            '<sheetData/></worksheet>'
        )
        saved_sheet = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetViews><sheetView workbookViewId="0" zoomScale="100"/></sheetViews><sheetData/></worksheet>'
        )
        fods = ('<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
                'xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0" vno:zoom-scale="110"></office:document>')

        patched = postprocess_sheet_xlsx(make_test_xlsx(saved_sheet), source_fods=fods, source_xlsx_bytes=make_test_xlsx(source_sheet))
        with zipfile.ZipFile(io.BytesIO(patched)) as archive:
            xml = archive.read("xl/worksheets/sheet1.xml").decode("utf-8")
        self.assertIn('zoomScale="110"', xml)
        self.assertIn('zoomScaleNormal="110"', xml)

    def test_explicit_clear_removes_print_area_for_matching_sheet_only(self):
        package = make_test_xlsx('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews/><sheetData/></worksheet>')
        workbook = (
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>'
            '<definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">Sheet1!$A$1:$C$9</definedName>'
            '<definedName name="_xlnm.Print_Area" localSheetId="1">Other!$A$1</definedName></definedNames></workbook>'
        )
        package = _replace_zip_entry(package, "xl/workbook.xml", workbook)
        fods = ('<office:document><office:body><office:spreadsheet>'
                '<table:table table:name="Sheet1" vno:clear-print-area="true"/>'
                '</office:spreadsheet></office:body></office:document>')

        patched = postprocess_sheet_xlsx(package, source_fods=fods)
        with zipfile.ZipFile(io.BytesIO(patched)) as archive:
            xml = archive.read("xl/workbook.xml").decode("utf-8")
        self.assertNotIn('localSheetId="0">Sheet1!$A$1:$C$9', xml)
        self.assertIn('localSheetId="1">Other!$A$1', xml)

    def test_refreshed_pivot_location_matches_current_result_range(self):
        package = _add_zip_entry(
            make_test_xlsx('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews/><sheetData/></worksheet>'),
            "xl/pivotTables/pivotTable1.xml",
            '<pivotTableDefinition name="SalesPivot"><location ref="A3:E8"/></pivotTableDefinition>',
        )
        fods = ('<office:document><office:body><office:spreadsheet><table:data-pilot-tables>'
                '<table:data-pilot-table table:name="SalesPivot" vno:xlsx-location="A1:D4">'
                '</table:data-pilot-table></table:data-pilot-tables></office:spreadsheet></office:body></office:document>')

        patched = postprocess_sheet_xlsx(package, source_fods=fods)
        with zipfile.ZipFile(io.BytesIO(patched)) as archive:
            xml = archive.read("xl/pivotTables/pivotTable1.xml").decode("utf-8")
        self.assertIn('<location ref="A1:D4"/>', xml)


if __name__ == "__main__":
    unittest.main()
