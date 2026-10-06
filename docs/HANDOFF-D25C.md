# Agent Handoff

TASK: D25c — sửa spacer sau marker section làm d24 live pagination thừa 1 trang

AGENT/ROLE: Codex / Integration-Core Writer

BRANCH: `fix/writer-section-spacer-d24-codex`

WORKTREE: `E:\VNOffice-codex-d25c`

OBJECTIVE: Hiển thị `d24.docx` đúng 16 trang như Word thật, không làm hồi quy live pagination của corpus 43 tài liệu.

FINDINGS: Importer nối thêm `<p><br></p>` vào marker section do OOXML sinh. Với d24, spacer 20,58 px trở thành gốc trang mới trước ảnh cao 613,03 px trong vùng dùng được 613 px, làm ảnh bị đẩy sang trang kế và tổng trang tăng từ 16 lên 17. Lỗi metadata marker `section-3` đang nằm trước trang app 8 trong khi Word bắt đầu section 3 ở trang 16 vẫn được ghi nhận, không sửa trong ticket này.

IMPLEMENTATION SUMMARY: Bỏ paragraph spacer tổng hợp khỏi `markerHtml` trong nhánh import section OOXML. Paragraph page-break gốc vẫn được giữ trực tiếp sau marker; luồng người dùng chủ động chèn Section Break không thay đổi. Thêm unit regression cho nhánh fallback `page-break-before` để bảo đảm importer không tái sinh spacer.

FILES CHANGED:
- `adapters/libreoffice/writer/writer-adapter.js`
- `tests/unit/writer-headerfooter-import.test.js`
- `docs/HANDOFF-D25C.md`

COMMANDS RUN:
- `$env:VNO_CDP_LOCALAPPDATA='E:\VNOffice-profiles\d25c-before'; node --experimental-websocket scripts/audit-0610/doc_live_pages_vs_word.mjs`
- `node --input-type=module -e "...runWriterHeaderFooterImportTests()..."`
- `$env:VNO_CDP_LOCALAPPDATA='E:\VNOffice-profiles\d25c-d24-after'; node --experimental-websocket scripts/audit-0610/d24_live_pagination_probe.mjs 'E:\VN OFice\file test\landocx\d24.docx' 'E:\VNOffice-profiles\d25c\d24-after.json'`
- `$env:VNO_CDP_LOCALAPPDATA='E:\VNOffice-profiles\d25c-after'; node --experimental-websocket scripts/audit-0610/doc_live_pages_vs_word.mjs`
- `node scripts/check-syntax.js`
- `node tests/run-tests.js`
- `git diff --check`

BUILD RESULT: PASS — syntax check `153/153`; repository không có bước bundle/build riêng trong `package.json`.

TEST RESULTS:
- PASS — baseline app desktop/CDP: `42/43` khớp Word; chỉ `d24` lệch `17` so với `16`.
- PASS — app desktop/CDP sau sửa: `d24=16`, `15` gap.
- PASS — corpus sau sửa: `43/43` khớp Word; tăng từ `42/43`, không tài liệu nào lệch thêm.
- PASS — unit Writer header/footer-pagination: `13/13`, gồm regression D25c.
- PASS — toàn bộ `node tests/run-tests.js`: `2828/2828`, `0 FAIL`.
- PASS — `git diff --check`.

KNOWN FAILURES: Không có trong các lệnh đã chạy. Bốn lỗi soffice fresh-profile từng biết không tái hiện trong lượt này.

RISKS: Lỗi vị trí metadata `section-3` của d24 vẫn tồn tại ngoài scope; tổng trang đã đúng nhưng semantics section chưa đúng hoàn toàn. Thay đổi chỉ áp dụng marker sinh lúc import, không áp dụng marker do người dùng chèn.

DEPENDENCIES/BLOCKERS: Không có.

CORE PATCH ID (if any): N/A — không sửa LibreOffice Core/upstream.

HELP/I18N: N/A — sửa lỗi phân trang import, không thêm tính năng hay UI người dùng.

ROLLBACK: Khôi phục phép nối `+ "<p><br></p>"` khi tạo `markerHtml` ở nhánh import section OOXML và bỏ unit regression D25c.

NEXT ACTION: Có thể xử lý lỗi metadata marker `section-3` trong ticket riêng; không gộp vào D25c.
