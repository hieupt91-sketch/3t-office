# Agent Handoff
TASK: E3b — Ctrl+Shift+; chèn giờ dưới dạng giá trị số
AGENT/ROLE: Codex / Sheet input parity
BRANCH: fix/excel-e3b-codex
WORKTREE: E:\VNOffice-codex-fe3b
OBJECTIVE: Đổi lệnh chèn giờ hiện tại từ chuỗi HH:mm:ss sang serial thời gian có number format, giữ Undo/Redo, xác minh file app lưu bằng Excel 2016 ReadOnly và cập nhật Help VI/EN.
FINDINGS: Luồng `_normalizeCellInput` sẵn có đã đổi chuỗi giờ hợp lệ thành phần lẻ của ngày và gắn `numberFormat.category=time`, nên không cần adapter/Core patch. Tài liệu hỗ trợ chính thức áp dụng cho Excel 2016 mô tả Ctrl+Shift+; là giá trị thời gian tĩnh; tài liệu định dạng ngày/giờ xác nhận giá trị nền là số. File do app desktop lưu được Excel 16.0 build 4266 mở `ReadOnly=true`; F8 có `Value2=0.20625` kiểu `System.Double`, `NumberFormat=hh:mm`, `Text=04:57`.
IMPLEMENTATION SUMMARY: `insertCurrentTime()` tái sử dụng đường nhận diện giờ, lưu serial theo phút với mẫu `HH:mm` và trả về giá trị số. Unit/CDP kiểm tra numeric serial, format, phép cộng giờ và Undo/Redo. Help tiếng Việt hướng dẫn vị trí/phím tắt, tính toán, giá trị tĩnh, đổi định dạng và Undo/Redo; tooltip VI/EN được đồng bộ. Thêm probe Excel ReadOnly có kiểm tra phiên bản, PID riêng, Value2 và NumberFormat.
FILES CHANGED: apps/sheet/sheet-grid.js; tests/unit/sheet-mouse-shortcuts.test.js; tests/unit/sheet-format-cells.test.js; tests/live/cdp/e3-input.desktop.mjs; tests/live/cdp/e3b-excel-readonly.ps1; platform/help/entries-sheet.js; platform/i18n/strings-vi.js; platform/i18n/strings-en.js; docs/PLAN-EXCEL-2016-E3.md; docs/EXCEL2016-INPUT-MATRIX.md; docs/tickets-0710/HANDOFF-EXCEL-E3B-CODEX.md.
COMMANDS RUN: `npm test`; `python -m unittest tests.test_xlsx_numfmt_roundtrip tests.test_sheet_save_roundtrip tests.test_sheet_type_detection_xlsx`; desktop `node --experimental-websocket tests/live/cdp/e3-input.desktop.mjs`; `powershell -NoProfile -ExecutionPolicy Bypass -File tests/live/cdp/e3b-excel-readonly.ps1 -File E:\VNOffice-profiles\codex-fe3b\e3-input-readback.xlsx -Cell F8`; `git diff --check`. Desktop/COM runs used `TEMP`, `TMP`, `VNO_CDP_LOCALAPPDATA` under `E:\VNOffice-profiles\codex-fe3b`.
BUILD RESULT: NOT RUN — ticket không yêu cầu build/package riêng; `npm test` đã chạy syntax và smoke gates.
TEST RESULTS: PASS — npm 3161/3161; Python 15/15; desktop CDP 62/62; Excel 2016 ReadOnly Value2/NumberFormat PASS; `git diff --check` PASS.
KNOWN FAILURES: Không có ở các gate cuối. Hai probe COM inline thử nghiệm ban đầu FAIL do RPC rejection/PowerShell làm mất COM object khi trả qua helper; chỉ các PID do probe tạo 12520 và 17812 được dừng theo PID. Harness đã sửa chạy PASS; PID Excel có sẵn 12880 không bị tác động.
RISKS: Giờ được chụp theo phút từ timezone máy và là giá trị tĩnh; thay đổi locale hiển thị bên ngoài có thể đổi cách viết mẫu nhưng serial vẫn giữ nguyên.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Review commit E3b và merge theo quy trình; không cần sửa LibreOffice Core.
