"""G8 D5: new VN Slides decks must get PowerPoint's exact preset <p:sldSz>.

PowerPoint 2016 (measured via COM, 30/09/2026): new Widescreen deck writes
<p:sldSz cx="12192000" cy="6858000"/>; Standard (4:3) writes
<p:sldSz cx="9144000" cy="6858000" type="screen4x3"/>. VN Slides writes the FODP
page size in pt (1 pt = 12700 EMU) plus vno:sld-type; soffice rounds it
(e.g. 12192120) so the post-process must restore it to the EMU and set type.
Before the fix the page size was written in cm (3 decimals) and differences
under 1000 EMU were ignored -> PowerPoint showed a "Custom" slide size.
"""

from __future__ import annotations

import io
import unittest
import zipfile

import main

patcher = main._ooxml_zip_patch()


def _fodp(width: str, height: str, sld_type: str | None) -> str:
    type_attr = f' vno:sld-type="{sld_type}"' if sld_type else ""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
 xmlns:vno="urn:vn-office:slides:1.0">
  <office:automatic-styles>
    <style:page-layout style:name="PM1">
      <style:page-layout-properties fo:page-width="{width}" fo:page-height="{height}" style:print-orientation="landscape"{type_attr}/>
    </style:page-layout>
  </office:automatic-styles>
  <office:master-styles><style:master-page style:name="Standard" style:page-layout-name="PM1"/></office:master-styles>
  <office:body><office:presentation><draw:page draw:name="page1" draw:master-page-name="Standard"/></office:presentation></office:body>
</office:document>"""


def _pptx(sld_sz: str) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
        package.writestr("ppt/presentation.xml", f'<?xml version="1.0"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">{sld_sz}</p:presentation>')
        package.writestr("ppt/presProps.xml", '<?xml version="1.0"?><p:presentationPr xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>')
    return buffer.getvalue()


def _sld_sz(pptx: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(pptx)) as package:
        xml = package.read("ppt/presentation.xml").decode("utf-8")
    start = xml.index("<p:sldSz")
    return xml[start:xml.index(">", start) + 1]


class ExactSlideSizeTests(unittest.TestCase):
    def test_widescreen_pt_is_exact_emu_without_type(self):
        size = patcher.parse_intended_slide_size_from_fodp(_fodp("960pt", "540pt", None))
        self.assertEqual(size, {"cx": 12192000, "cy": 6858000, "type": ""})

    def test_standard_4x3_pt_has_screen4x3_type(self):
        size = patcher.parse_intended_slide_size_from_fodp(_fodp("720pt", "540pt", "screen4x3"))
        self.assertEqual(size, {"cx": 9144000, "cy": 6858000, "type": "screen4x3"})

    def test_postprocess_restores_exact_widescreen_from_soffice_rounding(self):
        patched = patcher.postprocess_slides_pptx(_pptx('<p:sldSz cx="12192120" cy="6858000"/>'), source_fodp=_fodp("960pt", "540pt", None))
        self.assertEqual(_sld_sz(patched), '<p:sldSz cx="12192000" cy="6858000"/>')

    def test_postprocess_writes_standard_4x3_like_powerpoint(self):
        patched = patcher.postprocess_slides_pptx(_pptx('<p:sldSz cx="9144000" cy="6857999"/>'), source_fodp=_fodp("720pt", "540pt", "screen4x3"))
        self.assertEqual(_sld_sz(patched), '<p:sldSz cx="9144000" cy="6858000" type="screen4x3"/>')

    def test_postprocess_keeps_opened_file_size_to_the_emu(self):
        # real3/real4 sample decks: 10080625 x 5670550 EMU = 793.75 x 446.5 pt.
        patched = patcher.postprocess_slides_pptx(_pptx('<p:sldSz cx="10077480" cy="5667480"/>'), source_fodp=_fodp("793.75pt", "446.5pt", None))
        self.assertEqual(_sld_sz(patched), '<p:sldSz cx="10080625" cy="5670550"/>')

    def test_legacy_cm_fodp_keeps_old_tolerance_and_type(self):
        patched = patcher.postprocess_slides_pptx(_pptx('<p:sldSz cx="9144000" cy="5143320" type="screen16x9"/>'), source_fodp=_fodp("25.4cm", "14.287cm", None))
        self.assertIn('type="screen16x9"', _sld_sz(patched))


if __name__ == "__main__":
    unittest.main()
