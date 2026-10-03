# HANDOFF: VN Sheet — Nhận diện giờ gõ tay (13:45) thành serial + định dạng giờ

## Tóm tắt
Trước đây gõ `13:45` vào ô được lưu thành **chuỗi** (`valueType: "string"`), nên SUM, sắp xếp,
Điền tự động không tính được và ô không có định dạng giờ. Đây là lỗi FAIL duy nhất của
`tests/live/cdp/cdp_types.mjs` (`timeDetected: false`).

Sửa: gõ `H:MM`, `HH:MM`, `HH:MM:SS` giờ được lưu thành **số ngày dạng phân số** (13:45 =
`49500/86400` = `0.5729166…`) kèm `numberFormat = { category: "time", timeFormat: "HH:mm" }`,
hiển thị lại đúng `13:45`/`09:05`/`13:45:30`. Giờ sai (`25:00`, `13:60`, `1:2`) vẫn là văn bản.

## Files changed

### 1. `apps/sheet/number-formatter.js`
- **`isTimeInput(val)` (mới)**: regex `^(\d{1,2}):(\d{2})(?::(\d{2}))?$` + giờ ≤ 23, phút/giây ≤ 59.
  Chỉ nhận chuỗi; số/null trả `false`.
- **`formatTime(val, config)` (mới)**: serial → `HH:mm` hoặc `HH:mm:ss` (đếm theo `timeFormat`,
  đệm `HH` khi mẫu có `hh`, có giây khi mẫu có `ss`), trả `{ text, align: "right" }`.
- **`formatValue`**: thêm `case "time"` (đặt ngay sau `case "date"`).

### 2. `apps/sheet/sheet-grid.js`
- **`_normalizeCellInput()`**: sau nhánh nhận diện ngày, thêm nhánh nhận diện giờ — chỉ chạy khi
  `category !== "text"` và (`category` rỗng hoặc `"general"`), đặt
  `nextStyle.numberFormat = { category: "time", timeFormat: "HH:mm" | "HH:mm:ss" }`.
  Nhánh này chạy trước `normalizeInputForFormat` nên nhánh `category === "time"` có sẵn
  (đã khóa test ở suite 54 dòng 177) sẽ chuyển chuỗi → serial.
- **`setCellValue()`**: `nextVal` trong lịch sử giữ lại dấu nháy đơn khi ô được ép text
  (`escapedText ? "'" + val : …`) để **Redo** gõ lại đúng chuỗi thay vì auto-detect lần nữa.
  Thiếu dòng này thì Ctrl+Shift+; → Undo → Redo sẽ ra số thập phân.
- **`insertCurrentTime()` (Ctrl+Shift+;)**: truyền `'${timeStr}` để giữ nguyên hành vi cũ
  (chuỗi `HH:mm:ss`, khớp `tests/unit/sheet-mouse-shortcuts.test.js`), không tự gắn định dạng giờ.
- **`adjustDecimalPlaces()`**: thêm `"time"` vào danh sách loại trừ (phím tăng/giảm số thập phân
  không phá định dạng giờ).
- **`showFormatCellsDialog()` `onApply`**: hộp thoại chưa có nhóm "Giờ" nên state mặc định mang
  `dateFormat = "dd/mm/yyyy"`; nếu `config.category === "time"` thì giữ `timeFormat` (mặc định
  `HH:mm`) và `delete config.dateFormat`, nếu không định dạng giờ sẽ bị ghi đè thành ngày tháng.

### 3. `platform/help/entries-sheet.js`
- Bài `sheet.input.nativeValues`: thêm 1 bước hướng dẫn nhập giờ (dạng gõ, `Ctrl+Shift+;`,
  giờ sai giữ nguyên văn bản), cập nhật `summary` + `keywords` (`giờ`, `time`).

### 4. `tests/unit/sheet-format-cells.test.js` (suite 54)
7 test mới: `isTimeInput` hợp lệ/sai, setCellValue lưu serial + hiển thị lại, không đổi hành vi
số/ngày/phần trăm/văn bản/`'13:45`, `adjustDecimalPlaces` bỏ qua ô giờ, `insertCurrentTime`
Undo/Redo, lưu FODS rồi mở lại giữ serial + `category time`.

## Test results (đã chạy thật)

| Gate | Kết quả |
|---|---|
| `node tests/run-tests.js` | **PASS — 2573/2573, 0 FAIL** |
| `node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs` | **PASS — 27 PASS / 0 FAIL / 0 BLOCKED / 6 N/A** |
| `node scripts/check-syntax.js` | **PASS — 137/137 file hợp lệ** |

Desktop `3T Sheet type detection` giờ trả:
```json
{"timeDetected": true,
 "A3": {"value": 0.5729166666666666, "valueType": "number",
        "numberFormat": {"category":"time","timeFormat":"HH:mm"}, "formatCategory":"time"}}
```
Các giá trị khác trong cùng test giữ nguyên: number `1234.56`, date `46387`/`dd/mm/yyyy`,
percentage `0.25`, text `abc`, `'0123` vẫn chuỗi.

## KNOWN FAILURES / GAP CHƯA SỬA (cần quyết định)

**Trạng thái: NOT RUN (chưa sửa) — nằm trong `adapters/**` (vùng Integration/Core owner),
task này bị ràng buộc "không sửa code save/open" nên dừng lại để xin quyết định.**

Đo được bằng probe thật (`serializeToFods` → `parseFods` → `serializeToFods` lần 2):

| Vòng | Kết quả |
|---|---|
| Save lần 1 | ✅ `<number:time-style>` (hours : month), `office:value-type="time" office:time-value="PT13H45M00S"`, `vno:number-format` JSON |
| Mở lại | ✅ val `0.5729166666666666`, `category:"time"`, `timeFormat:"HH:mm"` → hiển thị `13:45` |
| Save lần 2 | ❌ style biến thành `<number:number-style>` 0 chữ số thập phân → LibreOffice hiện `0.572916666666667` |

- **Nguyên nhân**: `_parseNumberStyles()` (`adapters/libreoffice/sheet/sheet-adapter.js:1866`)
  bắt regex `number-style|percentage-style|currency-style|date-style|text-style|boolean-style`
  — **thiếu `time-style`**. Vì thế ô giờ không có `.odf`, trong khi `parseFods` lại tiêm
  `excelCode = _excelCodeFromNumberFormat({category:"time"})` = `"0;0;0;@"` (mã số, không phải giờ).
  `_numberFormatXml` ưu tiên `odf` → `excelCode` → `category`, nên lần lưu thứ 2 dùng `excelCode`
  và mất định dạng giờ.
- **Đường an toàn**: gõ giờ rồi lưu ngay (mô hình chưa qua `parseFods`, không có `excelCode`) là đúng.
  Lỗi chỉ lộ khi **mở tệp đã lưu rồi lưu lại**.
- **Tùy chọn sửa (1 dòng, không đổi format semantics)** — `_excelCodeFromNumberFormat()`:
  `if (cat === "time") return null;` → lần lưu 2 rơi về nhánh `category` → sinh lại time-style.
- **Tùy chọn sửa đầy đủ** — thêm `time-style` vào `styleRegex` + nhánh parse
  `{category:"time", timeFormat}` (tương tự nhánh `date-style`). Vừa vá lỗ hổng trên, vừa
  sửa lỗi sẵn có khác: tệp XLSX bên ngoài có cột `hh:mm` do LibreOffice sinh `<number:time-style>`
  cũng đang bị bỏ qua → ô hiện số thập phân.

Không sửa LibreOffice core, không thêm dependency, không tắt/bỏ qua test nào.

## RISKS
- Sửa adapter (2 phương án trên) là thay đổi **import/export** → theo AGENTS mục 6/11 phải plan
  trước và xin quyết định; có thể ảnh hưởng test round-trip FODS/XLSX hiện hữu.
- Nhánh nhận diện giờ chỉ chạy khi định dạng General/Trống; ô đã gán định dạng Số/Phần trăm/Khác
  vẫn theo hành vi cũ (đúng yêu cầu "chỉ khi format general/empty").

## NEXT ACTION
1. Chờ quyết định: vá gap save lần 2 (tùy chọn 1 dòng hay parse `time-style`), hay để task riêng.
2. Sau khi có quyết định → chạy lại `node tests/run-tests.js` + desktop regression rồi commit/push theo chỉ đạo.
