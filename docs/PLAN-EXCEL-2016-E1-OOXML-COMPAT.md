# E1 plan addendum: Excel 2016 function name compatibility

## Objective

Make Excel 2016 functions that OOXML classifies as future functions survive the VN Sheet save path and calculate in the installed Excel 2016 build without changing their results or function names as shown to users. The initial confirmed cases are `RANK.EQ(...)` and `FORMULATEXT(...)`; the mapping is sourced from the official MS-XLSX future-function list and restricted to functions marked Excel 2016 in `docs/EXCEL2016-FUNCTION-CATALOG.json`.

## Evidence and current capability

- VN Sheet's formula engine calculates both functions.
- The app-generated XLSX formulas without the OOXML compatibility prefix recalculate to `#NAME?` in installed Excel 16.0.4266.1001.
- A workbook entered and saved through the same desktop CDP path with `_xlfn.RANK.EQ(...)` and `_xlfn.FORMULATEXT(...)` recalculates correctly in Excel COM opened read-only and forced through `CalculateFullRebuild`; Excel reports the canonical formulas without `_xlfn.`.
- The shared ODF serializer is `LibreOfficeSheetAdapter._formulaToOdf` in `adapters/libreoffice/sheet/sheet-adapter.js`; it currently forwards these names without the prefix.

## Proposed files and change

- `adapters/libreoffice/sheet/sheet-adapter.js`: add `_xlfn.` only to serialized ODF function tokens in the supported mapping; leave the app's formula model and displayed formula unchanged. Remove recognized compatibility prefixes when formulas are read back from ODF so the app continues to display canonical names.
- `tests/unit/`: add serializer regression cases proving prefixes apply only to supported function calls, are not duplicated, are omitted when the option is disabled, and are removed on read.
- `docs/EXCEL2016-FUNCTIONS-MATRIX.md`: record the before/after Excel 2016 COM result and the compatibility mapping.

The mapping must distinguish `_xlfn.` future functions from `_xlfn._xlws.` worksheet-only functions according to MS-XLSX. Dynamic-array functions introduced after Excel 2016 must not be included in the Excel 2016 compatibility set.

## Rollout flag

Add a `excel2016FunctionNameCompat` adapter option, defaulting to `true`; `_formulaToOdf` applies the mapping only when this option is enabled. Tests must cover both settings. This keeps the mapping switchable for diagnosis and gives rollback a direct code path in addition to reverting the commit.

## Dependency and risk

- No new dependency; no LibreOffice Core changes.
- The change touches XLSX save output. Risks are formula display/round-trip differences in older consumers and prefix duplication. The mapping is limited to two Excel 2013-or-later function names and preserves their calculation semantics.
- Excel COM remains read-only: VN Sheet creates each workbook, COM opens one workbook at a time with `ReadOnly=$true`, recalculates in memory, reads results, and never saves.

## Test plan

1. Unit-test formula serialization and prefix idempotence.
2. Enter plain `=RANK.EQ(...)` and `=FORMULATEXT(...)` by CDP mouse/keyboard in the desktop app, save through VN Sheet, then open each resulting workbook read-only in Excel 2016 COM and run `CalculateFullRebuild`.
3. Reopen the saved workbook in VN Sheet and verify the formulas and displayed values.
4. Run final gates from `docs/PLAN-EXCEL-2016-NIGHT-1213.md`, including the XLSX batch and 28-file formula/cache comparison.

## Rollback

Revert the serializer compatibility commit. No source workbook, fixture, expected output, or user's Excel workbook is modified by the audit.
