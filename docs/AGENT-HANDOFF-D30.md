# Agent Handoff
TASK: D30 — Kiểm chứng các dòng ma trận GAP còn lại (chỉ script + báo cáo)
AGENT/ROLE: Codex / QA audit
BRANCH: test/doc-matrix-dialog-rows-codex
WORKTREE: E:\VNOffice-codex-d30
OBJECTIVE: Kiểm chứng bằng thao tác CDP thật các dòng còn lại trong `docs/GAP-DOC-VS-WORD-0610.md`, lưu/đọc DOCX khi cần, không sửa mã sản phẩm.
FINDINGS: 25 dòng đã chạy; 22 PASS, 3 FAIL, 0 BLOCKED. FAIL: mẫu hành chính chỉ đổi tên tài liệu nhưng không sinh nội dung; thanh trạng thái vẫn báo trang 1 khi caret ở trang 3; Cửa sổ mới bị popup blocker chặn.
IMPLEMENTATION SUMMARY: Thêm `doc_matrix_verify2.mjs` dùng `launchApp`, CDP keyboard/mouse, `LOCALAPPDATA` riêng, kiểm tra DOM + XML DOCX và reopen; bổ sung bảng kết quả từng dòng vào cuối ma trận.
FILES CHANGED: `scripts/audit-0610/doc_matrix_verify2.mjs`; `docs/GAP-DOC-VS-WORD-0610.md`; `docs/AGENT-HANDOFF-D30.md`.
COMMANDS RUN: `node --check scripts/audit-0610/doc_matrix_verify2.mjs`; `node --experimental-websocket scripts/audit-0610/doc_matrix_verify2.mjs`.
BUILD RESULT: NOT RUN — task chỉ thêm script audit và tài liệu, không đổi mã sản phẩm/build.
TEST RESULTS: `node --check` PASS. Acceptance chạy đủ: 22 PASS, 3 FAIL, 0 BLOCKED; exit code 1 do ba lỗi sản phẩm được phát hiện.
KNOWN FAILURES: `Trang đầu/Mẫu hành chính`; `Xem/Trang hiện tại/thanh trạng thái`; `Xem/Cửa sổ mới` — nguyên nhân chi tiết nằm trong bảng cập nhật D30.
RISKS: Nhánh Excel của dòng nguồn CSV/Excel chưa được khẳng định riêng; D30 đã kiểm đúng nguồn CSV theo ticket. Artifact DOCX nằm trong thư mục tạm của lần chạy và không commit.
DEPENDENCIES/BLOCKERS: Không có blocker; không dùng picker hệ điều hành vì nguồn CSV được nhập qua UI dán thủ công.
CORE PATCH ID (if any): N/A
NEXT ACTION: Tạo ticket sửa riêng cho ba FAIL; sau khi sửa, chạy lại nguyên lệnh acceptance D30 và cập nhật ma trận, không đổi expected để làm xanh.
