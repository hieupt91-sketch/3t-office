import plistlib
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
IOS = ROOT / "ports" / "ios"


class IOSNativeFilesContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.controller = (IOS / "launcher" / "MobileOfficeViewController.swift").read_text()
        cls.service = (IOS / "launcher" / "NativeDocumentService.swift").read_text()
        cls.plist = plistlib.loads((IOS / "launcher" / "Info.plist").read_bytes())

    def test_bridge_advertises_picker_but_not_ooxml_or_office_engine(self):
        self.assertIn("documentPicker: true", self.controller)
        self.assertIn("localFlatDocuments: true", self.controller)
        self.assertIn("officeEngine: false", self.controller)
        self.assertIn("ooxmlRoundTrip: false", self.controller)
        self.assertNotIn("ooxmlRoundTrip: true", self.controller)

    def test_native_service_uses_security_scope_and_file_coordination(self):
        self.assertIn("startAccessingSecurityScopedResource", self.service)
        self.assertIn("stopAccessingSecurityScopedResource", self.service)
        self.assertGreaterEqual(self.service.count("NSFileCoordinator()"), 2)
        self.assertIn("options: [.atomic]", self.service)

    def test_only_flat_offline_formats_are_mapped(self):
        self.assertIn('case "writer": return ("html",', self.service)
        self.assertIn('case "sheet": return ("fods",', self.service)
        self.assertIn('case "slides": return ("fodp",', self.service)
        for unsupported in ("docx", "xlsx", "pptx"):
            self.assertNotIn(f'return ("{unsupported}"', self.service)
        self.assertIn("DOCX/XLSX/PPTX chưa được hỗ trợ", self.service)

    def test_payload_limits_and_active_html_are_rejected(self):
        self.assertIn("24 * 1024 * 1024", self.service)
        for blocked in ("<script", "<iframe", "<object", "javascript:"):
            self.assertIn(blocked, self.service)

    def test_document_types_and_open_in_place_are_declared(self):
        self.assertTrue(self.plist["LSSupportsOpeningDocumentsInPlace"])
        identifiers = {
            identifier
            for declaration in self.plist["UTImportedTypeDeclarations"]
            for identifier in [declaration["UTTypeIdentifier"]]
        }
        self.assertEqual({"vn.office.fods", "vn.office.fodp"}, identifiers)

    def test_vietnamese_in_app_help_is_specific(self):
        for text in (
            "Mở và lưu tệp offline", "Tệp → Mở", "Tệp → Lưu bản sao",
            "Doc hỗ trợ HTML", "Sheet hỗ trợ FODS", "Slide hỗ trợ FODP",
        ):
            self.assertIn(text, self.controller)

    def test_no_server_cloud_or_external_dependency_in_ios_launcher(self):
        combined = self.controller + self.service
        for forbidden in ("http://", "https://", "URLSession", "Node", "LibreOffice"):
            self.assertNotIn(forbidden, combined)


if __name__ == "__main__":
    unittest.main()
