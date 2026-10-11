# Agent Handoff

TASK: VN Sheet — Merge Cells parity
AGENT/ROLE: Codex / Sheet implementation and QA
BRANCH: `feature/sheet-merge-cells`
WORKTREE: `E:\VNOffice-codex-sheet-merge-cells`
OBJECTIVE: Bổ sung Merge & Center, Merge Across, Merge Cells và Unmerge Cells với model theo sheet, render/chọn vùng, cảnh báo mất dữ liệu, Deep Undo/Redo và xử lý insert/delete row/column.
FINDINGS: Code ban đầu chỉ có placeholder `sheet.cell.merge`; adapter đổi màu nền thay vì merge thật, không có merged-range model. Grid hiện dùng virtualized HTML table nên implementation tái dùng `rowSpan`/`colSpan` chuẩn DOM để tạo một ô hiển thị duy nhất.
IMPLEMENTATION SUMMARY:

- Ưu tiên 1 — HOÀN THÀNH: 4 command trong Home > Alignment; `mergedRangesBySheet`; cảnh báo khi nhiều ô có dữ liệu; chỉ giữ top-left; Merge & Center căn giữa; Merge Cells giữ căn chỉnh; Merge Across tách theo hàng; Unmerge; click trên toàn diện tích merged cell chọn cả vùng; history merge/unmerge là một bước độc lập.
- Ưu tiên 2 — HOÀN THÀNH: insert bên trong merge mở rộng range; delete trong/ở biên thu hẹp; delete toàn bộ chiều merge loại range; snapshot grid bảo toàn range qua undo/redo.
- Ưu tiên 3 — CHƯA LÀM: chưa serialize/parse merge qua FODS và chưa chạy round-trip soffice cho merge. Lý do: full suite hiện đã mất 55.39 giây, sát giới hạn 60 giây; không triển khai persistence nửa vời hoặc làm suite vượt SLA. Đây là next action độc lập.

FILES CHANGED:

- `apps/sheet/sheet-grid.js`, `apps/sheet/sheet-ribbon.js`, `apps/sheet/sheet.css`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `adapters/libreoffice/common/command-dispatch-mapper.js`
- `platform/commands/command-definitions.js`
- `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`
- `platform/ui-kit/icons.js`
- `tests/unit/sheet-merge-cells.test.js`, `tests/live/sheet-merge-cells.playwright.mjs`, `tests/run-tests.js`
- `docs/HANDOFF-SHEET-MERGE-CELLS.md`

COMMANDS RUN:

- `node --check apps/sheet/sheet-grid.js`
- Targeted merge and row/column unit runners
- `node tests/live/sheet-merge-cells.playwright.mjs`
- Timed `node tests/run-tests.js`

BUILD RESULT: NOT RUN — repository không có build script; syntax check và full automated suite đã chạy.
TEST RESULTS: PASS — targeted merge tests; PASS — existing row/column tests; PASS — live Edge/Playwright test (UI thật, drag-select, click Merge & Center/Unmerge, DOM span/border/value/selection); PASS — `749/749` full suite trong `55.39s`.
KNOWN FAILURES: Không có failure đã biết trong phạm vi đã triển khai.
RISKS: Merge bắt đầu phía trên cửa sổ virtual-scroll nhưng kéo dài vào viewport chưa có test riêng. Merge persistence qua save/open chưa tồn tại cho đến khi hoàn thành Ưu tiên 3.
DEPENDENCIES/BLOCKERS: Ưu tiên 3 cần mở rộng Sheet FODS adapter và kiểm chứng LibreOffice thật; không có dependency trả phí.
CORE PATCH ID (if any): Không có — không sửa LibreOffice Core/upstream.
NEXT ACTION: Làm task riêng cho ODF `table:number-columns-spanned`, `table:number-rows-spanned`, `table:covered-table-cell`, parse hai nhánh DOM/regex và round-trip FODS → XLSX → FODS qua soffice mà vẫn giữ full suite dưới 60 giây.
