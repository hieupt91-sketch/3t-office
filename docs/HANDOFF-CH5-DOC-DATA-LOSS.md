# CH-5.6 — Bảo toàn đầu/chân trang, thay đổi và nhận xét khi lưu DOCX

TASK: CH-5.6 DATA LOSS ON SAVE, tiếp tục phiên bị cắt do usage limit.
AGENT/ROLE: Codex / Doc persistence và kiểm thử tích hợp được giao.
BRANCH: `fix/ch5-doc-save-data-loss-codex`.
WORKTREE: `E:\VNOffice-codex-ch56`.
OBJECTIVE: DOCX mở lại trong Doc/Word giữ đầu/chân trang, PAGE/NUMPAGES, trang đầu khác biệt, revisions với tác giả/thời gian và nhận xét có neo.

FINDINGS: LibreOffice HTML làm phẳng revisions/comments; UI metadata đầu/chân trang cần được đưa thành OOXML parts/references. Khi merge main, phải giữ cả serialize equations và review ranges. Nhập section từng thay toàn bộ đoạn break-before, làm mất chữ trong đoạn; tìm section bằng chữ cũng hỏng khi marker equation đã đổi thành OMML.

IMPLEMENTATION SUMMARY:
- Tái sử dụng LibreOffice HTML conversion và source-aware OOXML overlay. Đầu/chân trang có references, relationships và parts thực; sửa từng section không ghi đè header dùng chung của section khác.
- Dùng bookmark tạm cho ranges, metadata cục bộ có author/date; sau chuyển đổi dựng native w:ins/w:del, w:delText và comments.xml/range/reference. PDF/in dùng accepted view.
- Tài liệu nguyên trạng dùng nguyên bytes package gốc. Phần OMML chưa sửa được giữ; xác định section bằng bookmark trước rồi mới bằng chữ.
- Nhập section giữ đoạn có nội dung; đọc NUMPAGES riêng với PAGE. Review/comment qua ngắt đoạn tạo XML hợp lệ ở mức runs/paragraph.
- Cập nhật ba bài Trợ giúp tiếng Việt có sẵn: đầu/chân trang, Theo dõi thay đổi, Thêm ghi chú. DOCX giữ markup review; PDF dùng accepted view.

FILES CHANGED: `adapters/libreoffice/common/ooxml_zip_patch.py`, `adapters/libreoffice/writer/writer-adapter.js`, `main.py`, `platform/help/entries-writer.js`; các test review/export/roundtrip/desktop và kiểm tra xuất hiện hữu; plan/handoff này. Thay đổi từ main được giữ qua merge commit `6f65c3bf`.

COMMANDS RUN: xem ma trận kiểm thử cuối bên dưới. Chỉ CDP/WebView2 cho tương tác desktop, Word COM ẩn và tuần tự. Không sửa `E:\VN OFice`, không commit tài liệu công ty.
BUILD RESULT: NOT RUN — không có thay đổi build/package; các test import/runtime được chạy trong gate Node.
TEST RESULTS: Đang hoàn tất các gate; chỉ hàng có bằng chứng kết thúc mới được đánh PASS.

| Gate | Trạng thái | Bằng chứng |
|---|---|---|
| Python review pipeline | PASS | `E:\tmp\ch56-resume\review-python-verified.log`: 8 tests, OK; mới, nguyên trạng bytes, body-only, header/footer edits, cross-paragraph ranges, equation/section interaction. |
| CDP save/reopen (synthetic Word package) | PASS | `desktop-fixed-equation-cdp.log`: nhập header, tracking, comment, Ctrl+S, mở lại thấy đủ. Word phase deferred, ghi NOT RUN trong log. |
| Hidden Word COM + Word-authored package | NOT RUN | Chờ lượt layout audit kết thúc. |
| Desktop new Doc package | NOT RUN | Chờ lượt layout audit kết thúc. |
| Full Node gate | NOT RUN | Lượt cuối đang chạy; các lượt trước có lỗi tải đồng thời và lỗi Help đã sửa. |
| Full Python gate | NOT RUN | Những lượt đầu đã dừng để tránh COM chạy đồng thời với audit; chưa có kết quả full-suite cuối. |
| Legacy layout gate | NOT RUN | Batch đang chạy; phải chạy lại d03/d06 lỗi chuyển đổi/khởi động trong lượt tải đồng thời. |
| git diff --check | PASS | Đã chạy, không lỗi whitespace/markers. |

KNOWN FAILURES: Lượt CDP đầu phát hiện mất nội dung đoạn section khi mở lại và header edit khi equation ở đầu section; đã sửa và có kiểm thử hồi quy. Các lượt Node trước có FODS conversion/cleanup EBUSY và smoke mount timeout dưới tải đồng thời. Không đổi expected output, không disable test.
RISKS: UI chưa cung cấp tạo/trả lời threaded comments; lưu nguyên trạng giữ trọn package gốc. Theo dõi thay đổi qua ranh giới bảng chưa được hỗ trợ; save báo lỗi, không ghi đè bản gốc. Không claim hỗ trợ mọi loại revision phi văn bản.
DEPENDENCIES/BLOCKERS: LibreOffice, WebView2, Word COM cục bộ; audit d10 có thể BLOCKED bởi Word modal. Report main được cung cấp chỉ có d02/d03/d07/d23, nên chỉ so trực tiếp canvas main cho các hàng có trong report; toàn bộ file được so baseline sections-fixed và Word gốc.
CORE PATCH ID (if any): None.
NEXT ACTION: Hoàn tất gates, commit trên nhánh này; owner review/merge, không tự merge main.

Legacy audit: bản copy `scripts/layout-audit/_batch_writer_legacy.py` giữ UNTRACKED. Chỉ thay kênh JS thành WebView2 CDP và dùng dải cổng test riêng, giữ thao tác bold + ZZ và Word PDF oracle. Artifact/CDP helper/công ty DOCX ở `E:\tmp\ch56-resume`, ngoài Git. Script legacy cũ dùng trực tiếp evaluate_js nên không chạy bản đó trái quy tắc CDP-only.
