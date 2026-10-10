# Agent Handoff
TASK: `docs/tickets-0710/TICKET-FIX-T6.md` — giữ trạng thái nhận xét đã xử lý và đối chiếu Word Count.
AGENT/ROLE: Codex — Writer adapter, OOXML persistence, Word Count, Help tiếng Việt.
BRANCH: `fix/doc-wordcount-resolved-t6-codex`.
WORKTREE: `E:\VNOffice-codex-ft6`.
OBJECTIVE: Hoàn tất các yêu cầu của ticket, kiểm chứng Word COM, app desktop, bộ tài liệu DOCX và test suite.
FINDINGS:
- Resolved bị mất vì export DOCX thiếu `word/commentsExtended.xml`, relationship và content type. Word cần `w14:paraId` trên đoạn cuối của comment để ghép `w15:commentEx` có `w15:done`.
- Browser `innerText` bỏ nhãn danh sách; Word tính nhãn số thành từ/ký tự và bullet thành ký tự. Đếm dòng dựa trên số dòng nguồn trong `innerText` không phản ánh dòng đang hiển thị.
- d24 chứa văn bản ở các drawing/textbox nổi; Word COM tính 0 từ/ký tự trong thân tài liệu. Các phần này được loại khỏi Word Count.
IMPLEMENTATION SUMMARY: Ghi/đọc cờ resolved theo OOXML commentsExtended; thêm import payload và khôi phục state trong Writer; cập nhật Help tiếng Việt cho Resolve, lưu DOCX và Word Count; bổ sung thống kê nhãn danh sách và đo dòng theo hình học range của đoạn.
FILES CHANGED: `adapters/libreoffice/common/ooxml_zip_patch.py`, `adapters/libreoffice/writer/writer-adapter.js`, `apps/writer/word-count.js`, `main.py`, `platform/help/entries-writer.js`, `tests/test_writer_review_roundtrip.py`, `tests/unit/writer-review-export.test.js`, `tests/unit/writer-word-count.test.js`, `docs/AGENT-HANDOFF-FIX-T6-CODEX.md`.
COMMANDS RUN:
- `npm test` — 3032/3032 PASS.
- `python -m unittest discover -s tests` — 811 tests, OK (ResourceWarning về pipe/file không đóng từ test harness).
- Focused `python -m unittest tests.test_writer_review_roundtrip.WriterReviewRoundtripTests.test_new_document_creates_native_revisions_and_comment_ranges` — PASS.
- Focused Writer Word Count unit tests — 12 checks, 0 failures.
- `scripts/layout-audit/batch_document_audit.py docx ... d01.docx d07.docx d13.docx d20.docx` — 4/4 PASS, edit/round-trip PASS; report `E:\VNOffice-profiles\codex-ft6\batch-audit\batch_document_audit_report.md`.
- Desktop app dùng `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-ft6`, CDP cổng riêng theo phiên; DOCX synthetic mở lại báo `resolved: true`. Word COM xác nhận `Comment.Done=True` sau khi mở lại tệp.
- `git diff --check` — PASS.
BUILD RESULT: NOT RUN (ticket yêu cầu test, không yêu cầu build).
TEST RESULTS: PASS cho test suite, Python unittest, focused OOXML/Word Count và batch audit. Hành vi lưu/mở lại resolved xác nhận bằng Word COM và Writer app.
KNOWN FAILURES: Word Count chưa đạt ngưỡng sai số <0,5% trên mọi trường của toàn corpus. Đo được: d01 ký tự có khoảng trắng app 37188 / Word 37388 (-200; 0,54%); d07 36546 / 37178 (-632; 1,70%); d13 15897 / 16004 (-107; 0,67%), từ 2761 / 2764 (-3), ký tự không khoảng trắng 13377 / 13376 (+1). d01 dòng 897 / 890; d07 801 / 808; d13 484 so với audit trước 485 (Word COM ở một lượt khác 461 do layout). d20 kết quả thay đổi giữa hai lượt layout: từ 1360 / 1354; ký tự không khoảng trắng 6822–7068 / 7020; ký tự có khoảng trắng 8113–8359 / 8773. d24: Word 0 từ/ký tự, app 0 từ/ký tự sau khi loại textbox nổi; app 5 đoạn/dòng so với Word 18 đoạn/dòng.
RISKS: Đếm dòng phụ thuộc layout, font và độ rộng trang; Word COM và Writer có thể dàn trang khác nhau. Bộ đếm CSS list xử lý marker phổ biến; ký tự khoảng trắng và một số cấu trúc lồng nhau vẫn lệch, d20 chưa ổn định giữa các lượt. Không báo Word Count là khớp hoàn toàn.
DEPENDENCIES/BLOCKERS: Không.
CORE PATCH ID (if any): None.
NEXT ACTION: Tiếp tục phân tích ký tự khoảng trắng và d20 layout/DOM; bổ sung corpus kiểm thử trước khi tuyên bố đạt ngưỡng Word Count toàn diện.
