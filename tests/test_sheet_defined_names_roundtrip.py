"""Unit tests for definedNames preservation in postprocess_sheet_xlsx (TICKET SB13)."""

from __future__ import annotations

import io
import sys
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "adapters" / "libreoffice" / "common"))

from ooxml_zip_patch import postprocess_sheet_xlsx


def make_test_xlsx_with_wb(workbook_xml: str, sheet1_xml: str) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("xl/workbook.xml", workbook_xml)
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


class SheetDefinedNamesRoundtripTests(unittest.TestCase):
    def test_missing_defined_names_restored(self):
        source_wb = (
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>'
            '<definedNames>'
            '<definedName name="_list">INDIRECT([3]Ts!$M$16)</definedName>'
            '<definedName name="VungChuan">Sheet1!$A$1:$B$10</definedName>'
            '</definedNames>'
            '<calcPr/>'
            '</workbook>'
        )
        saved_wb = (
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>'
            '<calcPr/>'
            '</workbook>'
        )
        sheet_xml = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetData><row r="1"><c r="A1" s="0"><v>100</v></c></row></sheetData>'
            '</worksheet>'
        )

        source_bytes = make_test_xlsx_with_wb(source_wb, sheet_xml)
        saved_bytes = make_test_xlsx_with_wb(saved_wb, sheet_xml)

        patched_bytes = postprocess_sheet_xlsx(
            saved_bytes,
            source_xlsx_bytes=source_bytes,
        )

        with zipfile.ZipFile(io.BytesIO(patched_bytes)) as z:
            patched_wb = z.read("xl/workbook.xml").decode("utf-8")
            self.assertIn('<definedNames>', patched_wb)
            self.assertIn('<definedName name="_list">INDIRECT([3]Ts!$M$16)</definedName>', patched_wb)
            self.assertIn('<definedName name="VungChuan">Sheet1!$A$1:$B$10</definedName>', patched_wb)


if __name__ == "__main__":
    unittest.main()
