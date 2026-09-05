# Agent Handoff

TASK: Rà soát toàn diện real-export fidelity của VN Writer  
AGENT/ROLE: Codex / Writer + Integration audit  
BRANCH: `fix/writer-realexport-audit`  
WORKTREE: `E:\VNOffice-codex-writer-realexport-audit`  
OBJECTIVE: Đo nội dung thật sau `_contentForExport()` -> soffice -> DOCX/PDF, sửa lỗi HTML-filter đơn giản và công khai giới hạn còn lại.  

## FINDINGS

### Lỗi đã tìm thấy và đã sửa

**Drop Cap làm mất chữ cái đầu trong DOCX thật.** Markup canvas chỉ có `<span class="vno-drop-cap">`; stylesheet canvas không nằm trong payload export. LibreOffice bỏ luôn span/class-only này, khiến `D` trong `DROP_CAP_BODY` biến mất. `_contentForExport()` nay đổi marker Drop Cap thành markup font legacy mà Writer HTML importer hiểu ổn định. DOCX thật giữ chữ đầu và tạo run phóng lớn (`w:sz=72/96`).

Commit độc lập: `5de437f fix(writer): preserve drop cap initial in real exports`.

### Lỗi/giới hạn thật đã xác nhận nhưng chưa sửa

Các mục sau cần phát sinh hoặc hậu xử lý cấu trúc native OOXML/ODF; CSS/HTML Adapter hiện tại không đủ. Không sửa Core, không đổi pipeline trong task này theo Core/architecture gate.

| Tính năng | Kết quả conversion thật | Bằng chứng |
|---|---|---|
| Watermark | **FAIL / chưa sửa** | `position:fixed`, rotate và opacity bị flatten thành paragraph thường trong `word/document.xml`; không có `wp:anchor`/VML shape, không lặp nền trang. |
| Page Border | **FAIL / chưa sửa** | LibreOffice bỏ `@page border`; DOCX không có `w:pgBorders`. |
| Column Break | **FAIL / chưa sửa** | Dù marker đã là `<p>`, `break-before:column` vẫn bị bỏ; DOCX không có `w:br w:type="column"`. |
| Footnote native | **GIỚI HẠN** | Số tham chiếu và nội dung vẫn nhìn thấy, nhưng export thành text tĩnh trong body; không có `word/footnotes.xml`/`w:footnoteReference`. |
| Endnote native | **GIỚI HẠN** | Nội dung nhìn thấy nhưng không có `word/endnotes.xml`/`w:endnoteReference`. |
| WordArt effects | **GIỚI HẠN** | Chữ và cỡ chữ còn; gradient, stroke, shadow, metadata bị bỏ, không có DrawingML WordArt. |
| Section-specific geometry | **GIỚI HẠN đã biết** | Break thật tạo trang mới, nhưng named `@page` bị bỏ; các section dùng cùng MediaBox. |
| Envelope trộn A4 | **GIỚI HẠN đã biết** | Named page size bị bỏ; toàn bộ PDF dùng page size mặc định cuối cùng (đo được 220×110 mm). |

`tests/live/writer-realexport-known-limits.mjs` cố ý chạy toàn bộ rồi **FAIL bằng `node:assert`**, liệt kê 6 giới hạn đầu tiên; không biến phép quan sát thành PASS giả.

## Ma trận tính năng được kiểm tra

| Tính năng Writer | Kết quả | Phép đo thật / script |
|---|---|---|
| Insert Page Break | **PASS thật** | PDF page count = 2; `writer-page-break-real-export.mjs`. |
| Mail Merge > Hoàn tất trộn thư | **PASS thật** | 3 record -> 3 PDF pages; cùng script trên. |
| Columns (2 cột) | **PASS thật** | DOCX có `w:cols w:num="2"`; `writer-realexport-fidelity.mjs`. |
| Column Break | **FAIL** | Không có native column break; known-limit script. |
| Watermark | **FAIL** | Text bị flatten thành paragraph thường; known-limit script. |
| Page Border | **FAIL** | Không có `w:pgBorders`; known-limit script. |
| Drop Cap | **LỖI ĐÃ SỬA / PASS thật** | Chữ đầu không còn mất và run phóng lớn trong DOCX; fidelity script. Đây là fallback trực quan, chưa phải native wrapped drop cap. |
| WordArt | **PASS text / LIMIT effects** | Text sống qua FODT/DOCX; gradient/stroke/shadow/data attr mất; `fodt-wordart-persistence-real-conversion.mjs` + hai script audit mới. |
| Track Changes hiển thị khi export | **PASS thật theo thiết kế accepted view** | Insert còn, deletion mất, không rò `w:ins/w:del`; fidelity script. |
| Table of Contents | **PASS visible/static** | Tiêu đề, entry và DOCX hyperlink còn; không phải native TOC field tự cập nhật. |
| Footnotes | **PASS visible / LIMIT native** | Ref/body nhìn thấy; không có native footnote part. |
| Endnotes | **PASS visible / LIMIT native** | Ref/body nhìn thấy; không có native endnote part. |
| Citations + bibliography | **PASS thật dạng visible/static** | Text citation/bibliography và metadata VNO sống qua DOCX round trip; fidelity + `writer-citations-real-conversion.mjs`. Không phải Word citation field native. |
| Header/Footer | **PASS thật/native** | DOCX có `word/headerN.xml`, `word/footerN.xml` và text đúng. |
| Page Color | **PASS thật** | PDF content stream có fill RGB đúng `#dbeafe`. |
| Section Break next-page | **PASS break / LIMIT geometry** | PDF có 2 trang; per-section MediaBox không khác nhau. |
| Labels nhiều tờ | **PASS real break** | Nội dung cực nhỏ vẫn tạo đúng 2 PDF pages. |
| Envelope/Labels page geometry | **PASS isolated / LIMIT mixed size** | Labels A4 đúng; envelope-only/mixed đều phát sinh thêm trang rỗng và mixed geometry không giữ A4. |

## Inventory export-facing Writer còn lại

Các nhóm sau đều đi qua `_contentForExport()` nhưng không phải trọng tâm CSS khó đo được yêu cầu trong vòng audit này: rich text/paragraph/list, tables, images, shapes/text boxes/charts/diagrams, captions/Table of Figures, comments (được strip marker), styles/theme, hyperlinks/bookmarks/cross-reference, date/time, equation/symbol, page size/orientation/margins, envelopes/labels và basic document text. Các test real-conversion có sẵn đã cover captions, arrange/shapes và fixture import; **không claim audit sâu từng thuộc tính** trong vòng này. Nên mở batch tiếp theo cho tables/images/floating shapes/chart raster fidelity.

## IMPLEMENTATION SUMMARY

- Thêm kế hoạch audit theo plan gate.
- Thêm real DOCX assertions cho Header/Footer, accepted Track Changes, TOC, Columns, Drop Cap, WordArt text, notes visible text và citations.
- Thêm executable known-limit assertions cho Watermark, Page Border, Column Break, native notes và WordArt effects.
- Sửa riêng Drop Cap export fallback trong Writer Adapter.
- Không thêm dependency, không sửa Sheet/Slides source, platform, Core hay upstream.

FILES CHANGED:

- `adapters/libreoffice/writer/writer-adapter.js`
- `tests/live/writer-realexport-fidelity.mjs`
- `tests/live/writer-realexport-known-limits.mjs`
- `docs/PLAN-WRITER-REALEXPORT-AUDIT.md`
- `docs/HANDOFF-WRITER-REALEXPORT-AUDIT.md`

COMMANDS RUN:

- `node tests/run-tests.js`
- `node tests/live/writer-realexport-fidelity.mjs`
- `node tests/live/writer-realexport-known-limits.mjs`
- `node tests/live/writer-page-break-real-export.mjs`
- `node tests/live/writer-sectionbreaks-pagecolor-real-conversion.mjs`
- `node tests/live/fodt-wordart-persistence-real-conversion.mjs`
- `node tests/live/writer-citations-real-conversion.mjs`
- `node tests/live/writer-envelopes-labels-real-conversion.mjs`

BUILD RESULT: Không có build riêng; syntax nằm trong suite.  
TEST RESULTS: Baseline và final `node tests/run-tests.js`: **PASS 1103/1103**. Real fidelity: **PASS**. Known-limit probe: **FAIL đúng thiết kế, 6 lỗi được assert rõ**. Các live probes liệt kê phía trên: **PASS**, kèm các LIMIT ghi trong bảng.  
KNOWN FAILURES: Watermark, Page Border, Column Break, native Footnote/Endnote, WordArt effects, per-section geometry, mixed envelope/A4 geometry.  
RISKS: Drop Cap fallback giữ và phóng lớn chữ đầu nhưng không tạo `w:framePr dropCap`; text chưa wrap quanh initial như native Word.  
DEPENDENCIES/BLOCKERS: Muốn sửa các lỗi native cần quyết định mở rộng pipeline export để sinh/hậu xử lý OOXML/ODF; đó là thay đổi file-format semantics/architecture cần người phụ trách duyệt.  
CORE PATCH ID (if any): Không có.  
NEXT ACTION: Duyệt thiết kế Writer export postprocessor ở Adapter/service boundary (không UI -> Core) cho page decorations, column break và native notes; thêm fixture DOCX/PDF golden cho từng cấu trúc trước khi triển khai. Không merge branch này vào `main` tự động.
