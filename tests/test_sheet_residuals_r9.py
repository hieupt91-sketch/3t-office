import importlib.util
import io
from pathlib import Path
import unittest
import zipfile


PATH = Path(__file__).parents[1] / "adapters/libreoffice/common/ooxml_zip_patch.py"
SPEC = importlib.util.spec_from_file_location("sheet_residuals_r9", PATH)
patcher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(patcher)


def package(workbook, sheet):
    out = io.BytesIO()
    rel_type = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"
    with zipfile.ZipFile(out, "w") as archive:
        archive.writestr("xl/workbook.xml", workbook)
        archive.writestr(
            "xl/_rels/workbook.xml.rels",
            f'<Relationships><Relationship Id="rId1" Type="{rel_type}" Target="worksheets/sheet1.xml"/></Relationships>',
        )
        archive.writestr("xl/worksheets/sheet1.xml", sheet)
    return out.getvalue()


class ResidualLayersR9Tests(unittest.TestCase):
    def test_numeric_entity_sheet_name_uses_shared_equivalence_key(self):
        encoded = patcher._unescape_xml("Bao cao&#x09;")
        self.assertEqual(encoded, "Bao cao\t")
        self.assertEqual(
            patcher._sheet_name_equivalence_key("Bao cao_x0009_"),
            patcher._sheet_name_equivalence_key(encoded),
        )

    def test_prefixed_workbook_sheet_restores_hidden_state(self):
        output = '<workbook><sheets><sheet name="Main" sheetId="1" r:id="rId1"/></sheets></workbook>'
        source = '<x:workbook><x:sheets><x:sheet name="Main" sheetId="1" state="hidden" r:id="rId1"/></x:sheets></x:workbook>'
        restored = patcher._restore_source_sheet_names_and_states(output, source)
        self.assertIn('state="hidden"', restored)

    def test_source_without_autofilter_drops_synthesized_database_range(self):
        workbook = '<workbook><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>'
        source = package(workbook, '<worksheet><sheetData/></worksheet>')
        fods = '<office:spreadsheet><table:database-ranges><table:database-range table:target-range-address="Data.A1:Z9"/></table:database-ranges></office:spreadsheet>'
        self.assertNotIn("database-range", patcher._overlay_autofilter_from_xlsx(source, fods))

    def test_xf_reoverlay_clears_stale_owner_and_targets_final_coordinate(self):
        workbook = '<workbook><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>'
        source = package(
            workbook,
            '<worksheet><sheetData><row r="22"><c r="F22" s="7"><v>1</v></c></row></sheetData></worksheet>',
        )
        fods = (
            '<office:document xmlns:office="urn:o" xmlns:table="urn:t" xmlns:vno="urn:v">'
            '<table:table table:name="Data"><table:table-row table:number-rows-repeated="21"/>'
            '<table:table-row><table:table-cell vno:xf="99" table:number-columns-repeated="5"/>'
            '<table:table-cell office:value-type="float" office:value="1"/></table:table-row>'
            '</table:table></office:document>'
        )
        restored = patcher.reoverlay_sheet_xf_indices(source, fods)
        cells = patcher._fods_cells_with_vno_xf(restored)
        self.assertEqual({(22, 6): 7}, cells["Data"])


if __name__ == "__main__":
    unittest.main()
