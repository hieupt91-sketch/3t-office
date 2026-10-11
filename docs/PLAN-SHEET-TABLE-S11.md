# PLAN — FIX-S11 Sheet Tables

## Objective

Replace the current visual-only “Định dạng thành Bảng” operation with a Sheet table model that supports a selected range, a header option, at least three banded styles, filter buttons, resize-on-adjacent-entry, rename, convert-to-range, and XLSX table-part import/export. Preserve tables opened from existing workbooks across save. Excel COM is read-only for verification.

## Current capability and reuse

- `apps/sheet/cell-styles.js` already presents a table-style gallery and `apps/sheet/cell-style-presets.js` already defines presets.
- `apps/sheet/sheet-grid.js::formatAsTable` currently paints cell styles and records undo, but stores no table identity or structure.
- `adapters/libreoffice/sheet/sheet-adapter.js::_serializeDatabaseRanges` already serializes ODF database ranges; LibreOffice emits named database ranges as XLSX table parts. The anonymous names used for ordinary AutoFilter are intentionally filtered by `ooxml_zip_patch.py::strip_autofilter_table_parts` to prevent invalid tables.
- XLSX open already passes through `sheet_open_payload.py` and `sheet-payload-parser.js`; imported worksheet AutoFilter is attached to the workbook model, but there is no corresponding table-part model yet.
- `adapters/libreoffice/common/ooxml_zip_patch.py` owns XLSX postprocess/overlay hooks. Use the existing LibreOffice conversion and ZIP patch pipeline; do not add dependencies or patch LibreOffice Core.
- The feature belongs to `apps/sheet/**` and the LibreOffice Sheet adapter/OOXML integration. Add its concrete Vietnamese in-app help and VI/EN strings in the existing help/i18n systems.

## Files/modules expected

- Sheet model and interaction: `apps/sheet/sheet-grid.js`, `apps/sheet/cell-styles.js`, `apps/sheet/cell-style-presets.js`, plus focused Sheet dialog/styles modules only if needed.
- Adapter/model serialization: `adapters/libreoffice/sheet/sheet-adapter.js`, `adapters/libreoffice/sheet/sheet-payload-parser.js`, `adapters/libreoffice/sheet/sheet_open_payload.py` as needed.
- XLSX table import/export and conservative source preservation: `adapters/libreoffice/common/ooxml_zip_patch.py` and/or `adapters/libreoffice/sheet/xlsx-native-postprocess.js`, following the existing pipeline.
- User guidance/localization: `platform/help/entries-sheet.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js` (and generated/parallel locale artifacts only if repository convention requires them).
- Focused tests and fixture coverage: new or extended `tests/unit/**`, `tests/test_sheet_*.py` / `tests/test_xlsx_*.py`, and `tests/fixtures/**` where useful. Desktop CDP proof/evidence and a final handoff under `docs/`.

## Dependencies and boundaries

- Reuse LibreOffice Calc database-range behavior through the existing Sheet adapter; retain direct OOXML package patching for metadata LibreOffice cannot round-trip reliably.
- No external dependencies, no UI-to-LibreOffice calls, and no LibreOffice Core changes.
- UI interactions must use the app model/command path; the app remains offline-capable.
- Respect Sheet, Adapter, Platform/help ownership boundaries. All changed source remains in Sheet, adapter, and shared help/i18n areas.

## Risks and mitigations

- **Round-trip preservation:** LibreOffice can synthesize table parts for AutoFilter database ranges, while anonymous names must continue to be stripped. Distinguish true tables from ordinary filters by explicit stable table metadata/name and preserve table IDs, relationships, content types, and style metadata without changing non-table saves.
- **Untouched workbook fidelity:** For workbooks without tables, exported XLSX must remain byte/structure-equivalent to the existing pipeline. Run the specified batch fixtures with `VNO_AUDIT_MARK_DIRTY=1` and this worktree as `VNO_APP_ROOT`; compare package content against the established baseline where the harness supports it.
- **Existing table fidelity:** Parse names, refs, header/filter flags, styles and table-part relationships. Keep unsupported/external table metadata from the source when edits elsewhere do not touch it; fail safely rather than silently dropping table definitions.
- **Model edits:** Range edits and adjacent data entry must update only the owning table; avoid overlapping/invalid ranges and keep undo/redo and multiple sheets coherent.
- **Header edge cases:** Empty/duplicate headers, header-only or one-column ranges, sheet names with spaces, table-name collisions, and ranges near worksheet bounds need validation and OOXML-focused tests.
- **UI accessibility/localization:** The create dialog and table actions must be keyboard-usable, report validation errors, and have complete concrete Vietnamese help plus VI/EN labels.

## Incremental implementation and commit plan

Each completed step gets one commit, after focused checks for that step:

1. Commit this plan before source changes.
2. Add the structured table model, creation dialog (selected range/header option), styling/filter affordance, validation, rename and convert-to-range actions; keep undo/redo coherent.
3. Add model serialization/import attachment and XLSX table parts through the existing Calc database-range and OOXML patch pipeline; preserve source tables on open/save and keep normal AutoFilter handling separate.
4. Add resize behavior, focused unit/round-trip tests, and a real-table fixture or LAN workbook fixture if available.
5. Add localized in-app guidance and VI/EN strings, then desktop CDP visual/keyboard proof and Excel COM read-only verification.
6. Run required batch compatibility cases and full test commands; write the required handoff and commit each finished step.

If implementation evidence shows an architecture conflict, stop at that gate and report the exact conflict before proceeding.

## Test and verification plan

- Focused JS model/dialog tests and Python OOXML tests for create/rename/convert, names/ranges/header/filter/style flags, relationships/content-types, import preservation, malformed/unsupported tables, and no-table AutoFilter behavior.
- Test existing-table XLSX load/save plus app-created XLSX re-opened by Excel COM (one file per run, COM read-only), checking `ListObjects.Count`, `Name`, `Range`, `ShowAutoFilter`, and `TableStyle`.
- Desktop UI verification through real CDP mouse and keyboard input only (no SendKeys); capture screenshots for dialog, table rendering, and actions. Use process-ID-scoped app lifecycle.
- Before reporting, run `npm test`, `python -m unittest discover -s tests`, and the ticket's compatibility batch for XLSX lanes 01, 02, 04, 06, 09, 11, 22, and 26 with `VNO_AUDIT_MARK_DIRTY=1`, `VNO_APP_ROOT` set to this worktree, and the existing junction fixtures.
- Report PASS/FAIL/NOT RUN/BLOCKED truthfully and retain exact command output summaries in handoff.

## Rollback

Revert only the individual S11 commits in reverse order. The first commit is documentation-only; no data migration is introduced. If a postprocess regression appears, remove/disable only the S11-specific table overlay while retaining existing AutoFilter handling, then rerun the no-table compatibility batch before proceeding.
