from __future__ import annotations

import io
import unittest
import zipfile

import main


patcher = main._ooxml_zip_patch()


def _xlsx() -> bytes:
    workbook = """<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Audit" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">'Audit'!$1:$2,'Audit'!$A:$B</definedName></definedNames></workbook>"""
    rels = """<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>"""
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as package:
        package.writestr("xl/workbook.xml", workbook)
        package.writestr("xl/_rels/workbook.xml.rels", rels)
        package.writestr("xl/worksheets/sheet1.xml", "<worksheet><sheetData/></worksheet>")
    return output.getvalue()


class SheetPrintSetupRoundTripTests(unittest.TestCase):
    def test_open_overlay_restores_print_titles_dropped_by_soffice(self):
        fods = '<office:document xmlns:office="urn:o" xmlns:table="urn:t"><office:body><office:spreadsheet><table:table table:name="Audit"><table:table-row/></table:table></office:spreadsheet></office:body></office:document>'
        overlaid = patcher.overlay_sheet_xlsx_fods(_xlsx(), fods)
        self.assertIn('vno:print-title-rows="1:2"', overlaid)
        self.assertIn('vno:print-title-cols="A:B"', overlaid)
        self.assertIn("xmlns:vno=", overlaid)


if __name__ == "__main__":
    unittest.main()
