# Handoff: WORD-W6

### Đã làm
- Triển khai hộp thoại Chuyển văn bản thành bảng (phân tách tab/phẩy/chấm phẩy/tùy chọn, tự động tính số cột), Chuyển bảng thành văn bản và chèn Bảng dựng sẵn (Quick Tables: Lịch tháng, Danh sách, Ma trận SWOT) kèm nút Ribbon và gợi ý khi không thao tác được.
- Xây dựng Công cụ Ảnh (Picture Tools) gồm Cắt ảnh (Crop) theo 4 cạnh kèm CSS clip-path, Chỉnh Độ sáng/Tương phản kèm CSS filter, Đổi ảnh khác, Đặt lại ảnh, Nén ảnh; xuất DOCX bảo toàn thẻ DrawingML chuẩn (<a:srcRect>, <a:lum>).
- Phát triển Hiệu ứng chữ cơ bản (Text Effects) gồm Viền chữ (Outline), Đổ bóng (Shadow), Phát sáng (Glow), xuất DOCX chuẩn WordML 2010 (<w14:textOutline>, <w14:shadow>, <w14:glow>), khôi phục từ DOCX vào DOM, bổ sung đầy đủ Trợ giúp tiếng Việt và chuỗi i18n VI/EN.

### Kết quả kiểm thử (PASS/FAIL/NOT RUN/BLOCKED)
- PASS: `npm test` đạt 3240/3240 bài kiểm thử (100% PASS, 0 FAIL); bao gồm bộ test văn bản/bảng, bộ test Picture Tools (`tests/unit/writer-picture-tools.test.js`, `test_writer_picture_tools.py`) và bộ test Text Effects (`tests/unit/writer-text-effects.test.js`, `test_writer_text_effects.py`).
- PASS: Kiểm thử desktop WebView2 CDP và Microsoft Word COM thật (`tests/live/cdp/word-w6-acceptance.desktop.mjs`): 32/32 kiểm tra PASS (100%), thao tác UI và phím thật, lưu DOCX và Word COM đọc đủ 2 bảng (4x3 và 7x7), ảnh DrawingML, hiệu ứng WordML 2010 qua WordOpenXML.
- PASS: `batch_document_audit.py docx` trên tập tài liệu chuẩn (`d01.docx`, `d03.docx`, `d06.docx`, `d07.docx`, `d13.docx`): 5/5 tài liệu PASS, 0 hồi quy số trang (d01=19/19, d03=1/1, d06=3/3, d07=23/23, d13=10/10).

### File đổi
- `apps/writer/text-to-table-dialog.js`, `apps/writer/picture-tools-dialog.js`, `apps/writer/text-effects-dialog.js`, `apps/writer/writer-ribbon.js`, `apps/writer/writer-arrange.js`: Giao diện và hộp thoại Chuyển văn bản - bảng, Quick Tables, Công cụ ảnh và Hiệu ứng chữ.
- `adapters/libreoffice/writer/writer-adapter.js`, `adapters/libreoffice/common/ooxml_zip_patch.py`, `main.py`: Tích hợp logic xử lý DOM, xuất/nhập OOXML DrawingML (<a:srcRect>, <a:lum>) và WordML 2010 (<w14:textOutline>, <w14:shadow>, <w14:glow>).
- `platform/commands/command-definitions.js`, `platform/ui-kit/icons.js`, `platform/help/entries-writer.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, `tests/**`: Khai báo lệnh, biểu tượng SVG, bài viết Trợ giúp tiếng Việt, chuỗi i18n VI/EN và các bộ kiểm thử unit/CDP.
