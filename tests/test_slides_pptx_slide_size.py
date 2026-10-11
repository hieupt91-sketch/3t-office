"""Slides: soffice --convert-to pptx bỏ qua style:page-layout-properties của FODP,
luôn tự ghi <p:sldSz> mặc định 28cm x 15.75cm bất kể canvas.slideSize thật -
đo trực tiếp bằng vòng chuyển đổi FODP -> PPTX thật qua soffice (xem
docs/HANDOFF-SLIDES-SLIDESIZE-EXPORT-FIX.md). postprocess_slides_pptx() giờ
khôi phục lại khổ trang thật độc lập với logo/sections/show-setup.
"""

from __future__ import annotations

import io
import unittest
import zipfile

import main

patcher = main._ooxml_zip_patch()

LO_PRESENTATION_XML_DEFAULT = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldSz cx="10080625" cy="5670550"/></p:presentation>"""

FODP_16_9_WIDE = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:automatic-styles>
    <style:page-layout style:name="PM1">
      <style:page-layout-properties fo:page-width="25.4cm" fo:page-height="14.287cm" style:print-orientation="landscape"/>
    </style:page-layout>
  </office:automatic-styles>
  <office:master-styles><style:master-page style:name="Standard" style:page-layout-name="PM1"/></office:master-styles>
  <office:body><office:presentation><draw:page draw:name="page1"/></office:presentation></office:body>
</office:document>
"""

FODP_CUSTOM_4_3 = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:automatic-styles>
    <style:page-layout style:name="PM1">
      <style:page-layout-properties fo:page-width="19.05cm" fo:page-height="14.287cm" style:print-orientation="landscape"/>
    </style:page-layout>
  </office:automatic-styles>
  <office:master-styles><style:master-page style:name="Standard" style:page-layout-name="PM1"/></office:master-styles>
  <office:body><office:presentation><draw:page draw:name="page1"/></office:presentation></office:body>
</office:document>
"""

FODP_NO_PAGE_LAYOUT = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:master-styles><style:master-page style:name="Standard"/></office:master-styles>
  <office:body><office:presentation><draw:page draw:name="page1"/></office:presentation></office:body>
</office:document>
"""


def _fake_pptx(presentation_xml: str = LO_PRESENTATION_XML_DEFAULT) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
        package.writestr("ppt/presentation.xml", presentation_xml)
    return buffer.getvalue()


class TestParseIntendedSlideSizeFromFodp(unittest.TestCase):
    def test_reads_real_cm_and_converts_to_emu(self):
        size = patcher.parse_intended_slide_size_from_fodp(FODP_16_9_WIDE)
        self.assertIsNotNone(size)
        self.assertEqual(size["cx"], round(25.4 * 360000))
        self.assertEqual(size["cy"], round(14.287 * 360000))

    def test_returns_none_when_no_page_layout_properties(self):
        self.assertIsNone(patcher.parse_intended_slide_size_from_fodp(FODP_NO_PAGE_LAYOUT))

    def test_returns_none_for_empty_input(self):
        self.assertIsNone(patcher.parse_intended_slide_size_from_fodp(""))
        self.assertIsNone(patcher.parse_intended_slide_size_from_fodp(None))


class TestApplyIntendedSlideSize(unittest.TestCase):
    def test_overwrites_cx_cy_keeps_other_attrs(self):
        xml = '<p:presentation><p:sldSz cx="10080625" cy="5670550" type="screen16x9"/></p:presentation>'
        result = patcher.apply_intended_slide_size(xml, {"cx": 9144000, "cy": 5143500})
        self.assertIn('cx="9144000"', result)
        self.assertIn('cy="5143500"', result)
        self.assertIn('type="screen16x9"', result, "Các thuộc tính khác trên sldSz phải được giữ nguyên")

    def test_noop_when_size_is_none(self):
        xml = '<p:sldSz cx="1" cy="2"/>'
        self.assertEqual(patcher.apply_intended_slide_size(xml, None), xml)


class TestPostprocessSlidesPptxSlideSize(unittest.TestCase):
    def test_default_16_9_presentation_gets_corrected_size(self):
        """Trường hợp phổ biến nhất: không dùng logo/sections/show-setup, khổ
        16:9 mặc định (960x540px -> 25.4cm x 14.287cm) - trước khi sửa, hàm này
        thậm chí không được main.py gọi tới vì không có tính năng native nào
        khác cần patch; giờ luôn được gọi và phải tự sửa đúng khổ trang."""
        original = _fake_pptx()
        patched = patcher.postprocess_slides_pptx(original, source_fodp=FODP_16_9_WIDE)
        self.assertNotEqual(patched, original, "Phải có thay đổi vì khổ trang soffice ghi sai")
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            presentation_xml = z.read("ppt/presentation.xml").decode("utf-8")
        size = patcher.parse_slide_size(presentation_xml)
        self.assertEqual(size["cx"], round(25.4 * 360000))
        self.assertEqual(size["cy"], round(14.287 * 360000))

    def test_custom_4_3_slide_size_gets_corrected_not_left_at_16_9_default(self):
        original = _fake_pptx()
        patched = patcher.postprocess_slides_pptx(original, source_fodp=FODP_CUSTOM_4_3)
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            presentation_xml = z.read("ppt/presentation.xml").decode("utf-8")
        size = patcher.parse_slide_size(presentation_xml)
        self.assertEqual(size["cx"], round(19.05 * 360000))
        self.assertEqual(size["cy"], round(14.287 * 360000))

    def test_no_fodp_page_layout_leaves_pptx_untouched(self):
        original = _fake_pptx()
        patched = patcher.postprocess_slides_pptx(original, source_fodp=FODP_NO_PAGE_LAYOUT)
        self.assertEqual(patched, original, "Không có khổ trang thật để đối chiếu thì không được tự ý sửa gì")

    def test_already_matching_size_is_left_unchanged(self):
        """soffice tình cờ ghi đúng khổ 28cm x 15.75cm và FODP cũng khai báo đúng
        khổ đó (trường hợp giả định) - không được tạo thay đổi giả không cần thiết."""
        matching_fodp = FODP_16_9_WIDE.replace("25.4cm", "28.0022cm").replace("14.287cm", "15.7515cm")
        original = _fake_pptx()
        patched = patcher.postprocess_slides_pptx(original, source_fodp=matching_fodp)
        self.assertEqual(patched, original, "Khổ đã khớp sẵn (trong dung sai) thì không cần vá gì")


# FODP có NHIỀU page-layout-properties: slide (10"×5.625") + notes (A4) + handout
FODP_MULTI_LAYOUTS = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:automatic-styles>
    <style:page-layout style:name="PM1">
      <style:page-layout-properties fo:page-width="25.4cm" fo:page-height="14.287cm" style:print-orientation="landscape"/>
    </style:page-layout>
    <style:page-layout style:name="PMNotes">
      <style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" style:print-orientation="portrait"/>
    </style:page-layout>
    <style:page-layout style:name="PMHandout">
      <style:page-layout-properties fo:page-width="19.05cm" fo:page-height="25.4cm" style:print-orientation="portrait"/>
    </style:page-layout>
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="PM1"/>
  </office:master-styles>
  <office:body><office:presentation>
    <draw:page draw:name="page1" draw:master-page-name="Standard"/>
  </office:presentation></office:body>
</office:document>
"""

# FODP notes layout ĐƯỢC ĐẶT TRƯỚC slide layout — phải chọn đúng slide layout
FODP_NOTES_FIRST = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:automatic-styles>
    <style:page-layout style:name="PMNotes">
      <style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" style:print-orientation="portrait"/>
    </style:page-layout>
    <style:page-layout style:name="PM1">
      <style:page-layout-properties fo:page-width="25.4cm" fo:page-height="14.287cm" style:print-orientation="landscape"/>
    </style:page-layout>
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="PM1"/>
  </office:master-styles>
  <office:body><office:presentation>
    <draw:page draw:name="page1" draw:master-page-name="Standard"/>
  </office:presentation></office:document>
"""


class TestParseIntendedSlideSizeMultiLayout(unittest.TestCase):
    """Khi FODP có nhiều page-layout-properties (slide / notes / handout),
    phải chọn đúng cái gắn với slide, không lấy nhầm cái khác."""

    def test_picks_slide_layout_not_notes(self):
        size = patcher.parse_intended_slide_size_from_fodp(FODP_MULTI_LAYOUTS)
        self.assertIsNotNone(size)
        self.assertEqual(size["cx"], round(25.4 * 360000))
        self.assertEqual(size["cy"], round(14.287 * 360000))

    def test_notes_layout_first_still_picks_slide(self):
        """Khi notes layout (A4) xuất hiện TRƯỚC slide layout trong XML,
        vẫn phải chọn đúng slide layout (25.4cm × 14.287cm)."""
        size = patcher.parse_intended_slide_size_from_fodp(FODP_NOTES_FIRST)
        self.assertIsNotNone(size)
        self.assertEqual(size["cx"], round(25.4 * 360000))
        self.assertEqual(size["cy"], round(14.287 * 360000))


class TestPostprocessSlidesPptxMultiLayout(unittest.TestCase):
    def test_multi_layout_pptx_gets_correct_slide_size(self):
        """PPTX mặc định 28cm × 15.75cm, FODP có slide layout 25.4cm × 14.287cm
        + notes A4 + handout → phải sửa đúng khổ slide, không lấy nhầm A4."""
        original = _fake_pptx()
        patched = patcher.postprocess_slides_pptx(original, source_fodp=FODP_MULTI_LAYOUTS)
        self.assertNotEqual(patched, original)
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            presentation_xml = z.read("ppt/presentation.xml").decode("utf-8")
        size = patcher.parse_slide_size(presentation_xml)
        self.assertEqual(size["cx"], round(25.4 * 360000))
        self.assertEqual(size["cy"], round(14.287 * 360000))

    def test_notes_first_still_corrects_to_slide_size(self):
        original = _fake_pptx()
        patched = patcher.postprocess_slides_pptx(original, source_fodp=FODP_NOTES_FIRST)
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            presentation_xml = z.read("ppt/presentation.xml").decode("utf-8")
        size = patcher.parse_slide_size(presentation_xml)
        self.assertEqual(size["cx"], round(25.4 * 360000))
        self.assertEqual(size["cy"], round(14.287 * 360000))


if __name__ == "__main__":
    unittest.main()
