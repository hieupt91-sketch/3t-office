from __future__ import annotations

import importlib.util
import io
import os
import unittest
import zipfile

ROOT = os.path.dirname(os.path.dirname(__file__))
SPEC = importlib.util.spec_from_file_location(
    "future_function_prefixes",
    os.path.join(ROOT, "adapters", "libreoffice", "common", "ooxml_zip_patch.py"),
)
patcher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(patcher)


def _xlsx() -> bytes:
    entries = {
        "xl/workbook.xml": (
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="Main" sheetId="1" r:id="rId1"/></sheets></workbook>'
        ),
        "xl/_rels/workbook.xml.rels": (
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
            'Target="worksheets/sheet1.xml"/></Relationships>'
        ),
        "xl/worksheets/sheet1.xml": (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">'
            '<c r="A1" t="e"><f>xlookup("Vở",D2:D41,F2:F41,"Thiếu")</f><v>#NAME?</v></c>'
            '<c r="A2" t="e"><f>ifs(E2&gt;=5,"Đạt",TRUE(),"Chưa")</f><v>#NAME?</v></c>'
            '<c r="A3" t="str"><f>unique(D2:D41)</f><v>#NAME? (UNIQUE)</v></c>'
            '<c r="A4" t="str"><f>filter(A2:H41,B2:B41="Bắc","Không có")</f><v>#NAME? (FILTER)</v></c>'
            '<c r="A5" t="str"><f>sort(A2:H6,5,1)</f><v>#NAME? (SORT)</v></c>'
            '<c r="A6" t="str"><f>IF(A1="FILTER(","SORT(","UNIQUE(")</f><v>FILTER(</v></c>'
            '</row></sheetData></worksheet>'
        ),
    }
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as package:
        for name, xml in entries.items():
            package.writestr(name, xml)
    return buffer.getvalue()


class SheetFutureFunctionPrefixes(unittest.TestCase):
    def test_future_functions_get_excel_2016_prefixes_without_changing_cached_values(self):
        output = patcher.postprocess_sheet_xlsx(_xlsx())
        with zipfile.ZipFile(io.BytesIO(output)) as package:
            xml = package.read("xl/worksheets/sheet1.xml").decode("utf-8")

        expected = {
            "A1": ("_xlfn.XLOOKUP(", "#NAME?"),
            "A2": ("_xlfn.IFS(", "#NAME?"),
            "A3": ("_xlfn.UNIQUE(", "#NAME? (UNIQUE)"),
            "A4": ("_xlfn._xlws.FILTER(", "#NAME? (FILTER)"),
            "A5": ("_xlfn._xlws.SORT(", "#NAME? (SORT)"),
        }
        for cell, (prefix, cached) in expected.items():
            with self.subTest(cell=cell):
                self.assertRegex(xml, rf'<c\b[^>]*\br="{cell}"[^>]*>.*?<f\b[^>]*>{re_escape(prefix)}')
                self.assertRegex(xml, rf'<c\b[^>]*\br="{cell}"[^>]*>.*?<v>{re_escape(cached)}</v>')
        self.assertIn('IF(A1="FILTER(","SORT(","UNIQUE(")', xml)


def re_escape(value: str) -> str:
    import re

    return re.escape(value)


if __name__ == "__main__":
    unittest.main()
