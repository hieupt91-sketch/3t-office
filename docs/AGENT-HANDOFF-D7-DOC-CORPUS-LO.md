# Agent Handoff

TASK: Ticket D7 — đo độ trung thực roundtrip VN Writer trên corpus `.doc`/`.docx` bằng LibreOffice làm chuẩn.
AGENT/ROLE: Codex / audit
BRANCH: `test/doc-corpus-lo-codex`
WORKTREE: `E:\VNOffice-codex-corpus2`
OBJECTIVE: Tạo script chạy lại được và báo cáo số trang, chênh ký tự, trạng thái cho 44 tài liệu thật; không sửa ứng dụng hoặc tài liệu nguồn.
FINDINGS: 42 PASS, 1 FAIL (`legacy13.doc`, P0=1, P1=2, chênh ký tự 0,044%), 1 BLOCKED (`d10.docx`, hai lần thử LibreOffice `convert-to txt:Text` lỗi ghi tệp).
IMPLEMENTATION SUMMARY: Script chuyển đổi bằng LibreOffice profile riêng, gọi roundtrip-file qua CDP tuần tự với `VNO_CDP_LOCALAPPDATA` riêng cho từng lượt, đo P0/P1/P2 và đếm ký tự không khoảng trắng; cập nhật báo cáo sau mỗi tài liệu.
FILES CHANGED: `scripts/audit-0610/corpus_pages_lo.py`, `docs/AUDIT-DOC-CORPUS-0610.md`, handoff này.
COMMANDS RUN: `python -m py_compile scripts/audit-0610/corpus_pages_lo.py`; `python scripts/audit-0610/corpus_pages_lo.py`; thử lại riêng phép audit `d10.docx`.
BUILD RESULT: NOT RUN (không đổi ứng dụng).
TEST RESULTS: Audit corpus hoàn tất 44/44; script cú pháp hợp lệ. Word COM không chạy vì hộp thoại “Word không phải chương trình mặc định”; số trang Word thật chưa đo.
KNOWN FAILURES: `legacy13.doc` lệch một trang sau lưu Writer. `d10.docx` bị BLOCKED ở trích xuất TXT bởi lỗi LibreOffice nêu trong báo cáo.
RISKS: Đối chiếu phân trang lấy LibreOffice làm chuẩn thay thế; P2 được báo cáo riêng, không nằm trong tiêu chí PASS.
DEPENDENCIES/BLOCKERS: LibreOffice local, Node.js/WebView2 app runtime, corpus tại hai đường dẫn tuyệt đối đã yêu cầu.
CORE PATCH ID (if any): Không có.
NEXT ACTION: Xem thủ công `legacy13.doc`; điều tra lỗi LibreOffice TXT với `d10.docx` nếu cần.
