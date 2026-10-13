# Handoff: WORD-W2

### Đã làm
- Triển khai chế độ xem Dàn bài (Outline view) với thanh công cụ dàn bài chuyên dụng (nâng/hạ cấp, mở rộng/thu gọn, di chuyển đoạn, lọc cấp hiển thị) và chế độ Bản nháp (Draft view) lược bỏ viền/bố cục trang trong VN Writer.
- Triển khai tính năng thu gọn/mở rộng nội dung dưới tiêu đề (Collapsible Headings) trong Bố cục in; bảo toàn 100% nội dung đoạn văn khi lưu DOCX, gỡ bỏ nút giao diện tương tác và ghi đúng cờ `<w15:collapsed/>` cùng `<w:outlineLvl>`.
- Bổ sung định nghĩa lệnh, phím tắt chuẩn (Alt+Shift++, Alt+Shift+-, Alt+Shift+Left/Right), icon SVG, i18n VI/EN và tài liệu Trợ giúp tiếng Việt thật trong ứng dụng (không chứa tên thương hiệu thương mại).

### Kết quả kiểm thử (PASS/FAIL/NOT RUN/BLOCKED)
- PASS: `npm test` đạt 3195/3195 bài kiểm thử (100%); `node scripts/check-syntax.js` đạt 163/163 tệp cú pháp chuẩn; audit lệnh ribbon `node scripts/audit-0610/ribbon_command_audit.mjs writer` đạt 186/186 lệnh (0 thiếu handler).
- PASS: Kiểm thử tự động trên desktop app qua CDP và Microsoft Word COM (`tests/live/cdp/word-w2-outline-draft.desktop.mjs`): 20/20 bước PASS, xác nhận Word đọc đủ 6/6 đoạn (100% không mất nội dung), H1 OutlineLevel=1, H2 OutlineLevel=2, body OutlineLevel=10, nhận diện `w15:collapsed` và `w:view`.
- PASS: Kiểm thử tích hợp Python OOXML patch (`tests/test_writer_outline_draft_docx.py`): 5/5 test PASS, xác thực xử lý OpenXML với cấu trúc `w:pPr`, namespace `w15:`, thuộc tính `w:outlineLvl` và chế độ xem trong `word/settings.xml`.

### File đổi
- `apps/writer/writer-view-controller.js`, `apps/writer/writer-ribbon.js`, `apps/writer/writer-app.js`, `apps/writer/writer.css`: Điều khiển hiển thị Dàn bài, Bản nháp, thanh công cụ dàn bài và Ẩn/Hiện chi tiết tiêu đề.
- `adapters/libreoffice/writer/writer-adapter.js`, `adapters/libreoffice/common/ooxml_zip_patch.py`, `adapters/libreoffice/common/command-dispatch-mapper.js`: Giữ nguyên nội dung bị thu gọn khi xuất tài liệu, ánh xạ lệnh UNO và cập nhật OpenXML.
- `platform/commands/command-definitions.js`, `platform/help/entries-writer.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, `platform/ui-kit/icons.js`, `tests/unit/writer-view-outline-draft.test.js`, `tests/test_writer_outline_draft_docx.py`, `tests/live/cdp/word-w2-outline-draft.desktop.mjs`, `tests/run-tests.js`: Định nghĩa lệnh, trợ giúp, kiểm thử unit và nghiệm thu COM.
