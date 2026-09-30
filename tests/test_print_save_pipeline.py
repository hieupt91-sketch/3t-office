"""Writer print-source regression: print must use the source-aware DOCX Save pipeline."""

from __future__ import annotations

import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

import main


_DOCUMENT_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def _write_docx(path: Path, document_xml: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("word/document.xml", document_xml)
        archive.writestr(
            "word/_rels/document.xml.rels",
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>',
        )


def _document_xml(font_size: int, page_width: int, page_height: int, *, bookmark: bool = False) -> str:
    marker = '<w:bookmarkStart w:id="0" w:name="vno-untouched-0"/>' if bookmark else ""
    return (
        f'<w:document xmlns:w="{_DOCUMENT_NS}"><w:body>'
        '<w:p>%s<w:r><w:rPr><w:sz w:val="%d"/></w:rPr><w:t>Same saved paragraph</w:t></w:r></w:p>'
        '<w:sectPr><w:pgSz w:w="%d" w:h="%d"/><w:pgMar w:top="720" w:right="720" '
        'w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>'
        '</w:body></w:document>'
    ) % (marker, font_size, page_width, page_height)


class PrintSavePipelineTests(unittest.TestCase):
    def test_untouched_writer_print_source_copies_the_source_docx_save_artifact(self):
        with tempfile.TemporaryDirectory(prefix="vno_print_pristine_test_") as temp_dir:
            original_docx = Path(temp_dir) / "source.docx"
            _write_docx(original_docx, _document_xml(27, 12240, 15840))
            content = '<a name="vno-pristine-document"></a><p>Same saved paragraph</p>'

            with patch.object(main, "_run_soffice_convert", side_effect=AssertionError("pristine source must not be reflowed")):
                print_source = main._write_print_source(
                    content, "writer", temp_dir, source_document_path=str(original_docx),
                )

            self.assertEqual(Path(print_source).suffix.lower(), ".docx")
            self.assertEqual(Path(print_source).read_bytes(), original_docx.read_bytes())
            with zipfile.ZipFile(print_source) as archive:
                document_xml = archive.read("word/document.xml").decode("utf-8")
            self.assertIn('<w:sz w:val="27"', document_xml)
            self.assertIn('<w:pgSz w:w="12240" w:h="15840"', document_xml)

    def test_writer_print_source_uses_save_docx_and_restores_half_point_font_and_page_size(self):
        with tempfile.TemporaryDirectory(prefix="vno_print_save_test_") as temp_dir:
            root = Path(temp_dir)
            original_docx = root / "source.docx"
            _write_docx(original_docx, _document_xml(27, 12240, 15840))
            conversions = []

            def fake_convert(source_path, target_format, output_dir, app_kind=None):
                conversions.append((Path(source_path).suffix.lower(), target_format, app_kind))
                output_path = Path(output_dir) / f"draft.{target_format}"
                if target_format == "docx":
                    _write_docx(output_path, _document_xml(26, 11906, 16838, bookmark=True))
                else:
                    output_path.write_bytes(b"pdf")
                return str(output_path)

            html = (
                "<style>@page { size: 215.9mm 279.4mm; margin: 12.7mm 12.7mm 12.7mm 12.7mm; }</style>"
                '<p><a name="vno-untouched-0"></a><span style="font-size:13.5pt">Same saved paragraph</span></p>'
            )
            with patch.object(main, "_run_soffice_convert", side_effect=fake_convert):
                print_source = main._write_print_source(
                    html, "writer", str(root), source_document_path=str(original_docx),
                )
                self.assertEqual(Path(print_source).suffix.lower(), ".docx")
                with zipfile.ZipFile(print_source) as archive:
                    document_xml = archive.read("word/document.xml").decode("utf-8")
                self.assertIn('<w:sz w:val="27"', document_xml)
                self.assertIn('<w:pgSz w:w="12240" w:h="15840"', document_xml)

                pdf_path = main._convert_print_source_to_pdf(print_source, "writer", str(root))

            self.assertEqual(Path(pdf_path).suffix.lower(), ".pdf")
            self.assertEqual(conversions, [(".html", "docx", "writer"), (".docx", "pdf", "writer")])


if __name__ == "__main__":
    unittest.main()
