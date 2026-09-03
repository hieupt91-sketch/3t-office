# Agent Handoff
TASK: Hoàn thiện Sheet Charts thật
AGENT/ROLE: Codex — implementation
BRANCH: feature/sheet-charts
WORKTREE: E:\VNOffice-codex-charts
OBJECTIVE: Chèn, lưu, cập nhật, cô lập và xóa SVG chart từ vùng ô thật.
FINDINGS: Callback cũ chỉ báo thành công với dữ liệu hardcode; command insert và UNO mapping đã tồn tại.
IMPLEMENTATION SUMMARY: Dùng `extractRangeData()` trên selection; state `chartsBySheet`; render SVG overlay; refresh sau cập nhật ô; render lại khi đổi sheet; nút xóa thật.
FILES CHANGED: apps/sheet/sheet-chart.js; apps/sheet/sheet-grid.js; tests/unit/sheet-charts.test.js; tests/run-tests.js; docs/FEATURE-PARITY-ROADMAP.md; docs/HANDOFF-SHEET-CHARTS.md
COMMANDS RUN: node --check apps/sheet/sheet-grid.js; node --check apps/sheet/sheet-chart.js; node tests/run-tests.js
BUILD RESULT: PASS (repo không có build step; syntax check PASS)
TEST RESULTS: PASS — 202/202
KNOWN FAILURES: Không có.
RISKS: Chart hiện là state phiên làm việc; chưa serialize vào XLSX/ODS.
DEPENDENCIES/BLOCKERS: Không có.
CORE PATCH ID (if any): N/A
NEXT ACTION: Claude review và merge; không tự merge vào main.
