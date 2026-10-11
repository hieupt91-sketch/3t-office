# HANDOFF — Sheet Import Rich Text

## Status
- Code: DONE (both DOM + regex branches, serialize, render, edit clears, undo/redo preserves)
- Tests: 10/10 PASS, full suite 1623/1623 PASS
- Real file verification: BLOCKED (LibreOffice not installed on this machine)

## What was done
1. **Data model**: Added `item.richText = [{ text, style: {color, fontWeight, fontStyle, textDecoration, fontFamily, fontSize} }]` — only when cell has ≥2 runs with different styles. `item.val` remains flat string for formulas/search/sort.

2. **DOM branch** (`parseFods` line ~2670+): Added `_extractRichTextFromDom()` — reads `<text:span text:style-name>` and maps to automatic styles with `style:family="text"`.

3. **Regex branch** (`parseFods` line ~2880+): Added `_extractRichTextFromXml()` — same logic using regex for environments without DOMParser.

4. **Render** (`_renderCellVisual` in sheet-grid.js): When `item.richText` exists, renders `<span>` elements with inline styles instead of plain textContent.

5. **Serialize** (`serializeToFods`): Writes rich text as `<text:p>/<text:span text:style-name="Tn">` + generates `style:family="text"` automatic styles. Round-trip preserves richText.

6. **Edit** (`setCellValue`): Deletes `richText` when user types a new value (Excel behavior: editing clears formatting).

7. **Undo/Redo**: History snapshots include `prevValRichText`/`nextValRichText`. Undo restores richText from snapshot after setCellValue clears it.

## Files changed
- `adapters/libreoffice/sheet/sheet-adapter.js`: Added `_parseTextStyles()`, `_extractRichTextFromDom()`, `_extractRichTextFromXml()`, `richTextStyleFor()` helper in serialize. Modified `parseFods()` DOM+regex branches and `serializeToFods()`.
- `apps/sheet/sheet-grid.js`: Modified `_renderCellVisual()` to render richText spans. Modified `setCellValue()` to delete richText. Modified `_recordHistory()` for cell type to capture richText. Modified undo/redo handler to restore richText.
- `tests/unit/sheet-import-rich-text.test.js`: New test file with 10 tests.
- `tests/run-tests.js`: Registered new test suite.

## Blockers
- Real file verification: soffice not installed on this machine. The fixture-based Dahua-like test (test 10) covers the same scenario.

## How to verify
1. `node scripts/check-syntax.js` — syntax check
2. `node tests/run-tests.js` — full suite (should be 1623/1623)
3. For real file: install LibreOffice, run `node tests/probe-rich-text-real.mjs` (was deleted, can recreate)
