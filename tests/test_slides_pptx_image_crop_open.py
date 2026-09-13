"""Tests for Slides PPTX -> FODP image crop (a:srcRect -> vno:src-rect) overlay."""

import io
import unittest
import zipfile
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import main

SLIDE1_PICS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="6" name="Google Shape;60;p13"/>
          <p:cNvPicPr/>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="rId3"/>
          <a:srcRect b="0" l="43436" r="9328" t="2742"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr/>
      </p:pic>
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="7" name="Google Shape;61;p13"/>
          <p:cNvPicPr/>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="rId4"/>
          <a:srcRect b="1390" l="47051" r="17029" t="0"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr/>
      </p:pic>
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="8" name="Google Shape;62;p13"/>
          <p:cNvPicPr/>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="rId5"/>
          <a:srcRect b="0" l="10919" r="34234" t="0"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr/>
      </p:pic>
    </p:spTree>
  </p:cSld>
</p:sld>
"""

LO_FODP = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:body>
    <office:presentation>
      <draw:page draw:name="Slide 1">
        <draw:frame draw:name="Google Shape;60;p13" svg:width="5cm" svg:height="14cm">
          <draw:image/>
        </draw:frame>
        <draw:frame draw:name="Google Shape;61;p13" svg:width="5cm" svg:height="14cm">
          <draw:image/>
        </draw:frame>
        <draw:frame draw:name="Google Shape;62;p13" svg:width="5cm" svg:height="14cm">
          <draw:image/>
        </draw:frame>
      </draw:page>
    </office:presentation>
  </office:body>
</office:document>
"""


class TestSlidesPptxImageCropOpen(unittest.TestCase):
    def setUp(self):
        self.patcher = main._ooxml_zip_patch()

    def test_parse_slide_image_crops_extracts_all_3_pics(self):
        crops = self.patcher.parse_slide_image_crops(SLIDE1_PICS_XML)
        self.assertEqual(len(crops), 3)
        self.assertEqual(crops["Google Shape;60;p13"], "43.436,2.742,9.328,0")
        self.assertEqual(crops["Google Shape;61;p13"], "47.051,0,17.029,1.39")
        self.assertEqual(crops["Google Shape;62;p13"], "10.919,0,34.234,0")

    def test_apply_fodp_image_crops_stamps_vno_src_rect(self):
        crops = self.patcher.parse_slide_image_crops(SLIDE1_PICS_XML)
        overlaid = self.patcher.apply_fodp_image_crops(LO_FODP, [crops])
        self.assertIn('vno:src-rect="43.436,2.742,9.328,0"', overlaid)
        self.assertIn('vno:src-rect="47.051,0,17.029,1.39"', overlaid)
        self.assertIn('vno:src-rect="10.919,0,34.234,0"', overlaid)
        self.assertIn('xmlns:vno=', overlaid)

    def test_overlay_slides_pptx_fodp_full_zip(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr(
                "ppt/presentation.xml",
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
                'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
                '<p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst>'
                '</p:presentation>',
            )
            z.writestr(
                "ppt/_rels/presentation.xml.rels",
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>'
                '</Relationships>',
            )
            z.writestr("ppt/slides/slide1.xml", SLIDE1_PICS_XML)
            z.writestr(
                "ppt/slideMasters/slideMaster1.xml",
                '<?xml version="1.0" encoding="UTF-8"?><p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree/></p:cSld></p:sldMaster>',
            )

        overlaid = self.patcher.overlay_slides_pptx_fodp(buf.getvalue(), LO_FODP)
        self.assertIn('vno:src-rect="43.436,2.742,9.328,0"', overlaid)
        self.assertIn('vno:src-rect="47.051,0,17.029,1.39"', overlaid)
        self.assertIn('vno:src-rect="10.919,0,34.234,0"', overlaid)

    def test_overlay_multiple_slides_preserves_per_page_crops(self):
        """3 pages, each with 1 image having distinct srcRect -> each draw:page gets its own vno:src-rect."""
        def make_slide_xml(pic_name, l, t, r, b):
            return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="1" name="{pic_name}"/>
          <p:cNvPicPr/>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="rId1"/>
          <a:srcRect l="{l}" t="{t}" r="{r}" b="{b}"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr/>
      </p:pic>
    </p:spTree>
  </p:cSld>
</p:sld>
"""
        s1_xml = make_slide_xml("Pic1", 10000, 5000, 0, 0)
        s2_xml = make_slide_xml("Pic2", 0, 20000, 15000, 0)
        s3_xml = make_slide_xml("Pic3", 0, 0, 25000, 30000)

        multi_fodp = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:body>
    <office:presentation>
      <draw:page draw:name="Slide 1">
        <draw:frame draw:name="Pic1" svg:width="5cm" svg:height="5cm">
          <draw:image/>
        </draw:frame>
      </draw:page>
      <draw:page draw:name="Slide 2">
        <draw:frame draw:name="Pic2" svg:width="5cm" svg:height="5cm">
          <draw:image/>
        </draw:frame>
      </draw:page>
      <draw:page draw:name="Slide 3">
        <draw:frame draw:name="Pic3" svg:width="5cm" svg:height="5cm">
          <draw:image/>
        </draw:frame>
      </draw:page>
    </office:presentation>
  </office:body>
</office:document>
"""

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr(
                "ppt/presentation.xml",
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
                'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
                '<p:sldIdLst>'
                '<p:sldId id="256" r:id="rId1"/>'
                '<p:sldId id="257" r:id="rId2"/>'
                '<p:sldId id="258" r:id="rId3"/>'
                '</p:sldIdLst>'
                '</p:presentation>',
            )
            z.writestr(
                "ppt/_rels/presentation.xml.rels",
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>'
                '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>'
                '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide3.xml"/>'
                '</Relationships>',
            )
            z.writestr("ppt/slides/slide1.xml", s1_xml)
            z.writestr("ppt/slides/slide2.xml", s2_xml)
            z.writestr("ppt/slides/slide3.xml", s3_xml)

        overlaid = self.patcher.overlay_slides_pptx_fodp(buf.getvalue(), multi_fodp)

        # Verify page 1 gets rect for Pic1
        page1_content = overlaid.split('<draw:page draw:name="Slide 2">')[0]
        self.assertIn('vno:src-rect="10,5,0,0"', page1_content)
        self.assertNotIn('vno:src-rect="0,20,15,0"', page1_content)
        self.assertNotIn('vno:src-rect="0,0,25,30"', page1_content)

        # Verify page 2 gets rect for Pic2
        page2_content = overlaid.split('<draw:page draw:name="Slide 2">')[1].split('<draw:page draw:name="Slide 3">')[0]
        self.assertIn('vno:src-rect="0,20,15,0"', page2_content)
        self.assertNotIn('vno:src-rect="10,5,0,0"', page2_content)
        self.assertNotIn('vno:src-rect="0,0,25,30"', page2_content)

        # Verify page 3 gets rect for Pic3
        page3_content = overlaid.split('<draw:page draw:name="Slide 3">')[1]
        self.assertIn('vno:src-rect="0,0,25,30"', page3_content)
        self.assertNotIn('vno:src-rect="10,5,0,0"', page3_content)
        self.assertNotIn('vno:src-rect="0,20,15,0"', page3_content)


if __name__ == "__main__":
    unittest.main()

