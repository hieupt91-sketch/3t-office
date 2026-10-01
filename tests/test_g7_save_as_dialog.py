"""G7: Save As proposes the current name/format/folder like Office; plain-text keeps Vietnamese."""

from __future__ import annotations

import os
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import ANY, MagicMock, patch

import main


class SaveAsDialogTests(unittest.TestCase):
    def test_current_format_filter_is_listed_first(self):
        cases = {
            ("writer", "doc"): "Văn bản Word 97-2003 (*.doc)",
            ("writer", "docx"): "Tài liệu Word (*.docx)",
            ("sheet", "xls"): "Bảng tính Excel 97-2003 (*.xls)",
            ("sheet", "csv"): "Văn bản phân tách dấu phẩy (*.csv)",
            ("slides", "odp"): "Bản trình chiếu ODF (*.odp)",
        }
        for (app, ext), expected in cases.items():
            with self.subTest(app=app, ext=ext):
                types = main._save_file_types_for_format(app, ext)
                self.assertEqual(types[0], expected)
                self.assertEqual(sorted(types), sorted(main.SAVE_FILE_TYPES[app]))
                self.assertIn("Tài liệu PDF (*.pdf)", types)

    def test_unknown_format_keeps_default_order(self):
        self.assertEqual(main._save_file_types_for_format("writer", "xyz"), main.SAVE_FILE_TYPES["writer"])

    def test_save_as_proposes_current_name_in_file_folder(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "Báo cáo.xls"
            source.write_bytes(b"x")
            api = main.VnOfficeApi(app_kind="sheet")
            window = MagicMock()
            window.create_file_dialog.return_value = None  # user pressed Cancel
            with patch.object(main, "_active_window", return_value=window):
                result = api._save_document_dialog_impl(
                    "<fods/>", app_kind="sheet", target_format="xls",
                    suggested_name=source.name, source_path=str(source),
                )
            self.assertEqual(result, {"status": "cancelled"})
            kwargs = window.create_file_dialog.call_args.kwargs
            self.assertEqual(kwargs["save_filename"], "Báo cáo")
            self.assertEqual(kwargs["directory"], temp_dir)
            self.assertEqual(kwargs["file_types"][0], "Bảng tính Excel 97-2003 (*.xls)")

    def test_new_document_save_as_has_no_folder_and_default_format_first(self):
        api = main.VnOfficeApi(app_kind="writer")
        window = MagicMock()
        window.create_file_dialog.return_value = None
        with patch.object(main, "_active_window", return_value=window):
            api._save_document_dialog_impl("<p/>", app_kind="writer", target_format="docx",
                                           suggested_name="Tài liệu 1.docx", source_path=None)
        kwargs = window.create_file_dialog.call_args.kwargs
        self.assertEqual(kwargs["save_filename"], "Tài liệu 1")
        self.assertNotIn("directory", kwargs)
        self.assertEqual(kwargs["file_types"][0], "Tài liệu Word (*.docx)")

    def test_plain_text_export_uses_utf8_filter(self):
        # The default Text filter writes the ANSI code page and turns "Tiếng Việt" into "Ti?ng Vi?t".
        self.assertEqual(main.FORMAT_FILTERS.get("txt"), "Text (encoded):UTF8")

    def test_cancel_after_native_overwrite_prompt_keeps_existing_file_for_each_format(self):
        cases = (("writer", "docx", "odt"), ("writer", "docx", "pdf"),
                 ("sheet", "xlsx", "ods"), ("sheet", "xlsx", "csv"),
                 ("slides", "pptx", "odp"))
        for app_kind, source_ext, target_ext in cases:
            with self.subTest(app=app_kind, target=target_ext), tempfile.TemporaryDirectory() as temp_dir:
                source = Path(temp_dir) / f"source.{source_ext}"
                source.write_bytes(b"source")
                destination = Path(temp_dir) / f"existing.{target_ext}"
                destination.write_bytes(b"preserve this file")
                window = MagicMock()
                window.create_file_dialog.return_value = None  # Native Save dialog canceled after overwrite prompt.
                api = main.VnOfficeApi(app_kind=app_kind)
                with patch.object(main, "_active_window", return_value=window), \
                     patch.object(main, "_write_save_source") as write_source, \
                     patch.object(main, "_convert_save_source_to_native") as convert_source, \
                     patch.object(main, "_export_content_to_pdf") as export_pdf:
                    result = api._save_document_dialog_impl(
                        "<p>new content</p>", app_kind=app_kind, target_format=source_ext,
                        suggested_name=f"existing.{source_ext}", source_path=str(source),
                    )
                self.assertEqual(result, {"status": "cancelled"})
                self.assertEqual(destination.read_bytes(), b"preserve this file")
                write_source.assert_not_called()
                convert_source.assert_not_called()
                export_pdf.assert_not_called()


class SaveAsAlternateFormatTests(unittest.TestCase):
    FORMATS = (
        ("writer", "docx", "odt", "<p>Văn bản</p>"),
        ("writer", "docx", "pdf", "<p>Văn bản</p>"),
        ("sheet", "xlsx", "ods", "<office:body><table:table table:name='Sheet1'/></office:body>"),
        ("sheet", "xlsx", "csv", "<office:body><table:table table:name='Sheet1'/><table:table table:name='Sheet2'/></office:body>"),
        ("slides", "pptx", "odp", "<office:presentation/>"),
    )

    def test_save_as_converts_each_supported_alternate_format(self):
        for app_kind, source_ext, target_ext, content in self.FORMATS:
            with self.subTest(app=app_kind, target=target_ext), tempfile.TemporaryDirectory() as temp_dir:
                source = Path(temp_dir) / f"source.{source_ext}"
                source.write_bytes(b"source")
                destination = Path(temp_dir) / f"renamed.{target_ext}"
                converted = Path(temp_dir) / f"converted.{target_ext}"
                destination.write_bytes(b"existing target contents")
                converted.write_bytes(b"converted document")
                window = MagicMock()
                # A returned path models the user accepting the native overwrite prompt.
                window.create_file_dialog.return_value = (str(destination),)
                window.create_confirmation_dialog.return_value = True
                api = main.VnOfficeApi(app_kind=app_kind)
                with patch.object(main, "_active_window", return_value=window), \
                     patch.object(main, "_write_save_source", return_value=str(source)) as write_source, \
                     patch.object(main, "_convert_save_source_to_native", return_value=str(converted)) as convert_source, \
                     patch.object(main, "_export_content_to_pdf", return_value=(str(converted), "LibreOffice")) as export_pdf:
                    result = api._save_document_dialog_impl(
                        content,
                        app_kind=app_kind,
                        target_format=source_ext,
                        suggested_name=f"original.{source_ext}",
                        source_path=str(source),
                    )

                self.assertEqual(result["status"], "ok")
                self.assertEqual(result["path"], str(destination))
                self.assertEqual(destination.read_bytes(), b"converted document")
                self.assertEqual(window.create_file_dialog.call_args.kwargs["save_filename"], "original")
                if target_ext == "pdf":
                    export_pdf.assert_called_once()
                    convert_source.assert_not_called()
                else:
                    write_source.assert_called_once()
                    self.assertEqual(write_source.call_args.args[1:], (app_kind, ANY, target_ext))
                    convert_source.assert_called_once()
                    self.assertEqual(convert_source.call_args.args[1:3], (app_kind, target_ext))
                    if target_ext == "csv":
                        window.create_confirmation_dialog.assert_called_once()
                    else:
                        window.create_confirmation_dialog.assert_not_called()

    def test_multi_sheet_csv_warning_cancel_keeps_target_untouched(self):
        content = "<office:body><table:table table:name='Sheet1'/><table:table table:name='Sheet2'/></office:body>"
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "source.xlsx"
            source.write_bytes(b"source")
            destination = Path(temp_dir) / "existing.csv"
            destination.write_bytes(b"keep existing")
            window = MagicMock()
            window.create_file_dialog.return_value = (str(destination),)
            window.create_confirmation_dialog.return_value = False
            api = main.VnOfficeApi(app_kind="sheet")
            with patch.object(main, "_active_window", return_value=window), \
                 patch.object(main, "_write_save_source") as write_source, \
                 patch.object(main, "_convert_save_source_to_native") as convert_source:
                result = api._save_document_dialog_impl(
                    content, app_kind="sheet", target_format="xlsx", suggested_name="original.xlsx",
                    source_path=str(source),
                )
            self.assertEqual(result, {"status": "cancelled"})
            self.assertEqual(destination.read_bytes(), b"keep existing")
            write_source.assert_not_called()
            convert_source.assert_not_called()
            warning = window.create_confirmation_dialog.call_args.args[1]
            self.assertIn("trang tính đang hoạt động", warning)


class OpenPackageLeniencyTests(unittest.TestCase):
    def test_ooxml_main_part_is_found_through_relationships(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "renamed-part.docx"
            with zipfile.ZipFile(source, "w") as package:
                package.writestr("[Content_Types].xml", "<Types xmlns='http://schemas.openxmlformats.org/package/2006/content-types'/>")
                package.writestr(
                    "_rels/.rels",
                    "<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>"
                    "<Relationship Id='rId1' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument' Target='word/document2.xml'/>"
                    "</Relationships>",
                )
                package.writestr("word/document2.xml", "<w:document xmlns:w='x'/>")
            main.VnOfficeApi(app_kind="writer")._validate_open_package(str(source), "writer")

    def test_legacy_binary_with_ooxml_extension_is_left_to_the_engine(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "legacy.xlsx"
            source.write_bytes(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\0" * 512)
            main.VnOfficeApi(app_kind="sheet")._validate_open_package(str(source), "sheet")

    def test_odf_with_wrong_mimetype_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "wrong.ods"
            with zipfile.ZipFile(source, "w") as package:
                package.writestr("mimetype", "application/vnd.oasis.opendocument.text")
                package.writestr("content.xml", "<office:document-content xmlns:office='x'/>")
            with self.assertRaises(main.DocumentEngineError):
                main.VnOfficeApi(app_kind="sheet")._validate_open_package(str(source), "sheet")


if __name__ == "__main__":
    unittest.main()
