import unittest

from adapters.libreoffice.common import ooxml_zip_patch as p


class SheetPrintOptionsTest(unittest.TestCase):
    def test_parse_sheet_xml(self):
        xml = (
            '<worksheet><printOptions headings="1" gridLines="1"/><pageMargins/>'
            '<pageSetup cellComments="atEnd" errors="NA" pageOrder="overThenDown"/></worksheet>'
        )
        self.assertEqual(
            p.parse_print_options_from_sheet_xml(xml),
            {"gridlines": True, "headings": True, "blackAndWhite": False, "draft": False, "comments": "sheetEnd", "cellErrors": "na", "pageOrder": "overThenDown"},
        )

    def test_apply_to_fods_roundtrip(self):
        fods = '<office:document><table:table table:name="S1" table:style-name="x"></table:table></office:document>'
        out = p.apply_print_options_to_fods(fods, {"S1": {"gridlines": True, "headings": False}})
        self.assertEqual(p._fods_page_print_options(out)["S1"]["gridlines"], True)

    def test_set_tag_attrs(self):
        tag = p._set_xml_tag_attrs('<pageSetup errors="displayed"/>', {"errors": "dash", "pageOrder": "overThenDown"})
        self.assertIn('errors="dash"', tag)
        self.assertIn('pageOrder="overThenDown"', tag)


if __name__ == "__main__":
    unittest.main()
