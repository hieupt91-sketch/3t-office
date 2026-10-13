from __future__ import annotations

import html
import io
import json
import unittest
import zipfile

from adapters.libreoffice.common import ooxml_zip_patch as patcher


WORKBOOK = (
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>'
)
RELS = (
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
    'Target="worksheets/sheet1.xml"/></Relationships>'
)
SHEET = (
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    '<sheetData><row r="1"><c r="A1"><v>1</v></c></row></sheetData><pageMargins left="0.7" right="0.7"/>'
    '</worksheet>'
)
STYLES = (
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    '<fonts count="1"><font/></fonts><fills count="1"><fill/></fills><borders count="1"><border/></borders>'
    '<cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf/></cellXfs>'
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0"/></cellStyles><tableStyles count="0"/>'
    '</styleSheet>'
)


def make_xlsx() -> bytes:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as package:
        package.writestr("xl/workbook.xml", WORKBOOK)
        package.writestr("xl/_rels/workbook.xml.rels", RELS)
        package.writestr("xl/worksheets/sheet1.xml", SHEET)
        package.writestr("xl/styles.xml", STYLES)
    return output.getvalue()


def rules():
    rng = {"start": {"c": "A", "r": 1}, "end": {"c": "A", "r": 10}}
    return [
        {"id": "greater", "range": rng, "type": "greaterThan", "value": 10, "color": "#c6efce"},
        {"id": "between", "range": rng, "type": "between", "value": 5, "value2": 9, "color": "#fff2cc"},
        {"id": "equal", "range": rng, "type": "equal", "value": 7, "color": "#ffc7ce"},
        {"id": "text", "range": rng, "type": "textContains", "text": "VN", "color": "#ffc7ce"},
        {"id": "date", "range": rng, "type": "dateOccurs", "timePeriod": "today", "color": "#fff2cc"},
        {"id": "duplicate", "range": rng, "type": "duplicate", "color": "#ffc7ce"},
        {"id": "top", "range": rng, "type": "top", "rank": 3, "color": "#c6efce"},
        {"id": "bottom", "range": rng, "type": "bottom", "rank": 2, "color": "#ffc7ce"},
        {"id": "above", "range": rng, "type": "aboveAverage", "color": "#c6efce"},
        {"id": "below", "range": rng, "type": "belowAverage", "color": "#ffc7ce"},
        {"id": "bar", "range": rng, "type": "dataBar", "color": "#638ec6", "showValue": True},
        {"id": "scale2", "range": rng, "type": "colorScale2", "colors": ["#f8696b", "#63be7b"]},
        {"id": "scale3", "range": rng, "type": "colorScale3", "colors": ["#f8696b", "#ffeb84", "#63be7b"]},
        {"id": "icons", "range": rng, "type": "iconSet", "iconSet": "3TrafficLights1", "reverse": True},
        {"id": "formula", "range": rng, "type": "formula", "formula": "=A1>25", "color": "#c6efce"},
    ]


class SheetConditionalFormattingXlsxTests(unittest.TestCase):
    def test_full_rule_set_writes_native_ooxml_and_round_trips(self):
        payload = html.escape(json.dumps(rules(), ensure_ascii=False, separators=(",", ":")), quote=True)
        fods = (
            '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
            'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" '
            f'xmlns:vno="{patcher.SHEET_VNO_NS}"><office:body><office:spreadsheet>'
            f'<table:table table:name="Sheet1" vno:conditional-formatting="{payload}"><table:table-row/></table:table>'
            '</office:spreadsheet></office:body></office:document>'
        )
        source = make_xlsx()
        replacements = {}
        patcher.apply_conditional_formatting_from_fods(source, fods, replacements)
        patched = patcher.patch_ooxml_zip(source, replacements)
        sheet = patcher.read_zip_entry(patched, "xl/worksheets/sheet1.xml").decode()
        styles = patcher.read_zip_entry(patched, "xl/styles.xml").decode()

        self.assertEqual(sheet.count("<conditionalFormatting "), len(rules()))
        self.assertIn('<cfRule type="cellIs" dxfId="0" priority="1" operator="greaterThan">', sheet)
        self.assertIn('<cfRule type="top10"', sheet)
        self.assertIn('rank="2" bottom="1"', sheet)
        self.assertIn('<cfRule type="dataBar"', sheet)
        self.assertIn('<cfRule type="colorScale"', sheet)
        self.assertIn('<cfRule type="iconSet"', sheet)
        self.assertIn('<cfRule type="expression"', sheet)
        self.assertLess(sheet.index("<conditionalFormatting"), sheet.index("<pageMargins"))
        self.assertIn('<dxfs count="3">', styles)

        parsed = patcher.parse_conditional_formatting_from_xlsx(patched)["Sheet1"]
        self.assertEqual([item["type"] for item in parsed], [item["type"] for item in rules()])
        self.assertEqual(parsed[7]["rank"], 2)
        self.assertEqual(parsed[13]["iconSet"], "3TrafficLights1")
        self.assertTrue(parsed[13]["reverse"])
        self.assertEqual(parsed[14]["formula"], "=A1>25")

    def test_open_overlay_adds_metadata_without_rewriting_sheet_xml(self):
        source = make_xlsx()
        fods = (
            '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
            'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"><office:body><office:spreadsheet>'
            '<table:table table:name="Sheet1"><table:table-row/></table:table>'
            '</office:spreadsheet></office:body></office:document>'
        )
        # First create a package containing native rules, then exercise the open overlay.
        metadata = html.escape(json.dumps(rules()[:2], separators=(",", ":")), quote=True)
        authored = fods.replace('<table:table table:name="Sheet1"', f'<table:table table:name="Sheet1" xmlns:vno="{patcher.SHEET_VNO_NS}" vno:conditional-formatting="{metadata}"')
        replacements = {}
        patcher.apply_conditional_formatting_from_fods(source, authored, replacements)
        native = patcher.patch_ooxml_zip(source, replacements)
        overlaid = patcher.apply_conditional_formatting_to_fods(fods, patcher.parse_conditional_formatting_from_xlsx(native))
        self.assertIn("xmlns:vno=", overlaid)
        self.assertIn("vno:conditional-formatting=", overlaid)
        restored = patcher.parse_conditional_formatting_from_fods(overlaid)["Sheet1"]
        self.assertEqual([item["type"] for item in restored], ["greaterThan", "between"])


if __name__ == "__main__":
    unittest.main()
