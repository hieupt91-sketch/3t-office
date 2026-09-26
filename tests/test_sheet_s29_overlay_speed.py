# -*- coding: utf-8 -*-
"""S29: byte output of the three open overlays and optimize, locked before the scan change."""
import io
import re
import unittest
import zipfile

from adapters.libreoffice.common import ooxml_zip_patch as patcher

FODS = (
    '<office:document xmlns:office="urn:o" xmlns:table="urn:t" xmlns:text="urn:tx">'
    '<office:body><office:spreadsheet>'
    '<table:table table:name="Data">'
    '<table:table-column table:style-name="co1"/>'
    '<table:table-row table:number-rows-repeated="2">'
    '<table:table-cell table:number-columns-repeated="4" office:value-type="float" office:value="1"/>'
    '<table:table-cell office:value-type="string"><text:p>old</text:p></table:table-cell>'
    '</table:table-row>'
    '<table:table-row>'
    '<table:table-cell table:number-columns-repeated="2"/>'
    '<table:covered-table-cell table:number-columns-repeated="2"/>'
    '<table:table-cell office:value-type="string"><text:p></text:p></table:table-cell>'
    '</table:table-row>'
    '<table:table-row table:number-rows-repeated="3">'
    '<table:table-cell table:style-name="ce9"/>'
    '</table:table-row>'
    '</table:table>'
    '<table:table table:name="Other">'
    '<table:table-row><table:table-cell office:value-type="float" office:value="9"/></table:table-row>'
    '</table:table>'
    '<table:table table:name="Skip"><table:table-row><table:table-cell/></table:table-row></table:table>'
    '</office:spreadsheet></office:body></office:document>'
)

EXPECTED_OVERLAY = '<office:document xmlns:office="urn:o" xmlns:table="urn:t" xmlns:text="urn:tx" xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0"><office:body><office:spreadsheet><table:table table:name="Data" vno:xlsx-layout="{&quot;columns&quot;:{},&quot;rows&quot;:{&quot;1&quot;:20.0,&quot;3&quot;:20.0,&quot;4&quot;:20.0},&quot;defaultCol&quot;:64.0,&quot;auto&quot;:[1,3,4],&quot;defaultRow&quot;:20.0}"><table:table-column table:style-name="co1"/><table:table-row><table:table-cell office:value-type="float" office:value="1" vno:number-format="#,##0" vno:xf="1"/><table:table-cell office:value-type="float" office:value="1"/><table:table-cell office:value-type="float" office:value="1" vno:number-format="dd/mm/yyyy" vno:xf="2"/><table:table-cell office:value-type="float" office:value="1"/><table:table-cell office:value-type="string" vno:number-format="#,##0" vno:original-string="  Giữ &amp; nguyên  " vno:xf="1"><text:p>old</text:p></table:table-cell></table:table-row><table:table-row><table:table-cell table:number-columns-repeated="4" office:value-type="float" office:value="1"/><table:table-cell office:value-type="string"><text:p>old</text:p></table:table-cell></table:table-row><table:table-row><table:table-cell/><table:table-cell vno:number-format="#,##0" vno:original-string="Từ 5 bộ&#13;&#10;ck" vno:xf="1"/><table:covered-table-cell/><table:covered-table-cell/><table:table-cell office:value-type="string"><text:p></text:p></table:table-cell></table:table-row><table:table-row><table:table-cell table:style-name="ce9" vno:number-format="#,##0" vno:original-string="in&#9;line" vno:xf="1"/></table:table-row><table:table-row table:number-rows-repeated="2"><table:table-cell table:style-name="ce9"/></table:table-row></table:table><table:table table:name="Other" vno:xlsx-layout="{&quot;columns&quot;:{},&quot;rows&quot;:{&quot;1&quot;:20.0},&quot;defaultCol&quot;:64.0,&quot;auto&quot;:[1],&quot;defaultRow&quot;:20.0}"><table:table-row><table:table-cell office:value-type="float" office:value="9" vno:number-format="#,##0" vno:xf="1"/></table:table-row></table:table><table:table table:name="Skip"><table:table-row><table:table-cell/></table:table-row></table:table></office:spreadsheet></office:body></office:document>'
EXPECTED_OPT = '<office:document xmlns:office="urn:o" xmlns:table="urn:t" xmlns:text="urn:tx" xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0"><office:body><office:spreadsheet><table:table table:name="Data" vno:xlsx-layout="{&quot;columns&quot;:{},&quot;rows&quot;:{&quot;1&quot;:20.0,&quot;3&quot;:20.0,&quot;4&quot;:20.0},&quot;defaultCol&quot;:64.0,&quot;auto&quot;:[1,3,4],&quot;defaultRow&quot;:20.0}"><table:table-column table:style-name="co1"/><table:table-row><table:table-cell office:value-type="float" office:value="1" vno:number-format="#,##0" vno:xf="1"/><table:table-cell office:value-type="float" office:value="1"/><table:table-cell office:value-type="float" office:value="1" vno:number-format="dd/mm/yyyy" vno:xf="2"/><table:table-cell office:value-type="float" office:value="1"/><table:table-cell office:value-type="string" vno:number-format="#,##0" vno:original-string="  Giữ &amp; nguyên  " vno:xf="1"><text:p>old</text:p></table:table-cell></table:table-row><table:table-row><table:table-cell office:value-type="float" office:value="1" table:number-columns-repeated="4"/><table:table-cell office:value-type="string"><text:p>old</text:p></table:table-cell></table:table-row><table:table-row><table:table-cell/><table:table-cell vno:number-format="#,##0" vno:original-string="Từ 5 bộ&#13;&#10;ck" vno:xf="1"/><table:covered-table-cell/><table:covered-table-cell/><table:table-cell office:value-type="string"><text:p></text:p></table:table-cell></table:table-row><table:table-row><table:table-cell table:style-name="ce9" vno:number-format="#,##0" vno:original-string="in&#9;line" vno:xf="1"/></table:table-row><table:table-row table:number-rows-repeated="2"><table:table-cell table:style-name="ce9"/></table:table-row></table:table><table:table table:name="Other" vno:xlsx-layout="{&quot;columns&quot;:{},&quot;rows&quot;:{&quot;1&quot;:20.0},&quot;defaultCol&quot;:64.0,&quot;auto&quot;:[1],&quot;defaultRow&quot;:20.0}"><table:table-row><table:table-cell office:value-type="float" office:value="9" vno:number-format="#,##0" vno:xf="1"/></table:table-row></table:table><table:table table:name="Skip"><table:table-row><table:table-cell/></table:table-row></table:table></office:spreadsheet></office:body></office:document>'
EXPECTED_REOV = '<office:document xmlns:office="urn:o" xmlns:table="urn:t" xmlns:text="urn:tx" xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0"><office:body><office:spreadsheet><table:table table:name="Data" vno:xlsx-layout="{&quot;columns&quot;:{},&quot;rows&quot;:{&quot;1&quot;:20.0,&quot;3&quot;:20.0,&quot;4&quot;:20.0},&quot;defaultCol&quot;:64.0,&quot;auto&quot;:[1,3,4],&quot;defaultRow&quot;:20.0}"><table:table-column table:style-name="co1"/><table:table-row><table:table-cell office:value-type="float" office:value="1" vno:number-format="#,##0" vno:xf="1"/><table:table-cell office:value-type="float" office:value="1"/><table:table-cell office:value-type="float" office:value="1" vno:number-format="dd/mm/yyyy" vno:xf="2"/><table:table-cell office:value-type="float" office:value="1"/><table:table-cell office:value-type="string" vno:number-format="#,##0" vno:original-string="  Giữ &amp; nguyên  " vno:xf="1"><text:p>old</text:p></table:table-cell></table:table-row><table:table-row><table:table-cell office:value-type="float" office:value="1" table:number-columns-repeated="4"/><table:table-cell office:value-type="string"><text:p>old</text:p></table:table-cell></table:table-row><table:table-row><table:table-cell/><table:table-cell vno:number-format="#,##0" vno:original-string="Từ 5 bộ&#13;&#10;ck" vno:xf="1"/><table:covered-table-cell/><table:covered-table-cell/><table:table-cell office:value-type="string"><text:p></text:p></table:table-cell></table:table-row><table:table-row><table:table-cell table:style-name="ce9" vno:number-format="#,##0" vno:original-string="in&#9;line" vno:xf="1"/></table:table-row><table:table-row table:number-rows-repeated="2"><table:table-cell table:style-name="ce9"/></table:table-row></table:table><table:table table:name="Other" vno:xlsx-layout="{&quot;columns&quot;:{},&quot;rows&quot;:{&quot;1&quot;:20.0},&quot;defaultCol&quot;:64.0,&quot;auto&quot;:[1],&quot;defaultRow&quot;:20.0}"><table:table-row><table:table-cell office:value-type="float" office:value="9" vno:number-format="#,##0" vno:xf="1"/></table:table-row></table:table><table:table table:name="Skip"><table:table-row><table:table-cell/></table:table-row></table:table></office:spreadsheet></office:body></office:document>'


def _xlsx():
    parts = {
        "xl/workbook.xml": '<workbook xmlns:r="r"><sheets><sheet name="Data" r:id="rId1"/><sheet name="Other" r:id="rId2"/></sheets></workbook>',
        "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>',
        "xl/styles.xml": (
            '<styleSheet><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>'
            '<cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="3"/><xf numFmtId="164"/></cellXfs></styleSheet>'
        ),
        "xl/sharedStrings.xml": '<sst><si><t xml:space="preserve">  Gi\u1eef &amp; nguy\u00ean  </t></si><si><t>T\u1eeb 5 b\u1ed9&#13;&#10;ck</t></si></sst>',
        "xl/worksheets/sheet1.xml": (
            '<worksheet><sheetData>'
            '<row r="1"><c r="A1" s="1"/><c r="C1" s="2"><v>1</v></c><c r="E1" s="1" t="s"><v>0</v></c></row>'
            '<row r="3"><c r="B3" s="1" t="s"><v>1</v></c><c r="D3" s="0" t="str"><v>24 thang</v></c></row>'
            '<row r="4"><c r="A4" s="1" t="inlineStr"><is><t>in&#9;line</t></is></c></row>'
            '</sheetData></worksheet>'
        ),
        "xl/worksheets/sheet2.xml": '<worksheet><sheetData><row r="1"><c r="A1" s="1"><v>9</v></c></row></sheetData></worksheet>',
    }
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as package:
        for name, value in parts.items():
            package.writestr(name, value)
    return stream.getvalue()


def _legacy_flat(xml, names):
    cursor = 0
    while True:
        choices = [(xml.find("<" + name, cursor), name) for name in names]
        choices = [(index, name) for index, name in choices if index >= 0]
        if not choices:
            return
        start, name = min(choices)
        boundary = start + len(name) + 1
        if boundary < len(xml) and xml[boundary] not in " \t\r\n>/":
            cursor = boundary
            continue
        opening_end = xml.find(">", boundary)
        if opening_end < 0:
            return
        if xml[opening_end - 1] == "/":
            end = opening_end + 1
        else:
            close = "</" + name + ">"
            close_at = xml.find(close, opening_end + 1)
            if close_at < 0:
                return
            end = close_at + len(close)
        yield start, end
        cursor = end


class SheetS29OverlayBytesTests(unittest.TestCase):
    def test_overlay_optimize_reoverlay_bytes(self):
        xlsx = _xlsx()
        overlay = patcher.overlay_sheet_xlsx_fods(xlsx, FODS)
        self.assertEqual(overlay, EXPECTED_OVERLAY)
        optimized = patcher.optimize_fods_streaming(overlay)
        self.assertEqual(optimized, EXPECTED_OPT)
        self.assertEqual(patcher.reoverlay_sheet_xf_indices(xlsx, optimized), EXPECTED_REOV)

    def test_flat_blocks_match_legacy_scan(self):
        samples = [
            FODS,
            '<table:table-row><table:table-cell table:style-name="ce1"/><table:covered-table-cell/><table:table-cell><text:p>a</text:p></table:table-cell></table:table-row>',
            '<table:table-column table:number-columns-repeated="3"/>' * 3 + '<table:table-row><table:table-cell/></table:table-row>',
            'no tags <notatag> <table:table-cell-extra/> <table:table-cell/>',
        ]
        namesets = [
            ("table:table-cell", "table:covered-table-cell"),
            ("table:table-row",),
            ("table:table",),
            ("table:table-column", "table:table-row"),
        ]
        for sample in samples:
            for names in namesets:
                self.assertEqual(list(patcher._flat_xml_blocks(sample, names)), list(_legacy_flat(sample, names)))

    def test_unescape_and_attrs_skip_entities_without_changing_values(self):
        self.assertEqual(patcher._unescape_xml("plain"), "plain")
        self.assertEqual(patcher._unescape_xml(""), "")
        self.assertEqual(patcher._unescape_xml("&amp;lt;"), "&lt;")
        self.assertEqual(patcher._unescape_xml("&#65;&#x42;"), "AB")
        self.assertEqual(patcher._unescape_xml("a&amp;b"), "a&b")
        raw = ' r="A1" s="98" t="s" table:name="Data &amp; Co"'
        legacy = {m.group(1): patcher._unescape_xml(m.group(3)) for m in re.finditer(r'([\w:.-]+)\s*=\s*(["\'])([\s\S]*?)\2', raw)}
        self.assertEqual(patcher._xml_attrs(raw), legacy)

    def test_set_repeat_matches_legacy_first_gt(self):
        cells = [
            '<table:table-cell table:style-name="ce1"/>',
            '<table:table-cell table:number-columns-repeated="4" office:value-type="float"/>',
            '<table:table-row table:number-rows-repeated="3"><table:table-cell/></table:table-row>',
            '<table:table-cell/>',
        ]
        for cell in cells:
            for count in (1, 4):
                for attr in ("table:number-columns-repeated", "table:number-rows-repeated"):
                    legacy = re.sub(r'\s+' + re.escape(attr) + r'\s*=\s*(["\'])\d+\1', "", cell, count=1, flags=re.IGNORECASE)
                    if count > 1:
                        legacy = re.sub(r">", f' {attr}="{count}">', legacy, count=1)
                    self.assertEqual(patcher._set_repeat(cell, attr, count), legacy)

    def test_wide_row_span_count(self):
        cell = '<table:table-cell table:style-name="ce12"/>'
        row = "<table:table-row>" + (cell * 3000) + "</table:table-row>"
        spans = list(patcher._flat_xml_blocks(row, ("table:table-cell", "table:covered-table-cell")))
        self.assertEqual(len(spans), 3000)
        self.assertEqual(row[spans[0][0]:spans[0][1]], cell)
        self.assertEqual(row[spans[-1][0]:spans[-1][1]], cell)


if __name__ == "__main__":
    unittest.main()
