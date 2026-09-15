"""Test FODS optimization: merge repeated empty cells, trim style-only tail."""
from __future__ import annotations

import unittest
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from adapters.libreoffice.common import ooxml_zip_patch


class SheetFodsOptimizeTests(unittest.TestCase):
    def setUp(self):
        self.patcher = ooxml_zip_patch

    def _simple_fods(self, table_body: str) -> str:
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  <office:body><office:spreadsheet>
    <table:table table:name="Sheet1">{table_body}</table:table>
  </office:spreadsheet></office:body>
</office:document>"""

    def test_merge_consecutive_empty_styled_cells(self):
        """Consecutive empty cells with same style should be merged with number-columns-repeated."""
        table_body = (
            '<table:table-row>'
            '<table:table-cell table:style-name="ce1" office:value-type="void"><text:p/></table:table-cell>'
            '<table:table-cell table:style-name="ce1" office:value-type="void"><text:p/></table:table-cell>'
            '<table:table-cell table:style-name="ce1" office:value-type="void"><text:p/></table:table-cell>'
            '<table:table-cell table:style-name="ce2" office:value-type="void"><text:p/></table:table-cell>'
            '</table:table-row>'
        )
        fods = self._simple_fods(table_body)
        optimized = self.patcher.optimize_fods_streaming(fods)

        # First 3 cells with same style should be merged
        self.assertIn('table:number-columns-repeated="3"', optimized)
        # 4th cell with different style should remain separate
        self.assertIn('table:style-name="ce2"', optimized)
        # Should have fewer cell elements
        self.assertLess(optimized.count("<table:table-cell"), table_body.count("<table:table-cell"))

    def test_do_not_merge_cells_with_content(self):
        """Cells with values/formulas should not be merged."""
        table_body = (
            '<table:table-row>'
            '<table:table-cell table:style-name="ce1" office:value-type="string"><text:p>Hello</text:p></table:table-cell>'
            '<table:table-cell table:style-name="ce1" office:value-type="string"><text:p>World</text:p></table:table-cell>'
            '<table:table-cell table:style-name="ce1" office:value-type="void"><text:p/></table:table-cell>'
            '</table:table-row>'
        )
        fods = self._simple_fods(table_body)
        optimized = self.patcher.optimize_fods_streaming(fods)

        # Cells with content should not be merged
        self.assertNotIn('table:number-columns-repeated="2"', optimized)
        self.assertNotIn('table:number-columns-repeated="3"', optimized)

    def test_do_not_merge_different_styles(self):
        """Consecutive empty cells with different styles should not be merged."""
        table_body = (
            '<table:table-row>'
            '<table:table-cell table:style-name="ce1" office:value-type="void"><text:p/></table:table-cell>'
            '<table:table-cell table:style-name="ce2" office:value-type="void"><text:p/></table:table-cell>'
            '<table:table-cell table:style-name="ce1" office:value-type="void"><text:p/></table:table-cell>'
            '</table:table-row>'
        )
        fods = self._simple_fods(table_body)
        optimized = self.patcher.optimize_fods_streaming(fods)

        # No merging should occur
        self.assertNotIn("table:number-columns-repeated", optimized)

    def test_trim_style_only_tail_beyond_max_repeat(self):
        """Style-only cells beyond max_style_only_col_repeat (default 64) should be trimmed."""
        # Create a row with 80 style-only cells with same style
        cells = "".join(
            '<table:table-cell table:style-name="bordered" office:value-type="void"><text:p/></table:table-cell>'
            for _ in range(80)
        )
        table_body = f'<table:table-row>{cells}</table:table-row>'
        fods = self._simple_fods(table_body)

        # With default max_style_only_col_repeat=64, only first 64 should remain
        optimized = self.patcher.optimize_fods_streaming(fods, max_style_only_col_repeat=64)

        # Should have merged into one cell with repeat=64
        self.assertIn('table:number-columns-repeated="64"', optimized)
        # Should not have more than 64 columns
        cell_count = optimized.count('<table:table-cell')
        self.assertLessEqual(cell_count, 2)  # At most the merged cell + maybe one more

    def test_keep_style_only_within_border_block(self):
        """Style-only cells within the border block (<=64 cols) should be kept."""
        # Create a row with 40 style-only cells with borders
        cells = "".join(
            '<table:table-cell table:style-name="bordered" office:value-type="void"><text:p/></table:table-cell>'
            for _ in range(40)
        )
        table_body = f'<table:table-row>{cells}</table:table-row>'
        fods = self._simple_fods(table_body)

        optimized = self.patcher.optimize_fods_streaming(fods, max_style_only_col_repeat=64)

        # All 40 should be kept (merged into one with repeat=40)
        self.assertIn('table:number-columns-repeated="40"', optimized)

    def test_keep_data_cells_beyond_max_repeat(self):
        """Data cells before trailing style-only cells should be kept; trailing style-only cells trimmed."""
        # 5 data cells + 70 trailing empty styled cells (simulating Excel full-row formatting)
        data_cells = "".join(
            f'<table:table-cell table:style-name="ce1" office:value-type="string"><text:p>Data{i}</text:p></table:table-cell>'
            for i in range(5)
        )
        empty_cells = "".join(
            '<table:table-cell table:style-name="bordered" office:value-type="void"><text:p/></table:table-cell>'
            for _ in range(70)
        )
        table_body = f'<table:table-row>{data_cells}{empty_cells}</table:table-row>'
        fods = self._simple_fods(table_body)

        optimized = self.patcher.optimize_fods_streaming(fods, max_style_only_col_repeat=64)

        # Data cells should be preserved
        for i in range(5):
            self.assertIn(f"Data{i}", optimized)
        # Trailing empty cells: data uses cols 1-5, so style-only can use cols 6-64 (59 cols)
        # 70 trailing cells → 59 kept, 11 trimmed
        self.assertIn('table:number-columns-repeated="59"', optimized)

    def test_preserve_row_repeat(self):
        """Row repeat attribute should be preserved."""
        table_body = (
            '<table:table-row table:number-rows-repeated="5">'
            '<table:table-cell table:style-name="ce1" office:value-type="void"><text:p/></table:table-cell>'
            '<table:table-cell table:style-name="ce1" office:value-type="void"><text:p/></table:table-cell>'
            '</table:table-row>'
        )
        fods = self._simple_fods(table_body)
        optimized = self.patcher.optimize_fods_streaming(fods)

        self.assertIn('table:number-rows-repeated="5"', optimized)
        self.assertIn('table:number-columns-repeated="2"', optimized)

    def test_preserve_covered_cells(self):
        """Covered table cells (merged cells) should be preserved."""
        table_body = (
            '<table:table-row>'
            '<table:table-cell table:number-columns-spanned="2" office:value-type="string"><text:p>Merged</text:p></table:table-cell>'
            '<table:covered-table-cell/>'
            '<table:table-cell table:style-name="ce1" office:value-type="void"><text:p/></table:table-cell>'
            '</table:table-row>'
        )
        fods = self._simple_fods(table_body)
        optimized = self.patcher.optimize_fods_streaming(fods)

        self.assertIn("table:covered-table-cell", optimized)
        self.assertIn("Merged", optimized)

    def test_multiple_rows_independent(self):
        """Each row should be processed independently."""
        table_body = (
            '<table:table-row>'
            '<table:table-cell table:style-name="ce1" office:value-type="void"><text:p/></table:table-cell>'
            '<table:table-cell table:style-name="ce1" office:value-type="void"><text:p/></table:table-cell>'
            '</table:table-row>'
            '<table:table-row>'
            '<table:table-cell table:style-name="ce2" office:value-type="void"><text:p/></table:table-cell>'
            '<table:table-cell table:style-name="ce2" office:value-type="void"><text:p/></table:table-cell>'
            '<table:table-cell table:style-name="ce2" office:value-type="void"><text:p/></table:table-cell>'
            '</table:table-row>'
        )
        fods = self._simple_fods(table_body)
        optimized = self.patcher.optimize_fods_streaming(fods)

        # Row 1: 2 cells merged
        self.assertIn('table:number-columns-repeated="2"', optimized)
        # Row 2: 3 cells merged
        # Count occurrences - should have two separate merged cells
        self.assertEqual(optimized.count('table:number-columns-repeated="2"'), 1)
        self.assertEqual(optimized.count('table:number-columns-repeated="3"'), 1)

    def test_empty_fods_returns_unchanged(self):
        """Empty or minimal FODS should return unchanged."""
        minimal = self._simple_fods("")
        self.assertEqual(self.patcher.optimize_fods_streaming(minimal), minimal)

        none_result = self.patcher.optimize_fods_streaming("")
        self.assertEqual(none_result, "")

    def test_cell_with_formula_not_merged(self):
        """Cell with formula should not be merged."""
        table_body = (
            '<table:table-row>'
            '<table:table-cell table:style-name="ce1" table:formula="of:=SUM(A1:B1)" office:value-type="float"><text:p>10</text:p></table:table-cell>'
            '<table:table-cell table:style-name="ce1" office:value-type="void"><text:p/></table:table-cell>'
            '</table:table-row>'
        )
        fods = self._simple_fods(table_body)
        optimized = self.patcher.optimize_fods_streaming(fods)

        self.assertNotIn('table:number-columns-repeated="2"', optimized)
        self.assertIn("SUM(A1:B1)", optimized)

    def test_cell_with_annotation_not_merged(self):
        """Cell with annotation should not be merged."""
        table_body = (
            '<table:table-row>'
            '<table:table-cell table:style-name="ce1" office:value-type="string"><text:p>Commented</text:p>'
            '<office:annotation><text:p>Note</text:p></office:annotation></table:table-cell>'
            '<table:table-cell table:style-name="ce1" office:value-type="void"><text:p/></table:table-cell>'
            '</table:table-row>'
        )
        fods = self._simple_fods(table_body)
        optimized = self.patcher.optimize_fods_streaming(fods)

        self.assertNotIn('table:number-columns-repeated="2"', optimized)
        self.assertIn("office:annotation", optimized)

    def test_text_span_preserved(self):
        """Cell with text:span (rich text) should be preserved."""
        table_body = (
            '<table:table-row>'
            '<table:table-cell table:style-name="ce1" office:value-type="string"><text:p><text:span>Rich</text:span></text:p></table:table-cell>'
            '<table:table-cell table:style-name="ce1" office:value-type="void"><text:p/></table:table-cell>'
            '</table:table-row>'
        )
        fods = self._simple_fods(table_body)
        optimized = self.patcher.optimize_fods_streaming(fods)

        self.assertNotIn('table:number-columns-repeated="2"', optimized)
        self.assertIn("text:span", optimized)


if __name__ == "__main__":
    unittest.main()