from __future__ import annotations

import plistlib
import sys
import types
import unittest
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PLIST_PATH = ROOT / "ports" / "macos" / "Sheet-Info.plist"


def _load_main():
    """Load the shared entrypoint without requiring a GUI backend in unit tests."""
    if "webview" not in sys.modules:
        sys.modules["webview"] = types.SimpleNamespace(
            settings={}, windows=[], active_window=lambda: None,
            OPEN_DIALOG="open", SAVE_DIALOG="save",
        )
    if str(ROOT) not in sys.path:
        sys.path.insert(0, str(ROOT))
    import main
    return main


class SheetMacFileTypeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.plist = plistlib.loads(PLIST_PATH.read_bytes())

    def test_plist_registers_template_utis_without_claiming_default(self):
        declarations = {
            item["UTTypeIdentifier"]: item
            for item in self.plist["UTImportedTypeDeclarations"]
        }
        expected = {
            "org.openxmlformats.spreadsheetml.template": (
                "xltx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
            ),
            "com.microsoft.excel.xlt": ("xlt", "application/vnd.ms-excel"),
        }
        for identifier, (extension, mime_type) in expected.items():
            with self.subTest(identifier=identifier):
                tags = declarations[identifier]["UTTypeTagSpecification"]
                self.assertIn(extension, tags["public.filename-extension"])
                self.assertEqual(tags["public.mime-type"], mime_type)

        document_types = self.plist["CFBundleDocumentTypes"]
        registered = {
            uti
            for item in document_types
            for uti in item["LSItemContentTypes"]
        }
        self.assertEqual(registered, set(expected))
        self.assertTrue(all(item["CFBundleTypeRole"] == "Editor" for item in document_types))
        self.assertTrue(all(item["LSHandlerRank"] == "Alternate" for item in document_types))

    def test_shared_open_save_and_app_kind_registration_is_present(self):
        main = _load_main()
        self.assertEqual(main.FILE_APP_KINDS[".xltx"], "sheet")
        self.assertEqual(main.FILE_APP_KINDS[".xlt"], "sheet")
        self.assertIn("*.xltx", main.OPEN_FILE_TYPES["sheet"][0])
        self.assertIn("*.xlt", main.OPEN_FILE_TYPES["sheet"][0])
        self.assertIn("Mẫu bảng tính Excel (*.xltx)", main.SAVE_FILE_TYPES["sheet"])

    def test_xlsx_package_is_changed_to_template_content_type(self):
        main = _load_main()
        fixture = ROOT / "tests" / "fixtures" / "real-office-samples" / "sample-sheet.xlsx"
        if not fixture.is_file():
            self.skipTest("fixture minimal.xlsx không có trong checkout")
        from tempfile import TemporaryDirectory

        with TemporaryDirectory() as temp_dir:
            target = Path(temp_dir) / "mau.xltx"
            target.write_bytes(fixture.read_bytes())
            main._convert_xlsx_to_template(str(target))
            with zipfile.ZipFile(target) as package:
                content_types = package.read("[Content_Types].xml").decode("utf-8")
            self.assertIn("spreadsheetml.template.main+xml", content_types)
            self.assertNotIn("spreadsheetml.sheet.main+xml", content_types)


if __name__ == "__main__":
    unittest.main()
