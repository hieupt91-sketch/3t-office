"""Sheet save: Normal font + column widths in the source workbook's character unit.

Measured on KHOACUA.xlsx (Excel 2016): the Normal font is Arial 11 (max digit width 8 px)
while LibreOffice exports Arial 10 (7 px) and re-expresses widths in its own unit, so every
column rendered narrower.  The post-processor copies fonts[0] verbatim, rewrites <col width>
from the FODS cm widths with the original digit width, writes back columns LibreOffice
dropped, and keeps sheetFormatPr in its schema slot.
"""
import importlib.util
import os
import unittest


ROOT = os.path.dirname(os.path.dirname(__file__))
PATH = os.path.join(ROOT, "adapters", "libreoffice", "common", "ooxml_zip_patch.py")
SPEC = importlib.util.spec_from_file_location("sheet_colwidth", PATH)
patcher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(patcher)


class NormalFontRestore(unittest.TestCase):
    def test_first_font_is_replaced_verbatim(self):
        styles = '<styleSheet><fonts count="2"><font><sz val="10"/><name val="Arial"/><family val="2"/></font><font><b/><sz val="12"/><name val="Times New Roman"/></font></fonts></styleSheet>'
        original = '<font><sz val="11"/><color theme="1"/><name val="Arial"/><scheme val="minor"/></font>'
        out = patcher._restore_normal_font_in_styles(styles, original)
        self.assertIn('<fonts count="2">' + original + '<font><b/>', out)
        self.assertNotIn('/>/>', out)
        self.assertNotIn('<sz val="10"/>', out)


class ColumnWidthRestore(unittest.TestCase):
    def test_widths_use_original_digit_width_and_dropped_columns_come_back(self):
        sheet = ('<worksheet><dimension ref="A1:F20"/><sheetFormatPr defaultColWidth="12.625" defaultRowHeight="15"></sheetFormatPr>'
                 '<cols><col collapsed="false" customWidth="true" max="2" min="1" style="0" width="35.27"/>'
                 '<col max="3" min="3" width="34.19" bestFit="true"/></cols><sheetData/></worksheet>')
        # 10 cm in the app -> 378 px -> (377.95-5)/8 = 46.62 chars with Arial 11.
        widths = {"A": 10.0, "B": 10.0, "C": 6.694, "D": 2.249, "E": 2.8046, "F": 2.249}
        out = patcher._restore_column_widths(sheet, widths, 8.0, 12.625)
        self.assertIn('max="1" min="1" style="0" width="46.62"', out)
        self.assertIn('customWidth="1"', out)
        self.assertNotIn('bestFit', out)
        # C = 6.694 cm -> 253 px -> 31.00 chars
        self.assertIn('max="3" min="3" width="31.00"', out)
        # D (85 px -> 10.00 chars) was dropped by LibreOffice and must be written back...
        self.assertIn('<col min="4" max="4" width="10.00" customWidth="1"/>', out)
        # ...but E equals the workbook default (12.625 chars = 106 px = 2.8046 cm) and stays implicit.
        self.assertNotIn('min="5"', out)
        self.assertIn('<col min="6" max="6" width="10.00" customWidth="1"/>', out)
        cols = out.split("<cols>")[1].split("</cols>")[0]
        self.assertEqual([int(x) for x in __import__("re").findall(r'min="(\d+)"', cols)], [1, 2, 3, 4, 6])


    def test_s11_source_default_columns_stay_implicit(self):
        """Đo vòng 5 (19/9, 271 cột / 9 file): cột không có <col> trong file gốc (Excel: 64px với
        Calibri 11) bị LibreOffice ghi width="8.43" = 59px vì thuộc tính width đã gồm lề 5px."""
        lo_sheet = ('<worksheet><dimension ref="A1:D9"/><sheetFormatPr defaultColWidth="11.53515625" defaultRowHeight="14.5"></sheetFormatPr><cols>'
                    '<col collapsed="false" customWidth="1" hidden="false" outlineLevel="0" max="1" min="1" style="0" width="8.43"/>'
                    '<col collapsed="false" customWidth="1" hidden="false" outlineLevel="0" max="2" min="2" style="0" width="47.57"/>'
                    '<col collapsed="false" customWidth="1" hidden="false" outlineLevel="0" max="3" min="3" style="0" width="8.43"/>'
                    '<col collapsed="false" customWidth="1" hidden="true" outlineLevel="0" max="4" min="4" style="0" width="8.43"/>'
                    '</cols><sheetData/></worksheet>')
        source_sheet = '<worksheet><cols><col min="2" max="2" width="47.54296875" customWidth="1"/></cols><sheetData/></worksheet>'
        # 64px = 1.6933cm -> chars_for = 8.43; B 338px = 8.9429cm -> 47.57
        widths = {"A": 1.6933, "B": 8.9429, "C": 1.6933, "D": 1.6933}
        explicit = patcher._source_columns_with_explicit_width(source_sheet)
        self.assertEqual(explicit, {2})
        default_chars = patcher._unchanged_default_column_chars({}, 7.0)
        self.assertAlmostEqual(default_chars, 8.43, places=2)
        out = patcher._restore_column_widths(lo_sheet, widths, 7.0, None, source_explicit_cols=explicit, default_display_chars=default_chars)
        cols = out.split("<cols>")[1].split("</cols>")[0]
        # A, C: cột mặc định của file gốc, app không đổi -> không ghi <col>
        self.assertNotIn('min="1"', cols); self.assertNotIn('min="3"', cols)
        # B: có width trong file gốc -> ghi lại theo app
        self.assertIn('max="2" min="2" style="0" width="47.57"', cols)
        # D: cột ẩn giữ <col hidden> nhưng không có width
        self.assertIn('hidden="true"', cols); self.assertNotIn('min="4" style="0" width', cols)
        # Cột mặc định bị app đổi (C rộng 100px = 2.6458cm -> 13.57 chars) thì vẫn ghi
        out2 = patcher._restore_column_widths(lo_sheet, {**widths, "C": 2.6458}, 7.0, None, source_explicit_cols=explicit, default_display_chars=default_chars)
        self.assertIn('max="3" min="3" style="0" width="13.57"', out2)
        # baseColWidth=10 (lan01/lan28): mặc định = 10 + 3/7 = 10.43; app trả 10.57 -> vẫn là mặc định
        self.assertAlmostEqual(patcher._unchanged_default_column_chars({"baseColWidth": 10}, 7.0), 10.4286, places=3)
        # Calibri 12 (MDW 8): mặc định 8.375, app trả 8.00 (lan21) -> vẫn là mặc định
        self.assertAlmostEqual(patcher._unchanged_default_column_chars({}, 8.0), 8.375, places=3)


class SheetFormatPrRestore(unittest.TestCase):
    def test_long_form_element_is_edited_in_place(self):
        sheet = '<worksheet><sheetPr><tabColor rgb="FF00FF00"/></sheetPr><dimension ref="A1:B2"/><sheetViews/><sheetFormatPr defaultColWidth="11.53" defaultRowHeight="12.8" customHeight="false"></sheetFormatPr><cols/><sheetData/></worksheet>'
        out = patcher._restore_sheet_format_pr(sheet, {"defaultColWidth": 12.625, "defaultRowHeight": 15.0, "customHeight": "1"})
        self.assertEqual(out.count("<sheetFormatPr"), 1)
        self.assertIn('<sheetFormatPr defaultColWidth="12.625" defaultRowHeight="15.0" customHeight="1"/>', out)

    def test_missing_element_is_inserted_before_cols(self):
        sheet = '<worksheet><sheetPr/><dimension ref="A1:B2"/><sheetViews/><cols/><sheetData/></worksheet>'
        out = patcher._restore_sheet_format_pr(sheet, {"defaultRowHeight": 15.0})
        self.assertIn('<sheetViews/><sheetFormatPr defaultRowHeight="15.0"/><cols/>', out)

    def test_s11_libreoffice_default_col_width_is_dropped_when_source_has_none(self):
        sheet = '<worksheet><sheetFormatPr defaultColWidth="11.53515625" defaultRowHeight="12.8" customHeight="false"></sheetFormatPr><cols/><sheetData/></worksheet>'
        # File gốc không có sheetFormatPr (lan21) -> bỏ defaultColWidth của LibreOffice
        out = patcher._restore_sheet_format_pr(sheet, {})
        self.assertIn('<sheetFormatPr defaultRowHeight="12.8" customHeight="false"/>', out)
        # File gốc chỉ có baseColWidth="10" (lan01) -> ghi baseColWidth nguyên, không có defaultColWidth
        out = patcher._restore_sheet_format_pr(sheet, {"baseColWidth": 10, "defaultRowHeight": 15.0})
        self.assertIn('defaultRowHeight="15.0"', out); self.assertIn('baseColWidth="10"', out); self.assertNotIn("defaultColWidth", out)
        # Chèn mới khi thiếu: bắt buộc có defaultRowHeight
        out = patcher._restore_sheet_format_pr('<worksheet><cols/><sheetData/></worksheet>', {"baseColWidth": 10})
        self.assertIn('<sheetFormatPr baseColWidth="10" defaultRowHeight="15"/><cols/>', out)

    def test_extract_keeps_sheets_without_default_col_width(self):
        import io, zipfile
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("xl/workbook.xml", '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="S1" sheetId="1" r:id="rId1"/><sheet name="S2" sheetId="2" r:id="rId2"/></sheets></workbook>')
            z.writestr("xl/_rels/workbook.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>')
            z.writestr("xl/worksheets/sheet1.xml", '<worksheet><sheetFormatPr baseColWidth="10" defaultRowHeight="14.5"/><sheetData/></worksheet>')
            z.writestr("xl/worksheets/sheet2.xml", '<worksheet><sheetData/></worksheet>')
        info = patcher._extract_sheet_format_pr_from_xlsx(buf.getvalue())
        self.assertEqual(info["S1"], {"baseColWidth": 10, "defaultRowHeight": 14.5})
        self.assertEqual(info["S2"], {})


class RowHeightRestore(unittest.TestCase):
    def test_custom_height_flag_is_not_overwritten(self):
        sheet = '<worksheet><sheetData><row r="1" ht="12.8" customHeight="true"><c r="A1"/></row><row r="2"><c r="A2"/></row></sheetData></worksheet>'
        out = patcher._restore_row_heights(sheet, {1: 4.79, 2: 1.0})
        self.assertIn('<row r="1" ht="135.78" customHeight="true">', out)
        self.assertIn('<row r="2" ht="28.35" customHeight="1">', out)


if __name__ == "__main__":
    unittest.main()
