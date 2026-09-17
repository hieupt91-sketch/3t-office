"""Unit tests for S9: Hidden columns (up to XFD/16384) and empty hidden rows restoration.
Ensures postprocess_sheet_xlsx preserves hidden column ranges and hidden rows
from source XLSX without breaking OOXML schema ordering.
"""

from __future__ import annotations

import io
import unittest
import zipfile

import main

patcher = main._ooxml_zip_patch()

WORKBOOK_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
<sheet name="Sheet1" sheetId="1" r:id="rId1"/>
</sheets>
</workbook>"""

WORKBOOK_RELS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>"""

SOURCE_SHEET_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols>
<col min="1" max="8" width="10.0" customWidth="1"/>
<col min="9" max="16384" width="9.18" style="5" hidden="1"/>
</cols>
<sheetData>
<row r="1"><c r="A1"><v>100</v></c></row>
<row r="34"><c r="A34"><v>200</v></c></row>
<row r="35" hidden="1"/>
<row r="36" hidden="1"/>
<row r="37" hidden="1"/>
<row r="38" hidden="1"/>
<row r="39"><c r="A39"><v>300</v></c></row>
</sheetData>
</worksheet>"""

SAVED_SHEET_XML_TRUNCATED = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols>
<col min="1" max="8" width="10.0" customWidth="1"/>
<col min="9" max="26" width="9.00" hidden="true" customWidth="1"/>
</cols>
<sheetData>
<row r="1"><c r="A1"><v>100</v></c></row>
<row r="34"><c r="A34"><v>200</v></c></row>
<row r="39"><c r="A39"><v>300</v></c></row>
</sheetData>
</worksheet>"""

FODS_MINIMAL = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0">
<office:body><office:spreadsheet>
<table:table table:name="Sheet1"></table:table>
</office:spreadsheet></office:body>
</office:document>"""


def _make_xlsx(sheet_xml: str) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("xl/workbook.xml", WORKBOOK_XML.encode("utf-8"))
        z.writestr("xl/_rels/workbook.xml.rels", WORKBOOK_RELS_XML.encode("utf-8"))
        z.writestr("xl/worksheets/sheet1.xml", sheet_xml.encode("utf-8"))
        z.writestr("xl/styles.xml", b"<styleSheet/>")
    return buf.getvalue()


class TestSheetHiddenColsAndRows(unittest.TestCase):

    def test_restore_hidden_cols_up_to_xfd(self):
        source_xlsx = _make_xlsx(SOURCE_SHEET_XML)
        saved_xlsx = _make_xlsx(SAVED_SHEET_XML_TRUNCATED)

        patched = patcher.postprocess_sheet_xlsx(
            saved_xlsx,
            source_fods=FODS_MINIMAL,
            source_xlsx_bytes=source_xlsx
        )

        with zipfile.ZipFile(io.BytesIO(patched), "r") as z:
            out_xml = z.read("xl/worksheets/sheet1.xml").decode("utf-8")

        # Must have hidden column up to 16384
        self.assertIn('max="16384"', out_xml)
        self.assertIn('min="27"', out_xml)
        self.assertIn('hidden="true"', out_xml)

        # Must have rows 35-38 inserted in order
        self.assertIn('r="35"', out_xml)
        self.assertIn('r="36"', out_xml)
        self.assertIn('r="37"', out_xml)
        self.assertIn('r="38"', out_xml)

        # Ensure row 34 appears before 35, and 38 before 39
        idx_34 = out_xml.find('r="34"')
        idx_35 = out_xml.find('r="35"')
        idx_38 = out_xml.find('r="38"')
        idx_39 = out_xml.find('r="39"')
        self.assertTrue(idx_34 < idx_35 < idx_38 < idx_39)


if __name__ == "__main__":
    unittest.main()
