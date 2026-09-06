# Writer FODT Phase E.1 — đo thật trước khi viết serializer (Track Changes)

**KHÔNG phải implementation.** File này ghi sự thật đã đo: chỗ Writer lưu insert/delete trên canvas, cấu trúc ODF 1.3 `text:tracked-changes` / `text:changed-region` tay, và kết quả soffice → DOCX / canonical FODT (unzip XML thật, không đoán). Agent tiếp theo đọc file này rồi làm serializer, không đo lại từ đầu.

- AGENT: Grok
- BRANCH: `feature/writer-fodt-migration-phase-e1`
- WORKTREE: `E:\VNOffice-grok-writer-fodt-phase-e1`
- BASE: `main` @ `4cae9a3` — `node tests/run-tests.js` đo thật **1210/1210 PASS** (không dùng số trong handoff Phase D cũ)
- SOFFICE: `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe` — LibreOffice **26.2.5** (`version.ini` Vendor=The Document Foundation, buildid `cd7284b4cbbfeb507e630c1aac019f4157393acb`)
- Probe: `tests/scripts/probe-writer-fodt-phase-e1.mjs` (10 FODT tay) + `tests/scripts/probe-writer-fodt-phase-e1-changeinfo.mjs` (7 biến thể `office:change-info`)
- **Chưa sửa** `writer-adapter.js`.

## 0. Writer UI thật — Track Changes (không đoán)

Toàn bộ nằm trong `adapters/libreoffice/writer/writer-adapter.js`. CSS canvas: `apps/writer/writer.css` dòng ~244.

### 0.1 Marker phiên làm việc (gõ/xóa khi `trackChangesEnabled`)

`_insertTrackedText()`:

```html
<ins data-vno-change="insert">chữ mới</ins>
```

`_markRangeDeleted()`:

```html
<del data-vno-change="delete" contenteditable="false">chữ bị xóa</del>
```

**Không** ghi `data-vno-author`, **không** ghi `data-vno-date`. Chỉ `dataset.vnoChange`. Deletion đặt `contenteditable="false"`. Không có mảng `this.trackChanges[]` — dữ liệu sống trên DOM.

### 0.2 Marker khi mở DOCX thật (overlay OOXML)

`_wrapImportedRevisionMatch()` (task cũ `HANDOFF-WRITER-TRACKCHANGES-IMPORT-FIDELITY.md`) **có** author/date:

```html
<ins data-vno-change="insert" data-vno-author="Nguyen Van An" data-vno-date="2026-09-05T08:15:00" title="Nguyen Van An (2026-09-05T08:15:00)">theo yêu cầu khẩn</ins>
<del data-vno-change="delete" contenteditable="false" data-vno-author="Nguyen Van An" data-vno-date="2026-09-05T08:16:00" title="…">bản nháp nội bộ</del>
```

`title` là tooltip suy ra từ author/date (`_trackChangeTooltip`), không phải dữ liệu độc lập.

### 0.3 `_contentForExport()` / `_stripSessionMarkup()` — xác nhận comment CSS

`apps/writer/writer.css`: «Dấu sửa đổi chỉ tồn tại trên canvas; serializer Writer loại bỏ trước khi lưu/xuất.»

Code thật `_stripSessionMarkup()`:

- `<del data-vno-change="delete">…</del>` → **xóa cả thẻ lẫn nội dung** (accepted view).
- `<ins data-vno-change="insert">…</ins>` → **giữ chữ, bỏ thẻ**.

Đường HTML `save()` / `exportPdf()` **không** ghi native `w:ins`/`w:del`. Phase E.1 không nối cutover — `save()` / `_contentForExport()` giữ nguyên.

### 0.4 Serializer Phase A–D hiện tại — sẽ chặn ins/del

`serializeToFodt()`:

1. Regex `data-vno-*` (trừ wrap/section/footnote/endnote/toc/comment-author) → throw. Dính `data-vno-change`, `data-vno-author`, `data-vno-date`.
2. `inlineXml` chỉ cho `span|b|strong|i|em|u|font` (+ `sup` note, `mark` comment, `br`, `img`) → `<ins>` / `<del>` throw `phần tử inline <ins>`.

`parseFodt()` `inlineNodeHtml` throw trên `text:change` / `text:change-start` / `text:change-end`. `blocksHtml` throw trên `text:tracked-changes`.

## 1. Cấu trúc ODF 1.3 thật (FODT tay, LibreOffice 26.2.5 giữ)

### 1.1 Insertion — `text:change-start` / `text:change-end` quanh chữ trong body

Region chỉ có `office:change-info`, **không** copy nội dung:

```xml
<text:tracked-changes>
  <text:changed-region xml:id="ct1" text:id="ct1">
    <text:insertion>
      <office:change-info>
        <dc:creator>Tran Thi Hoa</dc:creator>
        <dc:date>2026-09-06T10:00:00</dc:date>
      </office:change-info>
    </text:insertion>
  </text:changed-region>
</text:tracked-changes>
<text:p>Đề nghị phê duyệt <text:change-start text:change-id="ct1"/>INSERT_ONLY_TEXT<text:change-end text:change-id="ct1"/> theo phương án đã thống nhất.</text:p>
```

Canonical LO: giữ đúng cặp start/end quanh chữ; đổi id thành `ct<số lớn>`; thêm `xml:id` nếu input chỉ có `text:id`; thêm `text:sequence-decls` sau `text:tracked-changes`. **Không** giữ `text:track-changes="true"` khi còn region.

### 1.2 Deletion — empty `<text:change/>` trong body; nội dung nằm trong region

```xml
<text:changed-region xml:id="ct2" text:id="ct2">
  <text:deletion>
    <office:change-info>…</office:change-info>
    <text:p>DELETE_ONLY_TEXT</text:p>
  </text:deletion>
</text:changed-region>
…
<text:p>Nội dung còn lại <text:change text:change-id="ct2"/>sau chỗ xóa.</text:p>
```

Chữ xóa **không** còn trong body. LO chèn `w:delText` tại vị trí `text:change`.

### 1.3 SAI — bọc deletion bằng `text:change-start`/`text:change-end` trong body

Mô tả ban đầu của task (wrap `<del>` bằng start/end) **không khớp engine**. Fixture 04: body giữ chữ như văn bản thường **và** region phát `w:del` → DOCX **nhân đôi** (`Trước DELETE_WRAPPED_BODY DELETE_WRAPPED_BODY sau.`). Canonical LO biến start/end thành empty `text:change` và để chữ body lại thành chữ thường.

Serializer **phải** dùng empty `text:change` + nội dung trong `text:deletion`, không wrap del trong body.

### 1.4 SAI — insertion bằng empty `<text:change/>`

Fixture 05: không ra `w:ins`. Canonical **xóa region**. Empty `text:change` chỉ dành cho deletion.

### 1.5 Format-change

`text:format-change` + start/end quanh `text:span` → DOCX `w:rPrChange` (không phải `w:ins`/`w:del`). Writer canvas không có marker format-change. Parser **ném** `WRITER_FODT_UNSUPPORTED_CONTENT`.

### 1.6 `office:settings` (ShowRedlineChanges / RecordChanges)

**Không bắt buộc** để convert. Fixture 08 không có `office:settings` vẫn ra `w:ins` + `word/settings.xml` có `<w:trackRevisions/>`. Phase A–D không emit settings — E.1 cũng không thêm.

### 1.7 `xml:id` so với chỉ `text:id`

Cả hai convert được. LO canonical luôn ghi cả `xml:id` lẫn `text:id` (cùng giá trị, id bị đổi). Serializer VN emit cả hai, id deterministic `ct1`, `ct2`, … theo thứ tự xuất hiện. Idempotence VN không so id canonical LO.

## 2. FODT → DOCX thật (byte XML, không đoán)

Mọi fixture convert **không lỗi** soffice.

### 2.1 Insert + delete chuẩn (fixture 01, cùng mẫu `sample-writer-trackchanges.fodt`)

| Đo | Giá trị thật |
|---|---|
| `<w:del w:id="0" w:author="Nguyen Van An" w:date="2026-09-05T08:16:00Z">` | **1**, `w:delText` = `bản nháp nội bộ ` |
| `<w:ins w:id="1" w:author="Nguyen Van An" w:date="2026-09-05T08:15:00Z">` | **1**, `w:t` = `theo yêu cầu khẩn ` |
| `w:rPrChange` / `w:moveFrom` / `w:moveTo` | 0 |
| `word/settings.xml` `<w:trackRevisions/>` | **có** |

Đây **là** Track Changes native Word, không phải chữ màu tĩnh.

### 2.2 Insert only / delete only

- Fixture 02: đúng 1 `w:ins`, 0 `w:del`.
- Fixture 03: đúng 1 `w:del` + `w:delText`, 0 `w:ins`.

### 2.3 Inline đậm trong insertion (fixture 09)

Một region ODF → **ba** `w:ins` cùng author/date (chạy thường / chạy đậm / chạy thường). Canonical FODT vẫn **một** `text:change-start`/`text:change-end` bọc cả `text:span`. Serializer VN giữ một region; không tách run OOXML.

### 2.4 `office:change-info` — DATE BẮT BUỘC (đo follow-up)

| Input | Canonical còn region? | DOCX `w:ins`? |
|---|---|---|
| `<office:change-info/>` rỗng (fixture 06) | **không** — LO xóa region, chữ thành thường / paragraph riêng | không |
| chỉ `<dc:creator>` | không | không |
| creator + `<dc:date></dc:date>` rỗng | không | không |
| chỉ `<dc:date>2026-09-06T12:00:00</dc:date>` | **có** | `w:ins w:author="" w:date="…Z"` |
| `<dc:creator></dc:creator>` + date | có (creator bị LO bỏ) | `w:author=""` |
| `VN Writer` + date | có | `w:author="VN Writer"` |
| `Unknown` + date | có | `w:author="Unknown"` |
| creator khoảng trắng + date | có | `w:author=" "` |

Hệ quả: phiên Writer không có `data-vno-date` **vẫn phải emit `dc:date` deterministic**, nếu không soffice nuốt mất revision. Creator không bắt buộc. Date rỗng = mất revision.

Sentinel đề xuất cho phiên không có date: `1970-01-01T00:00:00` (cố định, idempotent). Parser **không** ghi `data-vno-date` khi date là sentinel và không có creator — tránh tooltip ngày giả trên canvas. Import thật (có author hoặc date khác sentinel) thì khôi phục `data-vno-author` / `data-vno-date`.

## 3. Hệ quả cho implementation (chưa làm)

### 3.1 Serialize

- Nới guard `data-vno-change|author|date`.
- `inlineXml`:
  - `<ins data-vno-change="insert">` → `text:change-start` + children (tái dùng `inlineXml`) + `text:change-end`. Region `text:insertion` + `office:change-info`.
  - `<del data-vno-change="delete">` → empty `<text:change/>`. Region `text:deletion` + change-info + `<text:p>` nội dung (tái dùng `inlineXml`). Không để chữ xóa trong body.
- Attr cho phép trên ins/del: `data-vno-change`, `data-vno-author`, `data-vno-date`, `contenteditable`, `title`, `class` (bỏ `is-vno-change-active` như chrome). `data-vno-change` khác `insert`/`delete` → throw.
- ins/del lồng nhau, del chứa block `p|h|table|div|ul|ol` → throw.
- Id deterministic `ct${n}` theo thứ tự xuất hiện; emit cả `xml:id` lẫn `text:id`.
- `text:tracked-changes` đứng đầu `office:text` (trước body parts). Không emit `office:settings`.
- `xmlns:dc` khi có annotation **hoặc** tracked-changes.
- change-info: `dc:creator` chỉ khi có `data-vno-author`; `dc:date` = `data-vno-date` hoặc sentinel `1970-01-01T00:00:00`.

### 3.2 Parse

- Đọc `text:tracked-changes` / `text:changed-region` trước; không đưa vào HTML body.
- Region `text:format-change` hoặc con không phải insertion/deletion → throw.
- `text:change-start`/`text:change-end` **chỉ** khi region là insertion → bọc `<ins data-vno-change="insert">`. Trỏ deletion → throw (pattern 04 sai).
- Empty `text:change` **chỉ** khi region là deletion → `<del data-vno-change="delete" contenteditable="false">` với nội dung từ `text:p` trong region (một `text:p`; nhiều đoạn/bảng → throw).
- `text:change` trỏ insertion, hoặc start/end thiếu cặp / id lạ → throw.
- Khôi phục author/date như mục 2.4. Dựng lại `title` tooltip nếu có author/date.

### 3.3 Live soffice (sau serializer)

- FODT có insert → `w:ins w:id=… w:author=… w:date=…` trong `word/document.xml`.
- FODT có delete → `w:del` + `w:delText`.
- `word/settings.xml` có `w:trackRevisions` (LO tự ghi).
- Idempotence VN `serialize → parse → serialize`.
- Microsoft Word thật, Start-Process thụ động, xác nhận màu/gạch chân/gạch ngang + panel Review.

### 3.4 Không làm

- Không nối `save()` / `exportPdf()` / `_contentForExport()`.
- Không format-change, move, comment-trong-revision, track changes trong header/note.
- Không WordArt/shape/chart/diagram/watermark (Phase E.2).
- Không đụng Sheet/Slides, Core.
- Không merge `main`.

## 4. Việc chưa đo / giới hạn

- Chưa mở Microsoft Word bằng mắt (làm sau serializer, Start-Process thụ động, không SendKeys).
- Chưa đo deletion chứa inline đậm/nghiêng (serializer tái dùng `inlineXml` trong `text:p` của region — cùng pattern note-body Phase D).
- LO đổi `text:id` khi canonicalize; idempotence là output VN, không so canonical LO.
- Probe đếm `changeEmpty` bằng `/<text:change\b/` cũng dính `change-start`/`change-end` — không dùng số đó; cấu trúc xác nhận bằng snippet XML.
