"""Shared LibreOffice adapter tests for ECMA-376 Agile encryption."""
import io
import os
import zipfile

import unittest

from adapters.libreoffice.common import ooxml_encryption as encryption

PASSWORD = "Mật khẩu 123!"
FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures", "encrypted")


def make_package() -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_STORED) as package:
        package.writestr("[Content_Types].xml", "<Types/>")
        package.writestr("word/document.xml", "<document>round trip</document>")
    return buffer.getvalue()


class OoxmlEncryptionAdapterTests(unittest.TestCase):
    def test_agile_round_trip_and_wrong_password(self):
        package = make_package()
        encrypted = encryption.encrypt_package(package, PASSWORD, spin_count=1000)
        self.assertTrue(encryption.is_encrypted_package(encrypted))
        self.assertEqual(encryption.decrypt_package(encrypted, PASSWORD), package)
        with self.assertRaises(encryption.WrongPasswordError):
            encryption.decrypt_package(encrypted, PASSWORD + " sai")

    def test_malformed_container_is_rejected(self):
        with self.assertRaises(encryption.OfficeEncryptionError):
            encryption.decrypt_package(encryption.CFB_SIGNATURE + b"\0" * 128, PASSWORD)

    def test_real_office_agile_fixtures_decrypt(self):
        expected_parts = {
            "office-made.docx": "word/document.xml",
            "office-made.xlsx": "xl/workbook.xml",
            "office-made.pptx": "ppt/presentation.xml",
        }
        for filename, member in expected_parts.items():
            with self.subTest(filename=filename):
                with open(os.path.join(FIXTURES, filename), "rb") as handle:
                    raw = handle.read()
                self.assertTrue(encryption.is_encrypted_package(raw))
                decoded = encryption.decrypt_package(raw, PASSWORD)
                with zipfile.ZipFile(io.BytesIO(decoded)) as package:
                    self.assertIn(member, package.namelist())
                with self.assertRaises(encryption.WrongPasswordError):
                    encryption.decrypt_package(raw, PASSWORD + " sai")


if __name__ == "__main__":
    unittest.main()
