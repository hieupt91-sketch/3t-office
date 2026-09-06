# Handoff — Sheet Fill Down Shift+Click bug fix

**Branch:** `fix/sheet-filldown-shift-click`  
**Worktree:** `E:\VNOffice-grok-fix-filldown`  
**Base:** `main` @ `e7bc156`  
**Không merge vào main.** Người phụ trách đọc lại trước.

## Objective

Sửa lỗi thật: sau Shift+Click chuột chọn G2:G4 rồi Ctrl+D, G3/G4 hiện rỗng thay vì `400`/`600`. Không phải tính năng mới.

## Current capability (trước sửa)

- `fillDown()` + `_offsetFormula()` đúng khi gọi với range object rõ ràng (unit test gán `selectionRange` thẳng).
- Shift+Arrow / `selectCell(col, row, true)` đúng.
- Shift+Click **chuột thật** không tạo vùng nhiều ô. Bài live `sheet-editing-styles.playwright.mjs` chỉ `console.log` G3/G4, không assert, nên lỗi bị che.

## Root cause (đã đo, không đoán)

Chi tiết đầy đủ: `docs/HANDOFF-SHEET-FILLDOWN-BUG-FINDINGS.md` (commit trước khi sửa code).

Đo Playwright thật, wrap `_startRangeSelect` / `selectCell`:

1. Click G2 → `selectionRange = G2:G2` (đúng).
2. Shift+mousedown G4: `_startRangeSelect` nhận `shiftKey: true` nhưng gọi `selectCell("G", 4, false)` — **hardcoded false**.
3. Range bị reset thành `G4:G4`. Neo G2 mất.
4. `click` handler gọi `selectCell("G", 4, true)` quá muộn: `start` đã là G4 nên `end = G4`.
5. Dump trước Ctrl+D: `selectionRange = {start:G4, end:G4}`, label `"G4"` — **không phải G2:G4**.
6. `fillDown()` trên 1 hàng copy từ G3 (trống) xuống G4 → G3 rỗng, G4 rỗng.
7. Control: `fillDown({start:I2, end:I4})` cho I3=`400` (`=H3*2`), I4=`600` (`=H4*2`). Logic Fill Down không hỏng.

Nguyên nhân gốc: **`_startRangeSelect` bỏ qua `e.shiftKey`**. `mousedown` chạy trước `click`, nên Shift+Click chuột thật không bao giờ tạo range.

## Fix

`apps/sheet/sheet-grid.js` — `_startRangeSelect`:

- Nếu `e.shiftKey` và đã có `selectionRange`: giữ neo (`selectedCoord` / `selectionRange.start`), gọi `selectCell(col, row, true)`.
- Nếu không Shift: giữ hành vi cũ (`selectCell(col, row, false)` rồi drag `mousemove` cập nhật `end`).

Không sửa `fillDown()`, `_offsetFormula()`, Writer, Slides.

## Ảnh hưởng cùng root cause

Mọi lệnh đọc `this.selectionRange` sau Shift+Click chuột thật đều chỉ thấy 1 ô: Fill Right (Ctrl+R), copy/cut/paste vùng, Clear Formats/Contents trên vùng, merge, chart, data tools, v.v.

Cùng một chỗ sửa. Đã thêm unit test Fill Right đi qua chuỗi mousedown/click Shift. Shift+Arrow không đi qua `_startRangeSelect` nên vốn không hỏng.

`setStyle()` chỉ tô ô `selectedCoord` (không phải range) — hành vi cũ, ngoài phạm vi bug này.

## Files/modules

| File | Việc |
|---|---|
| `apps/sheet/sheet-grid.js` | `_startRangeSelect` tôn trọng `e.shiftKey` |
| `tests/unit/sheet-editing-styles.test.js` | Test mới: mô phỏng mousedown+click Shift 3 ô rồi `fillDown` / `fillRight`, assert G3=400 G4=600 |
| `tests/unit/sheet-mouse-shortcuts.test.js` | Test mới: `_startRangeSelect` + shiftKey → G2:G4; không shift → reset 1 ô |
| `tests/live/sheet-editing-styles.playwright.mjs` | `assert.strictEqual` G3==="400", G4==="600" và range label `G2:G4` trước Ctrl+D |
| `tests/live/sheet-filldown-shift-click.playwright.mjs` | Live mới: đúng kịch bản Shift+Click 3 ô rồi Ctrl+D |
| `docs/HANDOFF-SHEET-FILLDOWN-BUG-FINDINGS.md` | Findings đo được, commit **trước** khi sửa |
| `docs/HANDOFF-SHEET-FILLDOWN-BUG-FIX.md` | Handoff này |

Không đụng `apps/writer/**`, `apps/slides/**`.

## Dependencies and risk

- Không thêm dependency.
- Rủi ro thấp, giới hạn chuỗi mousedown Shift. Drag-select không Shift không đổi.

## Test evidence (chạy thật)

**Trước sửa (HEAD `main`):** `node tests/run-tests.js` → **1184/1184 PASS, 0 FAIL**.

**Sau sửa:**

| Lệnh | Kết quả |
|---|---|
| `node tests/run-tests.js` | **1187/1187 PASS, 0 FAIL** (+3 test mới) |
| `node tests/live/sheet-filldown-shift-click.playwright.mjs` | **PASS** — assert `selectionRange` G2:G4, G3=`400` (`=F3*2`), G4=`600` (`=F4*2`) |
| `node tests/live/sheet-editing-styles.playwright.mjs` | **PASS** với `assert.strictEqual`, không chỉ log. Log: `G3="400"`, `G4="600"` |

Nếu lỗi tái xuất hiện, live test và unit test sẽ FAIL rõ, không còn che bằng `console.log`.

## Rollback

`git revert` commit fix trên branch, hoặc bỏ worktree. Không đổi file format / data.

## Review notes

- Không merge `main`.
- Template `/09-templates/AGENT-HANDOFF.md` không có ở root worktree; handoff đủ mục objective, current capability, files, dependency, risk, test evidence, rollback.
