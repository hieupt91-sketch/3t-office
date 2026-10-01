import unittest
import zipfile
import tempfile
import subprocess
import sys
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LINTER_PATH = ROOT / "scripts" / "layout-audit" / "_xlsx_lint.py"


class XlsxLintRegressionTests(unittest.TestCase):
    def _run_linter(self, xlsx_path: str) -> list[str]:
        result = subprocess.run(
            [sys.executable, str(LINTER_PATH), str(xlsx_path)],
            capture_output=True,
            text=True,
            cwd=str(ROOT),
            timeout=30,
        )
        lines = [
            line.strip()
            for line in (result.stdout or "").splitlines()
            if line.strip() and line.strip() != "lint done"
        ]
        return lines

    def test_self_closing_row_does_not_cause_cell_row_mismatch(self):
        """Self-closing <row r="1" .../> followed by <row r="2"><c r="A2"/></row> must be clean."""
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            with zipfile.ZipFile(tmp_path, "w", zipfile.ZIP_DEFLATED) as z:
                z.writestr(
                    "[Content_Types].xml",
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                    '<Default Extension="xml" ContentType="application/xml"/>'
                    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
                    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
                    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
                    "</Types>",
                )
                z.writestr("xl/styles.xml", '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cellXfs count="1"><xf fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><fonts count="1"><font/></fonts><fills count="1"><fill/></fills><borders count="1"><border/></borders></styleSheet>')
                sheet_xml = (
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
                    '<sheetFormatPr defaultRowHeight="15"/>'
                    "<sheetData>"
                    '<row r="1" ht="20" customHeight="1"/>'
                    '<row r="2" ht="15"><c r="A2" s="0"/></row>'
                    '<row r="3" ht="20" customHeight="1"/>'
                    '<row r="4" ht="15"><c r="A4" s="0"/></row>'
                    "</sheetData>"
                    "</worksheet>"
                )
                z.writestr("xl/worksheets/sheet1.xml", sheet_xml)

            issues = self._run_linter(tmp_path)
            self.assertEqual(issues, [], f"Expected clean lint, but got: {issues}")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_namespaced_sst_counts_correctly(self):
        """Shared string tables using <x:sst> and <x:si> (as in lan23) must match uniqueCount."""
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            with zipfile.ZipFile(tmp_path, "w", zipfile.ZIP_DEFLATED) as z:
                z.writestr(
                    "[Content_Types].xml",
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                    '<Default Extension="xml" ContentType="application/xml"/>'
                    "</Types>",
                )
                z.writestr("xl/styles.xml", '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cellXfs count="1"><xf fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><fonts count="1"><font/></fonts><fills count="1"><fill/></fills><borders count="1"><border/></borders></styleSheet>')
                sst_xml = (
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                    '<x:sst xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="2" uniqueCount="2">'
                    "<x:si><x:t>First</x:t></x:si>"
                    "<x:si><x:t>Second</x:t></x:si>"
                    "</x:sst>"
                )
                z.writestr("xl/sharedStrings.xml", sst_xml)
                sheet_xml = (
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
                    '<sheetFormatPr defaultRowHeight="15"/>'
                    "<sheetData>"
                    '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>'
                    "</sheetData>"
                    "</worksheet>"
                )
                z.writestr("xl/worksheets/sheet1.xml", sheet_xml)

            issues = self._run_linter(tmp_path)
            self.assertEqual(issues, [], f"Expected clean lint for namespaced SST, but got: {issues}")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_real_row_mismatch_is_caught(self):
        """A genuine mismatch where cell A23 is inside row 22 must still be reported."""
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            with zipfile.ZipFile(tmp_path, "w", zipfile.ZIP_DEFLATED) as z:
                z.writestr("xl/styles.xml", '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cellXfs count="1"><xf fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><fonts count="1"><font/></fonts><fills count="1"><fill/></fills><borders count="1"><border/></borders></styleSheet>')
                sheet_xml = (
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
                    '<sheetFormatPr defaultRowHeight="15"/>'
                    "<sheetData>"
                    '<row r="22"><c r="A23" s="0"/></row>'
                    "</sheetData>"
                    "</worksheet>"
                )
                z.writestr("xl/worksheets/sheet1.xml", sheet_xml)

            issues = self._run_linter(tmp_path)
            self.assertTrue(any("cell row mismatch" in i and "A23" in i and "row 22" in i for i in issues), f"Expected row mismatch report, got: {issues}")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_real_sst_mismatch_is_caught(self):
        """A genuine SST uniqueCount mismatch must still be reported."""
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            with zipfile.ZipFile(tmp_path, "w", zipfile.ZIP_DEFLATED) as z:
                z.writestr("xl/styles.xml", '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cellXfs count="1"><xf fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><fonts count="1"><font/></fonts><fills count="1"><fill/></fills><borders count="1"><border/></borders></styleSheet>')
                sst_xml = '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="5" uniqueCount="5"><si><t>OnlyOne</t></si></sst>'
                z.writestr("xl/sharedStrings.xml", sst_xml)
                sheet_xml = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetFormatPr defaultRowHeight="15"/><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData></worksheet>'
                z.writestr("xl/worksheets/sheet1.xml", sheet_xml)

            issues = self._run_linter(tmp_path)
            self.assertTrue(any("SST uniqueCount=5 actual si=1" in i for i in issues), f"Expected SST mismatch report, got: {issues}")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)


if __name__ == "__main__":
    unittest.main()
