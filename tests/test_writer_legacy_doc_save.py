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

        # W-docwrap: bare <wp:wrapSquare/> must be normalised to include wrapText
        # so that the LibreOffice MS Word 97 filter writes the correct Square wrap record.
        # wrapText="bothSides" is the OOXML spec default (§20.4.2.17).
        self.assertIn('wrapText="bothSides"', observed["intermediate"])
        self.assertIn("<wp:wrapSquare", observed["intermediate"])
        self.assertNotIn("<wp:wrapNone", observed["intermediate"])
        self.assertIn("Edited title ZZ", observed["intermediate"])

    def test_prepare_writer_docx_normalizes_bare_wrap_square_adds_wrapText(self):
        """W-docwrap: bare <wp:wrapSquare/> must get wrapText='bothSides' added."""
        patcher = main._ooxml_zip_patch()
        doc_xml = (
            '<w:document xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">'
            "<w:body><w:p><w:r><w:drawing><wp:anchor>"
            "<wp:wrapSquare/>"
            "<wp:docPr id=\"1\" name=\"Image 1\"/>"
            "</wp:anchor></w:drawing></w:r></w:p></w:body></w:document>"
        )
        input_docx = _docx(doc_xml)
        prepared_docx = patcher.prepare_writer_docx_for_legacy_doc_export(input_docx)
        output_xml = _document_xml(prepared_docx)

        self.assertIn("<wp:wrapSquare", output_xml)
        self.assertIn('wrapText="bothSides"', output_xml)
        self.assertNotIn("<wp:wrapNone", output_xml)

    def test_prepare_writer_docx_does_not_change_existing_wrapText(self):
        """W-docwrap: existing wrapText attribute must not be changed."""
        patcher = main._ooxml_zip_patch()
        doc_xml = (
            '<w:document xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">'
            "<w:body><w:p><w:r><w:drawing><wp:anchor>"
            '<wp:wrapSquare wrapText="right"/>'
            "<wp:docPr id=\"1\" name=\"Image 1\"/>"
            "</wp:anchor></w:drawing></w:r></w:p></w:body></w:document>"
        )
        input_docx = _docx(doc_xml)
        prepared_docx = patcher.prepare_writer_docx_for_legacy_doc_export(input_docx)
        output_xml = _document_xml(prepared_docx)

        # Should not alter existing wrapText — must stay "right", not be changed to "bothSides"
        self.assertIn('wrapText="right"', output_xml)
        self.assertNotIn('wrapText="bothSides"', output_xml)


    def test_prepare_writer_docx_for_legacy_doc_export_flattens_alternate_content(self):
        patcher = main._ooxml_zip_patch()
        doc_xml = (
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
            'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" '
            'xmlns:v="urn:schemas-microsoft-com:vml">'
            '<w:body><w:p><w:r>'
            '<mc:AlternateContent>'
            '<mc:Choice Requires="wps"><w:drawing><wps:wsp><wps:txbx><w:txbxContent>'
            '<w:p><w:r><w:t>Inside Choice</w:t></w:r></w:p>'
            '</w:txbxContent></wps:txbx></wps:wsp></w:drawing></mc:Choice>'
            '<mc:Fallback><w:pict><v:rect><v:textbox><w:txbxContent>'
            '<w:p><w:r><w:t>Inside Fallback</w:t></w:r></w:p>'
            '</v:textbox></v:rect></w:pict></mc:Fallback>'
            '</mc:AlternateContent>'
            '</w:r></w:p></w:body></w:document>'
        )
        input_docx = _docx(doc_xml)
        prepared_docx = patcher.prepare_writer_docx_for_legacy_doc_export(input_docx)
        output_xml = _document_xml(prepared_docx)

        self.assertNotIn("<mc:AlternateContent", output_xml)
        self.assertNotIn("<mc:Choice", output_xml)
        self.assertNotIn("<mc:Fallback", output_xml)
        self.assertIn("<w:pict><v:rect>", output_xml)
        self.assertIn("Inside Fallback", output_xml)

    def test_doc_export_flattens_alternate_content_in_intermediate(self):
        converted = _docx(
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
            'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" '
            'xmlns:v="urn:schemas-microsoft-com:vml">'
            '<w:body><w:p><w:r>'
            '<mc:AlternateContent>'
            '<mc:Choice Requires="wps"><w:drawing><wps:wsp><wps:txbx><w:txbxContent>'
            '<w:p><w:r><w:t>Frame DrawingML</w:t></w:r></w:p>'
            '</w:txbxContent></wps:txbx></wps:wsp></w:drawing></mc:Choice>'
            '<mc:Fallback><w:pict><v:rect><v:textbox><w:txbxContent>'
            '<w:p><w:r><w:t>Frame VML</w:t></w:r></w:p>'
            '</v:textbox></v:rect></w:pict></mc:Fallback>'
            '</mc:AlternateContent>'
            '</w:r></w:p></w:body></w:document>'
        )
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            html = root / "draft.html"
            source_doc = root / "source.doc"
            html.write_text("<p>Doc content</p>", encoding="utf-8")
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
                    dest.write_bytes(converted)
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

        self.assertNotIn("<mc:AlternateContent", observed["intermediate"])
        self.assertIn("<w:pict><v:rect>", observed["intermediate"])
        self.assertIn("Frame VML", observed["intermediate"])

    def test_prepare_writer_docx_for_legacy_doc_export_converts_naked_wps_txbx_to_vml(self):
        patcher = main._ooxml_zip_patch()
        doc_xml = (
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" '
            'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
            'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">'
            '<w:body><w:p><w:r>'
            '<w:drawing><wp:anchor>'
            '<wp:positionH><wp:posOffset>2804160</wp:posOffset></wp:positionH>'
            '<wp:positionV><wp:posOffset>133985</wp:posOffset></wp:positionV>'
            '<wp:extent cx="3799840" cy="1667510"/>'
            '<wp:docPr id="2" name="Frame1"/>'
            '<a:graphic><a:graphicData>'
            '<wps:wsp><wps:txbx><w:txbxContent>'
            '<w:p><w:r><w:t>Naked Textbox Content</w:t></w:r></w:p>'
            '</w:txbxContent></wps:txbx></wps:wsp>'
            '</a:graphicData></a:graphic>'
            '</wp:anchor></w:drawing>'
            '</w:r></w:p></w:body></w:document>'
        )
        input_docx = _docx(doc_xml)
        prepared_docx = patcher.prepare_writer_docx_for_legacy_doc_export(input_docx)
        output_xml = _document_xml(prepared_docx)

        self.assertNotIn("<wps:txbx", output_xml)
        self.assertNotIn("<w:drawing", output_xml)
        self.assertIn("<w:pict><v:rect", output_xml)
        self.assertIn("<v:textbox><w:txbxContent>", output_xml)
        self.assertIn("Naked Textbox Content", output_xml)
        self.assertIn('xmlns:v="urn:schemas-microsoft-com:vml"', output_xml)
        self.assertIn('xmlns:w10="urn:schemas-microsoft-com:office:word"', output_xml)

    def test_postprocess_writer_docx_restores_unnamed_lines(self):
        patcher = main._ooxml_zip_patch()
        source_xml = (
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
            'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
            'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">'
            '<w:body>'
            '<w:p><w:r><w:t>Độc lập - Tự do - Hạnh phúc</w:t></w:r>'
            '<w:r><w:drawing><wp:anchor>'
            '<wp:extent cx="1868805" cy="0"/>'
            '<wp:docPr id="1" name=""/>'
            '<a:graphic><a:graphicData>'
            '<wps:wsp><wps:spPr><a:prstGeom prst="line"/></wps:spPr></wps:wsp>'
            '</a:graphicData></a:graphic>'
            '</wp:anchor></w:drawing></w:r></w:p>'
            '<w:p><w:r><w:t>Biên bản hoàn thành</w:t></w:r></w:p>'
            '</w:body></w:document>'
        )
        converted_xml = (
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            '<w:body>'
            '<w:p><w:r><w:t>Độc lập - Tự do - Hạnh phúc</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Biên bản hoàn thành</w:t></w:r></w:p>'
            '</w:body></w:document>'
        )
        source = _docx(source_xml)
        converted = _docx(converted_xml)
        patched = patcher.postprocess_writer_docx(converted, source_docx=source)
        result_xml = _document_xml(patched)

        self.assertIn('prst="line"', result_xml)
        self.assertIn('<wp:extent cx="1868805" cy="0"/>', result_xml)

    def test_postprocess_writer_docx_does_not_duplicate_existing_unnamed_lines(self):
        patcher = main._ooxml_zip_patch()
        source_xml = (
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
            'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
            'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">'
            '<w:body>'
            '<w:p><w:r><w:t>Tiêu đề</w:t></w:r>'
            '<w:r><w:drawing><wp:anchor>'
            '<wp:extent cx="5781675" cy="0"/>'
            '<wp:docPr id="1" name=""/>'
            '<a:graphic><a:graphicData>'
            '<wps:wsp><wps:spPr><a:prstGeom prst="line"/></wps:spPr></wps:wsp>'
            '</a:graphicData></a:graphic>'
            '</wp:anchor></w:drawing></w:r></w:p>'
            '</w:body></w:document>'
        )
        converted_xml = (
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
            'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            '<w:body>'
            '<w:p><w:r><w:t>Tiêu đề</w:t></w:r>'
            '<w:r><w:drawing><wp:anchor>'
            '<wp:extent cx="5781675" cy="57150"/>'
            '<wp:docPr id="1" name="Shape1"/>'
            '<pic:pic><pic:blipFill/><pic:spPr/></pic:pic>'
            '</wp:anchor></w:drawing></w:r></w:p>'
            '</w:body></w:document>'
        )
        source = _docx(source_xml)
        converted = _docx(converted_xml)
        patched = patcher.postprocess_writer_docx(converted, source_docx=source)
        result_xml = _document_xml(patched)

        self.assertEqual(result_xml.count("<wp:anchor"), 1)
        self.assertIn('prst="line"', result_xml)


if __name__ == "__main__":
    unittest.main()

