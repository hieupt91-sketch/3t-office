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


if __name__ == "__main__":
    unittest.main()
