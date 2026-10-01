"""Open error classification is local, Vietnamese, and preserves the current document."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from adapters.libreoffice.common.document_open_errors import open_failure_message


class DocumentOpenErrorTests(unittest.TestCase):
    def test_corrupt_package_has_clear_message(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "bad.xlsx"
            source.write_bytes(b"not a zip package")
            message = open_failure_message(source, "BadZipFile", document_label="Sổ làm việc")
        self.assertIn("bị hỏng", message)
        self.assertIn("Sổ làm việc đang mở được giữ nguyên", message)

    def test_password_protected_ooxml_is_distinguished(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "secured.pptx"
            source.write_bytes(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"EncryptedPackage" + b"\x00" * 16)
            message = open_failure_message(source, "", document_label="Bản trình chiếu")
        self.assertIn("mật khẩu", message)
        self.assertIn("Bản trình chiếu đang mở được giữ nguyên", message)

    def test_office_owner_file_is_reported_as_locked(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "shared.docx"
            source.write_bytes(b"placeholder")
            source.with_name("~$" + source.name).write_bytes(b"")
            message = open_failure_message(source, "")
        self.assertIn("bị khóa", message)
        self.assertIn("Tài liệu đang mở được giữ nguyên", message)


if __name__ == "__main__":
    unittest.main()
