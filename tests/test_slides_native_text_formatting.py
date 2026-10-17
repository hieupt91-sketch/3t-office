"""Text formatting (font consistency and hyperlink preservation) in slides PPTX export (Item j)."""
from __future__ import annotations

import io
import unittest
import zipfile

import main

patcher = main._ooxml_zip_patch()


def make_pptx(slide_xml: str, rels_xml: str | None = None) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
        package.writestr("ppt/presentation.xml", '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>')
        package.writestr("ppt/slides/slide1.xml", slide_xml)
        if rels_xml:
            package.writestr("ppt/slides/_rels/slide1.xml.rels", rels_xml)
    return buffer.getvalue()


class NativeTextFormattingTests(unittest.TestCase):
    def test_end_para_rpr_matches_run_typeface(self):
        src_slide = (
            '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
            '<p:cSld><p:spTree>'
            '<p:sp>'
            '<p:nvSpPr><p:cNvPr id="7" name="Lvl"/><p:cNvSpPr txBox="1"/></p:nvSpPr>'
            '<p:txBody><a:bodyPr/><a:p><a:r><a:rPr><a:latin typeface="Georgia"/></a:rPr><a:t>Muc 1</a:t></a:r></a:p></p:txBody>'
            '</p:sp>'
            '</p:spTree></p:cSld></p:sld>'
        )
        target_slide = (
            '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
            '<p:cSld><p:spTree>'
            '<p:sp>'
            '<p:nvSpPr><p:cNvPr id="7" name="Lvl"/><p:cNvSpPr txBox="1"/></p:nvSpPr>'
            '<p:txBody><a:bodyPr/><a:p><a:r><a:rPr><a:latin typeface="Georgia"/></a:rPr><a:t>Muc 1</a:t></a:r><a:endParaRPr><a:latin typeface="Arial"/></a:endParaRPr></a:p></p:txBody>'
            '</p:sp>'
            '</p:spTree></p:cSld></p:sld>'
        )
        src_pptx = make_pptx(src_slide)
        target_pptx = make_pptx(target_slide)

        repls = patcher._apply_slides_native_text_formatting(target_pptx, source_pptx=src_pptx)
        self.assertIn("ppt/slides/slide1.xml", repls)
        patched_xml = repls["ppt/slides/slide1.xml"]
        self.assertIn('<a:endParaRPr><a:latin typeface="Georgia"/></a:endParaRPr>', patched_xml)

    def test_hyperlink_on_run_is_restored_with_relationship(self):
        src_slide = (
            '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<p:cSld><p:spTree>'
            '<p:sp>'
            '<p:nvSpPr><p:cNvPr id="7" name="Lvl"/><p:cNvSpPr txBox="1"/></p:nvSpPr>'
            '<p:txBody><a:bodyPr/><a:p><a:r><a:rPr><a:hlinkClick r:id="rId4" action="ppaction://hlinksldjump"/></a:rPr><a:t>Muc 4</a:t></a:r></a:p></p:txBody>'
            '</p:sp>'
            '</p:spTree></p:cSld></p:sld>'
        )
        src_rels = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slide2.xml"/>'
            '</Relationships>'
        )
        target_slide = (
            '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<p:cSld><p:spTree>'
            '<p:sp>'
            '<p:nvSpPr><p:cNvPr id="7" name="Lvl"/><p:cNvSpPr txBox="1"/></p:nvSpPr>'
            '<p:txBody><a:bodyPr/><a:p><a:r><a:rPr/><a:t>Muc 4</a:t></a:r></a:p></p:txBody>'
            '</p:sp>'
            '</p:spTree></p:cSld></p:sld>'
        )
        target_rels = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>'
            '</Relationships>'
        )
        src_pptx = make_pptx(src_slide, src_rels)
        target_pptx = make_pptx(target_slide, target_rels)

        repls = patcher._apply_slides_native_text_formatting(target_pptx, source_pptx=src_pptx)
        self.assertIn("ppt/slides/slide1.xml", repls)
        self.assertIn("ppt/slides/_rels/slide1.xml.rels", repls)
        patched_slide = repls["ppt/slides/slide1.xml"]
        patched_rels = repls["ppt/slides/_rels/slide1.xml.rels"]
        self.assertIn('<a:hlinkClick r:id="rId4" action="ppaction://hlinksldjump"/>', patched_slide)
        self.assertIn('Target="slide2.xml"', patched_rels)


if __name__ == "__main__":
    unittest.main()
