# Handoff — TICKET-FIX-T5

TASK: `docs/tickets-0710/TICKET-FIX-T5.md` — các lỗi tài liệu Writer U7, U11/U12, U14, U17, U2, U3, U21, U25.
AGENT/ROLE: Codex — sửa lỗi hành vi Writer, bổ sung hồi quy và kiểm thử desktop qua CDP.
BRANCH: `fix/doc-minor-t5-codex`.
WORKTREE: `E:\VNOffice-codex-ft5`.
OBJECTIVE: Hoàn tất các mục trong ticket theo thứ tự, mỗi mục có commit, kiểm thử đơn vị và đo hành vi trên app desktop.

FINDINGS:
- U7: Bốn nút chọn trong tab Bố cục Bảng nằm trọn vùng ribbon, mỗi nút cao 22 px trong viewport dọc y=78–176.
- U11/U12: Gộp ô khi thiếu vùng chọn báo hướng dẫn; hàng/cột/bảng được tô sáng. Hàng chọn được sao chép đủ TSV và định dạng đậm bằng Ctrl+B; Shift+Space chọn hàng. Lệnh định dạng theo ô sử dụng tập `selectedCells`.
- U14: Sau thao tác, Tô màu ô/Viền trang/Căn lề có `aria-pressed=false`, nền trắng `rgb(255, 255, 255)`.
- U17: Mở lại Trợ giúp cho `scrollTop=0`; chủ đề đầu tiên hiển thị trọn trong danh sách.
- U2: “đạt” và “tỷ” không bị gạch; từ sai “tỷi” được đánh dấu. Phần bổ sung từ điển tự viết và ghi CC0; không nhập từ điển bên ngoài.
- U3: Ctrl+Space tại con trỏ đưa đậm/nghiêng/gạch chân/màu chờ về mặc định; chữ gõ sau lệnh không mang định dạng chờ.
- U21: Không đoạn hoặc một đoạn đều báo cần ít nhất hai đoạn; nội dung một đoạn được giữ nguyên.
- U25: Ở 1366×768, ribbon không tràn ngang; nhóm Ký hiệu tự thu gọn và nút Ký hiệu nằm trong viewport tại x=1212–1256. Hành vi responsive đã có sẵn, mục này thêm hồi quy CDP.
- Giới hạn cần lưu ý: vùng chọn cột được tô sáng đúng các ô, nhưng lựa chọn văn bản trình duyệt vẫn là một Range liên tục nên `getSelection().toString()` có thể bao gồm các ô nằm giữa cột đó. Các lệnh định dạng cấp ô áp dụng theo `selectedCells`; chưa xác nhận sao chép/định dạng văn bản nội tuyến riêng cho vùng cột.

IMPLEMENTATION SUMMARY: Sửa bố cục ribbon chọn bảng, chọn nội dung hàng/cột/bảng và Shift+Space, thông báo gộp/sắp xếp, trạng thái nút one-shot, bố cục và vị trí cuộn Help, từ điển CC0 hợp lệ, Ctrl+Space khi chỉ có con trỏ; thêm unit/CDP coverage.
FILES CHANGED: `apps/writer/writer-table.js`, `adapters/libreoffice/writer/writer-adapter.js`, `platform/help/entries-writer.js`, `platform/help/help-panel.js`, `platform/help/help.css`, `platform/shell/shell.css`, `platform/text/**`, `platform/ui-kit/**`, `tests/live/cdp/writer-fix-t5.desktop.mjs`, `tests/unit/**`, `tests/run-tests.js`.
COMMANDS RUN:
- `npm test` — lượt cuối: 3028/3028 PASS, 0 FAIL.
- `python -m unittest discover -s tests` — 811 tests, OK.
- `node --experimental-websocket tests/live/cdp/writer-fix-t5.desktop.mjs` với `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-ft5` — 13 kiểm tra CDP PASS, cổng riêng 60921.
- `git diff --check` — không có lỗi whitespace.
BUILD RESULT: NOT RUN (ticket yêu cầu test, không yêu cầu build).
TEST RESULTS: PASS — npm 3028/3028; Python unittest 811/811; CDP 13/13; Help shortcut consistency 3/3.
KNOWN FAILURES: Không có lỗi test ở lượt cuối. Có ResourceWarning về file chưa đóng trong unittest và giới hạn vùng chọn cột nêu trên.
RISKS: Sao chép hoặc định dạng nội tuyến tổng quát cho vùng chọn cột có thể bao gồm phần nội dung nằm giữa các ô đã tô sáng.
DEPENDENCIES/BLOCKERS: Không.
CORE PATCH ID (if any): None.
NEXT ACTION: Nếu cần chọn cột chính xác khi sao chép/định dạng nội tuyến, thay mô hình Range liên tục bằng thao tác clipboard/format theo từng ô đã chọn.

Commits theo ticket: `a199f6e2`, `4310b011`, `ac7b26ae`, `a7067ed1`, `f3394c44`, `4c70cf8b`, `44161438`, `cea1d135`. Follow-up kiểm thử/Help: `012b8e22`, `91ca9b59`.
