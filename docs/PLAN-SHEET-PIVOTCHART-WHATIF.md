# Plan: Sheet PivotChart & What-If Analysis

## Objective

Hoàn thiện hai khoảng trống mức Medium của VN Sheet: PivotChart liên kết với Pivot Table và menu Phân tích What-If gồm Goal Seek hiện hữu, Data Table và Scenario Manager.

## Current capability / reuse decision

- `PivotTableEngine.aggregate()` đã tạo dữ liệu Pivot tổng hợp và `pivotTablesBySheet` giữ quan hệ source/target; sẽ tái sử dụng trực tiếp.
- `SheetChartBuilder` và `chartsBySheet` đã trích dữ liệu, sinh SVG, render, xóa và dùng history collection; PivotChart sẽ mở rộng model chart bằng liên kết Pivot, không tạo engine biểu đồ mới.
- FormulaEngine, `_recalculateAllFormulas()`, snapshot cell và `_recordHistory()` là nền cho Data Table/Scenario; không tạo history stack riêng.
- Ribbon host đã hỗ trợ item `dropdown`; Goal Seek chỉ chuyển thành mục con, không đổi thuật toán.
- Không cần LibreOffice Core patch hay dependency ngoài.

## Files / modules

- `apps/sheet/pivot-table.js`: helper xác định vùng kết quả Pivot để chart lấy đúng bảng tổng hợp.
- `apps/sheet/sheet-chart.js`: modal PivotChart giới hạn Cột/Tròn, tái sử dụng SVG generator.
- `apps/sheet/sheet-grid.js`: model/link refresh PivotChart; Data Table evaluation; Scenario CRUD/apply; dialogs; history restore.
- `apps/sheet/sheet-ribbon.js`, `apps/sheet/sheet.css`: nút PivotChart và dropdown What-If/dialog states.
- `adapters/libreoffice/sheet/sheet-adapter.js`: command bindings/dispatch qua adapter.
- `platform/commands/command-definitions.js`: chỉ thêm command `sheet.*` mới.
- `platform/i18n/*`, `platform/ui-kit/icons.js`: chuỗi/icon mới.
- `platform/help/entries-sheet.js`: hai entry Help mới.
- `tests/unit/*`, `tests/live/*`, `tests/run-tests.js`: behavioral + Playwright thật.
- `docs/HANDOFF-SHEET-PIVOTCHART-WHATIF.md`: handoff chuẩn.

## Dependencies and risks

- Data Table phải mô phỏng input rồi khôi phục tuyệt đối, không ghi các giá trị thử vào history; chỉ output cuối là một action atomic.
- Data Table 2 biến phải tuân bố cục Excel: công thức góc trên-trái, giá trị hàng trên và cột trái.
- Scenario apply ghi vào ô thật và phải undo/redo atomic; CRUD là workbook state theo sheet và cần snapshot khi xóa/khôi phục sheet.
- Pivot refresh hiện thay cả Map; chart phải đọc Map của đúng sheet, không dựa nhầm `activeSheet`.
- Giữ tương thích chart thường và Goal Seek hiện hữu.

## Test plan

- Unit: PivotChart lấy dữ liệu Pivot tổng hợp và đổi theo refresh; Data Table 1/2 biến so với tính tay; Scenario CRUD/apply, đổi scenario cho kết quả công thức khác nhau, undo/redo.
- Wiring/i18n/help/icon tests cho command/ribbon/dropdown/entries.
- Live Playwright Edge bằng click/fill thật, không SendKeys: mở dropdown, chạy Data Table, quản lý và hiển thị scenario, tạo/refresh PivotChart.
- Chạy `node tests/run-tests.js` và yêu cầu 100% PASS, đo dưới 90 giây; chạy live test riêng; `git diff --check`.

## Rollback

Hai commit tính năng độc lập: What-If Analysis và PivotChart. Có thể revert từng commit mà không chạm `main`; không thay format file hay Core.
