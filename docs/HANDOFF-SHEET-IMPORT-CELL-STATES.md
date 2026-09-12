# HANDOFF: Sheet Import Cell Visual Styles

## Summary
Fix import fidelity: VN Sheet now preserves cell visual styles (background, border, font, alignment) from Excel/FODS files, and hides hidden/veryHidden sheet tabs.

## What was done

### 1. Cell Visual Styles Import (`sheet-adapter.js`)

**New method `_parseCellVisualStyles(xmlText)`** (line ~1016):
- Parses `office:automatic-styles` and `office:styles` for `style:family="table-cell"`
- Extracts: backgroundColor, color, fontWeight, fontStyle, textDecoration, fontFamily, fontSize, textAlign, verticalAlign, whiteSpace (wrap), borders (4 sides)
- Resolves `style:parent-style-name` (1-level inheritance)
- Converts ODF units: `fo:font-size="14pt"` → `18.666px`; `fo:border="0.74pt solid #000"` → CSS shorthand
- Returns `Map<styleName, styleObject>`

**Modified `_cellFromFodsAttributes()`** (line ~1931):
- Accepts new 5th parameter `cellVisualStyles`
- After number format and rotation, applies visual styles from the map to `item.style`

**Modified `parseFods()`** (line ~2400):
- Builds `cellVisualStyles` via `_parseCellVisualStyles(tableXml)`
- Passes it to `_cellFromFodsAttributes` in both DOM branch (line ~2486) and regex branch (line ~2692)

### 2. Visual Styles Serialization (`sheet-adapter.js`)

**Modified `serializeToFods()`**:
- New `visualStyleFor(item)` function generates ODF `<style:style>` elements from CSS style objects
- Converts CSS back to ODF: `backgroundColor` → `fo:background-color`, `fontWeight:bold` → `fo:font-weight="bold"`, etc.
- Combines with rotation styles when both exist
- Writes visual style entries to `<office:automatic-styles>`
- References them via `table:style-name` on cells

### 3. Sheet Visibility Fix (`sheet-grid.js`)

**Modified `_renderSheetTabs()`** (line ~1869):
- Checks `this.sheetVisibilityBySheet[sheetName]` before rendering each tab
- Skips tabs with state "hidden" or "veryhidden"
- Data is preserved (still in `sheets` array), only tab UI is hidden

## Verification

### Unit Tests (8 tests in `tests/unit/sheet-import-cell-styles.test.js`)
- parseFods reads background/color/font/alignment/border from automatic-styles
- Column default-cell-style-name fallback works
- Style-only empty cells within used range get styles
- Sheet visibility correctly parsed (hidden + veryHidden)
- Round-trip serialize → parse preserves visual styles
- Parent-style-name inheritance (1 level)
- Regex branch (no DOMParser) also reads visual styles
- fo:wrap-option maps to whiteSpace

### Real File Verification
File: `E:\VN OFice\file test\DSS_Báo giá Dahua HN-T11.2023.xlsx`
Sheet: "Thông báo Sản phẩm mới"

A3 results (matches Excel 2016 reference):
- backgroundColor: `#558ed5` ✓
- color: `#ffffff` (white) ✓
- fontWeight: `bold` ✓
- textAlign: `center` ✓
- fontFamily: `Times New Roman` ✓
- fontSize: `~16px` (14pt converted) ✓
- verticalAlign: `middle` ✓
- borderLeft/Bottom: `~1px solid #000000` ✓

Sheet visibility:
- "foxz": veryHidden ✓
- "Các mã điều chỉnh giá": hidden ✓

### Test Results
- `node scripts/check-syntax.js`: 92/92 PASS
- `node tests/run-tests.js`: 1608/1608 PASS

## Known Gaps (not in this task)
- Rich text (multiple colors in one cell) — FODS has `<text:span>` but current parser joins all text
- Conditional formatting visual styles — handled separately by existing CF system
- Very complex multi-level style inheritance — only 1 level resolved
- Pattern fills (hatching) — not mapped
