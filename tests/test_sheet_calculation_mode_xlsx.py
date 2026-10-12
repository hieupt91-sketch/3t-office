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
    overlay_sheet_xlsx_fods_p1,
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

    def test_text_box_becomes_drawing_shape_and_round_trips_through_open_overlay(self):
        workbook = '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>'
        rels = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
        sheet = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData/></worksheet>'
        types = '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>'
        archive = io.BytesIO()
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as package:
            package.writestr("[Content_Types].xml", types)
            package.writestr("xl/workbook.xml", workbook)
            package.writestr("xl/_rels/workbook.xml.rels", rels)
            package.writestr("xl/worksheets/sheet1.xml", sheet)
        fods = ('<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
                'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" '
                'xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0"><office:body><office:spreadsheet>'
                '<table:table table:name="Sheet1"/></office:spreadsheet></office:body></office:document>')
        fods = fods.replace('<table:table table:name="Sheet1"/>', '<table:table table:name="Sheet1"></table:table>')
        fods = fods.replace('<table:table table:name="Sheet1">', '<table:table table:name="Sheet1" vno:text-boxes="[{&quot;text&quot;:&quot;Hello &amp; world&quot;,&quot;anchor&quot;:{&quot;c&quot;:&quot;C&quot;,&quot;r&quot;:4},&quot;widthPx&quot;:240,&quot;heightPx&quot;:90}]" vno:resolved-comments="{&quot;C2&quot;:true,&quot;D2&quot;:false}">')
        saved = postprocess_sheet_xlsx(archive.getvalue(), source_fods=fods)
        with zipfile.ZipFile(io.BytesIO(saved)) as package:
            names = set(package.namelist())
            drawing_name = next(name for name in names if name.startswith("xl/drawings/drawing") and name.endswith(".xml"))
            drawing = package.read(drawing_name).decode()
            worksheet = package.read("xl/worksheets/sheet1.xml").decode()
            content_types = package.read("[Content_Types].xml").decode()
        self.assertEqual(1, drawing.count("<xdr:sp "))
        self.assertIn("Hello &amp; world", drawing)
        self.assertIn("<xdr:col>2</xdr:col>", drawing)
        self.assertIn("<xdr:row>3</xdr:row>", drawing)
        self.assertIn("<drawing r:id=", worksheet)
        self.assertIn("drawing+xml", content_types)
        self.assertIn("<vno:comment ref=\"C2\" done=\"1\"/>", worksheet)
        self.assertIn("<vno:comment ref=\"D2\" done=\"0\"/>", worksheet)
        reopened = overlay_sheet_xlsx_fods_p1(saved, fods)
        self.assertIn("vno:text-boxes=", reopened)
        self.assertIn("Hello &amp; world", reopened)
        self.assertIn("vno:resolved-comments=", reopened)


if __name__ == "__main__":
    unittest.main()
