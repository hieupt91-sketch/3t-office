"""Slides: ghi chú diễn giả (speaker notes) bị mất trắng khi soffice convert
FODP -> PPTX. postprocess_slides_pptx() phải đọc <presentation:notes> từ FODP
và khôi phục ppt/notesSlides/notesSlideN.xml + .rels + Content_Types cho từng
slide có ghi chú.
"""

from __future__ import annotations

import io
import re
import unittest
import zipfile

import main

patcher = main._ooxml_zip_patch()

_LO_PRESENTATION_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldSz cx="10080625" cy="5670550"/></p:presentation>"""

_SLIDE_RELS_TEMPLATE = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>"""

_CONTENT_TYPES_BASE = """<?xml version="1.0"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/notesMasters/notesMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml"/>
</Types>"""

_NOTES_MASTER_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notesMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
               xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/>
  <p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
  <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>
  <a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
  </p:spTree></p:cSld>
</p:notesMaster>"""

# FODP với 3 slide: slide 1 có notes, slide 2 không, slide 3 có notes
FODP_WITH_NOTES = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
                 office:version="1.3"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:automatic-styles>
    <style:page-layout style:name="PM1">
      <style:page-layout-properties fo:page-width="28cm" fo:page-height="15.75cm"/>
    </style:page-layout>
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="PM1"/>
  </office:master-styles>
  <office:body>
    <office:presentation>
      <draw:page draw:name="page1" draw:master-page-name="Standard">
        <draw:text-box><text:p>Slide 1</text:p></draw:text-box>
        <presentation:notes>
          <draw:text-box>
            <text:p>Ghi chu slide 1 dong 1</text:p>
            <text:p>Ghi chu slide 1 dong 2</text:p>
          </draw:text-box>
        </presentation:notes>
      </draw:page>
      <draw:page draw:name="page2" draw:master-page-name="Standard">
        <draw:text-box><text:p>Slide 2</text:p></draw:text-box>
      </draw:page>
      <draw:page draw:name="page3" draw:master-page-name="Standard">
        <draw:text-box><text:p>Slide 3</text:p></draw:text-box>
        <presentation:notes>
          <draw:text-box>
            <text:p>Ghi chu slide 3</text:p>
          </draw:text-box>
        </presentation:notes>
      </draw:page>
    </office:presentation>
  </office:body>
</office:document>
"""

FODP_NO_NOTES = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
                 office:version="1.3"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:automatic-styles>
    <style:page-layout style:name="PM1">
      <style:page-layout-properties fo:page-width="28cm" fo:page-height="15.75cm"/>
    </style:page-layout>
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="PM1"/>
  </office:master-styles>
  <office:body>
    <office:presentation>
      <draw:page draw:name="page1" draw:master-page-name="Standard">
        <draw:text-box><text:p>Slide 1</text:p></draw:text-box>
      </draw:page>
    </office:presentation>
  </office:body>
</office:document>
"""


def _fake_pptx_with_notes_master(
    slide_count: int = 3,
    existing_notes: list[int] | None = None,
) -> bytes:
    """Tạo PPTX giả có slideCount slide, existing_notes là danh sách 1-based
    slide number đã có notesSlide (mặc định: không slide nào có notes)."""
    existing_notes = existing_notes or []
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as pkg:
        pkg.writestr("[Content_Types].xml", _CONTENT_TYPES_BASE)
        pkg.writestr("ppt/presentation.xml", _LO_PRESENTATION_XML)
        pkg.writestr("ppt/notesMasters/notesMaster1.xml", _NOTES_MASTER_XML)
        pkg.writestr(
            "ppt/notesMasters/_rels/notesMaster1.xml.rels",
            '<?xml version="1.0"?><Relationships/>',
        )
        for i in range(1, slide_count + 1):
            pkg.writestr(f"ppt/slides/slide{i}.xml", f"<p:sld/>")
            rels = _SLIDE_RELS_TEMPLATE
            if i in existing_notes:
                rels = rels.replace(
                    "</Relationships>",
                    '<Relationship Id="rId2" '
                    'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" '
                    f'Target="../notesSlides/notesSlide{i}.xml"/></Relationships>',
                )
            pkg.writestr(f"ppt/slides/_rels/slide{i}.xml.rels", rels)
    return buffer.getvalue()


class TestParseNotesFromFodp(unittest.TestCase):
    def test_extracts_notes_per_slide(self):
        notes = patcher.parse_notes_from_fodp(FODP_WITH_NOTES)
        self.assertIn(0, notes)
        self.assertIn(2, notes)
        self.assertNotIn(1, notes)
        self.assertEqual(notes[0], ["Ghi chu slide 1 dong 1", "Ghi chu slide 1 dong 2"])
        self.assertEqual(notes[2], ["Ghi chu slide 3"])

    def test_no_notes_returns_empty(self):
        notes = patcher.parse_notes_from_fodp(FODP_NO_NOTES)
        self.assertEqual(notes, {})

    def test_empty_input(self):
        self.assertEqual(patcher.parse_notes_from_fodp(""), {})
        self.assertEqual(patcher.parse_notes_from_fodp(None), {})


class TestRestoreNotesToPptx(unittest.TestCase):
    def test_adds_notes_slide_for_slide_1_and_3(self):
        """PPTX không có notes → FODP có notes cho slide 1 và 3 →
        phải tạo notesSlide1.xml và notesSlide2.xml (numbering mới)."""
        pptx = _fake_pptx_with_notes_master(slide_count=3)
        notes = patcher.parse_notes_from_fodp(FODP_WITH_NOTES)
        patched = patcher.restore_notes_to_pptx(pptx, notes)
        self.assertNotEqual(patched, pptx)
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            names = set(z.namelist())
        # Có notesSlide cho 2 slide có ghi chú
        notes_files = [n for n in names if re.match(r"ppt/notesSlides/notesSlide\d+\.xml$", n)]
        self.assertEqual(len(notes_files), 2)
        # Có rels cho notesSlide
        notes_rels = [n for n in names if re.match(r"ppt/notesSlides/_rels/notesSlide\d+\.xml\.rels$", n)]
        self.assertEqual(len(notes_rels), 2)

    def test_notes_text_content_is_correct(self):
        pptx = _fake_pptx_with_notes_master(slide_count=3)
        notes = patcher.parse_notes_from_fodp(FODP_WITH_NOTES)
        patched = patcher.restore_notes_to_pptx(pptx, notes)
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            notes1 = z.read("ppt/notesSlides/notesSlide1.xml").decode("utf-8")
        self.assertIn("Ghi chu slide 1 dong 1", notes1)
        self.assertIn("Ghi chu slide 1 dong 2", notes1)

    def test_slide_rels_updated_with_notes_relationship(self):
        pptx = _fake_pptx_with_notes_master(slide_count=3)
        notes = patcher.parse_notes_from_fodp(FODP_WITH_NOTES)
        patched = patcher.restore_notes_to_pptx(pptx, notes)
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            slide1_rels = z.read("ppt/slides/_rels/slide1.xml.rels").decode("utf-8")
        self.assertIn("notesSlide", slide1_rels)

    def test_content_types_updated(self):
        pptx = _fake_pptx_with_notes_master(slide_count=3)
        notes = patcher.parse_notes_from_fodp(FODP_WITH_NOTES)
        patched = patcher.restore_notes_to_pptx(pptx, notes)
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            ct = z.read("[Content_Types].xml").decode("utf-8")
        self.assertIn("notesSlide+xml", ct)

    def test_existing_notes_not_duplicated(self):
        """Slide đã có notesSlide trong PPTX → không thêm mới."""
        pptx = _fake_pptx_with_notes_master(slide_count=3, existing_notes=[1])
        notes = patcher.parse_notes_from_fodp(FODP_WITH_NOTES)
        patched = patcher.restore_notes_to_pptx(pptx, notes)
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            names = set(z.namelist())
        notes_files = [n for n in names if re.match(r"ppt/notesSlides/notesSlide\d+\.xml$", n)]
        # Chỉ thêm 1 notes mới (cho slide 3), slide 1 đã có
        self.assertEqual(len(notes_files), 1)

    def test_no_notes_returns_unchanged(self):
        pptx = _fake_pptx_with_notes_master(slide_count=1)
        patched = patcher.restore_notes_to_pptx(pptx, {})
        self.assertEqual(patched, pptx)

    def test_notes_master_must_exist(self):
        """Nếu PPTX không có notesMaster → không thêm notes (an toàn)."""
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as pkg:
            pkg.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
            pkg.writestr("ppt/presentation.xml", _LO_PRESENTATION_XML)
        pptx = buffer.getvalue()
        notes = {0: ["Note text"]}
        patched = patcher.restore_notes_to_pptx(pptx, notes)
        self.assertEqual(patched, pptx, "Thiếu notesMaster → không được thêm notes")


class TestPostprocessSlidesPptxNotes(unittest.TestCase):
    """Tích hợp: postprocess_slides_pptx() phải vừa sửa khổ trang vừa khôi phục notes."""

    def test_both_size_and_notes_restored(self):
        original = _fake_pptx_with_notes_master(slide_count=3)
        patched = patcher.postprocess_slides_pptx(original, source_fodp=FODP_WITH_NOTES)
        self.assertNotEqual(patched, original)
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            names = set(z.namelist())
            # Notes được khôi phục
            notes_files = [n for n in names if re.match(r"ppt/notesSlides/notesSlide\d+\.xml$", n)]
            self.assertEqual(len(notes_files), 2)

    def test_no_notes_no_change(self):
        original = _fake_pptx_with_notes_master(slide_count=1)
        patched = patcher.postprocess_slides_pptx(original, source_fodp=FODP_NO_NOTES)
        self.assertEqual(patched, original)


if __name__ == "__main__":
    unittest.main()
