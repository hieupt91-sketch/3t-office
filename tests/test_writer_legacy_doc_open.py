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
            patcher.restore_docx_html_half_points_and_empty_paras.side_effect = lambda _data, html: html + "|half-point-empty"
            patcher.inject_docx_run_effects.side_effect = lambda _data, html: html + "|run-fx"
            patcher.writer_docx_equations_to_mathml_html.side_effect = lambda _data, html: html

            with (
                patch.object(main, "_run_soffice_convert", side_effect=fake_convert),
                patch.object(main, "_ooxml_zip_patch", return_value=patcher),
                patch.object(main, "_read_docx_document_xml", return_value="<w:document/>") as read_document,
                patch.object(main, "_read_docx_comments_xml", return_value="<w:comments/>") as read_comments,
                patch.object(main, "_read_docx_zip_entry", side_effect=lambda _path, entry: f"<{entry}/>") as read_entry,
                patch.object(
                    main,
                    "_read_all_docx_headers_footers",
                    return_value=("<w:hdr/>", "<w:ftr/>", {"rId1": "<w:hdr/>"}, {"rId2": "<w:ftr/>"}, {}),
                ) as read_zones,
                patch.object(main, "_active_window", return_value=None),
            ):
                result = main.VnOfficeApi("writer", str(source)).open_document_dialog("writer")

            self.assertEqual(result.get("status"), "ok")
            self.assertEqual(calls, [(".doc", "docx"), (".docx", "html")])
            self.assertEqual(
                result.get("content"),
                "<p>legacy</p>|theme|default-font|half-point|heading|half-point-empty|run-fx",
            )
            self.assertEqual(result.get("ooxmlDocumentXml"), "<w:document/>")
            self.assertEqual(result.get("ooxmlCommentsXml"), "<w:comments/>")
            self.assertEqual(result.get("ooxmlStylesXml"), "<word/styles.xml/>")
            self.assertEqual(result.get("ooxmlNumberingXml"), "<word/numbering.xml/>")
            self.assertEqual(result.get("ooxmlHeaderXml"), "<w:hdr/>")
            self.assertEqual(result.get("ooxmlFooterXml"), "<w:ftr/>")
            self.assertEqual(Path(read_document.call_args.args[0]).suffix, ".docx")
            self.assertEqual(Path(read_comments.call_args.args[0]).suffix, ".docx")
            self.assertEqual(Path(read_entry.call_args.args[0]).suffix, ".docx")
            self.assertEqual(Path(read_zones.call_args.args[0]).suffix, ".docx")
            for method in (
                patcher.apply_docx_theme_script_fonts,
                patcher.inject_docx_default_font_css,
                patcher.inject_docx_half_point_styles_css,
                patcher.inject_docx_heading_styles_css,
            ):
                self.assertEqual(method.call_args.args[0], b"converted DOCX")


if __name__ == "__main__":
    unittest.main()
