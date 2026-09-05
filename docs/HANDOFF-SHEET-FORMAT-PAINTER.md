# Agent Handoff

TASK: VN Sheet — Format Painter (Sao chép định dạng)
AGENT/ROLE: Grok / Sheet implementation and QA
BRANCH: `feature/sheet-format-painter`
WORKTREE: `E:\VNOffice-grok-sheet-format-painter`
OBJECTIVE: Thêm Format Painter chuẩn Excel trên tab Trang đầu, nhóm Bảng nhớ tạm của VN Sheet: copy style ô nguồn sang ô/vùng đích, không copy giá trị/công thức; khóa bằng double-click; Esc hủy; mỗi lần áp dụng là một bước Undo/Redo.

FINDINGS:

- Grep `formatPainter` / `FormatPainter` trong `apps/sheet` và `apps/slides` trống. Chỉ Writer có `common.edit.formatPainter` (Sao chép định dạng) trên Home > Bảng nhớ tạm, triển khai trong `WriterAdapter._toggleFormatPainter()` bằng `getComputedStyle` + `document.execCommand`, cursor `copy`, **không** có chế độ khóa double-click.
- VN Sheet đã có model style trên từng ô (`item.style`: `backgroundColor`, `border`, `fontWeight`, `textAlign`, `numberFormat`, …) và `_renderCellVisual` / `_applyStylesToDom`. Paste Special “Chỉ định dạng” đã copy style mà không đổi `val`/`formula` qua `applyPasteSpecial(..., "formats")` + history `batch-cells`. Format Painter tái sử dụng đúng model đó, không đụng LibreOffice Core.
- Ribbon Sheet Home clipboard đang là nút Dán lớn + cột Cắt / Sao chép / Dán đặc biệt (3 hàng để tránh tràn ngang 1366px). Format Painter được gắn icon-only cạnh Dán đặc biệt trên hàng thứ ba, giữ chiều cao 3 hàng.

IMPLEMENTATION SUMMARY:

- Lệnh `sheet.edit.formatPainter` (toggle, icon cọ vẽ `formatPainter`) trên Home > Bảng nhớ tạm, cạnh Dán / Dán đặc biệt. Không gán Ctrl+Shift+C để tránh trùng Writer.
- Click 1 ô nguồn → bấm nút → class `vno-format-painter-active` + `data-format-painter="on"` trên `.vno-sheet-container`, cursor CSS hình cọ vẽ (SVG data-URI, fallback `copy`). Click ô hoặc kéo chọn vùng đích → copy toàn bộ `style` nguồn (nền, font, viền, `numberFormat`, `textAlign`, …). `val` / `formula` đích không đổi.
- Double-click nút = khóa (`data-format-painter="locked"`), áp dụng được nhiều vùng đến khi Esc hoặc bấm lại nút. Click thứ hai trong 400ms sau khi bật bị bỏ qua để không tắt nhầm khi double-click.
- Esc (listener capture trên `document` + keydown lưới) hủy chế độ, con trỏ về bình thường.
- Mỗi lần áp dụng ghi một `batch-cells` history step; Undo/Redo khôi phục đúng style cũ, không đụng data. `_renderCellVisual` reset `cssText` trước khi vẽ lại để Undo không để sót màu/viền cũ trên DOM.
- Adapter bindHandler + `handleDispatch` + map UNO `.uno:FormatPaintbrush` (Calc). Double-click ribbon được bắt bằng listener `dblclick` capture trên `document`.

FILES CHANGED:

- `apps/sheet/sheet-grid.js`, `apps/sheet/sheet-ribbon.js`, `apps/sheet/sheet.css`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `adapters/libreoffice/common/command-dispatch-mapper.js`
- `platform/commands/command-definitions.js`
- `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`
- `tests/unit/sheet-format-painter.test.js`, `tests/live/sheet-format-painter.playwright.mjs`, `tests/run-tests.js`
- `docs/HANDOFF-SHEET-FORMAT-PAINTER.md`

COMMANDS RUN:

- `node --check` trên grid/ribbon/adapter/tests
- `node tests/unit/sheet-format-painter.test.js` (qua runner ad-hoc) — 8/8 PASS
- `node tests/live/sheet-format-painter.playwright.mjs` — PASS (Edge headless, click thật, ~8.8s)
- `node tests/run-tests.js` — 828/828 PASS, 0 FAIL, 52.31s (<60s)

BUILD RESULT: NOT RUN — repository không có build script; syntax check và full automated suite đã chạy.
TEST RESULTS: PASS — 8 unit Format Painter; PASS — live Playwright click thật trên canvas (không SendKeys): bấm nút cọ vẽ, click ô đích, double-click khóa, Esc hủy, Undo QAT khôi phục style; PASS — full suite `828/828` trong `52.31s`.
KNOWN FAILURES: Không có.
RISKS:

- Nguồn là **một ô đang chọn** (`selectedCoord`). Nếu user chọn vùng rồi bấm Format Painter, Excel thật copy pattern cả vùng; VN Sheet copy style ô active. Ghi nhận để mở rộng sau.
- Cursor cọ vẽ dùng SVG data-URI (Chromium/Edge). Trình duyệt không hỗ trợ SVG cursor sẽ fallback `copy`.
- Clipboard group rộng thêm ~1 nút icon. Overflow 1366px không nằm trong suite `run-tests.js`; live overflow test riêng chưa chạy lại trong task này.

DEPENDENCIES/BLOCKERS: Không thêm dependency, không dùng thư viện trả phí.
CORE PATCH ID (if any): Không có — không sửa LibreOffice Core/upstream.
NEXT ACTION: Nếu được ưu tiên, copy pattern nhiều ô nguồn (Excel range-to-range) và đo lại ribbon overflow 1366/1600. Không merge vào `main`.
