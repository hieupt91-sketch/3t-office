# TASK BRIEF — Rà soát thiết kế trực quan tab "Thiết kế" (Design) — Writer (agy)

Worktree: `E:\VNOffice-agy-design-tab` (nhánh `design/writer-design-tab-agy`, tách từ `main` `c8f53af`). Chỉ làm trong worktree này. Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"` nếu cần mở app.
Việc **UI/thiết kế/trực quan** — KHÔNG sửa logic áp dụng kiểu/chủ đề. Đọc các handoff trước (`docs/HANDOFF-LAYOUT-TAB-DESIGN.md`, `HANDOFF-HOME-TAB-DESIGN.md`, `HANDOFF-INSERT-TAB-DESIGN.md`, `HANDOFF-REVIEW-TAB-DESIGN.md`, `HANDOFF-FORMULAS-TAB-DESIGN.md`, `HANDOFF-DATA-TAB-DESIGN.md`, `HANDOFF-VIEW-TAB-DESIGN-AGY.md`, `HANDOFF-REFERENCES-TAB-DESIGN-AGY.md`, `HANDOFF-MAILINGS-TAB-DESIGN-AGY.md`) để nắm phương pháp và các dạng lỗi thường gặp: raw command-id/thiếu icon (kể cả lệnh có handler thật nhưng CHƯA khai báo trong `command-definitions.js`), item chưa render trong `ribbon-host.js`, tràn ngang 1440px/1024px, thiếu `iconOnly`/`id`/launcher, sai tên tab/nhóm trong Help, thiếu styling nút trong dialog, focus bàn phím trong dialog (Tab/Shift+Tab bị giữ trong dialog, Esc đóng, trả focus về chỗ cũ — xem cách làm ở `apps/writer/captions.js`), vi phạm WCAG AA contrast ở cả chế độ Sáng và Tối (nút "Tối" góc phải trên), control bật/tắt dùng checkbox dùng chung.

## Việc 1 — Tab Thiết kế (Design) của VN Writer

### Word 2016 Design tab
Document Formatting (Themes / Style Set gallery / Colors / Fonts / Paragraph Spacing / Effects / Set as Default), Page Background (Watermark / Page Color / Page Borders).

Ghi lại đúng những gì VN Writer ĐÃ CÓ trên tab này (không giả định, không tự thêm nút cho tính năng chưa làm — chưa có thì ghi vào handoff mục "Khoảng trống so với Word", không phải lỗi thiết kế). Gallery (bộ kiểu, chủ đề) phải áp dụng ngay khi bấm như Word, có xem trước khi rê chuột nếu đã hỗ trợ, trạng thái đang chọn rõ ràng. Dialog của tab này (hình mờ, màu trang, viền trang) thuộc phạm vi rà soát trực quan: bố cục, nút, focus bàn phím, trạng thái lỗi.

## Việc 2 — Kiểm tra lại chế độ Tối trên tab Thiết kế
Gallery/ô màu/xem trước hình mờ trong chế độ Tối phải đọc được (WCAG AA cho chữ, viền ô màu thấy rõ trên nền tối); màu trang của TÀI LIỆU không được đổi theo giao diện Tối (đó là nội dung người dùng).
### File liên quan (chỉ CSS/markup/định nghĩa lệnh/i18n/icon-mapping, KHÔNG viết logic xử lý mới)
`apps/writer/writer-ribbon.js`, `apps/writer/writer.css`, các file dialog của tab Thiết kế trong `apps/writer/`, `platform/commands/command-definitions.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, `platform/ui-kit/components.js`, `platform/ui-kit/icons.js`, `platform/ribbon/ribbon-host.js`, `platform/ribbon/ribbon.css`, `platform/shell/shell.css`, `platform/help/entries-writer.js`.

### Rà soát nút chết + Rà soát Help
Cùng phương pháp các lần trước (`globalCommandBus._handlers` trên app thật). Mọi nút trên tab phải có handler thật; bài Help tiếng Việt phải khớp đúng tên tab/nhóm/nút hiện có (AGENTS.md mục 10). Viết thêm bài Help còn thiếu cho lệnh đã có trên tab — hướng dẫn cụ thể từng bước.

## Test / xác nhận trước khi bàn giao
- `node tests/run-tests.js` foreground — `main` hiện 1835/1835 PASS. (Nếu thấy 4 test soffice Sheet FODS/Pivot/height-width/textRotation FAIL: đó là sự cố môi trường máy đã gặp trước đây — soffice khởi động chậm — ghi BLOCKED, không sửa test, không tăng timeout.)
- Viết `tests/live/writer-design-tab.playwright.mjs` theo mẫu `tests/live/writer-mailings-tab.playwright.mjs`: không tràn ngang 1440px/1024px, không raw command-id, không icon chấm tròn fallback, mọi nút có handler, dialog giữ focus + Esc đóng, 0 pageerror; thêm kiểm tra Việc 2.
- **KHÔNG commit ảnh chụp màn hình (.png) vào git.**

## Luật cứng
Không đụng logic. Không đụng file agent khác đang sửa song song: `adapters/libreoffice/writer/writer-adapter.js`, `adapters/libreoffice/common/ooxml_zip_patch.py`, `adapters/libreoffice/sheet/sheet-adapter.js`, `main.py`, `scripts/layout-audit/*`. Không commit/copy tài liệu Office thật. Commit tiền tố `design(ui): …`, commit sau mỗi bước nhỏ. Không rebase/force. KHÔNG chạy tác vụ ở nền rồi ngồi chờ — mọi lệnh foreground. Không merge vào `main`.

## Bàn giao
`docs/HANDOFF-DESIGN-TAB-DESIGN-AGY.md`: cùng cấu trúc các handoff trước, PASS/FAIL/NOT RUN/BLOCKED trung thực.
