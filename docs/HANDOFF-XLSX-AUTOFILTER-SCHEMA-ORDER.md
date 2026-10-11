# Handoff: XLSX AutoFilter Schema Order Fix

## What changed
- `adapters/libreoffice/common/ooxml_zip_patch.py`: added `_insert_worksheet_child_in_schema_order()` helper and CT_Worksheet schema order constant (`_WORKSHEET_CHILD_ORDER`). Rewrote `apply_autofilter_to_worksheet()` to insert `<autoFilter>` at the correct ECMA-376 schema position instead of always before `</worksheet>`.

## Root cause
`apply_autofilter_to_worksheet()` inserted `<autoFilter ref="..."/>` immediately before `</worksheet>`, which placed it after `<pageMargins>`, `<headerFooter>`, `<drawing>` etc. Excel 2016 treats this as a load error because CT_Worksheet child elements have a mandatory schema order.

## Schema order (subset)
```
sheetPr, dimension, sheetViews, sheetFormatPr, cols, sheetData, sheetCalcPr,
sheetProtection, protectedRanges, scenarios, autoFilter, sortState, ...,
mergeCells, ..., conditionalFormatting, dataValidations, ..., pageMargins,
pageSetup, headerFooter, ..., drawing, ..., tableParts, extLst
```

## Files modified
- `adapters/libreoffice/common/ooxml_zip_patch.py` (lines ~636-720)
- `tests/test_sheet_hidden_autofilter.py` (added 7 new tests)

## Tests
- 35/35 Python unit tests pass (`tests/test_sheet_hidden_autofilter.py`)
- 1634/1634 JS tests pass
- 92/92 JS syntax checks pass
- Real soffice round-trip verification: PASS (autoFilter at correct schema position)

## Audit notes
- `apply_freeze_pane_to_sheet_xml`: inserts `<pane>` inside `<sheetView>` (different nesting level, no issue)
- `apply_workbook_protection_lock_structure`: operates on `workbook.xml`, not worksheet XML
- No other worksheet XML child-element insertions found in post-process code

## Rollback
Revert the two file changes.
