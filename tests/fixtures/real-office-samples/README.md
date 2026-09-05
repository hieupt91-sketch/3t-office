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

Slides comments import: `src/sample-slides-comments.fodp` is handwritten Flat ODF with page-level `<office:annotation>` on `<draw:page>` (not VN `serializeToFodp()`). Live test converts it with soffice to PPTX (`ppt/commentAuthors.xml` + `ppt/comments/comment1.xml`) then back to FODP. LibreOffice rewrites the element to `<officeooo:annotation>` after the hop.

Regenerate:

```
node tests/scripts/generate-real-office-fixtures.mjs
```
