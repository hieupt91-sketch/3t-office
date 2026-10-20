from __future__ import annotations

import plistlib
import sys
import types
import unittest
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
LAUNCHER_DIR = ROOT / "ports" / "macos" / "launcher"
SHEET_PLIST_PATH = LAUNCHER_DIR / "Sheet-Info.plist"

# bundle -> (tệp plist, app kind, UTI được khai, UTI của hệ thống chỉ tham chiếu)
BUNDLES = {
    "Doc": (
        LAUNCHER_DIR / "Doc-Info.plist",
        "writer",
        {
            "org.openxmlformats.wordprocessingml.document": (
                "docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ),
            "com.microsoft.word.doc": ("doc", "application/msword"),
            "org.oasis-open.opendocument.text": (
                "odt",
                "application/vnd.oasis.opendocument.text",
            ),
        },
        {"public.rtf", "public.plain-text"},
    ),
    "Sheet": (
        SHEET_PLIST_PATH,
        "sheet",
        {
            "org.openxmlformats.spreadsheetml.sheet": (
                "xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ),
            "com.microsoft.excel.xls": ("xls", "application/vnd.ms-excel"),
            "org.oasis-open.opendocument.spreadsheet": (
                "ods",
                "application/vnd.oasis.opendocument.spreadsheet",
            ),
            "org.openxmlformats.spreadsheetml.template": (
                "xltx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
            ),
            "com.microsoft.excel.xlt": ("xlt", "application/vnd.ms-excel"),
        },
        {"public.comma-separated-values-text"},
    ),
    "Slide": (
        LAUNCHER_DIR / "Slide-Info.plist",
        "slides",
        {
            "org.openxmlformats.presentationml.presentation": (
                "pptx",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ),
            "com.microsoft.powerpoint.ppt": ("ppt", "application/vnd.ms-powerpoint"),
            "org.oasis-open.opendocument.presentation": (
                "odp",
                "application/vnd.oasis.opendocument.presentation",
            ),
        },
        set(),
    ),
}


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
        cls.plist = plistlib.loads(SHEET_PLIST_PATH.read_bytes())

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
        self.assertTrue(set(expected).issubset(registered))
        self.assertTrue(all(item["CFBundleTypeRole"] == "Editor" for item in document_types))
        self.assertTrue(all(item["LSHandlerRank"] == "Alternate" for item in document_types))

    def test_sheet_bundle_claims_template_extensions(self):
        extensions = {
            value
            for item in self.plist["CFBundleDocumentTypes"]
            for value in item["CFBundleTypeExtensions"]
        }
        self.assertIn("xltx", extensions)
        self.assertIn("xlt", extensions)

    def test_three_bundles_declare_matching_uti_and_extensions(self):
        for product, (plist_path, app_kind, expected_uti, system_uti) in BUNDLES.items():
            with self.subTest(bundle=product):
                info = plistlib.loads(plist_path.read_bytes())
                self.assertEqual(info["VNOfficeAppKind"], app_kind)
                declarations = {
                    item["UTTypeIdentifier"]: item
                    for item in info["UTImportedTypeDeclarations"]
                }
                self.assertEqual(set(declarations), set(expected_uti))
                for identifier, (extension, mime_type) in expected_uti.items():
                    tags = declarations[identifier]["UTTypeTagSpecification"]
                    self.assertIn(extension, tags["public.filename-extension"])
                    self.assertEqual(tags["public.mime-type"], mime_type)
                registered = {
                    uti
                    for item in info["CFBundleDocumentTypes"]
                    for uti in item["LSItemContentTypes"]
                }
                self.assertEqual(registered, set(expected_uti) | system_uti)
                # UTI khai báo phải nằm trong danh sách phần mở rộng của bundle.
                declared_extensions = {
                    value
                    for item in info["CFBundleDocumentTypes"]
                    for value in item["CFBundleTypeExtensions"]
                }
                for identifier, (extension, _mime) in expected_uti.items():
                    self.assertIn(extension, declared_extensions, identifier)

    def test_bundle_extensions_match_shared_file_app_kinds(self):
        """Chỉ khai loại tệp mà mã dùng chung thực sự mở được, không mở rộng format."""
        main = _load_main()
        for product, (plist_path, app_kind, _uti, _system_uti) in BUNDLES.items():
            with self.subTest(bundle=product):
                info = plistlib.loads(plist_path.read_bytes())
                extensions = {
                    value
                    for item in info["CFBundleDocumentTypes"]
                    for value in item["CFBundleTypeExtensions"]
                }
                for extension in extensions:
                    self.assertEqual(
                        main.FILE_APP_KINDS.get(f".{extension.lower()}"),
                        app_kind,
                        f"{product} khai .{extension} nhưng mã dùng chung không mở bằng {app_kind}",
                    )

    def test_shared_open_save_and_app_kind_registration_is_present(self):
        main = _load_main()
        self.assertEqual(main.FILE_APP_KINDS[".xltx"], "sheet")
        self.assertEqual(main.FILE_APP_KINDS[".xlt"], "sheet")
        self.assertIn("*.xltx", main.OPEN_FILE_TYPES["sheet"][0])
        self.assertIn("*.xlt", main.OPEN_FILE_TYPES["sheet"][0])
        self.assertIn("Mẫu bảng tính Excel (*.xltx)", main.SAVE_FILE_TYPES["sheet"])

    def test_only_one_info_plist_per_bundle_in_ports(self):
        """Không để hai nguồn sự thật cho cùng danh sách kiểu tệp."""
        stray = sorted(
            path.name
            for path in (ROOT / "ports" / "macos").glob("*Info.plist")
        )
        self.assertEqual(stray, [])

    def test_xlsx_package_is_changed_to_template_content_type(self):
        main = _load_main()
        fixture = ROOT / "tests" / "fixtures" / "real-office-samples" / "sample-sheet.xlsx"
        if not fixture.is_file():
            self.skipTest("fixture sample-sheet.xlsx không có trong checkout")
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
