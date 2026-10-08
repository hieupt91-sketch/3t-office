"""Unit tests for scripts/audit-0610/xlsx_structure_roundtrip.py (TICKET SB13)."""

from __future__ import annotations

import io
import sys
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts" / "audit-0610"))

import xlsx_structure_roundtrip as auditor


def make_mock_xlsx(
    workbook_xml: str,
    sheet1_xml: str,
    workbook_rels_xml: str = "",
    extra_files: dict[str, str] | None = None,
) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("xl/workbook.xml", workbook_xml)
        if not workbook_rels_xml:
            workbook_rels_xml = (
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
                'Target="worksheets/sheet1.xml"/></Relationships>'
            )
        z.writestr("xl/_rels/workbook.xml.rels", workbook_rels_xml)
        z.writestr("xl/worksheets/sheet1.xml", sheet1_xml)
        if extra_files:
            for fname, content in extra_files.items():
                z.writestr(fname, content)
    return buf.getvalue()


class XlsxStructureRoundtripTests(unittest.TestCase):
    def test_parse_workbook_metadata_sheets_and_names(self):
        wb_xml = (
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets>'
            '<sheet name="Báo cáo" sheetId="1" state="visible" r:id="rId1"/>'
            '<sheet name="Dữ liệu ẩn" sheetId="2" state="veryHidden" r:id="rId2"/>'
            '</sheets>'
            '<definedNames>'
            '<definedName name="DoanhThu" localSheetId="0">Sheet1!$A$1:$B$10</definedName>'
            '<definedName name="_xlnm._FilterDatabase" localSheetId="0">Sheet1!$A$1:$C$50</definedName>'
            '</definedNames>'
            '<pivotCaches><pivotCache cacheId="1" r:id="rId3"/></pivotCaches>'
            '</workbook>'
        )
        wb_bytes = make_mock_xlsx(wb_xml, '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>')
        with zipfile.ZipFile(io.BytesIO(wb_bytes)) as z:
            meta = auditor.parse_workbook_metadata(z)
            self.assertEqual(len(meta["sheets"]), 2)
            self.assertEqual(meta["sheets"][0]["name"], "Báo cáo")
            self.assertEqual(meta["sheets"][0]["state"], "visible")
            self.assertEqual(meta["sheets"][1]["name"], "Dữ liệu ẩn")
            self.assertEqual(meta["sheets"][1]["state"], "veryHidden")
            self.assertEqual(len(meta["defined_names"]), 2)
            self.assertEqual(meta["defined_names"][0]["name"], "DoanhThu")
            self.assertEqual(meta["defined_names"][0]["target"], "SHEET1!A1:B10")
            self.assertEqual(meta["pivot_caches"], 1)

    def test_parse_worksheet_elements(self):
        sheet_xml = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetViews><sheetView zoomScale="85" view="normal">'
            '<pane xSplit="1" ySplit="2" topLeftCell="B3" state="frozen"/>'
            '</sheetView></sheetViews>'
            '<cols>'
            '<col min="1" max="2" width="15.5" hidden="0"/>'
            '<col min="3" max="3" width="20.0" hidden="1"/>'
            '</cols>'
            '<sheetData>'
            '<row r="1" ht="25.0" hidden="0"/>'
            '<row r="2" ht="15.0" hidden="1"/>'
            '</sheetData>'
            '<autoFilter ref="A1:E20">'
            '<filterColumn colId="0"/>'
            '<filterColumn colId="2"/>'
            '</autoFilter>'
            '<mergeCells count="2">'
            '<mergeCell ref="A1:B2"/>'
            '<mergeCell ref="C3:D3"/>'
            '</mergeCells>'
            '<conditionalFormatting sqref="A1:A10">'
            '<cfRule type="cellIs" operator="greaterThan" priority="1"/>'
            '</conditionalFormatting>'
            '<dataValidations count="1">'
            '<dataValidation type="list" sqref="B1:B10" allowBlank="1"/>'
            '</dataValidations>'
            '<hyperlinks>'
            '<hyperlink ref="D1" location="Sheet2!A1"/>'
            '</hyperlinks>'
            '<pageSetup orientation="landscape" paperSize="9"/>'
            '</worksheet>'
        )

        elements = auditor.parse_worksheet_elements(sheet_xml)
        self.assertEqual(elements["zoom"], 85)
        self.assertIsNotNone(elements["pane"])
        self.assertEqual(elements["pane"]["xSplit"], 1)
        self.assertEqual(elements["pane"]["ySplit"], 2)
        self.assertEqual(elements["pane"]["state"], "frozen")

        self.assertIn("A1:B2", elements["merges"])
        self.assertIn("C3:D3", elements["merges"])
        self.assertEqual(len(elements["merges"]), 2)

        self.assertIsNotNone(elements["autofilter"])
        self.assertEqual(elements["autofilter"]["ref"], "A1:E20")
        self.assertEqual(elements["autofilter"]["filter_columns"], [0, 2])

        self.assertEqual(len(elements["cfs"]), 1)
        self.assertEqual(elements["cfs"][0]["sqref"], "A1:A10")
        self.assertEqual(elements["cfs"][0]["rules"][0]["type"], "cellIs")

        self.assertEqual(len(elements["dvs"]), 1)
        self.assertEqual(elements["dvs"][0]["type"], "list")
        self.assertEqual(elements["dvs"][0]["sqref"], "B1:B10")

        self.assertEqual(elements["cols"][1]["width"], 15.5)
        self.assertFalse(elements["cols"][1]["hidden"])
        self.assertTrue(elements["cols"][3]["hidden"])

        self.assertEqual(elements["rows"][1]["ht"], 25.0)
        self.assertFalse(elements["rows"][1]["hidden"])
        self.assertTrue(elements["rows"][2]["hidden"])

        self.assertIn("D1", elements["hyperlinks"])
        self.assertEqual(elements["pageSetup"]["orientation"], "landscape")

    def test_compare_structures_perfect_match(self):
        wb_xml = (
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="Sheet1" sheetId="1" state="visible" r:id="rId1"/></sheets>'
            '<definedNames><definedName name="Vung1">Sheet1!$A$1:$A$10</definedName></definedNames>'
            '</workbook>'
        )
        sheet_xml = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<mergeCells count="1"><mergeCell ref="A1:B2"/></mergeCells>'
            '<autoFilter ref="A1:C10"/>'
            '</worksheet>'
        )
        raw = make_mock_xlsx(wb_xml, sheet_xml)
        p1 = ROOT / "tests" / "temp_mock1.xlsx"
        p2 = ROOT / "tests" / "temp_mock2.xlsx"
        try:
            p1.write_bytes(raw)
            p2.write_bytes(raw)
            d1 = auditor.extract_workbook_structures(p1)
            d2 = auditor.extract_workbook_structures(p2)
            cmp_res = auditor.compare_structures(d1, d2)
            self.assertEqual(cmp_res["status"], "PASS")
            self.assertEqual(cmp_res["max_level"], "PASS")
            self.assertEqual(cmp_res["categories"]["mergeCells"]["status"], "PASS")
            self.assertEqual(cmp_res["categories"]["autoFilter"]["status"], "PASS")
            self.assertEqual(cmp_res["categories"]["definedNames"]["status"], "PASS")
        finally:
            if p1.is_file():
                p1.unlink()
            if p2.is_file():
                p2.unlink()

    def test_compare_structures_detects_mismatch(self):
        wb_xml1 = (
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="Sheet1" sheetId="1" state="visible" r:id="rId1"/></sheets>'
            '</workbook>'
        )
        sheet_xml1 = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetViews><sheetView zoomScale="80"/></sheetViews>'
            '<mergeCells count="1"><mergeCell ref="A1:B2"/></mergeCells>'
            '</worksheet>'
        )
        sheet_xml2 = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetViews><sheetView zoomScale="100"/></sheetViews>'
            '<mergeCells count="0"/>'
            '</worksheet>'
        )
        raw1 = make_mock_xlsx(wb_xml1, sheet_xml1)
        raw2 = make_mock_xlsx(wb_xml1, sheet_xml2)
        p1 = ROOT / "tests" / "temp_mock1.xlsx"
        p2 = ROOT / "tests" / "temp_mock2.xlsx"
        try:
            p1.write_bytes(raw1)
            p2.write_bytes(raw2)
            d1 = auditor.extract_workbook_structures(p1)
            d2 = auditor.extract_workbook_structures(p2)
            cmp_res = auditor.compare_structures(d1, d2)
            self.assertEqual(cmp_res["status"], "LECH")
            self.assertEqual(cmp_res["categories"]["mergeCells"]["status"], "LECH")
            self.assertEqual(cmp_res["categories"]["sheetViews_zoom"]["status"], "LECH")
        finally:
            if p1.is_file():
                p1.unlink()
            if p2.is_file():
                p2.unlink()

    def test_check_not_empty_save(self):
        p1 = ROOT / "tests" / "temp_empty1.xlsx"
        p2 = ROOT / "tests" / "temp_empty2.xlsx"
        try:
            p1.write_bytes(b"sample bytes 1")
            p2.write_bytes(b"sample bytes 1")
            with self.assertRaises(ValueError) as ctx:
                auditor.check_not_empty_save(p1, p2)
            self.assertIn("FAIL 'luu rong'", str(ctx.exception))

            p2.write_bytes(b"sample bytes 2")
            self.assertTrue(auditor.check_not_empty_save(p1, p2))
        finally:
            if p1.is_file():
                p1.unlink()
            if p2.is_file():
                p2.unlink()


if __name__ == "__main__":
    unittest.main()
