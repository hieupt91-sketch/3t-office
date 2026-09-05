# Agent Handoff

TASK: Sheet Charts import fidelity (mở XLSX thật có sẵn Chart)
AGENT/ROLE: Grok / implementation & verification
BRANCH: `fix/sheet-charts-import-fidelity`
WORKTREE: `E:\VNOffice-grok-sheet-charts-import`
OBJECTIVE: Xác nhận khi mở file Excel thật có Chart (không do VN Office tự tạo) thì VN Sheet có đọc được biểu đồ hay mất/flatten; nếu mất khái niệm, map `<chart:chart>` vào `chartsBySheet` trong phạm vi hợp lý hoặc ghi rõ giới hạn thật.

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

- `grep chart` trong `sheet-adapter.js`: chỉ bind command `sheet.chart.insert` xuống `grid.openChartBuilder()`. **Không** parse, **không** serialize `<chart:chart>`.
- `parseFods()` / `loadFromFods()` / `serializeToFods()`: không có `chart:chart`, `draw:object`, `draw:frame`. Không đụng `chartsBySheet`.
- `chartsBySheet` sống ở `apps/sheet/sheet-grid.js`. Object thật khi tạo từ UI:

```js
{
  id, type,            // "bar" | "line" | "pie" | "area"
  range: { start: { c, r }, end: { c, r } },
  title, labels: [], data: []
}
```

`SheetChartBuilder.extractRangeData()` lấy nhãn cột đầu + giá trị số cột sau trên **một** sheet Map. Engine SVG chỉ 1 series.

Fixture độc lập VN Office:

1. Viết tay `tests/fixtures/real-office-samples/src/sample-sheet-charts.fods` — bảng Tháng/Doanh thu T1=120 … T4=200 + ODF 1.3 chart object (`<table:shapes>` / `<draw:frame>` / `<draw:object>` bọc `<chart:chart chart:class="chart:bar">`, 1 series `DoanhThu.B2:B5`, categories `A2:A5`, title “Doanh thu theo tháng”). Không đi qua `serializeToFods()`.
2. Convert `soffice --convert-to xlsx:Calc MS Excel 2007 XML`.

Kết quả đo (`node tests/scripts/probe-sheet-charts-import.mjs`, 05/09/2026):

| Tầng | Chart live | Dữ liệu nguồn T1=120 / T4=200 | Ghi chú |
| --- | --- | --- | --- |
| FODS tay | `<chart:chart class="chart:bar">` còn; **không** có `<draw:image>` | còn | object nhúng, không preview |
| XLSX soffice | `xl/charts/chart1.xml` (`c:barChart`, formula `DoanhThu!$B$2:$B$5` / `$A$2:$A$5`, cache 120/150/180/200, title) + `xl/drawings/drawing1.xml` | còn | **Chart Excel native**, không phải ảnh |
| FODS soffice từ XLSX (đúng `main.py`) | `<chart:chart class="chart:bar">` còn: series B2:B5, categories A2:A5, title “Doanh thu theo tháng”; **kèm** `<draw:image><office:binary-data>` preview (~18KB) — **không** flatten mất object | còn | `local-table` cache nằm trong chart; plot-area **không** còn `table:cell-range-address` |
| `parseFods()` **trước sửa** | **`chartsBySheet` = null** — mất khái niệm chart | đọc đúng ô | leak sheet ảo `"Trang tính 2"` vì `<table:table\b` khớp `table:table-row` sau `local-table` |

Kết luận trước sửa:

- File Excel thật **có** Chart native. soffice **giữ** `<chart:chart>` khi XLSX→FODS (không flatten thành ảnh tĩnh trên chart cột đơn giản).
- VN Sheet **không** nhận đây là chart (không vào `chartsBySheet`, overlay SVG không hiện). Người dùng chỉ thấy bảng số.
- Preview `<draw:image>` **đi kèm** object, không thay thế object.
- Regex table cũ **rò sheet ảo** khi FODS có chart — lỗi adapter, không phải giới hạn LibreOffice.

## IMPLEMENTATION SUMMARY

Map được trong phạm vi hợp lý, **không** viết lại SVG engine:

1. `parseFods()` gọi `_xmlWithoutEmbeddedObjects()` trước khi đọc ô: thay nội dung `<draw:object>…</draw:object>` bằng stub, nên `local-table` không thành worksheet. Siết regex `<table:table(?=[\s>/])` để không khớp `table:table-row`.
2. `_attachImportedCharts()`: đọc `<draw:frame>` có `<chart:chart>`. Map `chart:class` bar/column→`bar`, line→`line`, area→`area`, circle/ring/pie→`pie`. Bỏ loại khác (stock, radar, scatter…).
3. Range = union **categories + values của series đầu** (A2:B5 trên fixture). Không gộp `chart:label-cell-address` / plot-area header — `extractRangeData()` biến chuỗi không số thành `0` nếu chỉ còn chữ.
4. Hydrate `labels`/`data` bằng `SheetChartBuilder.extractRangeData` sẵn có. `loadFromFods()` / `open()` gắn `chartsBySheet` rồi `refreshCharts`/`renderCharts`.
5. **Không serialize** `<chart:chart>` khi Lưu (cùng class giới hạn Pivot). Không sửa Core LibreOffice. Không merge `main`.

## FILES CHANGED

- `adapters/libreoffice/sheet/sheet-adapter.js` — strip object nhúng; parse `<chart:chart>` → `chartsBySheet`; `loadFromFods` khôi phục state
- `tests/fixtures/real-office-samples/src/sample-sheet-charts.fods` — FODS tay
- `tests/fixtures/real-office-samples/sample-sheet-charts.xlsx` — soffice convert, không phải VN serialize
- `tests/scripts/generate-real-office-fixtures.mjs` + README fixture
- `tests/scripts/probe-sheet-charts-import.mjs` — đo FODS / XLSX / FODS import / parse
- `tests/unit/sheet-charts-import.test.js`
- `tests/run-tests.js` — suite 76
- `docs/FEATURE-PARITY-ROADMAP.md`
- `docs/HANDOFF-SHEET-CHARTS-IMPORT-FIDELITY.md`

Không đụng `apps/writer/**`, `apps/slides/**`, adapter Writer/Slides, `main.py`. Không đụng `apps/sheet/sheet-chart.js` (reuse extract/render).

## COMMANDS RUN

- `node tests/scripts/probe-sheet-charts-import.mjs` — đo chart sống sót FODS→XLSX→FODS; parse cũ `chartsBySheet: null` + leak `"Trang tính 2"`
- `node --check adapters/libreoffice/sheet/sheet-adapter.js`
- `node tests/run-tests.js`
- `git diff --check`

## BUILD RESULT

PASS — repo không có bước build; `node --check` Sheet adapter PASS.

## TEST RESULTS

| Suite | Result | Ghi chú |
| --- | --- | --- |
| `node tests/run-tests.js` | **PASS** 806/806, 0 FAIL, **53.01s** (< 60s) | Gồm 9 test import Chart |
| Suite 76 Chart import | **PASS** 9/9 | FODS tay; FODS soffice + local-table không leak sheet; stock bỏ qua; nhiều series chỉ series đầu; loadFromFods; XLSX native `c:barChart`; serialize không ghi chart; `adapter.open()` |

`node tests/scripts/probe-sheet-charts-import.mjs` (không nằm trong run-tests.js): soffice FODS→XLSX sinh `xl/charts/chart1.xml` + `xl/drawings`; XLSX→FODS giữ `chart:chart` + preview image. Chạy riêng vì convert headless ~15–30s/lần.

Không claim PASS cho test chưa chạy. Không disable test. Không SendKeys.

## TRẢ LỜI CÂU HỎI GỐC (trung thực)

**VN Sheet có đọc được Chart thật từ Excel không?**

Có, **một phần — đủ cho chart cột/đường/tròn/miền 1 series** (đúng model SVG hiện có):

| Mức | Trước task | Sau task |
| --- | --- | --- |
| Dữ liệu nguồn | Đọc đúng | Đọc đúng |
| Chart Excel native trong XLSX | soffice giữ `xl/charts/chart1.xml` | không đổi (LibreOffice) |
| FODS sau convert | `<chart:chart>` còn, kèm preview image | không đổi (LibreOffice) |
| Nhận đây là chart (`chartsBySheet`) | **Không** (`null`) | **Có** (bar/line/area/pie, 1 series, range + title + labels/data) |
| Overlay SVG | Không hiện | Hiện nếu `loadFromFods`/`open` (cùng engine VN Sheet tự tạo) |
| Nhiều series / stock / radar / scatter | Không | Vẫn không (nhiều series: chỉ series đầu; loại khác bỏ qua) |
| Lưu XLSX ghi lại chart | Không | Vẫn không |

Đây **không** phải import Chart đầy đủ như Excel. Đây là nhận diện `<chart:chart>` cơ bản + vẽ lại bằng SVG 1 series của VN Sheet.

LibreOffice **không** flatten chart cột đơn giản thành ảnh tĩnh trên đường XLSX→FODS đã đo. Ảnh preview đi kèm object. Nếu một loại chart Excel phức tạp nào đó bị soffice flatten **chỉ còn** `<draw:image>` (không còn `<chart:chart>`), adapter **cố ý không bịa** chart từ ảnh — chưa đo loại đó trong task này.

## KNOWN FAILURES / GIỚI HẠN THẬT

1. **Một series.** Engine VN Sheet chỉ 1 dãy số. Series thứ 2+ bị bỏ; `seriesCount` ghi nhận. Follow-up: model nhiều series.
2. **Loại ODF ngoài bar/line/area/circle/ring/pie** (stock, radar, scatter, bubble, surface…): không map. Dữ liệu ô vẫn đọc.
3. **Range chéo sheet.** `extractRangeData` đọc 1 `Map`. Chart nguồn sheet khác sheet đặt frame: không map nếu sheet nguồn không có trong workbook; không vẽ cross-sheet.
4. **Lưu XLSX không ghi `<chart:chart>`.** Mở chart thật → Sửa → Lưu: mất khái niệm chart, còn số liệu thường. Cùng class lỗi Pivot trước khi có serialize. Follow-up riêng.
5. **Header series name.** Không đưa `chart:label-cell-address` vào range vì `extractRangeData` biến chữ thành `0`. Title lấy từ `<chart:title>`.
6. **Vị trí/kích thước frame** (svg:x/y/width) chưa map lên overlay (overlay VN đặt cạnh cột cuối của range).
7. **Mở `.ods`/`.fods` trực tiếp** vẫn đi FODS — chart inline được parse. XLSX đi soffice convert; đã đo soffice giữ chart.
8. **Chart flatten-only** (nếu có loại soffice chỉ xuất ảnh): không map. Chưa có fixture Excel combo/pivot-chart/3D để đo.

## DEPENDENCIES/BLOCKERS

Không dependency mới, không thư viện trả phí. Cần `soffice.exe` cho test convert XLSX→FODS (cùng helper các task import trước). Không CORE PATCH.

CORE PATCH ID (if any): Không có — không sửa LibreOffice Core.

## NEXT ACTION

- **Không merge vào `main`.** Review trên `fix/sheet-charts-import-fidelity`.
- Follow-up nếu cần đủ Excel-like: (1) serialize `<chart:chart>` khi Lưu; (2) nhiều series; (3) vị trí frame; (4) đo combo/pivot-chart/3D xem soffice có flatten không.
