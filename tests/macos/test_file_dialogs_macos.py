"""MAC-3-2610: native Open / Save / Save As dialogs on macOS (Cocoa NSOpenPanel/NSSavePanel and Qt QFileDialog).

Every native dialog is a mock: these tests never open a panel. The macOS dialog policy from
platform/os_services/macos.py is installed into main.py through its normal OS-services hook, so the tests run on
any host and prove the shared code path, not a copy of it.
"""
from __future__ import annotations

import importlib.util
import os
import re
import sys
import tempfile
import types
import unicodedata
import unittest
import zipfile
from pathlib import Path
from unittest.mock import MagicMock, patch

ROOT = Path(__file__).resolve().parents[2]
PKG_DIR = ROOT / "platform" / "os_services"
PKG_NAME = "_vno_os_services_filedialog_test"


def _load_main():
    if str(ROOT) not in sys.path:
        sys.path.insert(0, str(ROOT))
    try:
        import webview  # noqa: F401
    except ImportError:
        sys.modules["webview"] = types.SimpleNamespace(
            settings={}, windows=[], active_window=lambda: None, OPEN_DIALOG=10, SAVE_DIALOG=30,
        )
    import main
    return main


def _load_os_services():
    if PKG_NAME in sys.modules:
        return sys.modules[PKG_NAME]
    spec = importlib.util.spec_from_file_location(
        PKG_NAME, PKG_DIR / "__init__.py", submodule_search_locations=[str(PKG_DIR)],
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[PKG_NAME] = module
    spec.loader.exec_module(module)
    return module


def _parse_file_type():
    """pywebview's own filter validator (window.create_file_dialog calls it before any backend)."""
    try:
        from webview.util import parse_file_type
        return parse_file_type
    except Exception:  # pragma: no cover - pywebview missing on this host
        return None


main = _load_main()
pkg = _load_os_services()
importlib_macos = __import__(f"{PKG_NAME}.macos", fromlist=["mac_file_dialog_policy"])
file_dialogs = __import__(f"{PKG_NAME}.file_dialogs", fromlist=["FileDialogPolicy"])

NFC_NAME = "Báo cáo quý.docx"
NFD_NAME = unicodedata.normalize("NFD", NFC_NAME)


def _minimal_docx(path: Path) -> None:
    with zipfile.ZipFile(path, "w") as package:
        package.writestr("[Content_Types].xml", (
            '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.'
            'wordprocessingml.document.main+xml"/></Types>'))
        package.writestr("word/document.xml", (
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
            '<w:p><w:r><w:t>Xin chào</w:t></w:r></w:p></w:body></w:document>'))


class MacDialogTestCase(unittest.TestCase):
    def setUp(self):
        self._temp = tempfile.TemporaryDirectory()
        self.temp = Path(self._temp.name).resolve()
        self.home = self.temp / "home"
        (self.home / "Documents").mkdir(parents=True)
        self.policy = importlib_macos.mac_file_dialog_policy(home=self.home)
        services = pkg.OSServices(file_dialogs=self.policy)
        self._patches = [patch.object(main, "_os_services", return_value=services)]
        for item in self._patches:
            item.start()
        self.window = MagicMock()
        self.window.create_confirmation_dialog.return_value = True
        self._window_patch = patch.object(main, "_active_window", return_value=self.window)
        self._window_patch.start()

    def tearDown(self):
        self._window_patch.stop()
        for item in self._patches:
            item.stop()
        self._temp.cleanup()

    def dialog_kwargs(self):
        self.assertTrue(self.window.create_file_dialog.called, "native dialog was not opened")
        return self.window.create_file_dialog.call_args.kwargs


class MacPolicyTests(unittest.TestCase):
    def test_backend_publishes_mac_dialog_capabilities(self):
        services = importlib_macos.build_services()
        policy = services.file_dialogs
        self.assertIsNotNone(policy)
        self.assertFalse(policy.save_dialog_has_type_menu)
        self.assertTrue(policy.save_dialog_confirms_overwrite)
        self.assertTrue(policy.open_allows_multiple)
        self.assertEqual(policy.path_unicode_form, "NFC")
        self.assertEqual(policy.default_directory, Path.home() / "Documents")

    def test_windows_and_linux_backends_keep_the_previous_dialog_path(self):
        windows = __import__(f"{PKG_NAME}.windows", fromlist=["build_services"])
        portable = __import__(f"{PKG_NAME}.portable", fromlist=["build_services"])
        self.assertIsNone(windows.build_services().file_dialogs)
        self.assertIsNone(portable.build_services().file_dialogs)


class OpenFilterTests(MacDialogTestCase):
    REQUIRED = {
        "writer": ("docx", "doc", "odt", "rtf", "txt", "dotx"),
        "sheet": ("xlsx", "xls", "ods", "csv", "xltx", "xlt"),
        "slides": ("pptx", "ppt", "odp", "potx"),
    }

    def open_kwargs(self, app_kind):
        self.window.create_file_dialog.reset_mock()
        self.window.create_file_dialog.return_value = None
        api = main.VnOfficeApi(app_kind=app_kind)
        result = api._open_document_dialog_impl(app_kind)
        self.assertEqual(result, {"status": "cancelled"})
        return self.dialog_kwargs()

    def test_all_supported_types_first_then_each_type_then_all_files(self):
        for app_kind, extensions in self.REQUIRED.items():
            with self.subTest(app=app_kind):
                file_types = self.open_kwargs(app_kind)["file_types"]
                self.assertTrue(file_types[0].startswith("Tất cả tệp được hỗ trợ ("), file_types[0])
                for ext in extensions:
                    self.assertIn(f"*.{ext}", file_types[0])
                    self.assertTrue(any(re.search(rf"\*\.{ext}[;)]", item) for item in file_types[1:-1]), ext)
                self.assertEqual(file_types[-1], "Tất cả tệp (*.*)")

    def test_filters_are_valid_for_pywebview_cocoa_and_qt(self):
        parse = _parse_file_type()
        for app_kind in self.REQUIRED:
            with self.subTest(app=app_kind):
                file_types = self.open_kwargs(app_kind)["file_types"]
                for item in file_types:
                    self.assertEqual(item, unicodedata.normalize("NFC", item))
                    if parse is not None:
                        description, patterns = parse(item)
                        # Cocoa: extensions list without "*." ; Qt: "a b" separated filter
                        extensions = [p.lstrip("*.") for p in patterns.split(";") if p != "*.*"]
                        self.assertTrue(description)
                        self.assertTrue(all(ext.isalnum() for ext in extensions), item)
                    self.assertNotIn(";;", item.replace(";", " "))

    def test_open_allows_choosing_several_files(self):
        self.assertIs(self.open_kwargs("writer")["allow_multiple"], True)

    def test_every_listed_extension_opens_in_its_own_app(self):
        for app_kind, extensions in self.REQUIRED.items():
            for ext in extensions:
                with self.subTest(ext=ext):
                    self.assertEqual(main.FILE_APP_KINDS.get(f".{ext}"), app_kind)


class OpenResultTests(MacDialogTestCase):
    def make_file(self, name=NFC_NAME):
        folder = self.temp / "Thư mục"
        folder.mkdir(exist_ok=True)
        target = folder / unicodedata.normalize("NFC", name)
        _minimal_docx(target)
        return target

    def test_cancel_returns_cleanly_for_cocoa_and_qt_results(self):
        for result in (None, (), ("",)):
            with self.subTest(result=result):
                self.window.create_file_dialog.return_value = result
                api = main.VnOfficeApi(app_kind="writer")
                self.assertEqual(api._open_document_dialog_impl("writer"), {"status": "cancelled"})

    def test_decomposed_path_from_macos_is_reported_composed(self):
        target = self.make_file()
        nfd_path = unicodedata.normalize("NFD", str(target))
        if not os.path.exists(nfd_path):
            self.skipTest("file system distinguishes NFC/NFD names (not APFS/HFS+)")
        self.window.create_file_dialog.return_value = (nfd_path,)
        api = main.VnOfficeApi(app_kind="writer")
        with patch.object(main, "_is_encrypted_package", return_value=True):
            result = api._open_document_dialog_impl("writer")
        self.assertEqual(result["status"], "password_required")
        self.assertEqual(result["sourcePath"], unicodedata.normalize("NFC", str(target)))
        self.assertTrue(os.path.samefile(result["sourcePath"], target))

    def test_opened_document_name_and_path_are_composed(self):
        target = self.make_file()
        nfd_path = unicodedata.normalize("NFD", str(target))
        if not os.path.exists(nfd_path):
            self.skipTest("file system distinguishes NFC/NFD names (not APFS/HFS+)")
        self.window.create_file_dialog.return_value = (nfd_path,)

        def fake_convert(src, target_ext, out_dir, app_kind=None):
            out = Path(out_dir) / f"converted.{target_ext}"
            out.write_text("<html><body><p>Xin chào</p></body></html>", encoding="utf-8")
            return str(out)

        api = main.VnOfficeApi(app_kind="writer")
        with patch.object(main, "_run_soffice_convert", side_effect=fake_convert):
            result = api._open_document_dialog_impl("writer")
        self.assertEqual(result.get("status"), "ok", result.get("message"))
        self.assertEqual(result["fileName"], NFC_NAME)
        self.assertEqual(result["sourcePath"], unicodedata.normalize("NFC", str(target)))

    def test_second_and_later_files_open_in_new_windows(self):
        first = self.make_file("Một.docx")
        second = self.make_file("Hai.docx")
        third = self.temp / "Thư mục" / "bang.xlsx"
        third.write_bytes(b"x")
        self.window.create_file_dialog.return_value = (
            str(first), unicodedata.normalize("NFD", str(second)), str(third),
        )
        api = main.VnOfficeApi(app_kind="writer")
        opened = []
        with patch.object(main, "_is_encrypted_package", return_value=True), \
             patch.object(main.VnOfficeApi, "open_file_in_new_window",
                          side_effect=lambda path, kind: opened.append((path, kind)) or {"status": "ok"}), \
             patch.object(main.threading, "Thread") as thread_class:
            thread_class.side_effect = lambda target, args=(), **kw: types.SimpleNamespace(
                start=lambda: target(*args))
            result = api._open_document_dialog_impl("writer")
        self.assertEqual(result["sourcePath"], str(first))
        # Only files of this app open in more windows; their names are composed.
        self.assertEqual(opened, [(unicodedata.normalize("NFC", str(second)), "writer")])


class SaveDialogTests(MacDialogTestCase):
    def save(self, app_kind="writer", target_format=None, suggested_name=None, source_path=None, result=None,
             content="<p>Xin chào</p>"):
        self.window.create_file_dialog.return_value = result
        converted = self.temp / "converted.bin"
        converted.write_bytes(b"converted document")
        api = main.VnOfficeApi(app_kind=app_kind)
        with patch.object(main, "_write_save_source", return_value=str(self.temp / "src")) as write_source, \
             patch.object(main, "_convert_save_source_to_native", return_value=str(converted)) as convert, \
             patch.object(main, "_run_ooxml_shadow"), \
             patch.object(main, "_convert_ooxml_to_template", create=True) as to_template, \
             patch.object(main, "_export_content_to_pdf",
                          side_effect=lambda *a, return_engine=False, **k: (str(converted), "LibreOffice")
                          if return_engine else str(converted)):
            outcome = api._save_document_dialog_impl(
                content, app_kind=app_kind, target_format=target_format,
                suggested_name=suggested_name, source_path=source_path,
            )
        self.write_source, self.convert, self.to_template = write_source, convert, to_template
        return outcome

    def test_new_document_default_name_and_documents_folder_per_app(self):
        cases = {
            ("writer", "docx", "TaiLieu.docx"): "Tài liệu 1.docx",
            ("writer", "docx", None): "Tài liệu 1.docx",
            ("writer", "docx", "Tài liệu 3.docx"): "Tài liệu 3.docx",
            ("sheet", "xlsx", "BangTinh.xlsx"): "Bảng tính 1.xlsx",
            ("slides", "pptx", "Bản trình bày 2.pptx"): "Bản trình bày 2.pptx",
            ("slides", None, "BanTrinhChieu"): "Bản trình bày 1.pptx",
        }
        for (app_kind, fmt, suggested), expected in cases.items():
            with self.subTest(app=app_kind, suggested=suggested):
                self.assertEqual(self.save(app_kind, fmt, suggested), {"status": "cancelled"})
                kwargs = self.dialog_kwargs()
                self.assertEqual(kwargs["save_filename"], expected)
                self.assertEqual(kwargs["directory"], str(self.home / "Documents"))

    def test_save_as_starts_in_current_file_folder_with_its_format(self):
        folder = self.temp / "Hồ sơ"
        folder.mkdir()
        source = folder / "Báo cáo.odt"
        source.write_bytes(b"x")
        self.save("writer", "odt", source.name, str(source))
        kwargs = self.dialog_kwargs()
        self.assertEqual(kwargs["save_filename"], "Báo cáo.odt")
        self.assertEqual(kwargs["directory"], str(folder))
        self.assertEqual(kwargs["file_types"][0], "Tài liệu ODF (*.odt)")

    def test_unsupported_source_extension_falls_back_to_app_format(self):
        self.save("sheet", "xlt", "Mẫu cũ.xlt")
        self.assertEqual(self.dialog_kwargs()["save_filename"], "Mẫu cũ.xlsx")

    def test_typed_name_without_extension_gets_chosen_format(self):
        typed = str(self.temp / "Báo cáo")
        for result in (typed, (typed,)):  # Cocoa returns a string, Qt a tuple
            with self.subTest(result=type(result).__name__):
                outcome = self.save("writer", "odt", "Báo cáo.odt", result=result)
                self.assertEqual(outcome["status"], "ok", outcome)
                self.assertEqual(outcome["path"], typed + ".odt")
                self.assertEqual(self.write_source.call_args.args[3], "odt")
                self.assertTrue(Path(typed + ".odt").is_file())

    def test_dot_in_name_or_foreign_extension_is_not_taken_as_format(self):
        cases = (
            ("writer", "docx", "Báo cáo v1.2", "Báo cáo v1.2.docx", "docx"),
            ("writer", "docx", "Bảng số liệu.xlsx", "Bảng số liệu.xlsx.docx", "docx"),
            ("sheet", "xlsx", "Doanh thu.", "Doanh thu.xlsx", "xlsx"),
            ("slides", "pptx", "Giới thiệu.docx", "Giới thiệu.docx.pptx", "pptx"),
        )
        for app_kind, fmt, typed, expected, built in cases:
            with self.subTest(typed=typed):
                outcome = self.save(app_kind, fmt, f"x.{fmt}", result=str(self.temp / typed))
                self.assertEqual(outcome["path"], str(self.temp / expected))
                self.assertEqual(self.write_source.call_args.args[3], built)

    def test_typed_supported_extension_chooses_that_format(self):
        outcome = self.save("writer", "docx", "a.docx", result=str(self.temp / "Thư.RTF"))
        self.assertEqual(outcome["path"], str(self.temp / "Thư.RTF"))
        self.assertEqual(self.write_source.call_args.args[3], "rtf")

    def test_pdf_export_name_and_extension(self):
        outcome = self.save("writer", "pdf", "Báo cáo.docx", result=str(self.temp / "Báo cáo"))
        self.assertEqual(self.dialog_kwargs()["save_filename"], "Báo cáo.pdf")
        self.assertEqual(self.dialog_kwargs()["file_types"][0], "Tài liệu PDF (*.pdf)")
        self.assertEqual(outcome["path"], str(self.temp / "Báo cáo.pdf"))

    def test_no_second_overwrite_prompt_when_macos_already_asked(self):
        existing = self.temp / "Báo cáo.docx"
        existing.write_bytes(b"old")
        outcome = self.save("writer", "docx", "Báo cáo.docx", result=str(existing))
        self.assertEqual(outcome["status"], "ok")
        self.window.create_confirmation_dialog.assert_not_called()

    def test_corrected_name_that_exists_asks_once_and_cancel_keeps_file(self):
        existing = self.temp / "Báo cáo.docx"
        existing.write_bytes(b"keep me")
        self.window.create_confirmation_dialog.return_value = False
        outcome = self.save("writer", "docx", "Báo cáo.docx", result=str(self.temp / "Báo cáo"))
        self.assertEqual(outcome, {"status": "cancelled"})
        self.window.create_confirmation_dialog.assert_called_once()
        self.assertIn("Báo cáo.docx", self.window.create_confirmation_dialog.call_args.args[1])
        self.assertEqual(existing.read_bytes(), b"keep me")
        self.write_source.assert_not_called()

    def test_corrected_name_that_exists_is_replaced_after_yes(self):
        existing = self.temp / "Báo cáo.docx"
        existing.write_bytes(b"old")
        outcome = self.save("writer", "docx", "Báo cáo.docx", result=str(self.temp / "Báo cáo"))
        self.assertEqual(outcome["status"], "ok")
        self.window.create_confirmation_dialog.assert_called_once()
        self.assertEqual(existing.read_bytes(), b"converted document")

    def test_cancel_writes_nothing_and_reports_cancelled(self):
        for result in (None, "", ("",)):
            with self.subTest(result=result):
                self.assertEqual(self.save("sheet", "xlsx", "Sổ.xlsx", result=result), {"status": "cancelled"})
                self.write_source.assert_not_called()

    def test_saved_path_is_composed(self):
        typed = unicodedata.normalize("NFD", str(self.temp / "Báo cáo quý"))
        outcome = self.save("writer", "docx", "a.docx", result=typed)
        self.assertEqual(outcome["path"], unicodedata.normalize("NFC", str(self.temp / "Báo cáo quý.docx")))
        names = os.listdir(self.temp)
        self.assertIn(NFC_NAME, names)
        self.assertNotIn(NFD_NAME, [n for n in names if n != NFC_NAME])

    def test_template_formats_save_as_templates(self):
        for app_kind, fmt, built in (("writer", "dotx", "docx"), ("slides", "potx", "pptx"),
                                     ("sheet", "xltx", "xlsx")):
            with self.subTest(fmt=fmt):
                outcome = self.save(app_kind, None, f"x.{built}", result=str(self.temp / f"Mẫu.{fmt}"))
                self.assertEqual(outcome["status"], "ok", outcome)
                self.assertEqual(self.write_source.call_args.args[3], built)


class WindowsPathUnchangedTests(unittest.TestCase):
    """Without a dialog policy (Windows/Linux) main.py keeps its previous dialog arguments."""

    def test_save_dialog_arguments_without_policy(self):
        window = MagicMock()
        window.create_file_dialog.return_value = None
        api = main.VnOfficeApi(app_kind="writer")
        with patch.object(main, "_os_services", return_value=pkg.OSServices()), \
             patch.object(main, "_active_window", return_value=window):
            api._save_document_dialog_impl("<p/>", app_kind="writer", target_format="docx",
                                           suggested_name="Tài liệu 1.docx", source_path=None)
        kwargs = window.create_file_dialog.call_args.kwargs
        self.assertEqual(kwargs["save_filename"], "Tài liệu 1")
        self.assertNotIn("directory", kwargs)
        self.assertEqual(kwargs["file_types"], main._save_file_types_for_format("writer", "docx"))

    def test_open_dialog_arguments_without_policy(self):
        window = MagicMock()
        window.create_file_dialog.return_value = None
        api = main.VnOfficeApi(app_kind="sheet")
        with patch.object(main, "_os_services", return_value=None), \
             patch.object(main, "_active_window", return_value=window):
            api._open_document_dialog_impl("sheet")
        self.assertEqual(window.create_file_dialog.call_args.kwargs, {"file_types": main.OPEN_FILE_TYPES["sheet"]})


class TemplatePackageTests(unittest.TestCase):
    def _package(self, path, main_type):
        with zipfile.ZipFile(path, "w") as package:
            package.writestr("[Content_Types].xml", f'<Types><Override PartName="/x" ContentType="{main_type}"/></Types>')
            package.writestr("x", "data")

    def test_document_and_presentation_become_templates(self):
        cases = {
            "dotx": ("application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
                     "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml"),
            "potx": ("application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml",
                     "application/vnd.openxmlformats-officedocument.presentationml.template.main+xml"),
            "xltx": ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
                     "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml"),
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            for fmt, (before, after) in cases.items():
                with self.subTest(fmt=fmt):
                    path = Path(temp_dir) / f"t.{fmt}"
                    self._package(path, before)
                    main._convert_ooxml_to_template(str(path), fmt)
                    with zipfile.ZipFile(path) as package:
                        types_xml = package.read("[Content_Types].xml").decode("utf-8")
                        self.assertIn(after, types_xml)
                        self.assertNotIn(before, types_xml)
                        self.assertEqual(package.read("x"), b"data")

    def test_save_in_place_keeps_template_format(self):
        for path, fmt in (("a.dotx", "dotx"), ("a.potx", "potx"), ("a.xltx", "xltx")):
            with self.subTest(path=path):
                self.assertEqual(main._infer_save_format_from_path(path)[1], fmt)


if __name__ == "__main__":
    unittest.main()
