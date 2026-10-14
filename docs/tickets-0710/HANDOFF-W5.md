# Handoff: WORD-W5

### Đã làm
- Triển khai Đổi chữ hoa/thường (Change Case) với hộp thoại 5 tùy chọn chuẩn (Sentence case, lowercase, UPPERCASE, Capitalize Each Word, tOGGLE cASE), phím tắt Shift+F3 xoay vòng 3 bước chuẩn và tương thích 100% chữ có dấu tiếng Việt.
- Nâng cấp Tìm & Thay thế nâng cao hỗ trợ ký tự đặc biệt (^p, ^t, ^?, ^w, ^^, ^&), ký tự đại diện (*, ?), tìm theo định dạng (font chữ, in đậm, in nghiêng, màu sắc) và báo chính xác số lần tìm/thay thế.
- Triển khai 4 chế độ hiển thị theo dõi thay đổi (Simple Markup, All Markup, No Markup, Original), vạch đỏ lề trang tương tác chuyển đổi nhanh, và Document Inspector quét/xóa độc lập 4 nhóm (nhận xét, bản sửa đổi, chữ ẩn, thông tin cá nhân).

### Kết quả kiểm thử (PASS/FAIL/NOT RUN/BLOCKED)
- PASS: `npm test` đạt 3218/3218 bài kiểm thử (100% PASS, 0 FAIL) trên toàn bộ 261 bộ test; bao gồm test suite 259 (Change Case), 260 (Track Changes Display Modes), 261 (Document Inspector).
- PASS: Kiểm thử tự động trên ứng dụng desktop qua WebView2 CDP và Word COM (`tests/live/cdp/word-w5-case-find-inspect.desktop.mjs`): 32/32 kiểm tra PASS (100%), xác thực gõ/thao tác thật, lưu DOCX và Word COM đọc lại sạch thuộc tính cá nhân/nhận xét.
- PASS: `batch_document_audit.py docx` trên tập tài liệu chuẩn (`d01.docx`, `d03.docx`, `d06.docx`, `d07.docx`, `d13.docx`): 5/5 tài liệu PASS, 0 hồi quy số trang (d01=19/19, d03=1/1, d06=3/3, d07=23/23, d13=10/10).

### File đổi
- `apps/writer/change-case-dialog.js`, `apps/writer/document-inspector-dialog.js`, `apps/writer/writer-ribbon.js`, `apps/writer/writer.css`: Giao diện hộp thoại Đổi chữ hoa/thường, Document Inspector và thanh ribbon Đánh giá.
- `adapters/libreoffice/writer/writer-adapter.js`: Xử lý đổi chữ hoa/thường, tìm thay thế nâng cao, 4 chế độ theo dõi thay đổi, thanh lề trang, và các hàm quét/xóa độc lập dữ liệu kiểm tra tài liệu.
- `platform/commands/command-definitions.js`, `platform/help/entries-writer.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, `tests/unit/writer-document-inspector.test.js`, `tests/live/cdp/word-w5-case-find-inspect.desktop.mjs`: Khai báo lệnh, Trợ giúp tiếng Việt, đa ngôn ngữ VI/EN và bộ kiểm thử.
