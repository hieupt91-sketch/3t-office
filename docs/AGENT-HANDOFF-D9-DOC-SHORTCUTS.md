# Agent Handoff
TASK: D9 — đối chiếu phím tắt VN Writer
AGENT/ROLE: Codex / audit
BRANCH: test/doc-shortcuts-codex
WORKTREE: E:\VNOffice-codex-d9
OBJECTIVE: Đo hành vi thực tế của phím tắt Writer qua CDP và ghi kết quả/chẩn đoán.
FINDINGS: 42 tổ hợp trong scope; 9 có bằng chứng hành vi, 2 sai theo trạng thái DOM quan sát, 1 xung đột/chưa undo theo dấu kiểm text, 30 còn thiếu phép kiểm chứng đáng tin. Ctrl+B/U cần tái hiện với vùng chọn trước khi quy kết lỗi.
IMPLEMENTATION SUMMARY: Thêm script audit CDP và báo cáo chi tiết. Không sửa command/app do tín hiệu còn mơ hồ. `node tests/run-tests.js` đạt 2809/2809.
FILES CHANGED: scripts/audit-0610/doc_shortcuts.mjs; docs/AUDIT-DOC-SHORTCUTS-0610.md; docs/AGENT-HANDOFF-D9-DOC-SHORTCUTS.md
COMMANDS RUN: `node --experimental-websocket scripts/audit-0610/doc_shortcuts.mjs`; `node tests/run-tests.js`
BUILD RESULT: NOT RUN (không yêu cầu build riêng).
TEST RESULTS: `node tests/run-tests.js` PASS, 2809/2809; audit CDP chạy và tạo bảng kết quả.
KNOWN FAILURES: Phép đo Ctrl+B/U false với caret chưa đủ chứng minh lỗi; Ctrl+Z chưa cô lập action; các phím còn lại cần precondition/assertion riêng.
RISKS: Bộ phân loại “Thiếu” nghĩa là thiếu bằng chứng, không kết luận phím không hoạt động. Audit khởi chạy được qua Node 20 cần cờ `--experimental-websocket`.
DEPENDENCIES/BLOCKERS: WebView2 desktop và Node WebSocket experimental.
CORE PATCH ID (if any): N/A
NEXT ACTION: Cải thiện fixture DOM theo từng thao tác để kiểm chứng các 30 phím còn thiếu; xác minh Ctrl+B/U bằng vùng chọn văn bản.
