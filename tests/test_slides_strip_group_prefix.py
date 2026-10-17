"""Group shape name prefix stripping in slides PPTX export (Item h)."""
from __future__ import annotations

import io
import unittest
import zipfile

import main

patcher = main._ooxml_zip_patch()


def make_pptx(slide_xml: str) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
        package.writestr("ppt/presentation.xml", '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>')
        package.writestr("ppt/slides/slide1.xml", slide_xml)
    return buffer.getvalue()


class StripGroupPrefixTests(unittest.TestCase):
    def test_strip_group_prefix_from_group_shape_name(self):
        target_slide = (
            '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
            '<p:cSld><p:spTree>'
            '<p:grpSp>'
            '<p:nvGrpSpPr><p:cNvPr id="11" name="VNOfficeGroup:Group1"/></p:nvGrpSpPr>'
            '</p:grpSp>'
            '</p:spTree></p:cSld></p:sld>'
        )
        target_pptx = make_pptx(target_slide)

        repls = patcher._strip_slides_internal_group_prefix(target_pptx)
        self.assertIn("ppt/slides/slide1.xml", repls)
        patched_xml = repls["ppt/slides/slide1.xml"]
        self.assertIn('name="Group1"', patched_xml)
        self.assertNotIn("VNOfficeGroup:", patched_xml)


if __name__ == "__main__":
    unittest.main()
