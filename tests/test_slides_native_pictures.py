"""Picture properties (alternative text and border line) preservation in slides PPTX export."""
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


class NativePicturesTests(unittest.TestCase):
    def test_picture_restores_descr_and_border_line(self):
        src_slide = (
            '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
            '<p:cSld><p:spTree>'
            '<p:pic>'
            '<p:nvPicPr><p:cNvPr id="2" name="Pic1" descr="mo ta anh"/></p:nvPicPr>'
            '<p:spPr><a:ln w="38100"><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></a:ln></p:spPr>'
            '</p:pic>'
            '</p:spTree></p:cSld></p:sld>'
        )
        target_slide = (
            '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
            '<p:cSld><p:spTree>'
            '<p:pic>'
            '<p:nvPicPr><p:cNvPr id="10" name="Pic1"/></p:nvPicPr>'
            '<p:spPr><a:ln w="0"><a:noFill/></a:ln></p:spPr>'
            '</p:pic>'
            '</p:spTree></p:cSld></p:sld>'
        )
        src_pptx = make_pptx(src_slide)
        target_pptx = make_pptx(target_slide)

        repls = patcher._apply_slides_native_pictures(target_pptx, source_pptx=src_pptx)
        self.assertIn("ppt/slides/slide1.xml", repls)
        patched_xml = repls["ppt/slides/slide1.xml"]
        self.assertIn('descr="mo ta anh"', patched_xml)
        self.assertIn('w="38100"', patched_xml)
        self.assertIn('val="FF0000"', patched_xml)


if __name__ == "__main__":
    unittest.main()
