from __future__ import annotations

import hashlib
import io
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import Mock

import main


PASSWORD = "Mật khẩu 123!"


def package_bytes() -> bytes:
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as package:
        package.writestr("[Content_Types].xml", "<Types/>")
        package.writestr("word/document.xml", "<document>secret payload marker</document>")
    return stream.getvalue()


class OoxmlEncryptionMainTests(unittest.TestCase):
    def test_unprotected_save_stage_is_byte_for_byte_untouched(self):
        raw = package_bytes()
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "plain.docx"
            path.write_bytes(raw)
            before = hashlib.sha256(path.read_bytes()).digest()
            result = main._encrypt_ooxml_output(str(path), "docx", None)
            self.assertEqual(result, str(path))
            self.assertEqual(hashlib.sha256(path.read_bytes()).digest(), before)

    def test_password_protected_save_replaces_plaintext_stage_with_cfb(self):
        raw = package_bytes()
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "plain.docx"
            path.write_bytes(raw)
            encrypted_path = Path(main._encrypt_ooxml_output(str(path), "docx", PASSWORD))
            self.assertFalse(path.exists())
            encrypted = encrypted_path.read_bytes()
            self.assertTrue(main._ooxml_encryption().is_encrypted_package(encrypted))
            self.assertEqual(main._ooxml_encryption().decrypt_package(encrypted, PASSWORD), raw)

    def test_protected_document_never_writes_autorecovery_content(self):
        api = object.__new__(main.VnOfficeApi)
        api._document_password = PASSWORD
        api._autorecover_store = Mock()
        result = api.write_autorecover_snapshot("doc", "writer", "private content")
        self.assertEqual(result, {"status": "ok", "written": False, "skipped": "password-protected"})
        api._autorecover_store.write_snapshot.assert_not_called()


if __name__ == "__main__":
    unittest.main()
