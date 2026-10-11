# Agent Handoff

TASK: VN Sheet — Paste Special parity
AGENT/ROLE: Codex / Sheet implementation and QA
BRANCH: `feature/sheet-paste-special`
WORKTREE: `E:\VNOffice-codex-paste-special`
OBJECTIVE: Bổ sung Paste Special theo luồng quen thuộc của Excel, dùng clipboard model nội bộ, dialog radio, Ctrl+Alt+V và Deep Undo/Redo.

FINDINGS: Luồng ban đầu trong `SheetAdapter` chỉ sao chép một ô thành chuỗi `formula || val`; không lưu vùng, công thức/kết quả như hai trường riêng, hoặc style. Paste thường gọi thẳng `setCellValue` vào một ô. Grid đã có `cellsData`, `_offsetFormula`, snapshot batch và Deep Undo/Redo phù hợp để tái sử dụng.

IMPLEMENTATION SUMMARY:

- Ưu tiên 1 — HOÀN THÀNH: clipboard snapshot ma trận cho vùng chọn gồm `val`, `formula`, `style`; Paste All; Paste Values Only; Paste Formulas Only có dịch tham chiếu tương đối; Paste Formats Only gồm toàn bộ style/number format; Transpose xoay hàng/cột; dialog radio có focus trap/Escape nhờ dialog chung; command ribbon/context command; Ctrl+Alt+V; mỗi lần dán là đúng một `batch-cells` history step.
- Ưu tiên 1 QA — HOÀN THÀNH: unit thật cho giá trị công thức không còn formula, chỉ định dạng không đổi value, transpose đúng chiều + Undo/Redo, formulas-only dịch tham chiếu và giữ style đích; live Playwright copy thật qua UI, mở dialog thật bằng Ctrl+Alt+V, chọn radio và xác nhận DOM/formula bar.
- Tùy chọn phép toán Add/Subtract/Multiply/Divide — CHƯA LÀM: đây là mục không bắt buộc; ưu tiên giữ phạm vi bắt buộc ổn định và suite chính dưới giới hạn 60 giây.

FILES CHANGED:

- `apps/sheet/sheet-grid.js`, `apps/sheet/sheet-ribbon.js`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `adapters/libreoffice/common/command-dispatch-mapper.js`
- `platform/commands/command-definitions.js`
- `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`
- `tests/unit/sheet-paste-special.test.js`, `tests/live/sheet-paste-special.playwright.mjs`, `tests/run-tests.js`
- `docs/HANDOFF-SHEET-PASTE-SPECIAL.md`

COMMANDS RUN:

- `node --check apps/sheet/sheet-grid.js`
- `node --check adapters/libreoffice/sheet/sheet-adapter.js`
- targeted Paste Special, shortcut-scope và clipboard fallback unit runners
- `node tests/live/sheet-paste-special.playwright.mjs`
- `node tests/run-tests.js` (timed by execution session)
- `npm run check-syntax`

BUILD RESULT: NOT RUN — repository không có build script.
TEST RESULTS: PASS — Paste Special targeted `4/4`; PASS — shortcut scope và clipboard fallback; PASS — live Edge/Playwright trong 8.5s; PASS — full suite `755/755`, 0 FAIL, hoàn tất khoảng 55.9s (<60s).
KNOWN FAILURES: Không có.
RISKS: Clipboard có cấu trúc được bảo toàn trong cùng phiên VN Sheet; khi nguồn là ứng dụng ngoài, trình duyệt chỉ cung cấp plain text nên Paste Special không thể khôi phục style/formula metadata không tồn tại. Transpose công thức dùng quy tắc offset theo vị trí nguồn sau chuyển vị.
DEPENDENCIES/BLOCKERS: Không thêm dependency, không dùng thư viện trả phí.
CORE PATCH ID (if any): Không có — không sửa LibreOffice Core/upstream.
NEXT ACTION: Nếu được ưu tiên ở task sau, bổ sung nhóm phép toán Add/Subtract/Multiply/Divide và kiểm thử lỗi dữ liệu không phải số.

