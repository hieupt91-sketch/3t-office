# Real Office sample fixtures

These `.docx` / `.xlsx` / `.pptx` files are **not** produced by VN Office.

Pipeline:

1. Hand-written Flat ODF in `src/` (plain XML, never passed through `serializeToFods()` / `serializeToFodp()` / Writer HTML save).
2. LibreOffice headless: `soffice --convert-to docx|xlsx|pptx`.
3. Writer image: pack `src/Pictures/logo-don-vi.png` into an ODT zip first so the DOCX embeds `word/media/image1.png` (Flat ODF `xlink:href` would otherwise become an external link).
4. Sheet validation: after soffice XLSX convert, inject Excel-native `conditionalFormatting` + whole-number `dataValidation` (LibreOffice FODS→XLSX drops those calcext rules). Independent of VN Office serializers.

Round 1: `sample-writer.docx`, `sample-sheet.xlsx`, `sample-slides.pptx`.
Round 2: `sample-writer-image.docx`, `sample-sheet-formulas.xlsx`, `sample-sheet-validation.xlsx`.
Track Changes import: `sample-writer-trackchanges.docx` from `src/sample-writer-trackchanges.fodt` (ODF `<text:tracked-changes>` with insertion + deletion + author). LibreOffice writes native OOXML `w:ins` / `w:del`. Not produced by VN Office.

Comments import: `sample-writer-comments.docx` from `src/sample-writer-comments.fodt` (ODF `<office:annotation>` + `<dc:creator>` + range end). LibreOffice writes native `word/comments.xml` and `w:commentRangeStart` / `w:commentReference` in `word/document.xml`. Not produced by VN Office.

Header/Footer import: `sample-writer-headerfooter.docx` from `src/sample-writer-headerfooter.fodt` (ODF `<style:header>` / `<style:footer>` on the master page, company name + `text:page-number` / `text:page-count`). LibreOffice writes native `word/header1.xml` + `word/footer1.xml` referenced from `w:sectPr` — **not** inside `word/document.xml`. Not produced by VN Office.

Footnotes/Endnotes import: `sample-writer-footnotes.docx` from `src/sample-writer-footnotes.fodt` (ODF `<text:note text:note-class="footnote|endnote">` with `<text:note-citation>` + `<text:note-body>`). LibreOffice writes native `word/footnotes.xml` + `word/endnotes.xml` referenced from `w:footnoteReference` / `w:endnoteReference` in `word/document.xml` — note bodies are **not** inside `word/document.xml`. Not produced by VN Office.

Pivot Table import: `sample-sheet-pivot.xlsx` from `src/sample-sheet-pivot.fods` (hand-written ODF `<table:database-range>` + `<table:data-pilot-tables>` / `<table:data-pilot-table>` / `<table:data-pilot-field>`). LibreOffice writes native `xl/pivotCache/*` and `xl/pivotTables/pivotTable1.xml`. Not produced by VN Office.

Slides comments import: `src/sample-slides-comments.fodp` is handwritten Flat ODF with page-level `<office:annotation>` on `<draw:page>` (not VN `serializeToFodp()`). Live test converts it with soffice to PPTX (`ppt/commentAuthors.xml` + `ppt/comments/comment1.xml`) then back to FODP. LibreOffice rewrites the element to `<officeooo:annotation>` after the hop.

SmartArt import: `sample-slides-smartart.pptx` is a hand-packed OOXML deck with native DrawingML SmartArt (`ppt/diagrams/data1.xml`, `layout1.xml`, `quickStyle1.xml`, `colors1.xml`, `drawing1.xml` plus `dgm:relIds` on the slide). Source parts live in `src/smartart-pptx/`. **Not** produced by VN `serializeToFodp()` — LibreOffice does not emit SmartArt when converting ODF grouped shapes to PPTX. Pack with `node tests/scripts/pack-slides-smartart-pptx.mjs`. Vietnamese node labels: Tiếp nhận hồ sơ, Thẩm định, Phê duyệt, Lưu trữ, Bàn giao.

Speaker Notes import: `sample-slides-notes.pptx` from `src/sample-slides-notes.fodp` (hand-written ODF `<presentation:notes>` with `presentation:class="notes"`). LibreOffice writes native `ppt/notesSlides/notesSlide1.xml` + `notesSlide3.xml` referenced from `ppt/slides/_rels/slideN.xml.rels`. Slide 2 has no notes part. **Not** produced by VN `serializeToFodp()`. Vietnamese notes: “Nhấn mạnh số liệu quý 4…”, “Tỷ giá ngoại tệ không được đọc trước khán giả.”, “Gợi ý chuyển slide: dừng 5 giây tại sơ đồ kiến trúc.”

Regenerate:

```
node tests/scripts/generate-real-office-fixtures.mjs
```
