"""Native slide-layout type and relationship preservation for VN Slides."""
from __future__ import annotations

import io
import unittest
import zipfile

import main

patcher = main._ooxml_zip_patch()
P = "http://schemas.openxmlformats.org/presentationml/2006/main"
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout"


def make_two_column_pptx() -> bytes:
    slide = f'''<p:sld xmlns:p="{P}"><p:cSld><p:spTree>
      <p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr></p:sp>
      <p:sp><p:nvSpPr><p:cNvPr id="3" name="Left"/><p:nvPr><p:ph/></p:nvPr></p:nvSpPr></p:sp>
      <p:sp><p:nvSpPr><p:cNvPr id="4" name="Right"/><p:nvPr><p:ph/></p:nvPr></p:nvSpPr></p:sp>
    </p:spTree></p:cSld></p:sld>'''
    layout = f'''<p:sldLayout xmlns:p="{P}" type="twoObj"><p:cSld><p:spTree>
      <p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr></p:sp>
      <p:sp><p:nvSpPr><p:cNvPr id="3" name="Left"/><p:nvPr><p:ph/></p:nvPr></p:nvSpPr></p:sp>
      <p:sp><p:nvSpPr><p:cNvPr id="4" name="Right"/><p:nvPr><p:ph/></p:nvPr></p:nvSpPr></p:sp>
    </p:spTree></p:cSld></p:sldLayout>'''
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("ppt/slides/slide1.xml", slide)
        package.writestr("ppt/slides/_rels/slide1.xml.rels", f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="{REL}" Target="../slideLayouts/slideLayout1.xml"/></Relationships>')
        package.writestr("ppt/slideLayouts/slideLayout1.xml", layout)
    return buffer.getvalue()


class SlidesPptxLayoutTests(unittest.TestCase):
    def test_two_content_uses_two_column_text_layout_and_associated_body_placeholders(self):
        fodp = '<office:document><draw:page presentation:presentation-page-layout-name="VNOTwoContent"/></office:document>'
        patched = patcher.postprocess_slides_pptx(make_two_column_pptx(), source_fodp=fodp)
        with zipfile.ZipFile(io.BytesIO(patched)) as package:
            layout = package.read("ppt/slideLayouts/slideLayout1.xml").decode()
            slide = package.read("ppt/slides/slide1.xml").decode()
            rels = package.read("ppt/slides/_rels/slide1.xml.rels").decode()
        self.assertIn('type="twoColTx"', layout)
        self.assertEqual(layout.count('type="body" idx="'), 2)
        self.assertEqual(slide.count('type="body" idx="'), 2)
        self.assertIn('Target="../slideLayouts/slideLayout1.xml"', rels)

    def test_imported_layout_without_vn_layout_marker_remains_unchanged(self):
        original = make_two_column_pptx()
        self.assertIs(patcher.postprocess_slides_pptx(original, source_fodp="<office:document/>"), original)


if __name__ == "__main__":
    unittest.main()
