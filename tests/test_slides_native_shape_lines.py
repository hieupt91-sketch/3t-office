"""Shape line properties (weight and theme color) preservation in slides PPTX export."""
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


class NativeShapeLinesTests(unittest.TestCase):
    def test_theme_styled_shape_removes_injected_ln_and_restores_style(self):
        src_slide = (
            '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
            '<p:cSld><p:spTree>'
            '<p:sp><p:nvSpPr><p:cNvPr id="4" name="Btn"/></p:nvSpPr><p:spPr><a:prstGeom prst="roundRect"/></p:spPr>'
            '<p:style><a:lnRef idx="2"><a:schemeClr val="accent1"/></a:lnRef></p:style>'
            '</p:sp>'
            '</p:spTree></p:cSld></p:sld>'
        )
        # Target has explicit ln injected by soffice and wiped style
        target_slide = (
            '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
            '<p:cSld><p:spTree>'
            '<p:sp><p:nvSpPr><p:cNvPr id="4" name="Btn"/></p:nvSpPr>'
            '<p:spPr><a:prstGeom prst="roundRect"/><a:ln w="12600"><a:solidFill><a:srgbClr val="43729D"/></a:solidFill></a:ln></p:spPr>'
            '<p:style><a:lnRef idx="0"/></p:style>'
            '</p:sp>'
            '</p:spTree></p:cSld></p:sld>'
        )
        src_pptx = make_pptx(src_slide)
        target_pptx = make_pptx(target_slide)

        repls = patcher._apply_slides_native_shape_lines(target_pptx, src_pptx)
        self.assertIn("ppt/slides/slide1.xml", repls)
        patched_xml = repls["ppt/slides/slide1.xml"]
        self.assertNotIn('<a:ln w=', patched_xml)
        self.assertIn('<a:lnRef idx="2"', patched_xml)

    def test_explicit_line_weight_restores_exact_emu(self):
        src_slide = (
            '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
            '<p:cSld><p:spTree>'
            '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Rect1"/></p:nvSpPr>'
            '<p:spPr><a:ln w="50800"/></p:spPr>'
            '</p:sp>'
            '</p:spTree></p:cSld></p:sld>'
        )
        target_slide = (
            '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
            '<p:cSld><p:spTree>'
            '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Rect1"/></p:nvSpPr>'
            '<p:spPr><a:ln w="50760"/></p:spPr>'
            '</p:sp>'
            '</p:spTree></p:cSld></p:sld>'
        )
        src_pptx = make_pptx(src_slide)
        target_pptx = make_pptx(target_slide)

        repls = patcher._apply_slides_native_shape_lines(target_pptx, src_pptx)
        self.assertIn("ppt/slides/slide1.xml", repls)
        patched_xml = repls["ppt/slides/slide1.xml"]
        self.assertIn('w="50800"', patched_xml)


if __name__ == "__main__":
    unittest.main()
