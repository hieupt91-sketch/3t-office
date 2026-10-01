"""Programmatic DOCX round trips for Writer headers, revisions, comments, and equations.

No external/company documents are used. The source package is generated in a
temporary directory, opened by VnOfficeApi, and saved through the production
HTML -> LibreOffice -> source-aware OOXML pipeline.
"""

from __future__ import annotations

import json
import re
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

import main


W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
REL = "http://schemas.openxmlformats.org/package/2006/relationships"
CT = "http://schemas.openxmlformats.org/package/2006/content-types"
M = "http://schemas.openxmlformats.org/officeDocument/2006/math"


def _source_docx(path: Path) -> None:
    document = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="{W}" xmlns:r="{R}" xmlns:m="{M}"><w:body>
<w:p><w:pPr><w:sectPr><w:headerReference w:type="default" r:id="rId2"/><w:footerReference w:type="default" r:id="rId3"/><w:titlePg/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:pPr>
<w:r><w:t xml:space="preserve">Base </w:t></w:r>
 <w:ins w:id="12" w:author="Tran Thi Hoa" w:date="2026-10-01T10:00:00Z"><w:r><w:t>INSERTED_WORD</w:t></w:r></w:ins>
 <w:r><w:t xml:space="preserve"> </w:t></w:r>
 <w:del w:id="13" w:author="Tran Thi Hoa" w:date="2026-10-01T10:01:00Z"><w:r><w:delText>DELETED_WORD</w:delText></w:r></w:del>
 <w:r><w:t xml:space="preserve"> </w:t></w:r>
 <w:commentRangeStart w:id="7"/><w:r><w:t>COMMENT_TARGET</w:t></w:r><w:commentRangeEnd w:id="7"/>
 <w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="7"/></w:r>
</w:p>
<w:p><w:bookmarkStart w:id="50" w:name="equation_source"/><w:r><w:t xml:space="preserve">Equation: </w:t></w:r><m:oMath><m:r><m:t>x</m:t></m:r><m:r><m:t> + y</m:t></m:r></m:oMath><w:bookmarkEnd w:id="50"/></w:p>
<w:sectPr><w:headerReference w:type="default" r:id="rId2"/><w:footerReference w:type="default" r:id="rId3"/><w:titlePg/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
</w:body></w:document>'''
    rels = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="{REL}">
 <Relationship Id="rId1" Type="{R}/styles" Target="styles.xml"/>
 <Relationship Id="rId2" Type="{R}/header" Target="header1.xml"/>
 <Relationship Id="rId3" Type="{R}/footer" Target="footer1.xml"/>
 <Relationship Id="rId4" Type="{R}/comments" Target="comments.xml"/>
 <Relationship Id="rId5" Type="{R}/settings" Target="settings.xml"/>
</Relationships>'''
    root_rels = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="{REL}"><Relationship Id="rId1" Type="{R}/officeDocument" Target="word/document.xml"/></Relationships>'''
    content_types = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="{CT}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>
</Types>'''
    header = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="{W}"><w:p><w:r><w:t>HEADER_SOURCE</w:t></w:r></w:p></w:hdr>'''
    footer = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="{W}"><w:p><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple><w:r><w:t xml:space="preserve"> / </w:t></w:r><w:fldSimple w:instr=" NUMPAGES "><w:r><w:t>1</w:t></w:r></w:fldSimple><w:r><w:t> FOOTER_SOURCE</w:t></w:r></w:p></w:ftr>'''
    comments = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments xmlns:w="{W}"><w:comment w:id="7" w:author="Tran Thi Hoa" w:date="2026-10-01T10:02:00Z"><w:p><w:r><w:t>Comment body from Word</w:t></w:r></w:p></w:comment></w:comments>'''
    settings = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="{W}"><w:trackRevisions/></w:settings>'''
    styles = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="{W}"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>'''
    entries = {
        "[Content_Types].xml": content_types,
        "_rels/.rels": root_rels,
        "word/document.xml": document,
        "word/_rels/document.xml.rels": rels,
        "word/header1.xml": header,
        "word/footer1.xml": footer,
        "word/comments.xml": comments,
        "word/settings.xml": settings,
        "word/styles.xml": styles,
    }
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, value in entries.items():
            archive.writestr(name, value.encode("utf-8"))


def _parts(path: Path) -> dict[str, bytes]:
    with zipfile.ZipFile(path) as archive:
        return {name: archive.read(name) for name in archive.namelist()}


def _text(xml: bytes) -> str:
    return xml.decode("utf-8", errors="replace")


def _open_docx(path: Path) -> dict:
    api = main.VnOfficeApi(app_kind="writer", initial_file=str(path))
    with patch.object(main, "_active_window", return_value=None):
        result = api.open_document_dialog("writer")
    if result.get("status") != "ok":
        raise AssertionError(f"VnOfficeApi could not open generated DOCX: {result}")
    return result


def _review_html_for_edited_source(
    opened: dict, *, header_suffix: str = "", footer_suffix: str = "",
) -> str:
    if not opened.get("content"):
        raise AssertionError("open_document_dialog returned no editable Writer HTML")
    # These named anchors reproduce WriterAdapter's temporary HTML protocol.
    # The second source paragraph is untouched and carries a marker so the
    # source-aware overlay can retain its OMML equation during a body-only edit.
    section1 = '<p>Base <a name="vno-review-start-00001"></a>INSERTED_WORD<a name="vno-review-end-00001"></a> <a name="vno-review-start-00002"></a>DELETED_WORD<a name="vno-review-end-00002"></a> <a name="vno-review-start-00003"></a>COMMENT_TARGET<a name="vno-review-end-00003"></a></p>'
    section2 = '<p id="vno-untouched-2">Equation: x + y</p><p>BODY_ONLY_EDIT</p>'
    page_setup = {
        "size": "a4", "orientation": "portrait",
        "margins": {"top": 20, "right": 15, "bottom": 20, "left": 30},
        "headerDistanceMm": 12.7, "footerDistanceMm": 12.7,
    }
    header_html = f"<p>HEADER_SOURCE{header_suffix}</p>"
    footer_html = (
        '<p><span data-vno-field="PAGE">1</span> / '
        '<span data-vno-field="NUMPAGES">1</span> FOOTER_SOURCE'
        f"{footer_suffix}</p>"
    )
    header_footer = {
        "linkToPrevious": False, "differentFirstPage": True,
        "differentOddEven": False, "pageNumberRestart": False,
        "pageNumberStart": 1, "header": header_html, "footer": footer_html,
        "headers": {"default": header_html}, "footers": {"default": footer_html},
    }
    section2_header_footer = {
        **header_footer,
        "header": "<p>HEADER_SOURCE</p>",
        "footer": (
            '<p><span data-vno-field="PAGE">1</span> / '
            '<span data-vno-field="NUMPAGES">1</span> FOOTER_SOURCE</p>'
        ),
        "headers": {"default": "<p>HEADER_SOURCE</p>"},
        "footers": {"default": (
            '<p><span data-vno-field="PAGE">1</span> / '
            '<span data-vno-field="NUMPAGES">1</span> FOOTER_SOURCE</p>'
        )},
    }
    section_meta = [
        {"id": "section-1", "active": True, "type": "nextPage", "breakMarkerPresent": False,
         "pageSetup": page_setup, "headerFooter": header_footer},
        {"id": "section-2", "type": "nextPage", "breakMarkerPresent": True,
         "pageSetup": page_setup, "headerFooter": section2_header_footer},
    ]
    section_css = "".join(
        f'<style>@page vno-{item["id"]}{{size:210mm 297mm;margin:20mm 15mm 20mm 30mm;}}'
        f'.vno-export-{item["id"]}{{page:vno-{item["id"]};}}</style>'
        for item in section_meta
    )
    sections = (
        '<div class="vno-export-section vno-export-section-1" data-vno-export-section="section-1">'
        + section1 + '</div>'
        + '<div class="vno-export-section vno-export-section-2" data-vno-export-section="section-2">'
        + section2 + '</div>'
    )
    records = [
        {"type": "revision", "kind": "insert", "author": "Tran Thi Hoa", "date": "2026-10-01T10:00:00Z", "startBookmark": "vno-review-start-00001", "endBookmark": "vno-review-end-00001"},
        {"type": "revision", "kind": "delete", "author": "Tran Thi Hoa", "date": "2026-10-01T10:01:00Z", "startBookmark": "vno-review-start-00002", "endBookmark": "vno-review-end-00002"},
        {"type": "comment", "author": "Tran Thi Hoa", "date": "2026-10-01T10:02:00Z", "content": "Comment body from Word", "startBookmark": "vno-review-start-00003", "endBookmark": "vno-review-end-00003"},
    ]
    metadata = {"version": 1, "trackingEnabled": True, "records": records}
    metadata_hex = json.dumps(metadata, ensure_ascii=False, separators=(",", ":")).encode("utf-8").hex()
    return (
        section_css
        + f'<div title="header">{header_html}</div>'
        + sections
        + f'<div title="footer">{footer_html}</div>'
        + f'<!--vno-sections-meta: {json.dumps(section_meta, separators=(",", ":"))} -->'
        + f'<!--vno-review-meta-hex:{metadata_hex}-->'
    )


@unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
class WriterReviewRoundtripTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory(prefix="vno-writer-review-roundtrip-")
        self.root = Path(self.temp_dir.name)
        self.source = self.root / "word-created.docx"
        _source_docx(self.source)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_pdf_accepted_view_removes_deleted_ranges_and_temporary_review_anchors(self):
        metadata = {
            "version": 1, "trackingEnabled": True,
            "records": [
                {"type": "revision", "kind": "delete", "startBookmark": "vno-review-start-00001", "endBookmark": "vno-review-end-00001"},
                {"type": "comment", "startBookmark": "vno-review-start-00002", "endBookmark": "vno-review-end-00002"},
            ],
        }
        source = (
            '<p>Before <a name="vno-review-start-00001"></a>deleted '
            '<a name="vno-review-start-00002"></a>commented'
            '<a name="vno-review-end-00002"></a> text'
            '<a name="vno-review-end-00001"></a> after</p>'
            f'<!--vno-review-meta-hex:{json.dumps(metadata).encode("utf-8").hex()}-->'
        )
        accepted = main._ooxml_zip_patch().writer_accepted_view_html(source)
        self.assertIn("Before", accepted)
        self.assertIn("after", accepted)
        self.assertNotIn("deleted", accepted)
        self.assertNotIn("commented", accepted)
        self.assertNotIn("vno-review-", accepted)
        self.assertNotIn("vno-review-meta-hex", accepted)

    def test_new_writer_export_creates_header_footer_parts_relationships_and_fields(self):
        target = self.root / "created-in-writer.docx"
        header = "<p>CREATED_HEADER</p>"
        footer = (
            '<p>Trang <span data-vno-field="PAGE">1</span> / '
            '<span data-vno-field="NUMPAGES">1</span></p>'
        )
        section = {
            "id": "section-1", "active": True, "type": "nextPage",
            "pageSetup": {
                "size": "a4", "orientation": "portrait",
                "margins": {"top": 20, "right": 20, "bottom": 20, "left": 20},
                "headerDistanceMm": 12.7, "footerDistanceMm": 12.7,
            },
            "headerFooter": {
                "linkToPrevious": False, "header": header, "footer": footer,
                "headers": {"default": header}, "footers": {"default": footer},
                "differentFirstPage": True, "differentOddEven": False,
                "pageNumberRestart": False, "pageNumberStart": 1,
            },
        }
        html = (
            '<style>@page{size:210mm 297mm;margin:20mm;}</style>'
            f'<div title="header">{header}</div><p>CREATED_BODY</p>'
            f'<div title="footer">{footer}</div>'
            f'<!--vno-sections-meta: {json.dumps([section], separators=(",", ":"))} -->'
        )
        result = main.VnOfficeApi().save_document_in_place(
            html, "writer", str(target), None,
        )
        self.assertEqual(result.get("status"), "ok", result)
        parts = _parts(target)
        document = _text(parts["word/document.xml"])
        rels = _text(parts["word/_rels/document.xml.rels"])
        self.assertIn("w:headerReference", document)
        self.assertIn("w:footerReference", document)
        self.assertIn("w:titlePg", document)
        self.assertRegex(rels, r"relationships/header")
        self.assertRegex(rels, r"relationships/footer")
        header_xml = next(_text(data) for name, data in parts.items() if re.fullmatch(r"word/header\d+\.xml", name))
        footer_xml = next(_text(data) for name, data in parts.items() if re.fullmatch(r"word/footer\d+\.xml", name))
        self.assertIn("CREATED_HEADER", header_xml)
        self.assertRegex(footer_xml, r"w:instrText[^>]*>\s*PAGE\s*</w:instrText>")
        self.assertRegex(footer_xml, r"w:instrText[^>]*>\s*NUMPAGES\s*</w:instrText>")

    def test_new_document_creates_native_revisions_and_comment_ranges(self):
        target = self.root / "new-review.docx"
        records = [
            {"type": "revision", "kind": "insert", "author": "Synthetic Author", "date": "2026-10-02T00:00:00Z", "startBookmark": "vno-review-start-00001", "endBookmark": "vno-review-end-00001"},
            {"type": "revision", "kind": "delete", "author": "Synthetic Author", "date": "2026-10-02T00:01:00Z", "startBookmark": "vno-review-start-00002", "endBookmark": "vno-review-end-00002"},
            {"type": "comment", "author": "Synthetic Reviewer", "date": "2026-10-02T00:02:00Z", "content": "Synthetic comment", "startBookmark": "vno-review-start-00003", "endBookmark": "vno-review-end-00003"},
        ]
        metadata = {"version": 1, "trackingEnabled": True, "records": records}
        html = ('<p><a name="vno-review-start-00001"></a>NEW_INSERT<a name="vno-review-end-00001"></a> '
                '<a name="vno-review-start-00002"></a>NEW_DELETE<a name="vno-review-end-00002"></a> '
                '<a name="vno-review-start-00003"></a>NEW_ANCHOR<a name="vno-review-end-00003"></a></p>'
                f'<!--vno-review-meta-hex:{json.dumps(metadata).encode("utf-8").hex()}-->')
        result = main.VnOfficeApi().save_document_in_place(html, "writer", str(target), None)
        self.assertEqual(result.get("status"), "ok", result)
        parts = _parts(target)
        document = _text(parts["word/document.xml"])
        self.assertRegex(document, r'<w:ins\b[^>]*w:author="Synthetic Author"[^>]*w:date="2026-10-02T00:00:00Z"')
        self.assertRegex(document, r'<w:del\b[^>]*w:author="Synthetic Author"[^>]*w:date="2026-10-02T00:01:00Z"')
        self.assertIn("<w:delText>NEW_DELETE", document)
        self.assertIn("w:commentRangeStart", document)
        self.assertIn("w:commentRangeEnd", document)
        self.assertIn("w:commentReference", document)
        self.assertIn("Synthetic comment", _text(parts["word/comments.xml"]))
        self.assertIn("Synthetic Reviewer", _text(parts["word/comments.xml"]))
        self.assertIn("relationships/comments", _text(parts["word/_rels/document.xml.rels"]))
        self.assertIn("trackRevisions", _text(parts["word/settings.xml"]))

    def test_review_ranges_across_paragraphs_keep_valid_native_markup(self):
        import xml.etree.ElementTree as ET
        target = self.root / "cross-paragraph-review.docx"
        records = [
            {"type": "revision", "kind": "delete", "author": "Test", "date": "2026-10-02T00:00:00Z", "startBookmark": "vno-review-start-00001", "endBookmark": "vno-review-end-00001"},
            {"type": "comment", "author": "Test", "date": "2026-10-02T00:00:00Z", "content": "Across paragraphs", "startBookmark": "vno-review-start-00002", "endBookmark": "vno-review-end-00002"},
        ]
        metadata = {"version": 1, "trackingEnabled": True, "records": records}
        html = ('<p><a name="vno-review-start-00001"></a><a name="vno-review-start-00002"></a>FIRST_DELETE</p>'
                '<p>SECOND_DELETE<a name="vno-review-end-00002"></a><a name="vno-review-end-00001"></a></p>'
                f'<!--vno-review-meta-hex:{json.dumps(metadata).encode("utf-8").hex()}-->')
        result = main.VnOfficeApi().save_document_in_place(html, "writer", str(target), None)
        self.assertEqual(result.get("status"), "ok", result)
        parts = _parts(target)
        root = ET.fromstring(parts["word/document.xml"])
        paragraphs = root.findall(f".//{{{W}}}body/{{{W}}}p")
        self.assertEqual(len(paragraphs), 2)
        self.assertEqual(len(root.findall(f".//{{{W}}}del")), 2)
        for paragraph in paragraphs:
            self.assertIsNotNone(paragraph.find(f"{{{W}}}del"))
        for revision in root.findall(f".//{{{W}}}del"):
            self.assertIsNone(revision.find(f".//{{{W}}}p"), "A revision must wrap paragraph runs, not the paragraph itself")
        self.assertIsNotNone(paragraphs[0].find(f"{{{W}}}commentRangeStart"))
        self.assertIsNotNone(paragraphs[1].find(f"{{{W}}}commentRangeEnd"))
        self.assertIn("Across paragraphs", _text(parts["word/comments.xml"]))

    def test_open_save_without_edits_preserves_source_package_byte_for_byte(self):
        source_bytes = self.source.read_bytes()
        opened = _open_docx(self.source)
        self.assertTrue(opened.get("ooxmlDocumentXml"))
        self.assertTrue(opened.get("ooxmlCommentsXml"))
        self.assertIn("trackRevisions", opened.get("ooxmlSettingsXml", ""))
        target = self.root / "unchanged.docx"
        content = '<a name="vno-pristine-document"></a>' + str(opened.get("content") or "")
        result = main.VnOfficeApi().save_document_in_place(content, "writer", str(target), str(self.source))
        self.assertEqual(result.get("status"), "ok", result)
        self.assertEqual(target.read_bytes(), source_bytes)

    def test_body_edit_roundtrip_keeps_header_footer_revisions_comments_and_equation(self):
        opened = _open_docx(self.source)
        target = self.root / "body-edited.docx"
        result = main.VnOfficeApi().save_document_in_place(
            _review_html_for_edited_source(opened), "writer", str(target), str(self.source),
        )
        self.assertEqual(result.get("status"), "ok", result)
        parts = _parts(target)
        document = _text(parts["word/document.xml"])
        rels = _text(parts["word/_rels/document.xml.rels"])
        settings = _text(parts["word/settings.xml"])
        comments = _text(parts["word/comments.xml"])
        header = _text(parts["word/header1.xml"])
        footer = _text(parts["word/footer1.xml"])
        self.assertIn("BODY_ONLY_EDIT", document)
        self.assertIn("w:headerReference", document)
        self.assertIn("w:footerReference", document)
        self.assertIn("w:titlePg", document)
        self.assertEqual(len(re.findall(r"<w:sectPr\b", document)), 2,
                         "Both source sections must remain after an edit in the document body")
        self.assertIn("HEADER_SOURCE", header)
        self.assertIn("FOOTER_SOURCE", footer)
        self.assertIn("PAGE", footer)
        self.assertIn("NUMPAGES", footer)
        self.assertRegex(document, r'<w:ins\b[^>]*w:author="Tran Thi Hoa"[^>]*w:date="2026-10-01T10:00:00Z"')
        self.assertRegex(document, r'<w:del\b[^>]*w:author="Tran Thi Hoa"[^>]*w:date="2026-10-01T10:01:00Z"')
        self.assertIn("INSERTED_WORD", document)
        self.assertIn("<w:delText", document)
        self.assertIn("DELETED_WORD", document)
        self.assertIn("w:commentRangeStart", document)
        self.assertIn("w:commentRangeEnd", document)
        self.assertIn("w:commentReference", document)
        self.assertIn("Comment body from Word", comments)
        self.assertIn('w:author="Tran Thi Hoa"', comments)
        self.assertIn('w:date="2026-10-01T10:02:00Z"', comments)
        self.assertIn("relationships/comments", rels)
        self.assertIn("trackRevisions", settings)
        self.assertIn("<m:oMath", document, "Untouched OMML equation must survive body-only edit")

    def test_equation_marker_at_section_start_keeps_edited_header(self):
        from urllib.parse import quote
        opened = _open_docx(self.source)
        html = _review_html_for_edited_source(opened, header_suffix=" HEADER_EDITED")
        omml = '<m:oMath><m:r><m:t>x</m:t></m:r><m:r><m:t> + y</m:t></m:r></m:oMath>'
        mathml = '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>+</mo><mi>y</mi></math>'
        marker = ('<span data-vno-equation-export="true" data-vno-equation-id="source-000001" '
                  f'data-vno-equation-mathml="{quote(mathml, safe="")}" '
                  f'data-vno-equation-original-omml="{quote(omml, safe="")}">VNOEQSOURCE000001MARKER</span>')
        html = html.replace('<p id="vno-untouched-2">Equation: x + y</p>', '<p id="vno-edited-2">Equation: ' + marker + '</p>')
        target = self.root / "equation-section-header-edited.docx"
        result = main.VnOfficeApi().save_document_in_place(html, "writer", str(target), str(self.source))
        self.assertEqual(result.get("status"), "ok", result)
        parts = _parts(target)
        document = _text(parts["word/document.xml"])
        self.assertEqual(len(re.findall(r"<w:sectPr\b", document)), 2)
        self.assertIn("<m:oMath", document)
        self.assertTrue(any("HEADER_EDITED" in _text(data) for name, data in parts.items() if re.fullmatch(r"word/header\d+\.xml", name)))

    def test_header_footer_edits_replace_source_parts_without_losing_page_fields(self):
        opened = _open_docx(self.source)
        target = self.root / "header-footer-edited.docx"
        result = main.VnOfficeApi().save_document_in_place(
            _review_html_for_edited_source(
                opened, header_suffix=" HEADER_EDITED", footer_suffix=" FOOTER_EDITED",
            ),
            "writer", str(target), str(self.source),
        )
        self.assertEqual(result.get("status"), "ok", result)
        parts = _parts(target)
        document = _text(parts["word/document.xml"])
        rels = _text(parts["word/_rels/document.xml.rels"])
        headers = [_text(value) for name, value in parts.items() if re.fullmatch(r"word/header\d+\.xml", name)]
        footers = [_text(value) for name, value in parts.items() if re.fullmatch(r"word/footer\d+\.xml", name)]
        self.assertTrue(any("HEADER_EDITED" in header for header in headers))
        self.assertTrue(any("HEADER_SOURCE" in header and "HEADER_EDITED" not in header for header in headers))
        footer = next(value for value in footers if "FOOTER_EDITED" in value)
        self.assertIn("PAGE", footer)
        self.assertIn("NUMPAGES", footer)
        self.assertRegex(footer, r'<w:fldSimple\b[^>]*w:instr="\s*PAGE\s*"')
        self.assertRegex(footer, r'<w:fldSimple\b[^>]*w:instr="\s*NUMPAGES\s*"')
        section_refs = re.findall(r"<w:headerReference\b[^>]*r:id=\"([^\"]+)\"", document)
        self.assertGreaterEqual(len(set(section_refs)), 2,
                                "A changed section header must not overwrite another section's header part")
        self.assertRegex(rels, r"relationships/header")


if __name__ == "__main__":
    unittest.main()
