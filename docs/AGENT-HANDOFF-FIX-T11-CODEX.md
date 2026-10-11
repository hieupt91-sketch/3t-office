# Agent Handoff
TASK: FIX-T11 — đối chiếu 61 nút ribbon VN Writer với Word trên worktree hiện tại.
AGENT/ROLE: Codex — Writer parity audit.
BRANCH: `audit/doc-t11-codex`.
WORKTREE: `E:\VNOffice-codex-ft11`.
OBJECTIVE: Hoàn tất lần lượt sáu nhóm ưu tiên, sửa sai lệch tái hiện được, cập nhật ma trận và xác nhận bằng thao tác CDP, Word COM cùng batch DOCX.
FINDINGS:
- Nhóm 1–5 hoàn tất theo thứ tự, mỗi nhóm một commit. Nhóm 6 đã kiểm spellcheck, word count, chế độ xem, rulers, gridlines, zoom và macro.
- Đếm từ khớp ở mẫu ngắn; batch DOCX còn lệch ký tự có khoảng trắng ở d01,d02,d06,d07,d13,d20. Ma trận ghi số đo và giữ trạng thái LỆCH ĐÃ BIẾT.
- Hai lệnh Macro đã thao tác được trong app/CDP, nhưng chưa có đối chiếu Word COM; ma trận giữ CHƯA ĐỐI CHIẾU. Các lệch khác đã biết về biểu đồ/sơ đồ, theme, watermark và đánh số dòng vẫn được ghi trong ma trận.
IMPLEMENTATION SUMMARY: Hoàn tất nhóm 6; Word COM xác nhận hành vi tương ứng của spellcheck, các chế độ xem, navigation pane, thước, gridlines và zoom. Thêm kiểm tra tồn tại `document.addEventListener` trước khi gắn listener chọn đoạn cho thụt đầu dòng; việc này sửa các unit test Writer dùng document giả. Không sửa LibreOffice Core.
FILES CHANGED: `adapters/libreoffice/writer/writer-adapter.js`; `scripts/audit-0610/gen_doc_button_matrix.py`; `scripts/audit-0610/word_parallel/group6-t11-*`; `docs/AUDIT-DOC-WORD-PARALLEL-1011.md`; `docs/DOC-BUTTON-MATRIX-1011.md`; `docs/AGENT-HANDOFF-FIX-T11-CODEX.md`.
COMMANDS RUN:
- CDP thao tác ribbon và Word COM theo sáu nhóm; kết quả cùng chênh lệch đã ghi trong audit.
- `npm test` — lần đầu 3036/3067 PASS do document giả thiếu API listener; sau guard: 3072/3072 PASS.
- `python -m unittest discover -s tests` — 864 tests OK (591.186s); hai ResourceWarning về pipe chưa đóng.
- `scripts/layout-audit/batch_document_audit.py docx ... d01.docx d02.docx d06.docx d07.docx d13.docx d20.docx d24.docx` — 7/7 PASS, không đổi số trang, sửa tài liệu được lưu.
- `python -X utf8 scripts/audit-0610/gen_doc_button_matrix.py E:\VNOffice-profiles\codex-ft11\ribbon-scan-writer.json docs/DOC-BUTTON-MATRIX-1011.md` — 103 KHỚP WORD, 1 KHÁC CÓ CHỦ Ý, 6 LỆCH ĐÃ BIẾT, 10 CHƯA ĐỐI CHIẾU.
- Encoding sweep 26 đường dẫn — UTF-8, không BOM, không phát hiện mojibake; `git diff --check` sạch.
BUILD RESULT: NOT RUN.
TEST RESULTS: npm 3072/3072 PASS; unittest 864 OK; batch DOCX 7/7 PASS; Word COM group 6 khớp các chế độ xem/zoom đã đối chiếu.
KNOWN FAILURES: Đếm từ còn lệch ký tự có khoảng trắng: d01 −200, d02 −62, d06 −1061, d07 −632, d13 −107, d20 −414; d24 là tài liệu ảnh/đối tượng và app đếm 0/0. Hai lệnh Macro chưa đối chiếu Word COM. Ma trận giữ các lệch native Chart/SmartArt, theme, watermark và line numbering.
RISKS: Không sửa Core. Thay đổi source duy nhất trong nhóm 6 là guard cho môi trường document giả; đã chạy lại cả npm và Python suite.
DEPENDENCIES/BLOCKERS: Đối chiếu Word COM cần Microsoft Word cục bộ; corpus tại `file test/landocx`.
CORE PATCH ID (if any): None.
NEXT ACTION: Review sáu commit FIX-T11 và handoff; tiếp tục xử lý word count và các lệnh còn CHƯA ĐỐI CHIẾU trong task riêng.
