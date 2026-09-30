"""Slides open overlay: File → Mở restores Set Up Show vno:* onto FODP.

No native file dialog. Builds a real PPTX ZIP with Phase 3b p:showPr,
mocks soffice PPTX→FODP (which drops vno:*), then calls
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

LO_PRESPROPS_XML = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    '<p:showPr loop="1" showNarration="1"></p:showPr>'
    "</p:presentationPr>"
)

PATCHED_PRESPROPS_XML = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    '<p:showPr loop="1" showNarration="0">'
    '<p:penClr><a:srgbClr val="112233"/></p:penClr>'
    "</p:showPr></p:presentationPr>"
)

LO_PRESENTATION_XML = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    '<p:sldIdLst>'
    '<p:sldId id="256" r:id="rId3"/>'
    '<p:sldId id="257" r:id="rId4"/>'
    '<p:sldId id="258" r:id="rId5"/>'
    "</p:sldIdLst>"
    '<p:sldSz cx="10080625" cy="5670550"/>'
    "</p:presentation>"
)

FODP_WITH_SETUP = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 xmlns:vno="urn:vn-office:slides:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:master-styles><style:master-page style:name="Standard"/></office:master-styles>
  <office:body><office:presentation>
    <draw:page draw:name="page1"/>
    <draw:page draw:name="page2"/>
    <draw:page draw:name="page3"/>
    <presentation:settings presentation:endless="true" vno:without-narration="true" vno:pointer-color="#112233"/>
  </office:presentation></office:body>
</office:document>
"""

LO_FODP = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:master-styles><style:master-page style:name="Default"/></office:master-styles>
  <office:body><office:presentation>
    <draw:page draw:name="Mo dau"/>
    <draw:page draw:name="Noi dung"/>
    <draw:page draw:name="Ket luan"/>
    <presentation:settings presentation:endless="true" presentation:pause="P0D" presentation:mouse-visible="false"/>
  </office:presentation></office:body>
</office:document>
"""


def _fake_pptx(pres_props_xml: str | None = None) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
        package.writestr("ppt/presentation.xml", LO_PRESENTATION_XML)
        package.writestr(
            "ppt/presProps.xml",
            pres_props_xml if pres_props_xml is not None else PATCHED_PRESPROPS_XML,
        )
        package.writestr(
            "ppt/slideMasters/slideMaster1.xml",
            '<?xml version="1.0"?><p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>',
        )
        for index in range(1, 4):
            package.writestr(f"ppt/slides/slide{index}.xml", '<?xml version="1.0"?><p:sld/>')
    return buffer.getvalue()


class SlidesPptxSetupShowOpenTests(unittest.TestCase):
    def test_overlay_stamps_vno_from_show_narration_and_pen(self):
        self.assertFalse(patcher.fodp_has_show_setup_patch(LO_FODP))
        overlaid = patcher.overlay_fodp_show_properties(LO_FODP, PATCHED_PRESPROPS_XML)
        parsed = patcher.parse_show_settings_from_fodp(overlaid)
        self.assertTrue(parsed["showWithoutNarration"])
        self.assertEqual(parsed["pointerColor"], "#112233")
        self.assertTrue(parsed["loopUntilEsc"])
        self.assertIn('xmlns:vno="urn:vn-office:slides:1.0"', overlaid)
        self.assertIn("Mo dau", overlaid)
        self.assertIn('presentation:pause="P0D"', overlaid)

    def test_overlay_noop_when_pptx_has_no_show_pr(self):
        empty = LO_PRESPROPS_XML.replace("<p:showPr loop=\"1\" showNarration=\"1\"></p:showPr>", "")
        overlaid = patcher.overlay_fodp_show_properties(LO_FODP, empty)
        self.assertEqual(overlaid, LO_FODP)
        self.assertFalse(patcher.fodp_has_show_setup_patch(overlaid))
        default_lo = patcher.overlay_fodp_show_properties(LO_FODP, LO_PRESPROPS_XML)
        self.assertEqual(default_lo, LO_FODP)

    def test_overlay_slides_pptx_fodp_reads_zip_via_shared_helper(self):
        pptx = _fake_pptx()
        overlaid = patcher.overlay_slides_pptx_fodp(pptx, LO_FODP)
        self.assertTrue(patcher.fodp_has_show_setup_patch(overlaid))
        entry = patcher.read_zip_entry(pptx, "ppt/presProps.xml")
        self.assertIsNotNone(entry)
        self.assertIn(b'showNarration="0"', entry)

    def test_overlay_throws_when_zip_is_corrupt(self):
        with self.assertRaises(ValueError) as ctx:
            patcher.overlay_slides_pptx_fodp(b"not-a-zip", LO_FODP)
        self.assertIn("hỏng", str(ctx.exception))

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
        parsed = patcher.parse_show_settings_from_fodp(content)
        self.assertTrue(parsed["showWithoutNarration"])
        self.assertEqual(parsed["pointerColor"], "#112233")
        self.assertTrue(parsed["loopUntilEsc"])
        self.assertIn('showNarration="0"', result.get("ooxmlPresPropsXml") or "")

    def test_open_pptx_without_show_pr_does_not_invent_flags(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            pptx_path = Path(temp_dir) / "Trong.pptx"
            pptx_path.write_bytes(_fake_pptx(LO_PRESPROPS_XML))
            api = main.VnOfficeApi("slides", str(pptx_path))

            def fake_convert(src_path, target_ext, out_dir, app_kind=None):
                output = Path(out_dir) / f"{Path(src_path).stem}.fodp"
                output.write_text(LO_FODP, encoding="utf-8")
                return str(output)

            with patch.object(main, "_run_soffice_convert", side_effect=fake_convert):
                result = api.open_document_dialog("slides")

        self.assertEqual(result.get("status"), "ok", result)
        self.assertFalse(patcher.fodp_has_show_setup_patch(result.get("content") or ""))
        self.assertIn('presentation:endless="true"', result.get("content") or "")

    def test_open_document_dialog_errors_when_zip_is_corrupt(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            pptx_path = Path(temp_dir) / "Hong.pptx"
            pptx_path.write_bytes(b"PK\x03\x04not-a-real-pptx")
            api = main.VnOfficeApi("slides", str(pptx_path))

            def fake_convert(src_path, target_ext, out_dir, app_kind=None):
                output = Path(out_dir) / "Hong.fodp"
                output.write_text(LO_FODP, encoding="utf-8")
                return str(output)

            with patch.object(main, "_run_soffice_convert", side_effect=fake_convert):
                result = api.open_document_dialog("slides")

        self.assertEqual(result.get("status"), "error", result)
        message = result.get("message") or ""
        self.assertTrue("hỏng" in message or "native" in message, message)

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    def test_open_document_dialog_real_soffice_save_then_open_keeps_setup(self):
        """Lưu FODP→PPTX (Phase 3b) rồi Mở PPTX (overlay) qua open_document_dialog."""
        with tempfile.TemporaryDirectory() as temp_dir:
            fodp_path = Path(temp_dir) / "deck.fodp"
            fodp_path.write_text(FODP_WITH_SETUP, encoding="utf-8")
            pptx_path = Path(
                main._run_soffice_convert(str(fodp_path), "pptx", temp_dir, app_kind="slides")
            )
            patcher.postprocess_slides_pptx_file(str(pptx_path), fodp_path=str(fodp_path))
            props_xml = patcher.read_zip_entry(pptx_path.read_bytes(), "ppt/presProps.xml")
            self.assertIsNotNone(props_xml)
            parsed_props = patcher.parse_show_properties(props_xml.decode("utf-8"))
            self.assertFalse(parsed_props["showNarration"])
            self.assertEqual(parsed_props["penRgb"], "112233")
            self.assertTrue(parsed_props["loop"])

            api = main.VnOfficeApi("slides", str(pptx_path))
            with patch.object(main, "_active_window", return_value=None):
                result = api.open_document_dialog("slides")

        self.assertEqual(result.get("status"), "ok", result)
        content = result.get("content") or ""
        parsed = patcher.parse_show_settings_from_fodp(content)
        self.assertTrue(
            parsed["showWithoutNarration"],
            "Mở lại PPTX đã Lưu phải overlay vno:without-narration (LibreOffice convert không map ngược)",
        )
        self.assertEqual(parsed["pointerColor"], "#112233")
        self.assertTrue(parsed["loopUntilEsc"])
        self.assertIn('showNarration="0"', result.get("ooxmlPresPropsXml") or "")


if __name__ == "__main__":
    unittest.main()
