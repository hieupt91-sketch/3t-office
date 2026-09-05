# Real Office sample fixtures

These `.docx` / `.xlsx` / `.pptx` files are **not** produced by VN Office.

Pipeline:

1. Hand-written Flat ODF in `src/` (plain XML, never passed through `serializeToFods()` / `serializeToFodp()` / Writer HTML save).
2. LibreOffice headless: `soffice --convert-to docx|xlsx|pptx`.

This is the same path a document created in LibreOffice (or converted from Microsoft Office) would take. Use these files to test **import** fidelity of VN Office `open()`.

Regenerate:

```
node tests/scripts/generate-real-office-fixtures.mjs
```
