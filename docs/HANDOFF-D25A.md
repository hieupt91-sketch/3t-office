# Agent Handoff
TASK: D25a — Xuất toán tử IF `contains` thành trường Word thật
AGENT/ROLE: Codex / Integration
BRANCH: fix/doc-if-contains-codex
WORKTREE: E:\VNOffice-codex-d25a
OBJECTIVE: Xuất quy tắc Writer `contains` thành trường IF DOCX dùng wildcard Word, đồng thời giữ nguyên nội dung gốc khi giá trị chứa wildcard do người dùng nhập.
FINDINGS: Word IF biểu diễn phép chứa bằng toán tử `=` và toán hạng phải `*giá trị*`; giá trị chứa `*` hoặc `?` không thể chuyển đổi chính xác.
IMPLEMENTATION SUMMARY: Bổ sung ánh xạ `contains` sang `=`, bao giá trị bằng `*`; bỏ qua chuyển đổi nếu giá trị có `*` hoặc `?`. Các toán tử cũ không đổi.
FILES CHANGED: adapters/libreoffice/common/ooxml_zip_patch.py; tests/test_writer_notes_export.py; docs/HANDOFF-D25A.md
COMMANDS RUN: `python -m pytest tests/test_writer_notes_export.py -q`; `node tests/run-tests.js`; Word COM automation với file DOCX tạm; `git diff --check`.
BUILD RESULT: NOT RUN — task không yêu cầu build riêng; bộ kiểm thử Node đầy đủ đã chạy.
TEST RESULTS: PASS — pytest 25/25; PASS — Node 2827/2827; PASS — git diff --check.
KNOWN FAILURES: Không có FAIL mới.
RISKS: Phép thử Word thật chưa xác nhận được trong môi trường hiện tại; logic OOXML và regression đã được kiểm tra tự động.
DEPENDENCIES/BLOCKERS: BLOCKED — Word COM có đăng ký nhưng phiên automation ẩn không trả kết quả sau hơn 176 giây; có nhiều phiên Word automation từ worktree khác nên không can thiệp hoặc kill theo tên.
CORE PATCH ID (if any): Không có; chỉ sửa VN LibreOffice Adapter.
NEXT ACTION: Chạy lại phép thử Word COM trên máy/phiên Word sạch: mở DOCX, khóa kết quả MERGEFIELD lần lượt thành chuỗi có/không có `abc`, gọi `Fields.Update`, xác nhận kết quả `dung`/`sai`.
