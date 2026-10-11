# Agent Handoff
TASK: `docs/tickets-0710/TICKET-FIX-T7.md` — DOCX parity với Word COM.
AGENT/ROLE: Codex — Writer adapter, OOXML export, audit harness.
BRANCH: `fix/doc-word-parity-t7-codex`.
WORKTREE: `E:\VNOffice-codex-ft7`.
OBJECTIVE: Sửa 4 sai lệch lưu DOCX và mở rộng đối chiếu song song Word COM theo T7.
FINDINGS:
- LO HTML import ghi `<w:position>` cho `<sup>/<sub>`; run có thể bị chia do bold/italic và có thể thiếu/kẹp khoảng trắng giữa HTML và XML. Ghép theo đoạn, ánh xạ run theo nội dung và giữ nguyên thuộc tính khác.
- Highlight màu chuẩn cần `<w:highlight>`; màu tùy biến giữ `<w:shd>`. Khi mở DOCX có highlight vàng và lưu lại, `w:highlight` được giữ.
- Abstract numbering đơn LO ghi `multilevel`; Word cần `hybridMultilevel`. Indent bị ghi 709/710 twips ở `w:ind` đoạn/level thay vì 720.
- `margin-bottom:0.28cm` quy đổi thành 159 twips; mặc định Word tương đương 8pt/160 twips.
IMPLEMENTATION SUMMARY: Hậu xử lý W22a nhận diện `sup/sub` và `vertical-align` bằng range; W22b map palette highlight Word, giữ shading màu tùy biến; chuẩn hóa numbering/indent danh sách một cấp; chuẩn hóa đúng trường hợp bottom margin 0.28cm. Mở rộng harness với profile/CDP riêng, baseline spacing, PID Word COM theo tiến trình Automation mới.
FILES CHANGED: `adapters/libreoffice/common/ooxml_zip_patch.py`, `tests/test_writer_word_parity_t7.py`, `scripts/audit-0610/word_parallel/{README.md,app-ops.desktop.mjs,make-template.ps1,word-compare.ps1}`, `docs/AUDIT-DOC-WORD-PARALLEL-1011.md`.
COMMANDS RUN:
- `python -m unittest tests.test_writer_word_parity_t7 -v` — 5 tests PASS.
- Focused legacy/new parity tests — 8 tests PASS after correction.
- `npm test` — 3042/3042 PASS.
- `python -m unittest discover -s tests` — 829 tests, OK. Có ResourceWarning về pipe chưa đóng từ test harness updater.
- Word COM: 21/21 phép Trang đầu + baseline KHỚP; Word highlight mở/lưu lại giữ `w:highlight`.
- Word COM: cột 1/2/3, 3/3 KHỚP; Heading 1/2/3 dùng đúng style ID nhưng thuộc tính font/cỡ/màu/khoảng cách LECH.
- `batch_document_audit.py docx` d01,d07,d13,d20,d24 — 5/5 PASS, page delta 0.
- `git diff --check` — không lỗi whitespace.
BUILD RESULT: NOT RUN (ticket yêu cầu test, không yêu cầu build).
TEST RESULTS: `npm test` 3042/3042 PASS; Python `unittest discover` 829/829 OK; focused parity tests 8/8 PASS; Word COM 21/21 KHỚP; DOCX batch 5/5 PASS.
KNOWN FAILURES: Heading 1/2/3 có sai khác style mặc định đã tái hiện và ghi trong audit; chưa sửa vì ép font/theme/spacing của Word cài trên máy có thể ghi đè style/theme của DOCX khác. Các nhóm bảng, lề/hướng/khổ giấy, header/footer, breaks, TOC, footnotes/endnotes, comments, revisions, style gallery, find/replace, symbols, text boxes vẫn NOT RUN.
RISKS: XML parity không thay thế kiểm tra hiển thị toàn bộ palette 16 màu; batch hồi quy xác nhận page count cho năm tài liệu yêu cầu, không xác nhận byte-identical toàn bộ 23 DOCX.
DEPENDENCIES/BLOCKERS: Word COM cục bộ (đã tạo/xóa theo PID mới); không thêm dependency.
CORE PATCH ID (if any): None.
NEXT ACTION: Tiếp tục các nhóm NOT RUN; xác định chính sách tương thích Word theme/style trước khi sửa Heading.
