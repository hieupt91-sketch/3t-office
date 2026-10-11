"""Slides p14: File → Lưu PPTX post-process inserts p14:sectionLst.

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

FODP_NO_SECTIONS = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:master-styles><style:master-page style:name="Standard"/></office:master-styles>
  <office:body><office:presentation>
    <draw:page draw:name="page1"/>
  </office:presentation></office:body>
</office:document>
"""


def _fake_pptx(presentation_xml: str = LO_PRESENTATION_XML) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
        package.writestr("ppt/presentation.xml", presentation_xml)
        package.writestr(
            "ppt/slideMasters/slideMaster1.xml",
            '<?xml version="1.0"?><p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>',
        )
        for index in range(1, 7):
            package.writestr(f"ppt/slides/slide{index}.xml", '<?xml version="1.0"?><p:sld/>')
    return buffer.getvalue()


class SlidesPptxSectionListTests(unittest.TestCase):
    def test_parse_sections_from_fodp(self):
        self.assertTrue(patcher.fodp_has_sections(FODP_WITH_SECTIONS))
        self.assertFalse(patcher.fodp_has_sections(FODP_NO_SECTIONS))
        groups = patcher.parse_sections_from_fodp(FODP_WITH_SECTIONS)
        self.assertEqual(len(groups), 2)
        self.assertEqual(groups[0]["name"], "Gioi thieu")
        self.assertEqual(groups[0]["pageIndexes"], [0, 1, 2])
        self.assertEqual(groups[1]["name"], "Noi dung chinh")
        self.assertEqual(groups[1]["pageIndexes"], [3, 4, 5])

    def test_apply_inserts_section_list_with_real_slide_ids(self):
        self.assertEqual(
            patcher.parse_presentation_slide_ids(LO_PRESENTATION_XML),
            ["256", "257", "258", "259", "260", "261"],
        )
        self.assertFalse(patcher.presentation_has_section_list(LO_PRESENTATION_XML))
        next_xml = patcher.apply_section_list_from_fodp(LO_PRESENTATION_XML, FODP_WITH_SECTIONS)
        self.assertTrue(patcher.presentation_has_section_list(next_xml))
        parsed = patcher.parse_section_list(next_xml)
        self.assertEqual(len(parsed), 2)
        self.assertEqual(parsed[0]["name"], "Gioi thieu")
        self.assertEqual(parsed[0]["slideIds"], ["256", "257", "258"])
        self.assertEqual(parsed[1]["name"], "Noi dung chinh")
        self.assertEqual(parsed[1]["slideIds"], ["259", "260", "261"])
        self.assertEqual(parsed[0]["id"], patcher.section_guid_from_id("section-intro"))
        twice = patcher.apply_section_list_from_fodp(next_xml, FODP_WITH_SECTIONS)
        self.assertEqual(twice, next_xml)

    def test_postprocess_pptx_zip_and_noop(self):
        original = _fake_pptx()
        patched = patcher.postprocess_slides_pptx(original, source_fodp=FODP_WITH_SECTIONS)
        entry = patcher.read_zip_entry(patched, "ppt/presentation.xml")
        self.assertIsNotNone(entry)
        xml = entry.decode("utf-8")
        self.assertIn("p14:sectionLst", xml)
        self.assertIn("Gioi thieu", xml)
        unchanged = patcher.postprocess_slides_pptx(original, source_fodp=FODP_NO_SECTIONS)
        self.assertEqual(unchanged, original)

    def test_save_document_dialog_patches_pptx_after_convert_without_logo(self):
        """Sections-only FODP must still enter the slides PPTX hook (no logo)."""
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
                    FODP_WITH_SECTIONS,
                    app_kind="slides",
                    target_format="pptx",
                    suggested_name="BaiChieu",
                )

            self.assertEqual(result["status"], "ok")
            self.assertTrue(dest.is_file())
            entry = patcher.read_zip_entry(dest.read_bytes(), "ppt/presentation.xml")
            self.assertIsNotNone(entry)
            xml = entry.decode("utf-8")
            self.assertIn("p14:sectionLst", xml)
            parsed = patcher.parse_section_list(xml)
            self.assertEqual(parsed[0]["slideIds"], ["256", "257", "258"])
            self.assertEqual(parsed[1]["slideIds"], ["259", "260", "261"])


if __name__ == "__main__":
    unittest.main()
