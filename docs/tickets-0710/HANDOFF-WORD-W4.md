# Handoff: WORD-W4

### Đã làm
- Hoàn tất Rules trộn thư (Bỏ qua bản ghi nếu, Bản ghi kế nếu, Nếu…Thì…Khác, Điền vào), Đánh dấu mục + Chèn chỉ mục, Khối dựng sẵn lưu cục bộ và Ngắt từ tự động; reuse các commit `f4253e98`, `4da3a5b3`, `c48761f9`, không sửa Core và không merge vào `main`.
- DOCX xuất field chuẩn `SKIPIF`, `NEXTIF`, `IF`, `FILLIN`, `XE`, `INDEX` và `w:autoHyphenation`; Quick Parts hoạt động offline, lọc nội dung nguy hiểm, có trạng thái lỗi rõ và UI dùng bàn phím.
- Bổ sung nút ribbon, command/UNO adapter, i18n VI/EN, bốn bài Hướng dẫn tiếng Việt đúng tab/nhóm và bài nghiệm thu desktop CDP + COM chỉ đọc.

### Kết quả kiểm thử (PASS/FAIL/NOT RUN/BLOCKED)
- PASS: `npm test` đạt 3331/3331; `python -m unittest tests.test_writer_notes_export` đạt 34/34; `git diff --check` sạch.
- PASS: `tests/live/cdp/writer-word-w4.desktop.mjs` đạt 25/25 bằng profile riêng `E:\VNOffice-profiles\WORD-W4-codex`; DOCX có đủ field và ứng dụng đích đọc được 1 chỉ mục, 3 XE, bốn loại Rules cùng AutoHyphenation.
- PASS: audit DOCX 7/7, edit được lưu và 0 hồi quy số trang: d01 19/19, d02 11/11, d06 3/3, d07 23/23, d13 10/10, d20 3/3, d24 16/16. BUILD: NOT RUN — ticket không yêu cầu đóng gói.

### File đổi
- `apps/writer/writer-w4.js`, `apps/writer/mail-merge-data.js`, `apps/writer/writer-ribbon.js`, `apps/writer/writer.css`: hộp thoại/trạng thái và hành vi bốn nhóm tính năng W4.
- `adapters/libreoffice/writer/writer-adapter.js`, `adapters/libreoffice/common/ooxml_zip_patch.py`, `adapters/libreoffice/common/command-dispatch-mapper.js`, `platform/commands/command-definitions.js`, `platform/help/entries-writer.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`: command/adapter, DOCX field thật, Help và song ngữ.
- `tests/unit/writer-w4.test.js`, `tests/test_writer_notes_export.py`, `tests/live/cdp/writer-word-w4.desktop.mjs`, `tests/run-tests.js`, `docs/tickets-0710/HANDOFF-WORD-W4.md`: unit, regression, nghiệm thu desktop và handoff.
