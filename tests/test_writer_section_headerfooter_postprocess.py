"""Writer Section/Header/Footer postprocess: re-inject native OOXML parts.

Two test layers:
1. Unit test of postprocess_writer_docx() directly (no soffice needed).
2. Integration round-trip via save_document_dialog + open_document_dialog
   (requires soffice).

Verifies that w:sectPr, w:headerReference, w:footerReference, and the
actual header/footer XML content survive the HTML round-trip.
"""

from __future__ import annotations

import io
import json
import re
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

import main
import importlib.util
import os

ROOT = Path(__file__).resolve().parents[1]
FIXTURE_DOCX = ROOT / "tests" / "fixtures" / "real-office-samples" / "sample-writer-headerfooter.docx"

PATCHER_PATH = os.path.join(ROOT, "adapters", "libreoffice", "common", "ooxml_zip_patch.py")
spec = importlib.util.spec_from_file_location("ooxml_zip_patch", PATCHER_PATH)
ooxml_zip_patch_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ooxml_zip_patch_mod)


HEADER_COMPANY = "Công ty TNHH Sao Việt"
HEADER_DEPT = "Phòng Kế hoạch"
FOOTER_DATE = "05/09/2026"


def _read_entry(zip_bytes: bytes, name: str) -> bytes | None:
    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
            return z.read(name)
    except (KeyError, zipfile.BadZipFile, OSError):
        return None


def _count_header_footer_refs(docx_bytes: bytes) -> tuple[int, int]:
    doc_xml = _read_entry(docx_bytes, "word/document.xml")
    if not doc_xml:
        return 0, 0
    text = doc_xml.decode("utf-8", errors="replace")
    hdr = len(re.findall(r"<w:headerReference\b", text, re.IGNORECASE))
    ftr = len(re.findall(r"<w:footerReference\b", text, re.IGNORECASE))
    return hdr, ftr


def _has_sect_pr(docx_bytes: bytes) -> bool:
    doc_xml = _read_entry(docx_bytes, "word/document.xml")
    if not doc_xml:
        return False
    return bool(re.search(r"<w:sectPr\b", doc_xml.decode("utf-8", errors="replace"), re.IGNORECASE))


def _header_footer_entries(docx_bytes: bytes) -> tuple[list[str], list[str]]:
    with zipfile.ZipFile(io.BytesIO(docx_bytes)) as z:
        names = z.namelist()
    hdr = sorted([n for n in names if re.match(r"word/header\d+\.xml$", n, re.IGNORECASE)])
    ftr = sorted([n for n in names if re.match(r"word/footer\d+\.xml$", n, re.IGNORECASE)])
    return hdr, ftr


def _make_mock_window(dest_path: str) -> "unittest.mock.MagicMock":
    from unittest.mock import MagicMock
    window = MagicMock()
    window.create_file_dialog.return_value = dest_path
    return window


class UnitPostprocessWriterDocxTests(unittest.TestCase):
    def test_w20b_w20g_created_document_indent_and_margins(self):
        converted = _build_minimal_docx(
            '<w:p><w:r><w:t>Indented</w:t></w:r></w:p>'
            '<w:sectPr><w:pgMar w:top="1440" w:right="850" w:bottom="1440" w:left="1700"/></w:sectPr>'
        )
        result = ooxml_zip_patch_mod.postprocess_created_writer_docx(
            converted,
            source_html='<style>@page { size:210mm 297mm; margin:20mm 20mm 20mm 30mm; }</style>'
                        '<p style="text-indent:1.27cm">Indented</p>',
        )
        document = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertIn('<w:ind w:firstLine="720"/>', document)
        self.assertRegex(document, r'<w:pgMar\b[^>]*w:top="1134"[^>]*w:right="1134"[^>]*w:bottom="1134"[^>]*w:left="1701"')

    def test_w20c_created_document_ul_is_native_bullet(self):
        converted = _build_minimal_docx(
            '<w:p><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Bullet A</w:t></w:r></w:p><w:sectPr/>'
        )
        numbering = (
            '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            '<w:abstractNum w:abstractNumId="2"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/>'
            '<w:lvlText w:val="%1."/></w:lvl></w:abstractNum>'
            '<w:num w:numId="1"><w:abstractNumId w:val="2"/></w:num></w:numbering>'
        ).encode("utf-8")
        converted = ooxml_zip_patch_mod.patch_ooxml_zip(converted, {"word/numbering.xml": numbering})
        result = ooxml_zip_patch_mod.postprocess_created_writer_docx(
            converted, source_html='<ul><li>Bullet A</li></ul>'
        )
        patched = _read_entry(result, "word/numbering.xml").decode("utf-8")
        self.assertIn('<w:numFmt w:val="bullet"/>', patched)
        self.assertIn('<w:lvlText w:val="•"/>', patched)

    def test_w22a_created_document_superscript_and_subscript(self):
        converted = _build_minimal_docx(
            '<w:p>'
            '<w:r><w:t>x</w:t></w:r>'
            '<w:r><w:rPr><w:position w:val="8"/></w:rPr><w:t>2</w:t></w:r>'
            '<w:r><w:t>H</w:t></w:r>'
            '<w:r><w:rPr><w:position w:val="-2"/></w:rPr><w:t>2</w:t></w:r>'
            '<w:r><w:t>O</w:t></w:r>'
            '</w:p>'
            '<w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_created_writer_docx(
            converted,
            source_html='<p>x<sup>2</sup> H<sub>2</sub>O</p>',
        )
        document = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertIn('<w:vertAlign w:val="superscript"/>', document)
        self.assertIn('<w:vertAlign w:val="subscript"/>', document)

    def test_w22a_keeps_raised_text_that_is_not_sup_sub(self):
        # w:position la "nang/ha chu" hop le cua tai lieu nhap (ham chay cho ca tai lieu mo tu DOCX):
        # run khong den tu <sup>/<sub> trong HTML nguon phai giu nguyen w:position.
        converted = _build_minimal_docx(
            '<w:p>'
            '<w:r><w:rPr><w:position w:val="6"/></w:rPr><w:t>Chữ nâng</w:t></w:r>'
            '<w:r><w:rPr><w:position w:val="8"/></w:rPr><w:t>2</w:t></w:r>'
            '</w:p>'
            '<w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_created_writer_docx(
            converted,
            source_html='<p><span style="position: relative; top: -3pt">Chữ nâng</span> x<sup>2</sup></p>',
        )
        document = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertIn('<w:position w:val="6"/></w:rPr><w:t>Chữ nâng</w:t>', document)
        self.assertIn('<w:vertAlign w:val="superscript"/></w:rPr><w:t>2</w:t>', document)
        self.assertNotIn('<w:vertAlign w:val="subscript"/>', document)

    def test_w22b_created_document_highlight(self):
        converted = _build_minimal_docx(
            '<w:p>'
            '<w:r><w:t>Prefix </w:t></w:r>'
            '<w:r><w:t>Chữ highlight vàng</w:t></w:r>'
            '</w:p>'
            '<w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_created_writer_docx(
            converted,
            source_html='<p>Prefix <mark style="background-color: rgb(255, 255, 0);">Chữ highlight vàng</mark></p>',
        )
        document = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertIn('<w:highlight w:val="yellow"/>', document)

    def test_w22b_created_document_vn_writer_gold_highlight(self):
        converted = _build_minimal_docx(
            '<w:p><w:r><w:t>Chữ tô vàng VN</w:t></w:r></w:p><w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_created_writer_docx(
            converted,
            source_html='<p><span style="background-color: rgb(255, 205, 0);">Chữ tô vàng VN</span></p>',
        )
        document = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertIn('<w:highlight w:val="yellow"/>', document)

    def test_w22c_created_document_letter_size(self):
        converted = _build_minimal_docx(
            '<w:p><w:r><w:t>Letter page</w:t></w:r></w:p>'
            '<w:sectPr><w:pgSz w:w="12246" w:h="15817"/></w:sectPr>'
        )
        result = ooxml_zip_patch_mod.postprocess_created_writer_docx(
            converted,
            source_html='@page { size: 216mm 279mm; margin: 20mm; }<p>Letter page</p>',
        )
        document = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertIn('<w:pgSz w:w="12240" w:h="15840"/>', document)

    def test_w22d_created_document_normal_page_break(self):
        converted = _build_minimal_docx(
            '<w:p><w:r><w:t>Page 1 text</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Page 2 break text</w:t></w:r></w:p>'
            '<w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_created_writer_docx(
            converted,
            source_html='<p>Page 1 text</p><p style="page-break-before: always;">Page 2 break text</p>',
        )
        document = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertIn('<w:pageBreakBefore/>', document)

    def test_r13d_empty_page_break_paragraph_via_bookmark(self):
        """R13d (d13/d21): empty HTML marker with vno-untouched-N becomes w:br type=page."""
        converted = _build_minimal_docx(
            '<w:p><w:r><w:t>Cover</w:t></w:r></w:p>'
            '<w:p><w:bookmarkStart w:id="5" w:name="vno-untouched-1"/>'
            '<w:bookmarkEnd w:id="5"/></w:p>'
            '<w:p><w:bookmarkStart w:id="6" w:name="vno-untouched-2"/>'
            '<w:bookmarkEnd w:id="6"/><w:r><w:t>1. Tóm tắt dự án</w:t></w:r></w:p>'
            '<w:sectPr/>'
        )
        source_html = (
            '<p id="vno-untouched-0">Cover</p>'
            '<p id="vno-untouched-1" style="page-break-before:always;break-before:page;margin:0;"></p>'
            '<h1 id="vno-untouched-2">1. Tóm tắt dự án</h1>'
        )
        result = ooxml_zip_patch_mod.postprocess_created_writer_docx(converted, source_html=source_html)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        paragraphs = [xml[start:end] for start, end in ooxml_zip_patch_mod._writer_body_paragraph_ranges(xml)]
        self.assertTrue(any(re.search(r'<w:br\b[^>]*w:type="page"', p) for p in paragraphs))
        heading = next(p for p in paragraphs if "Tóm tắt dự án" in p)
        self.assertNotIn("<w:pageBreakBefore", heading)
        self.assertEqual(len(re.findall(r'<w:br\b[^>]*w:type="page"', xml)), 1)

    def test_r13d_heading_break_before_via_bookmark(self):
        """R13d (d13): break-before on <h1 id=vno-untouched-N> maps to that heading, not a table cell."""
        converted = _build_minimal_docx(
            '<w:p><w:r><w:t>Cover</w:t></w:r></w:p>'
            '<w:tbl><w:tblPr><w:tblW w:w="2000" w:type="dxa"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="2000"/></w:tblGrid>'
            '<w:tr><w:tc><w:p><w:pPr><w:pageBreakBefore/></w:pPr></w:p></w:tc></w:tr></w:tbl>'
            '<w:p><w:bookmarkStart w:id="5" w:name="vno-untouched-5"/>'
            '<w:bookmarkEnd w:id="5"/><w:r><w:t>1. Tóm tắt dự án</w:t></w:r></w:p>'
            '<w:sectPr/>'
        )
        source_html = (
            '<p>Cover</p><table><tr><td></td></tr></table>'
            '<h1 id="vno-untouched-5" style="break-before: page;">1. Tóm tắt dự án</h1>'
        )
        result = ooxml_zip_patch_mod.postprocess_created_writer_docx(converted, source_html=source_html)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        heading = next(
            xml[s:e] for s, e in ooxml_zip_patch_mod._writer_body_paragraph_ranges(xml)
            if "Tóm tắt dự án" in xml[s:e]
        )
        self.assertIn("<w:pageBreakBefore/>", heading)
        cell = re.search(r"<w:tc\b[\s\S]*?</w:tc>", xml).group(0)
        self.assertIn("<w:pageBreakBefore/>", cell)

    def test_r13d_inserts_br_when_empty_marker_dropped(self):
        """R13d: LO dropped the empty page-break <p>; insert w:br type=page before the next bookmark."""
        converted = _build_minimal_docx(
            '<w:p><w:r><w:t>Cover</w:t></w:r></w:p>'
            '<w:p><w:bookmarkStart w:id="6" w:name="vno-untouched-2"/>'
            '<w:bookmarkEnd w:id="6"/><w:r><w:t>Heading after break</w:t></w:r></w:p>'
            '<w:sectPr/>'
        )
        source_html = (
            '<p id="vno-untouched-0">Cover</p>'
            '<p id="vno-untouched-1" style="page-break-before:always;break-before:page;"></p>'
            '<p id="vno-untouched-2">Heading after break</p>'
        )
        result = ooxml_zip_patch_mod.postprocess_created_writer_docx(converted, source_html=source_html)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertRegex(xml, r'<w:br\b[^>]*w:type="page"')
        paragraphs = [xml[start:end] for start, end in ooxml_zip_patch_mod._writer_body_paragraph_ranges(xml)]
        self.assertTrue(any(
            not ooxml_zip_patch_mod._paragraph_plain_text(p).strip()
            and re.search(r'<w:br\b[^>]*w:type="page"', p)
            for p in paragraphs
        ))
        heading = next(p for p in paragraphs if "Heading after break" in p)
        self.assertNotIn("<w:pageBreakBefore", heading)

    def test_r13d_collapse_heading_pbb_when_empty_br_carrier_exists(self):
        """R13d: W22d heading pbb + W37 empty br carrier must not paginate twice."""
        xml = (
            '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            '<w:body>'
            '<w:p><w:r><w:t>Cover</w:t></w:r></w:p>'
            '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
            '<w:p><w:pPr><w:pageBreakBefore/></w:pPr><w:r><w:t>1. Tóm tắt dự án</w:t></w:r></w:p>'
            '<w:sectPr/>'
            '</w:body></w:document>'
        )
        out = ooxml_zip_patch_mod._writer_collapse_consecutive_page_breaks(xml)
        paragraphs = [out[s:e] for s, e in ooxml_zip_patch_mod._writer_body_paragraph_ranges(out)]
        self.assertRegex(paragraphs[1], r'<w:br\b[^>]*w:type="page"')
        self.assertNotIn("<w:pageBreakBefore", paragraphs[2])

    def test_r13a_duplicate_adjacent_tables_removed(self):
        """R13a (d09): LibreOffice HTML→DOCX clones a body table. Drop the extra copy."""
        finance = (
            '<w:tbl>'
            '<w:tblPr><w:tblW w:w="5000" w:type="dxa"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="1250"/><w:gridCol w:w="1250"/><w:gridCol w:w="1250"/><w:gridCol w:w="1250"/></w:tblGrid>'
            '<w:tr><w:tc><w:p><w:r><w:t>Năm Tài Chính</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:p><w:r><w:t>2019</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:p><w:r><w:t>2020</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:p><w:r><w:t>2021</w:t></w:r></w:p></w:tc></w:tr>'
            '<w:tr><w:tc><w:p><w:r><w:t>Doanh Thu</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:p><w:r><w:t>68.038.183</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:p><w:r><w:t>432.115.763</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:p><w:r><w:t>547.603.274</w:t></w:r></w:p></w:tc></w:tr>'
            '</w:tbl>'
        )
        industry = (
            '<w:tbl>'
            '<w:tblPr><w:tblW w:w="4000" w:type="dxa"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/></w:tblGrid>'
            '<w:tr><w:tc><w:p><w:r><w:t>Mã ngành</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:p><w:r><w:t>Tên ngành</w:t></w:r></w:p></w:tc></w:tr>'
            '</w:tbl>'
        )
        converted = _build_minimal_docx(
            '<w:p><w:r><w:t>Before</w:t></w:r></w:p>'
            + industry + finance + '<w:p/>' + finance
            + '<w:p><w:r><w:t>After</w:t></w:r></w:p><w:sectPr/>'
        )
        source_html = (
            '<p>Before</p>'
            '<table><tr><td>Mã ngành</td><td>Tên ngành</td></tr></table>'
            '<table><tr><td>Năm Tài Chính</td><td>2019</td><td>2020</td><td>2021</td></tr>'
            '<tr><td>Doanh Thu</td><td>68.038.183</td><td>432.115.763</td><td>547.603.274</td></tr></table>'
            '<p>After</p>'
        )
        result = ooxml_zip_patch_mod.postprocess_created_writer_docx(converted, source_html=source_html)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertEqual(xml.count("<w:tbl>"), 2)
        self.assertEqual(xml.count("Năm Tài Chính"), 1)
        self.assertIn("Mã ngành", xml)
        self.assertIn("After", xml)

    def test_r13a_keeps_identical_tables_when_html_has_the_same_count(self):
        """Two identical tables that already exist in the HTML source stay."""
        table = (
            '<w:tbl><w:tblPr><w:tblW w:w="2000" w:type="dxa"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="2000"/></w:tblGrid>'
            '<w:tr><w:tc><w:p><w:r><w:t>Same</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'
        )
        converted = _build_minimal_docx(table + table + '<w:sectPr/>')
        source_html = '<table><tr><td>Same</td></tr></table><table><tr><td>Same</td></tr></table>'
        result = ooxml_zip_patch_mod.postprocess_created_writer_docx(converted, source_html=source_html)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertEqual(xml.count("<w:tbl>"), 2)

    def test_r13a_keeps_different_adjacent_tables(self):
        a = (
            '<w:tbl><w:tblPr><w:tblW w:w="2000" w:type="dxa"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="2000"/></w:tblGrid>'
            '<w:tr><w:tc><w:p><w:r><w:t>Alpha</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'
        )
        b = (
            '<w:tbl><w:tblPr><w:tblW w:w="2000" w:type="dxa"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="2000"/></w:tblGrid>'
            '<w:tr><w:tc><w:p><w:r><w:t>Beta</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'
        )
        converted = _build_minimal_docx(a + b + '<w:sectPr/>')
        source_html = '<table><tr><td>Alpha</td></tr></table><table><tr><td>Beta</td></tr></table>'
        result = ooxml_zip_patch_mod.postprocess_created_writer_docx(converted, source_html=source_html)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertEqual(xml.count("<w:tbl>"), 2)
        self.assertIn("Alpha", xml)
        self.assertIn("Beta", xml)

    def test_w22e_created_document_section_landscape(self):
        converted = _build_minimal_docx(
            '<w:p><w:r><w:t>Section 1 text</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Section 2 text</w:t></w:r></w:p>'
            '<w:sectPr><w:pgSz w:w="12246" w:h="15817"/></w:sectPr>'
        )
        source_html = (
            '@page vno-section-1 { size: 216mm 279mm; }\n'
            '@page vno-section-2 { size: 279mm 216mm; }\n'
            '<div data-vno-export-section="section-1"><p>Section 1 text</p></div>'
            '<div data-vno-export-section="section-2"><p>Section 2 text</p></div>'
        )
        result = ooxml_zip_patch_mod.postprocess_created_writer_docx(
            converted,
            source_html=source_html,
        )
        document = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertIn('w:orient="landscape"', document)
        self.assertIn('<w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/>', document)

    def test_w22f_created_document_table_column_width(self):
        converted = _build_minimal_docx(
            '<w:tbl>'
            '<w:tblPr><w:tblW w:w="3624" w:type="dxa"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="1203"/><w:gridCol w:w="1188"/><w:gridCol w:w="1233"/></w:tblGrid>'
            '<w:tr><w:tc><w:tcPr><w:tcW w:w="1203" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>Col 1</w:t></w:r></w:p></w:tc></w:tr>'
            '</w:tbl>'
            '<w:sectPr/>'
        )
        source_html = (
            '<table><tr><td style="width: 3cm;">Col 1</td><td>Col 2</td><td>Col 3</td></tr></table>'
        )
        result = ooxml_zip_patch_mod.postprocess_created_writer_docx(
            converted,
            source_html=source_html,
        )
        document = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertIn('<w:gridCol w:w="1700"/>', document)
        self.assertIn('<w:tcW w:w="1700" w:type="dxa"/>', document)

    def test_w22g_created_document_tab_stop(self):
        converted = _build_minimal_docx(
            '<w:p><w:pPr><w:pStyle w:val="BodyText"/></w:pPr><w:r><w:t>Col 1 Col 2 after Tab 5cm</w:t></w:r></w:p>'
            '<w:sectPr/>'
        )
        source_html = '<p style="tab-size: 5cm;">Col 1\tCol 2 after Tab 5cm</p>'
        result = ooxml_zip_patch_mod.postprocess_created_writer_docx(
            converted,
            source_html=source_html,
        )
        document = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertIn('<w:tabs><w:tab w:val="left" w:pos="2834"/></w:tabs>', document)

    def test_w20e_created_document_break_is_before_second_section_text(self):
        converted = _build_minimal_docx(
            '<w:p><w:r><w:t>Before</w:t></w:r></w:p>'
            '<w:p><w:pPr></w:pPr><w:r><w:t>After</w:t></w:r></w:p>'
            '<w:sectPr><w:type w:val="nextPage"/><w:pgMar w:top="1440"/></w:sectPr>'
        )
        result = ooxml_zip_patch_mod.postprocess_created_writer_docx(
            converted,
            source_html='<div data-vno-export-section="section-1"><p>Before</p></div>'
                        '<div data-vno-export-section="section-2"><p>After</p></div>',
        )
        document = _read_entry(result, "word/document.xml").decode("utf-8")
        before = next(p for p in re.findall(r'<w:p\b[^>]*>[\s\S]*?</w:p>', document) if "Before" in p)
        self.assertIn('<w:sectPr>', before)
        self.assertIn('<w:type w:val="nextPage"/>', before)
        final_section = re.findall(r'<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr>', document)[-1]
        self.assertNotIn('<w:type w:val="nextPage"/>', final_section)

    def test_relationship_id_allocator_accepts_single_quoted_xml(self):
        rels = "<Relationships><Relationship Id='rId137' Target='media/image.png'/></Relationships>"
        self.assertEqual(ooxml_zip_patch_mod._max_rels_rid(rels), 137)

    def test_duplicate_untouched_textbox_inside_source_group_is_removed(self):
        source = (
            '<w:p><w:r><w:drawing><wp:anchor><wp:docPr name="Group 1"/>'
            '<wpg:wgp><w:txbxContent><w:p><w:r><w:t>Duplicate label</w:t></w:r></w:p>'
            '</w:txbxContent></wpg:wgp></wp:anchor></w:drawing></w:r></w:p>'
        )
        converted = (
            '<w:p><w:r><w:drawing><wp:anchor><wp:docPr name="Frame1"/>'
            '<wps:txbx/><w:txbxContent><w:p><w:bookmarkStart w:id="1" '
            'w:name="vno-untouched-1"/><w:r><w:t>Duplicate label</w:t></w:r></w:p>'
            '</w:txbxContent></wp:anchor></w:drawing></w:r></w:p>'
        )
        result = ooxml_zip_patch_mod._remove_duplicate_writer_textbox_anchors(converted, source)
        self.assertNotIn("Frame1", result)

    """Direct tests for postprocess_writer_docx — no soffice required."""

    @unittest.skipUnless(FIXTURE_DOCX.is_file(), "Fixture missing")
    def test_noop_when_source_docx_is_none(self):
        fake = b"fake-docx-bytes"
        result = ooxml_zip_patch_mod.postprocess_writer_docx(fake, source_docx=None)
        self.assertEqual(result, fake)

    def test_duplicate_wps_solid_fill_is_repaired_and_anchor_semantics_restored(self):
        source = _build_minimal_docx(
            '<w:p><w:r><w:drawing><wp:anchor behindDoc="1"><wp:positionH relativeFrom="page"/><wp:positionV relativeFrom="page"/><wp:wrapSquare/></wp:anchor></w:drawing></w:r></w:p><w:sectPr></w:sectPr>'
        )
        converted = _build_minimal_docx(
            '<w:p><w:r><w:drawing><wp:anchor behindDoc="0"><wp:positionH relativeFrom="paragraph"/><wp:positionV relativeFrom="paragraph"/><wp:wrapNone/><wps:wsp><wps:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:solidFill><a:srgbClr val="FFFF00"/></a:solidFill></wps:spPr></wps:wsp></wp:anchor></w:drawing></w:r></w:p><w:sectPr></w:sectPr>'
        )
        result = ooxml_zip_patch_mod.postprocess_writer_docx(converted, source_docx=source)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        sp_pr = re.search(r"<wps:spPr\b[^>]*>([\s\S]*?)</wps:spPr>", xml).group(1)
        self.assertEqual(len(re.findall(r"<a:solidFill\b", sp_pr)), 1)
        self.assertIn('val="FFFF00"', sp_pr)
        self.assertIn('behindDoc="1"', xml)
        self.assertIn('<wp:positionH relativeFrom="paragraph"', xml)
        self.assertIn('<wp:wrapSquare', xml)
        transparent = ooxml_zip_patch_mod._repair_writer_double_fills(
            '<wps:spPr><a:noFill/><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></wps:spPr>'
        )
        self.assertIn("<a:noFill/>", transparent)
        self.assertNotIn("<a:solidFill", transparent)

    def _imported_shape_anchor(self, *, name="Rect A", pos_offset=False, off_x=10, off_y=20):
        position = (
            '<wp:positionH relativeFrom="column"><wp:posOffset>1000</wp:posOffset></wp:positionH>'
            '<wp:positionV relativeFrom="paragraph"><wp:posOffset>2000</wp:posOffset></wp:positionV>'
            if pos_offset else ""
        )
        return (
            f'<wp:anchor><wp:docPr id="1" name="{name}"/>{position}'
            f'<wps:wsp><wps:cNvPr name="{name}"/><a:xfrm>'
            f'<a:off x="{off_x}" y="{off_y}"/><a:ext cx="3000" cy="4000"/>'
            f'</a:xfrm></wps:wsp></wp:anchor>'
        )

    def _postprocess_imported_shape(self, source_anchor, converted_body):
        source_docx = _build_minimal_docx(
            f'<w:p><w:r><w:drawing>{source_anchor}</w:drawing></w:r></w:p><w:sectPr/>'
        )
        converted_docx = _build_minimal_docx(converted_body)
        result = ooxml_zip_patch_mod.postprocess_writer_docx(converted_docx, source_docx=source_docx)
        return _read_entry(result, "word/document.xml").decode("utf-8")

    def test_untouched_imported_shape_is_passthrough_once(self):
        source_anchor = self._imported_shape_anchor()
        converted = (
            '<w:p><w:bookmarkStart w:id="1" w:name="vno-untouched-0"/>'
            '<w:r><w:drawing><wp:anchor><wp:docPr id="9" name="Shape1"/>'
            '<pic:pic/></wp:anchor></w:drawing></w:r></w:p><w:sectPr/>'
        )
        xml = self._postprocess_imported_shape(source_anchor, converted)
        self.assertEqual(len(re.findall(r"<wps:wsp\b", xml)), 1)
        self.assertEqual(len(re.findall(r"<wp:anchor\b", xml)), 1)
        self.assertIn('name="Rect A"', xml)
        self.assertNotIn("VNO_SHAPE_MUTATION_", xml)
        self.assertNotIn("<pic:pic", xml)

    def test_moved_imported_shape_updates_native_anchor_once(self):
        marker = "VNO_SHAPE_MUTATION_" + json.dumps(
            {"type": "edit", "anchorName": "Rect A", "shapeName": "Rect A", "dx": 2, "dy": -1},
            separators=(",", ":"),
        ).encode().hex()
        local_anchor = self._imported_shape_anchor()
        local_xml = self._postprocess_imported_shape(
            local_anchor,
            f'<w:p><w:r><w:t>{marker}</w:t></w:r></w:p>'
            f'<w:p><w:bookmarkStart w:id="1" w:name="vno-untouched-0"/>'
            f'<w:r><w:drawing>{local_anchor}</w:drawing></w:r></w:p><w:sectPr/>',
        )
        self.assertNotIn("VNO_SHAPE_MUTATION_", local_xml)
        self.assertEqual(len(re.findall(r"<wps:wsp\b", local_xml)), 1)
        self.assertIn('<a:off x="19060" y="-9505"/>', local_xml)

        offset_anchor = self._imported_shape_anchor(pos_offset=True, off_x=0, off_y=0)
        offset_xml = self._postprocess_imported_shape(
            offset_anchor,
            f'<w:p><w:r><w:t>{marker}</w:t></w:r></w:p>'
            f'<w:p><w:bookmarkStart w:id="1" w:name="vno-untouched-0"/>'
            f'<w:r><w:drawing>{offset_anchor}</w:drawing></w:r></w:p><w:sectPr/>',
        )
        self.assertEqual(len(re.findall(r"<wps:wsp\b", offset_xml)), 1)
        self.assertIn("<wp:posOffset>20050</wp:posOffset>", offset_xml)
        self.assertIn("<wp:posOffset>-7525</wp:posOffset>", offset_xml)
        self.assertIn('<a:off x="0" y="0"/>', offset_xml)

        split_marker = (
            f'<w:document><w:body><w:p><w:r><w:t>{marker[:24]}</w:t></w:r>'
            f'<w:r><w:t>{marker[24:]}</w:t></w:r></w:p><w:sectPr/></w:body></w:document>'
        )
        stripped, names = ooxml_zip_patch_mod._strip_writer_shape_mutation_markers(split_marker)
        self.assertEqual(names[0]["type"], "edit")
        self.assertNotIn("VNO_SHAPE_MUTATION_", stripped)

    def test_deleted_imported_shape_is_not_restored(self):
        marker = "VNO_SHAPE_MUTATION_" + json.dumps(
            {"type": "delete", "anchorName": "Rect A", "shapeName": "Rect A"},
            separators=(",", ":"),
        ).encode().hex()
        source_anchor = self._imported_shape_anchor()
        xml = self._postprocess_imported_shape(
            source_anchor,
            f'<w:p><w:r><w:t>{marker}</w:t></w:r></w:p>'
            f'<w:p><w:bookmarkStart w:id="1" w:name="vno-untouched-0"/>'
            f'<w:r><w:drawing><wp:anchor><wp:docPr id="9" name="Shape1"/>'
            f'<pic:pic/></wp:anchor></w:drawing></w:r></w:p><w:sectPr/>',
        )
        self.assertNotIn("VNO_SHAPE_MUTATION_", xml)
        self.assertNotIn("<wp:anchor", xml)
        self.assertNotIn("<wps:wsp", xml)
        self.assertNotIn("<pic:pic", xml)

    def _format_roundtrip_xml(self, source_ppr: str, source_rpr: str = "", marker: bool = True) -> str:
        source = _build_minimal_docx(
            f'<w:p>{source_ppr}<w:r>{source_rpr}<w:t>Exact audit text</w:t></w:r></w:p><w:sectPr/>'
        )
        bookmark = '<w:bookmarkStart w:id="9" w:name="vno-untouched-0"/><w:bookmarkEnd w:id="9"/>' if marker else ""
        converted = _build_minimal_docx(
            f'<w:p><w:pPr><w:jc w:val="left"/></w:pPr>{bookmark}<w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>Exact audit text</w:t></w:r></w:p><w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_writer_docx(converted, source_docx=source)
        return _read_entry(result, "word/document.xml").decode("utf-8")

    def test_matched_format_overlay_restores_font_and_size(self):
        xml = self._format_roundtrip_xml("", '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="28"/></w:rPr>')
        self.assertIn('w:ascii="Arial"', xml)
        self.assertIn('<w:sz w:val="28"/>', xml)
        self.assertNotIn('<w:sz w:val="20"/>', xml)

    def test_matched_format_overlay_restores_indent_and_spacing(self):
        # W35 (đo d20 21/9 bằng Word COM): đoạn chưa sửa lấy lại cả w:spacing của nguồn — LibreOffice gắn
        # after=283 cho mọi đoạn trong ô bảng nên 3 trang thành 6; quyết định 13/9 bỏ spacing (MYTIME 88 → 90 trang)
        # được đo khi còn lỗi ngắt trang, nay thay bằng đo lại toàn bộ batch.
        xml = self._format_roundtrip_xml('<w:pPr><w:spacing w:before="120" w:after="240" w:line="360" w:lineRule="auto"/><w:ind w:left="720" w:firstLine="360"/></w:pPr>')
        self.assertIn('w:left="720"', xml)
        self.assertIn('<w:spacing w:before="120" w:after="240" w:line="360" w:lineRule="auto"/>', xml)
        # thứ tự schema: spacing trước ind trước jc
        self.assertLess(xml.find("<w:spacing"), xml.find("<w:ind"))

    def test_matched_format_overlay_removes_injected_body_text_style(self):
        xml = self._format_roundtrip_xml("")
        self.assertNotIn("<w:pStyle", xml)
        self.assertNotIn('<w:jc w:val="left"', xml)

    def test_untouched_empty_carrier_is_matched_between_text_boundaries(self):
        source = _build_minimal_docx(
            '<w:p><w:r><w:t>Before</w:t></w:r></w:p>'
            '<w:p><w:pPr><w:spacing w:after="240"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing/></w:r></w:p>'
            '<w:p><w:r><w:t>After</w:t></w:r></w:p><w:sectPr/>'
        )
        converted = _build_minimal_docx(
            '<w:p><w:r><w:t>Before</w:t></w:r></w:p>'
            '<w:p><w:pPr><w:spacing w:after="0"/><w:jc w:val="left"/></w:pPr>'
            '<w:bookmarkStart w:id="9" w:name="vno-untouched-1"/><w:bookmarkEnd w:id="9"/><w:r><w:drawing/></w:r></w:p>'
            '<w:p><w:r><w:t>After</w:t></w:r></w:p><w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_writer_docx(converted, source_docx=source)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertIn('<w:spacing w:after="240"/>', xml)  # W35: spacing nguon
        self.assertIn('<w:jc w:val="center"/>', xml)

    def test_pristine_document_restores_empty_paragraphs_by_lcs(self):
        source = _build_minimal_docx(
            '<w:p><w:pPr><w:spacing w:after="240"/><w:jc w:val="center"/></w:pPr></w:p>'
            '<w:p><w:r><w:t>Stable</w:t></w:r></w:p><w:sectPr/>'
        )
        converted = _build_minimal_docx(
            '<w:p><w:pPr><w:spacing w:after="0"/><w:jc w:val="left"/></w:pPr>'
            '<w:bookmarkStart w:id="8" w:name="vno-pristine-document"/><w:bookmarkEnd w:id="8"/></w:p>'
            '<w:p><w:r><w:t>Stable</w:t></w:r></w:p><w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_writer_docx(converted, source_docx=source)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertIn('<w:spacing w:after="240"/>', xml)  # W35: spacing nguon
        self.assertIn('<w:jc w:val="center"/>', xml)

    def test_pristine_document_reinserts_anchor_page_break_carrier_in_lcs_slot(self):
        source = _build_minimal_docx(
            '<w:p><w:r><w:t>Before</w:t></w:r></w:p>'
            '<w:p><w:r><w:br w:type="page"/><w:drawing><wp:anchor behindDoc="0">'
            '<wp:positionV relativeFrom="page"><wp:posOffset>123</wp:posOffset></wp:positionV>'
            '<wp:docPr id="7" name="Picture Carrier"/><pic:pic/>'
            '</wp:anchor></w:drawing></w:r></w:p>'
            '<w:p><w:r><w:t>After</w:t></w:r></w:p><w:sectPr/>'
        )
        converted = _build_minimal_docx(
            '<w:p><w:bookmarkStart w:id="8" w:name="vno-pristine-document"/>'
            '<w:bookmarkEnd w:id="8"/><w:r><w:drawing><wp:anchor behindDoc="0">'
            '<wp:positionV relativeFrom="paragraph"><wp:posOffset>999</wp:posOffset></wp:positionV>'
            '<wp:docPr id="70" name="Picture Carrier"/><pic:pic/>'
            '</wp:anchor></w:drawing></w:r></w:p>'
            '<w:p><w:r><w:t>Before</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>After</w:t></w:r></w:p><w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_writer_docx(converted, source_docx=source)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        paragraphs = [xml[start:end] for start, end in ooxml_zip_patch_mod._writer_body_paragraph_ranges(xml)]
        self.assertEqual([ooxml_zip_patch_mod._paragraph_plain_text(p) for p in paragraphs[:4]], ["", "Before", "", "After"])
        self.assertIn('w:type="page"', paragraphs[2])
        self.assertIn('name="Picture Carrier"', paragraphs[2])
        self.assertNotIn('name="Picture Carrier"', paragraphs[0])

    def test_pristine_document_moves_anchor_to_matched_text_paragraph(self):
        source = _build_minimal_docx(
            '<w:p><w:r><w:t>Cover</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Target</w:t><w:drawing><wp:anchor behindDoc="0">'
            '<wp:positionV relativeFrom="page"/><wp:docPr id="3" name="Group Target"/><wpg:wgp/>'
            '</wp:anchor></w:drawing></w:r></w:p><w:sectPr/>'
        )
        converted = _build_minimal_docx(
            '<w:p><w:bookmarkStart w:id="8" w:name="vno-pristine-document"/>'
            '<w:bookmarkEnd w:id="8"/><w:r><w:drawing><wp:anchor behindDoc="0">'
            '<wp:positionV relativeFrom="paragraph"/><wp:docPr id="30" name="Group Target"/><wpg:wgp/>'
            '</wp:anchor></w:drawing></w:r></w:p>'
            '<w:p><w:r><w:t>Cover</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Target</w:t></w:r></w:p><w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_writer_docx(converted, source_docx=source)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        paragraphs = [xml[start:end] for start, end in ooxml_zip_patch_mod._writer_body_paragraph_ranges(xml)]
        self.assertNotIn('name="Group Target"', paragraphs[0])
        target = next(p for p in paragraphs if ooxml_zip_patch_mod._paragraph_plain_text(p) == "Target")
        self.assertIn('name="Group Target"', target)

    def test_edited_document_restores_untouched_empty_anchor_carrier(self):
        source = _build_minimal_docx(
            '<w:p><w:r><w:t>Before</w:t></w:r></w:p>'
            '<w:p><w:r><w:br w:type="page"/><w:drawing><wp:anchor behindDoc="0">'
            '<wp:positionV relativeFrom="page"/><wp:docPr id="7" name="Carrier"/><pic:pic/>'
            '</wp:anchor></w:drawing></w:r></w:p>'
            '<w:p><w:r><w:t>Edited</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>After</w:t></w:r></w:p><w:sectPr/>'
        )
        converted = _build_minimal_docx(
            '<w:p><w:r><w:drawing><wp:anchor behindDoc="0">'
            '<wp:positionV relativeFrom="paragraph"/><wp:docPr id="70" name="Carrier"/><pic:pic/>'
            '</wp:anchor></w:drawing></w:r></w:p>'
            '<w:p><w:bookmarkStart w:id="8" w:name="vno-untouched-0"/>'
            '<w:bookmarkEnd w:id="8"/><w:r><w:t>Before</w:t></w:r></w:p>'
            '<w:p><w:bookmarkStart w:id="9" w:name="vno-untouched-1"/>'
            '<w:bookmarkEnd w:id="9"/><w:r><w:drawing/></w:r></w:p>'
            '<w:p><w:r><w:t>Edited and bold</w:t></w:r></w:p>'
            '<w:p><w:bookmarkStart w:id="10" w:name="vno-untouched-3"/>'
            '<w:bookmarkEnd w:id="10"/><w:r><w:t>After</w:t></w:r></w:p><w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_writer_docx(converted, source_docx=source)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        paragraphs = [xml[start:end] for start, end in ooxml_zip_patch_mod._writer_body_paragraph_ranges(xml)]
        carrier = next(p for p in paragraphs if 'name="Carrier"' in p)
        self.assertIn('w:type="page"', carrier)
        self.assertEqual(ooxml_zip_patch_mod._paragraph_plain_text(carrier), "")
        self.assertNotIn('name="Carrier"', paragraphs[0])

    def test_edited_document_turns_untouched_carrier_section_into_page_break(self):
        source = _build_minimal_docx(
            '<w:p><w:r><w:t>Before</w:t></w:r></w:p>'
            '<w:p><w:pPr><w:sectPr><w:type w:val="nextPage"/></w:sectPr></w:pPr>'
            '<w:r><w:drawing><wp:anchor><wp:docPr id="7" name="Section Carrier"/>'
            '<pic:pic/></wp:anchor></w:drawing></w:r></w:p>'
            '<w:p><w:r><w:t>After</w:t></w:r></w:p><w:sectPr/>'
        )
        converted = _build_minimal_docx(
            '<w:p><w:r><w:drawing><wp:anchor><wp:docPr id="70" name="Section Carrier"/>'
            '<pic:pic/></wp:anchor></w:drawing></w:r></w:p>'
            '<w:p><w:pPr><w:pStyle w:val="BodyText"/></w:pPr>'
            '<w:r><w:br w:type="page"/></w:r></w:p>'
            '<w:p><w:bookmarkStart w:id="8" w:name="vno-untouched-0"/>'
            '<w:bookmarkEnd w:id="8"/><w:r><w:t>Before</w:t></w:r></w:p>'
            '<w:p><w:bookmarkStart w:id="9" w:name="vno-untouched-1"/>'
            '<w:bookmarkEnd w:id="9"/><w:r><w:drawing/></w:r></w:p>'
            '<w:p><w:bookmarkStart w:id="10" w:name="vno-untouched-2"/>'
            '<w:bookmarkEnd w:id="10"/><w:r><w:t>After</w:t></w:r></w:p><w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_writer_docx(converted, source_docx=source)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        paragraphs = [xml[start:end] for start, end in ooxml_zip_patch_mod._writer_body_paragraph_ranges(xml)]
        carrier = next(p for p in paragraphs if 'name="Section Carrier"' in p)
        self.assertIn('w:type="page"', carrier)
        self.assertNotIn('<w:sectPr', carrier)
        self.assertEqual(xml.count('w:type="page"'), 1)

    def test_edited_document_does_not_recreate_deleted_empty_carrier(self):
        source = _build_minimal_docx(
            '<w:p><w:r><w:t>Before</w:t></w:r></w:p>'
            '<w:p><w:r><w:br w:type="page"/><w:drawing><wp:anchor>'
            '<wp:docPr id="7" name="Deleted Carrier"/><pic:pic/>'
            '</wp:anchor></w:drawing></w:r></w:p>'
            '<w:p><w:r><w:t>After</w:t></w:r></w:p><w:sectPr/>'
        )
        converted = _build_minimal_docx(
            '<w:p><w:r><w:drawing><wp:anchor><wp:docPr id="70" name="Deleted Carrier"/>'
            '<pic:pic/></wp:anchor></w:drawing></w:r></w:p>'
            '<w:p><w:bookmarkStart w:id="8" w:name="vno-untouched-0"/>'
            '<w:bookmarkEnd w:id="8"/><w:r><w:t>Before</w:t></w:r></w:p>'
            '<w:p><w:bookmarkStart w:id="9" w:name="vno-untouched-1"/>'
            '<w:bookmarkEnd w:id="9"/><w:r><w:t>After</w:t></w:r></w:p><w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_writer_docx(converted, source_docx=source)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertNotIn('w:type="page"', xml)

    def test_matched_format_overlay_restores_alignment_and_list(self):
        xml = self._format_roundtrip_xml('<w:pPr><w:jc w:val="center"/><w:numPr><w:ilvl w:val="1"/><w:numId w:val="7"/></w:numPr></w:pPr>')
        self.assertIn('<w:jc w:val="center"/>', xml)
        self.assertIn('<w:numId w:val="7"/>', xml)

    def test_touched_same_text_keeps_libreoffice_formatting(self):
        source = _build_minimal_docx(
            '<w:p><w:r><w:rPr><w:color w:val="FF0000"/></w:rPr><w:t>Exact audit text</w:t></w:r></w:p><w:sectPr/>'
        )
        converted = _build_minimal_docx(
            '<w:p><w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Exact audit text</w:t></w:r></w:p><w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_writer_docx(converted, source_docx=source)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertIn("<w:b/>", xml)
        self.assertIn('<w:sz w:val="20"/>', xml)
        self.assertNotIn('w:val="FF0000"', xml)

    def test_changed_text_without_marker_is_not_restored(self):
        source = _build_minimal_docx(
            '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Original text</w:t></w:r></w:p><w:sectPr/>'
        )
        converted = _build_minimal_docx(
            '<w:p><w:r><w:rPr><w:i/></w:rPr><w:t>User changed text</w:t></w:r></w:p><w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_writer_docx(converted, source_docx=source)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertIn("User changed text", xml)
        self.assertIn("<w:i/>", xml)
        self.assertNotIn("<w:b/>", xml)

    def test_untouched_marker_is_removed_from_final_docx(self):
        xml = self._format_roundtrip_xml("", '<w:rPr><w:b/></w:rPr>')
        self.assertIn("<w:b/>", xml)
        self.assertNotIn("vno-untouched-", xml)
        self.assertNotIn('w:bookmarkEnd w:id="9"', xml)

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    def test_libreoffice_html_to_docx_preserves_untouched_bookmark(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "untouched.html"
            source.write_text(
                '<!doctype html><meta charset="utf-8"><body><p>'
                '<a name="vno-untouched-0"></a>Exact audit text</p></body>',
                encoding="utf-8",
            )
            output = main._run_soffice_convert(str(source), "docx", temp_dir, app_kind="writer")
            xml = _read_entry(Path(output).read_bytes(), "word/document.xml").decode("utf-8")
            self.assertRegex(xml, r'<w:bookmarkStart\b[^>]*w:name="vno-untouched-0"')

    @unittest.skipUnless(FIXTURE_DOCX.is_file(), "Fixture missing")
    def test_noop_when_no_header_footer_refs(self):
        original = FIXTURE_DOCX.read_bytes()
        fake_converted = b"fake"
        result = ooxml_zip_patch_mod.postprocess_writer_docx(fake_converted, source_docx=original)
        self.assertEqual(result, fake_converted)

    @unittest.skipUnless(FIXTURE_DOCX.is_file(), "Fixture missing")
    def test_header_footer_entries_injected(self):
        original = FIXTURE_DOCX.read_bytes()
        orig_hdr, orig_ftr = _header_footer_entries(original)
        self.assertTrue(orig_hdr, "Original should have header entries")
        self.assertTrue(orig_ftr, "Original should have footer entries")

        original_xml = _read_entry(original, "word/document.xml").decode("utf-8", errors="replace")

        minimal_converted = _build_minimal_docx(original_xml)
        result = ooxml_zip_patch_mod.postprocess_writer_docx(
            minimal_converted, source_docx=original
        )

        res_hdr, res_ftr = _header_footer_entries(result)
        self.assertEqual(len(res_hdr), len(orig_hdr), "Header entry count mismatch")
        self.assertEqual(len(res_ftr), len(orig_ftr), "Footer entry count mismatch")

        for entry in orig_hdr:
            orig_data = _read_entry(original, entry)
            res_data = _read_entry(result, entry)
            self.assertIsNotNone(res_data, f"{entry} missing from result")
            self.assertEqual(orig_data, res_data, f"{entry} content differs")

        for entry in orig_ftr:
            orig_data = _read_entry(original, entry)
            res_data = _read_entry(result, entry)
            self.assertIsNotNone(res_data, f"{entry} missing from result")
            self.assertEqual(orig_data, res_data, f"{entry} content differs")

    @unittest.skipUnless(FIXTURE_DOCX.is_file(), "Fixture missing")
    def test_sect_pr_and_refs_preserved(self):
        original = FIXTURE_DOCX.read_bytes()
        original_xml = _read_entry(original, "word/document.xml").decode("utf-8", errors="replace")

        minimal_converted = _build_minimal_docx(
            "<w:body><w:p><w:r><w:t>Body only</w:t></w:r></w:p></w:body>"
        )
        result = ooxml_zip_patch_mod.postprocess_writer_docx(
            minimal_converted, source_docx=original
        )

        self.assertTrue(_has_sect_pr(result), "w:sectPr should be injected")
        hdr, ftr = _count_header_footer_refs(result)
        self.assertGreater(hdr, 0, "w:headerReference should be injected")
        self.assertGreater(ftr, 0, "w:footerReference should be injected")

        result_xml = _read_entry(result, "word/document.xml").decode("utf-8", errors="replace")
        self.assertIn("rId", result_xml, "rId references should be present in result")

    @unittest.skipUnless(FIXTURE_DOCX.is_file(), "Fixture missing")
    def test_header_content_matches_original(self):
        original = FIXTURE_DOCX.read_bytes()
        original_xml = _read_entry(original, "word/document.xml").decode("utf-8", errors="replace")

        minimal_converted = _build_minimal_docx(original_xml)
        result = ooxml_zip_patch_mod.postprocess_writer_docx(
            minimal_converted, source_docx=original
        )

        for entry_name in ["word/header1.xml"]:
            orig = _read_entry(original, entry_name)
            res = _read_entry(result, entry_name)
            if orig:
                self.assertIsNotNone(res, f"{entry_name} missing")
                orig_text = orig.decode("utf-8", errors="replace")
                res_text = res.decode("utf-8", errors="replace")
                self.assertIn(HEADER_COMPANY, res_text, f"{entry_name} should contain company name")
                self.assertIn(HEADER_DEPT, res_text, f"{entry_name} should contain dept name")

        for entry_name in ["word/footer1.xml"]:
            orig = _read_entry(original, entry_name)
            res = _read_entry(result, entry_name)
            if orig:
                self.assertIsNotNone(res, f"{entry_name} missing")
                res_text = res.decode("utf-8", errors="replace")
                self.assertIn(FOOTER_DATE, res_text, f"{entry_name} should contain footer date")

    def test_w27a_restores_page_break_on_paragraph_by_order(self):
        """W27a: Source has page break on 2nd paragraph; converted lost it.
        Restore by matching paragraphs by ORDER (not text)."""
        source = _build_minimal_docx(
            '<w:p><w:r><w:t>Para 1</w:t></w:r></w:p>'
            '<w:p><w:pPr><w:pageBreakBefore/></w:pPr><w:r><w:t>Para 2</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Para 3</w:t></w:r></w:p>'
            '<w:sectPr/>'
        )
        converted = _build_minimal_docx(
            '<w:p><w:r><w:t>Para 1</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Para 2</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Para 3</w:t></w:r></w:p>'
            '<w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_writer_docx(converted, source_docx=source)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        # 2nd paragraph should have pageBreakBefore
        paragraphs = [xml[start:end] for start, end in ooxml_zip_patch_mod._writer_body_paragraph_ranges(xml)]
        self.assertEqual(len(paragraphs), 3)
        self.assertIn('<w:pageBreakBefore/>', paragraphs[1])
        self.assertNotIn('<w:pageBreakBefore/>', paragraphs[0])
        self.assertNotIn('<w:pageBreakBefore/>', paragraphs[2])

    def test_w27a_restores_page_break_on_table_first_cell_paragraph(self):
        """W27a: Source table has page break; restore to first paragraph of first cell."""
        source = _build_minimal_docx(
            '<w:p><w:r><w:t>Before table</w:t></w:r></w:p>'
            '<w:tbl>'
            '<w:tblPr><w:tblW w:w="5000" w:type="dxa"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="2500"/><w:gridCol w:w="2500"/></w:tblGrid>'
            '<w:tr><w:tc><w:p><w:pPr><w:pageBreakBefore/></w:pPr><w:r><w:t>Cell 1</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:p><w:r><w:t>Cell 2</w:t></w:r></w:p></w:tc></w:tr>'
            '</w:tbl>'
            '<w:p><w:r><w:t>After table</w:t></w:r></w:p>'
            '<w:sectPr/>'
        )
        converted = _build_minimal_docx(
            '<w:p><w:r><w:t>Before table</w:t></w:r></w:p>'
            '<w:tbl>'
            '<w:tblPr><w:tblW w:w="5000" w:type="dxa"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="2500"/><w:gridCol w:w="2500"/></w:tblGrid>'
            '<w:tr><w:tc><w:p><w:r><w:t>Cell 1</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:p><w:r><w:t>Cell 2</w:t></w:r></w:p></w:tc></w:tr>'
            '</w:tbl>'
            '<w:p><w:r><w:t>After table</w:t></w:r></w:p>'
            '<w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_writer_docx(converted, source_docx=source)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        # Find the table and check first cell's first paragraph
        tables = re.findall(r'<w:tbl\b[\s\S]*?</w:tbl\s*>', xml, re.IGNORECASE)
        self.assertEqual(len(tables), 1)
        first_cell_para = re.search(r'<w:tc\b[\s\S]*?<w:p\b[\s\S]*?</w:p\s*>', tables[0], re.IGNORECASE)
        self.assertIsNotNone(first_cell_para)
        self.assertIn('<w:pageBreakBefore/>', first_cell_para.group(0))

    def test_w27a_removes_incorrect_libreoffice_page_break_before(self):
        """W27a: LibreOffice incorrectly added pageBreakBefore; source didn't have it.
        Should remove the incorrect pageBreakBefore."""
        source = _build_minimal_docx(
            '<w:p><w:r><w:t>Para 1</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Para 2</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Para 3</w:t></w:r></w:p>'
            '<w:sectPr/>'
        )
        converted = _build_minimal_docx(
            '<w:p><w:r><w:t>Para 1</w:t></w:r></w:p>'
            '<w:p><w:pPr><w:pageBreakBefore/></w:pPr><w:r><w:t>Para 2</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Para 3</w:t></w:r></w:p>'
            '<w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_writer_docx(converted, source_docx=source)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        paragraphs = [xml[start:end] for start, end in ooxml_zip_patch_mod._writer_body_paragraph_ranges(xml)]
        self.assertEqual(len(paragraphs), 3)
        # LibreOffice's incorrect pageBreakBefore on 2nd paragraph should be removed
        self.assertNotIn('<w:pageBreakBefore/>', paragraphs[1])

    def test_w27b_floating_table_frame_becomes_tblppr_table(self):
        """W27b (d09): bảng nổi tblpPr của nguồn được LibreOffice xuất thành hộp văn bản mc:AlternateContent
        (Choice + Fallback cùng chứa bảng). Trả lại <w:tbl> ở thân với tblpPr của nguồn; đoạn neo rỗng bị bỏ."""
        table = ('<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="dxa"/></w:tblPr>'
                 '<w:tblGrid><w:gridCol w:w="2500"/><w:gridCol w:w="2500"/></w:tblGrid>'
                 '<w:tr><w:tc><w:p><w:r><w:t>Năm tài chính</w:t></w:r></w:p></w:tc><w:tc><w:p/></w:tc></w:tr></w:tbl>')
        source_tblppr = '<w:tblpPr w:leftFromText="180" w:rightFromText="180" w:vertAnchor="text" w:horzAnchor="margin" w:tblpX="-190" w:tblpY="97"/>'
        source = _build_minimal_docx(
            '<w:p><w:r><w:t>Bảng số liệu</w:t></w:r></w:p>'
            + table.replace('<w:tblStyle w:val="TableGrid"/>', '<w:tblStyle w:val="TableGrid"/>' + source_tblppr)
            + '<w:p><w:r><w:t>Sau bảng</w:t></w:r></w:p><w:sectPr/>'
        )
        frame = ('<mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300">'
                 '<wp:positionH relativeFrom="column"><wp:align>left</wp:align></wp:positionH>'
                 '<wp:positionV relativeFrom="line"><wp:posOffset>635</wp:posOffset></wp:positionV>'
                 '<wps:txbx><w:txbxContent>' + table + '<w:p><w:pPr><w:pStyle w:val="BodyText"/></w:pPr></w:p></w:txbxContent></wps:txbx>'
                 '</wp:anchor></w:drawing></mc:Choice><mc:Fallback><w:pict><v:rect><v:textbox><w:txbxContent>' + table
                 + '</w:txbxContent></v:textbox></v:rect></w:pict></mc:Fallback></mc:AlternateContent>')
        converted = _build_minimal_docx(
            '<w:p><w:r><w:t>Bảng số liệu</w:t></w:r></w:p>'
            '<w:p><w:pPr><w:pStyle w:val="BodyText"/></w:pPr><w:r><w:rPr></w:rPr></w:r><w:r>' + frame + '</w:r></w:p>'
            '<w:p><w:r><w:t>Sau bảng</w:t></w:r></w:p><w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_writer_docx(converted, source_docx=source)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertNotIn('<mc:AlternateContent', xml)
        self.assertEqual(xml.count('<w:tbl>'), 1)
        self.assertIn('<w:tblStyle w:val="TableGrid"/>' + source_tblppr + '<w:tblW', xml)
        paragraphs = [xml[start:end] for start, end in ooxml_zip_patch_mod._writer_body_paragraph_ranges(xml)]
        self.assertEqual([ooxml_zip_patch_mod._paragraph_plain_text(p) for p in paragraphs], ["Bảng số liệu", "Sau bảng"])
        body_order = re.findall(r'<w:tbl>|<w:t>(?:Bảng số liệu|Sau bảng)</w:t>', xml)
        self.assertEqual(body_order, ['<w:t>Bảng số liệu</w:t>', '<w:tbl>', '<w:t>Sau bảng</w:t>'])

    def test_w36_table_properties_restored_from_source_when_structure_matches(self):
        """W36 (d20): LibreOffice thêm tblCellMar 28 twips, trHeight 504→510 atLeast, tcW 2778→2772; nguồn thắng khi
        số hàng/ô trùng; bảng lồng không bị lấy nhầm trPr/tcPr; bảng khác cấu trúc giữ nguyên."""
        src_table = ('<w:tbl><w:tblPr><w:tblW w:w="11220" w:type="dxa"/><w:jc w:val="center"/></w:tblPr>'
                     '<w:tblGrid><w:gridCol w:w="2778"/><w:gridCol w:w="8442"/></w:tblGrid>'
                     '<w:tr><w:trPr><w:trHeight w:val="504"/></w:trPr>'
                     '<w:tc><w:tcPr><w:tcW w:w="2778" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:r><w:t>ĐT nhà</w:t></w:r></w:p></w:tc>'
                     '<w:tc><w:tcPr><w:tcW w:w="8442" w:type="dxa"/></w:tcPr>'
                     '<w:tbl><w:tblPr><w:tblW w:w="100" w:type="dxa"/></w:tblPr><w:tr><w:trPr><w:trHeight w:val="1"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="1" w:type="dxa"/></w:tcPr><w:p/></w:tc></w:tr></w:tbl>'
                     '<w:p/></w:tc></w:tr></w:tbl>')
        conv_table = ('<w:tbl><w:tblPr><w:tblW w:w="11220" w:type="dxa"/><w:tblCellMar><w:top w:w="28" w:type="dxa"/><w:bottom w:w="28" w:type="dxa"/></w:tblCellMar></w:tblPr>'
                      '<w:tblGrid><w:gridCol w:w="2772"/><w:gridCol w:w="8448"/></w:tblGrid>'
                      '<w:tr><w:trPr><w:trHeight w:val="510" w:hRule="atLeast"/></w:trPr>'
                      '<w:tc><w:tcPr><w:tcW w:w="2772" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>ĐT nhà</w:t></w:r></w:p></w:tc>'
                      '<w:tc><w:tcPr><w:tcW w:w="8448" w:type="dxa"/></w:tcPr>'
                      '<w:tbl><w:tblPr><w:tblW w:w="99" w:type="dxa"/></w:tblPr><w:tr><w:trPr><w:trHeight w:val="2"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="2" w:type="dxa"/></w:tcPr><w:p/></w:tc></w:tr></w:tbl>'
                      '<w:p/></w:tc></w:tr></w:tbl>')
        other = '<w:tbl><w:tblPr><w:tblW w:w="5" w:type="dxa"/></w:tblPr><w:tr><w:tc><w:p><w:r><w:t>Khác</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p/></w:tc></w:tr></w:tbl>'
        source = _build_minimal_docx('<w:p><w:r><w:t>Đầu</w:t></w:r></w:p>' + src_table + '<w:p/>' + other.replace('<w:tr><w:tc><w:p/></w:tc></w:tr>', '') + '<w:sectPr/>')
        converted = _build_minimal_docx('<w:p><w:r><w:t>Đầu</w:t></w:r></w:p>' + conv_table + '<w:p/>' + other + '<w:sectPr/>')
        result = ooxml_zip_patch_mod.postprocess_writer_docx(converted, source_docx=source)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        self.assertNotIn("<w:tblCellMar>", xml)
        self.assertIn('<w:trHeight w:val="504"/>', xml)
        self.assertIn('<w:tcW w:w="2778" w:type="dxa"/><w:vAlign w:val="center"/>', xml)
        self.assertIn('<w:gridCol w:w="2778"/>', xml)
        # bảng lồng giữ nguyên của bản chuyển đổi (không lấy nhầm props của bảng lồng nguồn)
        self.assertIn('<w:tblW w:w="99" w:type="dxa"/>', xml)
        self.assertIn('<w:trHeight w:val="2"/>', xml)
        # bảng "Khác" có số hàng lệch (2 vs 1) -> giữ nguyên
        self.assertIn('<w:tblW w:w="5" w:type="dxa"/>', xml)

    def test_w27b_tblppr_derived_from_anchor_when_source_has_none(self):
        anchor = ('<wp:anchor distL="114300" distR="0"><wp:positionH relativeFrom="margin"><wp:posOffset>-120650</wp:posOffset></wp:positionH>'
                  '<wp:positionV relativeFrom="paragraph"><wp:posOffset>61595</wp:posOffset></wp:positionV></wp:anchor>')
        self.assertEqual(
            ooxml_zip_patch_mod._w27b_tblppr_from_anchor(anchor),
            '<w:tblpPr w:leftFromText="180" w:rightFromText="0" w:vertAnchor="text" w:horzAnchor="margin" w:tblpX="-190" w:tblpY="97"/>',
        )

    def test_w27a_mixed_page_breaks_paragraph_and_table(self):
        """W27a: Multiple page breaks on different element types (paragraph, table)."""
        source = _build_minimal_docx(
            '<w:p><w:r><w:t>Para 1</w:t></w:r></w:p>'
            '<w:p><w:pPr><w:pageBreakBefore/></w:pPr><w:r><w:t>Para 2</w:t></w:r></w:p>'
            '<w:tbl>'
            '<w:tblPr><w:tblW w:w="5000" w:type="dxa"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="2500"/><w:gridCol w:w="2500"/></w:tblGrid>'
            '<w:tr><w:tc><w:p><w:pPr><w:pageBreakBefore/></w:pPr><w:r><w:t>Table Cell</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:p><w:r><w:t>Cell 2</w:t></w:r></w:p></w:tc></w:tr>'
            '</w:tbl>'
            '<w:p><w:r><w:t>Para 3</w:t></w:r></w:p>'
            '<w:sectPr/>'
        )
        converted = _build_minimal_docx(
            '<w:p><w:r><w:t>Para 1</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Para 2</w:t></w:r></w:p>'
            '<w:tbl>'
            '<w:tblPr><w:tblW w:w="5000" w:type="dxa"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="2500"/><w:gridCol w:w="2500"/></w:tblGrid>'
            '<w:tr><w:tc><w:p><w:r><w:t>Table Cell</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:p><w:r><w:t>Cell 2</w:t></w:r></w:p></w:tc></w:tr>'
            '</w:tbl>'
            '<w:p><w:r><w:t>Para 3</w:t></w:r></w:p>'
            '<w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_writer_docx(converted, source_docx=source)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        # Check paragraph 2 has pageBreakBefore
        paragraphs = [xml[start:end] for start, end in ooxml_zip_patch_mod._writer_body_paragraph_ranges(xml)]
        self.assertIn('<w:pageBreakBefore/>', paragraphs[1])
        # Check table first cell paragraph has pageBreakBefore
        tables = re.findall(r'<w:tbl\b[\s\S]*?</w:tbl\s*>', xml, re.IGNORECASE)
        self.assertEqual(len(tables), 1)
        first_cell_para = re.search(r'<w:tc\b[\s\S]*?<w:p\b[\s\S]*?</w:p\s*>', tables[0], re.IGNORECASE)
        self.assertIsNotNone(first_cell_para)
        self.assertIn('<w:pageBreakBefore/>', first_cell_para.group(0))

    def test_w27a_removes_incorrect_page_break_before_on_table(self):
        """W27a: LibreOffice incorrectly added pageBreakBefore on table first cell."""
        source = _build_minimal_docx(
            '<w:p><w:r><w:t>Before table</w:t></w:r></w:p>'
            '<w:tbl>'
            '<w:tblPr><w:tblW w:w="5000" w:type="dxa"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="2500"/><w:gridCol w:w="2500"/></w:tblGrid>'
            '<w:tr><w:tc><w:p><w:r><w:t>Cell 1</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:p><w:r><w:t>Cell 2</w:t></w:r></w:p></w:tc></w:tr>'
            '</w:tbl>'
            '<w:p><w:r><w:t>After table</w:t></w:r></w:p>'
            '<w:sectPr/>'
        )
        converted = _build_minimal_docx(
            '<w:p><w:r><w:t>Before table</w:t></w:r></w:p>'
            '<w:tbl>'
            '<w:tblPr><w:tblW w:w="5000" w:type="dxa"/></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="2500"/><w:gridCol w:w="2500"/></w:tblGrid>'
            '<w:tr><w:tc><w:p><w:pPr><w:pageBreakBefore/></w:pPr><w:r><w:t>Cell 1</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:p><w:r><w:t>Cell 2</w:t></w:r></w:p></w:tc></w:tr>'
            '</w:tbl>'
            '<w:p><w:r><w:t>After table</w:t></w:r></w:p>'
            '<w:sectPr/>'
        )
        result = ooxml_zip_patch_mod.postprocess_writer_docx(converted, source_docx=source)
        xml = _read_entry(result, "word/document.xml").decode("utf-8")
        tables = re.findall(r'<w:tbl\b[\s\S]*?</w:tbl\s*>', xml, re.IGNORECASE)
        self.assertEqual(len(tables), 1)
        first_cell_para = re.search(r'<w:tc\b[\s\S]*?<w:p\b[\s\S]*?</w:p\s*>', tables[0], re.IGNORECASE)
        self.assertIsNotNone(first_cell_para)
        # LibreOffice's incorrect pageBreakBefore should be removed
        self.assertNotIn('<w:pageBreakBefore/>', first_cell_para.group(0))


def _build_minimal_docx(body_xml: str) -> bytes:
    """Build a minimal valid DOCX zip with the given body content in word/document.xml."""
    doc_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
        ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
        ' xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"'
        ' mc:Ignorable="w14 wp14">'
        f"<w:body>{body_xml}</w:body>"
        "</w:document>"
    )
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", _CONTENT_TYPES)
        z.writestr("_rels/.rels", _RELS)
        z.writestr("word/_rels/document.xml.rels", _DOC_RELS)
        z.writestr("word/document.xml", doc_xml)
    return buf.getvalue()


_CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""

_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

_DOC_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>"""


class IntegrationSaveRoundtripTests(unittest.TestCase):
    """Full round-trip: open DOCX -> save (with source_path) -> reopen -> verify sections/headers/footers survive."""

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    @unittest.skipUnless(FIXTURE_DOCX.is_file(), "Fixture missing")
    def test_headerfooter_survives_roundtrip(self):
        api = main.VnOfficeApi("writer", str(FIXTURE_DOCX))
        with patch.object(main, "_active_window", return_value=None):
            open_result = api.open_document_dialog("writer")
        self.assertEqual(open_result.get("status"), "ok", f"Open failed: {open_result}")
        content = open_result.get("content") or ""
        source_path = open_result.get("sourcePath") or ""
        self.assertTrue(content, "Open returned empty content")
        self.assertTrue(source_path, "Open returned no sourcePath")

        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
            dest_path = tmp.name

        mock_window = _make_mock_window(dest_path)
        with patch.object(main, "_active_window", return_value=mock_window):
            save_result = api.save_document_dialog(
                content, "writer", target_format="docx",
                suggested_name="TestRoundtrip",
                source_path=source_path,
            )
        self.assertEqual(save_result.get("status"), "ok", f"Save failed: {save_result}")

        saved_bytes = Path(dest_path).read_bytes()
        with zipfile.ZipFile(io.BytesIO(saved_bytes)) as z:
            names = z.namelist()
        hdr_entries = [n for n in names if re.match(r"word/header\d+\.xml$", n, re.IGNORECASE)]
        ftr_entries = [n for n in names if re.match(r"word/footer\d+\.xml$", n, re.IGNORECASE)]
        self.assertTrue(hdr_entries, "Saved DOCX should have header entries")
        self.assertTrue(ftr_entries, "Saved DOCX should have footer entries")

        saved_doc_xml = _read_entry(saved_bytes, "word/document.xml").decode("utf-8", errors="replace")
        self.assertIn("w:headerReference", saved_doc_xml, "Saved DOCX should have headerReference in document.xml")
        self.assertIn("w:footerReference", saved_doc_xml, "Saved DOCX should have footerReference in document.xml")
        self.assertIn("w:sectPr", saved_doc_xml, "Saved DOCX should have w:sectPr in document.xml")

        api2 = main.VnOfficeApi("writer", dest_path)
        with patch.object(main, "_active_window", return_value=None):
            reopen_result = api2.open_document_dialog("writer")
        self.assertEqual(reopen_result.get("status"), "ok", f"Reopen failed: {reopen_result}")
        content2 = reopen_result.get("content") or ""
        self.assertIn(HEADER_COMPANY, content2, "Header company name lost after round-trip")
        self.assertIn(FOOTER_DATE, content2, "Footer date lost after round-trip")

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    @unittest.skipUnless(FIXTURE_DOCX.is_file(), "Fixture missing")
    def test_source_path_none_is_safe_noop(self):
        api = main.VnOfficeApi("writer", str(FIXTURE_DOCX))
        with patch.object(main, "_active_window", return_value=None):
            open_result = api.open_document_dialog("writer")
        self.assertEqual(open_result.get("status"), "ok")
        content = open_result.get("content") or ""

        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
            dest_path = tmp.name

        mock_window = _make_mock_window(dest_path)
        with patch.object(main, "_active_window", return_value=mock_window):
            save_result = api.save_document_dialog(
                content, "writer", target_format="docx",
                suggested_name="TestNoSourcePath",
                source_path=None,
            )
        self.assertEqual(save_result.get("status"), "ok", f"Save with source_path=None failed: {save_result}")

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    @unittest.skipUnless(FIXTURE_DOCX.is_file(), "Fixture missing")
    def test_nonexistent_source_path_is_safe_noop(self):
        api = main.VnOfficeApi("writer", str(FIXTURE_DOCX))
        with patch.object(main, "_active_window", return_value=None):
            open_result = api.open_document_dialog("writer")
        self.assertEqual(open_result.get("status"), "ok")
        content = open_result.get("content") or ""

        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
            dest_path = tmp.name

        mock_window = _make_mock_window(dest_path)
        with patch.object(main, "_active_window", return_value=mock_window):
            save_result = api.save_document_dialog(
                content, "writer", target_format="docx",
                suggested_name="TestNonexistent",
                source_path="/nonexistent/path/file.docx",
            )
        self.assertEqual(save_result.get("status"), "ok", f"Save with nonexistent source_path failed: {save_result}")


if __name__ == "__main__":
    unittest.main()
