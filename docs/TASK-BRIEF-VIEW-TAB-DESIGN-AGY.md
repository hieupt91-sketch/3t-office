# TASK BRIEF — Rà soát thiết kế trực quan tab "Chế độ xem" (View) — Writer và Sheet (agy)

Worktree: `E:\VNOffice-agy-view-tab` (nhánh `design/writer-sheet-view-tab-agy`, tách từ `main`). Chỉ làm trong worktree này.
Việc **UI/thiết kế/trực quan** — KHÔNG sửa logic đo lường/phân trang/tính toán (agent khác đang sửa logic ở worktree riêng cùng lúc — kiểm tra `git status`/file đang mở, tránh `sheet-adapter.js`, `main.py` nếu thấy ai đang sửa). Đọc 6 handoff trước (`docs/HANDOFF-LAYOUT-TAB-DESIGN.md`, `HANDOFF-HOME-TAB-DESIGN.md`, `HANDOFF-INSERT-TAB-DESIGN.md`, `HANDOFF-REVIEW-TAB-DESIGN.md`, `HANDOFF-FORMULAS-TAB-DESIGN.md`, `HANDOFF-DATA-TAB-DESIGN.md`) để nắm phương pháp và các dạng lỗi thường gặp: raw command-id/thiếu icon (kể cả trường hợp lệnh có handler thật nhưng CHƯA TỪNG được khai báo trong `command-definitions.js` — đã xảy ra 2 lần ở Formulas/Data, kiểm tra kỹ), item chưa render trong `ribbon-host.js`, tràn ngang 1440px/1024px, thiếu `iconOnly`/`id`/launcher, sai tên tab/nhóm trong Help, thiếu styling nút trong dialog, vi phạm WCAG AA contrast.

## Việc cần làm
Tab **Chế độ xem** (View) — có ở cả hai app.

### Word 2016 View tab: Views (Read Mode/Print Layout/Web Layout/Outline/Draft), Immersive (Focus/Immersive Reader), Page Movement (Vertical/Side to Side), Show (Ruler/Gridlines/Navigation Pane), Zoom (Zoom/100%/One Page/Multiple Pages/Page Width), Window (New Window/Arrange All/Split/View Side by Side/Synchronous Scrolling/Reset Window Position/Switch Windows), Macros.

### Excel 2016 View tab: Workbook Views (Normal/Page Break Preview/Page Layout/Custom Views), Show (Ruler/Gridlines/Formula Bar/Headings), Zoom (Zoom/100%/Zoom to Selection), Window (New Window/Arrange All/Freeze Panes/Split/Hide/Unhide/View Side by Side/Synchronous Scrolling/Reset Window Position/Save Workspace/Switch Windows), Macros.

Ghi lại đúng những gì VN Writer/Sheet ĐÃ CÓ trên tab này (không giả định, không tự thêm nút cho tính năng chưa làm — nhiều mục trên chắc chắn VN Office chưa có, ví dụ Custom Views/Save Workspace/Synchronous Scrolling giữa nhiều cửa sổ — đó không phải lỗi thiết kế).

### Sửa những gì thấy rõ ràng lệch (chỉ CSS/markup/định nghĩa lệnh/i18n/icon-mapping, KHÔNG viết logic xử lý mới)
File liên quan: `apps/writer/writer-ribbon.js`, `apps/writer/writer.css`, `apps/sheet/sheet-ribbon.js`, `apps/sheet/sheet.css`, `platform/commands/command-definitions.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, `platform/ui-kit/components.js`, `platform/ui-kit/icons.js`, `platform/ribbon/ribbon-host.js`, `platform/ribbon/ribbon.css`, `platform/shell/shell.css`.

### Rà soát nút chết + Rà soát Help
Cùng phương pháp 6 lần trước (`globalCommandBus._handlers` trên app thật; `platform/help/entries-writer.js`/`entries-sheet.js`).

## Test / xác nhận trước khi bàn giao
`node tests/run-tests.js` phải PASS toàn bộ (đang 1834/1834 — có thể gặp 1 test flake do agent khác chạy soffice song song, chạy lại một lần trước khi kết luận). Playwright: không tràn ngang 1440px/1024px. `tests/unit/color-contrast-audit.test.js` nếu có sửa màu.
**KHÔNG commit ảnh chụp màn hình (.png) vào git** — lưu ngoài repo, chỉ mô tả bằng chữ trong handoff.

## Luật cứng
Không đụng logic đo lường/phân trang/zoom thật. Không đụng file của agent khác đang làm song song: `adapters/libreoffice/writer/writer-adapter.js`, `adapters/libreoffice/sheet/sheet-adapter.js`, `adapters/libreoffice/common/ooxml_zip_patch.py`, `apps/sheet/sheet-grid.js`, `main.py`, `index.html`, `scripts/layout-audit/*`. Không commit/copy tài liệu Office thật. Commit tiền tố `design(ui): …`. Không rebase/force. Không chạy tác vụ ở nền rồi ngồi chờ.

## Bàn giao
`docs/HANDOFF-VIEW-TAB-DESIGN.md`: cùng cấu trúc 6 handoff trước.
