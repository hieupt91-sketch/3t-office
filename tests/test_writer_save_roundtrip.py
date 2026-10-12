"""Writer Save Round-trip: Open real DOCX → Save back → Reopen and compare.

Tests the full round-trip fidelity of save_document_dialog:
  1. Open real DOCX via open_document_dialog (initial_file bypass)
  2. Save HTML content back to DOCX via save_document_dialog (mocked dialog)
  3. Reopen the saved DOCX
  4. Verify text content, tables, images, encoding are preserved

Requires LibreOffice soffice. Tests are skipped if soffice is unavailable.
"""

from __future__ import annotations

import re
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import main

ROOT = Path(__file__).resolve().parents[1]
FIXTURES_DIR = ROOT / "tests" / "fixtures" / "real-office-samples"

FIXTURES = sorted(FIXTURES_DIR.glob("sample-writer*.docx"))

NEW_PARAGRAPH_MARKER = "Đoạn text mới thêm vào để test round-trip"
SPACING_MARKER_STYLE = "margin-top:12pt;margin-bottom:6pt"
SPACING_MARKER_TEXT = "Đoạn có khoảng cách trước/sau đoạn"


def _strip_tags(html_text: str) -> str:
    text = re.sub(r"<style[^>]*>.*?</style>", "", html_text or "", flags=re.DOTALL)
    return re.sub(r"<[^>]+>", "", text).strip()


def _count_tables(html_text: str) -> int:
    return len(re.findall(r"<table[\s>]", html_text or "", re.IGNORECASE))


def _count_images(html_text: str) -> int:
    return len(re.findall(r"data:image", html_text or ""))


def _normalize_ws(text: str) -> str:
    clean = re.sub(r"<style[^>]*>.*?</style>", "", text or "", flags=re.DOTALL)
    return re.sub(r"\s+", "", clean)


def _has_mojibake(html_text: str) -> bool:
    return "\ufffd" in (html_text or "")


def _extract_margin_pt(style: str, prop: str) -> float | None:
    m = re.search(rf"{prop}\s*:\s*([\d.]+)\s*pt", style or "")
    if m:
        return float(m.group(1))
    return None


def _extract_margin_cm(style: str, prop: str) -> float | None:
    m = re.search(rf"{prop}\s*:\s*([\d.]+)\s*cm", style or "")
    if m:
        return float(m.group(1)) * 28.3465
    return None


def _extract_margin_any(style: str, prop: str) -> float | None:
    pt = _extract_margin_pt(style, prop)
    if pt is not None:
        return pt
    return _extract_margin_cm(style, prop)


def _make_mock_window(dest_path: str) -> MagicMock:
    window = MagicMock()
    window.create_file_dialog.return_value = dest_path
    return window


class WriterSaveRoundtripTests(unittest.TestCase):
    """Round-trip fidelity tests for Writer save_document_dialog."""

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    def test_all_fixtures_roundtrip(self):
        self.assertGreater(len(FIXTURES), 0, "No .docx fixtures found")
        for docx_path in FIXTURES:
            with self.subTest(file=docx_path.name):
                self._do_roundtrip(docx_path)

    def _do_roundtrip(self, docx_path: Path):
        api = main.VnOfficeApi("writer", str(docx_path))

        with patch.object(main, "_active_window", return_value=None):
            open_result = api.open_document_dialog("writer")
        self.assertEqual(open_result.get("status"), "ok", f"Open failed for {docx_path.name}: {open_result}")
        content = open_result.get("content") or ""
        self.assertTrue(len(content) > 0, f"Empty content from {docx_path.name}")

        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
            dest_path = tmp.name

        mock_window = _make_mock_window(dest_path)
        with patch.object(main, "_active_window", return_value=mock_window):
            save_result = api.save_document_dialog(content, "writer", target_format="docx")
        self.assertEqual(save_result.get("status"), "ok", f"Save failed for {docx_path.name}: {save_result}")

        api2 = main.VnOfficeApi("writer", dest_path)
        with patch.object(main, "_active_window", return_value=None):
            reopen_result = api2.open_document_dialog("writer")
        self.assertEqual(reopen_result.get("status"), "ok", f"Reopen failed for {docx_path.name}: {reopen_result}")
        content2 = reopen_result.get("content") or ""

        orig_text = _strip_tags(content)
        reopen_text = _strip_tags(content2)

        significant_orig = [w for w in re.split(r"\s+", orig_text) if len(w) > 4]
        if significant_orig:
            found = sum(1 for w in significant_orig if w in reopen_text)
            ratio = found / len(significant_orig)
            self.assertGreater(ratio, 0.5,
                f"[{docx_path.name}] Text preservation too low: {ratio:.1%} ({found}/{len(significant_orig)})")

        tables_orig = _count_tables(content)
        tables_reopen = _count_tables(content2)
        self.assertEqual(tables_orig, tables_reopen,
            f"[{docx_path.name}] Table count changed: {tables_orig} → {tables_reopen}")

        imgs_orig = _count_images(content)
        imgs_reopen = _count_images(content2)
        if imgs_orig > 0:
            self.assertGreaterEqual(imgs_reopen, imgs_orig,
                f"[{docx_path.name}] Images decreased: {imgs_orig} → {imgs_reopen}")

        self.assertFalse(_has_mojibake(content2),
            f"[{docx_path.name}] Mojibake (\\ufffd) detected in reopened content")

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    def test_edit_before_save_preserves_new_content(self):
        self.assertGreater(len(FIXTURES), 0, "No .docx fixtures found")
        docx_path = FIXTURES[0]
        api = main.VnOfficeApi("writer", str(docx_path))

        with patch.object(main, "_active_window", return_value=None):
            open_result = api.open_document_dialog("writer")
        self.assertEqual(open_result.get("status"), "ok")
        content = open_result.get("content") or ""

        modified_content = content + f"<p>{NEW_PARAGRAPH_MARKER}</p>"

        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
            dest_path = tmp.name

        mock_window = _make_mock_window(dest_path)
        with patch.object(main, "_active_window", return_value=mock_window):
            save_result = api.save_document_dialog(modified_content, "writer", target_format="docx")
        self.assertEqual(save_result.get("status"), "ok")

        api2 = main.VnOfficeApi("writer", dest_path)
        with patch.object(main, "_active_window", return_value=None):
            reopen_result = api2.open_document_dialog("writer")
        self.assertEqual(reopen_result.get("status"), "ok")
        content2 = reopen_result.get("content") or ""

        self.assertIn(_normalize_ws(NEW_PARAGRAPH_MARKER), _normalize_ws(content2),
            "Newly added paragraph not found after round-trip save/reopen")

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    def test_paragraph_spacing_inline_margin_survives_roundtrip(self):
        self.assertGreater(len(FIXTURES), 0, "No .docx fixtures found")
        docx_path = FIXTURES[0]
        api = main.VnOfficeApi("writer", str(docx_path))

        with patch.object(main, "_active_window", return_value=None):
            open_result = api.open_document_dialog("writer")
        self.assertEqual(open_result.get("status"), "ok")
        content = open_result.get("content") or ""

        spacing_para = f'<p style="{SPACING_MARKER_STYLE}">{SPACING_MARKER_TEXT}</p>'
        modified_content = content + spacing_para

        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
            dest_path = tmp.name

        mock_window = _make_mock_window(dest_path)
        with patch.object(main, "_active_window", return_value=mock_window):
            save_result = api.save_document_dialog(modified_content, "writer", target_format="docx")
        self.assertEqual(save_result.get("status"), "ok")

        api2 = main.VnOfficeApi("writer", dest_path)
        with patch.object(main, "_active_window", return_value=None):
            reopen_result = api2.open_document_dialog("writer")
        self.assertEqual(reopen_result.get("status"), "ok")
        content2 = reopen_result.get("content") or ""

        self.assertIn(_normalize_ws(SPACING_MARKER_TEXT), _normalize_ws(content2),
            "Spacing paragraph text not found after round-trip")

        style_match = re.search(
            rf'style="[^"]*{re.escape(SPACING_MARKER_STYLE)}[^"]*"',
            content2,
        )
        if not style_match:
            style_match = re.search(
                r'style="[^"]*margin(?:-(?:top|bottom))[^"]*"',
                content2,
            )
        if style_match:
            style_attr = style_match.group(0)
            mt = _extract_margin_any(style_attr, "margin-top")
            mb = _extract_margin_any(style_attr, "margin-bottom")
            if mt is not None:
                self.assertAlmostEqual(mt, 12.0, delta=2.0,
                    msg=f"margin-top: expected ~12pt, got {mt}pt")
            if mb is not None:
                self.assertAlmostEqual(mb, 6.0, delta=2.0,
                    msg=f"margin-bottom: expected ~6pt, got {mb}pt")
        else:
            reopen_style = re.search(r'style="[^"]*margin[^"]*"', content2)
            self.assertIsNotNone(reopen_style,
                "No inline margin style found on spacing paragraph after round-trip")
            style_text = reopen_style.group(0) if reopen_style else ""
            mt = _extract_margin_any(style_text, "margin-top")
            mb = _extract_margin_any(style_text, "margin-bottom")
            if mt is not None:
                self.assertAlmostEqual(mt, 12.0, delta=2.0,
                    msg=f"margin-top: expected ~12pt, got {mt}pt")
            if mb is not None:
                self.assertAlmostEqual(mb, 6.0, delta=2.0,
                    msg=f"margin-bottom: expected ~6pt, got {mb}pt")

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    def test_odt_save_uses_standard_mimetype_and_reopens(self):
        source_docx = FIXTURES_DIR / "sample-writer-tables.docx"
        self.assertTrue(source_docx.is_file(), "Writer table fixture is missing")
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir)
            source_dir = temp_root / "source"
            save_dir = temp_root / "save"
            source_dir.mkdir()
            save_dir.mkdir()
            source_odt = main._run_soffice_convert(
                str(source_docx), "odt", str(source_dir), app_kind="writer"
            )
            with zipfile.ZipFile(source_odt) as package:
                self.assertEqual(
                    package.read("mimetype").decode("ascii").strip(),
                    "application/vnd.oasis.opendocument.text",
                )

            api = main.VnOfficeApi("writer", source_odt)
            with patch.object(main, "_active_window", return_value=None):
                opened = api.open_document_dialog("writer")
            self.assertEqual(opened.get("status"), "ok", opened)
            content = opened.get("content") or ""
            self.assertEqual(_count_tables(content), 1, "Source ODT table did not open")
            marker = "ODT chuẩn tiếng Việt round-trip"
            destination = str(save_dir / "saved.odt")
            with patch.object(main, "_active_window", return_value=_make_mock_window(destination)):
                saved = api.save_document_dialog(
                    content + f"<p>{marker}</p>", "writer", target_format="odt"
                )
            self.assertEqual(saved.get("status"), "ok", saved)

            with zipfile.ZipFile(destination) as package:
                self.assertEqual(
                    package.read("mimetype").decode("ascii").strip(),
                    "application/vnd.oasis.opendocument.text",
                    "Saved ODT must be a standard Writer text package, not Writer/Web",
                )
            reopened_api = main.VnOfficeApi("writer", destination)
            with patch.object(main, "_active_window", return_value=None):
                reopened = reopened_api.open_document_dialog("writer")
            self.assertEqual(reopened.get("status"), "ok", reopened)
            reopened_content = reopened.get("content") or ""
            self.assertIn(_normalize_ws(marker), _normalize_ws(reopened_content))
            self.assertEqual(_count_tables(reopened_content), 1)

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    def test_odt_open_returns_annotation_sidecar(self):
        fodt = FIXTURES_DIR / "src" / "sample-writer-comments.fodt"
        self.assertTrue(fodt.is_file(), "Writer ODF annotation fixture is missing")
        with tempfile.TemporaryDirectory() as temp_dir:
            odt = main._run_soffice_convert(
                str(fodt), "odt", temp_dir, app_kind="writer"
            )
            api = main.VnOfficeApi("writer", odt)
            with patch.object(main, "_active_window", return_value=None):
                opened = api.open_document_dialog("writer")
            self.assertEqual(opened.get("status"), "ok", opened)
            sidecar = opened.get("odfFodtContent") or ""
            self.assertIn("<office:annotation", sidecar)
            self.assertIn("Cần đối chiếu số liệu quý II trước khi trình.", sidecar)
            self.assertIn("Xác nhận chữ ký người soạn.", sidecar)
            # The layout/content channel remains the existing LibreOffice HTML import.
            self.assertIn("Kính gửi", opened.get("content") or "")


if __name__ == "__main__":
    unittest.main()
