"""S30a/S31: chiều cao hàng khi mở XLSX theo đúng quy tắc Excel 2016 (đo COM 21/9, lan12/lan02/lan05/lan11/lan08):
- hàng customHeight: px = floor((ht·20 + 1)/15) (S31d: 47.95pt -> 64, 60.6 -> 80);
- hàng tự động: BỎ QUA ht (S31e); mọi cột đều có ô — ô không ghi lấy style hàng (customFormat) / style cột / Normal (S31h);
  cao hàng = max(ΣL_i + đệm_i cho ô tường minh, L ô ngầm) với đệm = max(0, D − d) chỉ cho ô căn đáy, D = max descent ô ngầm
  (S31f); viền dưới medium/thick +1, double +2, viền trên thick/double +1 (S31i);
- ô gộp nhiều hàng bị bỏ qua; ô bọc chữ được mô phỏng ngắt dòng bằng bảng bề rộng ký tự Excel (S31c), chỉ khi thiếu bảng
  mới ghi `wrap` {coord: [h1,h2,h3,h5]} để app đo số dòng bằng DOM."""

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
        # Đo Excel COM (Normal Calibri 11, descent 4): TNR 14 đậm -> L 25 d 5 -> 25; TNR 10 -> L 17 d 3 -> 17+1 = 18 (S31f);
        # Calibri 11 -> 20; Arial 12 -> 20+1 = 21 (= h1 đo)
        self.assertEqual(patcher._excel_font_metrics("Times New Roman", 14, True), (25.0, 5.0))
        self.assertEqual(patcher._excel_font_metrics("Times New Roman", 10, False), (17.0, 3.0))
        self.assertEqual(patcher._excel_single_line_height_px("Times New Roman", 10, False), 18)
        self.assertEqual(patcher._excel_single_line_height_px("Times New Roman", 10, False, 3), 17)   # Normal Arial 10 (d 3)
        self.assertEqual(patcher._excel_single_line_height_px("Calibri", 11, False), 20)
        self.assertEqual(patcher._excel_single_line_height_px("Arial", 12, False), 21)
        self.assertEqual(patcher._excel_font_line_heights("Times New Roman", 15, False), [26, 52, 78, 130])
        self.assertEqual(patcher._excel_font_line_heights("Times New Roman", 10, False), [18, 35, 52, 86])   # 17n + 1
        self.assertEqual(patcher._excel_font_line_heights("Times New Roman", 10, False, 3), [17, 34, 51, 85])  # Normal Arial 10: 17n
        # S31g: nghiêng đổi metric — TNR 14 đậm nghiêng 26 (lan19 hàng 17)
        self.assertEqual(patcher._excel_font_line_heights("Times New Roman", 14, True, 4, True)[0], 26)
        # lan05 E29: 5 dòng TNR 15 -> 130px; 4 dòng -> 104px (Excel đo)
        self.assertEqual(patcher.excel_auto_row_height_px([26, 52, 78, 130], 5), 130)
        self.assertEqual(patcher.excel_auto_row_height_px([26, 52, 78, 130], 4), 104)
        self.assertEqual(patcher.excel_auto_row_height_px([26, 52, 78, 130], 7), 182)

    def test_s31d_custom_row_px(self):
        # Đo ảnh chụp Excel: 47.95pt -> 64, 60.6 -> 80, 37.45 -> 50, 19.8 -> 26; ngưỡng 12.7 -> 17, 12.68 -> 16, 13.46 -> 18
        for ht, px in ((47.95, 64), (60.6, 80), (37.45, 50), (19.8, 26), (12.7, 17), (12.68, 16), (13.46, 18), (13.44, 17), (15.75, 21)):
            self.assertEqual(patcher._excel_row_ht_px(ht), px, ht)

    def test_s31h_row_height_from_cells(self):
        # Normal Calibri 11 (20, 4): Arial 12 căn đáy (20, 3) -> 21; căn giữa -> 20; TNR 10 (17, 3) -> max(18, 20) = 20
        self.assertEqual(patcher._excel_row_height_from_cells([(20, 3, True)], [], (20, 4)), 21)
        self.assertEqual(patcher._excel_row_height_from_cells([(20, 3, False)], [], (20, 4)), 20)
        self.assertEqual(patcher._excel_row_height_from_cells([(17, 3, True)], [], (20, 4)), 20)
        # mọi cột style TNR 10 (không ô Normal): Arial 12 đáy -> 20, TNR 10 -> 17 (lan05 hàng 85)
        self.assertEqual(patcher._excel_row_height_from_cells([(20, 3, True)], [(17, 3)], None), 20)
        self.assertEqual(patcher._excel_row_height_from_cells([(17, 3, True)], [(17, 3)], None), 17)
        # lan11 s2 hàng 151: cột Calibri 18 (31, 6); B151 giữa 2 dòng TNR 18 đậm (60, 5); D151 đáy (30, 5) -> 60
        self.assertEqual(patcher._excel_row_height_from_cells([(60, 5, False), (30, 5, True)], [(31, 6)], None), 60)
        # lan12 s1 hàng 15: ô ngầm cột C TNR 12 (21, 4) + B15 TNR 11 (20, 4) -> 21
        self.assertEqual(patcher._excel_row_height_from_cells([(20, 4, True)], [(20, 4), (21, 4)], None), 21)
        self.assertEqual(patcher._excel_row_height_from_cells([(600, 4, True)], [], (20, 4)), 546)  # trần 409.5pt

    def test_s31c_wrap_lines_excel_rules(self):
        widths = {str(ord(c)): w for c, w in {"W": 18.625, "i": 6.1875, " ": 5.1875, "X": 14.5, "-": 6.5, "/": 6.5, "a": 8.0}.items()}
        run = {"t": "", "w": widths, "L": 26.0, "d": 4.0}
        # 9 W + " X" = 187.3 vừa 193.5; thêm 1 W -> "X" xuống dòng (khoảng trắng ở lại dòng trên)
        self.assertEqual(len(patcher._excel_wrap_lines([dict(run, t="W" * 9 + " X")], 193.5)), 1)
        self.assertEqual(len(patcher._excel_wrap_lines([dict(run, t="W" * 10 + " X")], 193.5)), 2)
        # từ dài hơn dòng ngắt theo ký tự; ngắt sau '-' ; "\n" cuối = dòng trống (S31a); dòng trống giữa
        self.assertEqual(len(patcher._excel_wrap_lines([dict(run, t="W" * 25)], 193.5)), 3)
        self.assertEqual(len(patcher._excel_wrap_lines([dict(run, t="WWWW-WWWW-WW")], 100)), 3)   # "WWWW-W" vừa, ngắt sau '-'
        self.assertEqual(len(patcher._excel_wrap_lines([dict(run, t="WWWW/WWWW/WW")], 100)), 2)   # '/' không phải điểm ngắt
        self.assertEqual(len(patcher._excel_wrap_lines([dict(run, t="aa\n")], 100)), 2)
        self.assertEqual(len(patcher._excel_wrap_lines([dict(run, t="aa\n\naa")], 100)), 3)
        self.assertIsNone(patcher._excel_wrap_lines([dict(run, t="a一")], 100))  # ký tự chưa đo -> DOM
        # S31b: font theo dòng — run 1 đậm (L 30) chứa "\n", run 2 thường (L 31): 30 + 31, đệm 0 (d 5/6 >= D 4)
        bold = {"t": "aa\n", "w": widths, "L": 30.0, "d": 5.0}
        regular = {"t": "aa", "w": widths, "L": 31.0, "d": 6.0}
        self.assertEqual(patcher._excel_wrapped_cell_extent([bold, regular], 100), (61.0, 6.0))
        self.assertEqual(patcher._excel_wrapped_row_height([bold, regular], 100, 4), 61)

    def test_s32_unprefix_spreadsheetml(self):
        xml = '<x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:sheetData><x:row r="1"><x:c r="A1"/></x:row></x:sheetData></x:worksheet>'
        out = patcher._unprefix_spreadsheetml(xml)
        self.assertIn('<row r="1"><c r="A1"/></row>', out)
        self.assertNotIn("<x:", out)

    def test_custom_row_floor_and_auto_rows_from_fonts(self):
        layout = _layout(_make_xlsx())
        rows = layout["rows"]
        self.assertEqual(rows["1"], 80)          # 60.6pt -> 80.8 -> 80 (lan12 hàng 1)
        self.assertEqual(rows["2"], 25.0)        # ht 17.4 không custom, A2 rỗng TNR 14 đậm -> 25 (lan12 hàng 10 / lan02 A19)
        self.assertEqual(rows["3"], 20.0)        # không ht: ô TNR 10 (17, d 3) căn đáy + Normal Calibri 11 -> max(18, 20) = 20
        self.assertEqual(rows["4"], 20.0)        # ht 13.8 bị bỏ qua (S31e) -> 20
        self.assertEqual(rows["5"], 35.0)        # bọc chữ TNR 10 "bọc chữ dài" trong cột 91px -> 2 dòng = 17·2 + 1 (mô phỏng S31c)
        self.assertNotIn("wrap", layout)          # mọi ô đã mô phỏng được -> không cần app đo DOM
        self.assertEqual(rows["6"], 20.0)        # A6:A7 gộp dọc TNR 23 bị bỏ qua (lan02 s1 hàng 1)
        self.assertEqual(rows["7"], 20.0)
        self.assertEqual(layout["defaultRow"], 20.0)  # không <col style>: hàng trống = Normal Calibri 11 (S31h), không phải 15.6pt

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

    def test_s31h_column_styles_define_empty_row_and_implicit_cells(self):
        # lan05: mọi cột style TNR 10 -> hàng trống 17 (không phải 15.6pt = 21 hay Normal 20); hàng có ô TNR 10 rỗng -> 17;
        # lan12 s1 hàng 15: cột C style TNR 12 (ô ngầm) -> 21 dù ô tường minh B15 chỉ TNR 11
        styles = STYLES_XML.replace('<font><sz val="10"/><name val="Times New Roman"/></font>\n<font><sz val="23"/>',
                                    '<font><sz val="10"/><name val="Times New Roman"/></font>\n<font><sz val="12"/><name val="Times New Roman"/></font>\n<font><sz val="23"/>')
        styles = styles.replace('<fonts count="4">', '<fonts count="5">').replace('<cellXfs count="5">', '<cellXfs count="6">').replace(
            '</cellXfs>', '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" applyFont="1"/>\n</cellXfs>')
        # fontId 3 giờ là TNR 12 (xf 5); fontId 4 = TNR 23 (xf 3 vẫn trỏ fontId 3 -> thành TNR 12, không dùng trong test này)
        sheet = SHEET_XML.replace('<sheetData>', '<cols><col min="1" max="2" width="10" style="4" customWidth="1"/><col min="3" max="3" width="10" style="5" customWidth="1"/><col min="4" max="16384" width="10" style="4"/></cols><sheetData>')
        layout = _layout(_make_xlsx(sheet, styles))
        self.assertEqual(layout["defaultRow"], 21.0)   # hàng trống: max(TNR 10 = 17, cột C TNR 12 = 21)
        self.assertEqual(layout["rows"]["3"], 21.0)    # A3 TNR 10 rỗng + ô ngầm cột C TNR 12 -> 21
        sheet_all_tnr10 = SHEET_XML.replace('<sheetData>', '<cols><col min="1" max="16384" width="10" style="4"/></cols><sheetData>')
        layout2 = _layout(_make_xlsx(sheet_all_tnr10))
        self.assertEqual(layout2["defaultRow"], 17.0)  # lan05: mọi cột TNR 10, không ô Normal -> 17, không đệm
        self.assertEqual(layout2["rows"]["3"], 17.0)


if __name__ == "__main__":
    unittest.main()
