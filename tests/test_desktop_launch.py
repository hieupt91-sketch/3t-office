"""Unit tests for the desktop launch contract; no GUI or SendKeys required."""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import main


class DesktopLaunchTests(unittest.TestCase):
    def test_app_shortcut_builds_single_app_url(self):
        app_kind, initial_file = main.parse_launch_args(["--app=sheet"])
        self.assertEqual((app_kind, initial_file), ("sheet", None))
        self.assertEqual(
            main.build_launch_url(app_kind, initial_file),
            "http://localhost:8080/?app=sheet&singleApp=1",
        )

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

    def test_initial_file_is_consumed_once_through_existing_open_api(self):
        api = main.VnOfficeApi("sheet", r"C:\Tai lieu\Bao cao.xlsx")
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
        with patch.object(main, "_start_static_server", side_effect=RuntimeError(
            "Không tìm thấy cổng trống trong khoảng 8080–8099"
        )), patch("ctypes.windll.user32.MessageBoxW"):
            exit_code = main.main(["--app=writer"])

        self.assertEqual(exit_code, 3)


if __name__ == "__main__":
    unittest.main()
