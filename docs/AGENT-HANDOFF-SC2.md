# Agent Handoff

TASK: TICKET-SC2 — nghiệm thu ma trận cắt/sao chép/dán Sheet desktop
AGENT/ROLE: Codex / Sheet owner
BRANCH: fix/sheet-paste-matrix-codex
WORKTREE: E:\VNOffice-codex-sc2
OBJECTIVE: Nghiệm thu copy/cut/paste nội bộ, Excel/web, Doc/Slide và Ctrl+Shift+V; sửa từng lỗi có unit test.
FINDINGS: Một lỗi thật: clipboard model làm rơi độ rộng cột và history paste chưa lưu layout; desktop đo đích 64 px thay vì 111/144/177 px.
IMPLEMENTATION SUMMARY: Truyền colWidths qua SheetAdapter, áp layout trong applyPasteSpecial và gộp before/after layout vào một batch-cells Undo/Redo; thêm desktop CDP matrix chạy cross-app tuần tự.
FILES CHANGED: adapters/libreoffice/sheet/sheet-adapter.js; apps/sheet/sheet-grid.js; scripts/layout-audit/_excel_open_test.ps1; scripts/layout-audit/batch_document_audit.py; tests/live/cdp/actions.mjs; tests/live/cdp/roundtrip-file.mjs; tests/live/sheet-user-flows.desktop.mjs; tests/unit/sheet-copy-paste-format.test.js; docs/AUDIT-SHEET-USERFLOWS-0710.md; docs/AGENT-HANDOFF-SC2.md.
COMMANDS RUN: node --input-type=module -e (runSheetCopyPasteFormatTests); python -m py_compile scripts/layout-audit/batch_document_audit.py; node --experimental-websocket tests/live/sheet-user-flows.desktop.mjs; node tests/run-tests.js; python -m unittest discover -s tests. Một lần thử batch XLSX trước quy tắc mới đã được hủy khi phát hiện Excel COM đang bận; không chạy lại batch 28 tệp.
BUILD RESULT: PASS — Node suite 2957/2957.
TEST RESULTS: Sau merge main: desktop 7/7 PASS; unit riêng 6/6 PASS; Node 2957/2957 PASS; Python 793/793 PASS; batch XLSX NOT RUN theo quy tắc mới.
KNOWN FAILURES: Lần Python đầu gặp race dọn thư mục tạm updater; test đơn PASS và full rerun PASS. Lần XLSX đầu bị hủy vì worktree E:\VNOffice-agy-sb10 đang chạy cùng audit/Excel COM.
RISKS: Clipboard Windows có thể chuẩn hóa màu hex thành rgb; Excel COM dùng chung máy nên batch phải chạy độc quyền.
DEPENDENCIES/BLOCKERS: Không có. Đã merge main tại cae2bcef; xung đột batch audit được giải bằng cách giữ API reuse_saved và quản lý PID Office từ main; xmlns:loext chỉ còn một khai báo.
CORE PATCH ID (if any): N/A — không sửa Core/upstream.
NEXT ACTION: Sẵn sàng bàn giao/merge; không push. Batch 28 XLSX để Claude chạy theo phân công mới.
