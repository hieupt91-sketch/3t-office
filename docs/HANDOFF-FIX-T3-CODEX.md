# Agent Handoff

TASK: FIX-T3 — hoàn tất U40, U30/U33/U35 và U10/U31.
AGENT/ROLE: Codex / sửa lỗi UI Ribbon VN Writer.
BRANCH: `fix/doc-ui-t3-codex`.
WORKTREE: `E:\VNOffice-codex-ft3`.
OBJECTIVE: Hoàn thiện thanh tab ở 1024×600 mà không đổi 1366×768; loại nhãn icon bị lặp; đồng bộ trạng thái và màu Hàng xen kẽ; báo rõ khi chưa thể tạo Thư mục tài liệu.
FINDINGS: U40 CDP đo dải tab rộng 1049px trong viewport 1024px, nút cuộn đưa Trợ giúp vào vùng nhìn thấy; tab Trợ lý AI nhận focus/active bằng ArrowRight. Ở 1366×768, dải tab 1340px vừa viewport và nút cuộn ẩn. Các nhãn U30/U33/U35 chỉ còn nhãn chữ một lần, aria-label giữ nguyên. U10 đo màu `rgb(219, 234, 254)` sáng và `rgb(51, 65, 85)` tối; chuột và Space cập nhật `aria-pressed`. U31 hiện hướng dẫn tiếng Việt, không chèn thư mục rỗng.
IMPLEMENTATION SUMMARY: Tab Ribbon có vùng cuộn với nút trái/phải, giữ focus và tự cuộn tab mới được chọn vào vùng nhìn thấy. Icon chú thích, trường trộn và đếm từ dùng hình vẽ không chứa text glyph trùng nhãn. Hàng xen kẽ cập nhật command state, giữ màu inline cho định dạng xuất và dùng CSS theme tối khi hiển thị. Tạo thư mục yêu cầu có ít nhất một trích dẫn; nếu chưa có, notification hướng dẫn thêm/quản lý nguồn và chèn trích dẫn. Help tiếng Việt được cập nhật.
FILES CHANGED: `platform/ribbon/ribbon-host.js`, `platform/shell/shell.css`, `platform/ui-kit/icons.js`, `adapters/libreoffice/writer/writer-adapter.js`, `apps/writer/writer.css`, `platform/help/entries-writer.js`, `tests/live/cdp/writer-fix-t3.desktop.mjs`, `tests/unit/writer-citations.test.js`, `tests/unit/writer-table-controls.test.js`, `docs/HANDOFF-FIX-T3-CODEX.md`.
COMMANDS RUN: `node --experimental-websocket tests/live/cdp/writer-fix-t3.desktop.mjs` — PASS 15/15; focused Writer table/citations unit suites — PASS 25/25; `python -m unittest discover -s tests` — PASS 811/811; `npm test` — PASS 3015/3015; `git diff --check`.
BUILD RESULT: NOT RUN (không có build riêng trong scope ticket).
TEST RESULTS: Final after `main` merge: npm 3015/3015 PASS; Python unittest 811 tests, OK; CDP 15/15 PASS. Lượt npm đầu tiên sau merge có 2 lỗi kiểm tra tạm thời (tên sản phẩm trong Help và assertion đo nhầm hàng tiêu đề); cả hai đã sửa và lượt cuối đạt 0 FAIL.
KNOWN FAILURES: Không còn lỗi kiểm thử đã biết. Python unittest có `ResourceWarning` về hai file handle chưa đóng; bộ kiểm thử vẫn kết thúc `OK`.
RISKS: Màu tối là màu hiển thị theo theme; định dạng lưu giữ màu xanh nhạt để tài liệu xuất ra vẫn có hàng xen kẽ.
DEPENDENCIES/BLOCKERS: Không.
CORE PATCH ID (if any): None.
NEXT ACTION: Không còn mục nào trong scope FIX-T3.
