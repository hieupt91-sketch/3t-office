# Writer FODT Phase E.3 — đo thật trước khi viết serializer (WordArt / Chart / Diagram)

**KHÔNG phải implementation.** File này ghi sự thật đã đo: chỗ Writer UI lưu WordArt/Chart/Diagram, FODT tay ODF 1.3, reverse Word VML WordArt → FODT, và kết quả soffice → DOCX/PDF/canonical FODT (unzip XML thật, không đoán). Agent tiếp theo đọc file này rồi làm serializer, không đo lại từ đầu.

- AGENT: Grok
- BRANCH: `feature/writer-fodt-migration-phase-e3`
- WORKTREE: `E:\VNOffice-grok-writer-fodt-phase-e3`
- BASE: `main` @ `7f610ca` — `node tests/run-tests.js` đo thật **1230/1230 PASS** (không dùng số trong handoff E.2 cũ)
- SOFFICE: `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe` — LibreOffice **26.2.5** (`version.ini` Vendor=The Document Foundation, buildid `cd7284b4cbbfeb507e630c1aac019f4157393acb`)
- Probe: `tests/scripts/probe-writer-fodt-phase-e3.mjs` (13 FODT tay + 1 DOCX VML WordArt ngược)
- **Chưa sửa** `writer-adapter.js`.

## 0. Writer UI thật (không đoán)

### 0.1 WordArt — INLINE span trong `bodyDom`, không phải `this.shapes`

Nguồn: `apps/writer/insert-dialogs.js` `buildWriterWordArtHtml` / `WORDART_PRESETS` (8 mẫu). Ribbon: tab **Chèn**, lệnh `writer.insert.wordart`.

```html
<span class="vno-writer-wordart" data-vno-wordart="true"
      data-vno-wordart-preset="ocean-gradient"
      data-vno-wordart-text="Khai giảng"
      data-vno-wordart-style="{JSON encodeURIComponent}"
      contenteditable="false" role="img" tabindex="0">
  <span class="vno-wordart-text" style="font-family:Impact; font-size:48px; … linear-gradient … -webkit-text-stroke … text-shadow …">Khai giảng</span>
</span>
```

Nằm **trong đoạn văn tại caret**, không overlay. 8 preset: `navy-outline`, `gold-outline`, `ocean-gradient`, `sunset-gradient`, `heavy-outline`, `emerald-glow`, `violet-gradient`, `frost-shadow`. Mỗi preset có `fillColor` / `gradient` / `strokeColor` / `strokeWidth` / `shadow` / `fontFamily` / `fontSize=48`.

`serializeToFodt()` hiện **throw** `WRITER_FODT_UNSUPPORTED_CONTENT` vì guard `data-vno-*` (Phase A/E.1 chưa nới `wordart`). Audit HTML cũ (`docs/HANDOFF-WRITER-WORDART.md`): LibreOffice HTML filter **giữ chữ, mất CSS/gradient/Fontwork**. Phase E.3 không nối `save()` / `_contentForExport()`.

### 0.2 Chart — khối `<div>` HTML + SVG, không phải overlay

Nguồn: `apps/writer/writer-illustrations.js` `generateChartHtml` / `generateChartSvg`. Lệnh `writer.chart.insert`.

```html
<div class="vno-writer-chart" data-vno-chart="true" contenteditable="false" …>
  <button class="vno-chart-delete-btn">…</button>
  <div class="vno-chart-svg-container">
    <svg data-chart-type="bar" viewBox="0 0 640 320">
      <text data-chart-title>…</text>
      … rect/polyline/path …
      <title>Nhãn: giá trị</title>
    </svg>
  </div>
</div>
```

Loại UI: `bar` / `line` / `pie` / `area`. Dữ liệu **không** có `data-vno-chart-labels` riêng — nhãn/giá trị nằm trong SVG (`<title>Label: 120</title>` + legend). Nút Xóa là chrome. `serializeToFodt()` hiện throw vì `<div>` block + `data-vno-chart`.

### 0.3 SmartArt/Diagram — khối HTML node, không phải `this.shapes`

Nguồn: cùng file, `generateDiagramHtml`. Loại: `process` / `cycle` / `hierarchy` / `list`.

```html
<div class="vno-writer-diagram" data-vno-diagram="true" data-diagram-type="process" contenteditable="false">
  <div class="vno-diagram-node">…<div class="vno-diagram-node-text" contenteditable="true">Bước 1</div></div>
  …
</div>
```

Nhiều `div` lồng, màu inline, mũi tên HTML (`➔`), **không** connector ODF. `this.shapes` Phase B.2 chỉ 6 primitive overlay — diagram **không** đi đường đó.

### 0.4 Shape cơ bản đã có (Phase B.2) — không làm lại

`rectangle` / `round-rect` / `circle` / `line` / `arrow` / `textbox` đã serialize `this.shapes` → `draw:rect|ellipse|line|custom-shape right-arrow|frame+text-box` **bên trong `text:p`**. Parser hiện **throw** `draw:custom-shape` không phải `right-arrow` — Fontwork body sẽ đụng guard này nếu không nới.

## 1. WordArt — kết quả soffice thật (LibreOffice 26.2.5)

Mọi fixture convert **không lỗi** soffice (trừ nuốt sibling, xem 1.3).

### 1.1 Hướng chọn — `draw:custom-shape` Fontwork `fontwork-plain-text` trong `text:p`

Graphic input: `draw:fill="solid" draw:fill-color="#1e3a8a" draw:stroke="solid" svg:stroke-color="#ffffff"`. Text: Impact 36pt bold. Geometry:

```
draw:text-path="true" draw:text-path-allowed="true" draw:text-path-mode="shape"
draw:type="fontwork-plain-text"
draw:enhanced-path="M 0 10800 L 21600 10800 Z N"
```

| Fixture | Anchor | DOCX thật | Canonical FODT |
|---|---|---|---|
| W1 as-char trong `text:p` | `as-char` | `w:pict` + `v:shapetype o:spt="136"` + `v:textpath string="KHAI_GIANG"` + `fillcolor="#1e3a8a"`. **Không** `w:drawing` / `prstTxWarp`. Chữ không nằm `w:t` (nằm VML). `DOC_TEXT="Truoc sau."` | Giữ `draw:custom-shape` `fontwork-plain-text` `as-char`, LO thêm `draw:modifiers="10800"` + `draw:equation` + đổi size 10×2.2cm → 6.264×1.611cm |
| W2 paragraph trong `text:p` | `paragraph` + `svg:x/y` | Cùng VML WordArt, `string="WORDART_PARA"` | Giữ Fontwork, anchor paragraph |
| W5 navy fill | as-char | `fillcolor="#1e3a8a"` (khớp graphic ODF). `font-size:12pt` (fitshape — **mất** 36pt Writer). Stroke Word không hiện `strokecolor=` trong snippet đo | Giữ Fontwork |

Đây **là** WordArt VML Word (`o:spt="136"` + `v:textpath`), cùng họ reverse watermark E.2 nhưng **trong body**, không header.

PDF W1/W5 hợp lệ `%PDF-` / MediaBox A4; chuỗi ASCII `KHAI_GIANG` **không** nằm text stream (chữ nằm drawing) — không dùng PDF text extraction làm bằng chứng.

### 1.2 `fontwork-wave` — cũng convert, ra thêm DrawingML warp

W4: `draw:type="fontwork-wave"` → DOCX **cả** `w:pict`/`v:textpath string="WORDART_WAVE"` **và** `mc:AlternateContent` + `w:drawing` + `prstTxWarp` `textWave1` + `prstGeom=rect`. Canonical giữ `fontwork-wave`.

Writer UI **không** có preset uốn sóng — 8 mẫu là fill/stroke/gradient/shadow trên chữ thẳng. Serializer VN **chỉ** emit `fontwork-plain-text`. Parser **nhận** `fontwork-*` (kể cả wave) để không mất chữ khi mở FODT ngoài VN.

### 1.3 SAI — Fontwork sibling của `text:p`

W3: `draw:custom-shape` cùng cấp `text:p` trong `office:text` → soffice **không lỗi** nhưng **nuốt** drawing. Canonical `customShape=0`. DOCX không `w:pict`/`v:textpath`. Chỉ còn `SIBLING_BEFORE SIBLING_AFTER`.

Cùng sự thật Phase B.2: serializer **bắt buộc** nhét Fontwork vào trong `text:p`. WordArt UI đã là inline trong đoạn → `as-char` khớp caret.

### 1.4 SAI — `draw:frame` + `draw:text-box` (chữ to, không Fontwork)

W6: as-char text-box chữ `TEXTBOX_NOT_FONTWORK` → DOCX `w:drawing` + `wps:wsp` + `prstGeom=rect` + txbx. **Không** `v:textpath`. Canonical giữ `draw:frame`. Đây là Text Box Phase B.2, **không** phải WordArt.

Slides FODP WordArt dùng `draw:frame`+`vno:wordart` — **không** tái sử dụng cho Writer FODT (Writer cấm import Slides internals; và hướng đó không ra VML WordArt).

### 1.5 Reverse — DOCX VML WordArt body (`v:shapetype` 136 + `v:textpath string="WORDART_BODY_VML"`) → FODT

LibreOffice 26.2.5 import thành:

```xml
<text:p>Truoc
  <draw:custom-shape text:anchor-type="as-char" draw:name="WordArt 2" …>
    <text:p>WORDART_BODY_VML</text:p>
    <draw:enhanced-geometry draw:text-path="true" draw:text-path-mode="shape"
      draw:type="fontwork-plain-text" draw:modifiers="10800" …/>
  </draw:custom-shape>
sau.</text:p>
```

Round-trip FODT → DOCX: lại `v:textpath string="WORDART_BODY_VML"` + `font-family:Impact;font-size:36pt` (giữ font từ VML gốc; Fontwork **tay** của VN bị LO đổi Times 12pt vì fitshape).

Parser VN phải nhận Fontwork body (không nhét `this.shapes`, không nhầm watermark header). `draw:name` Word không có preset VN (`WordArt 2`) → parse dùng preset mặc định `navy-outline` + chữ đo được, không bịa gradient.

### 1.6 Giới hạn Fontwork so với CSS Writer

| Thuộc tính Writer | ODF Fontwork / Word VML đo được |
|---|---|
| Chữ | Có (`v:textpath string`, FODT `text:p`) |
| `fillColor` | Có (`draw:fill-color` → `fillcolor="#1e3a8a"`) |
| `strokeColor` | Graphic ODF có; Word VML `stroked="t"` — không claim `strokecolor` luôn có |
| `fontSize` 48px / 36pt | **Mất** khi emit Fontwork tay (fitshape → 12pt). Giống E.2 watermark Fontwork 1pt |
| `gradient` / `text-shadow` / `-webkit-text-stroke` | **Không** map 1-1 sang Fontwork plain-text |
| Preset id | Không có trong ODF chuẩn — serializer VN ghi `draw:name="WordArt-<presetId>"` để idempotence VN; Word/LO canonicalize tên |

Idempotence VN = `serialize → parse → serialize` output VN (dựng lại span bằng `buildWriterWordArtHtml(text, { presetId })`), **không** so canonical LO.

## 2. Chart — kết quả soffice thật

### 2.1 Hướng chọn — `draw:frame` + `draw:object` + nested `office:document` chart, **trong `text:p`**, neo `as-char`

Pattern tái dùng từ Sheet/Slides (đã verify XLSX/PPTX) nhưng **Writer** đặt frame trong `text:p` (không `table:shapes`, không `draw:page`). `xlink:href="."` + `table:table table:name="local-table"` (không range sheet). `xmlns:chart` trên document.

| Fixture | `chart:class` | DOCX thật | Canonical FODT |
|---|---|---|---|
| C1 bar as-char | `chart:bar` | `word/charts/chart1.xml` + `w:drawing` `wp:inline` + `a:graphicData` chart + **`<c:barChart>`** + title `CHART_BAR_Q`. **Không** OLE. | Giữ `chart:chart chart:class="chart:bar"` nested object, LO thêm style `chN` + toạ độ title/legend |
| C2 line | `chart:line` | `word/charts/chart1.xml` **`<c:lineChart>`** | Giữ `chart:line` |
| C3 pie | `chart:circle` | `word/charts/chart1.xml` **`<c:pieChart>`** | Giữ `chart:circle` (không phải `chart:pie`) |
| C4 sibling `text:p` | bar | **Nuốt.** Canonical `chartChart=0`. DOCX không `word/charts/`. Chỉ `CHART_SIBLING_BEFORE CHART_SIBLING_AFTER` | |

Writer UI `pie` → ODF **`chart:circle`** (đo C3). `area` không probe riêng trong lượt này; Sheet/Slides đã map `chart:area` → Excel/PPTX area. Nếu làm Chart: emit `chart:area` cho UI `area`.

Parser `parseFodt` hiện lấy `office:text` bằng regex non-greedy — nested chart dùng `office:chart` (không `office:text`) nên **không** cắt nhầm body. Tokenizer `_fodtParseMarkup` đi bộ cây lồng `office:document` trong `draw:object` được (stack), miễn `frameHtml` nhận `draw:object` thay vì bắt `draw:image`.

### 2.2 Giới hạn Chart so với SVG Writer

- SVG Writer không lưu JSON labels/values tường minh — serializer phải đọc `data-chart-type`, `data-chart-title`, và `<title>Nhãn: số</title>` (hoặc bổ sung data-attr; **không** sửa `apps/writer` nếu parse SVG đủ).
- LO canonicalize thêm hàng chục `style:style` family chart. Idempotence VN là output VN, không so canonical.
- Nút Xóa / chrome không emit.
- `save()` / `_contentForExport()` không đổi.

## 3. SmartArt / Diagram — kết quả soffice thật

| Fixture | Input ODF | DOCX thật | Có SmartArt Word (`dgm:` / `diagrams/`) không |
|---|---|---|---|
| D1 3 `draw:rect` + 2 `draw:line` trong `text:p` | 3 rect + 2 line | 5 `w:drawing`, `prstGeom` `rect,rect,rect,line,line`, chữ `BUOC_MOT/HAI/BA` | **Không.** Shape rời |
| D2 `draw:g` nhóm | 2 rect + 1 line trong `draw:g` | 1 `wpg:wgp` group, geom `rect,rect,line` | **Không.** (Regex probe đếm `wpg:wgp` thành `smartArt` — **false positive**, không có part `diagrams/` hay `dgm:`) |
| D3 `draw:connector` | 2 rect + connector | geom `rect,rect,bentConnector2` | **Không** |

Không fixture nào sinh `word/diagrams/` hay DrawingML SmartArt. LibreOffice **không** biến nhóm shape Writer thành SmartArt Word.

Writer diagram là HTML nhiều `div` + màu + layout flex. Ánh xạ sang `draw:rect`+`draw:line` **mất** kiểu `cycle`/`hierarchy`/`list` (chỉ còn hộp chữ). Parse ngược từ shape rời → HTML diagram là đoán layout — vi phạm fail-closed.

## 4. Hướng chọn cho serializer (chưa làm)

### 4.1 WordArt — LÀM trong Phase E.3 (ưu tiên 1)

**Emit:** `draw:custom-shape` Fontwork `fontwork-plain-text` **as-char trong `text:p` đang chứa span**. Tái dùng registry graphic/text deterministic.

- Đọc span `data-vno-wordart` / `.vno-writer-wordart` trong `inlineXml` **trước** generic span (CSS `-webkit-*` / `background-clip` / `text-shadow` sẽ throw nếu đi `_fodtCssMap`).
- Nới guard `data-vno-wordart|wordart-preset|wordart-text|wordart-style`.
- `draw:name="WordArt-<presetId>"` (preset 8 mẫu UI; lạ → throw).
- Fill: `fillColor` (nếu có `gradient.from` thì dùng `from`, không bịa gradient ODF chưa đo).
- Stroke: `strokeColor` + `strokeWidth` px→cm.
- Text style: `fo:font-weight="bold"`, `fo:font-family` (Impact/Georgia/Arial từ preset), `fo:font-size` từ preset (pt). LO sẽ fitshape khi canonicalize — VN vẫn emit cỡ Writer.
- Geometry cố định path plain-text như W1 (đã ra `o:spt="136"`).
- Không `fontwork-wave`. Không text-box giả WordArt. Không sibling `office:text`. Không giả id gallery Microsoft.
- Header/footer: throw nếu có WordArt.

**Parse:** trong `inlineNodeHtml`, `draw:custom-shape` có `draw:type` bắt đầu `fontwork-` → dựng `buildWriterWordArtHtml(text, { presetId })`, **không** `parsedShapes`. Preset lấy suffix `WordArt-<id>` nếu thuộc 8 mẫu; không thì `navy-outline`. `right-arrow` vẫn Phase B.2. Type custom khác → throw.

Live sau serializer: FODT → DOCX có `v:textpath` + chữ WordArt; idempotence VN exact.

### 4.2 Chart — khả thi, làm sau WordArt nếu còn thời gian (ưu tiên 2)

Emit `draw:frame as-char` + nested `chart:chart` + `local-table` (pattern C1–C3 đã ra `word/charts/chart1.xml` native). Map UI `bar→chart:bar`, `line→chart:line`, `pie→chart:circle`, `area→chart:area`. Parse `draw:object`/`chart:chart` → `generateChartHtml`. Chrome nút Xóa không emit. `<div>` chart là **block** — `blockXml` phải nhận, không nhét vào `inlineXml`.

Rủi ro parser: nested `office:document` lớn, LO thêm nhiều chart style. Fail-closed nếu thiếu `local-table` / class lạ (stock/radar).

Nếu hết thời gian sau WordArt: **dừng, commit WordArt, ghi Chart chưa làm** — không để code dở.

### 4.3 Diagram / SmartArt — **không làm trong E.3**, để Phase E.4

Lý do đo được, không phải vì lười:

1. Writer lưu HTML `div.vno-writer-diagram` (4 layout), không phải `this.shapes`.
2. ODF nhóm `draw:rect`+`line`/`connector`/`draw:g` convert thành **shape Word rời hoặc group `wpg:wgp`**, **không** SmartArt (`dgm:`).
3. Không có ánh xạ fail-closed 1-1 round-trip 4 kiểu diagram → primitive rồi về đúng HTML mà không đoán.
4. Làm dở (emit 3 hộp process cho mọi kiểu) sẽ mất `cycle`/`hierarchy`/`list` âm thầm.

`serializeToFodt()` tiếp tục throw `WRITER_FODT_UNSUPPORTED_CONTENT` trên `data-vno-diagram` / `<div>` diagram.

## 5. Việc chưa đo / giới hạn

- Chưa mở Microsoft Word bằng mắt (làm sau serializer từng loại, Start-Process thụ động, không SendKeys).
- `chart:area` không có fixture riêng (bar/line/circle đã đo).
- Gradient ODF `draw:gradient` trên Fontwork **chưa** probe — không emit gradient.
- DrawingML WordArt hiện đại (`wps` + `a:prstTxWarp`) **không** dựng tay reverse (VML 136 đã đủ và LO import thành Fontwork).
- PDF text extraction không thấy chữ Fontwork/chart title ASCII — bằng chứng là XML DOCX.

## 6. Không làm

- Không nối `save()` / `exportPdf()` / `_contentForExport()`.
- Không đụng Sheet/Slides source, Core, build system.
- Không merge `main`.
- Không copy `vno:wordart` từ Slides FODP.
- Không viết kiến trúc serialize riêng — tái dùng registry / fail-closed / idempotence Phase A–E.2.
