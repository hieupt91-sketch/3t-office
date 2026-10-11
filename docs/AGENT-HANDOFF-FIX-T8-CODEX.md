# Agent Handoff
TASK: `docs/tickets-0710/TICKET-FIX-T8.md` — đối chiếu Writer với Word COM.
AGENT/ROLE: Codex — Writer audit.
BRANCH: `audit/doc-office-parity-2-codex`.
WORKTREE: `E:\VNOffice-codex-ft8`.
OBJECTIVE: Thực hiện bốn nhóm đối chiếu FIX-T8 theo Word COM làm chuẩn.
FINDINGS:
- App desktop và Word COM cùng lưu/đọc bảng 3×4; số hàng và số ô từng hàng khớp.
- Bảng: thêm hàng dưới, thêm cột phải, xóa hàng, gộp/tách ngang, căn giữa dọc và lặp hàng tiêu đề khớp thuộc tính đọc lại. Ctrl+Z/Undo sau tách đều khôi phục trạng thái gộp.
- Cột 1/2/3 đã có kết quả 3/3 KHỚP từ lần audit trước. Heading 1–3 có sai khác style đã được ghi trước đó.
- Unittest đầu tiên dùng LOCALAPPDATA hệ thống, va chạm với LibreOffice của worktree khác. Chạy lại bằng profile riêng thì 832 tests OK.
IMPLEMENTATION SUMMARY: Thêm harness desktop click ribbon bằng CDP mouse cho chèn/sửa bảng và lưu DOCX vào profile audit. Cập nhật ma trận, kế hoạch FIX-T8 và trạng thái các nhóm.
FILES CHANGED: `scripts/audit-0610/word_parallel/{README.md,app-table-insert.desktop.mjs}`, `docs/AUDIT-DOC-WORD-PARALLEL-1011.md`, `docs/AGENT-HANDOFF-FIX-T8-CODEX.md`.
COMMANDS RUN:
- `make-template.ps1 -Dir E:\VNOffice-profiles\codex-ft8` — PASS.
- App desktop table insert + Word COM readback — KHỚP 3 hàng × 4 ô.
- Batch `d01,d07,d13,d20,d24` — 5/5 PASS, page delta 0, edit PASS.
- `npm test` — 3058/3058 PASS.
- `python -m unittest discover -s tests` với `LOCALAPPDATA=E:\VNOffice-profiles\codex-ft8\python-localappdata` — 832 tests OK.
- `git diff --check` — PASS.
BUILD RESULT: NOT RUN.
TEST RESULTS: Xem COMMANDS RUN; lần unittest đầu có 10 lỗi do dùng profile LibreOffice mặc định đang được worktree khác sử dụng. Các ca lỗi được lặp riêng và pass với profile riêng.
KNOWN FAILURES: FIX-T8 chưa hoàn tất. Trong nhóm Bảng, xóa cột, gộp/tách dọc, căn ngang, nền/viền, AutoFit và kích thước vẫn NOT RUN. Phép lề/hướng/khổ giấy, ngắt trang/mục, header/footer, số trang, nhóm style/reference và nhóm comment/revision/find/symbol/shapes vẫn NOT RUN, ngoại trừ kết quả cột và Heading đã ghi từ lần trước.
RISKS: Chưa có đủ dữ liệu để kết luận parity cho bốn nhóm. Không sửa adapter/core vì chưa tái hiện sai lệch trong phép đã chạy.
DEPENDENCIES/BLOCKERS: Word COM cục bộ; LibreOffice profile riêng cần giữ tách biệt cho các lần unittest và desktop.
CORE PATCH ID (if any): None.
NEXT ACTION: Tiếp tục từng phép thử còn NOT RUN trong FIX-T8; chỉ kết luận mỗi nhóm sau khi hoàn tất đối chiếu bằng Word COM, rồi commit riêng từng nhóm.
