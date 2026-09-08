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
    """Direct tests for postprocess_writer_docx — no soffice required."""

    @unittest.skipUnless(FIXTURE_DOCX.is_file(), "Fixture missing")
    def test_noop_when_source_docx_is_none(self):
        fake = b"fake-docx-bytes"
        result = ooxml_zip_patch_mod.postprocess_writer_docx(fake, source_docx=None)
        self.assertEqual(result, fake)

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
