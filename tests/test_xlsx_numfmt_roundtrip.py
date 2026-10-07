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


if __name__ == "__main__":
    unittest.main()
