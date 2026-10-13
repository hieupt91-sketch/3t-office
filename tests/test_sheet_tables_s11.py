import unittest
from pathlib import Path

from adapters.libreoffice.common.ooxml_zip_patch import (
    _apply_table_metadata_from_fods,
    _overlay_autofilter_from_xlsx,
    _parse_xlsx_tables,
    parse_tables_from_fods,
)


FIXTURE = Path(__file__).parent / "fixtures" / "ton-kho-3t.xlsx"


class SheetTablesS11Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.xlsx = FIXTURE.read_bytes()

    def test_existing_table_is_overlaid_as_structured_database_range(self):
        tables = _parse_xlsx_tables(self.xlsx)
        self.assertEqual(tables["DanhSachSanPham_KV31032021-2038"][0]["name"], "productTable")
        self.assertEqual(tables["DanhSachSanPham_KV31032021-2038"][0]["ref"], "A1:Z183")
        fods = _overlay_autofilter_from_xlsx(self.xlsx, "<office:spreadsheet></office:spreadsheet>")
        self.assertIn('vno:table-name="productTable"', fods)
        self.assertIn('vno:table-style="TableStyleMedium2"', fods)
        self.assertEqual(parse_tables_from_fods(fods)["productTable"]["sheet"], "DanhSachSanPham_KV31032021-2038")
        self.assertNotIn("__Anonymous_Sheet_DB__", fods)

    def test_fods_metadata_round_trips_into_existing_table_part(self):
        fods = (
            '<table:database-range table:name="productTable" '
            'table:target-range-address="DanhSachSanPham_KV31032021-2038.A1:DanhSachSanPham_KV31032021-2038.C8" vno:table-name="productTable" '
            'vno:table-style="TableStyleDark1" vno:table-headers="false" '
            'vno:table-show-autofilter="false" vno:table-row-stripes="false"/>'
        )
        replacements = {}
        _apply_table_metadata_from_fods(self.xlsx, fods, replacements)
        table_xml = replacements["xl/tables/table1.xml"]
        self.assertIn('name="productTable"', table_xml)
        self.assertIn('displayName="productTable"', table_xml)
        self.assertIn('ref="A1:C8"', table_xml)
        self.assertIn('headerRowCount="0"', table_xml)
        self.assertNotIn("<autoFilter", table_xml)
        self.assertIn('name="TableStyleDark1"', table_xml)
        self.assertIn('showRowStripes="0"', table_xml)


if __name__ == "__main__":
    unittest.main()
