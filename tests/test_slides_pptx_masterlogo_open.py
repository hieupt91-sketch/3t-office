"""Slides open overlay: File → Mở restores VNOfficeMasterLogo onto FODP.

No native file dialog. Builds a real PPTX ZIP with the Phase 2b named
shape, mocks soffice PPTX→FODP (which drops vno:master-theme), then calls
VnOfficeApi.open_document_dialog(). Optional integration runs the same
path through soffice when it is installed.
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

LO_MASTER_XML = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
    "<p:cSld><p:spTree>"
    '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>'
    '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
    "<p:sp><p:nvSpPr><p:cNvPr id=\"2\" name=\"PlaceHolder 1\"/><p:cNvSpPr/>"
    "<p:nvPr><p:ph type=\"title\"/></p:nvPr></p:nvSpPr>"
    "<p:spPr><a:xfrm><a:off x=\"504000\" y=\"226080\"/>"
    "<a:ext cx=\"9071640\" cy=\"946440\"/></a:xfrm></p:spPr>"
    "<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Title</a:t></a:r></a:p></p:txBody>"
    "</p:sp></p:spTree></p:cSld></p:sldMaster>"
)

LO_PRESENTATION_XML = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    '<p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>'
    '<p:sldSz cx="10080625" cy="5670550"/>'
    "</p:presentation>"
)

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

LO_FODP = f"""<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:master-styles>
    <style:master-page style:name="Default" style:page-layout-name="PM1" draw:style-name="dp1">
      <draw:custom-shape draw:name="VNOfficeMasterLogo">
        <text:p><text:span>{LOGO}</text:span></text:p>
      </draw:custom-shape>
    </style:master-page>
  </office:master-styles>
  <office:body><office:presentation>
    <draw:page draw:name="Mo dau">
      <draw:frame presentation:class="title"><draw:text-box><text:p>Mo dau</text:p></draw:text-box></draw:frame>
    </draw:page>
  </office:presentation></office:body>
</office:document>
"""

FODP_NO_MASTER_PAGE = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:body><office:presentation><draw:page draw:name="Mo dau"/></office:presentation></office:body>
</office:document>
"""


def _patched_master(logo_text: str = LOGO) -> str:
    return patcher.apply_master_logo_shape(
        LO_MASTER_XML,
        logo_text=logo_text,
        accent_color="#b53818",
        font_family="Times New Roman",
        slide_cx=10080625,
        slide_cy=5670550,
    )


def _fake_pptx(master_xml: str | None = None) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
        package.writestr("ppt/presentation.xml", LO_PRESENTATION_XML)
        package.writestr(
            "ppt/slideMasters/slideMaster1.xml",
            master_xml if master_xml is not None else _patched_master(),
        )
        package.writestr("ppt/slides/slide1.xml", '<?xml version="1.0"?><p:sld/>')
    return buffer.getvalue()


class SlidesPptxMasterLogoOpenTests(unittest.TestCase):
    def test_overlay_stamps_vno_master_theme_from_named_shape(self):
        master = _patched_master()
        self.assertFalse(patcher.fodp_has_master_logo(LO_FODP))
        overlaid = patcher.overlay_fodp_master_logo(LO_FODP, master)
        parsed = patcher.parse_master_logo_from_fodp(overlaid)
        self.assertEqual(parsed["logoText"], LOGO)
        self.assertEqual(parsed["accentColor"], "#b53818")
        self.assertEqual(parsed["fontFamily"], "Times New Roman")
        self.assertIn('xmlns:vno="urn:vn-office:slides:1.0"', overlaid)
        self.assertIn("Mo dau", overlaid)

    def test_overlay_noop_when_pptx_has_no_named_logo(self):
        overlaid = patcher.overlay_fodp_master_logo(LO_FODP, LO_MASTER_XML)
        self.assertEqual(overlaid, LO_FODP)
        self.assertFalse(patcher.fodp_has_master_logo(overlaid))

    def test_overlay_slides_pptx_fodp_reads_zip_via_shared_helper(self):
        pptx = _fake_pptx()
        overlaid = patcher.overlay_slides_pptx_fodp(pptx, LO_FODP)
        self.assertTrue(patcher.fodp_has_master_logo(overlaid))
        entry = patcher.read_zip_entry(pptx, "ppt/slideMasters/slideMaster1.xml")
        self.assertIsNotNone(entry)
        self.assertIn(b"VNOfficeMasterLogo", entry)

    def test_overlay_throws_when_named_shape_is_ambiguous(self):
        one = _patched_master()
        named = next(sp for sp in patcher.find_named_logo_shapes(one))
        dup = one.replace("</p:spTree>", f"{named}</p:spTree>")
        with self.assertRaises(ValueError) as ctx:
            patcher.overlay_fodp_master_logo(LO_FODP, dup)
        self.assertIn("không đoán", str(ctx.exception))

        with self.assertRaises(ValueError) as ctx:
            patcher.overlay_fodp_master_logo(FODP_NO_MASTER_PAGE, one)
        self.assertIn("master-page", str(ctx.exception))

    def test_open_document_dialog_overlays_fodp_before_returning_content(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            pptx_path = Path(temp_dir) / "BaiChieu.pptx"
            pptx_path.write_bytes(_fake_pptx())
            api = main.VnOfficeApi("slides", str(pptx_path))

            def fake_convert(src_path, target_ext, out_dir, app_kind=None):
                self.assertTrue(src_path.endswith("BaiChieu.pptx"))
                self.assertEqual((target_ext, app_kind), ("fodp", "slides"))
                output = Path(out_dir) / "BaiChieu.fodp"
                output.write_text(LO_FODP, encoding="utf-8")
                return str(output)

            with patch.object(main, "_run_soffice_convert", side_effect=fake_convert):
                with patch.object(main, "_active_window", return_value=None):
                    result = api.open_document_dialog("slides")

        self.assertEqual(result.get("status"), "ok", result)
        content = result.get("content") or ""
        parsed = patcher.parse_master_logo_from_fodp(content)
        self.assertEqual(parsed["logoText"], LOGO)
        self.assertEqual(parsed["accentColor"], "#b53818")
        self.assertIn("VNOfficeMasterLogo", result.get("ooxmlSlideMasterXml") or "")

    def test_open_pptx_without_logo_does_not_invent_theme(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            pptx_path = Path(temp_dir) / "Trong.pptx"
            pptx_path.write_bytes(_fake_pptx(LO_MASTER_XML))
            api = main.VnOfficeApi("slides", str(pptx_path))

            def fake_convert(src_path, target_ext, out_dir, app_kind=None):
                output = Path(out_dir) / f"{Path(src_path).stem}.fodp"
                output.write_text(LO_FODP, encoding="utf-8")
                return str(output)

            with patch.object(main, "_run_soffice_convert", side_effect=fake_convert):
                result = api.open_document_dialog("slides")

        self.assertEqual(result.get("status"), "ok", result)
        self.assertFalse(patcher.fodp_has_master_logo(result.get("content") or ""))

    def test_open_document_dialog_errors_when_logo_cannot_be_identified(self):
        one = _patched_master()
        named = next(sp for sp in patcher.find_named_logo_shapes(one))
        dup = one.replace("</p:spTree>", f"{named}</p:spTree>")
        with tempfile.TemporaryDirectory() as temp_dir:
            pptx_path = Path(temp_dir) / "Lech.pptx"
            pptx_path.write_bytes(_fake_pptx(dup))
            api = main.VnOfficeApi("slides", str(pptx_path))

            def fake_convert(src_path, target_ext, out_dir, app_kind=None):
                output = Path(out_dir) / "Lech.fodp"
                output.write_text(LO_FODP, encoding="utf-8")
                return str(output)

            with patch.object(main, "_run_soffice_convert", side_effect=fake_convert):
                result = api.open_document_dialog("slides")

        self.assertEqual(result.get("status"), "error", result)
        self.assertIn("không đoán", result.get("message") or "")

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    def test_open_document_dialog_real_soffice_save_then_open_keeps_logo(self):
        """Lưu FODP→PPTX (Phase 2b) rồi Mở PPTX (overlay) qua open_document_dialog."""
        with tempfile.TemporaryDirectory() as temp_dir:
            fodp_path = Path(temp_dir) / "deck.fodp"
            fodp_path.write_text(FODP_WITH_LOGO, encoding="utf-8")
            pptx_path = Path(
                main._run_soffice_convert(str(fodp_path), "pptx", temp_dir, app_kind="slides")
            )
            patcher.postprocess_slides_pptx_file(str(pptx_path), fodp_path=str(fodp_path))
            master_xml = patcher.read_zip_entry(
                pptx_path.read_bytes(), "ppt/slideMasters/slideMaster1.xml"
            )
            self.assertIsNotNone(master_xml)
            self.assertTrue(
                patcher.master_has_logo_shape(master_xml.decode("utf-8"), LOGO)
            )

            api = main.VnOfficeApi("slides", str(pptx_path))
            with patch.object(main, "_active_window", return_value=None):
                result = api.open_document_dialog("slides")

        self.assertEqual(result.get("status"), "ok", result)
        content = result.get("content") or ""
        parsed = patcher.parse_master_logo_from_fodp(content)
        self.assertEqual(
            parsed["logoText"],
            LOGO,
            "Mở lại PPTX đã Lưu phải overlay vno:master-theme (LibreOffice convert không map ngược)",
        )
        self.assertEqual(parsed["accentColor"], "#b53818")
        self.assertEqual(parsed["fontFamily"], "Times New Roman")
        self.assertIn("VNOfficeMasterLogo", result.get("ooxmlSlideMasterXml") or "")


if __name__ == "__main__":
    unittest.main()
