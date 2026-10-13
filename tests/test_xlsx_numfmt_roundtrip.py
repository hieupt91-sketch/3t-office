"""Unit tests for scripts/audit-0610/xlsx_numfmt_roundtrip.py (TICKET SB12)."""

from __future__ import annotations

import io
import sys
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts" / "audit-0610"))

import xlsx_numfmt_roundtrip as auditor
from adapters.libreoffice.common import ooxml_zip_patch


def make_mock_xlsx(styles_xml: str, sheet1_xml: str, sst_xml: str = "") -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(
            "xl/workbook.xml",
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>',
        )
        z.writestr(
            "xl/_rels/workbook.xml.rels",
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
            'Target="worksheets/sheet1.xml"/></Relationships>',
        )
        z.writestr("xl/styles.xml", styles_xml)
        z.writestr("xl/worksheets/sheet1.xml", sheet1_xml)
        if sst_xml:
            z.writestr("xl/sharedStrings.xml", sst_xml)
    return buf.getvalue()


class XlsxNumfmtRoundtripTests(unittest.TestCase):
    def test_excel_postprocess_maps_scalar_concat_to_legacy_compatible_function(self):
        styles = (
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<fonts count="1"><font/></fonts><fills count="1"><fill/></fills>'
            '<borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0"/></cellStyleXfs>'
            '<cellXfs count="1"><xf numFmtId="0"/></cellXfs></styleSheet>'
        )
        sheet = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetData><row r="2"><c r="H2" t="e"><f>CONCAT(B2,&quot; test&quot;)</f><v>#NAME?</v></c></row></sheetData></worksheet>'
        )
        original = make_mock_xlsx(styles, sheet)
        patched = ooxml_zip_patch.postprocess_sheet_xlsx(original, enabled=False)
        with zipfile.ZipFile(io.BytesIO(patched), "r") as archive:
            xml = archive.read("xl/worksheets/sheet1.xml").decode("utf-8")
        self.assertIn("CONCATENATE(B2,\" test\")", xml)

    def test_excel_postprocess_preserves_concat_range_semantics(self):
        self.assertEqual(
            ooxml_zip_patch._rewrite_scalar_concat_for_legacy_excel('CONCAT(A1:A3,"!")'),
            'CONCAT(A1:A3,"!")',
        )

    def test_excel_postprocess_does_not_rewrite_concat_inside_text(self):
        formula = '="CONCAT(A1) "&CONCATENATE(A1,"!")&CONCAT(A1,"x")'
        self.assertEqual(
            ooxml_zip_patch._rewrite_scalar_concat_for_legacy_excel(formula),
            '="CONCAT(A1) "&CONCATENATE(A1,"!")&CONCATENATE(A1,"x")',
        )

    def test_accounting_postprocess_writes_standard_excel_format_from_fods(self):
        styles = (
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<fonts count="1"><font/></fonts><fills count="1"><fill/></fills>'
            '<borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0"/></cellStyleXfs>'
            '<cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="0" xfId="0"/></cellXfs></styleSheet>'
        )
        sheet = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetData><row r="2"><c r="B2" s="1"><v>1234.5</v></c></row></sheetData></worksheet>'
        )
        xlsx = make_mock_xlsx(styles, sheet)
        fods = (
            '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
            'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" '
            'xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0">'
            '<table:table table:name="Sheet1"><table:table-row/><table:table-row table:number-rows-repeated="1">'
            '<table:table-cell/><table:table-cell vno:number-format="{&quot;category&quot;:&quot;accounting&quot;,&quot;currencySymbol&quot;:&quot;₫&quot;,&quot;decimals&quot;:2}"/>'
            '</table:table-row></table:table></office:document>'
        )
        replacements = {}
        ooxml_zip_patch._apply_accounting_number_formats_from_fods(xlsx, fods, replacements)
        self.assertIn("xl/styles.xml", replacements)
        self.assertIn("xl/worksheets/sheet1.xml", replacements)
        self.assertIn('_(* #,##0.00 [$₫]_)', replacements["xl/styles.xml"])
        self.assertIn('r="B2" s="2"', replacements["xl/worksheets/sheet1.xml"])

        imported_fods = fods.replace(
            '&quot;decimals&quot;:2}',
            '&quot;decimals&quot;:2,&quot;excelCode&quot;:&quot;custom-import-code&quot;}'
        )
        preserved = {}
        ooxml_zip_patch._apply_accounting_number_formats_from_fods(xlsx, imported_fods, preserved)
        self.assertEqual(preserved, {}, "Imported Accounting formats with original Excel metadata must remain untouched")

        exact = {}
        ooxml_zip_patch._apply_accounting_number_formats_from_fods(
            xlsx, imported_fods, exact, include_excel_codes=True
        )
        self.assertIn('formatCode="custom-import-code"', exact["xl/styles.xml"])
        self.assertIn('r="B2" s="2"', exact["xl/worksheets/sheet1.xml"])

    def test_parse_styles_builtin_and_custom(self):
        styles = (
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<numFmts count="2">'
            '<numFmt numFmtId="164" formatCode="[$₫-42A] #,##0"/>'
            '<numFmt numFmtId="165" formatCode="dd/mm/yyyy"/>'
            '</numFmts>'
            '<cellXfs count="4">'
            '<xf numFmtId="0"/>'
            '<xf numFmtId="3"/>'
            '<xf numFmtId="164"/>'
            '<xf numFmtId="165"/>'
            '</cellXfs></styleSheet>'
        )
        xfs = auditor.parse_styles(styles)
        self.assertEqual(len(xfs), 4)
        self.assertEqual(xfs[0], (0, "General"))
        self.assertEqual(xfs[1], (3, "#,##0"))
        self.assertEqual(xfs[2], (164, "[$₫-42A] #,##0"))
        self.assertEqual(xfs[3], (165, "dd/mm/yyyy"))

    def test_cell_type_detection(self):
        sst = '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Xin chào</t></si></sst>'
        styles = (
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<numFmts count="1"><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts>'
            '<cellXfs count="4">'
            '<xf numFmtId="0"/>'
            '<xf numFmtId="3"/>'
            '<xf numFmtId="165"/>'
            '<xf numFmtId="49"/>'
            '</cellXfs></styleSheet>'
        )
        sheet = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetData><row r="1">'
            '<c r="A1" s="1"><v>12345</v></c>'
            '<c r="B1" s="2"><v>45000</v></c>'
            '<c r="C1" s="0" t="s"><v>0</v></c>'
            '<c r="D1" s="0" t="b"><v>1</v></c>'
            '<c r="E1" s="0" t="e"><v>#N/A</v></c>'
            '<c r="F1" s="1"/>'  # empty style-only cell, must be ignored
            '</row></sheetData></worksheet>'
        )

        xfs = auditor.parse_styles(styles)
        strings = auditor.parse_shared_strings(sst)
        cells = auditor.parse_worksheet_cells(sheet, strings, xfs)

        self.assertIn("A1", cells)
        self.assertEqual(cells["A1"]["type"], "so")
        self.assertEqual(cells["A1"]["val"], 12345)
        self.assertEqual(cells["A1"]["formatCode"], "#,##0")

        self.assertIn("B1", cells)
        self.assertEqual(cells["B1"]["type"], "ngay")
        self.assertEqual(cells["B1"]["val"], 45000)
        self.assertEqual(cells["B1"]["formatCode"], "dd/mm/yyyy")

        self.assertIn("C1", cells)
        self.assertEqual(cells["C1"]["type"], "chu")
        self.assertEqual(cells["C1"]["val"], "Xin chào")

        self.assertIn("D1", cells)
        self.assertEqual(cells["D1"]["type"], "bool")
        self.assertEqual(cells["D1"]["val"], True)

        self.assertIn("E1", cells)
        self.assertEqual(cells["E1"]["type"], "loi")
        self.assertEqual(cells["E1"]["val"], "#N/A")

        self.assertNotIn("F1", cells)  # Style-only cell without value

    def test_classify_format_change(self):
        # 1. Equivalent
        cause1 = auditor.classify_format_change(
            r"_(* #,##0_);_(* (#,##0);_(* &quot;-&quot;??_);_(@_)",
            r"_(* #,##0_);_(* \(#,##0\);_(* '-'??_);_(@_)",
            "so", "so",
        )
        self.assertEqual(cause1, "ma bi viet lai nhung tuong duong")

        # 2. Date to number
        cause2 = auditor.classify_format_change("dd/mm/yyyy", "0.00", "ngay", "so")
        self.assertEqual(cause2, "ngay thanh so")

        # 3. Currency / Accounting lost
        cause3 = auditor.classify_format_change("[$₫-42A] #,##0", "General", "so", "so")
        self.assertEqual(cause3, "VND/accounting bi doi")

        # 4. Custom lost
        cause4 = auditor.classify_format_change('[Blue]#,##0;[Red](#,##0);"-"', "General", "so", "so")
        self.assertEqual(cause4, "mat ma tuy chinh")

    def test_compare_xlsx_workbooks_identical(self):
        styles = (
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>'
            '<cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="164"/></cellXfs></styleSheet>'
        )
        sheet = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetData><row r="1"><c r="A1" s="1"><v>100.5</v></c></row></sheetData></worksheet>'
        )
        data = make_mock_xlsx(styles, sheet)

        import tempfile
        with tempfile.TemporaryDirectory() as td:
            p1 = Path(td) / "orig.xlsx"
            p2 = Path(td) / "saved.xlsx"
            p1.write_bytes(data)
            p2.write_bytes(data)

            res = auditor.compare_xlsx_workbooks(p1, p2)
            self.assertEqual(res["total_value_cells"], 1)
            self.assertEqual(res["format_changed_cells"], 0)
            self.assertEqual(res["type_changed_cells"], 0)
            self.assertEqual(res["value_changed_cells"], 0)
            self.assertEqual(res["missing_cells"], 0)

    def test_compare_xlsx_workbooks_format_changed(self):
        styles1 = (
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>'
            '<cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="164"/></cellXfs></styleSheet>'
        )
        styles2 = (
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="0"/></cellXfs></styleSheet>'
        )
        sheet = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetData><row r="1"><c r="A1" s="1"><v>45000</v></c></row></sheetData></worksheet>'
        )
        d1 = make_mock_xlsx(styles1, sheet)
        d2 = make_mock_xlsx(styles2, sheet)

        import tempfile
        with tempfile.TemporaryDirectory() as td:
            p1 = Path(td) / "orig.xlsx"
            p2 = Path(td) / "saved.xlsx"
            p1.write_bytes(d1)
            p2.write_bytes(d2)

            res = auditor.compare_xlsx_workbooks(p1, p2)
            self.assertEqual(res["total_value_cells"], 1)
            self.assertEqual(res["format_changed_cells"], 1)
            self.assertEqual(res["type_changed_cells"], 1)  # ngay -> so
            self.assertEqual(res["value_changed_cells"], 0)
            self.assertEqual(res["cause_breakdown"]["ngay thanh so"], 1)

    def test_check_not_empty_save_identical_bytes(self):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            p1 = Path(td) / "orig.xlsx"
            p2 = Path(td) / "saved.xlsx"
            data = b"PK\x03\x04exact_same_content"
            p1.write_bytes(data)
            p2.write_bytes(data)

            self.assertTrue(auditor.is_empty_save(p1, p2))
            with self.assertRaises(ValueError) as ctx:
                auditor.check_not_empty_save(p1, p2)
            self.assertIn("FAIL 'luu rong'", str(ctx.exception))

    def test_check_not_empty_save_different_bytes(self):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            p1 = Path(td) / "orig.xlsx"
            p2 = Path(td) / "saved.xlsx"
            p1.write_bytes(b"PK\x03\x04original_data")
            p2.write_bytes(b"PK\x03\x04real_saved_data_with_changes")

            self.assertFalse(auditor.is_empty_save(p1, p2))
            self.assertTrue(auditor.check_not_empty_save(p1, p2))

    def test_check_not_empty_save_missing_file(self):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            p1 = Path(td) / "orig.xlsx"
            p2 = Path(td) / "missing.xlsx"
            p1.write_bytes(b"data")
            with self.assertRaises(FileNotFoundError):
                auditor.check_not_empty_save(p1, p2)


if __name__ == "__main__":
    unittest.main()
