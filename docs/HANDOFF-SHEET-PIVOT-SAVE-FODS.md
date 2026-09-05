# Agent Handoff

TASK: Ghi Pivot Table (ODF DataPilot) khi VN Sheet lưu FODS/XLSX

AGENT/ROLE: Codex — Sheet adapter / file fidelity

BRANCH: `feature/sheet-pivot-save-fods`

WORKTREE: `E:\VNOffice-codex-pivot-save-fods`

OBJECTIVE: Ngăn mất khái niệm Pivot Table khi `serializeToFods()` lưu workbook; XML sinh ra phải đọc ngược bằng `parseFods()` và sống qua FODS → XLSX → FODS bằng LibreOffice thật.

FINDINGS:

- `parseFods()` / `_attachImportedPivots()` nhận `table:data-pilot-table`, nguồn `table:source-cell-range`, field row/column/data và 5 function `sum`, `count`, `average`, `min`, `max`.
- Model thật là `{ id, name?, sourceSheet, sourceRange, rows, columns, values[{field, aggregate}], targetSheet, imported? }`, được lưu theo sheet đích trong `pivotTablesBySheet`.
- Model không lưu target range riêng. Sheet đích do engine VN tạo là sheet kết quả riêng, nên serializer suy ra target range từ hình chữ nhật ô có dữ liệu trên sheet đích.
- DataPilot tối thiểu này được LibreOffice Calc chấp nhận và chuyển thành Pivot Table native trong XLSX; không cần patch Core, database-range hay cache riêng cho phạm vi đã kiểm tra.

IMPLEMENTATION SUMMARY:

- `serializeToFods()` gom pivot từ mọi key của `grid.pivotTablesBySheet`, không loại `imported: true`.
- Ghi một `<table:data-pilot-tables>` chứa tên, target range, source range và field đúng orientation.
- Thêm ánh xạ ghi `SUM/COUNT/AVERAGE/MIN/MAX` → `sum/count/average/min/max`, đối xứng `_mapDataPilotFunction()`.
- Chỉ bỏ qua config không thể biểu diễn an toàn: sheet nguồn/đích không tồn tại, sourceRange không phải A1 range hai đầu, không có value hợp lệ, hoặc aggregate ngoài 5 hàm hỗ trợ.
- Test mới kiểm tra object imported và đủ cả 5 aggregate qua vòng nội bộ lẫn LibreOffice thật.
- Test LibreOffice Pivot và test CF/Validation tái sử dụng một profile trong hai chiều convert để full suite vẫn dưới 60 giây; coverage và hai lần gọi soffice thật không thay đổi.

FILES CHANGED:

- `adapters/libreoffice/sheet/sheet-adapter.js`
- `tests/unit/sheet-pivot-save-fods.test.js`
- `tests/unit/sheet-cf-validation-fods-roundtrip.test.js` (chỉ tối ưu profile test)
- `tests/run-tests.js`
- `docs/HANDOFF-SHEET-PIVOT-SAVE-FODS.md`

COMMANDS RUN:

- `node --check adapters/libreoffice/sheet/sheet-adapter.js`
- `node --check tests/unit/sheet-pivot-save-fods.test.js`
- Test riêng `runSheetPivotSaveFodsTests()`
- `node tests/run-tests.js` (đo bằng `System.Diagnostics.Stopwatch`)
- `git diff --check`

BUILD RESULT: NOT RUN — thay đổi JavaScript adapter/test không có build riêng được yêu cầu; syntax check nằm trong full suite và PASS.

TEST RESULTS:

- PASS — test riêng: `2/2`, gồm serialize→parse nội bộ và FODS→XLSX→FODS bằng `soffice.exe` thật.
- PASS — full suite: `744/744 PASS | 0 FAIL`, `51.607s`.
- PASS — Pivot imported và Pivot do UI dùng cùng model đều được serialize; cờ `imported: true` không bị bỏ qua.
- PASS — Rows, Columns và Values với SUM, COUNT, AVERAGE, MIN, MAX giữ nguyên qua vòng LibreOffice thật.
- PASS — `sourceSheet`, `sourceRange`, `targetSheet`, `rows`, `columns`, `values` đọc lại giống đầu vào.
- Không dùng SendKeys.

KNOWN FAILURES:

- Page fields, hidden/data-layout fields, calculated fields, filters, grouping, subtotals tùy biến, multiple hierarchies và layout/cache chi tiết của Excel chưa có trong model/engine VN, nên không thể tái tạo đầy đủ.
- Pivot cùng sheet nguồn vẫn bị parser hiện tại chủ động không attach vì `refreshPivotTable()` sẽ thay toàn bộ sheet và có thể xóa nguồn. Serializer có thể ghi config đó, nhưng VN round-trip sẽ không phục hồi nó vào state cho tới khi engine hỗ trợ output cùng sheet an toàn.
- Target range được suy ra từ toàn bộ vùng ô có dữ liệu trên sheet kết quả. Đây là chính xác với sheet Pivot riêng do VN tạo/đọc hiện nay; nếu tương lai cho phép nội dung không thuộc Pivot trên cùng sheet đích, model cần lưu target range riêng.
- ID sau parse được tạo lại dạng `pivot-import-N`; yêu cầu round-trip dữ liệu cấu hình không dựa vào ID nội bộ.

RISKS:

- Config không hợp lệ/aggregate chưa hỗ trợ được bỏ qua thay vì sinh XML DataPilot hỏng; cached cell values vẫn được lưu như trước.
- LibreOffice có thể chuẩn hóa caption/layout hiển thị trong cached result, nhưng cấu hình 5 aggregate đã xác minh không mất.

DEPENDENCIES/BLOCKERS: Không có dependency mới, không dùng thư viện trả phí. Cần LibreOffice thật tại một đường dẫn mà `findSoffice()` nhận diện để chạy test live.

CORE PATCH ID (if any): N/A — không sửa LibreOffice Core.

NEXT ACTION: Có thể merge branch sau review theo quy trình của người phụ trách; task này không merge vào `main`. Nếu mở rộng Pivot cùng sheet/page/filter/grouping, trước hết phải mở rộng model và refresh engine rồi mới mở rộng serializer/parser.
