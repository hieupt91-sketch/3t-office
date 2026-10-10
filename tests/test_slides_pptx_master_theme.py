"""Slide Master theme IDs survive the production PPTX save/open patch path."""

from __future__ import annotations

import io
import unittest
import zipfile

import main

patcher = main._ooxml_zip_patch()

MASTER_XML = (
    '<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
    '<p:cSld><p:spTree/></p:cSld></p:sldMaster>'
)
FODP = (
    '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
    'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" '
    'xmlns:vno="urn:vn-office:slides:1.0">'
    '<office:master-styles><style:master-page style:name="Standard" '
    'vno:master-theme="{&quot;id&quot;:&quot;minimal-dark&quot;}"/></office:master-styles>'
    '</office:document>'
)


def make_pptx(master_xml: str) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("ppt/presentation.xml", '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldSz cx="10080625" cy="5670550"/></p:presentation>')
        package.writestr("ppt/slideMasters/slideMaster1.xml", master_xml)
        package.writestr("ppt/slides/slide1.xml", '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>')
    return buffer.getvalue()


class SlidesPptxMasterThemeTests(unittest.TestCase):
    def test_save_stamps_theme_id_and_open_overlay_restores_it(self):
        self.assertEqual(patcher.parse_master_theme_id_from_fodp(FODP), "minimal-dark")
        stamped = patcher.postprocess_slides_pptx(make_pptx(MASTER_XML), source_fodp=FODP)
        with zipfile.ZipFile(io.BytesIO(stamped)) as package:
            master = package.read("ppt/slideMasters/slideMaster1.xml").decode("utf-8")
        self.assertEqual(patcher.parse_master_theme_id(master), "minimal-dark")

        restored = patcher.overlay_fodp_master_theme_id(FODP.replace('vno:master-theme="{&quot;id&quot;:&quot;minimal-dark&quot;}"', ""), [master])
        self.assertEqual(patcher.parse_master_theme_id_from_fodp(restored), "minimal-dark")


if __name__ == "__main__":
    unittest.main()
