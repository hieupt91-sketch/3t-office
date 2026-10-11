# Writer FODT Phase E.4 — đo thật trước khi viết serializer (Chart native)

**KHÔNG phải implementation.** File này ghi sự thật đã đo lại trong phiên E.4: chỗ Writer UI lưu Chart, cấu trúc `office:chart` ODF 1.3, và kết quả soffice → DOCX `word/charts/chart1.xml` (unzip XML thật, không đoán, không dùng số liệu E.3 nếu chưa chạy lại). Agent tiếp theo đọc file này rồi làm serializer.

- AGENT: Grok
- BRANCH: `feature/writer-fodt-migration-phase-e4`
- WORKTREE: `E:\VNOffice-grok-writer-fodt-phase-e4`
- BASE: `main` @ `6012075` — `node tests/run-tests.js` đo thật **1240/1240 PASS** (không dùng số trong handoff E.3 cũ)
- SOFFICE: `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe` — LibreOffice **26.2.5** (`version.ini` Vendor=The Document Foundation, buildid `cd7284b4cbbfeb507e630c1aac019f4157393acb`)
- Probe: `tests/scripts/probe-writer-fodt-phase-e4.mjs` (HTML Writer + C1–C6), `probe-writer-fodt-phase-e4-data.mjs` (cấu trúc local-table), `probe-writer-fodt-phase-e4-types.mjs` (4 loại + cache số)
- **Chưa sửa** `writer-adapter.js`.

## 0. Writer UI thật (không đoán)

Nguồn: `apps/writer/writer-illustrations.js` `generateChartHtml` / `generateChartSvg`. Lệnh `writer.chart.insert`. Loại UI: `bar` / `line` / `pie` / `area`. Một series, cặp nhãn/giá trị.

```html
<div class="vno-writer-chart" data-vno-chart="true" contenteditable="false" style="…chrome…">
  <div>
    <button type="button" class="vno-chart-delete-btn">× Xóa</button>
  </div>
  <div class="vno-chart-svg-container">
    <svg data-chart-type="bar" viewBox="0 0 640 320" …>
      <text data-chart-title …>CHART_BAR_Q</text>
      … rect / polyline / path / circle …
      <title>Q1: 120</title>
    </svg>
  </div>
</div>
<p><br></p>
```

Đo bằng `generateChartHtml({ type:"bar", title:"CHART_BAR_Q", labels:["Q1","Q2","Q3","Q4"], data:[120,190,300,250] })`:

| Marker | Có? |
|---|---|
| `data-vno-chart="true"` | Có |
| `data-chart-type` trên `<svg>` | Có (`bar`/`line`/`pie`/`area`) |
| `data-chart-title` trên `<text>` | Có (chữ tiêu đề) |
| `data-vno-chart-labels` / `data-vno-chart-data` | **Không** |
| `data-chart-labels` / `data-chart-values` | **Không** |
| JSON nhúng trong data-attribute | **Không** |
| Nút Xóa chrome | Có — không emit |
| `<p><br></p>` sau khối | Có (insertHTML); parse VN **không** phát lại đoạn này từ chart |

**Giới hạn thật:** Writer **không** lưu nhãn/giá trị gốc dưới dạng JSON hay data-attribute. Dữ liệu sống trong SVG:

- Tiêu đề: text của `<text data-chart-title>`.
- Từng điểm: `<title>Nhãn: số</title>` trên `rect` (bar), `circle` (line/area), `path`/`circle` (pie). `generateChartSvg` **luôn** ghi đúng dạng này khi có dữ liệu.
- Trục X cắt nhãn còn 12 ký tự — **không** dùng làm nguồn.
- Biểu đồ rỗng: không có `<title>`, chỉ chữ «Không có dữ liệu».

Ánh xạ an toàn: đọc `data-chart-type` + `data-chart-title` + mọi `<title>` khớp `/^(.*):\s*(-?\d+(?:\.\d+)?)$/` (nhãn greedy, số ở cuối — đo `Beta: extra: 20.5` → nhãn `Beta: extra`, giá trị `20.5`). Thiếu type hợp lệ, thiếu title-điểm, hoặc SVG không phải 4 loại UI → `WRITER_FODT_UNSUPPORTED_CONTENT`. **Không** suy diễn từ toạ độ `rect`/`path`.

`serializeToFodt()` hiện **throw** vì `<div>` block + `data-vno-chart`. `save()` / `_contentForExport()` không nối trong E.4.

## 1. Kết quả soffice thật (LibreOffice 26.2.5) — chạy lại E.4

Mọi fixture convert **không lỗi** soffice. Chart **phải** nằm trong `text:p`, neo `as-char` (C4 sibling bị nuốt — canonical `chartChart=0`, DOCX không `word/charts/`). Không OLE (`w:object` = 0). `wp:inline` + `word/charts/chart1.xml` native.

### 1.1 SAI — local-table thiếu cột (probe E.3 C1–C3)

Pattern E.3 (`table:table-header-rows` + `table:table-rows`, **không** `table:table-header-columns` / `table:table-columns`):

- DOCX **có** `c:barChart` / `c:lineChart` / `c:pieChart` đúng loại.
- `c:cat` 4 điểm **rỗng** (`<c:v></c:v>`).
- `c:numCache` `ptCount=4` **không** có `<c:pt>` giá trị.
- Canonical FODT: `office:value="NaN"`, nhãn `text:p` rỗng.

E.3 ghi «ra chart1.xml native» là đúng về **loại**, nhưng **không đo cache số**. E.4 đo lại: cấu trúc đó **mất dữ liệu**. Không dùng làm serializer.

### 1.2 Hướng chọn — local-table đủ cột (đo D1 / types)

Thêm đúng hai khối như Slides FODP đã verify:

```
<table:table table:name="local-table">
  <table:table-header-columns><table:table-column/></table:table-header-columns>
  <table:table-columns><table:table-column/></table:table-columns>
  <table:table-header-rows>… ô trống + tiêu đề series …</table:table-header-rows>
  <table:table-rows>… nhãn string + giá trị float …</table:table-rows>
</table:table>
```

Frame: `draw:style-name` graphic `draw:ole-draw-aspect="1"`, neo `as-char`, `svg:width="12cm"` `svg:height="7cm"`. Nested `office:document` MIME `application/vnd.oasis.opendocument.chart`, `xlink:href="."`. Một `chart:series`. Pie: **không** axis (class `chart:circle`).

| Fixture | `chart:class` | DOCX `word/charts/chart1.xml` thật |
|---|---|---|
| bar | `chart:bar` | `<c:barChart>` `barDir=col`; cat `Q1 Q2 Q3 Q4`; val `120 190 300 250`; title `TITLE_chart_bar`; 1 `c:ser` |
| line | `chart:line` | `<c:lineChart>`; cùng cat/val |
| pie | `chart:circle` | `<c:pieChart>` (không phải `chart:pie`); cùng cat/val |
| area | `chart:area` | `<c:areaChart>`; cùng cat/val |
| sibling `text:p` | bar | **Nuốt.** Không `word/charts/` |
| hai `chart:series` | bar | `c:barChart` + **2** `c:ser` — Writer UI chỉ 1 series → parse **throw** |

`plot-area table:cell-range-address` không bắt buộc khi đã có header-columns (D1 không có range vẫn giữ số). Serializer VN **có thể** omit range; không claim LO luôn giữ range.

Canonical FODT (D1): giữ `chart:chart` + `local-table` + số/nhãn trong `Object 1/content.xml` của ODT (`Q1`, `office:value="120"`). LO thêm `style:style` family chart (`chN`) + `draw:image` preview cạnh `draw:object`. Idempotence VN = output VN, không so canonical LO.

## 2. Ánh xạ serializer (chưa làm code)

**Emit** (block, không nhét `inlineXml`):

- Nới guard `data-vno-chart`.
- `blockXml`: `div.vno-writer-chart` / `data-vno-chart="true"` → `<text:p><draw:frame as-char>…chart…</draw:frame></text:p>`.
- Chrome nút Xóa không emit.
- Map UI: `bar→chart:bar`, `line→chart:line`, `pie→chart:circle`, `area→chart:area`. Khác → throw.
- Đọc dữ liệu từ SVG như mục 0. Không bịa từ path/rect.
- `xmlns:chart` trên `office:document` gốc khi có chart.
- Graphic OLE `draw:ole-draw-aspect="1"` (đo D1).
- Header/footer: throw (như WordArt).
- Nhiều series / class stock/radar / thiếu local-table lúc parse → `WRITER_FODT_UNSUPPORTED_CONTENT`.

**Parse:**

- `draw:frame` chứa `draw:object` + `chart:chart` (có thể kèm `draw:image` preview LO — bỏ preview, không throw nếu object chart hợp lệ).
- Đọc `chart:class`, đúng một `chart:series`, bảng `table:name="local-table"` (nhãn cột A, số cột B).
- `chart:column` → UI `bar`; `chart:pie`/`chart:circle` → `pie`. Class lạ → throw.
- Dựng lại HTML bằng `generateChartHtml({ type, title, labels, data })` rồi **cắt** `<p><br></p>` đuôi (hàm UI luôn thêm đoạn đó — giữ thì phá idempotence).
- `text:p` **chỉ** chứa frame chart (+ khoảng trắng) → emit **khối div**, không bọc `<p>` (nếu bọc, serialize lần 2 đụng `inline <div>`).
- Không đẩy chart vào `this.shapes`.

## 3. SmartArt / Diagram — vẫn không làm

Không đổi so với E.3: probe D1–D3 ra shape Word / `wpg:wgp`, không `word/diagrams/` hay `dgm:`. HTML 4 layout Writer không map 1-1 fail-closed. `data-vno-diagram` tiếp tục throw. Phạm vi E.4 của người phụ trách: Chart; Diagram để lại.

## 4. Việc chưa đo / giới hạn

- Chưa mở Microsoft Word bằng mắt (làm sau serializer, Start-Process thụ động, không SendKeys).
- Gradient/màu SVG Writer không map sang ODF chart style — LO tô series mặc định (đo `#99CCFF`). Không claim màu canvas.
- `fontSize`/layout SVG 640×320 không phải kích thước DOCX; frame 12×7cm theo fixture đã convert.
- PDF text extraction không dùng làm bằng chứng số liệu (số nằm drawing).
- FODT ngoài VN (LO thêm `chN`, `chart:data-point chart:repeated`, `draw:image` preview): parser nhận subset đo được; không claim mọi canonical.

## 5. Không làm

- Không nối `save()` / `exportPdf()` / `_contentForExport()`.
- Không đụng Sheet/Slides source, Core, build system.
- Không merge `main`.
- Không sửa `apps/writer/writer-illustrations.js` để thêm JSON data-attr (parse SVG đủ, đo được).
- Không flatten diagram thành `draw:rect`.
- Không emit local-table thiếu header-columns (đo mất dữ liệu).
