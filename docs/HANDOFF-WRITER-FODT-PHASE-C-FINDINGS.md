# Writer FODT Phase C — đo thật trước khi viết serializer

**KHÔNG phải implementation.** File này ghi sự thật đã đo: chỗ Writer lưu page/header/footer, cấu trúc ODF 1.3 `style:page-layout`/`style:master-page` tay, và kết quả soffice → DOCX/PDF/canonical FODT (unzip XML thật, không đoán). Agent tiếp theo (nếu quota hết giữa chừng) đọc file này rồi làm tiếp, không đo lại từ đầu.

- AGENT: Grok
- BRANCH: `feature/writer-fodt-migration-phase-c`
- WORKTREE: `E:\VNOffice-grok-writer-fodt-phase-c`
- BASE: `main` @ `420c4a4` — `node tests/run-tests.js` đo thật **1187/1187 PASS** (không dùng số 1184 trong handoff B.2 cũ)
- SOFFICE: `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe` — LibreOffice **26.2.5** (`version.ini` Vendor=The Document Foundation, buildid `cd7284b4cbbfeb507e630c1aac019f4157393acb`)
- Probe: `tests/scripts/probe-writer-fodt-phase-c.mjs` (8 FODT tay, mỗi cái convert DOCX + PDF + canonical FODT)
- **Chưa sửa** `writer-adapter.js`.

## 0. Writer UI thật — page / header / footer / section (không đoán)

Không có file `writer-page-setup.js`. Toàn bộ nằm trong `adapters/libreoffice/writer/writer-adapter.js`.

### 0.1 Page setup hiện tại

`this.pageSetup` (constructor mặc định):

```js
{
  size: "a4",                 // khóa trong PAGE_SIZES_MM
  orientation: "portrait",    // "portrait" | "landscape"
  margins: { top: 20, bottom: 20, left: 30, right: 15 }  // mm, Nghị định 30/2020
}
```

`PAGE_SIZES_MM` (khổ dọc; hoán đổi W/H khi landscape):

| key | w × h mm |
|---|---|
| `a4` | 210 × 297 |
| `letter` | 216 × 279 |
| `legal` | 216 × 356 |
| `dl` | 220 × 110 (phong bì) |
| `c5` | 229 × 162 |
| `number10` | 241.3 × 104.8 |

`_applyPageSetup()` chỉ đổi CSS canvas (`editorDom.style.width/padding`). `_getPageSetupCss()` nhúng CSS `@page { size: Wmm Hmm; margin: T R B L mm }` vào `_contentForExport()`. Đây là vá HTML filter, **không** phải ODF.

`setPageSetup()` ghi `this.pageSetup` **và** `this.sectionPageSetups[this.activeSectionId]`.

### 0.2 Nhiều geometry theo section — có thật trên model Writer

```js
this.activeSectionId = "section-1";
this.sectionPageSetups = { "section-1": clone(this.pageSetup) };
```

`insertSectionBreak(type)` (`nextPage`/`continuous`/`evenPage`/`oddPage`) chèn vào **body HTML**:

```html
<div class="vno-section-break" data-vno-section-break="TYPE" data-vno-section-id="section-N" ...>
  --- Ngắt mục (...) ---
</div>
```

rồi copy page setup của mục trước sang `sectionPageSetups[newId]`.

`insertEnvelope()` tạo mục mới với `_envelopePageSetup(sizeId)`:

```js
{ size: "dl"|"c5"|"number10", orientation: "portrait", margins: { top: 8, bottom: 8, left: 10, right: 10 } }
```

Lưu ý: phong bì **orientation = "portrait"** dù `w > h` (DL 220×110). Parser **không** được suy ra landscape từ `width > height`.

`_contentForExport()` phát named CSS `@page vno-section-N` + class `.vno-export-section-N { page: vno-section-N }`. Audit cũ (`docs/HANDOFF-WRITER-REALEXPORT-AUDIT.md`) đã đo: LibreOffice HTML filter **bỏ** named `@page` → mixed A4/envelope dùng một MediaBox.

Phase C tồn tại để thay đúng cơ chế ODF, không vá thêm CSS.

### 0.3 Header / Footer — một cặp cho cả tài liệu, không theo section

`_initZones()`:

- `.vno-writer-header` → `this.headerDom`
- `.vno-writer-body` → `this.bodyDom`
- `.vno-writer-footer` → `this.footerDom`

`activateHeader()` nếu trống ghi:

```html
<p style='text-align: center; font-size: 10pt; margin: 0;'>Tiêu đề đầu trang</p>
```

`activateFooter()` nếu trống ghi:

```html
<p style='text-align: center; font-size: 10pt; margin: 0;'>Trang 1 / 1</p>
```

Footer là **chữ tĩnh** `"Trang 1 / 1"`; Print Preview thay số. Không phải field ODF `text:page-number`.

`_contentForExport()` chỉ xuất header/footer khi `innerText.trim()` khác rỗng, bọc `<div title="header|footer">`.

**Không có** header/footer riêng từng section. `sectionPageSetups` chỉ geometry. Nếu FODT nhập vào có master-page khác nhau về nội dung header/footer → Writer không biểu diễn được → `WRITER_FODT_UNSUPPORTED_CONTENT`.

### 0.4 Serializer hiện tại (Phase A/B/B.2) — lỗ hổng Phase C phải vá

`serializeToFodt()` **chỉ** đọc `bodyDom.innerHTML`. Bỏ `this.pageSetup`, `this.sectionPageSetups`, `this.headerDom`, `this.footerDom`.

Hai guard sẽ chặn multi-geometry nếu không nới có chủ đích:

1. `data-vno-*` (trừ `data-vno-wrap="inline"`) → throw. Marker `data-vno-section-break` / `data-vno-section-id` đang bị từ chối.
2. `_fodtCssMap` mặc định **không** cho `margin`. Header mặc định Writer có `margin: 0` → gọi nguyên `paragraphXml` sẽ throw. `margin` trên header/footer là chrome canvas, không phải nội dung; được phép bỏ khi serialize (không phải mất dữ liệu người dùng). `font-size` trên `<p>` đã được `_fodtInlineStyle` đưa vào span — giữ được.

## 1. Cấu trúc ODF 1.3 thật (FODT tay, LibreOffice 26.2.5 giữ)

`style:page-layout` nằm trong `office:automatic-styles`. `style:header-style` / `style:footer-style` là **anh em** của `style:page-layout-properties`, không phải con.

`style:master-page` nằm trong `office:master-styles`, gắn `style:page-layout-name`, chứa `style:header` / `style:footer` với `text:p` bên trong.

Input tay (rút gọn):

```xml
<office:automatic-styles>
  <style:page-layout style:name="pmA4">
    <style:page-layout-properties
      fo:page-width="21cm" fo:page-height="29.7cm"
      fo:margin-top="2cm" fo:margin-bottom="2cm"
      fo:margin-left="3cm" fo:margin-right="1.5cm"
      style:print-orientation="portrait"/>
    <style:header-style>
      <style:header-footer-properties fo:min-height="0.6cm" fo:margin-bottom="0.3cm"/>
    </style:header-style>
    <style:footer-style>
      <style:header-footer-properties fo:min-height="0.6cm" fo:margin-top="0.3cm"/>
    </style:footer-style>
  </style:page-layout>
</office:automatic-styles>
<office:master-styles>
  <style:master-page style:name="Standard" style:page-layout-name="pmA4">
    <style:header><text:p>HEADER_A4_VN</text:p></style:header>
    <style:footer><text:p>FOOTER_A4_VN</text:p></style:footer>
  </style:master-page>
</office:master-styles>
```

Canonical LibreOffice đổi tên `pmA4` → `pm1`, thêm `style:num-format`, `style:writing-mode`, layout-grid, `loext:margin-gutter`, `style:footnote-sep`, `draw:style-name="dp1"` trên master-page. Bo tròn số: `21cm`→`21.001cm`, `1.5cm`→`1.499cm`. **Idempotence VN là serialize→parse→serialize output VN**, không so với canonical LO.

Master-page đầu nên tên `Standard` (LO giữ nguyên tên này).

## 2. FODT → DOCX/PDF thật (byte XML, không đoán)

Twips: 1 inch = 1440 twips; mm → twips = mm / 25.4 × 1440.

### 2.1 A4 + header/footer (fixture 01) — PASS native

| Đo | Giá trị thật |
|---|---|
| `w:pgSz` | `w:w="11906" w:h="16838"` = 210×297 mm |
| `w:pgMar` (có header) | `w:left="1701"` (30mm) `w:right="850"` (15mm) `w:top="1535"` `w:bottom="1535"` `w:header="1134"` `w:footer="1134"` |
| header/footer parts | `word/header1.xml` = `HEADER_A4_VN`, `word/footer1.xml` = `FOOTER_A4_VN` |
| `w:headerReference` / `w:footerReference` | `w:type="default"` có thật trong `w:sectPr` |
| PDF MediaBox | `[0 0 595.30 841.89]` = A4 pt |
| Không lỗi soffice | ok=true |

Khi **không** có header/footer (fixture 08): không có `word/header*.xml`, `headerReference` none, `w:pgMar w:top="1134" w:bottom="1134"` đúng 20mm, `w:header="0" w:footer="0"`.

**Hệ quả live test:** khi có header, `w:top` **không** còn đúng 20mm — engine cộng khoảng header (`min-height` 0.6cm + margin). Assert `pgSz` + `left`/`right` + tồn tại `headerReference` + text trong part. Đừng bắt `w:top` khớp mm canvas khi đã có header.

### 2.2 Letter landscape (fixture 02) — PASS native

- Input: 27.94cm × 21.59cm, `style:print-orientation="landscape"`, margin 2.54cm.
- DOCX: `<w:pgSz w:orient="landscape" w:w="15840" w:h="12240"/>` = 11×8.5 in.
- PDF MediaBox `[0 0 792 612]`.
- Header/footer letter sống trong part riêng.

`w:orient="landscape"` **chỉ** xuất hiện khi `style:print-orientation="landscape"`, không phải khi width > height.

### 2.3 Phong bì 220×110 — orientation là thuộc tính độc lập

Cùng `fo:page-width="22cm" fo:page-height="11cm"`:

| print-orientation | DOCX `w:pgSz` | PDF MediaBox |
|---|---|---|
| `portrait` (khớp Writer envelope) | `w:w="12472" w:h="6236"` **không** `w:orient` | `[0 0 623.59 311.81]` |
| `landscape` | `w:orient="landscape" w:w="12472" w:h="6236"` | cùng MediaBox |

Kích thước vật lý lấy từ `fo:page-width/height`. `style:print-orientation` map sang `w:orient`. Serializer Writer envelope phải ghi `portrait` + 22cm × 11cm, **không** đổi thành landscape.

## 3. Đổi geometry giữa các vùng — đo 3 cơ chế

Mục tiêu: trang A4 rồi trang Envelope DL, header/footer khác nhau từng master (để biết part nào sống).

### 3.1 Paragraph style + `style:master-page-name` — **ĐÚNG, convert Word/PDF thật**

Input:

```xml
<style:style style:name="PEnvStart" style:family="paragraph" style:master-page-name="Envelope">
  <style:paragraph-properties fo:break-before="page"/>
</style:style>
...
<text:p>BODY_A4_BEFORE_ENVELOPE</text:p>
<text:p text:style-name="PEnvStart">BODY_ENVELOPE_AFTER_A4</text:p>
```

Kết quả soffice (fixture 03):

- `w:sectPr` **count = 2**
- sectPr[0]: A4 `11906×16838`, margin A4, header `HEADER_A4_MULTI`, footer `FOOTER_A4_MULTI`, `w:type="nextPage"`
- sectPr[1]: Envelope `12472×6236`, margin 1cm, header `HEADER_ENV_MULTI`, footer `FOOTER_ENV_MULTI`, `w:type="nextPage"`
- `document.xml` có `<w:br w:type="page"/>`
- PDF **hai** MediaBox: A4 `[0 0 595.30 841.89]` **và** envelope `[0 0 623.59 311.81]`; `/Type /Page` ≈ 2
- Canonical giữ `style:master-page-name="Envelope"` trên paragraph style, thêm `style:parent-style-name="Standard"` và `style:page-number="auto"`:

```xml
<style:style style:name="P3" style:family="paragraph" style:parent-style-name="Standard" style:master-page-name="Envelope">
  <style:paragraph-properties style:page-number="auto" fo:break-before="page"/>
</style:style>
```

Đây là cơ chế ODF thật mà serializer phải dùng.

### 3.2 `style:master-page-name` **trên `text:p`** — **KHÔNG hoạt động**

User đề xuất đặt attribute trên `text:p` đầu vùng. Đo thật (fixture 04):

- LibreOffice **bỏ** attribute. Canonical: `text:p with style:master-page-name attr = 0`, paragraph styles with master-page-name = 0.
- DOCX: **một** `w:sectPr`, chỉ A4. Body vẫn còn đủ chữ nhưng **không** đổi khổ.
- PDF: một MediaBox A4.

**Không được** emit `style:master-page-name` trên `text:p`. Phải gắn vào `style:style style:family="paragraph"` rồi `text:style-name` trên `text:p` đầu vùng.

### 3.3 `text:section` + section style `style:master-page-name` — **không đổi khổ trang khi ra DOCX/PDF**

Fixture 05: canonical **giữ** `text:section` và 2 master-page, nhưng:

- DOCX 2 `w:sectPr` **cùng** A4 `11906×16838`; sectPr[1] `w:type="continuous"`, không headerReference
- PDF một MediaBox A4, ~1 trang
- Envelope header/footer **không** ra part DOCX (chỉ A4)

Không dùng `text:section` để đổi geometry.

## 4. Hệ quả cho implementation (chưa làm)

1. **Page mặc định:** serialize `this.pageSetup` → một `style:page-layout` (`pm1`) + `style:master-page style:name="Standard"`. Đơn vị cm từ mm (`mm/10`). `style:print-orientation` = `this.pageSetup.orientation`. Parser đọc `print-orientation` + width/height, map lại khóa `PAGE_SIZES_MM` (dùng orientation đã đọc, **không** so sánh width>height). Tài liệu Phase A/B không có page-layout → giữ default, không fail.

2. **Header/footer:** nếu `headerDom`/`footerDom` có `innerText.trim()`, serialize innerHTML bằng **cùng** `paragraphXml`/`inlineXml`/`listXml` hiện có, bọc `style:header`/`style:footer`. Cho phép bỏ `margin`/`padding` canvas trên header/footer. Bảng/ảnh/shape/`data-vno-*`/`text:page-number` trong header nếu paragraph serializer chưa hỗ trợ → `WRITER_FODT_UNSUPPORTED_CONTENT`. Parser dựng HTML header/footer bằng cùng hàm paragraph HTML, gán `headerDom`/`footerDom` (test stub cần `.vno-writer-header` / `.vno-writer-footer`). Không có header → không emit `style:header` (fixture 08).

3. **Nhiều geometry:** nới guard `data-vno-section-break` + `data-vno-section-id` (chỉ hai marker này, giá trị đã biết). Mỗi mục trong `sectionPageSetups` → `pmN` + master-page (`Standard`, `MP2`, …). Mục sau: paragraph style `{ textAlign, masterPageName, breakBefore:"page" }` đặt trên `text:p` **đầu** vùng (không đặt attribute master-page lên `text:p`). Cùng một header/footer Writer gắn lên mọi master (model không có HF theo section). Parser: khi gặp paragraph style có `style:master-page-name`, chèn lại marker section break, khôi phục `sectionPageSetups`. Nếu hai master khác nội dung header/footer → throw.

4. **Live soffice:**
   - A4 + HF: `w:pgSz` 11906×16838, `w:pgMar` left/right 1701/850, `headerReference`/`footerReference`, text header/footer part, PDF `%PDF-` + MediaBox A4.
   - Letter landscape: `w:orient="landscape"` 15840×12240.
   - Mixed A4+DL: **hai** `w:sectPr` với hai `w:pgSz` khác nhau + hai MediaBox PDF.
   - Idempotence VN serialize→parse→serialize.

5. **Không** nối `save()`/`exportPdf()`/`_contentForExport()`. Không đụng Sheet/Slides.

## 5. Việc chưa đo / giới hạn

- Chưa mở Microsoft Word bằng mắt (làm sau serializer, Start-Process thụ động, không SendKeys).
- `evenPage`/`oddPage` chưa convert riêng; serializer có thể map cả hai + `nextPage` thành `fo:break-before="page"` (đã ra `w:type="nextPage"`). `continuous` với **cùng** geometry: ODF master-page change luôn ngắt trang — nếu continuous mà đổi khổ, vật lý vẫn trang mới; ghi rõ nếu round-trip đổi `continuous` → `nextPage`.
- Field `text:page-number` / `text:page-count` trong header ODF ngoài (task import fidelity cũ) **không** nằm Phase C; gặp thì throw, không giả field.
- `w:top`/`w:bottom` khi có header không bằng margin canvas — sự thật engine, không assert nhầm.
- Page border / page color / watermark / columns vẫn ngoài Phase C.
