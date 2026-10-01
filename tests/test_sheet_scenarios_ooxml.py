import unittest
import zipfile
import io
from adapters.libreoffice.common.ooxml_zip_patch import (
    parse_scenarios_from_fods,
    build_scenarios_xml,
    apply_scenarios_to_worksheet,
    parse_scenarios_from_worksheet,
    _overlay_scenarios_from_xlsx,
)

class SheetScenariosOoxmlTests(unittest.TestCase):
    def test_parse_and_build_scenarios(self):
        fods = '''<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
            xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
            xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0">
          <office:body>
            <office:spreadsheet>
              <table:table table:name="Sheet1" vno:scenarios="[{&quot;id&quot;:&quot;s1&quot;,&quot;name&quot;:&quot;Kịch bản A&quot;,&quot;changingCells&quot;:&quot;$B$1, $B$2&quot;,&quot;values&quot;:[10,20],&quot;comment&quot;:&quot;Ghi chú A&quot;}]">
              </table:table>
            </office:spreadsheet>
          </office:body>
        </office:document>'''

        scenarios_by_sheet = parse_scenarios_from_fods(fods)
        self.assertIn("Sheet1", scenarios_by_sheet)
        self.assertEqual(len(scenarios_by_sheet["Sheet1"]), 1)
        self.assertEqual(scenarios_by_sheet["Sheet1"][0]["name"], "Kịch bản A")
        self.assertEqual(scenarios_by_sheet["Sheet1"][0]["comment"], "Ghi chú A")

        xml = build_scenarios_xml(scenarios_by_sheet["Sheet1"])
        self.assertIn('<scenarios current="0" show="0">', xml)
        self.assertIn('name="Kịch bản A"', xml)
        self.assertIn('comment="Ghi chú A"', xml)
        self.assertIn('<inputCells r="B1" val="10"/>', xml)
        self.assertIn('<inputCells r="B2" val="20"/>', xml)

        sheet_xml = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>'
        patched = apply_scenarios_to_worksheet(sheet_xml, scenarios_by_sheet["Sheet1"])
        self.assertIn('<scenarios', patched)

        parsed_back = parse_scenarios_from_worksheet(patched)
        self.assertEqual(len(parsed_back), 1)
        self.assertEqual(parsed_back[0]["name"], "Kịch bản A")
        self.assertEqual(parsed_back[0]["comment"], "Ghi chú A")
        self.assertEqual(parsed_back[0]["values"], [10, 20])

    def test_overlay_scenarios_from_xlsx(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            workbook_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
                      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                <sheets>
                    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
                </sheets>
            </workbook>'''
            rels_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
            </Relationships>'''
            sheet1_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                <sheetData/>
                <scenarios current="0" show="0">
                    <scenario name="Kịch bản 1" comment="Test comment" count="1">
                        <inputCells r="A1" val="100"/>
                    </scenario>
                </scenarios>
            </worksheet>'''
            zf.writestr("xl/workbook.xml", workbook_xml)
            zf.writestr("xl/_rels/workbook.xml.rels", rels_xml)
            zf.writestr("xl/worksheets/sheet1.xml", sheet1_xml)

        xlsx_bytes = buf.getvalue()
        target_fods = '''<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
            xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0">
          <office:body>
            <office:spreadsheet>
              <table:table table:name="Sheet1">
              </table:table>
            </office:spreadsheet>
          </office:body>
        </office:document>'''

        overlaid = _overlay_scenarios_from_xlsx(xlsx_bytes, target_fods)
        self.assertIn('vno:scenarios="', overlaid)
        self.assertIn('Kịch bản 1', overlaid)
        self.assertIn('Test comment', overlaid)


if __name__ == "__main__":
    unittest.main()
