# Agent Handoff

TASK: FIX-S1 — xử lý các lỗi UI Sheet được liệt kê trong ticket.
AGENT/ROLE: Codex / sửa lỗi UI Ribbon và dialog VN Sheet.
BRANCH: `fix/sheet-ui-s1-codex`.
WORKTREE: `E:\VNOffice-codex-fs1`.
OBJECTIVE: Khắc phục các mục U-S4/U-S5/U-S6/U-S11/U-S12/U-S13/U-S14/U-S15/U-S16/U-S17/U-S18/U-S19/U-S21/U-S22 trong `docs/tickets-0710/TICKET-FIX-S1.md`, giữ nguyên phạm vi ngoài ticket.
FINDINGS: Categories và Watch Window đã có handler/implementation; lỗi U-S12/U-S13 không tái hiện trên desktop. CDP xác nhận dialog Hàm mở bằng Shift+F3, Esc đóng và trả focus về lưới; sort một ô báo yêu cầu chọn vùng; các nút toggle cập nhật trạng thái; nhóm ribbon tiếng Việt dùng “Kiểm lỗi”.
IMPLEMENTATION SUMMARY: Thêm Esc/focus cho dialog Hàm; thông báo hướng dẫn khi Custom Sort chỉ có một ô được chọn; đồng bộ trạng thái kiểm tra chính tả từ command khi khởi tạo; sửa nhãn/icon ribbon bị lặp hoặc ẩn và cho nhãn Sắp xếp tùy chỉnh hiển thị; đồng bộ tên nhóm Kiểm lỗi trong Help; sửa tương phản tab Format Cells và tiêu đề dialog theo theme tối. Bổ sung kiểm thử desktop CDP với thao tác chuột/bàn phím và cổng CDP riêng. Help tiếng Việt cho phản hồi Custom Sort và vị trí nhóm Kiểm lỗi đã cập nhật.
FILES CHANGED: `apps/sheet/sheet-grid.js`, `apps/sheet/sheet-ribbon.js`, `apps/sheet/sheet.css`, `platform/help/entries-retro-dialogs.js`, `platform/help/entries-sheet.js`, `platform/i18n/strings-en.js`, `platform/i18n/strings-vi.js`, `platform/ui-kit/icons.js`, `tests/live/cdp/sheet-fix-s1.desktop.mjs`, `docs/HANDOFF-FIX-S1-CODEX.md`.
COMMANDS RUN: `npm test` — PASS 3015/3015; `python -m unittest discover -s tests` — PASS 811/811; `node --experimental-websocket tests/live/cdp/sheet-fix-s1.desktop.mjs` với `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fs1` — PASS 23/23, cổng CDP riêng do harness cấp; `git diff --check` — sạch.
BUILD RESULT: NOT RUN (ticket yêu cầu test suite và CDP, không yêu cầu build riêng).
TEST RESULTS: CDP PASS 23/23; `npm test` PASS 3015/3015; Python unittest PASS 811/811. Bộ Python có hai `ResourceWarning` về TextIOWrapper chưa đóng, nhưng kết thúc `OK`.
KNOWN FAILURES: Không còn lỗi test đã biết. Lượt `npm test` trước có 1 lỗi Help⇄Ribbon do nội dung Help còn ghi “Chứng minh”; đã sửa `platform/help/entries-sheet.js` và lượt chạy cuối pass.
RISKS: U-S12/U-S13 không cần sửa vì chức năng đã tồn tại và kiểm thử CDP xác nhận mở được. Không chạy bộ corpus xlsx theo phạm vi ticket. Có file untracked ngoài scope `tests/smoke/temp-slides-browser.html`; giữ nguyên.
DEPENDENCIES/BLOCKERS: Không.
CORE PATCH ID (if any): None.
NEXT ACTION: Không còn mục nào trong scope FIX-S1.
