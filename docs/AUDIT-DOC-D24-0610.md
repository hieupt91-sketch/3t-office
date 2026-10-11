# D23 — D24.docx live page audit (2026-10-06)

## Agent Handoff

TASK: D23 — VN Writer live pagination lệch D24
AGENT/ROLE: Codex / implementation
BRANCH: `fix/writer-live-pages-d24-codex`
WORKTREE: `E:\VNOffice-codex-d23`
OBJECTIVE: Đưa `_livePageCount` của D24 về 16 như Word và kiểm tra lại corpus 43 tài liệu.

## Findings

- Nguồn `E:\VN OFice\file test\landocx\d24.docx` được giữ chỉ đọc. Word COM `word_pages.ps1` báo 16 trang, 0 từ. Đọc `Range.Information(3)` cho đoạn và anchor shape xác nhận các ảnh page-anchored nằm rải từ trang 1 đến 16; hai ảnh inline nằm ở trang 3 và 15. Các đoạn Word ở cuối section giữa bắt đầu tại trang 12–15; section cuối bắt đầu trang 16.
- D24 có 3 section. OOXML `sectPr` cho section giữa có lề trên/dưới 5.7/5.8 mm, còn section đầu/cuối 25.4 mm. Live paginator trước thay đổi lấy một `pageSetup` chung; các canvas blocks cao khoảng 613 px trong khi setup section giữa có printable height khoảng 762 px. Đây là nguyên nhân đã xác nhận cho một phần sai lệch.
- App ban đầu: 18 trang. Sau khi paginator đổi `pageSetup` theo marker section: 17 trang. Word vẫn là 16. Marker `section-3` trong DOM đứng trước một số block có anchor trang Word 12–15; ranh giới Word nằm sau đoạn rỗng cuối section giữa (trang 15). Cách ghép đúng các floating image với thứ tự section còn chưa được giải quyết; không coi D24 là đã sửa.
- Toàn corpus, script `scripts/audit-0610/doc_live_pages_vs_word.mjs`: 42/43 khớp tuyệt đối, 0 tài liệu lệch hơn 1 trang; ngoại lệ duy nhất D24 (Word 16 / App 17). d10 bị loại theo script D21. Nguồn corpus không bị sửa.

## Implementation Summary

- `_recomputeLivePagination()` dùng page dimensions và usable height của section được marker chọn; khôi phục `pageSetup` ban đầu sau khi tính trang. Khi marker section đã có soft page break trước nó, tránh cộng thêm một chuyển trang.
- Thêm unit test section margins trong `tests/unit/writer-headerfooter-import.test.js`.
- Thay đổi này giảm D24 từ 18 xuống 17; chưa đạt mục tiêu ticket vì còn dư 1 trang.

FILES CHANGED: `adapters/libreoffice/writer/writer-adapter.js`; `tests/unit/writer-headerfooter-import.test.js`; `docs/AUDIT-DOC-D24-0610.md`.
COMMANDS RUN: `node --check adapters/libreoffice/writer/writer-adapter.js`; focused Writer header/footer unit runner; `node --experimental-websocket scripts/audit-0610/doc_live_pages_vs_word.mjs`; Word COM `scripts/audit-0610/word_pages.ps1` song song `word_dialog_dismisser.ps1`; CDP đo D24 sau khi phân trang ổn định; `git diff --check`.
BUILD RESULT: NOT RUN.
TEST RESULTS: PASS — Writer header/footer unit tests 12/12; syntax check; diff check. Corpus audit PASS 42/43 exact. D24 parity FAIL: 17/16.
KNOWN FAILURES: D24 còn lệch +1 trang; yêu cầu nghiệm thu D24 chưa hoàn thành.
RISKS: Không đổi semantics file. Các section có margin thay đổi được dùng riêng trong đo live; chưa xử lý thứ tự visual flow của floating objects neo theo trang qua section boundary.
DEPENDENCIES/BLOCKERS: Cần ánh xạ section break trong LO HTML với OOXML paragraph anchor cho các floating objects của D24 để loại trang dư còn lại.
CORE PATCH ID (if any): N/A.
NEXT ACTION: Tiếp tục điều tra marker `section-3` và page-anchored images bằng CDP/Word COM; chỉ gộp khi D24 đạt 16/16 và audit corpus cuối đạt 43/43 hoặc 42/43 với D24 đã sửa.
