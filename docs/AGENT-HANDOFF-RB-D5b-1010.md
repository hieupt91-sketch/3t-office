# Agent Handoff
TASK: RB-D5b — hoàn tất audit NOT RUN của tab Đánh giá và Chế độ xem
AGENT/ROLE: Codex / Writer audit
BRANCH: audit/doc-review-view-b-codex
WORKTREE: E:\VNOffice-codex-rd5b
OBJECTIVE: Kiểm tra các mục NOT RUN trên DOCX có heading; lưu DOCX thật, đọc OOXML và đối chiếu Word COM; sửa lỗi nhỏ trong vùng Writer được giao và tạo handoff cho lỗi thuộc adapter.
FINDINGS: `d13.docx` có 42 heading ngữ nghĩa, 335 `w:p` (326 đoạn có chữ), không có comment/revision lúc đầu. Đếm từ sau sửa khớp đoạn 326; Word count 2764 so với app 2761, ký tự không khoảng trắng 13376/13256, ký tự có khoảng trắng 16004/15655, dòng 485/1093. Ba ghi chú roundtrip đủ sau thêm/xóa; trạng thái resolved chỉ đổi trong UI và mất khi lưu DOCX. Hai thay đổi tách đoạn roundtrip thành 2 `w:ins`; Next/Previous điều hướng đúng. Ngăn dẫn hướng tìm thấy 42 heading và Ctrl+Alt+N hoạt động; Cửa sổ mới tạo target CDP thứ hai. Macro bật/tắt bằng nút và Ctrl+Shift+R; trình quản lý rỗng; không ghi/chạy macro có hành động. Toggle chính tả làm marker thay đổi khi bật lại; command không có shortcut riêng, F7 gọi Soát lỗi AI nên không chạy.
IMPLEMENTATION SUMMARY: Sửa `countBlockParagraphs` để không đếm `<li>`/`blockquote` thêm lần nữa khi nội dung có paragraph con; thêm unit test nested list. Commit sửa: `c117112b` (`fix(writer): avoid double-counting list paragraphs`). Thêm kết quả audit vào `docs/AUDIT-DOC-RIBBON-REVIEW-VIEW-1010.md`, các mục cần làm vào `docs/RIBBON-BACKLOG.md`, handoff này. Không sửa adapter.
FILES CHANGED: `apps/writer/word-count.js`; `tests/unit/writer-word-count.test.js`; `docs/AUDIT-DOC-RIBBON-REVIEW-VIEW-1010.md`; `docs/RIBBON-BACKLOG.md`; `docs/AGENT-HANDOFF-RB-D5b-1010.md`.
COMMANDS RUN: `npm test`; `python -m unittest discover -s tests`; CDP desktop qua `tests/live/cdp/session.mjs` với `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-rd5b` (mỗi phiên một cổng riêng; ví dụ 64389, 65103, 50435, 51589); `git diff --check`; Python ZIP/XML probes và Word COM oracle scratch script ngoài repo. Tệp DOCX kết quả chỉ trong `E:\VNOffice-profiles\codex-rd5b\artifacts\`.
BUILD RESULT: NOT RUN — không đổi build system.
TEST RESULTS: PASS — `npm test` 3029/3029; Python unittest 811 tests, OK (có ResourceWarning về hai file descriptor chưa đóng); CDP: spell toggle marker 0→0→686, comment insert/delete/save, 42 heading + Ctrl+Alt+N, two separate tracked revisions + next/previous, new window 1→2 target, macro start/stop/manager. PASS — unit + CDP đếm đoạn sau sửa 326 khớp Word. FAIL — Word count/characters/lines còn lệch; comment resolved state không sống qua DOCX roundtrip. NOT RUN — F7/AI, chạy macro đã lưu (không có macro), build.
KNOWN FAILURES: Word COM: words 2764, app 2761; characters 13376/13256 without spaces, 16004/15655 with spaces; lines 485/1093. Comment `Done` sau Word COM reopen vẫn false cho cả hai ghi chú trong `comments-after-resolve.docx`; ZIP không có resolved OOXML part/flag. F7 không chạy vì có thể gửi nội dung cho AI.
RISKS: Word line count có thể lệ thuộc khác biệt phân trang giữa Word và canvas. Test artifacts chứa bản sao nội dung `d13.docx`, chỉ ở profile cục bộ, không được commit. Không chụp ảnh/không gửi tài liệu ra AI/cloud. Word COM do lượt này tạo: PID 11764, 15696, 4684; đã thoát theo PID. WINWORD có sẵn PID 11208 được để nguyên.
DEPENDENCIES/BLOCKERS: Cần owner `adapters/` sửa serialization OOXML trạng thái resolved và thêm XML + Word COM regression. Writer owner cần điều tra parity từ/ký tự/dòng. Word COM cục bộ dùng làm oracle.
CORE PATCH ID (if any): N/A — không sửa LibreOffice Core.
NEXT ACTION: Owner adapter xử lý `commentsExtended`/resolved-state roundtrip; Writer owner điều tra count parity, giữ `d13` Word COM baseline. Sau thay đổi adapter, lưu DOCX và kiểm `comments.xml`, comment ranges, resolved flags, Word `Comment.Done`.
DELTA 3 DÒNG:
- Review/View: 42 heading; Ngăn dẫn hướng/Ctrl+Alt+N, Cửa sổ mới, comment Next/Previous/Delete và revision Next/Previous chạy; resolved state mất khi roundtrip Word.
- Đếm từ: đoạn sửa 446 → 326, khớp Word; còn từ lệch 3, ký tự lệch 120/349, dòng lệch 608. Spell toggle chuyển UI/marker thật; không có shortcut riêng, không chạy F7.
- Kiểm thử: npm 3029/3029 PASS; Python 811 PASS; CDP dùng profile riêng; Word COM PIDs riêng đã thoát, PID có sẵn 11208 còn nguyên; commit code `c117112b`.

