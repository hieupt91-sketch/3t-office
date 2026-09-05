# Agent Handoff

TASK: Sheet Pivot Table import fidelity (mở XLSX thật có sẵn Pivot Table)
AGENT/ROLE: Grok / implementation & verification
BRANCH: `fix/sheet-pivot-import-fidelity`
WORKTREE: `E:\VNOffice-grok-sheet-pivot-import`
OBJECTIVE: Xác nhận khi mở file Excel thật có Pivot Table (không do VN Office tự tạo) thì VN Sheet có đọc được khái niệm pivot hay chỉ còn bảng số liệu thường; nếu mất khái niệm, map DataPilot vào `pivotTablesBySheet` trong phạm vi hợp lý hoặc ghi rõ giới hạn thật.

**Không merge vào `main`.** Không đụng Writer/Slides.

## FINDINGS (trước khi sửa — đo bằng đường import thật)

Đường mở Sheet hiện tại:

```
common.file.open
  → SheetAdapter.open()
    → globalUnoBridge.openRealFile("sheet")
      → main.py open_document_dialog()
        → soffice --convert-to fods:OpenDocument Spreadsheet Flat XML
        → trả chuỗi FODS
      → SheetAdapter.loadFromFods() → parseFods()
```

Kiểm chứng code trước khi giả định:

- `grep pivot` trong `sheet-adapter.js`: chỉ bind command `sheet.data.pivotTable` / `sheet.data.pivotRefresh` xuống UI. **Không** parse, **không** serialize DataPilot.
- `parseFods()` / `loadFromFods()` / `serializeToFods()`: không có `data-pilot`, `database-range` (ngoài named-range), không đụng `pivotTablesBySheet`.
- `pivotTablesBySheet` sống ở `apps/sheet/sheet-grid.js`. Object thật khi tạo từ UI:

```js
{
  id, sourceSheet, sourceRange,   // "A1:C10"
  rows: ["Khu vực"],
  columns: ["Tháng"],
  values: [{ field: "Doanh thu", aggregate: "SUM" }],
  targetSheet
}
```

`refreshPivotTable()` lấy `[0]` của sheet đang mở rồi **ghi đè toàn bộ** `sheetsData[targetSheet]` bằng output của `PivotTableEngine`.

Fixture độc lập VN Office:

1. Viết tay `tests/fixtures/real-office-samples/src/sample-sheet-pivot.fods` — bảng doanh thu theo tháng/khu vực + ODF 1.3 DataPilot (`table:database-range` nguồn, `table:data-pilot-tables` / `table:data-pilot-table` / `table:data-pilot-field` Rows=Khu vực, Columns=Tháng, Data=SUM Doanh thu). Không đi qua `serializeToFods()`.
2. Convert `soffice --convert-to xlsx:Calc MS Excel 2007 XML`.

Kết quả đo:

| Tầng | DataPilot / Pivot | Dữ liệu nguồn T1 Bắc=120 | Bảng kết quả (số tính sẵn) |
| --- | --- | --- | --- |
| FODS tay | `table:data-pilot-table` còn | còn | còn (bảng tay) |
| XLSX soffice | `xl/pivotTables/pivotTable1.xml` + `xl/pivotCache/*` còn; `workbook.xml` có `pivotCaches` | còn | LibreOffice tính lại layout compact/outline |
| FODS soffice từ XLSX (đúng `main.py`) | `table:data-pilot-table` còn: source `DoanhThuNguon.A1:C10`, target `BangTongHop.A1:E6`, field row/column/data+sum | còn | còn (120, 450, 935, …) — layout Calc (`Sum - Doanh thu`, Total Result) |
| `parseFods()` **trước sửa** | **`pivotTablesBySheet` = null** — mất khái niệm pivot | đọc đúng | đọc như bảng thường |

Kết luận trước sửa:

- File Excel thật **có** Pivot native. soffice **giữ** DataPilot khi XLSX→FODS.
- VN Sheet **không** nhận đây là pivot (không vào `pivotTablesBySheet`, Refresh/cấu hình lại không có đối tượng). Người dùng chỉ thấy bảng số.
- Đây **không** phải mất trang / lỗi parse ô: dữ liệu nguồn và số liệu tính sẵn vẫn hiện.

## IMPLEMENTATION SUMMARY

Map được trong phạm vi hợp lý, **không** viết lại pivot engine:

1. `parseFods()` gọi `_attachImportedPivots()`: đọc `table:data-pilot-table` + `table:source-cell-range` + field `orientation=row|column|data`.
2. Anh xạ đúng object `pivotTablesBySheet` hiện có (sourceSheet/sourceRange/rows/columns/values/targetSheet). Function: sum/auto→SUM, count/countnums→COUNT, average/min/max.
3. `loadFromFods()` / `open()` gắn state lên grid. Không refresh lúc mở — giữ layout Calc/Excel đã tính sẵn trên sheet kết quả.
4. **Không map** khi target sheet = source sheet: `refreshPivotTable()` sẽ xóa dữ liệu nguồn. Ghi rõ là giới hạn thật.
5. Bỏ qua page/hidden/data-layout field; bỏ qua DataPilot không có value field map được.

Không sửa Core LibreOffice. Không serialize DataPilot khi Lưu (ngoài scope). Không merge `main`.

## FILES CHANGED

- `adapters/libreoffice/sheet/sheet-adapter.js` — parse DataPilot → `pivotTablesBySheet`; `loadFromFods` khôi phục state
- `tests/fixtures/real-office-samples/src/sample-sheet-pivot.fods` — FODS tay
- `tests/fixtures/real-office-samples/sample-sheet-pivot.xlsx` — soffice convert, không phải VN serialize
- `tests/scripts/generate-real-office-fixtures.mjs` + README fixture
- `tests/scripts/probe-sheet-pivot-import.mjs` — đo FODS / XLSX / FODS import / parse hiện trạng
- `tests/unit/sheet-pivot-import.test.js`
- `tests/run-tests.js` — suite 67
- `docs/FEATURE-PARITY-ROADMAP.md`
- `docs/HANDOFF-SHEET-PIVOT-IMPORT-FIDELITY.md`

Không đụng `apps/writer/**`, `apps/slides/**`, adapter Writer/Slides, `main.py`.

## COMMANDS RUN

- `node tests/scripts/probe-sheet-pivot-import.mjs` — đo DataPilot sống sót FODS→XLSX→FODS; parse cũ `pivotTablesBySheet: null`
- `node --check adapters/libreoffice/sheet/sheet-adapter.js`
- `node tests/run-tests.js`
- `git diff --check`

## BUILD RESULT

PASS — repo không có bước build; `node --check` Sheet adapter PASS.

## TEST RESULTS

| Suite | Result | Ghi chú |
| --- | --- | --- |
| `node tests/run-tests.js` | **PASS** 742/742, 0 FAIL, **45.61s** (< 60s) | Gồm 8 test import Pivot |
| Suite 67 Pivot import | **PASS** 8/8 | FODS tay; cùng-sheet không map; loadFromFods; refresh tương thích engine; XLSX native `pivotTable1.xml`; FODS soffice range `Sheet.A1:Sheet.E6`; `adapter.open()` |

`node tests/scripts/probe-sheet-pivot-import.mjs` (không nằm trong run-tests.js): soffice FODS→XLSX sinh `xl/pivotTables` + `xl/pivotCache`; XLSX→FODS giữ `table:data-pilot-table`. Chạy riêng vì convert headless ~14s/lần.

Không claim PASS cho test chưa chạy. Không disable test. Không SendKeys.

Không claim PASS cho test chưa chạy. Không disable test. Không SendKeys.

## TRẢ LỜI CÂU HỎI GỐC (trung thực)

**VN Sheet có đọc được Pivot Table thật từ Excel không?**

Có, **một phần — đủ dùng cho kế toán khi pivot nằm sheet riêng**:

| Mức | Trước task | Sau task |
| --- | --- | --- |
| Dữ liệu nguồn | Đọc đúng | Đọc đúng |
| Bảng kết quả tính sẵn | Đọc như bảng thường, không lỗi/mất trang | Như cũ, vẫn hiện số Calc/Excel |
| Nhận đây là pivot (`pivotTablesBySheet`) | **Không** | **Có** (sheet đích ≠ sheet nguồn, Rows/Columns/Values/SUM…) |
| Refresh / cấu hình lại | Không có đối tượng | Refresh chạy engine VN — **layout khác Excel** (không grand total, header kiểu `T1 — SUM Doanh thu`) |
| Pivot trên cùng sheet nguồn | Không | Vẫn không map (cố tình) |
| Page field, group, show-as, compact layout Excel | Không | Không |

Đây **không** phải import Pivot đầy đủ như Excel. Đây là nhận diện cấu hình DataPilot cơ bản + giữ số liệu tính sẵn.

## KNOWN FAILURES / GIỚI HẠN THẬT

1. **Cùng sheet nguồn+kết quả:** không map. `refreshPivotTable()` ghi đè cả sheet. Follow-up: refresh ghi vào `target range`, không thay cả `sheetsData`.
2. **Layout Excel/Calc ≠ engine VN.** Mở file: giữ ô soffice đã tính. Bấm Refresh: layout VN, mất Total Result / `Sum - Doanh thu`. Không ép đồng bộ layout trong task này.
3. **Page/filter field, group, calculated field, show-as % of, multiple pivots trên 1 sheet (UI chỉ dùng `[0]`):** chưa hỗ trợ. Map thiếu sẽ cho số sai nếu user Refresh.
4. **Lưu XLSX không ghi DataPilot.** Mở pivot thật → Sửa → Lưu: mất khái niệm pivot, còn số liệu thường. Cùng class lỗi CF/validation trước khi có serialize. Follow-up riêng.
5. **Mở `.ods`/`.fods` trực tiếp** vẫn đi FODS — DataPilot trong FODS được parse. XLSX đi soffice convert; đã đo soffice giữ DataPilot.
6. Hàm DataPilot ngoài SUM/COUNT/AVERAGE/MIN/MAX (product, stdev, var) bị bỏ qua; nếu không còn value field thì cả bảng không map.

## DEPENDENCIES/BLOCKERS

Không dependency mới, không thư viện trả phí. Cần `soffice.exe` cho test convert XLSX→FODS (cùng helper các task import trước). Không CORE PATCH.

CORE PATCH ID (if any): Không có — không sửa LibreOffice Core.

## NEXT ACTION

- **Không merge vào `main`.** Review trên `fix/sheet-pivot-import-fidelity`.
- Follow-up nếu cần đủ Excel-like: (1) refresh theo range, cho phép cùng-sheet; (2) serialize DataPilot khi Lưu; (3) page field / layout parity; (4) không dùng `[0]` duy nhất trên mỗi sheet.
