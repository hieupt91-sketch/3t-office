"""Slides open overlay: File → Mở restores p14:sectionLst onto FODP.

No native file dialog. Builds a real PPTX ZIP with p14:sectionLst, mocks
soffice PPTX→FODP (which drops vno:section-*), then calls
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

LO_PRESENTATION_XML = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
    'xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" '
    'xmlns:p15="http://schemas.microsoft.com/office/powerpoint/2012/main" '
    'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">'
    '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId2"/></p:sldMasterIdLst>'
    '<p:sldIdLst>'
    '<p:sldId id="256" r:id="rId3"/>'
    '<p:sldId id="257" r:id="rId4"/>'
    '<p:sldId id="258" r:id="rId5"/>'
    '<p:sldId id="259" r:id="rId6"/>'
    '<p:sldId id="260" r:id="rId7"/>'
    '<p:sldId id="261" r:id="rId8"/>'
    "</p:sldIdLst>"
    '<p:sldSz cx="10080625" cy="5670550"/>'
    '<p:notesSz cx="7559675" cy="10691813"/>'
    "</p:presentation>"
)

FODP_WITH_SECTIONS = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 xmlns:vno="urn:vn-office:slides:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:master-styles><style:master-page style:name="Standard"/></office:master-styles>
  <office:body><office:presentation>
    <draw:page draw:name="page1" vno:section-id="section-intro" vno:section-name="Gioi thieu"/>
    <draw:page draw:name="page2" vno:section-id="section-intro" vno:section-name="Gioi thieu"/>
    <draw:page draw:name="page3" vno:section-id="section-intro" vno:section-name="Gioi thieu"/>
    <draw:page draw:name="page4" vno:section-id="section-body" vno:section-name="Noi dung chinh"/>
    <draw:page draw:name="page5" vno:section-id="section-body" vno:section-name="Noi dung chinh"/>
    <draw:page draw:name="page6" vno:section-id="section-body" vno:section-name="Noi dung chinh"/>
  </office:presentation></office:body>
</office:document>
"""

LO_FODP = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:master-styles><style:master-page style:name="Standard"/></office:master-styles>
  <office:body><office:presentation>
    <draw:page draw:name="Mo dau 1"/>
    <draw:page draw:name="Mo dau 2"/>
    <draw:page draw:name="Mo dau 3"/>
    <draw:page draw:name="Noi dung 1"/>
    <draw:page draw:name="Noi dung 2"/>
    <draw:page draw:name="Noi dung 3"/>
  </office:presentation></office:body>
</office:document>
"""

FIVE_PAGE_FODP = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:body><office:presentation>
    <draw:page draw:name="p1"/>
    <draw:page draw:name="p2"/>
    <draw:page draw:name="p3"/>
    <draw:page draw:name="p4"/>
    <draw:page draw:name="p5"/>
  </office:presentation></office:body>
</office:document>
"""


def _fake_pptx(presentation_xml: str) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
        package.writestr("ppt/presentation.xml", presentation_xml)
        package.writestr(
            "ppt/slideMasters/slideMaster1.xml",
            '<?xml version="1.0"?><p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>',
        )
        for index in range(1, 7):
            package.writestr(
                f"ppt/slides/slide{index}.xml",
                '<?xml version="1.0"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>',
            )
    return buffer.getvalue()


def _sectioned_presentation() -> str:
    return patcher.apply_section_list_from_fodp(LO_PRESENTATION_XML, FODP_WITH_SECTIONS)


class SlidesPptxSectionsOpenTests(unittest.TestCase):
    def test_overlay_stamps_vno_section_from_p14_section_list(self):
        presentation = _sectioned_presentation()
        overlaid = patcher.overlay_fodp_sections(LO_FODP, presentation)
        self.assertTrue(patcher.fodp_has_sections(overlaid))
        pages = patcher.parse_fodp_pages(overlaid)
        self.assertEqual(len(pages), 6)
        intro = patcher.section_guid_from_id("section-intro")
        body = patcher.section_guid_from_id("section-body")
        self.assertTrue(all(page["sectionId"] == intro and page["sectionName"] == "Gioi thieu" for page in pages[:3]))
        self.assertTrue(all(page["sectionId"] == body and page["sectionName"] == "Noi dung chinh" for page in pages[3:]))
        self.assertIn('xmlns:vno="urn:vn-office:slides:1.0"', overlaid)
        self.assertIn("Mo dau 1", overlaid)

    def test_overlay_noop_when_pptx_has_no_section_list(self):
        overlaid = patcher.overlay_fodp_sections(LO_FODP, LO_PRESENTATION_XML)
        self.assertEqual(overlaid, LO_FODP)
        self.assertFalse(patcher.fodp_has_sections(overlaid))

    def test_overlay_slides_pptx_fodp_reads_zip_via_shared_helper(self):
        pptx = _fake_pptx(_sectioned_presentation())
        overlaid = patcher.overlay_slides_pptx_fodp(pptx, LO_FODP)
        self.assertTrue(patcher.fodp_has_sections(overlaid))
        entry = patcher.read_zip_entry(pptx, "ppt/presentation.xml")
        self.assertIsNotNone(entry)
        self.assertIn(b"sectionLst", entry)

    def test_overlay_throws_when_slide_count_mismatches(self):
        presentation = _sectioned_presentation()
        with self.assertRaises(ValueError) as ctx:
            patcher.overlay_fodp_sections(FIVE_PAGE_FODP, presentation)
        self.assertIn("không đoán", str(ctx.exception))
        self.assertIn("sldIdLst", str(ctx.exception))

    def test_open_document_dialog_overlays_fodp_before_returning_content(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            pptx_path = Path(temp_dir) / "BaiGiang.pptx"
            pptx_path.write_bytes(_fake_pptx(_sectioned_presentation()))
            api = main.VnOfficeApi("slides", str(pptx_path))

            def fake_convert(src_path, target_ext, out_dir, app_kind=None):
                self.assertTrue(src_path.endswith("BaiGiang.pptx"))
                self.assertEqual((target_ext, app_kind), ("fodp", "slides"))
                output = Path(out_dir) / "BaiGiang.fodp"
                output.write_text(LO_FODP, encoding="utf-8")
                return str(output)

            with patch.object(main, "_run_soffice_convert", side_effect=fake_convert):
                with patch.object(main, "_active_window", return_value=None):
                    result = api.open_document_dialog("slides")

        self.assertEqual(result.get("status"), "ok", result)
        content = result.get("content") or ""
        self.assertTrue(patcher.fodp_has_sections(content))
        self.assertIn('vno:section-name="Gioi thieu"', content)
        self.assertIn('vno:section-name="Noi dung chinh"', content)
        presentation_xml = result.get("ooxmlPresentationXml") or ""
        self.assertIn("sectionLst", presentation_xml)

    def test_open_pptx_without_sections_does_not_invent_groups(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            pptx_path = Path(temp_dir) / "Trong.pptx"
            pptx_path.write_bytes(_fake_pptx(LO_PRESENTATION_XML))
            api = main.VnOfficeApi("slides", str(pptx_path))

            def fake_convert(src_path, target_ext, out_dir, app_kind=None):
                output = Path(out_dir) / f"{Path(src_path).stem}.fodp"
                output.write_text(LO_FODP, encoding="utf-8")
                return str(output)

            with patch.object(main, "_run_soffice_convert", side_effect=fake_convert):
                result = api.open_document_dialog("slides")

        self.assertEqual(result.get("status"), "ok", result)
        self.assertFalse(patcher.fodp_has_sections(result.get("content") or ""))

    def test_open_document_dialog_errors_when_slide_count_mismatches(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            pptx_path = Path(temp_dir) / "Lech.pptx"
            pptx_path.write_bytes(_fake_pptx(_sectioned_presentation()))
            api = main.VnOfficeApi("slides", str(pptx_path))

            def fake_convert(src_path, target_ext, out_dir, app_kind=None):
                output = Path(out_dir) / "Lech.fodp"
                output.write_text(FIVE_PAGE_FODP, encoding="utf-8")
                return str(output)

            with patch.object(main, "_run_soffice_convert", side_effect=fake_convert):
                result = api.open_document_dialog("slides")

        self.assertEqual(result.get("status"), "error", result)
        self.assertIn("không đoán", result.get("message") or "")

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    def test_open_document_dialog_real_soffice_save_then_open_keeps_sections(self):
        """Lưu FODP→PPTX (Phase 3a) rồi Mở PPTX (overlay) qua open_document_dialog."""
        with tempfile.TemporaryDirectory() as temp_dir:
            fodp_path = Path(temp_dir) / "deck.fodp"
            fodp_path.write_text(FODP_WITH_SECTIONS, encoding="utf-8")
            pptx_path = Path(
                main._run_soffice_convert(str(fodp_path), "pptx", temp_dir, app_kind="slides")
            )
            patcher.postprocess_slides_pptx_file(str(pptx_path), fodp_path=str(fodp_path))
            presentation_xml = patcher.read_zip_entry(
                pptx_path.read_bytes(), "ppt/presentation.xml"
            )
            self.assertIsNotNone(presentation_xml)
            self.assertTrue(
                patcher.presentation_has_section_list(presentation_xml.decode("utf-8"))
            )

            api = main.VnOfficeApi("slides", str(pptx_path))
            with patch.object(main, "_active_window", return_value=None):
                result = api.open_document_dialog("slides")

        self.assertEqual(result.get("status"), "ok", result)
        content = result.get("content") or ""
        self.assertTrue(
            patcher.fodp_has_sections(content),
            "Mở lại PPTX đã Lưu phải overlay vno:section-* (LibreOffice convert không map ngược)",
        )
        pages = patcher.parse_fodp_pages(content)
        self.assertEqual(len(pages), 6, pages)
        intro = patcher.section_guid_from_id("section-intro")
        body = patcher.section_guid_from_id("section-body")
        self.assertTrue(all(page["sectionId"] == intro for page in pages[:3]), pages[:3])
        self.assertTrue(all(page["sectionId"] == body for page in pages[3:]), pages[3:])
        self.assertIn("sectionLst", result.get("ooxmlPresentationXml") or "")


if __name__ == "__main__":
    unittest.main()
