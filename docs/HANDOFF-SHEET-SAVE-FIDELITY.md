# HANDOFF — Sheet Save Fidelity: font-face-decls, newline preservation, rich-text paragraphs

## Status: DONE

## Problem
Saving XLSX from VN Sheet lost fonts (Times New Roman → Arial), lost line breaks in cells, and lost rich text formatting.

## Root Cause
`serializeToFods()` in `adapters/libreoffice/sheet/sheet-adapter.js`:
1. Did not emit `office:font-face-decls` → LibreOffice dropped unregistered fonts during FODS→XLSX conversion.
2. Cells with `\n` in `val` (no richText) were serialized as a single `<text:p>` with literal newline → LibreOffice treated it as whitespace.
3. Rich text cells already handled paragraph splitting correctly via run grouping.

## Fix (sheet-adapter.js)

### 1. office:font-face-decls (line ~1735)
Collect all `fontFamily` values from cell styles + rich text runs across all sheets. Generate `<office:font-face-decls>` with `<style:font-face>` for each unique font. Names with spaces get `svg:font-family="&apos;Name&apos;"`. Placed after `<office:document>` opening tag, before `<office:styles>`.

### 2. Newline splitting for non-richText cells (line ~2232)
Changed from single `<text:p>${escapedText}</text:p>` to:
```js
const lines = text.split("\n");
const linesXml = lines.map(line => `<text:p>${this._escapeXml(line)}</text:p>`).join("");
```
Round-trip: `parseFods` already joins `<text:p>` content with `\n`, so val is preserved.

## Tests (tests/unit/sheet-save-fidelity.test.js)
10 tests covering:
- Cell with `\n` → multiple `<text:p>`
- Rich text 2 paragraphs × 2 runs → `<text:p>` with `<text:span>`
- font-face-decls contains "Times New Roman"
- font-face-decls includes fonts from rich text runs
- Round-trip: val with `\n` preserved
- Round-trip: richText preserved
- Round-trip: style.fontFamily preserved
- Real FODS (_dss_real.fods): font-face, ≥15 `<text:p>`, `<text:span>`
- font-face-decls quotes font names with spaces
- Single-line cell → one `<text:p>`

## Verification
- All 1647 tests pass (1637 existing + 10 new).
- Real soffice conversion: `xl/styles.xml` has "Times New Roman", `sharedStrings.xml` has `<r>` elements and line breaks for D5.

## Files Changed
- `adapters/libreoffice/sheet/sheet-adapter.js` — serializeToFods()
- `tests/unit/sheet-save-fidelity.test.js` — new test file
- `tests/run-tests.js` — registered new test suite (#146)
