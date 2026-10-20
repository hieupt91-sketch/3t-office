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
        package.writestr("ppt/presentation.xml", '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>')
        package.writestr("ppt/_rels/presentation.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>')
        package.writestr("ppt/slides/slide1.xml", slide_xml)
    return buffer.getvalue()


class NativeConnectorsTests(unittest.TestCase):
    def test_generated_fodp_connector_is_exported_as_connected_ooxml_shape(self):
        fodp = (
            '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
            'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" '
            'xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0">'
            '<office:body><office:presentation><draw:page>'
            '<draw:rect draw:name="Node A" draw:id="A"/><draw:rect draw:name="Node B" draw:id="B"/>'
            '<draw:connector draw:name="Link 1" draw:id="L" draw:type="line" '
            'draw:start-shape="A" draw:end-shape="B" svg:x1="1cm" svg:y1="1cm" svg:x2="5cm" svg:y2="1cm"/>'
            '</draw:page></office:presentation></office:body></office:document>'
        )
        slide = (
            '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
            'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree>'
            '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>'
            '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Node A"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr/></p:sp>'
            '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Node B"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr/></p:sp>'
            '<p:sp><p:nvSpPr><p:cNvPr id="4" name="Link 1"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr/></p:sp>'
            '</p:spTree></p:cSld></p:sld>'
        )
        patched = patcher._apply_slides_native_connectors_from_fodp(make_pptx(slide), fodp)
        xml = patched["ppt/slides/slide1.xml"]
        self.assertIn("<p:cxnSp>", xml)
        self.assertIn('<a:stCxn id="2" idx="0"/>', xml)
        self.assertIn('<a:endCxn id="3" idx="0"/>', xml)

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
