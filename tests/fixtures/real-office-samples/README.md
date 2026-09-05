# Real Office sample fixtures

These `.docx` / `.xlsx` / `.pptx` files are **not** produced by VN Office.

Pipeline:

1. Hand-written Flat ODF in `src/` (plain XML, never passed through `serializeToFods()` / `serializeToFodp()` / Writer HTML save).
2. LibreOffice headless: `soffice --convert-to docx|xlsx|pptx`.
3. Writer image: pack `src/Pictures/logo-don-vi.png` into an ODT zip first so the DOCX embeds `word/media/image1.png` (Flat ODF `xlink:href` would otherwise become an external link).
4. Sheet validation: after soffice XLSX convert, inject Excel-native `conditionalFormatting` + whole-number `dataValidation` (LibreOffice FODS→XLSX drops those calcext rules). Independent of VN Office serializers.

Round 1: `sample-writer.docx`, `sample-sheet.xlsx`, `sample-slides.pptx`.
Round 2: `sample-writer-image.docx`, `sample-sheet-formulas.xlsx`, `sample-sheet-validation.xlsx`.

Regenerate:

```
node tests/scripts/generate-real-office-fixtures.mjs
```
