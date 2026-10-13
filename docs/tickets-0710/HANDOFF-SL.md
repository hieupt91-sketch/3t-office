# Handoff: SLIDES-RIBBON-AUDIT

### Đã làm
- Rà soát tĩnh 111 lệnh ribbon Slides bằng `scripts/audit-0610/ribbon_command_audit.mjs slides` đạt 0 lệnh thiếu handler; bổ sung ánh xạ UNO `slides.layout.reset` sang `.uno:RestoreDefaultLayout`.
- Xây dựng công cụ kiểm thử tự động trên desktop app qua CDP: `tests/live/cdp/slides-ribbon-runtime-audit.desktop.mjs` và `slides-ribbon-state-probe.desktop.mjs`.
- Loại bỏ hoàn toàn nút im lặng (0 SILENT_FALSE): thêm `_hintIfFalse` với thông báo tiếng Việt cho sắp xếp/căn lề/phân phối hình, nhóm/bỏ nhóm, căn lề dọc/hướng chữ, xóa slide, phần, nhận xét, cửa sổ mới; chuẩn hóa toggle trả về và cập nhật status bar; ghi backlog `slides.view.newWindow` vào `docs/RIBBON-BACKLOG.md` và lập bảng 111 lệnh trong `docs/AUDIT-SLIDES-RIBBON-COMMANDS-1310.md`.

### Kết quả kiểm thử (PASS/FAIL/NOT RUN/BLOCKED)
- PASS: `npm test` 3190/3190 tests đạt 100%; `npm run check-syntax` 163/163 files hợp lệ 0 lỗi.
- PASS: CDP runtime desktop audit 111 lệnh Slides: 64 OK, 21 chỉ thông báo lý do, 15 OK (không đổi DOM), 8 vô hiệu hóa theo ngữ cảnh, 3 bỏ qua an toàn, 0 SILENT_FALSE, 0 THREW, 0 NO_HANDLER.
- PASS: Rà soát tĩnh `scripts/audit-0610/ribbon_command_audit.mjs slides`: 111 lệnh duy nhất, 0 thiếu handler; CDP state probe 10/10 lệnh passed.

### File đổi
- `adapters/libreoffice/common/command-dispatch-mapper.js`, `adapters/libreoffice/slides/slides-adapter.js`, `apps/slides/slides-app.js`, `apps/slides/slides-canvas.js`, `docs/RIBBON-BACKLOG.md`
- `docs/AUDIT-SLIDES-RIBBON-COMMANDS-1310.md`, `scripts/audit-0610/generate_slides_audit_doc.mjs`
- `tests/live/cdp/slides-ribbon-runtime-audit.desktop.mjs`, `tests/live/cdp/slides-ribbon-state-probe.desktop.mjs`, `docs/tickets-0710/HANDOFF-SL.md`
