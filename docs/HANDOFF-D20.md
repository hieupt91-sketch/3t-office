# Agent Handoff
TASK: D20 — tái chạy corpus Writer và đo chênh lệch nội dung DOCX
AGENT/ROLE: Codex / audit qua CDP và báo cáo
BRANCH: test/doc-corpus-regress2-codex
WORKTREE: E:\VNOffice-codex-d20
OBJECTIVE: Chạy lại 44 tài liệu trên code hiện tại; đo cấu trúc OOXML sau lưu; điều tra legacy13.doc.
FINDINGS: 42 PASS / 1 FAIL / 1 BLOCKED, khớp mốc. legacy13.doc lệch 1→2 trang như baseline; paragraph đầu Writer lưu BodyText/w:sz=24 (12pt), trong khi LO chuyển trực tiếp là Normal/w:sz=20 (10pt), nguyên nhân khả dĩ gây tràn. 22/23 DOCX hợp lệ không mất cấu trúc; d15 giảm một bookmark Word tự động _GoBack.
IMPLEMENTATION SUMMARY: Thêm công cụ audit cấu trúc OOXML chạy tuần tự qua CDP và báo cáo kết quả/điều tra. Không sửa app.
FILES CHANGED: scripts/audit-0610/corpus_content_lo.py; docs/AUDIT-DOC-CORPUS-REGRESS2-0610.md; docs/HANDOFF-D20.md.
COMMANDS RUN: python scripts/audit-0610/corpus_pages_lo.py --report docs/AUDIT-DOC-CORPUS-REGRESS2-0610.md; python scripts/audit-0610/corpus_content_lo.py; CDP roundtrip riêng d15.docx và legacy13.doc; LibreOffice HTML/PDF/TXT exports.
BUILD RESULT: NOT RUN (không sửa ứng dụng).
TEST RESULTS: corpus PASS 42 / FAIL 1 / BLOCKED 1; OOXML không giảm 22/23 DOCX hợp lệ; d15.docx giảm w:bookmarkStart _GoBack.
KNOWN FAILURES: legacy13.doc page count 1→2 (known baseline); d15.docx _GoBack bookmark lost.
RISKS: d15 loss is counted by requested metric, though _GoBack is an automatic cursor bookmark, not a named user bookmark.
DEPENDENCIES/BLOCKERS: d10.docx is a PDF with a DOCX extension.
CORE PATCH ID (if any): None.
NEXT ACTION: Nếu ưu tiên zero bookmark delta tuyệt đối, điều tra bảo toàn bookmark _GoBack qua `_contentForExport()`/LibreOffice save path; không thay đổi phép đo.

