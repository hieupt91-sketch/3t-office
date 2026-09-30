"""Malformed ZIP-based Office packages must fail before replacing an open document."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import main


class OfficePackageValidationTests(unittest.TestCase):
    def test_malformed_ooxml_is_rejected_before_libreoffice_conversion(self):
        for app, extension in (
            ("writer", ".docx"),
            ("sheet", ".xlsx"),
            ("slides", ".pptx"),
        ):
            with self.subTest(app=app), tempfile.TemporaryDirectory() as temp_dir:
                source = Path(temp_dir) / f"invalid{extension}"
                source.write_bytes(b"not a valid Office package")
                api = main.VnOfficeApi(app_kind=app, initial_file=str(source))

                with patch.object(main, "_run_soffice_convert") as convert:
                    result = api.open_document_dialog(app)

                convert.assert_not_called()
                self.assertEqual(result.get("status"), "error", result)
                self.assertIn("bị hỏng", result.get("message", ""))
                self.assertIn("giữ nguyên", result.get("message", ""))

    def test_ooxml_missing_required_document_part_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "missing-document-part.docx"
            import zipfile

            with zipfile.ZipFile(source, "w") as package:
                package.writestr("[Content_Types].xml", "<Types/>")
            api = main.VnOfficeApi(app_kind="writer", initial_file=str(source))

            with patch.object(main, "_run_soffice_convert") as convert:
                result = api.open_document_dialog("writer")

            convert.assert_not_called()
            self.assertEqual(result.get("status"), "error", result)
            self.assertIn("bị hỏng", result.get("message", ""))


if __name__ == "__main__":
    unittest.main()
