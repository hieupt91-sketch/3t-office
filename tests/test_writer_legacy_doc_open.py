"""Legacy binary DOC opening reuses the existing DOCX import path."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import main


class WriterLegacyDocOpenTests(unittest.TestCase):
    def test_doc_is_normalized_to_docx_before_html_and_uses_docx_overlays(self):
        with tempfile.TemporaryDirectory() as source_dir:
            source = Path(source_dir) / "legacy.doc"
            source.write_bytes(b"binary DOC fixture")
            calls: list[tuple[str, str]] = []

            def fake_convert(src_path: str, target_ext: str, out_dir: str, app_kind=None) -> str:
                source_path = Path(src_path)
                calls.append((source_path.suffix.lower(), target_ext))
                result = Path(out_dir) / f"{source_path.stem}.{target_ext}"
                result.parent.mkdir(parents=True, exist_ok=True)
                result.write_bytes(b"converted DOCX" if target_ext == "docx" else b"<p>legacy</p>")
                return str(result)

            patcher = MagicMock()
            patcher.apply_docx_theme_script_fonts.side_effect = lambda _data, html: html + "|theme"
            patcher.inject_docx_default_font_css.side_effect = lambda _data, html: html + "|default-font"
            patcher.inject_docx_half_point_styles_css.side_effect = lambda _data, html: html + "|half-point"
            patcher.inject_docx_heading_styles_css.side_effect = lambda _data, html: html + "|heading"

            with (
                patch.object(main, "_run_soffice_convert", side_effect=fake_convert),
                patch.object(main, "_ooxml_zip_patch", return_value=patcher),
                patch.object(main, "_active_window", return_value=None),
            ):
                result = main.VnOfficeApi("writer", str(source)).open_document_dialog("writer")

            self.assertEqual(result.get("status"), "ok")
            self.assertEqual(calls, [(".doc", "docx"), (".docx", "html")])
            self.assertEqual(
                result.get("content"),
                "<p>legacy</p>|theme|default-font|half-point|heading",
            )
            for method in (
                patcher.apply_docx_theme_script_fonts,
                patcher.inject_docx_default_font_css,
                patcher.inject_docx_half_point_styles_css,
                patcher.inject_docx_heading_styles_css,
            ):
                self.assertEqual(method.call_args.args[0], b"converted DOCX")


if __name__ == "__main__":
    unittest.main()
