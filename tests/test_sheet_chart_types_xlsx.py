import io
import re
import unittest
import zipfile

from adapters.libreoffice.common import ooxml_zip_patch as patcher


def _xlsx(chart_xml: str) -> bytes:
    entries = {
        "[Content_Types].xml": '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
        "xl/workbook.xml": '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>',
        "xl/_rels/workbook.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
        "xl/worksheets/sheet1.xml": '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData/><drawing r:id="rId1"/></worksheet>',
        "xl/worksheets/_rels/sheet1.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="../drawings/drawing1.xml"/></Relationships>',
        "xl/drawings/drawing1.xml": '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:graphicFrame><a:graphic><a:graphicData><c:chart r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame></xdr:wsDr>',
        "xl/drawings/_rels/drawing1.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="../charts/chart1.xml"/></Relationships>',
        "xl/charts/chart1.xml": chart_xml,
    }
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as package:
        for name, value in entries.items():
            package.writestr(name, value)
    return output.getvalue()


def _series(index: int, column: str) -> str:
    return (
        f'<c:ser><c:idx val="{index}"/><c:order val="{index}"/>'
        f'<c:tx><c:strRef><c:f>Data!${column}$1</c:f></c:strRef></c:tx>'
        '<c:cat><c:strRef><c:f>Data!$A$2:$A$4</c:f><c:strCache><c:ptCount val="3"/></c:strCache></c:strRef></c:cat>'
        f'<c:val><c:numRef><c:f>Data!${column}$2:${column}$4</c:f><c:numCache><c:ptCount val="3"/>'
        '<c:pt idx="0"><c:v>10</c:v></c:pt><c:pt idx="1"><c:v>20</c:v></c:pt><c:pt idx="2"><c:v>30</c:v></c:pt>'
        '</c:numCache></c:numRef></c:val></c:ser>'
    )


BASE_CHART = (
    '<?xml version="1.0" encoding="UTF-8"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">'
    '<c:chart><c:plotArea><c:barChart><c:barDir val="col"/><c:grouping val="clustered"/>'
    + _series(0, "B") + _series(1, "C") + _series(2, "D")
    + '<c:dLbls><c:showVal val="0"/></c:dLbls><c:axId val="1"/><c:axId val="2"/></c:barChart></c:plotArea></c:chart></c:chartSpace>'
)


def _fods(chart_type: str, *, labels=False, trend=False, switched=False) -> str:
    attrs = [f'vno:chart-type="{chart_type}"']
    if labels:
        attrs.append('vno:data-labels="true"')
    if trend:
        attrs.append('vno:trendline="true"')
    if switched:
        attrs.append('vno:switch-rows-columns="true"')
    return (
        '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
        'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" '
        'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" '
        'xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0" '
        'xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0"><office:body><office:spreadsheet>'
        f'<table:table table:name="Data"><table:shapes><draw:frame {" ".join(attrs)}><draw:object>'
        '<chart:chart chart:class="chart:bar"><chart:series/></chart:chart>'
        '</draw:object></draw:frame></table:shapes></table:table></office:spreadsheet></office:body></office:document>'
    )


class SheetChartTypesXlsxTests(unittest.TestCase):
    def _patched_chart(self, chart_type: str, *, labels=False, trend=False) -> str:
        package = _xlsx(BASE_CHART)
        replacements = {}
        patcher._apply_sheet_chart_features_from_fods(package, _fods(chart_type, labels=labels, trend=trend), replacements)
        self.assertIn("xl/charts/chart1.xml", replacements)
        return replacements["xl/charts/chart1.xml"]

    def test_bar_and_stacked_chart_types(self):
        expected = {
            "bar-horizontal": ('<c:barDir val="bar"/>', '<c:grouping val="clustered"/>'),
            "column-stacked": ('<c:barDir val="col"/>', '<c:grouping val="stacked"/>'),
            "column-stacked-100": ('<c:barDir val="col"/>', '<c:grouping val="percentStacked"/>'),
        }
        for chart_type, markers in expected.items():
            with self.subTest(chart_type=chart_type):
                xml = self._patched_chart(chart_type)
                self.assertTrue(all(marker in xml for marker in markers), xml)
                self.assertEqual(xml.count("<c:ser>"), 3)

    def test_scatter_combo_radar_bubble_are_native_and_keep_series_inputs(self):
        expected = {"scatter": "scatterChart", "combo": "lineChart", "radar": "radarChart", "bubble": "bubbleChart"}
        for chart_type, marker in expected.items():
            with self.subTest(chart_type=chart_type):
                xml = self._patched_chart(chart_type)
                self.assertIn(f"<c:{marker}", xml)
                if chart_type == "combo":
                    self.assertIn("<c:barChart", xml)
                    self.assertEqual(xml.count("<c:ser>"), 3)
                elif chart_type in {"scatter", "bubble"}:
                    self.assertIn("<c:xVal>", xml)
                    self.assertIn("<c:yVal>", xml)

    def test_combo_chart_keeps_line_series_on_secondary_value_axis(self):
        xml = self._patched_chart("combo")
        self.assertEqual(xml.count("<c:barChart"), 1)
        self.assertEqual(xml.count("<c:lineChart"), 1)
        self.assertIn('<c:axId val="3"/><c:axId val="4"/>', xml)
        secondary_axis = re.search(r"<c:valAx>.*?<c:axId val=\"4\"/>.*?</c:valAx>", xml, re.DOTALL)
        self.assertIsNotNone(secondary_axis, xml)
        self.assertIn('<c:crosses val="max"/>', secondary_axis.group(0))

    def test_data_labels_and_trendline_are_real_chart_elements(self):
        xml = self._patched_chart("combo", labels=True, trend=True)
        self.assertIn('<c:showVal val="1"/>', xml)
        self.assertIn('<c:trendlineType val="linear"/>', xml)

    def test_open_overlay_recovers_type_labels_trendline_and_orientation(self):
        original = _xlsx(self._patched_chart("column-stacked-100", labels=True, trend=True))
        converted_fods = _fods("bar").replace(' vno:chart-type="bar"', "")
        overlaid = patcher.overlay_sheet_chart_metadata_to_fods(original, converted_fods)
        self.assertIn('vno:chart-type="column-stacked-100"', overlaid)
        self.assertIn('vno:data-labels="true"', overlaid)
        self.assertIn('vno:trendline="true"', overlaid)

class ScatterMarkerNormalizationTests(unittest.TestCase):
    def test_libreoffice_line_scatter_becomes_marker_only_scatter(self):
        import io, zipfile
        from adapters.libreoffice.common import ooxml_zip_patch
        chart = ('<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:chart><c:plotArea>'
                 '<c:scatterChart><c:scatterStyle val="line"/><c:varyColors val="0"/><c:ser><c:idx val="0"/><c:order val="0"/>'
                 '<c:spPr><a:solidFill><a:srgbClr val="99CCFF"/></a:solidFill><a:ln w="0"><a:solidFill><a:srgbClr val="99CCFF"/></a:solidFill></a:ln></c:spPr>'
                 '<c:marker><c:symbol val="none"/></c:marker></c:ser></c:scatterChart></c:plotArea></c:chart></c:chartSpace>')
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as package:
            package.writestr("xl/charts/chart1.xml", chart)
        replacements = {}
        ooxml_zip_patch._normalize_scatter_chart_markers(buffer.getvalue(), replacements)
        updated = replacements["xl/charts/chart1.xml"]
        self.assertIn('<c:scatterStyle val="lineMarker"/>', updated)
        self.assertIn('<c:symbol val="circle"/>', updated)
        self.assertIn('<a:ln w="19050"><a:noFill/></a:ln>', updated)
        self.assertNotIn('<c:symbol val="none"/>', updated)
        untouched = {}
        ooxml_zip_patch._normalize_scatter_chart_markers(buffer.getvalue().replace(b"x", b"x"), untouched)

if __name__ == "__main__":
    unittest.main()
