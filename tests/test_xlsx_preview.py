import importlib.util
import tempfile
import unittest
import zipfile
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "apps" / "sheet" / "xlsx_preview.py"
SPEC = importlib.util.spec_from_file_location("vno_xlsx_preview_test", MODULE_PATH)
XLSX_PREVIEW = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(XLSX_PREVIEW)


def _write_workbook(path: Path, *, sheet_target="worksheets/sheet2.xml"):
    entries = {
        "xl/workbook.xml": """<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="1"/></bookViews><sheets><sheet name="Hidden" sheetId="1" r:id="rId1"/><sheet name="Hoạt động" sheetId="2" r:id="rId2"/></sheets></workbook>""",
        "xl/_rels/workbook.xml.rels": f"""<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="worksheet" Target="{sheet_target}"/><Relationship Id="rId3" Type="sharedStrings" Target="sharedStrings.xml"/></Relationships>""",
        "xl/sharedStrings.xml": """<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Xin chào</t></si><si><r><t>nhiều </t></r><r><t>đoạn</t></r></si></sst>""",
        "xl/worksheets/sheet2.xml": """<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:C42"/><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>văn bản</t></is></c><c r="C1"><f>SUM(A2:A3)</f><v>12</v></c></row><row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2" t="b"><v>1</v></c></row><row r="42"><c r="C42"><v>99</v></c></row></sheetData></worksheet>""",
        "xl/worksheets/sheet1.xml": """<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:A1"/><sheetData/></worksheet>""",
    }
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, content in entries.items():
            archive.writestr(name, content)


class XlsxPreviewTests(unittest.TestCase):
    def test_active_sheet_shared_and_inline_strings_cached_formula_and_dimensions(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "preview.xlsx"
            _write_workbook(source)

            preview = XLSX_PREVIEW.parse_xlsx_preview(source, max_rows=40, max_cols=20)

            self.assertEqual(preview["active_sheet_name"], "Hoạt động")
            self.assertEqual(preview["sheet"], 1)
            self.assertEqual(preview["sheets"][0]["dimensions_known"], False)
            self.assertEqual((preview["sheets"][1]["rows"], preview["sheets"][1]["cols"]), (42, 3))
            self.assertEqual(preview["window"]["values"], [["Xin chào", "văn bản", 12], ["nhiều đoạn", True, ""]] + [[""] * 3 for _ in range(38)])
            self.assertEqual(preview["window"]["formulas"][0], ["", "", "=SUM(A2:A3)"])
            self.assertEqual(preview["window"]["strings"][1], ["nhiều đoạn", "TRUE", ""])
            self.assertEqual((preview["rows"], preview["cols"]), (40, 3))

    def test_active_sheet_viewport_is_bounded_and_dimension_is_read_before_rows(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "preview.xlsx"
            _write_workbook(source)

            preview = XLSX_PREVIEW.parse_xlsx_preview(source, max_rows=1, max_cols=2)

            self.assertEqual(len(preview["window"]["values"]), 1)
            self.assertEqual(len(preview["window"]["values"][0]), 2)
            self.assertEqual(preview["sheets"][1]["rows"], 42)
            self.assertEqual(preview["sheets"][1]["cols"], 3)

    def test_rejects_relationship_that_escapes_the_xlsx_package(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "preview.xlsx"
            _write_workbook(source, sheet_target="../../outside.xml")

            with self.assertRaisesRegex(ValueError, "escapes"):
                XLSX_PREVIEW.parse_xlsx_preview(source)


if __name__ == "__main__":
    unittest.main()
