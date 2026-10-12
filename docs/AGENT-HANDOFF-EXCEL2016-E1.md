# Agent Handoff

TASK: Luồng E1 — đối chiếu hàm VN Sheet với Excel 2016
AGENT/ROLE: Codex / Sheet implementation + audit
BRANCH: `fix/excel-e1-codex`
WORKTREE: `E:\VNOffice-codex-fe1`
OBJECTIVE: Bổ sung hàm Excel 2016 còn thiếu, sửa khác biệt đã xác định, đo từng hàm bằng app desktop/CDP và Excel 2016 COM ReadOnly, đồng thời ghi hướng dẫn tiếng Việt trong app.
FINDINGS:
- Catalog Microsoft: 462 hàm duy nhất; 424 thuộc Excel 2016, 38 có mốc sau 2016. 137 hàm được nhập/đọc qua app desktop và Excel COM; 118 ca scalar so sánh được đều khớp. 337 mục trong ma trận chưa chạy COM; các chiều rỗng/lỗi/kiểu trộn/cả cột chưa được kiểm đầy đủ, ngoại trừ ca mảng TRANSPOSE.
- Ca CSE TRANSPOSE đã được nhập bằng chuột/phím qua CDP và đọc lại bằng Excel COM ReadOnly: vùng D1:E3 trả sáu giá trị đúng.
- 28 workbook: 400/72.837 ô khớp (0,55%) so với baseline tag 0.9.9 là 50,96%; cổng cache FAIL. Xem `docs/EXCEL2016-E1-CACHE-GATE.md`. Sai lệch nền P1b đã có trước E1; xem `docs/tickets-0710/FIX-P1b.md`.
- `RANK.EQ` và `FORMULATEXT` cần `_xlfn.` trong OOXML để Excel 2016 tính sau khi mở. Kế hoạch thay đổi đường lưu đã ghi tại `docs/PLAN-EXCEL-2016-E1-OOXML-COMPAT.md`, chưa triển khai vì ảnh hưởng ngữ nghĩa lưu XLSX và cần quyết định theo AGENTS.
IMPLEMENTATION SUMMARY: Bổ sung/điều chỉnh hàm tương thích, tên hàm có chữ số, xử lý công thức mảng CSE TRANSPOSE, và hướng dẫn cụ thể tiếng Việt trong Trợ giúp. Bổ sung catalog chính thức, ma trận, probe CDP/COM và báo cáo kiểm chứng.
FILES CHANGED: `apps/sheet/formula-engine.js`; `apps/sheet/sheet-grid.js`; `platform/help/entries-sheet.js`; `docs/EXCEL2016-*`; `docs/PLAN-EXCEL-2016-E1-*`; `scripts/audit-0610/*`; `tests/unit/sheet-*` và runner.
COMMANDS RUN:
- `npm test` — PASS, 3132/3132.
- `python -m unittest discover -s tests` — PASS, 912 tests.
- Batch XLSX 8 workbook — PASS, 8/8.
- `sheet_formulas_vs_cache` 28 workbook — FAIL theo cổng baseline (0,55% < 50,96%).
- Desktop CDP + Excel 2016 COM ReadOnly, mỗi lần một workbook; không dùng SendKeys/OS input, không lưu từ Excel.
BUILD RESULT: NOT RUN.
TEST RESULTS: Ba cổng npm/Python/batch PASS theo kết quả thực chạy; cổng 28 workbook FAIL như trên. Ma trận COM có giới hạn nêu trong FINDINGS.
KNOWN FAILURES: Cache gate 28 workbook thấp hơn baseline; 337 hàm chưa được COM audit; serializer `_xlfn.` chưa thay đổi.
RISKS: Thay đổi serializer sẽ thay output XLSX và cần review tương thích/rollback; chỉ thực hiện sau khi có quyết định. Dữ liệu ví dụ workbook không được đưa vào handoff.
DEPENDENCIES/BLOCKERS: Quyết định có triển khai adapter mapping `_xlfn.` cho `RANK.EQ`/`FORMULATEXT`; xử lý hồi quy P1b thuộc ticket có trước E1.
CORE PATCH ID (if any): Không.
NEXT ACTION: Nhận quyết định về thay đổi đường lưu XLSX; xử lý P1b theo ticket riêng; tiếp tục COM audit các hàm và chiều kiểm tra còn NOT RUN. Không coi E1 hoàn tất khi cổng cache chưa đạt baseline.
