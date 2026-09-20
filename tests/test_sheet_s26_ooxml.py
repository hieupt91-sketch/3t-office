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
