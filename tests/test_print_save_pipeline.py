"""Print / Export PDF must be built by the same code path as Save (ROADMAP-V1 3b).

Writer: editor HTML -> LibreOffice DOCX -> source-aware OOXML postprocess
(adapters/libreoffice/common/ooxml_zip_patch.py) -> temp .docx -> PDF.
The earlier implementation converted the editor HTML straight to PDF, so d03.docx
(1 page in Word, on the canvas and in the saved .docx) printed as 2 pages.
"""

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


def _document_xml(
    font_size: int,
    page_width: int,
    page_height: int,
    *,
    bookmark: bool = False,
    pristine_bookmark: bool = False,
) -> str:
    marker_parts = []
    if bookmark:
        marker_parts.append('<w:bookmarkStart w:id="0" w:name="vno-untouched-0"/>')
    if pristine_bookmark:
        marker_parts.append('<w:bookmarkStart w:id="1" w:name="vno-pristine-document"/>')
    marker = "".join(marker_parts)
    return (
        f'<w:document xmlns:w="{_DOCUMENT_NS}"><w:body>'
        '<w:p>%s<w:r><w:rPr><w:sz w:val="%d"/></w:rPr><w:t>Same saved paragraph</w:t></w:r></w:p>'
        '<w:sectPr><w:pgSz w:w="%d" w:h="%d"/><w:pgMar w:top="720" w:right="720" '
        'w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>'
        '</w:body></w:document>'
    ) % (marker, font_size, page_width, page_height)


_WRITER_HTML = (
    "<style>@page { size: 215.9mm 279.4mm; margin: 12.7mm 12.7mm 12.7mm 12.7mm; }</style>"
    '<p><a name="vno-untouched-0"></a><span style="font-size:13.5pt">Same saved paragraph</span></p>'
)


class _FakeSoffice:
    """Deterministic stand-in for soffice --convert-to that records every conversion."""

    def __init__(self):
        self.conversions: list[tuple[str, str, str | None]] = []

    def __call__(self, source_path, target_format, output_dir, app_kind=None):
        source = Path(source_path)
        self.conversions.append((source.suffix.lower(), target_format, app_kind))
        output_path = Path(output_dir) / f"{source.stem}.{target_format}"
        if target_format == "docx":
            if source.suffix.lower() == ".doc":
                # LibreOffice's DOC -> DOCX import of the legacy source.
                _write_docx(output_path, _document_xml(27, 12240, 15840))
            else:
                # LibreOffice's HTML import rounds 13.5pt and forgets the Letter page.
                source_html = source.read_text(encoding="utf-8", errors="replace")
                pristine = "vno-pristine-document" in source_html
                _write_docx(
                    output_path,
                    _document_xml(
                        26,
                        11906,
                        16838,
                        bookmark=True,
                        pristine_bookmark=pristine,
                    ),
                )
        elif target_format in {"xlsx", "pptx"}:
            with zipfile.ZipFile(output_path, "w") as archive:
                archive.writestr("[Content_Types].xml", "<Types/>")
        else:
            output_path.write_bytes(b"%PDF-1.7 fake")
        return str(output_path)


def _docx_document_xml(path: str) -> str:
    with zipfile.ZipFile(path) as archive:
        return archive.read("word/document.xml").decode("utf-8")


class PrintSavePipelineTests(unittest.TestCase):
    def setUp(self):
        self.office_info_patch = patch.object(
            main._OFFICE_COM_MODULE,
            "get_office_engine_info",
            return_value={"status": "ok", "available": False, "engine": "LibreOffice", "progId": ""},
        )
        self.office_info_patch.start()
        self.addCleanup(self.office_info_patch.stop)

    def test_writer_print_source_is_the_source_aware_save_docx(self):
        with tempfile.TemporaryDirectory(prefix="vno_print_save_test_") as temp_dir:
            root = Path(temp_dir)
            original_docx = root / "source.docx"
            _write_docx(original_docx, _document_xml(27, 12240, 15840))
            fake = _FakeSoffice()

            with patch.object(main, "_run_soffice_convert", side_effect=fake):
                print_source = main._write_print_source(
                    _WRITER_HTML, "writer", str(root), source_document_path=str(original_docx),
                )
                self.assertEqual(Path(print_source).suffix.lower(), ".docx")
                document_xml = _docx_document_xml(print_source)
                # Restored from the source OOXML by the Save postprocess.
                self.assertIn('<w:sz w:val="27"', document_xml)
                self.assertIn('<w:pgSz w:w="12240" w:h="15840"', document_xml)

                pdf_path = main._convert_print_source_to_pdf(print_source, "writer", str(root))

            self.assertEqual(Path(pdf_path).suffix.lower(), ".pdf")
            self.assertEqual(fake.conversions, [(".html", "docx", "writer"), (".docx", "pdf", "writer")])

    def test_writer_print_docx_has_the_same_package_contents_as_save_in_place_output(self):
        with tempfile.TemporaryDirectory(prefix="vno_print_save_same_") as temp_dir:
            root = Path(temp_dir)
            original_docx = root / "source.docx"
            _write_docx(original_docx, _document_xml(27, 12240, 15840))
            saved_docx = root / "saved.docx"
            print_dir = root / "print"
            print_dir.mkdir()

            with patch.object(main, "_run_soffice_convert", side_effect=_FakeSoffice()):
                saved = main.VnOfficeApi()._save_document_in_place_impl(
                    _WRITER_HTML, "writer", str(saved_docx), str(original_docx),
                )
                self.assertEqual(saved["status"], "ok", saved)
                print_source = main._write_print_source(
                    _WRITER_HTML, "writer", str(print_dir), source_document_path=str(original_docx),
                )

            with zipfile.ZipFile(print_source) as print_archive, zipfile.ZipFile(saved_docx) as save_archive:
                self.assertEqual(set(print_archive.namelist()), set(save_archive.namelist()))
                for member in save_archive.namelist():
                    with self.subTest(member=member):
                        self.assertEqual(print_archive.read(member), save_archive.read(member))

    def test_untouched_document_is_not_short_circuited_around_save(self):
        """The Save conversion runs, then pristine source OOXML is restored exactly."""
        with tempfile.TemporaryDirectory(prefix="vno_print_pristine_test_") as temp_dir:
            root = Path(temp_dir)
            original_docx = root / "source.docx"
            _write_docx(original_docx, _document_xml(27, 12240, 15840))
            fake = _FakeSoffice()
            content = '<a name="vno-pristine-document"></a>' + _WRITER_HTML

            with patch.object(main, "_run_soffice_convert", side_effect=fake):
                main._export_content_to_pdf(
                    content, "writer", str(root), source_document_path=str(original_docx),
                )

            self.assertEqual(fake.conversions, [(".html", "docx", "writer"), (".docx", "pdf", "writer")])
            self.assertEqual((root / "draft.docx").read_bytes(), original_docx.read_bytes())

    def test_pristine_save_and_print_share_restored_original_docx_package(self):
        with tempfile.TemporaryDirectory(prefix="vno_pristine_save_print_same_") as temp_dir:
            root = Path(temp_dir)
            original_docx = root / "source.docx"
            _write_docx(original_docx, _document_xml(27, 12240, 15840))
            content = '<a name="vno-pristine-document"></a>' + _WRITER_HTML
            fake = _FakeSoffice()
            saved_docx = root / "saved.docx"
            print_dir = root / "print"
            print_dir.mkdir()

            with patch.object(main, "_run_soffice_convert", side_effect=fake):
                saved = main.VnOfficeApi()._save_document_in_place_impl(
                    content, "writer", str(saved_docx), str(original_docx),
                )
                self.assertEqual(saved["status"], "ok", saved)
                print_source = main._write_print_source(
                    content, "writer", str(print_dir), source_document_path=str(original_docx),
                )

            self.assertEqual(saved_docx.read_bytes(), original_docx.read_bytes())
            self.assertEqual(Path(print_source).read_bytes(), original_docx.read_bytes())
            self.assertEqual(fake.conversions, [(".html", "docx", "writer")] * 2)

    def test_legacy_doc_does_not_treat_its_intermediate_docx_as_original_source(self):
        with tempfile.TemporaryDirectory(prefix="vno_pristine_legacy_print_") as temp_dir:
            root = Path(temp_dir)
            original_doc = root / "legacy.doc"
            original_doc.write_bytes(b"\xd0\xcf\x11\xe0 fake OLE")
            content = '<a name="vno-pristine-document"></a>' + _WRITER_HTML
            fake = _FakeSoffice()

            with patch.object(main, "_run_soffice_convert", side_effect=fake):
                print_source = main._write_print_source(
                    content, "writer", str(root), source_document_path=str(original_doc),
                )

            intermediate_source = root / "legacy_source" / "legacy.docx"
            self.assertTrue(intermediate_source.is_file())
            self.assertNotEqual(Path(print_source).read_bytes(), intermediate_source.read_bytes())
            self.assertEqual(
                fake.conversions,
                [(".html", "docx", "writer"), (".doc", "docx", "writer")],
            )

    def test_legacy_doc_prints_through_its_intermediate_docx(self):
        with tempfile.TemporaryDirectory(prefix="vno_print_doc_test_") as temp_dir:
            root = Path(temp_dir)
            original_doc = root / "legacy.doc"
            original_doc.write_bytes(b"\xd0\xcf\x11\xe0 fake OLE")
            fake = _FakeSoffice()

            with patch.object(main, "_run_soffice_convert", side_effect=fake):
                print_source = main._write_print_source(
                    _WRITER_HTML, "writer", str(root), source_document_path=str(original_doc),
                )
                document_xml = _docx_document_xml(print_source)

            self.assertEqual(Path(print_source).suffix.lower(), ".docx")
            self.assertEqual(
                fake.conversions,
                [(".html", "docx", "writer"), (".doc", "docx", "writer")],
            )
            self.assertIn('<w:sz w:val="27"', document_xml)
            self.assertIn('<w:pgSz w:w="12240" w:h="15840"', document_xml)

    def test_new_writer_document_prints_through_the_created_docx_save_path(self):
        with tempfile.TemporaryDirectory(prefix="vno_print_new_test_") as temp_dir:
            root = Path(temp_dir)
            fake = _FakeSoffice()
            with patch.object(main, "_run_soffice_convert", side_effect=fake), \
                    patch.object(main, "_apply_native_export_postprocess",
                                 wraps=main._apply_native_export_postprocess) as postprocess:
                pdf_path = main._export_content_to_pdf("<p>Tài liệu mới</p>", "writer", str(root))

            self.assertTrue(Path(pdf_path).is_file())
            self.assertEqual(fake.conversions, [(".html", "docx", "writer"), (".docx", "pdf", "writer")])
            postprocess.assert_called_once()
            self.assertEqual(postprocess.call_args.args[2:4], ("writer", "docx"))
            self.assertIsNone(postprocess.call_args.kwargs["source_path"])

    def test_sheet_and_slides_print_through_their_save_formats(self):
        for app_kind, content, native in (
            ("sheet", "<office:document/>", "xlsx"),
            ("slides", "<office:document/>", "pptx"),
        ):
            with self.subTest(app_kind=app_kind), \
                    tempfile.TemporaryDirectory(prefix=f"vno_print_{app_kind}_test_") as temp_dir:
                fake = _FakeSoffice()
                with patch.object(main, "_run_soffice_convert", side_effect=fake), \
                        patch.object(main, "_apply_native_export_postprocess") as postprocess:
                    main._export_content_to_pdf(content, app_kind, temp_dir, source_document_path=None)

                source_suffix = ".fods" if app_kind == "sheet" else ".fodp"
                self.assertEqual(
                    fake.conversions,
                    [(source_suffix, native, app_kind), (f".{native}", "pdf", app_kind)],
                )
                postprocess.assert_called_once()
                self.assertEqual(postprocess.call_args.args[2:4], (app_kind, native))


class PristineMarkerCarrierTests(unittest.TestCase):
    """d03.docx: an untouched document saved/printed through Save must keep its pages."""

    def setUp(self):
        self.patch = main._ooxml_zip_patch()

    def _body(self, inner: str) -> str:
        return f'<w:document xmlns:w="{_DOCUMENT_NS}"><w:body>{inner}<w:sectPr/></w:body></w:document>'

    def test_leading_phantom_paragraph_holding_only_the_pristine_marker_is_removed(self):
        xml = self._body(
            '<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r></w:r>'
            '<w:bookmarkStart w:id="0" w:name="vno-pristine-document"/><w:bookmarkEnd w:id="0"/>'
            '<w:r><w:br w:type="page"/></w:r></w:p>'
            '<w:tbl><w:tr><w:tc><w:p><w:pPr><w:pageBreakBefore/></w:pPr>'
            '<w:r><w:t>Cell</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'
        )
        result = self.patch._strip_writer_pristine_marker_carrier(xml)
        self.assertNotIn('<w:br w:type="page"/>', result)
        self.assertIn('w:name="vno-pristine-document"', result)  # signal kept for later passes
        self.assertEqual(len(self.patch._writer_body_paragraph_ranges(result)), 0)
        self.assertEqual(self.patch._remove_writer_untouched_bookmarks(result).count("bookmark"), 0)

    def test_real_first_paragraph_is_never_removed(self):
        for paragraph in (
            '<w:p><w:bookmarkStart w:id="0" w:name="vno-pristine-document"/><w:bookmarkEnd w:id="0"/>'
            '<w:r><w:t>Tiêu đề</w:t></w:r></w:p>',
            '<w:p><w:bookmarkStart w:id="0" w:name="vno-pristine-document"/><w:bookmarkEnd w:id="0"/>'
            '<w:r><w:drawing/></w:r></w:p>',
            '<w:p><w:bookmarkStart w:id="0" w:name="vno-pristine-document"/>'
            '<w:bookmarkStart w:id="1" w:name="vno-untouched-0"/><w:r><w:br/></w:r></w:p>',
        ):
            with self.subTest(paragraph=paragraph):
                xml = self._body(paragraph + '<w:p><w:r><w:t>Next</w:t></w:r></w:p>')
                self.assertEqual(self.patch._strip_writer_pristine_marker_carrier(xml), xml)

    def test_pristine_table_paragraphs_get_their_source_formatting_back(self):
        source = self._body(
            '<w:tbl><w:tr><w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr>'
            '<w:r><w:br w:type="page"/></w:r><w:r><w:t>Cell text</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'
        )
        converted = self._body(
            '<w:tbl><w:tr><w:tc><w:p><w:pPr><w:pageBreakBefore/><w:jc w:val="center"/></w:pPr>'
            '<w:bookmarkStart w:id="1" w:name="vno-untouched-0"/><w:bookmarkEnd w:id="1"/>'
            '<w:r><w:t>Cell text</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'
        )
        body_only = self.patch._restore_writer_matched_formatting(
            converted, source, trust_all_exact=True,
        )
        self.assertIn("<w:pageBreakBefore/>", body_only)
        restored = self.patch._restore_writer_matched_formatting(
            body_only, source, table_paragraphs_only=True,
        )
        self.assertNotIn("<w:pageBreakBefore/>", restored)
        self.assertIn('<w:br w:type="page"/>', restored)


if __name__ == "__main__":
    unittest.main()
