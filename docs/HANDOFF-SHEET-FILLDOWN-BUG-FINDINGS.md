# HANDOFF — Sheet Fill Down / Shift+Click: findings (root cause)

**Branch:** `fix/sheet-filldown-shift-click`  
**Worktree:** `E:\VNOffice-grok-fix-filldown`  
**Base:** `main` @ `e7bc156`  
**Baseline tests trước khi sửa:** `node tests/run-tests.js` → **1184/1184 PASS, 0 FAIL** (chạy thật trên HEAD `main`).  
**Không merge vào main.** File này ghi lại nguyên nhân đã đo được, **trước khi sửa code**, để agent khác có thể tiếp tục nếu session bị cắt.

## Triệu chứng (đã tái hiện)

Kịch bản live `tests/live/sheet-editing-styles.playwright.mjs`:

1. Gõ `100`/`200`/`300` vào F2/F3/F4, gõ `=F2*2` vào G2 (DOM hiện `200`).
2. Click G2, giữ Shift, click G4, thả Shift.
3. Nhấn Ctrl+D (Fill Down).

Kết quả đo được: G3 DOM `""`, G4 DOM `""`. Kỳ vọng: G3=`400` (`=F3*2`), G4=`600` (`=F4*2`).

Bài test hiện tại **chỉ `console.log`** G3/G4 cạnh giá trị mong đợi, **không `assert`**, nên suite vẫn PASS dù Fill Down sai.

## Cách đo (không đoán)

Script chẩn đoán tạm: `tests/live/_diag-filldown-selection.playwright.mjs` (Playwright + Edge headless, HTTP thật).

- Wrap `grid._startRangeSelect` và `grid.selectCell` để log `shiftKey`, `extendRange`, `selectionRange` trước/sau mỗi lần gọi.
- Dump `selectionRange` / `selectedCoord` / `getSelectedRangeLabel()` **ngay sau Shift+Click G4, TRƯỚC Ctrl+D**.
- Dump `cellsData` G2/G3/G4 sau Ctrl+D.
- Control: gọi `fillDown({ start:{c:"I",r:2}, end:{c:"I",r:4} })` trực tiếp với range object rõ ràng.

## Kết quả đo thật

### 1. Sau click G2 (không Shift)

```json
selectionRange: { "start": { "c": "G", "r": 2 }, "end": { "c": "G", "r": 2 } }
selectedCoord: { "c": "G", "r": 2 }
rangeLabel: "G2"
```

Đúng.

### 2. Shift+mousedown G4 — `_startRangeSelect` nhận `shiftKey: true` nhưng vẫn reset vùng chọn

Log đo được (rút gọn, đúng thứ tự event):

```text
_startRangeSelect BEFORE  col=G row=4  shiftKey=true
  selectionRange = G2:G2     ← neo còn đúng

selectCell BEFORE           col=G row=4  extendRange=false   ← BUG: hardcoded false
  selectionRange = G2:G2

selectCell AFTER            col=G row=4  extendRange=false
  selectionRange = G4:G4     ← neo G2 bị xóa

_startRangeSelect AFTER     col=G row=4  shiftKey=true
  selectionRange = G4:G4
```

Điểm gọi: `apps/sheet/sheet-grid.js` `_startRangeSelect` (~dòng 1017):

```js
this._rangeAnchor = { c: col, r: row };
this.selectCell(col, row, false);   // luôn false, bỏ qua e.shiftKey
```

`mousedown` luôn chạy **trước** `click`. Vì vậy Shift+Click thật không bao giờ kịp mở rộng vùng chọn.

### 3. `click` handler có `event.shiftKey === true` nhưng đã quá muộn

```text
selectCell BEFORE  col=G row=4  extendRange=true
  selectionRange = G4:G4        ← start đã là G4

selectCell AFTER   col=G row=4  extendRange=true
  selectionRange = G4:G4        ← end = G4, range 1 ô
```

`selectCell(..., true)` chỉ gán `selectionRange.end`. Vì `_startRangeSelect` đã đặt `start = G4`, extend không kéo được về G2.

### 4. Dump ngay trước Ctrl+D

```json
selectionRange: { "start": { "c": "G", "r": 4 }, "end": { "c": "G", "r": 4 } }
selectedCoord:  { "c": "G", "r": 4 }
nameBox / rangeLabel: "G4"
```

**Không phải G2:G4.** Vùng chọn sau Shift+Click chuột thật là **một ô G4**.

### 5. Sau Ctrl+D

```text
DOM G3 = ""    DOM G4 = ""
cellsData G2 = { val: 200, formula: "=F2*2" }
cellsData G3 = null
cellsData G4 = { val: "", formula: "", style: {} }
```

Khớp logic `fillDown()` khi range chỉ có 1 hàng (`minRow === maxRow === 4`):

- `sourceRow = 4 - 1 = 3` (ô G3 trống)
- `destStartRow = destEndRow = 4`
- Copy G3 trống xuống G4; G3 không bị đụng.

Đây là hệ quả của selection sai, không phải `_offsetFormula` hỏng.

### 6. Control: `fillDown()` với range object rõ ràng — ĐÚNG

```js
grid.fillDown({ start: { c: "I", r: 2 }, end: { c: "I", r: 4 } }, false)
```

Kết quả đo:

```text
I2 = { val: 200, formula: "=H2*2" }
I3 = { val: 400, formula: "=H3*2" }
I4 = { val: 600, formula: "=H4*2" }
```

`fillDown()` + `_offsetFormula()` + `formulaEngine.evaluate()` hoạt động đúng khi `selectionRange` đúng.

Unit test hiện có (`tests/unit/sheet-editing-styles.test.js`) cũng PASS vì gán thẳng:

```js
grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 3 } };
grid.fillDown();
```

Test `selectCell("J", 20, false); selectCell("J", 25, true)` cũng PASS vì **không đi qua `_startRangeSelect`**. Đó là lý do bug bị che trên unit suite.

## Root cause (đã đo, không đoán)

**`_startRangeSelect(e, col, row)` luôn gọi `selectCell(col, row, false)`**, bỏ qua `e.shiftKey`.

Chuỗi sự kiện chuột thật:

1. `mousedown` → `_startRangeSelect` → `selectCell(clicked, false)` → range = 1 ô vừa click (xóa neo).
2. `mouseup`
3. `click` → `selectCell(clicked, event.shiftKey)` → nếu Shift đang giữ thì chỉ set `end` trên range đã bị reset.

Hệ quả: Shift+Click chuột thật **không bao giờ tạo vùng nhiều ô**. Mọi lệnh dùng `this.selectionRange` sau thao tác đó (Ctrl+D Fill Down, Ctrl+R Fill Right, copy/paste vùng, định dạng vùng, Clear, v.v.) đều chỉ thấy 1 ô.

`selectCell(col, row, true)` và `fillDown(range)` **không phải** root cause.

## Hướng sửa (chưa làm — file này commit trước khi sửa)

Trong `_startRangeSelect`:

- Nếu `e.shiftKey` và đã có `selectionRange`: **giữ neo** (`selectionRange.start` / `selectedCoord`), gọi `selectCell(col, row, true)` để mở rộng `end`.
- Nếu không Shift: giữ hành vi hiện tại (`selectCell(col, row, false)` rồi drag `mousemove` cập nhật `end`) — drag-select không Shift phải không đổi.

Sau đó:

- Sửa `tests/live/sheet-editing-styles.playwright.mjs` để **assert** `G3 === "400"` và `G4 === "600"`.
- Thêm test mới tái hiện đúng chuỗi mousedown Shift+Click 3 ô rồi Ctrl+D.
- Không đụng Writer/Slides source. Không merge `main`.

## Ảnh hưởng cùng root cause (chưa sửa)

Cùng `_startRangeSelect` + `selectionRange` nên cùng hỏng với Shift+Click chuột thật:

- Fill Right (Ctrl+R)
- Copy / Cut / Paste vùng
- Định dạng vùng (Cell Styles, Format Cells, Clear Formats/Contents)
- Merge, chart, data tools… khi người dùng chọn vùng bằng Shift+Click chứ không phải Shift+Arrow hay `selectCell(..., true)` trực tiếp.

Shift+Arrow không đi qua `_startRangeSelect` nên không bị lỗi này.

## Rollback của bước findings

Xóa file này và commit. Chưa có thay đổi `apps/sheet/sheet-grid.js`.
