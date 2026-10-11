"""Sheet save: AutoFilter ranges must not become Excel Table parts.

Measured on lan11.xlsx ("Reyee" sheet, header-only AutoFilter A3:F3, one empty caption):
LibreOffice exported the named database range as xl/tables/table1.xml and Excel 2016 refused
to open the workbook.  The FODS now uses LibreOffice's anonymous range name and the
post-processor strips any AutoFilter table part that still appears.
"""
import importlib.util
import io
import os
import unittest
import zipfile


ROOT = os.path.dirname(os.path.dirname(__file__))
PATH = os.path.join(ROOT, "adapters", "libreoffice", "common", "ooxml_zip_patch.py")
SPEC = importlib.util.spec_from_file_location("sheet_autofilter_table", PATH)
patcher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(patcher)


def make_xlsx(parts):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as package:
        for name, content in parts.items():
            package.writestr(name, content)
    return stream.getvalue()


class AnonymousRangeName(unittest.TestCase):
    def test_apply_autofilter_to_fods_uses_libreoffice_anonymous_name(self):
        fods = "<office:spreadsheet></office:spreadsheet>"
        out = patcher.apply_autofilter_to_fods(fods, {"Reyee": "A3:F3", "Ruijie": "A3:CF145"})
        self.assertIn('table:name="__Anonymous_Sheet_DB__0" table:target-range-address="Reyee.A3:F3"', out)
        self.assertIn('table:name="__Anonymous_Sheet_DB__1"', out)
        self.assertNotIn("AutoFilter_", out)


class StripTableParts(unittest.TestCase):
    def test_autofilter_table_part_is_removed_with_rel_reference_and_override(self):
        parts = {
            "[Content_Types].xml": '<Types><Override PartName="/xl/worksheets/sheet2.xml" ContentType="w"/><Override PartName="/xl/tables/table1.xml" ContentType="t"/></Types>',
            "xl/worksheets/sheet2.xml": '<worksheet><sheetData/><autoFilter ref="A3:F3"/><tableParts count="1"><tablePart r:id="rId2"/></tableParts></worksheet>',
            "xl/worksheets/_rels/sheet2.xml.rels": '<Relationships><Relationship Id="rId1" Type="d" Target="../drawings/drawing1.xml"/><Relationship Id="rId2" Type="t" Target="../tables/table1.xml"/></Relationships>',
            "xl/tables/table1.xml": '<table id="1" name="AutoFilter_Reyee" displayName="AutoFilter_Reyee" ref="A3:F3"><autoFilter ref="A3:F3"/></table>',
            "xl/tables/table2.xml": '<table id="2" name="SalesTable" displayName="SalesTable" ref="A1:B9"/>',
        }
        xlsx = make_xlsx(parts)
        replacements = {}
        patcher.strip_autofilter_table_parts(xlsx, replacements)
        self.assertIsNone(replacements["xl/tables/table1.xml"])
        self.assertNotIn("xl/tables/table2.xml", replacements)
        self.assertNotIn("tables/table1.xml", replacements["xl/worksheets/_rels/sheet2.xml.rels"])
        self.assertIn("drawings/drawing1.xml", replacements["xl/worksheets/_rels/sheet2.xml.rels"])
        self.assertNotIn("tablePart", replacements["xl/worksheets/sheet2.xml"])
        self.assertIn('<autoFilter ref="A3:F3"/>', replacements["xl/worksheets/sheet2.xml"])
        self.assertNotIn("tables/table1.xml", replacements["[Content_Types].xml"])
        patched = patcher.patch_ooxml_zip(xlsx, replacements)
        with zipfile.ZipFile(io.BytesIO(patched)) as package:
            names = package.namelist()
        self.assertNotIn("xl/tables/table1.xml", names)
        self.assertIn("xl/tables/table2.xml", names)


if __name__ == "__main__":
    unittest.main()
