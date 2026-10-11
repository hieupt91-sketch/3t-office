"""The prebuilt font descent table must equal live Windows GDI and be usable without GDI (macOS/Linux)."""

from __future__ import annotations

import os
import sys
import unittest
from unittest import mock

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import main as vnmain  # noqa: E402

PATCHER = vnmain._ooxml_zip_patch()


def _fresh():
    PATCHER._GDI_DESCENT_CACHE.clear()


class FontDescentTableTests(unittest.TestCase):
    def test_table_loads_and_covers_the_default_sheet_fonts(self):
        _fresh()
        for name in ("Calibri", "Arial", "Times New Roman", "Tahoma"):
            self.assertIsNotNone(PATCHER._font_descent_from_table(name.lower(), 15, False, False), name)

    def test_values_without_gdi_match_the_table_on_every_os(self):
        _fresh()
        with mock.patch.dict(sys.modules, {"ctypes": None}):  # any GDI attempt would raise -> None
            value = PATCHER._gdi_font_descent("Calibri", 11, False)
        self.assertEqual(value, 4)  # Calibri 11 -> ppem 15, tmDescent 4 (docs measurement table)

    @unittest.skipUnless(sys.platform == "win32", "needs Windows GDI")
    def test_every_sampled_table_entry_equals_live_gdi(self):
        PATCHER._font_descent_from_table("calibri", 15, False, False)  # force the lazy load
        table = PATCHER._FONT_DESCENT_TABLE
        checked = 0
        with mock.patch.dict(os.environ, {"VNO_FONT_TABLE_LEGACY": "1"}):
            for font, styles in table["fonts"].items():
                for style, values in styles.items():
                    bold, italic = style[1] == "1", style[3] == "1"
                    for offset, expected in enumerate(values):
                        ppem = table["minPpem"] + offset
                        if ppem % 7:  # sample every 7th size to keep the run short; the generator covers all
                            continue
                        _fresh()
                        live = PATCHER._gdi_font_descent(font, ppem * 0.75, bold, italic)
                        self.assertEqual(live, expected, f"{font} {style} ppem {ppem}")
                        checked += 1
        self.assertGreater(checked, 200)

    def test_legacy_flag_skips_the_table(self):
        _fresh()
        with mock.patch.dict(os.environ, {"VNO_FONT_TABLE_LEGACY": "1"}):
            self.assertIsNone(PATCHER._font_descent_from_table("calibri", 15, False, False))


if __name__ == "__main__":
    unittest.main()
