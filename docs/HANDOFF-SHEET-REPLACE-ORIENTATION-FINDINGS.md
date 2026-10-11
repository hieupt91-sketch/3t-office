# Findings — Sheet Replace handler + cell orientation (đo trước khi viết code)

TASK: Sửa bug `common.edit.replace` trên VN Sheet + thêm `sheet.cell.orientation` (xoay chữ trong ô)
AGENT/ROLE: Grok — Sheet adapter / grid (không đụng Writer/Slides source)
BRANCH: `feature/sheet-replace-orientation`
WORKTREE: `E:\VNOffice-grok-sheet-replace-orientation`
BASE: `main` @ `cdfcae6` (Merge `feature/writer-line-numbers`)
**KHÔNG merge vào main.** File này commit **trước** implementation để agent khác tiếp tục không phải đo lại.

---

## Baseline đã xác nhận (không đoán)

- `git rev-parse HEAD` = `cdfcae6`
- `node tests/run-tests.js` trên HEAD này, chạy thật: **1300/1300 PASS, 0 FAIL**.
- Worktree song song: `E:\VNOffice-agy-sheet-ribbon-parity-r2` (`fix/sheet-ribbon-parity-round2`) — cùng HEAD `cdfcae6`. Ribbon audit 1280px có thể đang chạy ở worktree đó; khi thêm nút Orientation phải chạy `tests/live/ribbon-audit-1280.playwright.mjs` trên worktree này (cổng 8893) **trước khi commit** phần ribbon.

soffice: `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe`

Script đo: `tests/scripts/probe-sheet-text-rotation.mjs` (FODS viết tay với `style:rotation-angle` / `style:direction` → soffice XLSX → dump `xl/styles.xml` `textRotation` → soffice XLSX→FODS). Temp: `%TEMP%\vno-probe-sheet-rotation-7N5IbP`.

---

## Nhiệm vụ 1 — `common.edit.replace` không làm gì

### Triệu chứng (đọc code, không đoán UI)

Ribbon Sheet Home, nhóm Editing đã có nút:

```263:264:apps/sheet/sheet-ribbon.js
              { type: "button", commandId: "common.edit.find", iconOnly: true },
              { type: "button", commandId: "common.edit.replace", iconOnly: true }
```

Command đã khai báo (`platform/commands/command-definitions.js` dòng 30, shortcut Ctrl+H). UNO map `.uno:SearchDialog` đã có trong `command-dispatch-mapper.js`. Test unit `sheet-editing-styles.test.js` chỉ assert **chuỗi JSON ribbon chứa id** — không assert handler.

Sheet adapter **chỉ bind Find**:

```310:312:adapters/libreoffice/sheet/sheet-adapter.js
    globalCommandBus.bindHandler("common.edit.find", () => {
      return this.grid.showFindDialog ? this.grid.showFindDialog() : false;
    });
```

`grep bindHandler("common.edit.replace")` trên `sheet-adapter.js` = **0 hit**. `handleDispatch` cũng chỉ có `case "common.edit.find"` (khoảng dòng 2835), không có replace.

`CommandBus.execute` khi không có handler:

```106:108:platform/commands/command-bus.js
    if (!handler) {
      console.warn(`[CommandBus] Chưa có handler xử lý cho lệnh: ${commandId}`);
      return false;
```

Bấm nút Thay thế / Ctrl+H trên Sheet → `false`, dialog không mở. Writer và Slides bind đủ cả hai.

### Dialog Find hiện có của Sheet — Find-only

`SheetGridController.showFindDialog()` (`apps/sheet/sheet-grid.js` ~5029) là hộp thoại **riêng**, chỉ có ô tìm + nút «Tìm tiếp». Không có ô «Thay thế bằng», không có nút Thay thế / Thay thế tất cả. Tìm trên `cellsData` theo `item.val` và `item.formula` (đúng mô hình ô, không phải HTML).

Writer/Slides dùng **cùng** `showFindReplaceDialog` trong `platform/ui-kit/dialogs.js`:

- `isReplace=true` hiện `#vno-fr-replace-group`, nút `#vno-fr-replace-btn` / `#vno-fr-replace-all-btn`
- Checkbox «Hiển thị tùy chọn thay thế» để bật/tắt
- Callback `onFind` / `onReplace` / `onReplaceAll`

Slides pattern (đúng theo task):

```54:55:adapters/libreoffice/slides/slides-adapter.js
    globalCommandBus.bindHandler("common.edit.find", () => this._showFindReplaceDialog(false));
    globalCommandBus.bindHandler("common.edit.replace", () => this._showFindReplaceDialog(true));
```

### Quyết định trước khi code (không tạo dialog thứ 3)

Không viết hộp thoại mới. **Tái sử dụng** `showFindReplaceDialog` (đã có chế độ Replace), gắn callback vào lưới Sheet:

| Callback | Việc lưới phải làm |
|---|---|
| `onFind(text)` | tìm tiếp trong `cellsData` (logic hiện có trong `showFindDialog`) rồi `selectCell` |
| `onReplace(find, replace)` | nếu ô đang chọn khớp thì ghi `val`/`formula`; không thì tìm tiếp rồi thay 1 ô |
| `onReplaceAll(find, replace)` | duyệt mọi ô, thay chuỗi trong `val` và `formula` (không phải HTML), `_recordHistory`, `_recalculateAllFormulas` |

`showFindDialog()` giữ API cũ: gọi chung dialog với `isReplace=false`. `showFindDialog(true)` / handler replace mở cùng dialog với Replace active.

Help: `platform/help/entries-sheet.js` **không có** bài Tìm/Thay thế (Slides đã có). Task sửa bug vẫn phải thêm bài hướng dẫn tiếng Việt vì người dùng Word/Excel cần biết Ctrl+H trên Sheet.

---

## Nhiệm vụ 2 — `sheet.cell.orientation`

### Command / ribbon hiện tại

- **Không có** `sheet.cell.orientation` trong `command-definitions.js`, i18n, UNO map, icon, help.
- Nhóm Alignment Home hiện tại (Round 1):

```
Row 1: alignTop, alignMiddle, alignBottom, wrapText
Row 2: alignLeft, alignCenter, alignRight, indentDecrease, indentIncrease
Row 3: mergeCenter, mergeAcross, mergeCells, unmerge
```

Excel thật: Orientation là dropdown **hàng 1**, sau Top/Middle/Bottom (chỗ VN đang để wrapText). Round 1 đặt wrapText lên hàng 1 vì hiểu nhầm vị trí Excel. Thêm Orientation vào hàng 1 (sau wrapText, 5 nút) — nếu ribbon-audit 1280 tràn thì lùi wrapText / thu gọn, **không** gộp merge (test bắt 4 nút merge visible).

`createDropdownButton` hiện `execute(subItem.commandId)` **không truyền args**. Một lệnh `sheet.cell.orientation` + 6 góc cần một trong:

1. `type: "select"` (đã truyền value — giống `sheet.format.quickCategory`) — an toàn overflow hơn.
2. Dropdown Excel-like: 1 dòng trong `platform/ui-kit/components.js` `execute(subItem.commandId, subItem.args)` — tương thích ngược (`args` undefined = hành vi cũ).

Không tách 6 command id.

### Cách Sheet đang lưu style ô (đọc code)

Mọi căn chỉnh hiện tại đi qua `grid.setStyle(prop, val)`:

```5146:5168:apps/sheet/sheet-grid.js
  setStyle(prop, val, recordUndo = true) {
    ...
    item.style[prop] = val;
    this.cellsData.set(key, item);
    const cell = this.container.querySelector(`.vno-grid-cell[data-coord="${key}"]`);
    if (cell) cell.style[prop] = val;
```

`item.style` là object CSS-like: `textAlign`, `verticalAlign`, `fontWeight`, `whiteSpace`, `paddingLeft`, `numberFormat` (object, **không** phải CSS).

`_applyStylesToDom` copy mọi key trừ `numberFormat` thẳng vào `dom.style[k]`. **Không được** lưu góc vào key CSS giả (`textRotation` không phải CSS property). Pattern đúng = `numberFormat`: key riêng, skip trong `_applyStylesToDom`, render riêng trong `_renderCellVisual`.

`setStyle` chỉ áp **một ô** `selectedCoord` — cùng hạn chế với align/wrap hiện tại. Orientation theo đúng pattern đó (không mở rộng range trong task này).

### FODS hiện tại **không** ghi alignment CSS

`serializeToFods()` chỉ tạo automatic style `ceN` cho **numberFormat** (`_collectNumberFormats` → `n1`/`ce1`). `textAlign` / `verticalAlign` / wrap / font **không** ra ODF. `_cellFromFodsAttributes` cũng chỉ đọc number format.

Muốn LibreOffice → XLSX giữ xoay chữ, **bắt buộc** emit `style:table-cell-properties` chuẩn ODF trên `table:style-name`, không dùng `vno:*` (LibreOffice bỏ namespace lạ khi convert XLSX — đã đo với number-format custom attr).

Tái sử dụng registry deterministic: thu thập key xoay duy nhất, đặt tên `ceRot1`, `ceRot2`, … Nếu ô vừa có numberFormat vừa có rotation thì style kết hợp (`ce1_rot1` hoặc gộp properties vào cùng `<style:style>` với `style:data-style-name`).

### Đo thật soffice: ODF → XLSX `textRotation` → FODS canonical

Mỗi case 1 ô A1, 1 cell style. `xl/styles.xml` luôn có 3 `<alignment>` (2 mặc định `textRotation="0"` + 1 xf của ô). Ô A1 dùng `s="1"` = xf thứ hai (0-based), tức block alignment **thứ 3**.

| FODS ghi | XLSX `textRotation` (xf ô) | FODS sau XLSX→FODS (canonical LO) |
|---|---|---|
| `style:rotation-angle="0"` | `0` | `style:rotation-angle="0"` `style:direction="ltr"` |
| `style:rotation-angle="45"` | `45` | `45` |
| `style:rotation-angle="90"` | `90` | `90` |
| `style:rotation-angle="-45"` | `135` | `style:rotation-angle="315"` |
| `style:rotation-angle="-90"` | `180` | `style:rotation-angle="270"` |
| `style:rotation-angle="315"` | `135` | `315` |
| `style:rotation-angle="270"` | `180` | `270` |
| `style:rotation-angle="45deg"` | `45` | `45` (đơn vị `deg` được LO chấp nhận, canonicalize bỏ đơn vị) |
| `style:direction="ttb"` | `255` | `style:direction="ttb"` `style:rotation-angle="0"` |
| `ttb` + `glyph-orientation-vertical="0"` | `255` | `ttb` + `rotation-angle="0"` (glyph bị bỏ) |
| `rotation-angle="0"` + `direction="ttb"` | `255` | `ttb` + `0` |

Khớp ECMA-376: 0–90 = ngược chiều kim đồng hồ; 91–180 = 1…90° theo chiều kim (`textRotation = 90 + |góc|`); **255 = stacked / dọc từng chữ**.

«Dọc từ dưới lên» trên Excel = stacked = `textRotation=255` = ODF `style:direction="ttb"` (không phải 90°). 90° là «xoay chữ lên» (cả cụm nằm dọc, không stacked).

### Model nội bộ sẽ dùng

`item.style.textRotation`:

- `0 | 45 | -45 | 90 | -90` (độ, dấu Excel)
- `255` = dọc stacked

Ghi FODS (canonical LO, để round-trip XLSX ổn định):

- `255` → `style:direction="ttb"` (có thể kèm `style:rotation-angle="0"`)
- `< 0` → `style:rotation-angle="{360 + góc}"` (−45 → 315, −90 → 270)
- `> 0` → `style:rotation-angle="{góc}"`
- `0` / thiếu → không emit rotation (tránh phình style mặc định)

Đọc FODS:

- `style:direction="ttb"` → `255` (ưu tiên, kể cả khi angle=0)
- angle `0–90` → giữ
- angle `> 180` → `angle - 360` (315 → −45, 270 → −90)

Render lưới: skip `textRotation` trong `_applyStylesToDom`; `_renderCellVisual` áp `transform: rotate(-Ndeg)` (CSS dương theo chiều kim; Excel dương ngược chiều → đảo dấu). `255` dùng stacked (ví dụ `writing-mode` / chữ từng dòng), không `rotate(255deg)`.

---

## Phạm vi file khi implement (không đoán)

Task ghi `sheet-adapter.js`, `sheet-grid.js`, `tests/*`. Thực tế Orientation **không lên ribbon/help** nếu không đụng thêm (vẫn Sheet, không Writer/Slides):

- `apps/sheet/sheet-ribbon.js` — dropdown/select nhóm Alignment
- `platform/commands/command-definitions.js` — `sheet.cell.orientation`
- `platform/i18n/strings-vi.js` + `strings-en.js`
- `platform/help/entries-sheet.js` — bài Find/Replace + bài Orientation
- `platform/ui-kit/icons.js` — icon orientation
- `adapters/libreoffice/common/command-dispatch-mapper.js` — `.uno:ChangeRotation`
- Có thể 1 dòng `platform/ui-kit/components.js` nếu dùng dropdown + `args`

Không sửa `apps/writer/**`, `apps/slides/**`, `adapters/libreoffice/writer/**`, `adapters/libreoffice/slides/**`.

---

## Kế hoạch implement (sau commit findings)

1. **Commit này** — findings + probe. Không sửa runtime.
2. **Nhiệm vụ 1 (ưu tiên):** bind replace, mở shared dialog Replace-active, `findNext`/`replaceOne`/`replaceAll` trên grid, unit + live Playwright, help tiếng Việt. Commit riêng.
3. **Nhiệm vụ 2:** command + handler + style key + FODS registry + soffice assert `textRotation` byte/XML, ribbon, help. Commit riêng. Ribbon-audit 1280 **PASS trước commit**.
4. Handoff `docs/HANDOFF-SHEET-REPLACE-ORIENTATION.md`. Không merge main.

---

## Rủi ro đã thấy

- Ribbon overflow 1280px nếu thêm control Alignment hàng 1 (Round 2 đang chạy song song).
- Ô vừa numberFormat vừa rotation: phải gộp automatic style, không ghi đè `ceN` number-only.
- `setStyle` một ô: Orientation giống align hiện tại; Excel thật áp cả vùng chọn — ngoài scope trừ khi làm theo range sẵn có.
- Dialog Find cũ của Sheet biến mất UI riêng khi chuyển sang shared dialog — Find vẫn chạy, UX khớp Writer/Slides.
