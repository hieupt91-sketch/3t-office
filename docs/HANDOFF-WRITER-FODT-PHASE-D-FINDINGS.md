# Writer FODT Phase D — đo thật trước khi viết serializer

**KHÔNG phải implementation.** File này ghi sự thật đã đo: chỗ Writer lưu footnote/endnote/TOC/comment, cấu trúc ODF 1.3 `text:note` / `office:annotation` / `text:table-of-content` tay, và kết quả soffice → DOCX/PDF/canonical FODT (unzip XML thật, không đoán). Agent tiếp theo (nếu quota hết giữa chừng) đọc file này rồi làm tiếp, không đo lại từ đầu.

- AGENT: Grok
- BRANCH: `feature/writer-fodt-migration-phase-d`
- WORKTREE: `E:\VNOffice-grok-writer-fodt-phase-d`
- BASE: `main` @ `9f05f15` — `node tests/run-tests.js` đo thật **1198/1198 PASS** (không dùng số 1187 trong handoff Phase C cũ)
- SOFFICE: `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe` — LibreOffice **26.2.5** (`version.ini` Vendor=The Document Foundation, buildid `cd7284b4cbbfeb507e630c1aac019f4157393acb`)
- Probe: `tests/scripts/probe-writer-fodt-phase-d.mjs` (8 FODT tay, mỗi cái convert DOCX + PDF + canonical FODT)
- **Chưa sửa** `writer-adapter.js`.

## 0. Writer UI thật — footnote / endnote / TOC / comment (không đoán)

Toàn bộ nằm trong `adapters/libreoffice/writer/writer-adapter.js` (không có file `writer-footnotes.js` / `writer-comments.js` riêng). HTML/CSS chrome ở `apps/writer/writer.css`.

### 0.1 Footnote — marker inline + body ở cuối bodyDom, đánh số 1,2,3 tự động

`insertFootnote()` chèn **hai phần tách nhau**:

1. Số mũ tại con trỏ:

```html
<sup data-vno-footnote-ref="fn-…" class="vno-footnote-ref" contenteditable="false" title="Nhấp để chuyển đến chú thích">1</sup>
```

2. Container **một cái** ở cuối `bodyDom` (trước endnotes nếu có):

```html
<div data-vno-footnotes="true" class="vno-writer-footnotes-container" contenteditable="false">
  <div class="vno-notes-separator"></div>
  <div class="vno-footnote-item" data-vno-footnote-id="fn-…">
    <span class="vno-note-num" title="Chuyển tới vị trí tham chiếu">1</span>
    <span class="vno-note-text" contenteditable="true">…nội dung…</span>
    <button type="button" class="vno-note-delete-btn" title="Xóa chú thích">×</button>
  </div>
</div>
```

`renumberFootnotes()` quét `sup[data-vno-footnote-ref]` theo thứ tự xuất hiện, ghi lại `1, 2, 3…` lên cả số mũ và `.vno-note-num`. Số **không** phải field ODF — là chữ tĩnh được đánh lại.

Nội dung chú thích sống trong `.vno-note-text` (contenteditable, có thể có inline HTML người dùng gõ). **Không** nằm trong `this.*` array — chỉ DOM.

Import DOCX thật (task cũ `HANDOFF-WRITER-FOOTNOTES-IMPORT-FIDELITY.md`) map StarWriter `a.sdfootnoteanc` + `div#sdfootnoteN` sang đúng markup trên. Không cần sidecar `word/footnotes.xml` trên đường HTML.

### 0.2 Endnote — cùng pattern, số La Mã i, ii, iii

```html
<sup data-vno-endnote-ref="en-…" class="vno-endnote-ref" contenteditable="false" title="Nhấp để chuyển đến chú thích cuối">i</sup>
<div data-vno-endnotes="true" class="vno-writer-endnotes-container" contenteditable="false">
  <div class="vno-notes-separator"></div>
  <div class="vno-notes-title">CHÚ THÍCH CUỐI TÀI LIỆU</div>
  <div class="vno-endnote-item" data-vno-endnote-id="en-…">
    <span class="vno-note-num">i</span>
    <span class="vno-note-text" contenteditable="true">…</span>
    <button type="button" class="vno-note-delete-btn">×</button>
  </div>
</div>
```

`toRoman()` đánh số. Container endnotes **sau** footnotes.

### 0.3 Table of Contents — khối HTML tĩnh từ Heading 1–3, không phải field

`insertTableOfContents()` / `_buildTableOfContentsElement()`:

```html
<div data-vno-toc="true" class="vno-toc-block" contenteditable="false">
  <div class="vno-toc-header">
    <span class="vno-toc-title">MỤC LỤC</span>
    <div class="vno-toc-actions">
      <button type="button" class="vno-toc-btn vno-toc-btn-update">🔄 Cập nhật</button>
      <button type="button" class="vno-toc-btn vno-toc-btn-delete">×</button>
    </div>
  </div>
  <div class="vno-toc-entries">
    <div class="vno-toc-item vno-toc-level-1">
      <a href="#heading-id" class="vno-toc-link" data-target-id="heading-id">
        <span class="vno-toc-text">…</span>
        <span class="vno-toc-leader"></span>
        <span class="vno-toc-page">1</span>
      </a>
    </div>
  </div>
</div>
```

`_collectHeadings()` chỉ lấy `h1, h2, h3` ngoài khối TOC. Số trang là heuristic `_estimateHeadingPage()`, không phải số trang in thật. `_stripSessionMarkup()` **giữ** khối TOC, chỉ bỏ nút Cập nhật/Xóa. Đường HTML export hiện tại **không** ra field TOC Word native.

### 0.4 Comments — `this.comments[]` + `<mark data-comment-id>`, panel riêng

Constructor:

```js
this.comments = []; // {id, anchorText, content, createdAt, author?, resolved?}
this.commentsPanel = null;
```

`insertComment()` bọc vùng chọn:

```html
<mark class="vno-comment-anchor" data-comment-id="writer-comment-…" tabindex="0" role="button" aria-label="Mở ghi chú cho: …">văn bản neo</mark>
```

Nội dung ghi chú **không** nằm trong DOM body — nằm `this.comments[].content`. Author chỉ có khi import OOXML (`data-vno-comment-author` trên mark). Comment phiên làm việc không có author.

`_contentForExport()` gọi `_stripCommentMarkup()` — **bỏ** `<mark data-comment-id>`, giữ chữ neo, **không** ghi `word/comments.xml`. Panel Review (`.vno-comments-panel`) là chrome, không phải nội dung FODT.

### 0.5 Serializer Phase A/B/C hiện tại — sẽ chặn cả bốn loại

`serializeToFodt()`:

1. Regex `data-vno-*` (trừ `wrap=inline` / `section-break` / `section-id`) → throw. Sẽ dính `data-vno-footnote-ref`, `data-vno-footnotes`, `data-vno-toc`, `data-vno-comment-author`, …
2. `inlineXml` chỉ cho `span|b|strong|i|em|u|font|br|img` → `<sup>` và `<mark>` throw.
3. `blockXml` không nhận `<div>` trừ ngắt mục → container footnotes/endnotes/TOC throw.

`parseFodt()` `inlineHtml` throw trên `text:note` / `office:annotation`. `blocksHtml` throw trên `text:table-of-content`.

Test Phase A hiện **cố ý** dùng `<sup data-vno-footnote-ref>` làm ví dụ ngoài phạm vi — khi Phase D nhận footnote phải đổi ví dụ reject (cùng pattern B.1 đổi colspan, B.2 đổi JPEG→BMP).

`xmlns:dc` **chưa** có trên `office:document` VN. Chỉ thêm khi có comment, không nhét vào mọi FODT (tránh đổi output Phase A/B/C không cần thiết).

## 1. Cấu trúc ODF 1.3 thật (FODT tay, LibreOffice 26.2.5 giữ)

### 1.1 Footnote / endnote

```xml
<text:p>…NĐ-CP<text:note text:id="ftn1" text:note-class="footnote">
  <text:note-citation>1</text:note-citation>
  <text:note-body>
    <text:p>FOOTNOTE_BODY…</text:p>
  </text:note-body>
</text:note> về quản lý…</text:p>
```

Endnote: `text:note-class="endnote"`, citation `i`.

`text:notes-configuration` trong `office:styles` (không bắt buộc để convert — fixture 04 không có vẫn ra `footnotes.xml`; LO canonical **tự thêm** 2 configuration footnote+endnote). Vẫn nên emit khi có note để `style:num-format="1"` / `"i"` khớp Writer.

Canonical LO:

- Giữ `text:note` + `text:note-citation` + `text:note-body` + `text:p` bên trong.
- Gán `text:style-name="Footnote"` / `"Endnote"` lên `text:p` trong note-body (style named, không phải automatic).
- Đổi `text:id` endnote tay `edn1` → `ftn1` (LO dùng chung tiền tố `ftnN`). **Idempotence VN dùng id VN**, không so với canonical LO.
- Thêm `text:sequence-decls`, `loext:`, named styles.

### 1.2 Comment — range vs point

Range (khớp Writer `<mark>` bọc chữ):

```xml
<office:annotation office:name="__Annotation__du-toan-2026">
  <dc:creator>Tran Thi Hoa</dc:creator>
  <dc:date>2026-09-05T09:10:00</dc:date>
  <text:p>COMMENT_BODY…</text:p>
</office:annotation>dự toán năm 2026<office:annotation-end office:name="__Annotation__du-toan-2026"/>
```

Canonical thêm `loext:resolved="false"`. Parser bỏ `loext:*`.

Point (không `annotation-end`): annotation đứng tại caret, không bọc chữ.

Cần `xmlns:dc="http://purl.org/dc/elements/1.1/"`.

### 1.3 TOC

```xml
<text:table-of-content text:name="Table of Contents1" text:protected="false">
  <text:table-of-content-source text:outline-level="3" text:use-outline-level="true">
    <text:index-title-template text:style-name="Contents_20_Heading">MỤC LỤC</text:index-title-template>
    <text:table-of-content-entry-template text:outline-level="1" text:style-name="Contents_20_1">
      <text:index-entry-chapter/>
      <text:index-entry-text/>
      <text:index-entry-tab-stop style:type="right" style:leader-char="."/>
      <text:index-entry-page-number/>
    </text:table-of-content-entry-template>
    <!-- level 2, 3 tương tự -->
  </text:table-of-content-source>
  <text:index-body>
    <text:index-title text:name="Table of Contents1_Head">
      <text:p text:style-name="Contents_20_Heading">MỤC LỤC</text:p>
    </text:index-title>
    <text:p text:style-name="Contents_20_1">Báo cáo thẩm định<text:tab/>1</text:p>
    …
  </text:index-body>
</text:table-of-content>
<text:h text:outline-level="1">Báo cáo thẩm định</text:h>
```

Canonical LO thêm `text:style-name="Sect1"` trên TOC, có thể bỏ `text:protected` / `text:use-outline-level`. Heading `text:h` Phase A đã có — TOC native dựa vào `text:outline-level`.

## 2. FODT → DOCX/PDF thật (byte XML, không đoán)

Mọi fixture convert **không lỗi** soffice; PDF magic `%PDF-`.

### 2.1 Footnote (fixture 01) — PASS native

| Đo | Giá trị thật |
|---|---|
| `word/footnotes.xml` | **có** |
| `word/endnotes.xml` | không |
| `<w:footnoteReference>` | **1**, `w:id="2"` (id 0/1 là separator OOXML) |
| `w:rStyle w:val="FootnoteReference"` | có |
| `w:sectPr` / `w:footnotePr` / `w:numFmt` | `decimal` |
| `footnotes.xml` `w:footnote` | 3 (separator + continuation + body) |
| Body chữ | `FOOTNOTE_BODY_ND15 hiệu lực từ 03/3/2021.` **có thật** trong `footnotes.xml` |
| Thân `document.xml` | chữ neo, **không** nhúng body chú thích |

Fixture 04 (không `notes-configuration`): vẫn ra `footnotes.xml` + `footnoteReference` — configuration không phải điều kiện convert.

### 2.2 Endnote (fixture 02) — PASS native

| Đo | Giá trị thật |
|---|---|
| `word/endnotes.xml` | **có** |
| `<w:endnoteReference w:id="2"/>` | **1** |
| `w:rStyle` | `EndnoteReference` |
| `w:endnotePr` / `w:numFmt` | **`lowerRoman`** (vì `style:num-format="i"`) |
| Body chữ | `ENDNOTE_BODY_PHU_LUC…` trong `endnotes.xml` |

### 2.3 Mixed 2 footnote + 1 endnote (fixture 03) — PASS native

- `footnoteReference` = 2 (`w:id="2"` và `"3"`)
- `endnoteReference` = 1 (`w:id="2"`)
- Cả `footnotes.xml` lẫn `endnotes.xml`; hai body footnote + một body endnote giữ nguyên chữ.

### 2.4 Comment range (fixture 05) — PASS native, khớp panel Review

| Đo | Giá trị thật |
|---|---|
| `word/comments.xml` | **có** |
| `<w:commentRangeStart w:id="0"/>` | **1** ngay trước chữ `dự toán năm 2026` |
| `<w:commentRangeEnd w:id="0"/>` | **1** |
| `<w:commentReference w:id="0"/>` | **1** |
| `w:author` | `Tran Thi Hoa` |
| Body | `COMMENT_BODY đối chiếu số liệu quý II.` |

Đây là dạng Writer phải emit: `office:annotation` + chữ neo + `office:annotation-end` — Word nhận range highlight + panel.

### 2.5 Comment point (fixture 06) — comments.xml có, **không** có range

- `commentReference` = 1, `commentRangeStart/End` = **0**
- Body + author vẫn trong `comments.xml`
- Writer session comments **luôn bọc chữ** (`<mark>`) → serializer dùng dạng range (05), không dùng point (06). Parser vẫn nhận point (không `annotation-end`) để không mất comment khi nhập FODT ngoài.

### 2.6 TOC có index-body (fixture 07) — PASS field TOC Word nhận diện được

| Đo | Giá trị thật |
|---|---|
| `<w:sdt>` | **1** |
| `w:docPartGallery w:val="Table of Contents"` | **có** |
| `w:docPartUnique` | **có** |
| `<w:instrText>` | ` TOC \f \o "1-3" ` |
| `w:fldChar` begin / separate | có |
| Mục | `Báo cáo thẩm định` + `w:tab` + `1`; level 2 `w:ind w:left="283"`; level 3 `567` |
| Title | `MỤC LỤC` trong sdtContent |

Đây **là** TOC native Word (content control + field TOC), không phải đoạn chữ thường.

### 2.7 TOC index-body rỗng (fixture 08) — field có, **mục lục trống**

Vẫn có `w:sdt` + `TOC \f \o "1-3"`, nhưng sdtContent chỉ `fldChar begin/separate/end` **không** có dòng heading. Canonical `text:index-body` rỗng. LibreOffice **không** tự điền mục lục khi convert FODT→DOCX nếu `index-body` trống.

**Hệ quả:** serializer **phải** điền `text:index-body` từ heading hiện có (hoặc từ `.vno-toc-entries`). Không được emit TOC source suông.

## 3. Hệ quả cho implementation (chưa làm)

Thứ tự ưu tiên: footnote/endnote → comment → TOC.

### 3.1 Footnote / endnote

- Nới guard `data-vno-footnote-ref|endnote-ref|footnotes|endnotes|footnote-id|endnote-id` (và attr chrome `contenteditable` / `title` / `data-placeholder` trên note).
- `inlineXml`: `<sup data-vno-footnote-ref>` / `data-vno-endnote-ref` → `text:note` (citation = textContent đã đánh số, body = `.vno-note-text` của item cùng id, tái dùng `inlineXml` cho nội dung trong `text:p`).
- `blockXml`: bỏ qua container `[data-vno-footnotes]` / `[data-vno-endnotes]` (chrome + body đã lấy lúc inline). Nút xóa / separator / tiêu đề "CHÚ THÍCH CUỐI TÀI LIỆU" không emit.
- `<sup>` không phải note → vẫn throw.
- Emit `office:styles` + hai `text:notes-configuration` (`num-format="1"` footnote, `"i"` endnote) **chỉ khi** có note.
- Parse: `text:note` → `<sup>` + gom body, sau cùng append đúng một container mỗi loại. `text:p` trong note-body tái dùng `inlineHtml`. Named style `Footnote`/`Endnote` trên note-body: đọc chữ, không đòi automatic-style.
- Id: giữ `text:id` nếu có, không thì `ftnN` / `ednN` deterministic theo thứ tự.
- Note-body phức tạp (bảng, nhiều đoạn nếu paragraph serializer chưa đủ) → `WRITER_FODT_UNSUPPORTED_CONTENT`. Phase D nhận **một** `text:p` plain/inline trong note-body.

### 3.2 Comment

- `inlineXml`: `<mark class="vno-comment-anchor" data-comment-id>` → `office:annotation` (dc:creator / dc:date / `text:p` từ `this.comments[]`) + children + `office:annotation-end`. Thiếu entry trong `this.comments` mà vẫn có mark → throw, không mất nội dung âm thầm.
- Session không có author: emit `dc:creator` rỗng hoặc `"VN Writer"` (ghi rõ lúc implement sau khi chốt một giá trị deterministic). Date = `createdAt`.
- `xmlns:dc` chỉ khi có annotation.
- Parse: `office:annotation`…`office:annotation-end` → mark + push `this.comments`. Point (không end) → mark rỗng/zero-width tại chỗ, vẫn hydrate panel. Bỏ `loext:resolved`.
- Không nối `save()`/`_contentForExport()` (vẫn strip mark trên đường HTML).

### 3.3 TOC

- `blockXml`: `[data-vno-toc=true]` → `text:table-of-content` name `Table of Contents1`, source outline-level 3, entry-template 1–3 (text + tab right leader `.` + page-number), `index-body` điền từ `.vno-toc-entries` (bỏ nút chrome). Heading `h1–h3` vẫn `text:h` như Phase A.
- Parse: `text:table-of-content` → khối `data-vno-toc` (title từ index-title, entries từ index-body, gắn lại nút Cập nhật/Xóa để UI không gãy). Không giả `href` nếu không có bookmark — `_collectHeadings` / Update sẽ gắn lại id.
- `index-body` bắt buộc có nội dung (đo fixture 08).
- TOC lồng bảng/ảnh/field lạ → throw.

### 3.4 Live soffice (sau serializer)

- Footnote: `word/footnotes.xml` + `w:footnoteReference` + chữ body.
- Endnote: `word/endnotes.xml` + `w:endnoteReference` + `w:numFmt="lowerRoman"`.
- Comment: `word/comments.xml` + `commentRangeStart/End` + `commentReference` + author/body.
- TOC: `w:sdt` + `docPartGallery="Table of Contents"` + `instrText` chứa `TOC` + các dòng heading.
- Idempotence VN `serialize → parse → serialize`.
- Microsoft Word thật, Start-Process thụ động, từng loại một lần.

### 3.5 Không làm

- Không nối `save()` / `exportPdf()` / `_contentForExport()`.
- Không đụng Sheet/Slides, Core, citation (probe interoperability riêng).
- Không merge `main`.

## 4. Việc chưa đo / giới hạn

- Chưa mở Microsoft Word bằng mắt (làm sau serializer, Start-Process thụ động, không SendKeys).
- Citation (`writer.citation.*`) không nằm Phase D.
- Nested comment / comment trong note-body / note trong header: ngoài phạm vi, throw.
- TOC page numbers trong index-body là số Writer đang hiện (heuristic). Word/LO sẽ tính lại khi Update Field; live test assert cấu trúc field + chữ heading, không bắt số trang in khớp heuristic.
- `office:annotation` count canonical có thể > 1 vì LO thêm thuộc tính/`loext` — đếm tag bằng regex `\b` dễ dính `text:note-citation`. Live test assert snippet cụ thể, không đếm substring lỏng.
