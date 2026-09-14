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


class RowHeightRestore(unittest.TestCase):
    def test_custom_height_flag_is_not_overwritten(self):
        sheet = '<worksheet><sheetData><row r="1" ht="12.8" customHeight="true"><c r="A1"/></row><row r="2"><c r="A2"/></row></sheetData></worksheet>'
        out = patcher._restore_row_heights(sheet, {1: 4.79, 2: 1.0})
        self.assertIn('<row r="1" ht="135.78" customHeight="true">', out)
        self.assertIn('<row r="2" ht="28.35" customHeight="1">', out)


if __name__ == "__main__":
    unittest.main()
