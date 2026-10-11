"""Unit tests for hyperlinks preservation in postprocess_sheet_xlsx (TICKET SB13)."""

from __future__ import annotations

import io
import sys
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "adapters" / "libreoffice" / "common"))

from ooxml_zip_patch import postprocess_sheet_xlsx


def make_test_xlsx_with_rels(
    sheet1_xml: str,
    sheet1_rels_xml: str = "",
    sheet_name: str = "Sheet1",
) -> bytes:
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
        if sheet1_rels_xml:
            z.writestr("xl/worksheets/_rels/sheet1.xml.rels", sheet1_rels_xml)
        z.writestr(
            "xl/styles.xml",
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<cellXfs count="1"><xf numFmtId="0"/></cellXfs></styleSheet>',
        )
    return buf.getvalue()


class SheetHyperlinksRoundtripTests(unittest.TestCase):
    def test_missing_hyperlinks_and_rels_restored(self):
        source_sheet = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetData><row r="1"><c r="A1" s="0"><v>Trang chu</v></c></row></sheetData>'
            '<hyperlinks>'
            '<hyperlink ref="A1" r:id="rId1" display="Trang chu"/>'
            '</hyperlinks>'
            '</worksheet>'
        )
        source_rels = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" '
            'Target="https://vnoffice.vn" TargetMode="External"/>'
            '</Relationships>'
        )
        saved_sheet = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetData><row r="1"><c r="A1" s="0"><v>Trang chu</v></c></row></sheetData>'
            '</worksheet>'
        )

        source_bytes = make_test_xlsx_with_rels(source_sheet, source_rels, "Sheet1")
        saved_bytes = make_test_xlsx_with_rels(saved_sheet, "", "Sheet1")

        patched_bytes = postprocess_sheet_xlsx(
            saved_bytes,
            source_xlsx_bytes=source_bytes,
        )

        with zipfile.ZipFile(io.BytesIO(patched_bytes)) as z:
            patched_sheet = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
            self.assertIn('<hyperlinks>', patched_sheet)
            self.assertIn('<hyperlink ref="A1"', patched_sheet)
            self.assertIn("xl/worksheets/_rels/sheet1.xml.rels", z.namelist())
            patched_rels = z.read("xl/worksheets/_rels/sheet1.xml.rels").decode("utf-8")
            self.assertIn('Target="https://vnoffice.vn"', patched_rels)
            self.assertIn('TargetMode="External"', patched_rels)


if __name__ == "__main__":
    unittest.main()
