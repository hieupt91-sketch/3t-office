# Writer FODT Phase E.2 — đo thật trước khi viết serializer (Watermark)

**KHÔNG phải implementation.** File này ghi sự thật đã đo: chỗ Writer lưu watermark trên canvas, hai hướng ODF 1.3 tay (`style:background-image` trên page-layout **và** `draw:frame`/`draw:custom-shape` trong `style:header`), reverse Word VML watermark → FODT, và kết quả soffice → DOCX/PDF/canonical FODT (unzip XML thật, không đoán). Agent tiếp theo đọc file này rồi làm serializer, không đo lại từ đầu.

- AGENT: Grok
- BRANCH: `feature/writer-fodt-migration-phase-e2`
- WORKTREE: `E:\VNOffice-grok-writer-fodt-phase-e2`
- BASE: `main` @ `fbf56d7` — `node tests/run-tests.js` đo thật **1220/1220 PASS** (không dùng số trong handoff E.1 cũ)
- SOFFICE: `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe` — LibreOffice **26.2.5** (`version.ini` Vendor=The Document Foundation, buildid `cd7284b4cbbfeb507e630c1aac019f4157393acb`)
- Probe: `tests/scripts/probe-writer-fodt-phase-e2.mjs` (10 FODT tay + 1 DOCX VML watermark ngược)
- **Chưa sửa** `writer-adapter.js`.

## 0. Writer UI thật — Watermark (không đoán)

Toàn bộ state nằm trong `adapters/libreoffice/writer/writer-adapter.js`. Dialog UI: `apps/writer/page-decorations.js`. Ribbon: tab **Bố cục**, lệnh `writer.page.watermark`.

### 0.1 Model — chỉ TEXT, không có ảnh

`this.watermark` (constructor mặc định `null`). `setWatermark()`:

```js
this.watermark = {
  text,                                          // bắt buộc, trim; rỗng → clearWatermark()
  color: watermarkData.color || "#dc2626",
  opacity: typeof watermarkData.opacity === "number" ? watermarkData.opacity : 0.2,
  angle: typeof watermarkData.angle === "number" ? watermarkData.angle : 45,
  fontSize: watermarkData.fontSize || 72
};
```

Không có `image` / `src` / data URI. Dialog chỉ có chip chữ (`DỰ THẢO`, `MẬT`, `TUYỆT MẬT`, `KHẨN`, `BẢN SAO`), màu, góc `45` / `-45` / `0`, opacity 5–60%. **Một** watermark cho cả tài liệu — không theo section/trang.

Undo snapshot: `watermark` là field riêng (`JSON.stringify`), không nằm trong `bodyDom`/`headerDom`.

### 0.2 Canvas — CSS overlay, không phải nội dung tài liệu

`_applyWatermark()` gắn `.vno-page-watermark` (`data-vno-watermark="true"`) vào `editorDom`, **không** vào `bodyDom`/`headerDom`:

```html
<div class="vno-page-watermark" data-vno-watermark="true">
  <div class="vno-watermark-text" style="transform:rotate(-${angle}deg); color:${color}; opacity:${opacity}; font-size:${fontSize}px;">${text}</div>
</div>
```

Góc canvas: CSS `rotate(-${angle}deg)`. `angle` mặc định 45 → `rotate(-45deg)` = ngược chiều kim đồng hồ 45°.

`_stripSessionMarkup()` / `_contentForExport()` **gỡ** overlay canvas rồi nhúng một `<div class="vno-export-watermark" style="position:fixed;…">` — đây là đường HTML cũ. Audit `docs/HANDOFF-WRITER-REALEXPORT-AUDIT.md` đã đo: LibreOffice HTML filter flatten thành paragraph thường, **không** có `wp:anchor`/VML, **không** lặp theo trang. Phase E.2 không nối `save()` / `_contentForExport()`.

Serializer Phase A–E.1 **không đọc** `this.watermark`. Overlay canvas có `data-vno-watermark` nhưng nằm ngoài `bodyDom` nên `serializeToFodt()` hiện **im lặng bỏ watermark** (không throw). Parser throw nếu `style:header` chứa `draw:`.

## 1. Hai hướng ODF — kết quả soffice thật (LibreOffice 26.2.5)

Mọi fixture convert **không lỗi** soffice. Góc ODF `draw:transform="rotate (radians)"` — **không** dùng `svg:transform` (xem 1.4).

### 1.1 Hướng A — `style:background-image` trên `style:page-layout-properties` — KHÔNG phải watermark Word

Fixture 01 (PNG GDI chữ `DU_THAO_BG` nhúng `office:binary-data`), 02 (PNG xám đặc), 03 (data URI):

| Đo DOCX | Giá trị thật |
|---|---|
| `word/headerN.xml` | **không có** (`headerRef=0`) |
| `w:pict` / `v:shape` / `v:textpath` / `mc:AlternateContent` / `w:drawing` / `wp:anchor` / `behindDoc` | **0** |
| `PowerPlusWaterMark` / `WordPictureWatermark` | **0** |
| `word/document.xml` | `<w:background w:color="auto"><v:background><v:fill r:id="rId2" type="frame"/></v:background></w:background>` |
| `word/media/image1.png` | có (ảnh nền) |
| `word/settings.xml` `<w:displayBackgroundShape/>` | có |

Đây là **nền trang Word** (`w:background`), không phải watermark header. Word mặc định không in document background. Canonical FODT giữ `style:background-image` nhưng **bỏ** `draw:opacity`.

**Không dùng hướng A** cho serializer Writer (model là chữ, và DOCX ra không phải watermark). FODT nhập vào có `style:background-image` → `WRITER_FODT_UNSUPPORTED_CONTENT` (Writer không có watermark ảnh).

### 1.2 Hướng B — `draw:frame` + `draw:text-box` trong `style:header` — HOẠT ĐỘNG

Graphic style đo được (giữ khi canonicalize):

```
draw:stroke="none" draw:fill="none" draw:opacity="20%"
style:wrap="run-through" style:run-through="background"
style:vertical-pos="middle" style:vertical-rel="page"
style:horizontal-pos="center" style:horizontal-rel="page"
style:flow-with-text="false"
```

`draw:name="Watermark"`, neo `paragraph`, `svg:width="16cm" svg:height="6cm"`.

| Fixture | `draw:transform` input | DOCX header | Word VML `rotation` | `behindDoc` |
|---|---|---|---|---|
| 04 không xoay | (không) | `mc:AlternateContent` + `w:drawing` + `w:pict`/`v:shape` | (không) | **1** |
| 05 `rotate (-0.785…)` (−45 rad) | giữ + LO thêm `translate (…)` | cùng cấu trúc | **45** (cùng chiều kim) | **1** |
| 06 `rotate (0.785…)` (+45 rad) | giữ + translate | cùng cấu trúc | **315** (= −45° / ngược chiều kim) | **1** |
| 09 + header user | như 05 | header text **và** shape cùng `header1.xml` | **45** | **1** |

Chữ watermark nằm trong `word/header1.xml` (`w:t` = `DU_THAO_ROT45`, v.v.). `word/document.xml` có `w:headerReference`. **Không** có `PowerPlusWaterMarkObject` — LO đặt `v:shape id="shape_0"`. Đây **vẫn là** shape xoay trong header, `behindDoc="1"`, `mc:AlternateContent` + VML fallback — đúng mô tả watermark Word ở mức XML (không phải gallery name).

Canonical FODT (fixture 05): LO viết

```
draw:transform="rotate (-0.785398163397449) translate (-5.304…cm 8.838…cm)"
```

Serializer VN emit **chỉ** `rotate (radians)` deterministic; không bắt buộc copy translate canonical. Idempotence VN là output VN, không so canonical LO.

### 1.3 Ánh xạ góc Writer ↔ ODF ↔ Word (đo, không đoán)

Canvas: `rotate(-${angle}deg)` với `angle` mặc định 45 → CSS −45° = ngược chiều kim = Word VML **315**.

| `this.watermark.angle` | CSS canvas | ODF `rotate (rad)` | Word VML `rotation` |
|---|---|---|---|
| `45` (mặc định, chéo) | `rotate(-45deg)` | `rotate (0.785398163397448)` | 315 |
| `-45` | `rotate(45deg)` | `rotate (-0.785398163397448)` | 45 |
| `0` | không xoay | không emit `draw:transform` | không có `rotation` |

Công thức: radians = `angle * π / 180` (dấu `angle` Writer). **Không** đảo dấu trong ODF.

### 1.4 SAI — `svg:transform="rotate(-45)"`

Fixture 07: soffice **không** hiểu như độ CSS. DOCX ra `rotation:58`. Canonical biến thành `draw:transform` (không giữ `svg:transform`). Serializer **chỉ** dùng `draw:transform`.

### 1.5 `draw:custom-shape` Fontwork trong header — gần watermark gallery Word hơn

Fixture 08 (tay, `draw:type="fontwork-plain-text"` + `draw:text-path="true"`):

- DOCX: `w:pict` + `v:shape` + **`v:textpath`** (WordArt VML), `rotation:45`
- **Không** `mc:AlternateContent` / `w:drawing` / `behindDoc`
- Chữ không nằm `w:t` (nằm `v:textpath string`)

### 1.6 SAI — `draw:frame` trong body (không phải header)

Fixture 10: shape nằm `word/document.xml` (không header). Cùng `behindDoc` nhưng **không lặp theo trang** như watermark master. Không dùng.

### 1.7 Reverse — DOCX watermark Word thật (`PowerPlusWaterMarkObject` + `v:textpath`) → FODT

Input tự dựng (VML chuẩn Word, `string="CONFIDENTIAL_VML"`, `rotation:315`, `id="PowerPlusWaterMarkObject…"`).

LibreOffice **26.2.5** import thành:

```xml
<style:header>
  <text:p text:style-name="Header">
    <draw:custom-shape text:anchor-type="char" draw:name="PowerPlusWaterMarkObject357476642"
      draw:style-name="gr1" svg:width="18.622cm" svg:height="2.227cm"
      draw:transform="rotate (0.785398163397448) translate (0.589…cm 18.106…cm)">
      <text:p text:style-name="P1">CONFIDENTIAL_VML</text:p>
      <draw:enhanced-geometry draw:text-path="true" draw:text-path-mode="shape"
        draw:type="fontwork-plain-text" …/>
    </draw:custom-shape>
  </text:p>
</style:header>
```

Graphic: `draw:fill="solid" draw:fill-color="#c0c0c0" draw:opacity="50%" style:wrap="run-through" style:run-through="background" style:vertical-pos="middle" style:vertical-rel="page-content" style:horizontal-pos="center"`. **Không** có `style:background-image`. Font size ODF là `1pt` (WordArt `fitshape`) — **mất** cỡ chữ Writer.

Round-trip FODT này → DOCX: lại ra `PowerPlusWaterMarkObject` + `v:textpath` + `rotation:315`. Đây **là** watermark gallery Word.

Giới hạn Fontwork nếu dùng làm đường emit VN: `fo:font-size` Writer (48/60/72/96) bị nuốt thành 1pt + fitshape. Màu đi `draw:fill-color`, không phải `fo:color` chữ.

## 2. Hướng chọn cho serializer (chưa làm)

**Emit:** `draw:frame` + `draw:text-box` trong `style:header` của **mọi** master-page (tái dùng `_fodtMasterPageXml` Phase C). Lý do đo được:

1. Writer watermark là **chữ** (màu, opacity, góc, cỡ) — text-box giữ `fo:color` / `fo:font-size` / `draw:opacity`.
2. soffice sinh đúng XML watermark-like: header part + `mc:AlternateContent` + `wp:anchor behindDoc="1"` + VML `v:shape` xoay.
3. Sống chung với header user (fixture 09).
4. Fontwork trung thành gallery Word hơn nhưng **mất fontSize** — không khớp model Writer.
5. `style:background-image` ra nền trang, không phải watermark — không dùng, không giả.

Không đặt tên `PowerPlusWaterMarkObject` (tên gallery Word, không có trong ODF tay text-box). Không vẽ hình giả nếu không ra header shape.

`svg:transform` cấm. `draw:transform` chỉ `rotate (radians)` khi `angle !== 0`.

### 2.1 Serialize

- Đọc `this.watermark`, **không** đọc overlay CSS trong `editorDom`.
- Graphic style deterministic (`grWm` hoặc registry `gr`): wrap run-through + run-through background + căn giữa trang + `draw:opacity="{round(opacity*100)}%"`. Fill none, stroke none.
- Text style: `fo:color`, `fo:font-size="{fontSize}pt"`, `fo:font-weight="bold"`.
- Frame `draw:name="Watermark"` neo paragraph, 16cm × 6cm, x/y 2.5cm / 10cm (cùng fixture đã convert).
- Góc: `angle === 0` → không `draw:transform`; else `rotate (${angle * Math.PI / 180})` (cố định số, ví dụ 15 chữ số như probe).
- Chữ escape XML. Ghép **trước/sau** header user trong `style:header` (một `text:p` chứa frame, không trộn vào đoạn header user).
- Không watermark → không emit frame, không đổi Phase C.
- Nhiều watermark khác nhau theo master / watermark ảnh / frame lạ trong header → throw (serialize phía VN chỉ có một `this.watermark`).

### 2.2 Parse

- Trước khi `blocksHtml` header: tách watermark ra khỏi `headerXml`.
- Nhận **hai** dạng trong header (không đưa vào `headerDom` / `this.shapes`):
  1. `draw:frame` `draw:name="Watermark"` + `draw:text-box` (output VN).
  2. `draw:custom-shape` Fontwork / tên `PowerPlusWaterMark*` / `WordPictureWatermark*` (FODT từ Word qua soffice).
- Khôi phục `this.watermark = { text, color, opacity, angle, fontSize }`. Gọi `_applyWatermark()` nếu có `editorDom`.
- `draw:transform`: lấy số trong `rotate (N)`, `angle = round(N * 180 / π)`. Bỏ `translate`.
- Opacity từ `draw:opacity` graphic (`20%` → `0.2`). Thiếu → `0.2`.
- Color: `fo:color` text-box; Fontwork: `draw:fill-color`. Thiếu → `#dc2626`.
- fontSize: `fo:font-size` pt làm tròn; Fontwork `1pt` → giữ `72` mặc định (engine WordArt, không bịa cỡ).
- `style:background-image` trên page-layout → throw, không nuốt thành watermark chữ.
- `draw:` khác trong header (ảnh, bảng, shape không phải watermark) → throw như Phase C.
- Watermark khác nhau giữa các master → throw (Writer một watermark).
- Không có watermark → `this.watermark = null`.

### 2.3 Live soffice (sau serializer)

- FODT có watermark chữ → `word/header1.xml` có `mc:AlternateContent` và/hoặc `w:pict`/`v:shape`, chữ watermark, `behindDoc="1"` (hướng text-box), `rotation` khớp góc.
- Không có `w:background` từ watermark (không đi hướng A).
- Idempotence VN `serialize → parse → serialize`.
- Microsoft Word thật, Start-Process thụ động: chữ mờ, xoay đúng, nằm sau nội dung.

### 2.4 Không làm

- Không nối `save()` / `exportPdf()` / `_contentForExport()`.
- Không watermark ảnh, không nhiều watermark theo trang/section.
- Không WordArt/chart/diagram (E.3).
- Không đụng Sheet/Slides, Core.
- Không merge `main`.
- Không giả `PowerPlusWaterMarkObject` trên text-box.

## 3. Việc chưa đo / giới hạn

- Chưa mở Microsoft Word bằng mắt (làm sau serializer, Start-Process thụ động, không SendKeys).
- PDF probe không tìm thấy chuỗi ASCII watermark (chữ nằm drawing/XObject, không phải text stream) — không dùng PDF text extraction làm bằng chứng; bằng chứng là XML header DOCX.
- LO canonicalize thêm `translate`, `text:sequence-decls`, đổi tên style. Idempotence là output VN.
- Text-box **không** mang id gallery `PowerPlusWaterMarkObject`. Word Design → Watermark có thể không nhận là preset gallery; XML/visual vẫn là shape header xoay behind text. Ghi rõ đây là giới hạn đặt tên của converter LO từ ODF text-box, không giả id Word.
- Fontwork import mất `fontSize` thật (1pt + fitshape).
