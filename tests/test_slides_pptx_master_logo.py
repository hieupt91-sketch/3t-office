"""Slides Phase 2b: File → Lưu PPTX post-process inserts master logo p:sp.

No native file dialog. Builds a real PPTX ZIP shaped like LibreOffice
output, mocks soffice FODP→PPTX, then calls VnOfficeApi.save_document_dialog().
"""

from __future__ import annotations

import io
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

import main

patcher = main._ooxml_zip_patch()

LOGO = "VN OFFICE • SANG TAO"

LO_MASTER_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id="2" name="PlaceHolder 1"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="504000" y="226080"/><a:ext cx="9071640" cy="946440"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Title</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sldMaster>"""

LO_PRESENTATION_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldSz cx="10080625" cy="5670550"/></p:presentation>"""

FODP_WITH_LOGO = f"""<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 xmlns:vno="urn:vn-office:slides:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:master-styles>
    <style:master-page style:name="Standard" vno:master-theme="{{&quot;logoText&quot;:&quot;{LOGO}&quot;,&quot;accentColor&quot;:&quot;#b53818&quot;,&quot;fontFamily&quot;:&quot;Times New Roman&quot;}}">
      <draw:frame draw:style-name="grMasterLogo"><draw:text-box><text:p>{LOGO}</text:p></draw:text-box></draw:frame>
    </style:master-page>
  </office:master-styles>
  <office:body><office:presentation>
    <draw:page draw:name="page1"><draw:frame presentation:class="title"><draw:text-box><text:p>Mo dau</text:p></draw:text-box></draw:frame></draw:page>
  </office:presentation></office:body>
</office:document>
"""

FODP_NO_LOGO = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:master-styles><style:master-page style:name="Standard"/></office:master-styles>
  <office:body><office:presentation><draw:page draw:name="page1"/></office:presentation></office:body>
</office:document>
"""


def _fake_pptx(master_xml: str = LO_MASTER_XML) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
        package.writestr("ppt/presentation.xml", LO_PRESENTATION_XML)
        package.writestr("ppt/slideMasters/slideMaster1.xml", master_xml)
        package.writestr("ppt/slides/slide1.xml", '<?xml version="1.0"?><p:sld/>')
    return buffer.getvalue()


class SlidesPptxMasterLogoTests(unittest.TestCase):
    def test_parse_logo_from_fodp_theme(self):
        parsed = patcher.parse_master_logo_from_fodp(FODP_WITH_LOGO)
        self.assertEqual(parsed["logoText"], LOGO)
        self.assertEqual(parsed["accentColor"], "#b53818")
        self.assertTrue(patcher.fodp_has_master_logo(FODP_WITH_LOGO))
        self.assertFalse(patcher.fodp_has_master_logo(FODP_NO_LOGO))

    def test_apply_inserts_non_placeholder_shape(self):
        next_xml = patcher.apply_master_logo_shape(
            LO_MASTER_XML,
            logo_text=LOGO,
            accent_color="#b53818",
            font_family="Times New Roman",
            slide_cx=10080625,
            slide_cy=5670550,
        )
        self.assertTrue(patcher.master_has_logo_shape(next_xml, LOGO))
        self.assertIn('name="VNOfficeMasterLogo"', next_xml)
        self.assertIn("<p:nvPr/>", next_xml)
        self.assertIn(f"<a:t>{LOGO}</a:t>", next_xml)
        self.assertIn('id="3"', next_xml)  # probe fixture here only uses ids 1–2
        self.assertNotRegex(
            next_xml[next_xml.find("VNOfficeMasterLogo") : next_xml.find("VNOfficeMasterLogo") + 400],
            r"<p:ph\b",
        )

    def test_postprocess_pptx_zip_and_noop(self):
        original = _fake_pptx()
        patched = patcher.postprocess_slides_pptx(original, source_fodp=FODP_WITH_LOGO)
        entry = patcher.read_zip_entry(patched, "ppt/slideMasters/slideMaster1.xml")
        self.assertIsNotNone(entry)
        self.assertIn(LOGO.encode("utf-8"), entry)
        unchanged = patcher.postprocess_slides_pptx(original, source_fodp=FODP_NO_LOGO)
        self.assertEqual(unchanged, original)

    def test_save_document_dialog_patches_pptx_after_convert(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            dest = Path(temp_dir) / "BaiChieu.pptx"

            def fake_convert(src_path, target_ext, out_dir, app_kind=None):
                self.assertTrue(src_path.endswith("draft.fodp"))
                self.assertEqual((target_ext, app_kind), ("pptx", "slides"))
                output = Path(out_dir) / "draft.pptx"
                output.write_bytes(_fake_pptx())
                return str(output)

            api = main.VnOfficeApi("slides")
            with patch.object(main, "_run_soffice_convert", side_effect=fake_convert), patch.object(
                main, "_active_window", return_value=type(
                    "W",
                    (),
                    {"create_file_dialog": staticmethod(lambda *args, **kwargs: str(dest))},
                )(),
            ):
                result = api.save_document_dialog(
                    FODP_WITH_LOGO, app_kind="slides", target_format="pptx", suggested_name="BaiChieu"
                )

            self.assertEqual(result["status"], "ok")
            self.assertTrue(dest.is_file())
            entry = patcher.read_zip_entry(dest.read_bytes(), "ppt/slideMasters/slideMaster1.xml")
            self.assertIsNotNone(entry)
            self.assertIn(LOGO.encode("utf-8"), entry)
            self.assertIn(b'name="VNOfficeMasterLogo"', entry)


if __name__ == "__main__":
    unittest.main()
