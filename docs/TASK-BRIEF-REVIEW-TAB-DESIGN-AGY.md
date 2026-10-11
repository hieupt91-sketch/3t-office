# TASK BRIEF — Rà soát thiết kế trực quan tab "Xem xét" (Review) — Writer và Sheet (agy)

Worktree: `E:\VNOffice-agy-review-tab` (nhánh `design/writer-sheet-review-tab-agy`, tách từ `main`). Chỉ làm trong worktree này.
Việc **UI/thiết kế/trực quan** — KHÔNG sửa logic đo lường/phân trang/công thức (agent khác đang sửa logic ở worktree riêng cùng lúc). Đọc `docs/HANDOFF-LAYOUT-TAB-DESIGN.md`, `docs/HANDOFF-HOME-TAB-DESIGN.md`, `docs/HANDOFF-INSERT-TAB-DESIGN.md` trước (3 đợt rà soát đã xong, cùng phương pháp và các dạng lỗi thường gặp).

## Việc cần làm
Tab **Xem xét** (Review) — chính tả, nhận xét, theo dõi thay đổi, bảo vệ tài liệu.

### 1. Screenshot thật + so sánh với Word/Excel 2016 thật
- VN Writer tab Xem xét vs Word 2016 Review tab (Proofing [Spelling/Thesaurus/Word Count], Accessibility, Language, Comments [New/Delete/Previous/Next/Show Comments], Tracking [Track Changes/Display for Review/Show Markup/Reviewing Pane], Changes [Accept/Reject/Previous/Next], Compare, Protect [Restrict Editing/Block Authors]).
- VN Sheet tab Xem xét vs Excel 2016 Review tab (Proofing [Spelling/Thesaurus/Research], Accessibility, Insights, Language, Comments [New/Delete/Previous/Next/Show], Changes [Protect Sheet/Protect Workbook/Share Workbook/Protect and Share/Allow Edit Ranges/Track Changes]).
- Ghi lại đúng những gì VN Writer/Sheet ĐÃ CÓ (không giả định, không tự thêm nút cho tính năng chưa làm).
- Kiểm tra các lỗi dạng đã gặp 3 lần trước: raw command-id/thiếu icon, item chưa render trong `ribbon-host.js`, tràn ngang 1440px/1024px, thiếu `iconOnly` gây phình to, thiếu launcher góc nhóm, thiếu `id` nhóm lệnh.

### 2. Sửa những gì thấy rõ ràng lệch (chỉ CSS/markup/định nghĩa lệnh/i18n/icon-mapping, KHÔNG viết logic xử lý mới)
File liên quan: `apps/writer/writer-ribbon.js`, `apps/writer/writer.css`, `apps/sheet/sheet-ribbon.js`, `apps/sheet/sheet.css`, `platform/commands/command-definitions.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, `platform/ui-kit/components.js`, `platform/ribbon/ribbon-host.js`, `platform/ribbon/ribbon.css`, `platform/shell/shell.css`.

### 3. Rà soát nút chết + 4. Rà soát Help
Cùng phương pháp 3 lần trước (`globalCommandBus._handlers` trên app thật; `platform/help/entries-writer.js`/`entries-sheet.js`).

## Test / xác nhận trước khi bàn giao
`node tests/run-tests.js` phải PASS toàn bộ (đang 1834/1834). Playwright: không tràn ngang 1440px/1024px.

## Luật cứng
Không đụng logic đo lường/phân trang. Không đụng file của agent khác đang làm song song: `adapters/libreoffice/writer/writer-adapter.js`, `adapters/libreoffice/sheet/sheet-adapter.js`, `adapters/libreoffice/common/ooxml_zip_patch.py`, `apps/sheet/sheet-grid.js`, `main.py`, `index.html`, `scripts/layout-audit/_time_sheet_open_stages.py`. Không commit/copy tài liệu Office thật. Không thêm dependency mới. Commit tiền tố `design(ui): …`. Không rebase/force. Không chạy tác vụ ở nền rồi ngồi chờ.

## Bàn giao
`docs/HANDOFF-REVIEW-TAB-DESIGN.md`: cùng cấu trúc 3 handoff trước.
