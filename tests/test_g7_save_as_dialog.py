"""G7: Save As proposes the current name/format/folder like Office; plain-text keeps Vietnamese."""

from __future__ import annotations

import os
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import MagicMock, patch

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
            self.assertEqual(kwargs["save_filename"], "Báo cáo.xls")
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
        self.assertEqual(kwargs["save_filename"], "Tài liệu 1.docx")
        self.assertNotIn("directory", kwargs)
        self.assertEqual(kwargs["file_types"][0], "Tài liệu Word (*.docx)")

    def test_plain_text_export_uses_utf8_filter(self):
        # The default Text filter writes the ANSI code page and turns "Tiếng Việt" into "Ti?ng Vi?t".
        self.assertEqual(main.FORMAT_FILTERS.get("txt"), "Text (encoded):UTF8")


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
