import io
import unittest
import zipfile

from adapters.libreoffice.common import ooxml_zip_patch as patcher


class SheetPivotChartXlsxTests(unittest.TestCase):
    def _package(self) -> bytes:
        entries = {
            "xl/workbook.xml": '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Pivot" sheetId="1" r:id="rId1"/></sheets></workbook>',
            "xl/_rels/workbook.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="worksheet"/></Relationships>',
            "xl/worksheets/sheet1.xml": '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><drawing r:id="rId1"/></worksheet>',
            "xl/worksheets/_rels/sheet1.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="../drawings/drawing1.xml" Type="drawing"/></Relationships>',
            "xl/drawings/drawing1.xml": '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:graphicFrame><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData><c:chart r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame></xdr:wsDr>',
            "xl/drawings/_rels/drawing1.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="../charts/chart1.xml" Type="chart"/></Relationships>',
            "xl/charts/chart1.xml": '<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:chart><c:plotArea/></c:chart></c:chartSpace>',
            "xl/pivotTables/pivotTable1.xml": '<pivotTableDefinition name="pivot-1" cacheId="1"><pivotFields/><pivotTableStyleInfo name="PivotStyleLight16"/></pivotTableDefinition>',
        }
        out = io.BytesIO()
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as package:
            for name, data in entries.items():
                package.writestr(name, data)
        return out.getvalue()

    def test_links_pivot_chart_to_existing_pivot_table(self):
        source_fods = '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0" xmlns:vno="urn:vn-office:spreadsheet:1.0"><table:table table:name="Pivot"><draw:frame vno:chart-kind="pivot" vno:pivot-id="pivot-1"><chart:chart/></draw:frame></table:table></office:document>'
        replacements = {}
        patcher._apply_pivot_chart_links_from_fods(self._package(), source_fods, replacements)
        chart_xml = replacements["xl/charts/chart1.xml"]
        pivot_xml = replacements["xl/pivotTables/pivotTable1.xml"]
        self.assertIn("<c:name>pivot-1</c:name>", chart_xml)
        self.assertIn('<c:fmtId val="0"/>', chart_xml)
        self.assertIn('<c:idx val="0"/>', chart_xml)
        self.assertIn('<chartFormat chart="0" format="0" series="0"/>', pivot_xml)

    def test_regular_chart_workbook_is_unchanged(self):
        source_fods = '<table:table xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0" table:name="Pivot"><draw:frame><chart:chart/></draw:frame></table:table>'
        replacements = {}
        patcher._apply_pivot_chart_links_from_fods(self._package(), source_fods, replacements)
        self.assertEqual(replacements, {})


if __name__ == "__main__":
    unittest.main()
