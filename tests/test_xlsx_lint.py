from __future__ import annotations

import importlib.util
import tempfile
import unittest
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "layout-audit" / "_xlsx_lint.py"
SPEC = importlib.util.spec_from_file_location("vno_xlsx_lint", MODULE_PATH)
LINTER = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(LINTER)


def write_xlsx(path: Path, sheet_xml: str) -> None:
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("xl/styles.xml", """
            <x:styleSheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
              <x:fonts count="1"><x:font/></x:fonts>
              <x:fills count="1"><x:fill/></x:fills>
              <x:borders count="1"><x:border/></x:borders>
              <x:cellStyleXfs count="1"><x:xf/></x:cellStyleXfs>
              <x:cellXfs count="1"><x:xf/></x:cellXfs>
            </x:styleSheet>
        """)
        archive.writestr("xl/sharedStrings.xml", """
            <x:sst xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
              <x:si><x:t>valid string</x:t></x:si>
            </x:sst>
        """)
        archive.writestr("xl/worksheets/sheet1.xml", sheet_xml)


class XlsxLintTests(unittest.TestCase):
    def test_accepts_empty_self_closing_rows_and_prefixed_shared_strings(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "valid.xlsx"
            write_xlsx(path, """
                <x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                  <x:sheetData>
                    <x:row r="1"/>
                    <x:row r="2"><x:c r="A2" t="s"><x:v>0</x:v></x:c></x:row>
                  </x:sheetData>
                </x:worksheet>
            """)
            self.assertEqual(LINTER.lint_xlsx(path), [])

    def test_reports_shared_string_index_outside_the_table(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "invalid.xlsx"
            write_xlsx(path, """
                <x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                  <x:sheetData><x:row r="1"><x:c r="A1" t="s"><x:v>1</x:v></x:c></x:row></x:sheetData>
                </x:worksheet>
            """)
            self.assertTrue(any("shared-string index '1' >= 1" in issue for issue in LINTER.lint_xlsx(path)))


if __name__ == "__main__":
    unittest.main()
