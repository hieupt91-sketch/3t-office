import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts" / "layout-audit"))
import _xls_compare_libreoffice as cmp


class XlsCompareLibreofficeTests(unittest.TestCase):
    def test_parse_fods_prioritizes_office_string_value(self):
        fods_content = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:calcext="urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0">
  <office:body>
    <office:spreadsheet>
      <table:table table:name="Sheet1">
        <table:table-row>
          <table:table-cell office:value-type="string" office:string-value="Cong/Bo" calcext:value-type="string">
            <text:p><text:s/>Cong/Bo </text:p>
          </table:table-cell>
          <table:table-cell office:value-type="string" calcext:value-type="string">
            <text:p>FallbackText</text:p>
          </table:table-cell>
        </table:table-row>
      </table:table>
    </office:spreadsheet>
  </office:body>
</office:document>"""
        with tempfile.NamedTemporaryFile("w", suffix=".fods", encoding="utf-8", delete=False) as tf:
            tf.write(fods_content)
            temp_name = tf.name

        try:
            sheets = cmp.parse_fods(temp_name)
            self.assertIn("Sheet1", sheets)
            cells = sheets["Sheet1"]
            # Row 0, Col 0: office:string-value was "Cong/Bo"
            self.assertEqual(cells.get((0, 0)), ("Cong/Bo", ""))
            # Row 0, Col 1: fallback to <text:p>
            self.assertEqual(cells.get((0, 1)), ("FallbackText", ""))
        finally:
            Path(temp_name).unlink(missing_ok=True)

    def test_compare_sheets_identical_cells(self):
        sheets_a = {"Sheet1": {(0, 0): ("Val1", "=1+1"), (0, 1): ("Val2", "")}}
        sheets_b = {"Sheet1": {(0, 0): ("Val1", "=1+1"), (0, 1): ("Val2", "")}}
        num_sheets, total, diffs, examples = cmp.compare_sheets(sheets_a, sheets_b)
        self.assertEqual(num_sheets, 1)
        self.assertEqual(total, 2)
        self.assertEqual(diffs, 0)
        self.assertEqual(examples, [])

    def test_compare_sheets_diff_detected(self):
        sheets_a = {"Sheet1": {(0, 0): ("ValA", "")}}
        sheets_b = {"Sheet1": {(0, 0): ("ValB", "")}}
        num_sheets, total, diffs, examples = cmp.compare_sheets(sheets_a, sheets_b)
        self.assertEqual(diffs, 1)
        self.assertEqual(len(examples), 1)
        self.assertIn("Sheet1!A1", examples[0])


if __name__ == "__main__":
    unittest.main()
