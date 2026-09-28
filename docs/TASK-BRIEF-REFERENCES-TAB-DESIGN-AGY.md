# TASK BRIEF — Rà soát thiết kế trực quan tab "Tham chiếu" (References) — Writer (agy)

Worktree: `E:\VNOffice-agy-references-tab` (nhánh `design/writer-references-tab-agy`, tách từ `main` `bb3053d`). Chỉ làm trong worktree này. Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"` nếu cần mở app.
Việc **UI/thiết kế/trực quan** — KHÔNG sửa logic. Đọc 7 handoff trước (`docs/HANDOFF-LAYOUT-TAB-DESIGN.md`, `HANDOFF-HOME-TAB-DESIGN.md`, `HANDOFF-INSERT-TAB-DESIGN.md`, `HANDOFF-REVIEW-TAB-DESIGN.md`, `HANDOFF-FORMULAS-TAB-DESIGN.md`, `HANDOFF-DATA-TAB-DESIGN.md`, `HANDOFF-VIEW-TAB-DESIGN-AGY.md`) để nắm phương pháp và các dạng lỗi thường gặp: raw command-id/thiếu icon (kể cả lệnh có handler thật nhưng CHƯA khai báo trong `command-definitions.js`), item chưa render trong `ribbon-host.js`, tràn ngang 1440px/1024px, thiếu `iconOnly`/`id`/launcher, sai tên tab/nhóm trong Help, thiếu styling nút trong dialog, vi phạm WCAG AA contrast (cả chế độ Tối — nút "Tối" góc phải trên), control bật/tắt phải dùng checkbox dùng chung như vòng View.

## Việc cần làm
Tab **Tham chiếu** (References) của VN Writer.

### Word 2016 References tab
Table of Contents (Table of Contents / Add Text / Update Table), Footnotes (Insert Footnote / Insert Endnote / Next Footnote / Show Notes), Research (Smart Lookup), Citations & Bibliography (Insert Citation / Manage Sources / Style / Bibliography), Captions (Insert Caption / Insert Table of Figures / Update Table / Cross-reference), Index (Mark Entry / Insert Index / Update Index), Table of Authorities (Mark Citation / Insert Table of Authorities / Update Table).

Ghi lại đúng những gì VN Writer ĐÃ CÓ trên tab này (không giả định, không tự thêm nút cho tính năng chưa làm — ví dụ Smart Lookup cần mạng, Table of Authorities có thể chưa có; đó không phải lỗi thiết kế, chỉ ghi nhận vào handoff mục "Khoảng trống so với Word").

### Sửa những gì thấy rõ ràng lệch (chỉ CSS/markup/định nghĩa lệnh/i18n/icon-mapping, KHÔNG viết logic xử lý mới)
File liên quan: `apps/writer/writer-ribbon.js`, `apps/writer/writer.css`, `platform/commands/command-definitions.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, `platform/ui-kit/components.js`, `platform/ui-kit/icons.js`, `platform/ribbon/ribbon-host.js`, `platform/ribbon/ribbon.css`, `platform/shell/shell.css`. Dialog của tab này (Mục lục, Chú thích cuối trang, Trích dẫn, Chú thích ảnh, Chỉ mục...) cũng thuộc phạm vi rà soát trực quan: bố cục, nút, focus bàn phím (Tab/Enter/Esc), trạng thái lỗi.

### Rà soát nút chết + Rà soát Help
Cùng phương pháp các lần trước (`globalCommandBus._handlers` trên app thật; `platform/help/entries-writer.js`). Mọi nút trên tab phải có handler thật; bài Help tiếng Việt phải khớp đúng tên tab/nhóm/nút hiện có (AGENTS.md mục 10). Viết thêm bài Help còn thiếu cho lệnh đã có trên tab.

## Test / xác nhận trước khi bàn giao
- `node tests/run-tests.js` foreground. Hiện `main` là 1831/1835: 4 test gọi soffice thật (Sheet FODS save CF/validation, Sheet Pivot save, FODS thật height/width, textRotation) FAIL do môi trường máy (soffice tạo profile mới mất ~77s) — ghi BLOCKED môi trường, không sửa các test đó, không tăng timeout.
- Viết `tests/live/writer-references-tab.playwright.mjs` theo mẫu `tests/live/writer-view-tab.playwright.mjs`: không tràn ngang 1440px/1024px, không raw command-id, không icon chấm tròn fallback, mọi nút có handler, 0 pageerror.
- **KHÔNG commit ảnh chụp màn hình (.png) vào git.**

## Luật cứng
Không đụng logic. Không đụng file agent khác đang sửa song song: `adapters/libreoffice/writer/writer-adapter.js`, `adapters/libreoffice/common/ooxml_zip_patch.py`, `adapters/libreoffice/sheet/sheet-adapter.js`, `main.py`, `scripts/layout-audit/*`. Không commit/copy tài liệu Office thật. Commit tiền tố `design(ui): …`, commit sau mỗi bước nhỏ. Không rebase/force. KHÔNG chạy tác vụ ở nền rồi ngồi chờ — mọi lệnh foreground. Không merge vào `main`.

## Bàn giao
`docs/HANDOFF-REFERENCES-TAB-DESIGN-AGY.md`: cùng cấu trúc các handoff trước, PASS/FAIL/NOT RUN/BLOCKED trung thực.
