# Agent Handoff

TASK: Bổ sung các khoảng trống quan trọng trên tab Dữ liệu của VN Sheet

AGENT/ROLE: Codex — Sheet / Integration / QA

BRANCH: `feature/sheet-data-tab-gaps`

WORKTREE: `E:\VNOffice-codex-data-tab-gaps`

OBJECTIVE: Thêm Remove Duplicates, Subtotal, Group/Ungroup, Text to Columns và Flash Fill dùng được thật; đi qua Command Bus/UNO mapper/Sheet adapter; có UI, state lỗi và Undo/Redo phù hợp.

FINDINGS:

- Trước thay đổi, Data tab chỉ có Sort A-Z, Sort Z-A, Filter, Data Validation và PivotTable.
- Không có command Advanced Filter riêng. Advanced Filter không nằm trong danh sách command phải triển khai của task này nên chưa bổ sung.
- Mọi command mới đã có mapping thật trong `command-dispatch-mapper.js`; Playwright gọi `globalCommandBus.execute()` trực tiếp để chống regression lỗi thiếu handler/mapping.
- Không cần sửa LibreOffice Core hoặc thêm dependency.

IMPLEMENTATION SUMMARY:

- ĐẦY ĐỦ — Remove Duplicates: dialog nhận biết header, checkbox từng cột, xóa cả hàng trùng theo khóa cột đã chọn, báo số hàng xóa/còn lại, Undo/Redo một bước.
- ĐẦY ĐỦ — Subtotal: dialog chọn cột nhóm, SUM/COUNT/AVERAGE và các cột giá trị; chèn subtotal khi khóa đổi và Grand Total cuối bảng; Undo một bước. Người dùng phải sắp xếp trước theo cột nhóm như mô tả tính năng.
- ĐẦY ĐỦ — Group/Ungroup: hỗ trợ vùng chọn nguyên hàng hoặc nguyên cột liên tiếp, lưu nhóm theo sheet, nút `−`/`+` trên header và ẩn/hiện thành viên khi collapse/expand.
- ĐẦY ĐỦ — Text to Columns: dialog chọn delimiter (phẩy, chấm phẩy, khoảng trắng, tab, ký tự tùy chọn) hoặc fixed width; có preview trước khi Apply; tự mở rộng số cột nếu cần; Undo/Redo một bước.
- RÚT GỌN CÓ CHỦ ĐÍCH — Flash Fill: nhận diện nối hai cột bằng `space`, `-`, ` - ` hoặc không separator; và cắt 1–12 ký tự đầu/cuối từ cột bên trái. Cần ít nhất một ví dụ khớp chính xác; nếu mơ hồ/không khớp thì báo không nhận diện thay vì điền sai. Chưa phải thuật toán suy luận pattern tổng quát của Excel.
- Ribbon Data theo thứ tự trái sang phải: Sort & Filter → Data Tools → Outline → PivotTable. Forecast và các nhóm kết nối ngoài được bỏ qua đúng scope.
- SVG được khai báo trực tiếp trong Sheet ribbon, không dùng placeholder và không sửa UI kit dùng chung ngoài scope.

FILES CHANGED:

- `apps/sheet/data-tools.js`
- `apps/sheet/sheet-grid.js`
- `apps/sheet/sheet-ribbon.js`
- `apps/sheet/sheet.css`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `adapters/libreoffice/common/command-dispatch-mapper.js`
- `platform/commands/command-definitions.js`
- `platform/i18n/strings-vi.js`
- `platform/i18n/strings-en.js`
- `tests/unit/sheet-data-tools.test.js`
- `tests/live/sheet-data-tools.playwright.mjs`
- `tests/run-tests.js`
- `docs/HANDOFF-SHEET-DATA-TAB-GAPS.md`

COMMANDS RUN:

- `node --check` trên các source/test mới và thay đổi
- `git diff --check`
- `node -e "import('./tests/unit/sheet-data-tools.test.js')..."`
- `node tests/live/sheet-data-tools.playwright.mjs`
- `node tests/run-tests.js` (đo thời gian bằng PowerShell Stopwatch)

BUILD RESULT: PASS — dự án không có bước bundle/build riêng; syntax/import checks nằm trong full suite đều PASS.

TEST RESULTS:

- PASS — Data tools unit/behavior: 6/6.
- PASS — Edge Playwright thật qua `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`: ribbon, SVG, thứ tự nhóm, nhập bàn phím, kéo chọn bằng chuột, global command bus, dialog, mutation và Ctrl+Z.
- PASS — Full suite: 634/634, 0 FAIL.
- PASS — Full suite elapsed: 11.91 giây, dưới giới hạn 60 giây.

KNOWN FAILURES: Không có failure đã biết trong các test đã chạy.

RISKS:

- Flash Fill cố ý chỉ hỗ trợ các pattern đã liệt kê; pattern phức tạp trả cảnh báo rõ.
- Subtotal dựa vào dữ liệu đã sort; nếu chưa sort, mỗi đoạn khóa liên tiếp được xem là một nhóm riêng.
- Advanced Filter vẫn chưa có command riêng (ngoài danh sách triển khai cụ thể của task).

DEPENDENCIES/BLOCKERS: Không có.

CORE PATCH ID (if any): Không có — không sửa Core/upstream.

NEXT ACTION: Reviewer chạy lại full suite và Playwright; nếu cần Advanced Filter, tạo task riêng để chốt semantics điều kiện/range trước khi triển khai.
