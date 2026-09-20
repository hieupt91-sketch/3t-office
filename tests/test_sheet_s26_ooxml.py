"""S26: metadata created by VN Sheet survives FODS -> XLSX."""

import unittest

import main


patcher = main._ooxml_zip_patch()


class SheetS26OoxmlTests(unittest.TestCase):
    def test_autofilter_replaces_libreoffice_expanded_range(self):
        xml = '<worksheet><sheetData/><autoFilter ref="A1:D13"/></worksheet>'
        self.assertEqual(
            patcher.apply_autofilter_to_worksheet(xml, "A1:D10"),
            '<worksheet><sheetData/><autoFilter ref="A1:D10"/></worksheet>',
        )

    def test_s27a_autofilter_keeps_filter_columns_and_paired_element(self):
        # lan11/lan14/lan20: <autoFilter ref=..><filterColumn/></autoFilter> bị thay thẻ mở bằng thẻ tự đóng -> dư
        # </autoFilter>, worksheet XML hỏng, Excel không mở.
        xml = ('<worksheet><sheetData/><autoFilter ref="A1:D13"><filterColumn colId="0"><filters><filter val="x"/>'
               '</filters></filterColumn></autoFilter><mergeCells/></worksheet>')
        out = patcher.apply_autofilter_to_worksheet(xml, "A1:D10")
        self.assertEqual(
            out,
            '<worksheet><sheetData/><autoFilter ref="A1:D10"><filterColumn colId="0"><filters><filter val="x"/>'
            '</filters></filterColumn></autoFilter><mergeCells/></worksheet>',
        )

    def test_s27a_database_range_with_sheet_on_both_ends(self):
        # Calc ghi 'Tên sheet'.A1:'Tên sheet'.D10; OOXML chỉ nhận A1:D10 (lan14: "A12:Sheet1.AW33632").
        fods = ('<table:database-ranges><table:database-range table:name="__Anonymous_Sheet_DB__0" '
                'table:target-range-address="\'Bảng kê\'.A12:\'Bảng kê\'.AW33632" table:display-filter-buttons="true"/>'
                '<table:database-range table:name="x" table:target-range-address="Sheet1.A1:D10"/></table:database-ranges>')
        self.assertEqual(patcher.parse_autofilter_from_fods(fods), {"Bảng kê": "A12:AW33632", "Sheet1": "A1:D10"})

    def test_print_titles_from_fods_become_defined_names(self):
        fods = '''<office:spreadsheet><table:table table:name="Doanh thu" vno:print-title-rows="1" vno:print-title-cols="A:B"></table:table><table:table table:name="Chi phí" vno:print-title-rows="" vno:print-title-cols=""></table:table></office:spreadsheet>'''
        titles = patcher.parse_print_titles_from_fods(fods)
        self.assertEqual(titles, [("Doanh thu", "1", "A:B"), ("Chi phí", "", "")])
        workbook = '<workbook><sheets><sheet name="Doanh thu"/><sheet name="Chi phí"/></sheets><calcPr/></workbook>'
        result = patcher.apply_print_titles_to_workbook(workbook, titles)
        self.assertIn('name="_xlnm.Print_Titles" localSheetId="0"', result)
        self.assertIn("'Doanh thu'!$1:$1,'Doanh thu'!$A:$B", result)


if __name__ == "__main__":
    unittest.main()
