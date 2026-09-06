# Kế hoạch dài hạn: chuyển Writer sang pipeline trung gian FODT

## 1. Mục tiêu và quyết định kiến trúc

VN Writer cần một đường lưu/xuất dựa trên Flat OpenDocument Text (FODT) để LibreOffice xử lý bằng pipeline ODF Text native, thay cho việc phụ thuộc lâu dài vào HTML import filter. Đây là migration tăng dần, không phải thay pipeline hiện hành trong một lần.

Ranh giới lớp giữ nguyên:

```text
VN Writer UI
  -> Writer command/service
  -> WriterAdapter (HTML model <-> FODT)
  -> LibreOffice conversion
```

Không sửa LibreOffice Core, không thêm thư viện ngoài, không để UI gọi implementation nội bộ của LibreOffice. `serializeToFodt()` và `parseFodt()` nằm trong Writer Adapter, tương tự `serializeToFods()`/`parseFods()` và `serializeToFodp()`/`parseFodp()` hiện có.

## 2. Năng lực hiện tại và nguyên nhân cần migration

Writer hiện lưu DOCX và xuất PDF bằng `_contentForExport()` -> HTML -> LibreOffice Writer HTML import filter. Toàn bộ suite hiện tại phụ thuộc đường này. Audit tại `docs/HANDOFF-WRITER-REALEXPORT-AUDIT.md` đã đo được các giới hạn native: page border, watermark, column break, footnote/endnote, WordArt effects và geometry riêng theo section.

Sheet và Slides đã dùng Flat ODF thật:

- Sheet tạo `office:document`/`office:spreadsheet`, automatic styles và bảng bằng FODS; parser khôi phục workbook.
- Slides tạo `office:document`/`office:presentation`, automatic graphic/text styles và các `draw:page`; parser khôi phục slide model.
- Cả hai gom style theo nội dung, cấp tên deterministic, escape XML tại boundary và kiểm tra bằng conversion LibreOffice thật.

ODF 1.3 quy định single-file document dùng root `office:document`; tài liệu text dùng MIME `application/vnd.oasis.opendocument.text`, body `office:text`; paragraph/heading dùng `text:p`/`text:h`, list dùng `text:list`, inline style dùng `text:span`. ODF còn có native `text:note` với `text:note-class` cho footnote/endnote, là nền móng cho Phase D. Nguồn chuẩn: OASIS OpenDocument 1.3 Part 3 và Relax NG schema chính thức.

## 3. Phase A — nền tảng văn bản cơ bản (task này)

### Phạm vi

- Thêm `WriterAdapter.serializeToFodt()` song song với `_contentForExport()`.
- Thêm `WriterAdapter.parseFodt(fodtXml)`; trả HTML Writer chuẩn hóa và nạp vào `bodyDom` nếu adapter có body.
- Ánh xạ block:
  - `p` -> `text:p`.
  - `h1`…`h6` hoặc paragraph có heading style -> `text:h text:outline-level`.
  - `ul`/`ol` + `li` -> `text:list`/`text:list-item`, với list-style bullet/number.
- Ánh xạ paragraph alignment: left/center/right/justify bằng automatic paragraph style.
- Ánh xạ inline: bold, italic, underline, foreground color, highlight/background, font family và font size bằng automatic text style + `text:span`.
- Bảo toàn text, entity, line break và khoảng trắng có ý nghĩa.
- Style registry và output deterministic để serialize -> parse -> serialize idempotent.

### Chính sách dữ liệu ngoài phạm vi

Phase A chỉ nhận tập con trên. Table, image, link/bookmark, comment/citation, footnote/endnote, section marker, header/footer, shape/Text Box/WordArt/chart/diagram, track changes và mọi marker `data-vno-*` chưa được hỗ trợ phải gây lỗi `WRITER_FODT_UNSUPPORTED_CONTENT` rõ ràng trước khi trả XML. Parser cũng từ chối các cấu trúc FODT ngoài tập con nếu chúng có thể chứa dữ liệu người dùng. Không được bỏ qua âm thầm.

Empty wrapper/markup trình duyệt vô hại được chuẩn hóa an toàn; mọi quyết định nới tập con phải có test regression.

### Files/modules

- `adapters/libreoffice/writer/writer-adapter.js`: serializer, parser và helper cục bộ của Writer.
- `tests/unit/writer-fodt-phase-a.test.js`: structure, mapping, rejection và idempotence.
- `tests/live/writer-fodt-phase-a-real-conversion.mjs`: ghi FODT thật, convert DOCX/PDF thật, kiểm tra package/rendered output.
- `tests/run-tests.js`: đăng ký unit test Phase A; không đưa live soffice test vào suite unit để môi trường thiếu LibreOffice không bị báo PASS giả.
- `docs/HANDOFF-WRITER-FODT-MIGRATION-PHASE0.md`: handoff và test truthfulness.

### Dependencies

- Tái sử dụng `tests/helpers/soffice-convert.mjs` và `tests/helpers/zip-package.mjs`.
- LibreOffice/soffice thật là dependency bắt buộc của live test.
- Không thêm npm package hay service bên ngoài.

### Rủi ro và giảm thiểu

- HTML trong `bodyDom` không phải XML: dùng tokenizer/normalizer giới hạn, fail-closed trên tag/attribute đặc thù chưa hỗ trợ.
- LibreOffice có thể canonicalize style/XML: idempotence Phase A được định nghĩa cho output VN (`serialize -> parse -> serialize`), đồng thời live hop kiểm tra DOCX/PDF độc lập.
- Whitespace ODF có quy tắc collapse riêng: serialize space lặp/tab/newline bằng `text:s`, `text:tab`, `text:line-break`.
- CSS có nhiều cách viết tương đương: chuẩn hóa key/value trước khi cấp style name.
- Nguy cơ vô tình cutover: Phase A không sửa `save`, `saveAs`, `open`, `exportPdf`, `_contentForExport()` hay UNO bridge.

### Test plan

1. Baseline và final: `node tests/run-tests.js`; chỉ ghi PASS khi toàn bộ suite pass.
2. Unit: assert MIME/root/body, paragraph/heading/list, inline formatting, alignment, escaping/whitespace, parse và exact idempotence.
3. Negative unit: table/image/footnote và unknown data-bearing markup phải throw rõ ràng; `bodyDom` không bị sửa khi parse fail.
4. Live: tạo tài liệu có paragraph, heading, bold, italic, underline, màu, highlight, font family/size, alignment, bullet và numbered list; ghi `.fodt` thật.
5. Dùng `convertWithSoffice()` chuyển FODT -> DOCX và FODT -> PDF.
6. DOCX: đọc `word/document.xml`/styles để xác nhận text, heading/list native, alignment và run formatting native.
7. PDF: xác nhận file hợp lệ, có trang/render stream và text mong đợi bằng công cụ đo độc lập sẵn có hoặc round-trip qua LibreOffice khi PDF text extraction không ổn định.
8. Chạy syntax check nếu repo cung cấp.

### Rollback

Phase A là additive. Rollback chỉ cần revert các commit Phase A; pipeline HTML đang chạy không đổi. Không cần migration dữ liệu vì FODT chưa là format lưu mặc định.

## 4. Phase B — bảng và ảnh cơ bản (hoàn thành, xem Phase B.1 bên dưới cho phần còn lại)

### Phạm vi đã làm (Claude, sau khi Codex/Grok hết quota)

- `table:table` / `table:table-column` (`table:number-columns-repeated`) / `table:table-row` / `table:table-cell`: bảng lưới đơn giản, số ô mỗi hàng phải bằng nhau.
- Viền ô (`border`/`border-top/right/bottom/left`, dạng `<số>px|pt <kiểu> <màu>`) và nền ô (`background-color`) qua `style:table-cell-properties` tự động, dùng registry style deterministic giống text/paragraph.
- Căn lề nội dung ô (`text-align` trên `<td>`) tái dùng registry paragraph style sẵn có.
- Ảnh PNG nhúng qua `draw:frame` (`text:anchor-type="as-char"`) + `draw:image` + `office:binary-data`, đúng pattern đã được xác nhận thật ở Slides (`xlink:href=""`, `xlink:show="embed"`). Kích thước thật (svg:width/height, cm) đọc trực tiếp từ IHDR của PNG (không suy đoán từ CSS, vì `<img>` của Writer luôn là `max-width:100%;height:auto`, không có kích thước CSS đáng tin).

### Chính sách "ngoài phạm vi" bổ sung cho Phase B (throw rõ ràng, không mất dữ liệu âm thầm)

- Nội dung khối (bảng/danh sách lồng) bên trong ô bảng: chưa hỗ trợ.
- Ảnh không phải PNG (JPEG/GIF/WEBP/...): chưa hỗ trợ — cần bộ đọc kích thước riêng cho từng định dạng để không đoán sai kích thước thật.
- Ảnh không phải data URI base64 nhúng sẵn (link ngoài): chưa hỗ trợ.

### Verification thật đã làm (không chỉ tin bản thân)

- Unit: `tests/unit/writer-fodt-phase-b.test.js` — cấu trúc XML, idempotence bảng/ảnh, từ chối ảnh không PNG/PNG hỏng, từ chối cấu trúc FODT nhập vào ngoài phạm vi mà không sửa `bodyDom`.
- Live thật qua soffice: `tests/live/writer-fodt-phase-b-real-conversion.mjs` — tạo PNG thật bằng zlib (không dùng file mẫu), serialize FODT thật, convert DOCX thật qua soffice, xác nhận bằng byte: bảng ra `w:tbl`/`w:tc` native (không phải ảnh chụp), tô nền/căn phải giữ nguyên là thuộc tính DOCX gốc, ảnh nhúng trong `word/media/` **khớp byte-for-byte** với PNG gốc (không bị mã hóa lại/hỏng), ảnh là `w:drawing` native.
- **Mở file DOCX thật bằng Microsoft Word thật** (Start-Process thụ động, chụp màn hình xác nhận bằng mắt): bảng hiện đúng viền/tô nền vàng/căn phải cột số, ảnh gradient hiện đúng ngay dưới đoạn văn — đúng tiêu chuẩn "tài liệu chuyển sang Microsoft Office phải hiển thị đúng" mà người phụ trách yêu cầu.

## 4b. Phase B.1 — colspan/rowspan thật (hoàn thành)

### Phạm vi đã làm (Claude, cùng phiên với Phase B)

- `colspan`/`rowspan` thật qua occupancy grid đầy đủ chuẩn ODF: xây lưới `[hàng][cột]` đầy đủ, ô gốc mang `table:number-columns-spanned`/`table:number-rows-spanned`, mọi ô bị chiếm bởi span (cùng hàng lẫn hàng sau) phát ra `<table:covered-table-cell/>` đúng vị trí.
- Từ chối rõ ràng (không đoán/không lặng lẽ sai): colspan/rowspan không phải số nguyên dương, colspan vượt số cột bảng, rowspan vượt số hàng bảng, span chồng lấn ô khác, hàng thiếu/thừa ô so với lưới tổng thể.
- Chiều ngược (parse): `table:covered-table-cell` bị bỏ qua khi dựng lại HTML (HTML tự nhiên không cần placeholder — `colspan`/`rowspan` trên `<td>` gốc đã đủ diễn đạt), `table:number-columns/rows-spanned` được đọc lại thành thuộc tính `colspan`/`rowspan` HTML.

### Verification thật

- Unit: cấu trúc XML cho cả colspan riêng, rowspan riêng, và 1 lưới 3×3 phối hợp cả hai (kiểm tra bằng tay số lượng `table:covered-table-cell` đúng vị trí từng hàng) + idempotence chính xác; 3 ca từ chối (colspan=0, colspan vượt cột, rowspan vượt hàng).
- Real soffice: colspan → `<w:gridSpan w:val="2">` thật trong DOCX; rowspan → `<w:vMerge w:val="restart">` (ô gốc) + `<w:vMerge w:val="continue">` (ô bị chiếm) thật — đo trực tiếp bằng byte, sửa lại giả định ban đầu (đã đoán sai là `w:vMerge` không có `w:val` khi continue — LibreOffice thực ra ghi `w:val="continue"` tường minh).
- **Mở bằng Microsoft Word thật, xác nhận bằng mắt**: hàng tiêu đề gộp 3 cột hiện đúng 1 ô rộng có nền xanh căn giữa; cột "Miền Bắc" gộp dọc đúng 2 hàng dữ liệu thành 1 ô duy nhất; số liệu căn phải đúng.
- `node tests/run-tests.js`: 1151/1151 PASS (1138 sau Phase B + 13 test Phase B.1 mới, gồm cả 2 test Phase A được viết lại vì colspan giờ đã hợp lệ nên không còn là ví dụ "ngoài phạm vi").

## 4c. Phase B.2 — Text Box, shape, định dạng ảnh khác (hoàn thành)

### Phạm vi đã làm (Grok, worktree `E:\VNOffice-grok-writer-fodt-phase-b2`)

- Ảnh JPEG/GIF/WEBP: kích thước đọc từ header thật, không từ CSS `max-width/height:auto`.
  - JPEG: SOF0 `0xFFC0` và SOF2 `0xFFC2` (GDI+ trên máy đo ra SOF0; SOF2 có unit test header ghép).
  - GIF: logical screen bytes 6–9 little-endian, nhận `GIF87a` và `GIF89a`.
  - WEBP: ba biến thể RIFF đo riêng — `VP8 ` (start code `9d012a`), `VP8L` (signature `0x2F`), `VP8X` (canvas 24-bit, **không** lấy size từ inner VP8).
  - `draw:mime-type` đúng `image/jpeg|gif|webp`.
- Text Box và 6 loại shape UI Writer hiện có (`rectangle`, `round-rect`, `circle`, `line`, `arrow`, `textbox`) qua primitive ODF đã convert được: `draw:rect` / `draw:rect+corner-radius` / `draw:ellipse` / `draw:line` / `draw:custom-shape right-arrow` / `draw:frame+draw:text-box`. Drawing **bắt buộc nằm trong `text:p`** (sibling của paragraph bị LibreOffice nuốt — đo thật). Neo `paragraph` + `svg:x/y` khớp overlay `this.shapes`.
- BMP/TIFF vẫn bị từ chối rõ `WRITER_FODT_UNSUPPORTED_CONTENT`.

### Verification thật

- Unit: `tests/unit/writer-fodt-phase-b2.test.js` — SOF0/SOF2, GIF89a/GIF87a, VP8/VP8L/VP8X (canvas ≠ inner), idempotence từng loại, reject BMP/TIFF, 6 shape UI + Text Box idempotence.
- Live soffice: `tests/live/writer-fodt-phase-b2-real-conversion.mjs` — JPEG/GIF `word/media/imageN.jpeg|gif` **Buffer.equals** bytes gốc; WEBP (LibreOffice 26.2.5) **re-encode PNG** (không equals gốc — sự thật engine, không giả byte-exact); shape DOCX có `w:drawing` + `prstGeom` `rect/roundRect/ellipse/line/rightArrow` + txbx chữ `HOP_VAN_BAN`.
- **Mở Microsoft Word thật** (Start-Process thụ động): JPEG đỏ 16×10 và GIF xanh 12×8 hiện đúng; 6 shape (chữ nhật, bo tròn, tròn, đường, mũi tên, hộp văn bản «Hộp văn bản VN Writer») hiện native.
- `node tests/run-tests.js`: **1184/1184 PASS** (1170 baseline @ `4b5a297` + 14 test Phase B.2).

## 5. Phase C — page, header/footer và section geometry (hoàn thành)

### Phạm vi đã làm (Grok, worktree `E:\VNOffice-grok-writer-fodt-phase-c`)

- Page size / margin 4 cạnh / orientation từ `this.pageSetup` thành `style:page-layout` (`fo:page-width/height`, `fo:margin-*`, `style:print-orientation`) + `style:master-page` tên `Standard`.
- Header/footer từ `headerDom`/`footerDom` thành `style:header`/`style:footer` — tái dùng `paragraphXml`/`inlineXml`/`listXml` hiện có, không viết serializer riêng. `margin`/`padding` canvas trên header mặc định Writer bị bỏ (chrome, không phải nội dung).
- Nhiều geometry (A4 + envelope xen giữa): mỗi mục một `style:page-layout`/`style:master-page`; đổi vùng bằng **paragraph style** `style:master-page-name` + `fo:break-before="page"` trên `text:p` đầu vùng. Đo thật: attribute `style:master-page-name` trên chính `text:p` và `text:section` **không** đổi khổ khi ra DOCX/PDF.
- Parser khôi phục `pageSetup`, `sectionPageSetups`, header/footer. Header/footer khác nhau giữa các master-page → `WRITER_FODT_UNSUPPORTED_CONTENT` (Writer chỉ có một cặp HF).
- `save()` / `exportPdf()` / `_contentForExport()` không đổi (cùng cutover gate Phase A/B).

### Verification thật

- Unit: `tests/unit/writer-fodt-phase-c.test.js` — 11 test: A4 mặc định, Letter landscape, envelope portrait (w>h không bị suy ra landscape), header/footer, idempotence, mixed A4+DL, fail-closed bảng/field trong header.
- Live soffice: `tests/live/writer-fodt-phase-c-real-conversion.mjs` — A4 `w:pgSz` 11906×16838 + `headerReference`/`footerReference` + part XML đúng chữ; Letter `w:orient="landscape"`; mixed **hai** `w:sectPr` (A4 + DL 12472×6236) và **hai** PDF MediaBox.
- Microsoft Word thật (Start-Process thụ động): trang 1 A4, header «Công ty TNHH Sao Việt — Đầu trang», thân A4 hiện native.
- `node tests/run-tests.js`: **1198/1198 PASS** (1187 baseline @ `420c4a4` + 11 test Phase C).

## 6. Phase D — cấu trúc tham chiếu native (hoàn thành)

### Phạm vi đã làm (Grok, worktree `E:\VNOffice-grok-writer-fodt-phase-d`)

- Footnote/endnote: HTML Writer `sup[data-vno-footnote-ref|endnote-ref]` + container cuối body → ODF `text:note` / `text:note-citation` / `text:note-body` (một `text:p`, tái dùng `inlineXml`). `text:notes-configuration` trong `office:styles` khi có note: footnote `style:num-format="1"`, endnote `"i"`. Parser dựng lại số mũ + đúng một container mỗi loại; nút xóa/separator là chrome, không emit.
- Comment: `<mark data-comment-id>` + `this.comments[]` → `office:annotation` (dc:creator / dc:date / `text:p`) + chữ neo + `office:annotation-end`. `xmlns:dc` chỉ khi có annotation. Parser khôi phục mark + `this.comments`. Point annotation (không end) vẫn hydrate panel, không bọc chữ.
- TOC: khối tĩnh `data-vno-toc` (Heading 1–3, leader, số trang heuristic) → `text:table-of-content` + `text:table-of-content-source` outline-level 3 + `text:index-body` **điền sẵn** (đo: index-body rỗng → Word field TOC trống). Heading `text:h` giữ Phase A.

### Chính sách ngoài phạm vi

- `<sup>` không phải note, mark không có entry `this.comments`, note-body không đúng một `text:p`, TOC/note/comment trong header, annotation lồng → `WRITER_FODT_UNSUPPORTED_CONTENT`.
- Citation vẫn ngoài Phase D.
- `save()` / `exportPdf()` / `_contentForExport()` không đổi (cutover gate). Đường HTML vẫn strip `<mark data-comment-id>`.

### Verification thật

- Unit: `tests/unit/writer-fodt-phase-d.test.js` — 12 test: cấu trúc note/comment/TOC, idempotence, reuse inline trong note-body, fail-closed.
- Live soffice: `tests/live/writer-fodt-phase-d-real-conversion.mjs` — footnote → `word/footnotes.xml` + `w:footnoteReference`; endnote → `word/endnotes.xml` + `w:endnoteReference` + `w:numFmt="lowerRoman"`; comment → `word/comments.xml` + `commentRangeStart/End` + `commentReference`; TOC → `w:sdt` `docPartGallery="Table of Contents"` + `instrText` `TOC \f \o "1-3"`.
- Microsoft Word thật (Start-Process thụ động): footnote số mũ 1, endnote i + body cuối tài liệu; comment panel Review «Tran Thi Hoa» + body; TOC «MỤC LỤC» phân cấp 1/2/3 và Navigation pane nhận outline.
- `node tests/run-tests.js`: **1210/1210 PASS** (1198 baseline @ `9f05f15` + 12 test Phase D).

## 7. Phase E — drawing nâng cao và thay đổi tài liệu

### 7a. Phase E.1 — Track Changes native (hoàn thành)

Phạm vi đã làm (Grok, worktree `E:\VNOffice-grok-writer-fodt-phase-e1`):

- `<ins data-vno-change="insert">` → `text:changed-region`/`text:insertion` + `text:change-start`/`text:change-end` quanh chữ trong body.
- `<del data-vno-change="delete">` → `text:changed-region`/`text:deletion` (nội dung trong `text:p` của region) + empty `<text:change/>` tại chỗ xóa. **Không** bọc del bằng start/end trong body (đo LO 26.2.5: pattern đó nhân đôi chữ).
- `office:change-info`: `dc:creator` khi có `data-vno-author`; `dc:date` bắt buộc (LO nuốt region nếu thiếu date). Phiên không có date dùng sentinel deterministic `1970-01-01T00:00:00`.
- Parser khôi phục `<ins>`/`<del>` + author/date. `text:format-change` / start-end trỏ deletion → `WRITER_FODT_UNSUPPORTED_CONTENT`.
- `save()` / `exportPdf()` / `_contentForExport()` không đổi (vẫn strip ins/del trên đường HTML).

Verification thật:

- Unit: `tests/unit/writer-fodt-phase-e1.test.js` — 10 test: cấu trúc insert/delete, author/date, idempotence phiên và import, inline đậm/nghiêng, fail-closed format-change/lồng/header.
- Live soffice: `tests/live/writer-fodt-phase-e1-real-conversion.mjs` — FODT serializer → DOCX; `word/document.xml` có `<w:del w:author="Nguyen Van An" w:date="…Z">` + `w:delText`, `<w:ins w:author=… w:date=…>`; `word/settings.xml` có `w:trackRevisions`.
- Microsoft Word thật (Start-Process thụ động): Simple Markup — vạch đỏ lề trái, chữ xóa không còn trên trang, chữ chèn nằm trong câu (không phải chữ màu tĩnh).
- `node tests/run-tests.js`: **1220/1220 PASS** (1210 baseline @ `4cae9a3` + 10 test Phase E.1).

### 7b. Phase E.2 — Watermark native (hoàn thành)

Phạm vi đã làm (Grok, worktree `E:\VNOffice-grok-writer-fodt-phase-e2`):

- Writer watermark là **chữ** trên `this.watermark` `{text, color, opacity, angle, fontSize}` — overlay CSS canvas, không nằm body/header DOM.
- Đo hai hướng ODF trước code (`docs/HANDOFF-WRITER-FODT-PHASE-E2-FINDINGS.md`):
  - `style:background-image` trên page-layout → DOCX `w:background` (nền trang), **không** phải watermark header. Không dùng. Parse throw.
  - `draw:frame` + `draw:text-box` trong `style:header` → DOCX `word/header1.xml` có `mc:AlternateContent` + `wp:anchor behindDoc="1"` + VML `v:shape` xoay. **Dùng hướng này.**
  - Reverse Word VML `PowerPlusWaterMarkObject` → FODT `draw:custom-shape` Fontwork trong header. Parser đọc được; serializer VN **không** giả tên gallery Word (mất `fontSize` Writer nếu emit Fontwork).
- `serializeToFodt()`: frame `draw:name="Watermark"` trên mọi master-page (tái dùng `_fodtMasterPageXml`), `draw:transform="rotate (radians)"` = `angle * π/180` (0 → không transform). Graphic `grWm` wrap run-through / behind. Sống chung header user.
- `parseFodt()`: tách frame/Fontwork watermark khỏi header trước khi dựng `headerDom`; khôi phục `this.watermark`. Nhiều watermark khác nhau / watermark ảnh / `draw:` lạ trong header → `WRITER_FODT_UNSUPPORTED_CONTENT`.
- `save()` / `exportPdf()` / `_contentForExport()` không đổi (cutover gate). Đường HTML vẫn CSS `position:fixed`.

Verification thật:

- Unit: `tests/unit/writer-fodt-phase-e2.test.js` — 10 test: cấu trúc frame/góc/màu/opacity, idempotence, header user, fail-closed background-image / shape lạ / watermark khác master, parse Fontwork Word.
- Live soffice: `tests/live/writer-fodt-phase-e2-real-conversion.mjs` — FODT serializer → DOCX; `word/header1.xml` có `behindDoc="1"`, `rotation:315` (angle 45), chữ `DỰ THẢO`, header user; không `w:background`.
- Microsoft Word thật (Start-Process thụ động): hình mờ chữ mờ, xoay chéo, nằm sau nội dung.
- `node tests/run-tests.js`: **1230/1230 PASS** (1220 baseline @ `fbf56d7` + 10 test Phase E.2).

### 7c. Phase E.3 — WordArt (hoàn thành); Chart/Diagram để E.4

Phạm vi WordArt đã làm (Grok, worktree `E:\VNOffice-grok-writer-fodt-phase-e3`):

- Writer WordArt là **span inline** `data-vno-wordart` trong `bodyDom` (8 preset CSS), không phải `this.shapes`.
- Đo trước code (`docs/HANDOFF-WRITER-FODT-PHASE-E3-FINDINGS.md`): `draw:custom-shape` Fontwork trong `text:p` (sibling bị LO nuốt). `fontwork-plain-text` → DOCX VML-only `o:spt="136"` — Microsoft Word Compatibility Mode **không sơn**. `fontwork-fade-right` → `w:drawing` + `a:prstTxWarp prst="textFadeRight"` + VML fallback — **Word vẽ được** (đo bằng mắt).
- `serializeToFodt()`: Fontwork `fontwork-fade-right` neo `as-char`, `draw:name="WordArt-<presetId>"`, fill từ `fillColor`/`gradient.from`, `draw:stroke="none"`. Parse Fontwork body → `buildWriterWordArtHtml`, **không** `this.shapes`. Header WordArt throw.
- `save()` / `exportPdf()` / `_contentForExport()` không đổi (cutover gate).

Verification thật:

- Unit: `tests/unit/writer-fodt-phase-e3-wordart.test.js` — 10 test: cấu trúc Fontwork, gradient.from, idempotence, parse Fontwork Word, fail-closed header/preset lạ/star6, không đụng arrow B.2.
- Live soffice: `tests/live/writer-fodt-phase-e3-wordart-real-conversion.mjs` — FODT → DOCX có `w:drawing`, `prstTxWarp textFadeRight`, `w:t KHAI_GIANG`, Impact, `w:color 1E3A8A`, `v:textpath` fallback.
- Microsoft Word thật (Start-Process thụ động): chữ **KHAI GIANG** navy lớn, hiệu ứng fade-right, nằm giữa câu.
- `node tests/run-tests.js`: **1240/1240 PASS** (1230 baseline @ `7f610ca` + 10 test WordArt).

**Chưa làm trong E.3 (để Phase E.4), lý do đo được:**

- **Chart:** probe C1–C3 FODT `draw:frame`+`draw:object`+`chart:chart` as-char **đã** ra `word/charts/chart1.xml` native (`c:barChart`/`c:lineChart`/`c:pieChart`). Sibling `text:p` bị nuốt. Writer UI là `<div data-vno-chart>` + SVG, chưa serialize. Không làm dở.
- **SmartArt/Diagram:** probe D1–D3 ra shape Word rời / `wpg:wgp`, **không** `word/diagrams/` hay `dgm:`. Writer HTML 4 layout không ánh xạ 1-1 fail-closed. `data-vno-diagram` vẫn throw.

### 7d. Phase E.4 — Chart native và SmartArt/Diagram (đề xuất)

- Chart: tái dùng pattern C1 (local-table + `chart:class` bar/line/circle/area) trong `text:p` as-char; parse `draw:object` → `generateChartHtml`.
- Diagram: cần thiết kế riêng (không giả SmartArt Word từ nhóm shape); chỉ đánh dấu hỗ trợ khi có fixture + Word visual + idempotence.

## 8. Chiến lược cutover

Hai pipeline phải cùng tồn tại qua nhiều phase:

```text
Hiện tại/default: bodyDom -> _contentForExport() -> HTML -> DOCX/PDF
Đang xây dựng:     bodyDom -> serializeToFodt() -> FODT -> DOCX/PDF
```

Không thay `save()`/`exportPdf()` mặc định cho đến khi:

- Ma trận parity bao phủ gần đầy đủ toàn bộ feature export hiện có, không chỉ Phase A.
- Unsupported content có fallback/cảnh báo UX được duyệt, không mất dữ liệu.
- Import/export fixtures DOCX/ODT/PDF và full suite đều PASS.
- Hiệu năng, file size, accessibility/help và backward compatibility được đo.
- Người phụ trách review kiến trúc và phê duyệt cutover riêng.

Cutover nên có feature flag/canary và khả năng quay lại HTML pipeline trong ít nhất một chu kỳ phát hành. Phase A không thêm flag UI vì chưa có hành vi người dùng mới và chưa đổi đường Save/Export.

## 9. Hướng dẫn sử dụng

Phase A là capability nội bộ chưa nối vào lệnh Save/Open/Export, nên không quảng bá một luồng chưa dùng được trong UI. Khi bắt đầu pilot/cutover, bổ sung mục tiếng Việt trong cơ chế Trợ giúp hiện có của Writer: vị trí **Tệp > Lưu dưới dạng/Xuất PDF**, phạm vi tương thích, cảnh báo nội dung chưa hỗ trợ và cách quay về định dạng an toàn. Mỗi Phase thêm feature người dùng phải cập nhật nội dung trợ giúp cụ thể cùng task đó.

