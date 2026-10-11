# Agent Handoff
TASK: Sheet/Slides i18n, shortcut chuẩn và sắp xếp ribbon
AGENT/ROLE: Codex / implementation
BRANCH: feature/sheet-slides-i18n-shortcuts
WORKTREE: E:\VNOffice-codex-i18n-sheet-slides
OBJECTIVE: Catalog VI/EN cho Sheet/Slides, shortcut chuẩn không xung đột, ribbon đúng chức năng.
FINDINGS: Baseline 379/379 PASS; các shortcut gợi ý đã có trừ Insert Row; global shortcut Map dùng chung nên test mới tính cả `common.*` theo từng app. Mọi command hiện có đều có handler adapter; icon command hiện có đều resolve tới SVG thật.
IMPLEMENTATION SUMMARY: Thêm catalog cho toàn bộ command và ribbon; helper `applyLocaleToTabs()` clone cấu trúc không mutate fallback; locale hóa dialog Sheet chính và tiêu đề/nút chính/placeholder/lỗi của Slides; tách nhóm Data Tools/PivotTable/Charts/Cells; bỏ Animation và Slide Show khỏi Home, bỏ Layout khỏi Design.
FILES CHANGED: `apps/sheet/**` liên quan, `apps/slides/**` liên quan, `platform/i18n/**`, `platform/commands/command-definitions.js`, `tests/**`, roadmap và file handoff này. Không sửa `apps/writer/**`.
COMMANDS RUN: `node tests/run-tests.js`; `python -m http.server 8765`; Edge thật qua Playwright Core tạm ngoài repo.
BUILD RESULT: Không có build step. Syntax check nằm trong suite và PASS.
TEST RESULTS: Baseline 379/379 PASS. Full suite cuối 387/387 PASS (34 suites). Browser HTTP thật PASS: click Writer→Sheet→Data, EN Home/PivotTable; `Ctrl+Shift+=` chèn hàng thật; click Sheet→Slides, `Ctrl+M` tăng 3→4 slide, `Ctrl+D` tăng 4→5; reload VI và thấy “Trang đầu”; không có page error.
KNOWN FAILURES: Không có lỗi chức năng đã biết. Phần dialog chưa dịch 100% chuỗi phụ: mô tả/preset trong Slide Master, Layout, Transition, Animation; nhãn phụ Speaker Notes/Presenter View; metadata tên theme/layout và nội dung mẫu; vài chuỗi không thuộc dialog như status bar/formula bar vẫn hardcode. Tổng độ phủ dialog/canvas UI ước tính khoảng 80%; command và ribbon 100%.
RISKS: Hai catalog dùng chung sẽ conflict khi merge song song Writer; cần gộp namespace add-only `sheetDialogs`, `slidesDialogs`, `sheetRibbon`, `slidesRibbon` và giữ thay đổi Writer bên kia.
DEPENDENCIES/BLOCKERS: Không có.
CORE PATCH ID (if any): Không có.
NEXT ACTION: Claude review/merge; khi mở rộng i18n tiếp, xử lý các chuỗi phụ đã liệt kê mà không đổi namespace.

## Shortcut đã thêm/sửa hoặc xác nhận

- Thêm `sheet.row.insert`: `Ctrl+Shift+=`.
- Xác nhận Sheet: `F2`, `Ctrl+B/I/U`, `Ctrl+Shift+4/5/1`, `Ctrl+;`, `Alt+=`, `Ctrl+Shift+L`; `common.edit.find` dùng `Ctrl+F` và không bị ghi đè.
- Xác nhận Slides: `Ctrl+M`, `Ctrl+D`, `Delete`, `F5`, `Shift+F5`, `Alt+F5`.
- Không gán shortcut cho `sheet.col.insert`: cùng tổ hợp Insert sẽ xung đột với `sheet.row.insert` trong Map dùng chung; lệnh vẫn có nút ribbon và handler thật.
