"""Mã hóa / giải mã tệp Office bằng mật khẩu mở tệp (platform/security/office_encryption.py)."""
import importlib.util
import io
import os
import sys
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("office_encryption_under_test", ROOT / "platform" / "security" / "office_encryption.py")
oe = importlib.util.module_from_spec(spec)
sys.modules["office_encryption_under_test"] = oe
spec.loader.exec_module(oe)

PASSWORD = "M\u1eadt kh\u1ea9u 123!"
FIXTURES = ROOT / "tests" / "fixtures" / "encrypted"


def make_zip(payload: bytes = b"hello", name: str = "xl/workbook.xml") -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_STORED) as package:
        package.writestr("[Content_Types].xml", "<Types/>")
        package.writestr(name, payload)
    return buffer.getvalue()


class OfficeEncryptionTests(unittest.TestCase):
    def test_roundtrip_small_package(self):
        raw = make_zip()
        encrypted = oe.encrypt_package(raw, PASSWORD, spin_count=1000)
        self.assertTrue(oe.is_encrypted_package(encrypted))
        self.assertFalse(oe.is_encrypted_package(raw))
        self.assertEqual(oe.decrypt_package(encrypted, PASSWORD), raw)

    def test_each_encryption_is_different_but_decrypts_to_same_data(self):
        raw = make_zip()
        a = oe.encrypt_package(raw, PASSWORD, spin_count=1000)
        b = oe.encrypt_package(raw, PASSWORD, spin_count=1000)
        self.assertNotEqual(a, b, "muối ngẫu nhiên phải khác nhau")
        self.assertEqual(oe.decrypt_package(a, PASSWORD), oe.decrypt_package(b, PASSWORD))

    def test_wrong_password_raises_wrong_password_error(self):
        encrypted = oe.encrypt_package(make_zip(), PASSWORD, spin_count=1000)
        for wrong in (PASSWORD + "x", PASSWORD.lower(), "", " " + PASSWORD):
            with self.assertRaises(oe.WrongPasswordError):
                oe.decrypt_package(encrypted, wrong)

    def test_empty_password_and_non_zip_are_rejected_when_encrypting(self):
        with self.assertRaises(oe.OfficeEncryptionError):
            oe.encrypt_package(make_zip(), "")
        with self.assertRaises(oe.OfficeEncryptionError):
            oe.encrypt_package(b"not a zip package", PASSWORD)

    def test_tampering_is_detected_by_integrity_check(self):
        encrypted = bytearray(oe.encrypt_package(make_zip(os.urandom(20000)), PASSWORD, spin_count=1000))
        encrypted[4096 + 100] ^= 0xFF  # lật một bit trong vùng dữ liệu EncryptedPackage (các sector dữ liệu nằm trước FAT)
        with self.assertRaises(oe.OfficeEncryptionError):
            oe.decrypt_package(bytes(encrypted), PASSWORD)

    def test_not_encrypted_or_garbage_input(self):
        with self.assertRaises(oe.OfficeEncryptionError):
            oe.decrypt_package(make_zip(), PASSWORD)  # zip thường, không có vỏ CFB
        with self.assertRaises(oe.OfficeEncryptionError):
            oe.decrypt_package(oe.CFB_SIGNATURE + b"\x00" * 100, PASSWORD)

    def test_large_package_needs_difat_and_roundtrips(self):
        raw = make_zip(os.urandom(9 * 1024 * 1024))  # > 7 MB: vượt 109 sector FAT trong tiêu đề, cần DIFAT
        encrypted = oe.encrypt_package(raw, PASSWORD, spin_count=1000)
        self.assertEqual(oe.decrypt_package(encrypted, PASSWORD), raw)

    def test_files_made_by_real_office_decrypt(self):
        # Excel / Word / PowerPoint 2016 thật mã hóa (Agile 4.4): phải giải mã và có phần chính của gói.
        for name, member in (("office-made.xlsx", "xl/workbook.xml"), ("office-made.docx", "word/document.xml"), ("office-made.pptx", "ppt/presentation.xml")):
            raw = (FIXTURES / name).read_bytes()
            self.assertTrue(oe.is_encrypted_package(raw), name)
            package = zipfile.ZipFile(io.BytesIO(oe.decrypt_package(raw, PASSWORD)))
            self.assertIn(member, package.namelist(), name)
            with self.assertRaises(oe.WrongPasswordError):
                oe.decrypt_package(raw, PASSWORD + "sai")


if __name__ == "__main__":
    unittest.main()