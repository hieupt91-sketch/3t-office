"""Native SmartArt restoration from an unchanged VN Slides diagram group."""

from __future__ import annotations

import io
import re
import unittest
import zipfile
from pathlib import Path

import main


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests/fixtures/real-office-samples/sample-slides-smartart.pptx"
GROUP_ID = "QuyTrinhHoSo"
FODP_PRESERVE = f'''<office:document xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:vno="urn:vn-office:slides:1.0"><office:body><office:presentation>
 <draw:page><draw:g draw:name="VNOfficeSmartArt:{GROUP_ID}" vno:smartart-preserve="true"/></draw:page>
 </office:presentation></office:body></office:document>'''


def _entries(payload: bytes) -> dict[str, bytes]:
    with zipfile.ZipFile(io.BytesIO(payload)) as package:
        return {name: package.read(name) for name in package.namelist() if not name.endswith("/")}


def _zip(entries: dict[str, bytes]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        for name, data in entries.items():
            package.writestr(name, data)
    return buffer.getvalue()


def _libreoffice_like_export() -> bytes:
    """Fixture-shaped PPTX with SmartArt flattened to an identifiable group."""
    entries = _entries(FIXTURE.read_bytes())
    slide_name = "ppt/slides/slide1.xml"
    slide = entries[slide_name].decode("utf-8")
    group = (
        '<p:grpSp><p:nvGrpSpPr><p:cNvPr id="80" '
        f'name="VNOfficeSmartArt:{GROUP_ID}"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
        '<p:grpSpPr/></p:grpSp>'
    )
    slide, replacements = re.subn(r"<p:graphicFrame\b[\s\S]*?</p:graphicFrame>", group, slide, count=1)
    if replacements != 1:
        raise AssertionError("fixture must contain one native SmartArt frame")
    entries[slide_name] = slide.encode("utf-8")

    rels_name = "ppt/slides/_rels/slide1.xml.rels"
    rels = entries[rels_name].decode("utf-8")
    rels = re.sub(r"<Relationship\b(?=[^>]*\bType=[\"'][^\"']*diagram[^\"']*[\"'])[^>]*/>", "", rels, flags=re.IGNORECASE)
    entries[rels_name] = rels.encode("utf-8")
    types = entries["[Content_Types].xml"].decode("utf-8")
    types = re.sub(r"<Override\b(?=[^>]*\bPartName=[\"']/ppt/diagrams/)[^>]*/>", "", types, flags=re.IGNORECASE)
    entries["[Content_Types].xml"] = types.encode("utf-8")
    for name in list(entries):
        if name.startswith("ppt/diagrams/"):
            del entries[name]
    return _zip(entries)


class NativeSmartArtRoundTripTests(unittest.TestCase):
    def setUp(self):
        self.patcher = main._ooxml_zip_patch()
        self.source = FIXTURE.read_bytes()
        self.exported = _libreoffice_like_export()

    def test_unchanged_native_diagram_restores_frame_parts_and_relationships(self):
        restored = self.patcher.restore_unmodified_smartart(self.exported, self.source, FODP_PRESERVE)
        self.assertNotEqual(restored, self.exported)
        result = _entries(restored)
        slide = result["ppt/slides/slide1.xml"].decode("utf-8")
        self.assertIn("<p:graphicFrame", slide)
        self.assertNotIn("VNOfficeSmartArt:", slide)
        for part in (
            "ppt/diagrams/data1.xml", "ppt/diagrams/layout1.xml",
            "ppt/diagrams/quickStyle1.xml", "ppt/diagrams/colors1.xml",
            "ppt/diagrams/drawing1.xml",
        ):
            self.assertEqual(result[part], _entries(self.source)[part])
        rels = result["ppt/slides/_rels/slide1.xml.rels"].decode("utf-8")
        for rel_type in ("diagramData", "diagramLayout", "diagramQuickStyle", "diagramColors", "diagramDrawing"):
            self.assertIn(rel_type, rels)
        content_types = result["[Content_Types].xml"].decode("utf-8")
        self.assertIn("/ppt/diagrams/data1.xml", content_types)

    def test_edited_or_unmatched_diagram_never_restores_stale_source(self):
        edited = FODP_PRESERVE.replace(' vno:smartart-preserve="true"', "")
        self.assertEqual(self.patcher.restore_unmodified_smartart(self.exported, self.source, edited), self.exported)
        mismatched = FODP_PRESERVE.replace(GROUP_ID, "not-the-source-diagram")
        self.assertEqual(self.patcher.restore_unmodified_smartart(self.exported, self.source, mismatched), self.exported)


if __name__ == "__main__":
    unittest.main()
