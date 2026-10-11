# Agent Handoff

TASK: Chèn hàng/cột thật cho VN Sheet
AGENT/ROLE: Codex — Sheet implementation
BRANCH: `feature/sheet-row-col-insert`
WORKTREE: `E:\VNOffice-codex-sheet-rowcol`
OBJECTIVE: Nối hai nút ribbon hiện có với mutation thật, dịch dữ liệu/metadata và hỗ trợ undo/redo.
FINDINGS: Ribbon, icon và UNO mapping đã có; `SheetAdapter.handleDispatch()` và `SheetGridController` chưa xử lý hai command.
IMPLEMENTATION SUMMARY: Thêm `insertRow()`/`insertColumn()`, dịch cells + Comments + Conditional Formatting + Data Validation + Print Area + Page Breaks; cập nhật công thức A1/range cùng sheet; render lại hàng/cột; snapshot history nguyên tử; bind Command Bus an toàn với `args=null` và thêm dispatch cases.
FILES CHANGED: `apps/sheet/sheet-grid.js`; `adapters/libreoffice/sheet/sheet-adapter.js`; `tests/unit/sheet-row-col-insert.test.js`; `tests/run-tests.js`; `docs/FEATURE-PARITY-ROADMAP.md`; file này.
COMMANDS RUN: `node --check`; `git diff --check`; `node tests/run-tests.js`; `python -m http.server 8157 --bind 127.0.0.1`; Microsoft Edge headless qua Playwright Core tạm ngoài repo.
BUILD RESULT: Không có build step; syntax check PASS.
TEST RESULTS: PASS `364/364`, 32 suite. Live browser PASS qua HTTP với click/keyboard thật: hàng `200 → 201`; cột `26 → 27`, header cuối `AA`; trước chèn A4=`1`, B4=`Thiết kế giao diện thuần Việt & UI Kit`, C4=`1`; click Chèn hàng tại A4 cho A4 trống và dữ liệu cũ sang A5:C5; click Chèn cột tại B5 cho B5 trống, B5/C5 cũ sang C5/D5; `pageErrors=[]`.
KNOWN FAILURES: Không có trong phạm vi đã test.
RISKS: FormulaEngine chưa hỗ trợ tham chiếu chéo sheet/workbook. Named ranges, chart source ranges và pivot source ranges chưa tự dịch khi insert.
DEPENDENCIES/BLOCKERS: Không có dependency mới; không blocker.
CORE PATCH ID (if any): Không có.
NEXT ACTION: Claude review commit và quyết định merge vào `main`.
