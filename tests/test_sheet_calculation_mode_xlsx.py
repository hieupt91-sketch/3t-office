"""FIX-S17 calculation-mode XLSX round-trip tests."""

from __future__ import annotations

import io
import unittest
import zipfile

from adapters.libreoffice.common.ooxml_zip_patch import (
    apply_calculation_mode_to_fods,
    apply_calculation_mode_to_workbook,
    parse_calculation_mode_from_fods,
    parse_calculation_mode_from_workbook,
    postprocess_sheet_xlsx,
)


class SheetCalculationModeXlsxTests(unittest.TestCase):
    def test_workbook_mode_round_trip_preserves_other_calc_pr_flags(self):
        xml = '<workbook><sheets/><calcPr iterate="1" iterateCount="44" fullCalcOnLoad="1"/>'
        manual = apply_calculation_mode_to_workbook(xml, "manual")
        self.assertIn('<calcPr iterate="1" iterateCount="44" fullCalcOnLoad="1" calcMode="manual"/>', manual)
        self.assertEqual("manual", parse_calculation_mode_from_workbook(manual))
        automatic = apply_calculation_mode_to_workbook(manual, "automatic")
        self.assertIn('calcMode="auto"', automatic)
        self.assertEqual("auto", parse_calculation_mode_from_workbook(automatic))

    def test_unknown_mode_is_a_no_op(self):
        xml = '<workbook><sheets/><calcPr iterate="1"/></workbook>'
        self.assertEqual(xml, apply_calculation_mode_to_workbook(xml, None))
        self.assertIsNone(parse_calculation_mode_from_workbook(xml))

    def test_fods_metadata_survives_native_xlsx_postprocess_and_open_overlay(self):
        source = b"""<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0"><office:body><office:spreadsheet vno:calculation-mode="manual"/></office:body></office:document>"""
        fods = apply_calculation_mode_to_fods(source.decode(), "manual")
        self.assertEqual("manual", parse_calculation_mode_from_fods(fods))
        archive = io.BytesIO()
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as package:
            package.writestr("xl/workbook.xml", '<workbook><sheets/><calcPr iterate="1"/></workbook>')
        saved = postprocess_sheet_xlsx(archive.getvalue(), source_fods=fods)
        with zipfile.ZipFile(io.BytesIO(saved)) as package:
            workbook = package.read("xl/workbook.xml").decode()
        self.assertIn('<calcPr iterate="1" calcMode="manual"/>', workbook)
        opened = apply_calculation_mode_to_fods('<office:spreadsheet/>', parse_calculation_mode_from_workbook(workbook))
        self.assertEqual("manual", parse_calculation_mode_from_fods(opened))


if __name__ == "__main__":
    unittest.main()
