"""Unit tests for the desktop launch contract; no GUI or SendKeys required."""

import tempfile
import unittest
import zipfile
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from unittest.mock import MagicMock, patch

import main


class DesktopLaunchTests(unittest.TestCase):
    def test_app_shortcut_builds_single_app_url(self):
        app_kind, initial_file = main.parse_launch_args(["--app=sheet"])
        self.assertEqual((app_kind, initial_file), ("sheet", None))
        with patch.object(main, "_system_number_separators", return_value=(",", ".")):
            launch_url = main.build_launch_url(app_kind, initial_file)
        query = parse_qs(urlsplit(launch_url).query)
        self.assertEqual(urlsplit(launch_url).netloc, "localhost:8080")
        self.assertEqual(query["app"], ["sheet"])
        self.assertEqual(query["singleApp"], ["1"])
        self.assertEqual(query["numberDecimal"], [","])
        self.assertEqual(query["numberThousands"], ["."])

    def test_file_path_infers_app_and_requests_initial_open(self):
        app_kind, initial_file = main.parse_launch_args([r"C:\Tai lieu\Bao cao.pptx"])
        self.assertEqual(app_kind, "slides")
        self.assertTrue(initial_file.lower().endswith("bao cao.pptx"))
        self.assertEqual(
            main.build_launch_url(app_kind, initial_file),
            "http://localhost:8080/?app=slides&singleApp=1&openFile=1",
        )

    def test_profiles_are_isolated_by_app_and_shared_fallback(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            with patch.object(main, "_user_data_dir", return_value=Path(temp_dir)):
                uris = {kind: main._profile_uri(kind) for kind in (*main.VALID_APP_KINDS, None)}
        self.assertEqual(len(set(uris.values())), 4)
        self.assertIn("lo-profile-writer", uris["writer"])
        self.assertIn("lo-profile-shared", uris[None])

    def test_taskbar_relaunch_labels_are_short_and_keep_app_window_titles(self):
        expected = {
            "writer": ("VNOffice.Writer", "Doc", "Doc"),
            "sheet": ("VNOffice.Sheet", "Sheet", "Sheet"),
            "slides": ("VNOffice.Slides", "Slide", "Slide"),
        }
        for app_kind, (app_user_model_id, display_name, title_prefix) in expected.items():
            with self.subTest(app_kind=app_kind):
                info = main._taskbar_relaunch_info(app_kind)
                self.assertIsNotNone(info)
                self.assertEqual(info["app_user_model_id"], app_user_model_id)
                self.assertEqual(info["display_name"], display_name)
                self.assertIn(f"--app={app_kind}", info["command"])
                self.assertEqual(title_prefix, main.APP_TITLES[app_kind])
        self.assertIsNone(main._taskbar_relaunch_info("suite"))

    def test_each_window_api_owns_document_state_and_shares_process_services(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            reporter = object()
            updater = object()
            with patch.object(main, "_user_data_dir", return_value=Path(temp_dir)), \
                 patch.object(main, "_ERROR_REPORTER", reporter), \
                 patch.object(main, "_UPDATE_MANAGER", updater):
                first = main.VnOfficeApi("writer", r"C:\Docs\first.docx", 8123)
                second = main.VnOfficeApi("writer", r"C:\Docs\second.docx", 8123)

        first._current_file_path = r"C:\Docs\first-saved.docx"
        second._current_file_path = r"C:\Docs\second-saved.docx"
        first._sheet_open_sessions["first"] = {"source": "first"}
        self.assertNotEqual(first._autorecover_store.session_id, second._autorecover_store.session_id)
        self.assertNotEqual(first._current_file_path, second._current_file_path)
        self.assertEqual(second._sheet_open_sessions, {})
        self.assertIs(first._reporter, reporter)
        self.assertIs(second._reporter, reporter)
        self.assertIs(first._updater, updater)
        self.assertIs(second._updater, updater)

    def test_initial_file_is_consumed_once_through_existing_open_api(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source_path = Path(temp_dir) / "Bao cao.xlsx"
            with zipfile.ZipFile(source_path, "w") as package:
                package.writestr("[Content_Types].xml", "<Types/>")
                package.writestr(
                    "_rels/.rels",
                    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                    '<Relationship Id="rId1" Target="xl/workbook.xml" Type="http://schemas.openxmlformats.org/'
                    'officeDocument/2006/relationships/officeDocument"/></Relationships>',
                )
                package.writestr(
                    "xl/workbook.xml",
                    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>',
                )
            api = main.VnOfficeApi("sheet", str(source_path))
            converted = {"calls": 0}

            def fake_convert(src_path, target_ext, out_dir, app_kind=None):
                converted["calls"] += 1
                self.assertTrue(src_path.endswith("Bao cao.xlsx"))
                self.assertEqual((target_ext, app_kind), ("fods", "sheet"))
                output = Path(out_dir) / "Bao cao.fods"
                output.write_text("<office:document/>", encoding="utf-8")
                return str(output)

            with patch.object(main, "_run_soffice_convert", side_effect=fake_convert):
                result = api.open_document_dialog("sheet")

            self.assertEqual(result["status"], "ok")
            self.assertEqual(converted["calls"], 1)
            self.assertIsNone(api._initial_file)

    def test_main_returns_exit_code_when_no_port_available(self):
        launcher = main._os_services().launcher
        instance_server = MagicMock()
        with patch.object(main, "_start_static_server", side_effect=RuntimeError(
            "Không tìm thấy cổng trống trong khoảng 8080–8099"
        )), patch.object(main, "SingleInstanceServer", return_value=instance_server), \
             patch.object(launcher, "show_error") as show_error:
            exit_code = main.main(["--app=writer"])

        self.assertEqual(exit_code, 3)
        show_error.assert_called_once()
        instance_server.stop.assert_called_once()


if __name__ == "__main__":
    unittest.main()
