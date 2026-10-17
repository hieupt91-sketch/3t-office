"""Connector shape line, color, and arrowhead preservation in slides PPTX export (Item i)."""
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


class NativeConnectorsTests(unittest.TestCase):
    def test_connector_restores_line_weight_color_and_arrowhead(self):
        src_slide = (
            '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
            '<p:cSld><p:spTree>'
            '<p:cxnSp>'
            '<p:nvCxnSpPr><p:cNvPr id="6" name="Conn1"/></p:nvCxnSpPr>'
            '<p:spPr><a:ln w="31750"><a:solidFill><a:srgbClr val="008000"/></a:solidFill><a:tailEnd type="triangle"/></a:ln></p:spPr>'
            '</p:cxnSp>'
            '</p:spTree></p:cSld></p:sld>'
        )
        target_slide = (
            '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
            '<p:cSld><p:spTree>'
            '<p:cxnSp>'
            '<p:nvCxnSpPr><p:cNvPr id="14" name="Conn1"/></p:nvCxnSpPr>'
            '<p:spPr><a:ln w="28800"><a:solidFill><a:srgbClr val="475569"/></a:solidFill></a:ln></p:spPr>'
            '</p:cxnSp>'
            '</p:spTree></p:cSld></p:sld>'
        )
        src_pptx = make_pptx(src_slide)
        target_pptx = make_pptx(target_slide)

        repls = patcher._apply_slides_native_connectors(target_pptx, source_pptx=src_pptx)
        self.assertIn("ppt/slides/slide1.xml", repls)
        patched_xml = repls["ppt/slides/slide1.xml"]
        self.assertIn('w="31750"', patched_xml)
        self.assertIn('val="008000"', patched_xml)
        self.assertIn('<a:tailEnd type="triangle"/>', patched_xml)


if __name__ == "__main__":
    unittest.main()
