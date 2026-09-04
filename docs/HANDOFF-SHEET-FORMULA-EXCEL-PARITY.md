# Agent Handoff

TASK: Bổ sung công thức và liên kết nhiều sheet đạt mức tương đương Excel theo danh sách ưu tiên.

AGENT/ROLE: Codex — VN Sheet owner

BRANCH: `feature/sheet-formula-excel-parity`

WORKTREE: `E:\VNOffice-codex-formula-parity`

OBJECTIVE: Bổ sung toàn bộ hàm được yêu cầu vào catalog, evaluator và unit test; hỗ trợ lookup/reference xuyên sheet và tham chiếu 3D.

FINDINGS:

- Engine đã có tham chiếu ô/vùng chéo sheet nhưng chưa có tham chiếu 3D, full-column lookup hay hàm reference động.
- Parser tên hàm chưa nhận dấu chấm nên chưa thể xử lý alias `RANK.EQ`.
- Giá trị ngày dạng `dd/mm/yyyy` từng bị bước nhận diện tiền tệ chuyển thành số; đã giữ nguyên chuỗi ngày trước bước đó.
- Không cần sửa LibreOffice Core hoặc adapter.

IMPLEMENTATION SUMMARY:

- Nhóm 2 — Tra cứu/liên kết: `IFERROR`, `IFNA`, `ISBLANK`, `ISNUMBER`, `ISTEXT`, `ISERROR`, `ISNA`, `INDIRECT`, `OFFSET`, `XLOOKUP`, `CHOOSE`, `LOOKUP`; full-column `A:A`; tham chiếu 3D cho `SUM`, `AVERAGE`, `COUNT`, `MAX`, `MIN` theo thứ tự tab. Test dùng workbook có bốn sheet, gồm tên sheet có khoảng trắng.
- Nhóm 1 — Toán học/thống kê: `SUMPRODUCT`, `SQRT`, `POWER`, `ROUNDUP`, `ROUNDDOWN`, `CEILING`, `FLOOR`, `TRUNC`, `SIGN`, `AVERAGEIF`, `AVERAGEIFS`, `MEDIAN`, `RANK`, `RANK.EQ`, `LARGE`, `SMALL`, `COUNTBLANK`, `STDEV`, `VAR`.
- Nhóm 3 — Văn bản: `MID`, `VALUE`, `PROPER`, `TEXTJOIN`, `REPT`, `EXACT`, `SEARCH`.
- Nhóm 4 — Ngày tháng: `WEEKDAY`, `NETWORKDAYS`, `WORKDAY`, `EOMONTH`, `DAYS`.
- Tất cả hàm đã được thêm `FUNCTION_CATALOG` với category, syntax và mô tả tiếng Việt.
- Hàm chưa làm trong phạm vi yêu cầu: không có.

FILES CHANGED:

- `apps/sheet/formula-engine.js`
- `apps/sheet/sheet-grid.js`
- `tests/run-tests.js`
- `tests/unit/formula-autocomplete.test.js`
- `tests/unit/sheet-reference-functions.test.js`
- `tests/unit/sheet-math-stat-functions.test.js`
- `tests/unit/sheet-text-functions.test.js`
- `tests/unit/sheet-date-functions.test.js`
- `docs/HANDOFF-SHEET-FORMULA-EXCEL-PARITY.md`

COMMANDS RUN:

- Targeted Node unit runners cho từng nhóm.
- `node --check apps/sheet/formula-engine.js`
- `git diff --check`
- `node tests/run-tests.js` qua `Measure-Command`.

BUILD RESULT: NOT RUN — repository không có bước build riêng được yêu cầu; syntax check và master test runner đã chạy.

TEST RESULTS: PASS — `node tests/run-tests.js`: 573/573 PASS, 0 FAIL; 11,52 giây ở lần chạy full-suite cuối.

KNOWN FAILURES: Không có.

RISKS:

- Đây là engine JS gọn, chưa phải toàn bộ hàng trăm hàm của Excel ngoài danh sách task; “tương đương Excel” trong handoff này chỉ xác nhận đầy đủ phạm vi hàm được chủ dự án liệt kê.
- `STDEV` và `VAR` dùng semantics mẫu tương ứng các tên Excel tương thích cũ (`STDEV.S`/`VAR.S`).
- `CEILING`/`FLOOR` giữ semantics tương thích Excel legacy khi number và significance trái dấu (`#NUM!`).

DEPENDENCIES/BLOCKERS: Không có dependency mới hoặc blocker.

CORE PATCH ID (if any): Không có — không sửa Core.

NEXT ACTION: Claude review các commit, đặc biệt reference semantics; không merge tự động vào `main`.
