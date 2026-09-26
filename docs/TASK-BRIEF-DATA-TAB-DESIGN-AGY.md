# TASK BRIEF — Rà soát thiết kế trực quan tab "Dữ liệu" (Data) — Sheet (agy)

Worktree: `E:\VNOffice-agy-data-tab` (nhánh `design/sheet-data-tab-agy`, tách từ `main`). Chỉ làm trong worktree này.
Việc **UI/thiết kế/trực quan** — KHÔNG sửa logic tính toán/sắp xếp/lọc dữ liệu (agent khác đang sửa logic Sheet ở worktree riêng cùng lúc — kiểm tra `git status` trước, nếu thấy ai đó đang sửa `sheet-adapter.js`/`main.py` thì càng phải tuyệt đối tránh hai file đó). Đọc 5 handoff trước (`docs/HANDOFF-LAYOUT-TAB-DESIGN.md`, `HANDOFF-HOME-TAB-DESIGN.md`, `HANDOFF-INSERT-TAB-DESIGN.md`, `HANDOFF-REVIEW-TAB-DESIGN.md`, `HANDOFF-FORMULAS-TAB-DESIGN.md`) để nắm phương pháp và các dạng lỗi thường gặp (raw command-id/thiếu icon, item chưa render trong `ribbon-host.js`, tràn ngang 1440px/1024px, thiếu `iconOnly`/`id`/launcher, sai tên tab/nhóm trong Help).

## Việc cần làm
Tab **Dữ liệu** (Data) chỉ có ở VN Sheet. So với Excel 2016 Data tab (Get & Transform Data [From Access/Web/Text/Table/Recent Sources/Existing Connections], Queries & Connections, Sort & Filter [Sort/Filter/Clear/Reapply/Advanced], Data Tools [Text to Columns/Flash Fill/Remove Duplicates/Data Validation/Consolidate/Relationships/Manage Data Model], Forecast [What-If Analysis/Forecast Sheet], Outline [Group/Ungroup/Subtotal]).

### 1. Screenshot thật + so sánh
Ghi lại đúng những gì VN Sheet ĐÃ CÓ trên tab này (không giả định, không tự thêm nút cho tính năng chưa làm — ví dụ Power Query/Get & Transform Data rất có thể chưa có, đó không phải lỗi thiết kế). Kiểm tra các lỗi dạng đã gặp 5 lần trước.

### 2. Sửa những gì thấy rõ ràng lệch (chỉ CSS/markup/định nghĩa lệnh/i18n/icon-mapping, KHÔNG viết logic xử lý mới)
File liên quan: `apps/sheet/sheet-ribbon.js`, `apps/sheet/sheet.css`, `platform/commands/command-definitions.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, `platform/ui-kit/components.js`, `platform/ribbon/ribbon-host.js`, `platform/ribbon/ribbon.css`, `platform/shell/shell.css`.
Nếu hộp thoại Sort/Filter nâng cao, Data Validation, Remove Duplicates, What-If Analysis có lỗi layout rõ ràng — sửa cùng phương pháp đã dùng.

### 3. Rà soát nút chết + 4. Rà soát Help
Cùng phương pháp 5 lần trước (`globalCommandBus._handlers` trên app thật; `platform/help/entries-sheet.js`).

## Test / xác nhận trước khi bàn giao
`node tests/run-tests.js` phải PASS toàn bộ (đang 1834/1834 — có thể gặp 1 test flake do agent khác chạy soffice song song, chạy lại một lần trước khi kết luận). Playwright: không tràn ngang 1440px/1024px.
**Không commit ảnh chụp màn hình vào git** (bài học từ vòng Formulas — lưu ảnh ngoài repo hoặc mô tả bằng chữ trong handoff, đừng thêm file `.png` vào commit).

## Luật cứng
Không đụng logic dữ liệu/sắp xếp/lọc/công thức. Không đụng file của agent khác đang làm song song: `adapters/libreoffice/writer/writer-adapter.js`, `adapters/libreoffice/sheet/sheet-adapter.js`, `adapters/libreoffice/common/ooxml_zip_patch.py`, `apps/sheet/sheet-grid.js`, `main.py`, `index.html`, `scripts/layout-audit/*`. Không commit/copy tài liệu Office thật. Commit tiền tố `design(ui): …`. Không rebase/force. Không chạy tác vụ ở nền rồi ngồi chờ.

## Bàn giao
`docs/HANDOFF-DATA-TAB-DESIGN.md`: cùng cấu trúc 5 handoff trước.
