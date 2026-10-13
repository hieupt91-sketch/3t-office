# Handoff: WRITER-RIBBON-AUDIT

### Đã làm
- Rà soát tĩnh 176 lệnh ribbon Writer bằng `scripts/audit-0610/ribbon_command_audit.mjs writer` đạt 0 lệnh thiếu handler; chuẩn hóa bindHandler trong `WriterViewController`.
- Xây dựng công cụ kiểm thử tự động trên desktop app qua CDP: `tests/live/cdp/writer-ribbon-runtime-audit.desktop.mjs` và `writer-ribbon-state-probe.desktop.mjs`.
- Loại bỏ hoàn toàn nút im lặng: thêm `_hintIfFalse` cho các thao tác bảng, nhận xét, đổi chữ hoa/thường, xóa trang bìa, drop cap, đánh số lại, ngắt phần, thước đo, đường lưới, kiểm tra chính tả, cửa sổ mới; ghi backlog tính năng cửa sổ mới vào `docs/RIBBON-BACKLOG.md` và lập bảng kết quả 176 lệnh trong `docs/AUDIT-WRITER-RIBBON-COMMANDS-1310.md`.

### Kết quả kiểm thử (PASS/FAIL/NOT RUN/BLOCKED)
- PASS: `npm test` 3182/3182 tests đạt 100%; `npm run check-syntax` 160/160 files hợp lệ 0 lỗi.
- PASS: CDP runtime desktop audit 176 lệnh Writer: 117 OK, 26 chỉ thông báo lý do, 18 OK (không đổi DOM), 10 vô hiệu hóa theo ngữ cảnh, 5 bỏ qua an toàn, 0 SILENT_FALSE, 0 THREW, 0 NO_HANDLER.
- PASS: Rà soát tĩnh `scripts/audit-0610/ribbon_command_audit.mjs writer`: 176 lệnh duy nhất, 0 thiếu handler.

### File đổi
- `adapters/libreoffice/writer/writer-adapter.js`, `apps/writer/writer-app.js`, `apps/writer/writer-view-controller.js`, `docs/RIBBON-BACKLOG.md`
- `docs/AUDIT-WRITER-RIBBON-COMMANDS-1310.md`, `scripts/audit-0610/generate_writer_audit_doc.mjs`
- `tests/live/cdp/writer-ribbon-runtime-audit.desktop.mjs`, `tests/live/cdp/writer-ribbon-state-probe.desktop.mjs`, `docs/tickets-0710/HANDOFF-WR.md`
