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
- Bố cục trang: A4 ngang và lề trên/dưới 25 mm, trái/phải 20 mm khớp Word COM qua DOCX đã lưu; preset lề, Letter/A5, ngắt trang/mục, đầu/chân trang, trang đầu khác và số trang chưa chạy.
- Kiểu/Tham chiếu: Tiêu đề 1 lưu DOCX và Word đọc lại `Heading 1`; TOC count 1 và footnote count 1 (nội dung rỗng) khớp DOCX Word tạo. Chưa chạy TOC refresh, endnote, Heading 2/3/Normal/Title/Quote, tham chiếu chéo/danh mục hình. Lệch format Heading 1–3 đã ghi vẫn còn; chưa đổi semantics style/theme.
- Ghi chú: comment `Audit note` trên scope `Alpha` khớp Word COM về count, Author `3T Office`, Scope và Text. Done/Resolved và sửa/xóa/điều hướng chưa chạy.
- Theo dõi thay đổi: chèn ` added` tạo một Revision Type 1, Author `3T Office`, text `added` trong cả app DOCX và Word COM DOCX. Chưa chạy xóa, accept/reject, bulk operations hoặc round-trip revision có sẵn.
- Unittest đầu tiên dùng LOCALAPPDATA hệ thống, va chạm với LibreOffice của worktree khác. Chạy lại bằng profile riêng thì 832 tests OK.
IMPLEMENTATION SUMMARY: Hai commit audit bảng trước đó thêm harness desktop CDP. Các lượt tiếp theo xác nhận A4 ngang/lề 25/20 mm và cấu trúc Heading 1 + TOC + footnote bằng thao tác chuột/phím CDP, lưu DOCX và đọc lại bằng Word COM; cập nhật ma trận và vị trí tra cứu Trợ giúp.
FILES CHANGED: `docs/AUDIT-DOC-WORD-PARALLEL-1011.md`, `docs/AGENT-HANDOFF-FIX-T8-CODEX.md`.
COMMANDS RUN:
- `make-template.ps1 -Dir E:\VNOffice-profiles\codex-ft8` — PASS.
- App desktop table insert + Word COM readback — KHỚP 3 hàng × 4 ô.
- App desktop Page Setup qua CDP + Word COM — A4 landscape, margins 25/20 mm KHỚP; DOCX tại profile `E:\VNOffice-profiles\codex-ft8`.
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
NEXT ACTION: Hoàn thành các phép con còn thiếu của Bố cục trang, rồi lần lượt đối chiếu Styles/References và các nhóm Comments, Track Changes, Find/Replace, Symbols, Textbox/Images; mỗi nhóm commit riêng.
