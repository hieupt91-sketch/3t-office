"""Unit tests for autoFilter filterColumn preservation in postprocess_sheet_xlsx (TICKET SB13)."""

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


class SheetFilterColumnsRoundtripTests(unittest.TestCase):
    def test_filter_column_restored_from_source(self):
        source_sheet = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetData><row r="1"><c r="A1" s="0"><v>100</v></c></row></sheetData>'
            '<autoFilter ref="A1:E50">'
            '<filterColumn colId="2"><filters><filter val="HN"/></filters></filterColumn>'
            '</autoFilter>'
            '</worksheet>'
        )
        saved_sheet = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetData><row r="1"><c r="A1" s="0"><v>100</v></c></row></sheetData>'
            '<autoFilter ref="A1:E50"/>'
            '</worksheet>'
        )

        source_bytes = make_test_xlsx(source_sheet, "Danh sách")
        saved_bytes = make_test_xlsx(saved_sheet, "Danh sách")

        patched_bytes = postprocess_sheet_xlsx(
            saved_bytes,
            source_xlsx_bytes=source_bytes,
        )

        with zipfile.ZipFile(io.BytesIO(patched_bytes)) as z:
            patched_sheet = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
            self.assertIn('<filterColumn colId="2">', patched_sheet)
            self.assertIn('<filter val="HN"/>', patched_sheet)
            self.assertIn('</autoFilter>', patched_sheet)


if __name__ == "__main__":
    unittest.main()
