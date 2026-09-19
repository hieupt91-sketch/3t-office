# Agent Handoff

TASK: Sheet residuals round 8
AGENT/ROLE: Codex / Sheet owner
BRANCH: fix/sheet-residuals-r8
WORKTREE: current worktree
OBJECTIVE: Giảm tổng sai lệch 6 mẫu từ 40 xuống không quá 5, giữ Excel mở được và lint sạch.
FINDINGS: Các lớp gốc gồm đoạn rỗng đầu chuỗi, lượng tử hóa width, cache công thức, ô lỗi trong covered cell, tên sheet escape, centerContinuous và drawing linked/grouped.
IMPLEMENTATION SUMMARY: Bổ sung overlay/import/serialize và hậu xử lý theo từng lớp; style nguồn chỉ qua `_SourceXfCopier`; drawing passthrough chép đủ media nội bộ.
FILES CHANGED: adapters/libreoffice/common/ooxml_zip_patch.py; adapters/libreoffice/sheet/sheet-adapter.js; tests/test_sheet_residuals_r8.py; tests/unit/sheet-import-cell-styles.test.js; docs/QUY-UOC-DOI-CHIEU.md.
COMMANDS RUN: baseline/final batch audit tuần tự; unittest Sheet; syntax check; Node suite.
BUILD RESULT: PASS — syntax 92/92; 6/6 tệp Excel mở được; lint 6/6 sạch.
TEST RESULTS: PASS — Python Sheet 156 test; Node 1779/1779; batch tổng 40 xuống 3 (0, 2, 0, 0, 0, 1).
KNOWN FAILURES: Còn 2 sai lệch layout trên một sheet có ký tự điều khiển trong tên và 1 sai lệch hiện diện sheet metadata; đều nằm trong ngưỡng nghiệm thu.
RISKS: Hai sai lệch layout còn lại liên quan tên sheet chứa ký tự điều khiển; một metadata-only workbook vẫn được auditor tính khác biệt hiện diện sheet.
DEPENDENCIES/BLOCKERS: Không.
CORE PATCH ID (if any): Không sửa Core.
NEXT ACTION: Người phụ trách có thể đo lại độc lập từ commit này.
