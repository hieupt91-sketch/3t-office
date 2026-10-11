from __future__ import annotations

import io
import unittest
import xml.etree.ElementTree as ET
import zipfile

from adapters.libreoffice.common import ooxml_zip_patch as patcher


PRESENTATION_XML = (
    '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    '<p:sldIdLst><p:sldId id="256" r:id="rId1"/><p:sldId id="257" r:id="rId2"/></p:sldIdLst>'
    '<p:sldSz cx="12192000" cy="6858000"/></p:presentation>'
)
SLIDE_XML = (
    '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
    '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
    '<p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="2" name="User shape"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
    '<p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>KEEP</a:t></a:r></a:p></p:txBody></p:sp>'
    '</p:spTree></p:cSld></p:sld>'
)
FODP = '''<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
 xmlns:vno="urn:vn-office:slides:1.0">
 <office:body><office:presentation>
  <draw:page draw:name="page1">
   <draw:frame presentation:class="date-time" vno:date-format="dd/MM/yyyy"><draw:text-box><text:p><presentation:date-time>12/10/2026</presentation:date-time></text:p></draw:text-box></draw:frame>
   <draw:frame presentation:class="page-number"><draw:text-box><text:p><text:page-number>1</text:page-number></text:p></draw:text-box></draw:frame>
   <draw:frame presentation:class="footer"><draw:text-box><text:p>Footer &amp; legal</text:p></draw:text-box></draw:frame>
  </draw:page>
  <draw:page draw:name="page2"/>
 </office:presentation></office:body>
</office:document>'''


def make_pptx() -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("ppt/presentation.xml", PRESENTATION_XML)
        package.writestr("ppt/slides/slide1.xml", SLIDE_XML)
        package.writestr("ppt/slides/slide2.xml", SLIDE_XML)
    return buffer.getvalue()


class SlidesPptxHeaderFooterTests(unittest.TestCase):
    def test_postprocess_writes_only_applied_native_placeholders_and_is_idempotent(self):
        original = make_pptx()
        patched = patcher.postprocess_slides_pptx(original, source_fodp=FODP)
        self.assertNotEqual(patched, original)
        slide1 = patcher.read_zip_entry(patched, "ppt/slides/slide1.xml").decode("utf-8")
        slide2 = patcher.read_zip_entry(patched, "ppt/slides/slide2.xml").decode("utf-8")
        for placeholder in ("dt", "sldNum", "ftr"):
            self.assertIn(f'<p:ph type="{placeholder}"', slide1)
        self.assertIn('type="datetimeFigureOut"', slide1)
        self.assertIn("Footer &amp; legal", slide1)
        self.assertIn("KEEP", slide1)
        self.assertNotRegex(slide2, r'<p:ph\b')
        ET.fromstring(slide1)
        ET.fromstring(slide2)
        self.assertEqual(patcher.postprocess_slides_pptx(patched, source_fodp=FODP), patched)

    def test_no_fodp_fields_leaves_pptx_unchanged(self):
        original = make_pptx()
        empty_fodp = FODP.replace(FODP[FODP.index('   <draw:frame presentation:class="date-time"'):FODP.index('  </draw:page>')], "")
        self.assertEqual(patcher.postprocess_slides_pptx(original, source_fodp=empty_fodp), original)


if __name__ == "__main__":
    unittest.main()
