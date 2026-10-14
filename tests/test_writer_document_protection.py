import io
import json
import unittest
import zipfile

from adapters.libreoffice.common.ooxml_zip_patch import (
    postprocess_writer_document_protection,
    read_zip_entry,
)


def _tiny_docx(settings: str) -> bytes:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as package:
        package.writestr("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
        package.writestr("word/document.xml", '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>')
        package.writestr("word/settings.xml", settings)
    return output.getvalue()


def _marker(payload: dict) -> str:
    encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8").hex()
    return f"<!--vno-document-protection-hex:{encoded}-->"


class WriterDocumentProtectionTests(unittest.TestCase):
    def test_writes_read_only_standard_ooxml(self):
        source = _tiny_docx('<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:compat/></w:settings>')
        patched = postprocess_writer_document_protection(source, source_html=_marker({
            "version": 1, "mode": "readOnly", "algorithm": "SHA-512", "spinCount": 1000,
            "hash": "aGFzaA==", "salt": "c2FsdA==",
        }))
        settings = read_zip_entry(patched, "word/settings.xml").decode("utf-8")
        self.assertIn('w:edit="readOnly"', settings)
        self.assertIn('w:enforcement="1"', settings)
        self.assertIn('w:cryptAlgorithmSid="14"', settings)
        self.assertIn('w:cryptSpinCount="1000"', settings)

    def test_replaces_and_removes_existing_protection(self):
        source = _tiny_docx('<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:documentProtection w:edit="readOnly" w:enforcement="1"/><w:compat/></w:settings>')
        tracked = postprocess_writer_document_protection(source, source_html=_marker({"version": 1, "mode": "trackedChanges"}))
        tracked_settings = read_zip_entry(tracked, "word/settings.xml").decode("utf-8")
        self.assertEqual(tracked_settings.count("documentProtection"), 1)
        self.assertIn('w:edit="trackedChanges"', tracked_settings)
        unprotected = postprocess_writer_document_protection(tracked, source_html=_marker({"version": 1, "mode": "none"}))
        self.assertNotIn("documentProtection", read_zip_entry(unprotected, "word/settings.xml").decode("utf-8"))

    def test_preserves_supported_imported_hash_algorithm(self):
        source = _tiny_docx('<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:compat/></w:settings>')
        patched = postprocess_writer_document_protection(source, source_html=_marker({
            "version": 1, "mode": "readOnly", "algorithm": "SHA-256", "spinCount": 0,
            "hash": "aGFzaA==", "salt": "c2FsdA==",
        }))
        settings = read_zip_entry(patched, "word/settings.xml").decode("utf-8")
        self.assertIn('w:cryptAlgorithmSid="12"', settings)
        self.assertIn('w:cryptSpinCount="0"', settings)
        self.assertIn('w:hash="aGFzaA=="', settings)


if __name__ == "__main__":
    unittest.main()
