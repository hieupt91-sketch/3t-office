"""P2: user-data dir / engine lookup / long path / error box moved behind platform/os_services; results must equal the old code."""

from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import main as vnmain  # noqa: E402


class ServicesMatchLegacyTests(unittest.TestCase):
    def setUp(self):
        vnmain._OS_SERVICES = None
        vnmain._OS_SERVICES_LOAD_FAILED = False

    def test_services_load_through_the_private_package_name(self):
        services = vnmain._os_services()
        self.assertIsNotNone(services)
        self.assertIn("_vno_os_services", sys.modules)
        self.assertIsNotNone(services.data_dirs)
        self.assertIsNotNone(services.launcher)

    def test_user_data_dir_equals_legacy_with_and_without_localappdata(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            with mock.patch.dict(os.environ, {"LOCALAPPDATA": temp_dir}):
                self.assertEqual(vnmain._user_data_dir(), vnmain._legacy_user_data_dir())
                self.assertEqual(vnmain._user_data_dir(), Path(temp_dir) / "VNOffice")
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("LOCALAPPDATA", None)
            self.assertEqual(vnmain._user_data_dir(), vnmain._legacy_user_data_dir())

    def test_profile_dir_names_follow_the_app_kind_and_unknown_kinds_share(self):
        dirs = vnmain._os_services().data_dirs
        base = dirs.user_data_dir()
        self.assertEqual(dirs.document_profile_dir("sheet"), base / "lo-profile-sheet")
        self.assertEqual(dirs.document_profile_dir("whatever"), base / "lo-profile-shared")

    def test_find_soffice_equals_legacy_on_this_machine(self):
        self.assertEqual(vnmain.find_soffice(), vnmain._legacy_find_soffice())

    def test_find_soffice_candidate_order_override_first_then_bundled(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            override = Path(temp_dir) / "my-soffice.exe"
            override.write_bytes(b"x")
            bundled = Path(temp_dir) / "tools" / "libreoffice" / "program"
            bundled.mkdir(parents=True)
            (bundled / "soffice.exe").write_bytes(b"x")
            launcher = vnmain._os_services().launcher
            self.assertEqual(launcher.find_document_engine(Path(temp_dir), str(override)), override)
            self.assertEqual(launcher.find_document_engine(Path(temp_dir), None), bundled / "soffice.exe")
            self.assertEqual(launcher.find_document_engine(Path(temp_dir), str(Path(temp_dir) / "missing.exe")), bundled / "soffice.exe")

    @unittest.skipUnless(sys.platform == "win32", "Windows extended-length prefix")
    def test_native_io_path_matches_the_old_long_path_prefix(self):
        launcher = vnmain._os_services().launcher
        with tempfile.TemporaryDirectory() as temp_dir:
            text = str(Path(temp_dir).resolve())
            self.assertEqual(str(launcher.native_io_path(Path(temp_dir))), "\\\\?\\" + text)
            self.assertEqual(str(launcher.native_io_path(Path("\\\\?\\" + text))), "\\\\?\\" + text)

    def test_legacy_flag_and_load_failure_both_fall_back_without_raising(self):
        with mock.patch.dict(os.environ, {"VNO_OS_SERVICES_LEGACY": "1"}):
            self.assertIsNone(vnmain._os_services())
            self.assertEqual(vnmain._user_data_dir(), vnmain._legacy_user_data_dir())
        vnmain._OS_SERVICES = None
        with mock.patch.object(vnmain.importlib.util, "spec_from_file_location", side_effect=RuntimeError("boom")):
            self.assertIsNone(vnmain._os_services())
        self.assertTrue(vnmain._OS_SERVICES_LOAD_FAILED)
        self.assertEqual(vnmain._user_data_dir(), vnmain._legacy_user_data_dir())

    def test_portable_backend_keeps_the_old_non_windows_results(self):
        pkg = vnmain._os_services()  # make sure the private package is importable
        import importlib
        portable = importlib.import_module("_vno_os_services.portable")
        with mock.patch.object(portable.sys, "platform", "darwin"):
            self.assertEqual(portable.PortableDataDirs().user_data_dir(), Path.home() / "Library" / "Application Support" / "VNOffice")
        with mock.patch.object(portable.sys, "platform", "linux"), mock.patch.dict(os.environ, {"XDG_DATA_HOME": "/x/y"}):
            self.assertEqual(portable.PortableDataDirs().user_data_dir(), Path("/x/y") / "VNOffice")
        self.assertIsNotNone(pkg)

    def test_show_error_never_raises_and_reports_through_a_result(self):
        portable_like = vnmain._os_services().launcher
        with mock.patch("ctypes.windll", create=True) as windll:
            windll.user32.MessageBoxW.side_effect = OSError("no gui")
            result = portable_like.show_error("t", "m")
        self.assertFalse(result.is_ok)

    def test_native_printer_service_routes_listing_and_pdf_printing_without_changing_windows_fallback(self):
        calls = []
        self.assertIsNone(vnmain._os_services().printer_services)  # Windows/portable keep their existing pipeline until migrated.
        pkg = sys.modules["_vno_os_services"]

        class FakePrinterService:
            def list_installed(self):
                return pkg.ServiceResult.ok((pkg.PrinterInfo("Queue A", True, "Ready"),))

            def print_pdf(self, pdf_path, printer, copies, pages="", destination_path=None):
                calls.append((pdf_path, printer, copies, pages, destination_path))
                return pkg.ServiceResult.ok()

        from types import SimpleNamespace
        service = FakePrinterService()
        services = SimpleNamespace(printer_services=service)
        with mock.patch.object(vnmain, "_os_services", return_value=services):
            api = vnmain.VnOfficeApi.__new__(vnmain.VnOfficeApi)
            listed = api.get_installed_printers()
            printed = vnmain._print_pdf_job("writer", "/tmp/doc.pdf", "Queue A", 2, "1-2", "/tmp/result.pdf")
        self.assertEqual(listed["status"], "ok")
        self.assertEqual(listed["defaultPrinter"], "Queue A")
        self.assertTrue(printed["ok"])
        self.assertEqual(calls[0][1:4], ("Queue A", 2, "1-2"))
        self.assertEqual(calls[0][4], Path("/tmp/result.pdf"))

    def test_save_as_pdf_alias_uses_native_save_dialog_and_forwards_destination(self):
        print_calls = []

        class FakePipeline:
            def suggested_name(self, session_id):
                return "Báo cáo"

            def print_document(self, session_id, printer, copies, page_range, destination_path):
                print_calls.append((session_id, printer, copies, page_range, destination_path))
                return {"status": "ok", "printer": printer, "path": destination_path}

        api = vnmain.VnOfficeApi.__new__(vnmain.VnOfficeApi)
        api._get_print_pipeline = mock.Mock(return_value=FakePipeline())
        window = mock.Mock()
        window.create_file_dialog.return_value = "/tmp/Bao-cao.pdf"
        services = type("Services", (), {"printer_services": object()})()
        with mock.patch.object(vnmain, "_active_window", return_value=window), \
             mock.patch.object(vnmain, "_os_services", return_value=services):
            result = api._print_document_impl("session-1", {
                "printer": "Save as PDF", "copies": 1, "pageRange": "",
            })
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["path"], "/tmp/Bao-cao.pdf")
        self.assertEqual(print_calls, [("session-1", "Save as PDF", 1, "", "/tmp/Bao-cao.pdf")])
        api._get_print_pipeline.assert_has_calls([mock.call(), mock.call()])
        window.create_file_dialog.assert_called_once()

    def test_save_as_pdf_alias_does_not_change_the_legacy_fallback(self):
        calls = []

        class FakePipeline:
            def print_document(self, session_id, printer, copies, page_range, destination_path):
                calls.append((session_id, printer, copies, page_range, destination_path))
                return {"status": "ok"}

        api = vnmain.VnOfficeApi.__new__(vnmain.VnOfficeApi)
        api._get_print_pipeline = mock.Mock(return_value=FakePipeline())
        with mock.patch.object(vnmain, "_active_window", return_value=None), \
             mock.patch.object(vnmain, "_os_services", return_value=None):
            result = api._print_document_impl("session-legacy", {
                "printer": "Save as PDF", "copies": 1, "pageRange": "",
            })
        self.assertEqual(result["status"], "ok")
        self.assertEqual(calls, [("session-legacy", "Save as PDF", 1, "", None)])


if __name__ == "__main__":
    unittest.main()
