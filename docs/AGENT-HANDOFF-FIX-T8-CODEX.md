# Agent Handoff
TASK: FIX-T8 — đối chiếu VN Writer với Word COM trên worktree hiện tại.
AGENT/ROLE: Codex — Writer audit.
BRANCH: `audit/doc-office-parity-2-codex`.
WORKTREE: `E:\VNOffice-codex-ft8`.
OBJECTIVE: Hoàn tất tuần tự 10 nhóm FIX-T8, sửa sai lệch tái hiện, giữ DOCX nhập, cập nhật Help/i18n và xác nhận bằng Word COM/CDP.
FINDINGS:
- Đã đo các nhóm Bảng, Bố cục trang, Heading 1–3, Kiểu/Tham chiếu, Ghi chú, Theo dõi thay đổi, Tìm/Thay, Ký hiệu, TextBox, hình khối và ảnh; các phép chính trong ma trận đều KHỚP sau lưu/mở.
- Heading defaults được giới hạn cho tài liệu mới; style/run của DOCX nhập được giữ. Shapes mới xuất native AutoShape; textboxes/shape nhập được giữ nguyên.
- Ranh chưa đo: sửa comment (UI chưa có), chế độ hiển thị revision và tác giả tùy chỉnh.
IMPLEMENTATION SUMMARY: Mỗi nhóm FIX-T8 có commit riêng; `main` merge trước Nhóm 1 và đồng bộ lại trước Nhóm 6. Help tiếng Việt cụ thể, nhãn/tooltip VI/EN đã cập nhật. Sửa test mock `classList.toggle`, thay branded UI wording, bỏ kiểm đếm lệnh ribbon cứng để kiểm tra invariant covered=live.
FILES CHANGED: `adapters/libreoffice/common/ooxml_zip_patch.py`, `adapters/libreoffice/writer/writer-adapter.js`, `apps/writer/writer.css`, `platform/help/entries-writer.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, tests Writer/Python và harness `scripts/audit-0610/word_parallel/`; `docs/AUDIT-DOC-WORD-PARALLEL-1011.md`, `docs/tickets-0710/TICKET-FIX-T8.md`.
COMMANDS RUN:
- App thao tác mouse/keyboard qua CDP và Word COM riêng theo từng nhóm; không dùng SendKeys/OS input. Kết quả và ảnh ở audit report.
- `npm test` với `VNO_APP_ROOT=E:\VNOffice-codex-ft8` — 3064/3064 PASS.
- `python -m unittest discover -s tests` với `LOCALAPPDATA=E:\VNOffice-profiles\codex-ft8\python-localappdata` — 855 tests OK.
- Batch DOCX d01,d02,d07,d13,d20,d24 với `VNO_APP_ROOT=E:\VNOffice-codex-ft8` — 6/6 PASS, edit PASS, page delta 0.
- `git diff --check` — PASS.
BUILD RESULT: NOT RUN.
TEST RESULTS: npm 3064/3064 PASS; unittest 855 OK (468.399s); DOCX batch 6/6 PASS. unittest in hai ResourceWarning về pipe chưa đóng; không có test fail.
KNOWN FAILURES: Không có test fail. Giới hạn đo lường ngoài ma trận: sửa comment, chế độ hiển thị revision và tác giả tùy chỉnh.
RISKS: Không có Core patch; thay đổi DOCX ở adapter và giới hạn style mới cho tài liệu trống.
DEPENDENCIES/BLOCKERS: Cần Word COM cục bộ để tái chạy audit đối chiếu; bộ nguồn DOCX tại `E:\VN OFice\file test\landocx`.
CORE PATCH ID (if any): None.
NEXT ACTION: Review các commits FIX-T8 và phần tổng kết audit; không còn phép chính nào trong scope ticket đang chờ.
