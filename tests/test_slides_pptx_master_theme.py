"""Slide Master theme IDs survive the production PPTX save/open patch path."""

from __future__ import annotations

import io
import unittest
import zipfile

import main

patcher = main._ooxml_zip_patch()

MASTER_XML = (
    '<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
    '<p:cSld><p:spTree/></p:cSld></p:sldMaster>'
)
FODP = (
    '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
    'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" '
    'xmlns:vno="urn:vn-office:slides:1.0">'
    '<office:master-styles><style:master-page style:name="Standard" '
    'vno:master-theme="{&quot;id&quot;:&quot;minimal-dark&quot;}"/></office:master-styles>'
    '</office:document>'
)


def make_pptx(master_xml: str) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("ppt/presentation.xml", '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldSz cx="10080625" cy="5670550"/></p:presentation>')
        package.writestr("ppt/slideMasters/slideMaster1.xml", master_xml)
        package.writestr("ppt/slides/slide1.xml", '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>')
    return buffer.getvalue()


class SlidesPptxMasterThemeTests(unittest.TestCase):
    def test_save_stamps_theme_id_and_open_overlay_restores_it(self):
        self.assertEqual(patcher.parse_master_theme_id_from_fodp(FODP), "minimal-dark")
        stamped = patcher.postprocess_slides_pptx(make_pptx(MASTER_XML), source_fodp=FODP)
        with zipfile.ZipFile(io.BytesIO(stamped)) as package:
            master = package.read("ppt/slideMasters/slideMaster1.xml").decode("utf-8")
        self.assertEqual(patcher.parse_master_theme_id(master), "minimal-dark")

        restored = patcher.overlay_fodp_master_theme_id(FODP.replace('vno:master-theme="{&quot;id&quot;:&quot;minimal-dark&quot;}"', ""), [master])
        self.assertEqual(patcher.parse_master_theme_id_from_fodp(restored), "minimal-dark")

    def test_native_theme_name_palette_and_typefaces_roundtrip_through_theme_part(self):
        theme = '''<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office">
          <a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
          <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="222222"/></a:dk2>
          <a:lt2><a:srgbClr val="EEEEEE"/></a:lt2><a:accent1><a:srgbClr val="0000FF"/></a:accent1></a:clrScheme>
          <a:fontScheme name="Office"><a:majorFont><a:latin typeface="Arial"/></a:majorFont>
          <a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme></a:themeElements></a:theme>'''
        payload = {
            "id": "minimal-dark", "name": "Than Chì Hiện Đại", "fontFamily": "Inter, sans-serif",
            "titleColor": "#F8FAFC", "bodyColor": "#CBD5E1", "accentColor": "#38BDF8", "bgColor": "#0F172A"
        }
        fodp = FODP.replace(
            '{&quot;id&quot;:&quot;minimal-dark&quot;}',
            '{&quot;id&quot;:&quot;minimal-dark&quot;,&quot;name&quot;:&quot;Than Chì Hiện Đại&quot;,&quot;fontFamily&quot;:&quot;Inter, sans-serif&quot;,&quot;titleColor&quot;:&quot;#F8FAFC&quot;,&quot;bodyColor&quot;:&quot;#CBD5E1&quot;,&quot;accentColor&quot;:&quot;#38BDF8&quot;,&quot;bgColor&quot;:&quot;#0F172A&quot;}'
        )
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
            package.writestr("ppt/presentation.xml", '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldSz cx="10080625" cy="5670550"/></p:presentation>')
            package.writestr("ppt/slideMasters/slideMaster1.xml", MASTER_XML)
            package.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>')
            package.writestr("ppt/theme/theme1.xml", theme)
            package.writestr("ppt/slides/slide1.xml", '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>')

        patched = patcher.postprocess_slides_pptx(buffer.getvalue(), source_fodp=fodp)
        with zipfile.ZipFile(io.BytesIO(patched)) as package:
            updated = package.read("ppt/theme/theme1.xml").decode()
        self.assertIn('name="Than Chì Hiện Đại"', updated)
        self.assertIn('<a:dk1><a:srgbClr val="CBD5E1"/></a:dk1>', updated)
        self.assertIn('<a:lt1><a:srgbClr val="0F172A"/></a:lt1>', updated)
        self.assertIn('<a:accent1><a:srgbClr val="38BDF8"/></a:accent1>', updated)
        self.assertIn('<a:latin typeface="Inter"/>', updated)

        reopened = patcher.overlay_fodp_native_slides_theme(fodp.replace('Than Chì Hiện Đại', 'old'), patched)
        metadata = patcher._parse_master_theme_payload_from_fodp(reopened)
        self.assertEqual(metadata["id"], "minimal-dark")
        self.assertEqual(metadata["name"], "Than Chì Hiện Đại")
        self.assertEqual(metadata["accentColor"], "#38BDF8")
        self.assertEqual(metadata["fontFamily"], "Inter")


if __name__ == "__main__":
    unittest.main()
