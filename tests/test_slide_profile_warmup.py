"""Slide's LibreOffice profile must be primed like Doc/Sheet (04/10/2026: unprimed = +12 s on the first Slide open)."""
from __future__ import annotations

import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import main as vnmain  # noqa: E402


class SlideWarmupTests(unittest.TestCase):
    def test_warmup_pptx_is_a_well_formed_package(self):
        with tempfile.TemporaryDirectory() as temp:
            path = str(Path(temp) / "warm.pptx")
            vnmain._write_profile_warmup_pptx(path)
            with zipfile.ZipFile(path) as package:
                names = set(package.namelist())
                for required in ("[Content_Types].xml", "_rels/.rels", "ppt/presentation.xml", "ppt/slides/slide1.xml",
                                 "ppt/slideMasters/slideMaster1.xml", "ppt/slideLayouts/slideLayout1.xml", "ppt/theme/theme1.xml"):
                    self.assertIn(required, names)
                for name in names:
                    ElementTree.fromstring(package.read(name))  # raises on malformed XML

    def test_slides_is_warmed_by_the_persistent_manager_and_the_seed_builder(self):
        manager_source = Path(ROOT / "main.py").read_text(encoding="utf-8")
        self.assertIn('if app_kind not in {"writer", "sheet", "slides"} or not _PERSISTENT_SOFFICE_ENABLED:', manager_source)
        builder = (ROOT / "scripts" / "release" / "build-seed-profiles.py").read_text(encoding="utf-8")
        self.assertNotIn("subprocess.run(", builder.split("def main")[1].split("shutil.copytree")[0])
        self.assertIn("_warmup_persistent_filter(kind)", builder)


if __name__ == "__main__":
    unittest.main()
