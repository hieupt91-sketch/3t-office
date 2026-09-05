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

## 4. Phase B — bảng và đối tượng cơ bản (đề xuất)

- `table:table`, row/cell, span/merge, border/shading/alignment.
- Image bằng `draw:frame` + `draw:image`, có chiến lược nhúng binary/data URI cho flat XML.
- Text Box và shape cơ bản qua drawing primitives.
- Mỗi loại có import fixture độc lập và real DOCX/PDF round-trip.

## 5. Phase C — page, header/footer và section geometry (đề xuất)

- Page size, margin, orientation qua `style:page-layout`.
- Header/footer qua `style:master-page` thật.
- Nhiều page-layout/master-page và section/style transition để giữ geometry riêng từng vùng.
- Đây là hướng sửa tận gốc mixed A4/envelope và section geometry; không tiếp tục vá named CSS `@page`.

## 6. Phase D — cấu trúc tham chiếu native (đề xuất)

- Footnote/endnote bằng `text:note`, `text:note-citation`, `text:note-body` và notes configuration.
- TOC bằng `text:table-of-content` thay static block khi đủ parity.
- Comment bằng `office:annotation`; citation được thiết kế riêng sau probe interoperability.

## 7. Phase E — drawing nâng cao và thay đổi tài liệu (đề xuất)

- WordArt, shape, chart, diagram.
- Watermark bằng background image hoặc anchored drawing trên master page sau probe DOCX fidelity.
- Track Changes bằng `text:changed-region` và change markers.
- Mỗi capability chỉ được đánh dấu hỗ trợ khi có fixture import, VN round-trip và LibreOffice real conversion assertion.

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

