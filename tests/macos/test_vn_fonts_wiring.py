"""VN-FONTS-1: the bundled VN substitute fonts are wired into the macOS document engine configuration.

The generated fonts.conf must list the bundled folder (read in place) and, for each font the VN fonts were built
for, put the VN family first with the MAC-9 macOS fallbacks behind it. Font file contents are covered by
tests/test_vn_document_fonts.py (platform-neutral).
"""
from __future__ import annotations

import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

from tests.macos.test_engine_fonts import ROOT, load_adapter, load_macos

FONT_DIR = ROOT / "platform" / "fonts" / "document"
VN_FIRST = {"Segoe UI": "VN Sans UI", "Aptos": "VN Sans", "Aptos Display": "VN Sans", "Consolas": "VN Mono",
            "SimSun": "VN Song", "NSimSun": "VN Song"}


class VnFontWiringTests(unittest.TestCase):
    def setUp(self):
        self.macos, _ = load_macos()
        self.fonts = self.macos.MacDocumentFonts(home=Path("/Users/someone"))
        with tempfile.TemporaryDirectory() as tmp:
            result = load_adapter().write_engine_font_config(Path(tmp), self.fonts)
            self.text = result.path.read_text(encoding="utf-8")
        self.root = ET.fromstring(self.text.split("\n", 2)[2])

    def test_bundled_folder_is_listed_and_holds_every_substitute_family(self):
        dirs = [d.text for d in self.root.findall("dir")]
        self.assertIn(str(FONT_DIR), dirs)
        for family in set(VN_FIRST.values()):
            stem = family.replace(" ", "")
            self.assertTrue((FONT_DIR / f"{stem}-Regular.ttf").is_file(), family)

    def test_bundled_folder_is_not_rejected_by_the_system_folder_filter(self):
        rejected = [g.text for g in self.root.findall("selectfont/rejectfont/glob")]
        for glob in rejected:
            self.assertFalse(str(FONT_DIR).startswith(glob.rstrip("*")), glob)

    def test_vn_family_comes_first_with_mac9_fallbacks_behind(self):
        aliases = {a.find("family").text: [f.text for f in a.findall("accept/family")]
                   for a in self.root.findall("alias")}
        for font, vn in VN_FIRST.items():
            with self.subTest(font=font):
                self.assertEqual(aliases[font][0], vn)
                self.assertGreater(len(aliases[font]), 1)  # a macOS fallback stays if the bundle is damaged
                self.assertNotIn(font, aliases[font])

    def test_metric_compatible_flag_is_not_claimed_for_the_vn_fonts(self):
        # Only Carlito/Caladea/Liberation are fully metric-compatible; the VN fonts are documented per font.
        table = {s.font: s for s in self.fonts.substitutions()}
        for font in VN_FIRST:
            self.assertFalse(table[font].metric_compatible, font)


if __name__ == "__main__":
    unittest.main()
