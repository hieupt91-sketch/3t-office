# Agent Handoff

TASK: VN Sheet PivotChart & What-If Analysis
AGENT/ROLE: Codex — Sheet feature implementation
BRANCH: `feature/sheet-pivotchart-whatif`
WORKTREE: `E:\VNOffice-codex-pivotchart-whatif`
OBJECTIVE: Thêm PivotChart liên kết Pivot đã tổng hợp và dropdown Phân tích What-If gồm Goal Seek, Data Table 1/2 biến, Scenario Manager CRUD/Hiển thị.
FINDINGS: `PivotTableEngine.aggregate()`/`pivotTablesBySheet` và `SheetChartBuilder`/`chartsBySheet` đủ để mở rộng PivotChart; FormulaEngine, cell snapshot và history stack hiện hữu đủ cho What-If. Không cần LibreOffice Core patch hay dependency mới. Sửa thêm lỗi chart cũ coi chuỗi tiêu đề không có số là giá trị 0.
IMPLEMENTATION SUMMARY: Goal Seek được chuyển vào dropdown What-If nhưng giữ nguyên logic. Data Table thử giá trị trong bộ nhớ, khôi phục input/công thức gốc và chỉ ghi output cuối theo một history action; hỗ trợ 1 biến theo hàng/cột và 2 biến. Scenario Manager lưu state theo sheet, có Thêm/Sửa/Xóa/Hiển thị; Hiển thị áp dụng vào ô thật và Undo/Redo atomic. PivotChart có loại Cột/Tròn, lưu `pivotId`, lấy vùng kết quả Pivot, tự đổi dữ liệu/vùng khi Làm mới Pivot, dùng renderer/history chart chung. Đã thêm UI states, icon, i18n và hai bài Help tiếng Việt cụ thể.
FILES CHANGED: `apps/sheet/pivot-table.js`, `apps/sheet/sheet-chart.js`, `apps/sheet/sheet-grid.js`, `apps/sheet/sheet-ribbon.js`, `apps/sheet/sheet.css`, `apps/sheet/what-if-analysis.js`, `adapters/libreoffice/sheet/sheet-adapter.js`, `platform/commands/command-definitions.js` (chỉ thêm `sheet.*`), `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, `platform/ui-kit/icons.js`, `platform/help/entries-sheet.js` (chỉ thêm entry), test và docs liên quan. Không sửa Writer/Slides source.
COMMANDS RUN: `node --check apps/sheet/sheet-grid.js`; `node --check apps/sheet/what-if-analysis.js`; targeted unit suites; `node tests/live/sheet-what-if-analysis.playwright.mjs`; `node tests/live/sheet-pivot-chart.playwright.mjs`; `node tests/run-tests.js`; `git diff --check`.
BUILD RESULT: PASS — repo không có build step riêng; syntax checks trong runner và `node --check` PASS.
TEST RESULTS: PASS — `1021/1021`, 0 FAIL, 70.33 giây (<90 giây). Live Edge What-If PASS bằng click/fill thật, không SendKeys. Live Edge PivotChart PASS: tạo Pivot thật, chèn chart Tròn và refresh đổi tổng 30→60.
KNOWN FAILURES: Không.
RISKS: Scenario/PivotChart là state phiên làm việc theo model hiện tại; chưa serialize Scenario hoặc liên kết PivotChart sang XLSX/ODS. Data Table ghi kết quả tĩnh giống kết quả What-If tại thời điểm chạy; chạy lại dialog khi muốn tính lại dãy.
DEPENDENCIES/BLOCKERS: Không.
CORE PATCH ID (if any): N/A — không sửa Core/upstream.
NEXT ACTION: Review hai commit tính năng `007cd1a` và `be70c2a`, cùng commit handoff; không merge vào main trong task này. Scenario Summary chưa triển khai theo nhánh ưu tiên được giao; CRUD và Hiển thị thật đã hoàn tất.
