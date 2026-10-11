# Agent Handoff

TASK: VN Slides — Insert Chart

AGENT/ROLE: Codex / Slides feature implementation + QA

BRANCH: `feature/slides-insert-chart`

WORKTREE: `E:\VNOffice-codex-slides-insert-chart`

OBJECTIVE: Thêm lệnh `slides.insert.chart`, dialog nhập title/label/value và bốn loại cột/đường/tròn/miền; chart là shape thật, render ở canvas/F5/Slide Sorter, dùng history shape hiện hữu và lưu/đọc FODP/PPTX có đo thật.

FINDINGS:

- Đã đọc nhưng không sửa `apps/sheet/sheet-chart.js`. `SheetChartBuilder.generateSvg()` có thuật toán SVG độc lập, nhưng module chung phụ thuộc i18n/dialog và model range của Sheet. Chọn renderer riêng ở app Slides theo cùng thuật toán để không tạo dependency Slides → Sheet.
- Model Slides hiện hữu phù hợp: `slide.shapes[]`, selection/drag/resize/delete và action `shape-add`/`shape-delete` đã dùng chung được. Chart edit bổ sung action `chart-edit` vào chính undo/redo stack đó, không tạo stack mới.
- Probe LibreOffice thật xác nhận embedded ODF chart phải dùng địa chỉ cache `local-table.$B$2:.$B$N` (không phải `local-table.B2:local-table.BN`).

IMPLEMENTATION SUMMARY:

- Renderer SVG dependency-free với `data-chart-type`, title, labels, values và đủ bar/line/pie/area.
- Dialog keyboard-usable: type radiogroup, bảng dữ liệu thêm/xóa dòng, preview trực tiếp, validation, Escape, focus trap và focus restoration.
- Chart shape `{ type, chartType, title, labels, data, x, y, w, h }`; Enter/double-click mở sửa; selection/drag/resize/delete dùng cơ chế shape có sẵn.
- Canvas editor, F5 và Slide Sorter đều dùng cùng renderer SVG.
- FODP ghi chart chuẩn dưới `draw:object` → embedded `office:document` → `chart:chart`, có `local-table`; đồng thời ghi `vno:chart-*` để round-trip VN Office trực tiếp chính xác.
- Ribbon dùng label/icon cục bộ và adapter bind explicit vì registry Platform ngoài phạm vi cho phép.

FILES CHANGED:

- `apps/slides/slides-chart.js`
- `apps/slides/slides-canvas.js`
- `apps/slides/slides-ribbon.js`
- `apps/slides/slides.css`
- `adapters/libreoffice/slides/slides-adapter.js`
- `tests/unit/slides-charts.test.js`
- `tests/live/slides-charts.playwright.mjs`
- `tests/scripts/probe-slides-charts-fodp-pptx.mjs`
- `tests/run-tests.js`
- `docs/PLAN-SLIDES-INSERT-CHART.md`
- `docs/HANDOFF-SLIDES-INSERT-CHART.md`

COMMANDS RUN:

- `node scripts/check-syntax.js`
- isolated `runSlidesChartTests()`
- `node tests/live/slides-charts.playwright.mjs`
- `node tests/scripts/probe-slides-charts-fodp-pptx.mjs`
- `node tests/run-tests.js` (Stopwatch đo 52.021 giây)

BUILD RESULT: PASS — syntax checker 67/67 JavaScript files.

TEST RESULTS:

- PASS — feature unit 5/5.
- PASS — live Playwright: SVG thật hiện trên canvas, F5 và Slide Sorter; edit/delete/Undo/Redo đúng. Không dùng SendKeys.
- PASS — full suite 874/874, 0 FAIL, 52.021 giây (<60 giây).
- PASS — LibreOffice thật FODP → PPTX: tạo native `ppt/charts/chart1.xml`, giữ bar type, title “Doanh thu 2026”, labels và values 120/185/143.
- PASS — LibreOffice thật PPTX → FODP: còn `<chart:chart>`; parser khôi phục `{chartType:"bar", labels:["Tháng 1","Tháng 2","Tháng 3"], data:[120,185,143]}`.

KNOWN FAILURES: Không có test/build failure.

RISKS:

- Qua PPTX, LibreOffice loại metadata riêng `vno:chart-*`; parser vẫn khôi phục dữ liệu cơ bản từ `chart:chart` + `local-table`, nhưng ID/style chi tiết do PowerPoint/LibreOffice tự rewrite có thể thay đổi.
- Chỉ model một series label/value; chưa hỗ trợ multi-series, secondary axis, data labels, legend customization hay chart theme fidelity.
- Visual SVG trong VN Slides và visual native chart trong LibreOffice/PPTX dùng hai renderer khác nhau nên màu/font/khoảng cách có thể không pixel-identical.

DEPENDENCIES/BLOCKERS: Không có. Không thêm thư viện, không sửa Core, không sửa source Writer/Sheet, không merge main.

CORE PATCH ID (if any): N/A

NEXT ACTION: Reviewer có thể chạy lại ba lệnh test/probe trên branch này; chỉ merge theo quy trình riêng của maintainer.
