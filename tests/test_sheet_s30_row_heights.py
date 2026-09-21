"""S30a: chiều cao hàng khi mở XLSX theo đúng quy tắc Excel 2016 (đo COM 21/9, lan12/lan02/lan05):
- hàng customHeight: px = floor(ht*96/72);
- hàng tự động (không customHeight): max(sàn, cao 1 dòng của font từng ô kể cả ô rỗng có style);
  sàn = floor(ht px) nếu có ht, ngược lại StandardHeight = round(defaultRowHeight px) (zeroHeight -> font Normal);
- ô gộp nhiều hàng bị bỏ qua; ô bọc chữ có nội dung (không gộp) ghi `wrap` {coord: [h1,h2,h3,h5]} để app đo số dòng."""

from __future__ import annotations

import io
import json
import unittest
import zipfile

import main

patcher = main._ooxml_zip_patch()

WORKBOOK_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>"""

WORKBOOK_RELS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>"""

# fonts: 0 Calibri 11 (Normal), 1 Times New Roman 14 đậm, 2 Times New Roman 10, 3 Times New Roman 23
# cellXfs: 0 Normal, 1 TNR14b, 2 TNR10 bọc chữ, 3 TNR23, 4 TNR10 không bọc
STYLES_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="14"/><name val="Times New Roman"/></font>
<font><sz val="10"/><name val="Times New Roman"/></font>
<font><sz val="23"/><name val="Times New Roman"/></font>
</fonts>
<cellXfs count="5">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" applyFont="1" applyAlignment="1"><alignment wrapText="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" applyFont="1"/>
</cellXfs>
</styleSheet>"""

SHEET_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetFormatPr defaultRowHeight="15.6"/>
<sheetData>
<row r="1" ht="60.6" customHeight="1"><c r="A1" s="1" t="inlineStr"><is><t>x</t></is></c></row>
<row r="2" ht="17.4"><c r="A2" s="1"/><c r="B2" s="0" t="inlineStr"><is><t>y</t></is></c></row>
<row r="3"><c r="A3" s="4"/></row>
<row r="4" ht="13.8"><c r="A4" s="4" t="inlineStr"><is><t>z</t></is></c></row>
<row r="5"><c r="A5" s="2" t="inlineStr"><is><t>bọc chữ dài</t></is></c><c r="B5" s="2"/></row>
<row r="6"><c r="A6" s="3"/><c r="B6" s="4" t="inlineStr"><is><t>t</t></is></c></row>
<row r="7"><c r="A7" s="3"/><c r="B7" s="2" t="inlineStr"><is><t>gộp ngang bọc chữ</t></is></c></row>
</sheetData>
<mergeCells count="2"><mergeCell ref="A6:A7"/><mergeCell ref="B7:C7"/></mergeCells>
</worksheet>"""

FODS = """<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0">
<office:body><office:spreadsheet><table:table table:name="Sheet1"></table:table></office:spreadsheet></office:body></office:document>"""


def _make_xlsx(sheet_xml: str = SHEET_XML, styles_xml: str = STYLES_XML) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("xl/workbook.xml", WORKBOOK_XML.encode("utf-8"))
        z.writestr("xl/_rels/workbook.xml.rels", WORKBOOK_RELS_XML.encode("utf-8"))
        z.writestr("xl/worksheets/sheet1.xml", sheet_xml.encode("utf-8"))
        z.writestr("xl/styles.xml", styles_xml.encode("utf-8"))
    return buf.getvalue()


def _layout(xlsx: bytes) -> dict:
    out = patcher._overlay_sheet_layout_from_xlsx(xlsx, FODS)
    import re
    raw = re.search(r'vno:xlsx-layout="([^"]*)"', out).group(1)
    return json.loads(patcher._unescape_xml(raw))


class SheetS30RowHeightTests(unittest.TestCase):
    def test_table_measured_values(self):
        # Đo Excel COM: TNR 14 -> 25px, TNR 10 -> 17px tự nhiên (hàng 1 dòng bị sàn Normal 20), Calibri 11 -> 20px
        self.assertEqual(patcher._excel_single_line_height_px("Times New Roman", 14, True), 25)
        self.assertEqual(patcher._excel_single_line_height_px("Times New Roman", 10, False), 17)
        self.assertEqual(patcher._excel_single_line_height_px("Calibri", 11, False), 20)
        self.assertEqual(patcher._excel_font_line_heights("Times New Roman", 15, False), [26, 52, 78, 130])
        # lan05 E29: 5 dòng TNR 15 -> 130px; 4 dòng -> 104px (Excel đo)
        self.assertEqual(patcher.excel_auto_row_height_px([26, 52, 78, 130], 5), 130)
        self.assertEqual(patcher.excel_auto_row_height_px([26, 52, 78, 130], 4), 104)
        self.assertEqual(patcher.excel_auto_row_height_px([26, 52, 78, 130], 7), 182)

    def test_custom_row_floor_and_auto_rows_from_fonts(self):
        layout = _layout(_make_xlsx())
        rows = layout["rows"]
        self.assertEqual(rows["1"], 80)          # 60.6pt -> 80.8 -> floor 80 (lan12 hàng 1)
        self.assertEqual(rows["2"], 25.0)        # ht 17.4 không custom, A2 rỗng TNR 14 đậm -> 25 (lan12 hàng 10 / lan02 A19)
        self.assertEqual(rows["3"], 21.0)        # không ht: StandardHeight round(15.6pt) = 21 > TNR 10 (lan12 hàng 15)
        self.assertEqual(rows["4"], 18.0)        # ht 13.8 -> floor 18 > TNR 10 17 (không dùng StandardHeight)
        self.assertEqual(rows["5"], 21.0)        # bọc chữ: nền = max(21, TNR 10) ; số dòng do app đo
        self.assertEqual(layout["wrap"], {"A5": [20, 35, 52, 86]})  # B5 rỗng không có wrap; B7 gộp ngang không AutoFit
        self.assertEqual(rows["6"], 21.0)        # A6:A7 gộp dọc TNR 23 bị bỏ qua (lan02 s1 hàng 1)
        self.assertEqual(rows["7"], 21.0)
        self.assertEqual(layout["defaultRow"], 21.0)

    def test_s30b_untouched_auto_rows_restore_source_attrs(self):
        fods = FODS.replace('<table:table table:name="Sheet1">', '<table:table table:name="Sheet1" vno:auto-rows="2,3,4,9">')
        self.assertEqual(patcher.parse_auto_rows_from_fods(fods), {"Sheet1": {2, 3, 4, 9}})
        saved = ('<sheetData><row r="1" ht="80.00" customHeight="1"><c r="A1"/></row>'
                 '<row r="2" customFormat="false" ht="18.74" hidden="false" customHeight="true"><c r="A2"/></row>'
                 '<row r="3" ht="15.75" customHeight="true"/>'
                 '<row r="4" ht="15.00" customHeight="true"><c r="A4"/></row>'
                 '<row r="5" ht="21.00" customHeight="true"><c r="A5"/></row></sheetData>')
        out = patcher._restore_source_auto_row_attrs(saved, SHEET_XML, {2, 3, 4, 9})
        self.assertIn('<row r="1" ht="80.00" customHeight="1">', out)                       # hàng custom giữ nguyên
        self.assertIn('<row r="2" customFormat="false" hidden="false" ht="17.4">', out)      # ht gốc, bỏ customHeight
        self.assertIn('<row r="3"/>', out)                                                   # gốc không có ht
        self.assertIn('<row r="4" ht="13.8">', out)
        self.assertIn('<row r="5" ht="21.00" customHeight="true">', out)                     # không trong auto-rows -> giữ

    def test_s30c_default_column_width_is_excel_pixels(self):
        # lan11 s3: defaultColWidth 14.296875, Calibri 11 (MDW 7) -> Excel 100px (LibreOffice 106px)
        sheet = SHEET_XML.replace('<sheetFormatPr defaultRowHeight="15.6"/>', '<sheetFormatPr defaultColWidth="14.296875" defaultRowHeight="15.6"/>')
        self.assertEqual(_layout(_make_xlsx(sheet))["defaultCol"], 100.0)
        # Không có defaultColWidth: 8·MDW + 8 = 64px (Calibri 11); baseColWidth 10 -> 78px
        self.assertEqual(_layout(_make_xlsx())["defaultCol"], 64.0)
        sheet_base = SHEET_XML.replace('<sheetFormatPr defaultRowHeight="15.6"/>', '<sheetFormatPr baseColWidth="10" defaultRowHeight="15.6"/>')
        self.assertEqual(_layout(_make_xlsx(sheet_base))["defaultCol"], 78.0)

    def test_zero_height_sheet_uses_normal_font_floor(self):
        sheet = SHEET_XML.replace('<sheetFormatPr defaultRowHeight="15.6"/>', '<sheetFormatPr defaultRowHeight="14" zeroHeight="1"/>')
        layout = _layout(_make_xlsx(sheet))
        self.assertEqual(layout["rows"]["3"], 20.0)  # lan02 s2 hàng 33: không ht, zeroHeight -> Calibri 11 = 20
        self.assertEqual(layout["defaultRow"], 0.0)


if __name__ == "__main__":
    unittest.main()
