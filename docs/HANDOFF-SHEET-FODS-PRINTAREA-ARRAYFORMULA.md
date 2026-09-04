# Agent Handoff

TASK: Persist Sheet Print Area and array-formula metadata through real FODS/XLSX round-trips
AGENT/ROLE: Codex / Sheet integration
BRANCH: `fix/sheet-fods-printarea-arrayformula`
WORKTREE: `E:\VNOffice-codex-fods-printarea-array`
OBJECTIVE: Complete the two remaining Phase 3 metadata items by serializing/parsing standard ODF metadata and verifying it survives LibreOffice FODS → XLSX → FODS conversion.

FINDINGS:
- A workbook created in real LibreOffice Calc through UNO, with sheet `Báo cáo quý` and Print Area `A1:F20`, saved as FODS produced `table:print-ranges="'Báo cáo quý'.A1:'Báo cáo quý'.F20"` on `<table:table>` and an empty `<table:named-expressions/>`. It did not emit `_xlnm.Print_Area` in FODS. The implementation follows this observed LibreOffice ODF representation; LibreOffice maps it to/from the OOXML sheet-scoped defined name during XLSX conversion.
- LibreOffice may normalize Print Area addresses with quoted sheet names and optional `$`; parsing extracts the first two cell references and restores VN state as `A1:F20`.
- A real Calc array formula entered through UNO's array-formula API (equivalent document state to Ctrl+Shift+Enter) emitted `table:number-matrix-columns-spanned` and `table:number-matrix-rows-spanned` together with `table:formula` only on the top-left cell. Other cells contained cached results without repeated formula metadata.
- Both metadata types survived the installed LibreOffice's real FODS → XLSX → FODS conversion. No LibreOffice/OOXML limitation was encountered for these cases.

IMPLEMENTATION SUMMARY:
- `serializeToFods()` writes a sheet's Print Area as standard `table:print-ranges`; `parseFods()` supports both DOMParser and regex fallback paths; `loadFromFods()` restores `printAreaBySheet` for every sheet.
- Array-formula serialization detects the top-left cell from `arrayRange`, emits standard matrix row/column spans and emits the formula only on that anchor cell.
- Array-formula parsing records matrix anchors and expands the formula, `isArrayFormula`, and canonical `arrayRange` back over the complete in-memory region in both parser paths. Cached values from LibreOffice remain attached to their cells.

FILES CHANGED:
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `tests/unit/sheet-comments-printarea.test.js`
- `tests/unit/sheet-array-formulas.test.js`
- `tests/live/sheet-fods-printarea-real-conversion.mjs`
- `tests/live/sheet-fods-arrayformula-real-conversion.mjs`
- `docs/HANDOFF-SHEET-FODS-PRINTAREA-ARRAYFORMULA.md`

COMMANDS RUN:
- Real Calc UNO probe: create/set Print Area and Save As FODS, then inspect XML.
- Real Calc UNO probe: create array formula and Save As FODS, then inspect XML.
- `node tests/live/sheet-fods-printarea-real-conversion.mjs`
- `node tests/live/sheet-fods-arrayformula-real-conversion.mjs`
- `node tests/run-tests.js` after Task 1
- `node tests/run-tests.js` after Task 2
- Targeted unit runners for Print Area and array formula
- `git diff --check`

BUILD RESULT: NOT RUN — the repository validation requested for this scope is the Node test suite; no separate build command was requested.
TEST RESULTS: PASS — after Task 1, `node tests/run-tests.js` completed in 11.74 seconds with 574/574 PASS. PASS — after Task 2, it completed in 11.54 seconds with 575/575 PASS. PASS — Print Area live conversion preserved `A1:F20`. PASS — array-formula live conversion preserved the `1 x 5` matrix, formula, `isArrayFormula`, and `arrayRange` on all five restored cells.
KNOWN FAILURES: None at handoff time.
RISKS: VN Sheet currently models one contiguous A1 range per sheet for Print Area; multiple disjoint ODF print ranges are outside the existing state shape. Array formulas are restored from rectangular matrix spans and retain the existing engine's documented limitations for dynamic arrays and complex array expressions.
DEPENDENCIES/BLOCKERS: LibreOffice at `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe`; no new package dependency and no blocker.
CORE PATCH ID (if any): N/A — no LibreOffice Core/upstream changes.
NEXT ACTION: Claude review commits and test evidence; do not merge automatically.

## Commits

- `5d177e4` — Print Area through standard ODF `table:print-ranges`
- `805274b` — Array formulas through standard ODF matrix spans
