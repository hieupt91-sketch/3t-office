import io
import unittest
import zipfile
from unittest import mock

from adapters.libreoffice.common import ooxml_zip_patch as patcher


class SheetChartOverlayIndexTests(unittest.TestCase):
    def test_chart_and_pivot_helpers_share_worksheet_drawing_parse(self):
        entries = {
            "xl/workbook.xml": '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>',
            "xl/_rels/workbook.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
            "xl/worksheets/sheet1.xml": '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><drawing r:id="rId1"/></worksheet>',
            "xl/worksheets/_rels/sheet1.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="../drawings/drawing1.xml"/></Relationships>',
            "xl/drawings/drawing1.xml": '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:row>0</xdr:row></xdr:from><xdr:to><xdr:col>5</xdr:col><xdr:row>8</xdr:row></xdr:to><xdr:graphicFrame><c:chart r:id="rId2"/></xdr:graphicFrame></xdr:twoCellAnchor></xdr:wsDr>',
            "xl/drawings/_rels/drawing1.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Target="../charts/chart1.xml"/></Relationships>',
            "xl/charts/chart1.xml": '<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:pivotSource><c:name>PivotTable1</c:name></c:pivotSource></c:chartSpace>',
        }
        output = io.BytesIO()
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as package:
            for name, value in entries.items():
                package.writestr(name, value)
        workbook = output.getvalue()
        worksheet_xml = entries["xl/worksheets/sheet1.xml"].encode()
        original_fromstring = patcher.ET.fromstring
        worksheet_parses = []

        def record_parse(xml, *args, **kwargs):
            if xml == worksheet_xml:
                worksheet_parses.append(xml)
            return original_fromstring(xml, *args, **kwargs)

        with mock.patch.dict("os.environ", {"VNO_XLSX_SHARED_DRAWING_INDEX": "1"}), mock.patch.object(patcher.ET, "fromstring", side_effect=record_parse):
            chart_parts = patcher._xlsx_chart_parts_by_sheet(workbook)
            anchors = patcher._xlsx_chart_anchors_by_sheet(workbook)
            pivots = patcher._pivot_chart_parts_by_sheet(workbook)

        self.assertEqual(chart_parts, {"Data": ["xl/charts/chart1.xml"]})
        self.assertEqual(len(anchors["Data"]), 1)
        self.assertEqual(pivots, {"Data": ["PivotTable1"]})
        self.assertEqual(len(worksheet_parses), 1, "worksheet drawing links should be parsed once per workbook")


if __name__ == "__main__":
    unittest.main()
