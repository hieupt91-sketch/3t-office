# Agent Handoff

TASK: Persist Sheet number formats, comments, and named ranges through real XLSX files using standard ODF metadata
AGENT/ROLE: Codex / Sheet integration
BRANCH: `fix/sheet-fods-metadata-persistence`
WORKTREE: `E:\VNOffice-codex-fods-metadata`
OBJECTIVE: Replace reliance on `vno:*` cell attributes with ODF structures understood by LibreOffice, and verify FODS → XLSX → FODS with the installed `soffice.exe`.

FINDINGS:
- LibreOffice retains number formats when each cell uses `table:style-name`, the table-cell style uses `style:data-style-name`, and the target is a standard `number:*style`.
- LibreOffice may move the first cell's style to `table:default-cell-style-name` on `table:table-column`; the parser now resolves that form.
- Accounting survived when represented with `number:currency-style` plus `number:fill-character`; a plain custom marker is not used.
- Standard `office:annotation` with `dc:creator`, `dc:date`, and `text:p` survives XLSX for populated and empty cells.
- Workbook and sheet scoped `table:named-expressions` both survived. LibreOffice normalizes addresses, so parsing accepts quoted sheet names and abbreviated range endpoints.

IMPLEMENTATION SUMMARY:
- Number-format registry deduplicates workbook formats and emits automatic data styles plus two-layer cell styles. Parser reconstructs the existing `numberFormat` shape for Number, Percentage, Currency, Accounting, Date, Scientific, Text, basic Custom patterns, and mapped negative styles. `vno:number-format` remains only as an in-memory fallback.
- Comments serialize as child annotations and parse without contaminating the cell display value. Comment-only empty cells are retained. `loadFromFods()` restores `commentsBySheet`.
- Named ranges serialize at workbook or table scope, parse back to the existing range shape, and are restored by `loadFromFods()`. Imported IDs are regenerated deterministically because ODF named ranges have no VN internal ID field.

FILES CHANGED:
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `tests/unit/sheet-format-cells.test.js`
- `tests/unit/sheet-comments-printarea.test.js`
- `tests/unit/sheet-named-ranges-text-date.test.js`
- `tests/live/sheet-fods-number-format-real-conversion.mjs`
- `tests/live/sheet-fods-comments-real-conversion.mjs`
- `tests/live/sheet-fods-named-ranges-real-conversion.mjs`
- `docs/HANDOFF-SHEET-FODS-METADATA-PERSISTENCE.md`

COMMANDS RUN:
- `node tests/run-tests.js`
- `node tests/live/sheet-fods-number-format-real-conversion.mjs`
- `node tests/live/sheet-fods-comments-real-conversion.mjs`
- `node tests/live/sheet-fods-named-ranges-real-conversion.mjs`
- `git diff --check`

BUILD RESULT: NOT RUN — repository validation for this scope is the Node test suite; no separate build was requested.
TEST RESULTS: PASS — `node tests/run-tests.js` completed in about 13 seconds with 513/513 PASS. PASS — number-format live conversion preserved 9 cases. PASS — comment live conversion preserved comments on populated and empty cells. PASS — named-range live conversion preserved workbook and sheet scope. PASS — existing multisheet real-conversion regression preserved all 3 sheets.
KNOWN FAILURES: None at handoff time.
RISKS: Custom number formats are reconstructed as a semantically equivalent basic pattern after LibreOffice normalization; byte-for-byte pattern spelling is not promised. Currency negative-color/parenthesis combinations beyond the covered standard number mapping should receive additional cases if the UI exposes them together.
DEPENDENCIES/BLOCKERS: LibreOffice at `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe`; no new package dependency.
CORE PATCH ID (if any): N/A — no LibreOffice Core/upstream changes.
NEXT ACTION: Claude review the four commits and inspect final test evidence; do not merge automatically.

## Commits

- `ae49079` — Number formats through standard ODF styles
- `f8b85a7` — Comments through ODF annotations
- `860b7e1` — Named ranges through ODF named expressions
- `ac079d8` — Advanced/custom/negative number-format semantics
