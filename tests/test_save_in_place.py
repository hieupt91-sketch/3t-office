"""
Unit tests for VN Office Save In Place and legacy .doc/.xls formatting.
Tuân thủ AGENTS.md và TASK-BRIEF-SAVE-IN-PLACE-AGY.md.
"""

import os
import stat
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import main
from main import (
    FORMAT_FILTERS,
    DEFAULT_SAVE_FORMAT,
    SAVE_FILE_TYPES,
    DocumentEngineError,
    _infer_save_format_from_path,
    _atomic_replace_file,
    _convert_writer_html_to_doc,
    VnOfficeApi,
)


class TestSaveInPlace(unittest.TestCase):
    def test_legacy_doc_export_uses_postprocessed_docx_as_intermediate(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            source_doc = os.path.join(tmp_dir, "source.doc")
            html = os.path.join(tmp_dir, "draft.html")
            Path(source_doc).write_bytes(b"legacy source")
            Path(html).write_text("<p>Edited ZZ</p>", encoding="utf-8")
            docx = os.path.join(tmp_dir, "draft.docx")
            normalized_source = os.path.join(tmp_dir, "legacy_source", "source.docx")
            saved_doc = os.path.join(tmp_dir, "draft.doc")
            with patch("main._run_soffice_convert", side_effect=[docx, normalized_source, saved_doc]) as convert, \
                    patch("main._apply_native_export_postprocess") as postprocess:
                result = _convert_writer_html_to_doc(html, tmp_dir, source_path=source_doc)

            self.assertEqual(result, saved_doc)
            self.assertEqual(
                [call.args[:2] for call in convert.call_args_list],
                [(html, "docx"), (source_doc, "docx"), (docx, "doc")],
            )
            postprocess.assert_called_once_with(
                html, docx, "writer", "docx", source_path=normalized_source,
            )

    def test_extension_to_filter_mapping(self):
        """Map phần mở rộng sang filter LibreOffice tương ứng chuẩn xác."""
        # Writer
        self.assertEqual(FORMAT_FILTERS.get("docx"), "MS Word 2007 XML")
        self.assertEqual(FORMAT_FILTERS.get("doc"), "MS Word 97")
        self.assertEqual(FORMAT_FILTERS.get("rtf"), "Rich Text Format")
        self.assertEqual(FORMAT_FILTERS.get("odt"), "writer8")

        # Sheet
        self.assertEqual(FORMAT_FILTERS.get("xlsx"), "Calc MS Excel 2007 XML")
        self.assertEqual(FORMAT_FILTERS.get("xls"), "MS Excel 97")
        self.assertEqual(FORMAT_FILTERS.get("ods"), "calc8")
        self.assertEqual(FORMAT_FILTERS.get("csv"), "Text - txt - csv (StarCalc)")

        # Slides
        self.assertEqual(FORMAT_FILTERS.get("pptx"), "Impress MS PowerPoint 2007 XML")
        self.assertEqual(FORMAT_FILTERS.get("odp"), "impress8")

    def test_infer_save_format_from_path(self):
        """Suy luận định dạng và chuẩn hóa đường dẫn tệp đích."""
        # Khi có phần mở rộng
        p, fmt = _infer_save_format_from_path(r"C:\docs\van_ban.doc", "writer")
        self.assertEqual(p, r"C:\docs\van_ban.doc")
        self.assertEqual(fmt, "doc")

        p, fmt = _infer_save_format_from_path(r"C:\docs\van_ban.docx", "writer")
        self.assertEqual(fmt, "docx")

        p, fmt = _infer_save_format_from_path(r"C:\docs\van_ban.rtf", "writer")
        self.assertEqual(fmt, "rtf")

        p, fmt = _infer_save_format_from_path(r"C:\sheets\so_lieu.xls", "sheet")
        self.assertEqual(fmt, "xls")

        p, fmt = _infer_save_format_from_path(r"C:\sheets\so_lieu.xlsx", "sheet")
        self.assertEqual(fmt, "xlsx")

        # Khi không có phần mở rộng -> tự động thêm extension mặc định
        p, fmt = _infer_save_format_from_path(r"C:\docs\van_ban_moi", "writer")
        self.assertEqual(p, r"C:\docs\van_ban_moi.docx")
        self.assertEqual(fmt, "docx")

        p, fmt = _infer_save_format_from_path(r"C:\sheets\bang_moi", "sheet")
        self.assertEqual(p, r"C:\sheets\bang_moi.xlsx")
        self.assertEqual(fmt, "xlsx")

    def test_atomic_replace_success(self):
        """Thay thế nguyên tử tệp đích thành công và an toàn."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            dest_file = os.path.join(tmp_dir, "document.docx")
            with open(dest_file, "w", encoding="utf-8") as f:
                f.write("Nội dung ban đầu của tệp")

            staging_file = os.path.join(tmp_dir, "draft_out.docx")
            with open(staging_file, "w", encoding="utf-8") as f:
                f.write("Nội dung mới đã sửa")

            _atomic_replace_file(staging_file, dest_file)

            with open(dest_file, "r", encoding="utf-8") as f:
                content = f.read()
            self.assertEqual(content, "Nội dung mới đã sửa")

    def test_atomic_replace_read_only_protection(self):
        """Tệp đích chỉ đọc (read-only) được phát hiện sớm, báo lỗi rõ ràng và không bị hỏng."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            dest_file = os.path.join(tmp_dir, "readonly_doc.docx")
            initial_content = "Tài liệu mật chỉ đọc"
            with open(dest_file, "w", encoding="utf-8") as f:
                f.write(initial_content)

            # Đặt quyền chỉ đọc
            os.chmod(dest_file, stat.S_IREAD)
            try:
                staging_file = os.path.join(tmp_dir, "new_draft.docx")
                with open(staging_file, "w", encoding="utf-8") as f:
                    f.write("Cố gắng ghi đè trái phép")

                with self.assertRaises(DocumentEngineError) as ctx:
                    _atomic_replace_file(staging_file, dest_file)

                # Thông báo lỗi tiếng Việt thân thiện, gợi ý Lưu bản sao
                err_msg = str(ctx.exception)
                self.assertTrue("chỉ đọc" in err_msg or "Lưu bản sao" in err_msg)

                # Tệp gốc không bị thay đổi
                with open(dest_file, "r", encoding="utf-8") as f:
                    self.assertEqual(f.read(), initial_content)
            finally:
                # Khôi phục quyền ghi để dọn dẹp thư mục tạm
                os.chmod(dest_file, stat.S_IWRITE)

    def test_convert_error_preserves_original_file(self):
        """Lỗi trong quá trình chuyển đổi LibreOffice giữ nguyên vẹn 100% tệp gốc."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            target_path = os.path.join(tmp_dir, "original_important.doc")
            original_bytes = b"\xD0\xCF\x11\xE0\x00\x01\x02\x03"
            with open(target_path, "wb") as f:
                f.write(original_bytes)

            api = VnOfficeApi(app_kind="writer")

            # Giả lập _run_soffice_convert gặp lỗi
            with patch("main._run_soffice_convert", side_effect=DocumentEngineError("Lỗi engine soffice")):
                res = api.save_document_in_place(
                    "<p>Nội dung mới</p>",
                    app_kind="writer",
                    target_path=target_path,
                )
                self.assertEqual(res["status"], "error")
                self.assertIn("Lỗi engine soffice", res["message"])

            # Xác nhận tệp gốc vẫn giữ nguyên bytes ban đầu
            with open(target_path, "rb") as f:
                self.assertEqual(f.read(), original_bytes)


if __name__ == "__main__":
    unittest.main()
