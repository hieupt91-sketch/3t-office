"""Round-trip helper tests for PPTX core and app document properties."""
import io
import json
import unittest
import zipfile

from adapters.libreoffice.common import ooxml_zip_patch as patcher

def create_zip(entries):
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, value in entries.items():
            archive.writestr(name, value)
    return output.getvalue()


class SlidesDocumentPropertiesTests(unittest.TestCase):
    def test_property_marker_updates_requested_fields_and_preserves_other_core_values(self):
        properties = {"title": "Báo cáo", "creator": "Tác giả", "subject": "Kế hoạch",
                      "keywords": "vn,slides", "description": "Ghi chú", "contentStatus": "Final",
                      "manager": "Quản lý", "company": "Công ty"}
        encoded = json.dumps(properties, ensure_ascii=False, separators=(",", ":")).encode().hex()
        fodp = f'<?xml version="1.0"?><!--vno-document-properties-hex:{encoded}--><office:document/>'
        core = ('<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
                'xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Old</dc:title><dc:creator>Old author</dc:creator>'
                '<cp:lastModifiedBy>Keep me</cp:lastModifiedBy><cp:revision>7</cp:revision></cp:coreProperties>')
        app = '<Properties><Manager>Old manager</Manager><Company>Old company</Company><Application>LibreOffice</Application></Properties>'
        package = create_zip({"docProps/core.xml": core, "docProps/app.xml": app})
        updated = patcher._slides_document_properties_replacements(package, fodp)
        self.assertIn("Báo cáo", updated["docProps/core.xml"].decode())
        self.assertIn("Final", updated["docProps/core.xml"].decode())
        self.assertIn("Keep me", updated["docProps/core.xml"].decode())
        self.assertIn("<cp:revision>7</cp:revision>", updated["docProps/core.xml"].decode())
        self.assertIn("<Manager>Quản lý</Manager>", updated["docProps/app.xml"].decode())
        self.assertIn("<Company>Công ty</Company>", updated["docProps/app.xml"].decode())
        self.assertIn("LibreOffice", updated["docProps/app.xml"].decode())
        updated_package = patcher.patch_ooxml_zip(package, updated)
        self.assertEqual({}, patcher._slides_document_properties_replacements(updated_package, fodp))

    def test_missing_properties_marker_leaves_package_untouched(self):
        package = create_zip({"docProps/core.xml": "<cp:coreProperties/>"})
        self.assertEqual({}, patcher._slides_document_properties_replacements(package, "<office:document/>"))


if __name__ == "__main__":
    unittest.main()
