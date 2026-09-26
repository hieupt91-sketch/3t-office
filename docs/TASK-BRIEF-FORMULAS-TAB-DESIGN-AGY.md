# TASK BRIEF — Rà soát thiết kế trực quan tab "Công thức" (Formulas) — Sheet (agy)

Worktree: `E:\VNOffice-agy-formulas-tab` (nhánh `design/sheet-formulas-tab-agy`, tách từ `main`). Chỉ làm trong worktree này.
Việc **UI/thiết kế/trực quan** — KHÔNG sửa logic tính công thức (agent khác đang sửa logic Sheet ở worktree riêng cùng lúc). Đọc 4 handoff trước (`docs/HANDOFF-LAYOUT-TAB-DESIGN.md`, `HANDOFF-HOME-TAB-DESIGN.md`, `HANDOFF-INSERT-TAB-DESIGN.md`, `HANDOFF-REVIEW-TAB-DESIGN.md`) để nắm phương pháp và các dạng lỗi thường gặp.

## Việc cần làm
Tab **Công thức** (Formulas) chỉ có ở VN Sheet (Excel không có tab này trên Word). So với Excel 2016 Formulas tab (Function Library [Insert Function/AutoSum/Recently Used/Financial/Logical/Text/Date&Time/Lookup&Reference/Math&Trig/More Functions], Defined Names [Name Manager/Define Name/Use in Formula/Create from Selection], Formula Auditing [Trace Precedents/Trace Dependents/Remove Arrows/Show Formulas/Error Checking/Evaluate Formula/Watch Window], Calculation [Calculation Options/Calculate Now/Calculate Sheet]).

### 1. Screenshot thật + so sánh
Ghi lại đúng những gì VN Sheet ĐÃ CÓ trên tab này (không giả định, không tự thêm nút cho hàm/tính năng chưa làm). Kiểm tra các lỗi dạng đã gặp 4 lần trước: raw command-id/thiếu icon, item chưa render trong `ribbon-host.js`, tràn ngang 1440px/1024px, thiếu `iconOnly`/`id`/launcher, sai tên tab/nhóm trong Help.

### 2. Sửa những gì thấy rõ ràng lệch (chỉ CSS/markup/định nghĩa lệnh/i18n/icon-mapping, KHÔNG viết logic xử lý mới)
File liên quan: `apps/sheet/sheet-ribbon.js`, `apps/sheet/sheet.css`, `platform/commands/command-definitions.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, `platform/ui-kit/components.js`, `platform/ribbon/ribbon-host.js`, `platform/ribbon/ribbon.css`, `platform/shell/shell.css`.
Nếu hộp thoại Name Manager / Insert Function / Watch Window có lỗi layout rõ ràng — sửa cùng phương pháp đã dùng.

### 3. Rà soát nút chết + 4. Rà soát Help
Cùng phương pháp 4 lần trước (`globalCommandBus._handlers` trên app thật; `platform/help/entries-sheet.js`).

## Test / xác nhận trước khi bàn giao
`node tests/run-tests.js` phải PASS toàn bộ (đang 1834/1834). Playwright: không tràn ngang 1440px/1024px.

## Luật cứng
Không đụng logic công thức/tính toán/đo lường. Không đụng file của agent khác đang làm song song: `adapters/libreoffice/writer/writer-adapter.js`, `adapters/libreoffice/sheet/sheet-adapter.js`, `adapters/libreoffice/common/ooxml_zip_patch.py`, `apps/sheet/sheet-grid.js`, `main.py`, `index.html`, `scripts/layout-audit/*`. Không commit/copy tài liệu Office thật. Commit tiền tố `design(ui): …`. Không rebase/force. Không chạy tác vụ ở nền rồi ngồi chờ.

## Bàn giao
`docs/HANDOFF-FORMULAS-TAB-DESIGN.md`: cùng cấu trúc 4 handoff trước.
