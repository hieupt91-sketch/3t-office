"""Tests for inlining LibreOffice HTML sidecar images in main.py.

Unit tests do not need soffice or a GUI. The integration test opens the real
round-2 DOCX fixture through VnOfficeApi.open_document_dialog() (initial_file
path, no native dialog, no SendKeys) when LibreOffice is installed.
"""

from __future__ import annotations

import base64
import os
import re
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import main

ROOT = Path(__file__).resolve().parents[1]
FIXTURE_DOCX = ROOT / "tests" / "fixtures" / "real-office-samples" / "sample-writer-image.docx"
FIXTURE_PNG = ROOT / "tests" / "fixtures" / "real-office-samples" / "src" / "Pictures" / "logo-don-vi.png"

# 1x1 red PNG — valid file bytes used as a sidecar in unit tests.
MINIMAL_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC"
)


def _data_uri_payload(html_text: str, mime: str = "image/png") -> bytes:
    match = re.search(rf"src=\"(data:{re.escape(mime)};base64,[^\"]+)\"", html_text)
    if not match:
        raise AssertionError(f"no {mime} data URI src in HTML: {html_text[:500]}")
    prefix = f"data:{mime};base64,"
    encoded = match.group(1)[len(prefix) :]
    return base64.b64decode(encoded)


class InlineHtmlImagesUnitTests(unittest.TestCase):
    def test_sidecar_png_becomes_data_uri_matching_original_bytes(self):
        with tempfile.TemporaryDirectory(prefix="vno_inline_unit_") as tmp:
            html_path = os.path.join(tmp, "sample.html")
            png_path = os.path.join(tmp, "sample_html_bd46707.png")
            with open(png_path, "wb") as handle:
                handle.write(MINIMAL_PNG)
            html = (
                '<html><body><p>Logo</p>'
                '<img src="sample_html_bd46707.png" name="LogoDonVi" width="192" height="96">'
                "</body></html>"
            )
            with open(html_path, "w", encoding="utf-8") as handle:
                handle.write(html)

            result = main._inline_html_images(html, html_path)

        self.assertIn("data:image/png;base64,", result)
        self.assertNotIn("sample_html_bd46707.png", result)
        self.assertEqual(_data_uri_payload(result), MINIMAL_PNG)
        self.assertIn('name="LogoDonVi"', result)
        self.assertIn('width="192"', result)

    def test_existing_data_uri_is_left_alone(self):
        original = (
            '<img src="data:image/png;base64,AAA=" width="8">'
        )
        result = main._inline_html_images(original, os.path.join(tempfile.gettempdir(), "x.html"))
        self.assertEqual(result, original)

    def test_missing_and_http_src_keep_original_tag(self):
        html = (
            '<img src="missing-sidecar.png" alt="gone">'
            '<img src="https://example.com/remote.png" alt="remote">'
        )
        result = main._inline_html_images(html, os.path.join(tempfile.gettempdir(), "x.html"))
        self.assertEqual(result, html)
        self.assertNotIn("data:", result)

    def test_html_entity_in_src_is_decoded_before_join(self):
        with tempfile.TemporaryDirectory(prefix="vno_inline_amp_") as tmp:
            html_path = os.path.join(tmp, "doc.html")
            png_name = "logo & mark.png"
            png_path = os.path.join(tmp, png_name)
            with open(png_path, "wb") as handle:
                handle.write(MINIMAL_PNG)
            html = '<img src="logo &amp; mark.png">'
            result = main._inline_html_images(html, html_path)
        self.assertEqual(_data_uri_payload(result), MINIMAL_PNG)

    def test_percent_encoded_vietnamese_filename_is_decoded_before_join(self):
        # Loi that phat hien qua file .docx that: LibreOffice StarWriter HTML
        # URL-encode ten file co dau tieng Viet/khoang trang trong src (vi du
        # "h%E1%BB%A3p%20%C4%91%E1%BB%93ng...") nhung file that tren dia van
        # giu nguyen ten Unicode - truoc day chi html.unescape() ma quen
        # unquote() nen os.path.isfile() luon False, anh vo vinh vien.
        with tempfile.TemporaryDirectory(prefix="vno_inline_percent_") as tmp:
            html_path = os.path.join(tmp, "doc.html")
            real_name = "hợp đồng sửa chữa 3T- UBXQT_html_b19bf31e.gif"
            gif_bytes = b"GIF89afake-gif-vn"
            with open(os.path.join(tmp, real_name), "wb") as handle:
                handle.write(gif_bytes)
            encoded_src = (
                "h%E1%BB%A3p%20%C4%91%E1%BB%93ng%20s%E1%BB%ADa%20ch%E1%BB%AFa"
                "%203T-%20UBXQT_html_b19bf31e.gif"
            )
            html = f'<img src="{encoded_src}">'
            result = main._inline_html_images(html, html_path)
        self.assertIn("data:image/gif;base64,", result)
        self.assertNotIn(encoded_src, result)
        self.assertEqual(_data_uri_payload(result, "image/gif"), gif_bytes)

    def test_jpeg_and_gif_mime_from_extension(self):
        with tempfile.TemporaryDirectory(prefix="vno_inline_mime_") as tmp:
            html_path = os.path.join(tmp, "doc.html")
            jpg_bytes = b"\xff\xd8\xfffake-jpeg"
            gif_bytes = b"GIF89afake-gif"
            with open(os.path.join(tmp, "photo.jpg"), "wb") as handle:
                handle.write(jpg_bytes)
            with open(os.path.join(tmp, "anim.gif"), "wb") as handle:
                handle.write(gif_bytes)
            html = '<img src="photo.jpg"><img src="anim.gif">'
            result = main._inline_html_images(html, html_path)
        self.assertEqual(_data_uri_payload(result, "image/jpeg"), jpg_bytes)
        self.assertEqual(_data_uri_payload(result, "image/gif"), gif_bytes)


class OpenDocumentDialogInlineTests(unittest.TestCase):
    def test_writer_inlines_sidecar_before_tempdir_is_deleted(self):
        captured = {}
        api = main.VnOfficeApi("writer", r"C:\Tai lieu\sample-writer-image.docx")

        def fake_convert(src_path, target_ext, out_dir, app_kind=None):
            self.assertEqual((target_ext, app_kind), ("html", "writer"))
            png_path = Path(out_dir) / "sample-writer-image_html_bd46707.png"
            html_path = Path(out_dir) / "sample-writer-image.html"
            png_path.write_bytes(MINIMAL_PNG)
            html_path.write_text(
                '<html><body><img src="sample-writer-image_html_bd46707.png" width="192"></body></html>',
                encoding="utf-8",
            )
            captured["out_dir"] = out_dir
            captured["png_path"] = str(png_path)
            return str(html_path)

        with patch.object(main, "_run_soffice_convert", side_effect=fake_convert):
            result = api.open_document_dialog("writer")

        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["format"], "html")
        self.assertIn("data:image/png;base64,", result["content"])
        self.assertNotIn("sample-writer-image_html_bd46707.png", result["content"])
        self.assertEqual(_data_uri_payload(result["content"]), MINIMAL_PNG)
        self.assertFalse(os.path.exists(captured["out_dir"]))
        self.assertFalse(os.path.exists(captured["png_path"]))

    def test_sheet_open_does_not_inline_html_images(self):
        api = main.VnOfficeApi("sheet", r"C:\Tai lieu\bang.xlsx")

        def fake_convert(src_path, target_ext, out_dir, app_kind=None):
            self.assertEqual((target_ext, app_kind), ("fods", "sheet"))
            output = Path(out_dir) / "bang.fods"
            (Path(out_dir) / "sidecar.png").write_bytes(MINIMAL_PNG)
            output.write_text(
                '<office:document><draw:image xlink:href="sidecar.png"/></office:document>',
                encoding="utf-8",
            )
            return str(output)

        with patch.object(main, "_run_soffice_convert", side_effect=fake_convert):
            result = api.open_document_dialog("sheet")

        self.assertEqual(result["status"], "ok")
        self.assertIn("sidecar.png", result["content"])
        self.assertNotIn("data:image", result["content"])


@unittest.skipUnless(
    bool(main.SOFFICE_PATH) and FIXTURE_DOCX.is_file(),
    "LibreOffice soffice or sample-writer-image.docx fixture is missing",
)
class OpenDocumentDialogRealDocxTests(unittest.TestCase):
    def test_real_docx_html_has_data_uri_not_sidecar_path(self):
        api = main.VnOfficeApi("writer", str(FIXTURE_DOCX))
        result = api.open_document_dialog("writer")

        self.assertEqual(result["status"], "ok", result)
        self.assertEqual(result["format"], "html")
        html_text = result["content"]
        self.assertIn("<img", html_text.lower())
        self.assertIn("data:image/png;base64,", html_text)
        self.assertIsNone(
            re.search(r"""<img\b[^>]*\bsrc=["'](?!data:)[^"']+\.png["']""", html_text, re.IGNORECASE),
            "HTML still points at a relative sidecar PNG after open_document_dialog()",
        )
        payload = _data_uri_payload(html_text)
        self.assertGreaterEqual(len(payload), 8)
        self.assertEqual(payload[:8], b"\x89PNG\r\n\x1a\n")
        if FIXTURE_PNG.is_file():
            original = FIXTURE_PNG.read_bytes()
            self.assertTrue(
                payload == original or payload.startswith(b"\x89PNG"),
                "inlined image is not a PNG",
            )


if __name__ == "__main__":
    unittest.main()
