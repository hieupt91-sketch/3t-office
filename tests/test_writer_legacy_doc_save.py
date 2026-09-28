"""Compatibility tests for the source-aware legacy DOC export path."""

from __future__ import annotations

import io
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

import main


def _docx(document_xml: str) -> bytes:
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("word/document.xml", document_xml)
    return out.getvalue()


def _document_xml(docx_bytes: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(docx_bytes)) as archive:
        return archive.read("word/document.xml").decode("utf-8")


class WriterLegacyDocSaveTests(unittest.TestCase):
    def test_doc_export_preserves_square_wrap_in_intermediate_before_filtering(self):
        source = _docx(
            "<w:document><w:body><w:p><w:r><w:drawing><wp:anchor>"
            "<wp:wrapSquare/><wp:docPr id=\"1\" name=\"Picture 1\"/>"
            "</wp:anchor></w:drawing></w:r><w:r><w:t>Original title</w:t></w:r>"
            "</w:p></w:body></w:document>"
        )
        converted = _docx(
            "<w:document><w:body><w:p><w:r><w:drawing><wp:anchor>"
            "<wp:wrapSquare/><wp:docPr id=\"1\" name=\"Image 1\"/>"
            "</wp:anchor></w:drawing></w:r><w:r><w:t>Edited title ZZ</w:t></w:r>"
            "</w:p></w:body></w:document>"
        )
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            html = root / "draft.html"
            source_doc = root / "source.doc"
            html.write_text("<p>Edited title ZZ</p>", encoding="utf-8")
            source_doc.write_bytes(b"legacy source")
            observed = {}

            def fake_convert(src_path, target_ext, out_dir, app_kind=None):
                out = Path(out_dir)
                out.mkdir(parents=True, exist_ok=True)
                if target_ext == "docx" and Path(src_path) == html:
                    dest = out / "draft.docx"
                    dest.write_bytes(converted)
                elif target_ext == "docx":
                    dest = out / "source.docx"
                    dest.write_bytes(source)
                else:
                    observed["intermediate"] = _document_xml(Path(src_path).read_bytes())
                    dest = out / "result.doc"
                    dest.write_bytes(b"converted DOC")
                return str(dest)

            with (
                patch.object(main, "_run_soffice_convert", side_effect=fake_convert),
                patch.object(main, "_apply_native_export_postprocess"),
            ):
                main._convert_writer_html_to_doc(str(html), str(root), str(source_doc))

        self.assertIn("<wp:wrapSquare/>", observed["intermediate"])
        self.assertNotIn("<wp:wrapNone/>", observed["intermediate"])
        self.assertIn("Edited title ZZ", observed["intermediate"])


if __name__ == "__main__":
    unittest.main()
