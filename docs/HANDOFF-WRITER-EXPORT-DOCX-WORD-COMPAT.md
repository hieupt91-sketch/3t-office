# Agent Handoff

TASK: Fix DOCX export Word 2016 compatibility — strip span dimension/position to prevent LO HTML→Writer import creating DrawingML text boxes
AGENT/ROLE: Claude (continuation from prior session)
BRANCH: `fix/writer-export-docx-word-compat`
WORKTREE: `E:\VNOffice-opencode-writer-export-docx`
OBJECTIVE: DOCX exported by VN Writer was rejected by Word 2016 ("We can't open … found a problem with its contents"). Root cause: `_aquara_export_payload.html` contained 260 `<span>` tags with `width:` in their style — LibreOffice HTML import interprets these as text frames, creating 448 `txbxContent` entries (DrawingML+VML) that Word 2016 cannot process.

## ROOT CAUSE

`_convertFloatingImagesToInline()` (import path) preserves `width` on `<span>` for editor display. When this HTML is re-exported via `_contentForExport()` → `save_document_dialog`, LibreOffice converts spans with width into TEXT FRAME elements. Word 2016's OOXML parser rejects deeply nested/nested text boxes.

## FIX

Added `_sanitizeExportHtmlForWordCompat(html)` to `WriterAdapter` — called at the end of `_contentForExport()`. The function strips the following CSS properties from `<span>` style attributes:

- `width`, `height`, `min-height`, `max-width` (dimensional)
- `position`, `top`, `right`, `bottom`, `left` (positional offsets)
- `float`, `display: inline-block` (flow-breaking)

Also applied to `<img>` style attributes (keeps HTML `width`/`height` attributes intact) and non-structural `<div>` styles (structural divs like `vno-export-section`, `vno-export-watermark`, `vno-export-shapes` keep their width). Empty `style=""` attributes are removed.

**Only affects the export string, NOT the editor DOM.**

## VERIFICATION

- **Unit tests**: 17 tests in `tests/unit/writer-export-docx-word-compat.test.js` — all PASS (registered as test #146 in `tests/run-tests.js`)
- **Full test suite**: 1654/1654 PASS, 0 FAIL
- **Syntax check**: 92/92 PASS
- **Real file verification** (`_aquara_export_payload.html`, 9.6MB):
  - 260 spans with `width:` → 0 after sanitize
  - soffice convert → DOCX → count `txbxContent` in `word/document.xml` = **0**
  - Word 2016 compatible

## KNOWN GAP

- Original file is 16 pages; exported DOCX is 27 pages. Text boxes that were floating in the editor become inline paragraphs (side effect of stripping width/position — text boxes are flattened into regular text flow).
- **Long-term fix**: Export text boxes as actual FODT shapes via Phase B.2 serialization (already implemented for FODT). This task only addresses Word 2016 rejection, not layout fidelity.

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js` — added `_sanitizeExportHtmlForWordCompat()` method + called from `_contentForExport()`
- `tests/unit/writer-export-docx-word-compat.test.js` — new test file (17 tests)
- `tests/run-tests.js` — registered new test suite as #146

## TEST COMMANDS

```bash
node tests/run-tests.js      # expect 1654/1654 PASS
node scripts/check-syntax.js # expect 92/92 PASS
```

## ROLLBACK

Revert the `_sanitizeExportHtmlForWordCompat` call in `_contentForExport()` and the new method. Tests can be removed. No data migration needed.
