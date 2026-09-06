"""Slides Set Up Show: File → Lưu PPTX post-process patches p:showPr.

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

LO_PRESPROPS_XML = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    '<p:showPr loop="1" showNarration="1"></p:showPr>'
    "</p:presentationPr>"
)

LO_PRESENTATION_XML = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId2"/></p:sldMasterIdLst>'
    '<p:sldIdLst>'
    '<p:sldId id="256" r:id="rId3"/>'
    '<p:sldId id="257" r:id="rId4"/>'
    '<p:sldId id="258" r:id="rId5"/>'
    "</p:sldIdLst>"
    '<p:sldSz cx="10080625" cy="5670550"/>'
    '<p:notesSz cx="7559675" cy="10691813"/>'
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

FODP_ENDLESS_ONLY = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:master-styles><style:master-page style:name="Standard"/></office:master-styles>
  <office:body><office:presentation>
    <draw:page draw:name="page1"/>
    <presentation:settings presentation:endless="true"/>
  </office:presentation></office:body>
</office:document>
"""


def _fake_pptx(pres_props_xml: str = LO_PRESPROPS_XML) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
        package.writestr("ppt/presentation.xml", LO_PRESENTATION_XML)
        package.writestr("ppt/presProps.xml", pres_props_xml)
        package.writestr(
            "ppt/slideMasters/slideMaster1.xml",
            '<?xml version="1.0"?><p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>',
        )
        for index in range(1, 4):
            package.writestr(f"ppt/slides/slide{index}.xml", '<?xml version="1.0"?><p:sld/>')
    return buffer.getvalue()


class SlidesPptxShowPropertiesTests(unittest.TestCase):
    def test_parse_settings_from_fodp(self):
        self.assertTrue(patcher.fodp_has_show_setup_patch(FODP_WITH_SETUP))
        self.assertFalse(patcher.fodp_has_show_setup_patch(FODP_ENDLESS_ONLY))
        settings = patcher.parse_show_settings_from_fodp(FODP_WITH_SETUP)
        self.assertTrue(settings["loopUntilEsc"])
        self.assertTrue(settings["showWithoutNarration"])
        self.assertEqual(settings["pointerColor"], "#112233")

    def test_apply_sets_show_narration_and_pen_keeps_loop(self):
        parsed = patcher.parse_show_properties(LO_PRESPROPS_XML)
        self.assertTrue(parsed["loop"])
        self.assertTrue(parsed["showNarration"])
        self.assertEqual(parsed["penRgb"], "")
        next_xml = patcher.apply_show_properties_from_fodp(LO_PRESPROPS_XML, FODP_WITH_SETUP)
        parsed = patcher.parse_show_properties(next_xml)
        self.assertTrue(parsed["loop"])
        self.assertFalse(parsed["showNarration"])
        self.assertEqual(parsed["penRgb"], "112233")
        twice = patcher.apply_show_properties_from_fodp(next_xml, FODP_WITH_SETUP)
        self.assertEqual(twice, next_xml)
        unchanged = patcher.apply_show_properties_from_fodp(LO_PRESPROPS_XML, FODP_ENDLESS_ONLY)
        self.assertEqual(unchanged, LO_PRESPROPS_XML)

    def test_postprocess_pptx_zip_and_noop(self):
        original = _fake_pptx()
        patched = patcher.postprocess_slides_pptx(original, source_fodp=FODP_WITH_SETUP)
        entry = patcher.read_zip_entry(patched, "ppt/presProps.xml")
        self.assertIsNotNone(entry)
        parsed = patcher.parse_show_properties(entry.decode("utf-8"))
        self.assertFalse(parsed["showNarration"])
        self.assertEqual(parsed["penRgb"], "112233")
        presentation = patcher.read_zip_entry(patched, "ppt/presentation.xml").decode("utf-8")
        self.assertNotIn("showPr", presentation)
        unchanged = patcher.postprocess_slides_pptx(original, source_fodp=FODP_ENDLESS_ONLY)
        self.assertEqual(unchanged, original)

    def test_save_document_dialog_patches_pptx_after_convert_without_logo(self):
        """Set Up Show-only FODP must still enter the slides PPTX hook (no logo/sections)."""
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
                main,
                "_active_window",
                return_value=type(
                    "W",
                    (),
                    {"create_file_dialog": staticmethod(lambda *args, **kwargs: str(dest))},
                )(),
            ):
                result = api.save_document_dialog(
                    FODP_WITH_SETUP,
                    app_kind="slides",
                    target_format="pptx",
                    suggested_name="BaiChieu",
                )

            self.assertEqual(result["status"], "ok")
            self.assertTrue(dest.is_file())
            entry = patcher.read_zip_entry(dest.read_bytes(), "ppt/presProps.xml")
            self.assertIsNotNone(entry)
            parsed = patcher.parse_show_properties(entry.decode("utf-8"))
            self.assertFalse(parsed["showNarration"])
            self.assertEqual(parsed["penRgb"], "112233")
            self.assertTrue(parsed["loop"])


if __name__ == "__main__":
    unittest.main()
