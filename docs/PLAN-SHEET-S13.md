# PLAN-SHEET-S13 — Persist Sheet state and refreshed Pivot data in XLSX

## Objective

Fix the eight XLSX save defects documented by `docs/tickets-0710/FIX-S13.md`. After each action, Excel COM opened read-only must report the user's intended state/value. A workbook saved without changing a setting must retain its prior view state; a new workbook must keep the current defaults. No UI feature or document content is sent outside the local application.

## Current capability

- `apps/sheet/sheet-grid.js` already owns gridlines, headings, formula visibility, workbook view, zoom, print area, indentation, and Pivot refresh state.
- `adapters/libreoffice/common/ooxml_zip_patch.py::postprocess_sheet_xlsx` patches XLSX after LibreOffice converts the app's FODS. It already maps sheet names to workbook parts and contains narrow OOXML helpers, but only restores zoom from the original workbook and has no explicit current view-state input.
- `main.py::_apply_native_export_postprocess` has both the generated FODS and original XLSX at save time, making the Sheet adapter/postprocessor the right boundary. UI must not call LibreOffice internals.
- Pivot refresh currently updates visible cells via `SheetGrid`; source handoff evidence indicates saved XLSX still carries stale cached summary rows / Pivot cache data.
- No package or framework change is needed. No LibreOffice Core patch is planned.

## Implementation plan and likely files

1. Carry current per-workbook and per-sheet view state in the existing FODS save payload using VN-owned metadata, then parse that metadata in the local XLSX postprocessor. Avoid defaults being treated as explicit changes: preserve source values when state was not changed; use existing defaults for new files.
2. Patch the relevant OOXML parts: worksheet `sheetView` (`showGridLines`, `showRowColHeaders`, `showFormulas`, `view`, `zoomScale`, `zoomScaleNormal`), workbook view (`showFormulaBar`), and worksheet print metadata / defined names for explicit Print_Area removal. Keep current package namespaces, relationships, and unrelated attributes intact.
3. Fix indentation persistence at the existing Sheet XLSX/FODS export boundary so an explicit lower indent is not replaced by source style restoration. Preserve untouched styles.
4. Trace the Pivot refresh and XLSX save route. Ensure refreshed values replace stale displayed/cache rows on export while preserving PivotTable structure/configuration where possible; if OOXML cache refresh flags are the correct compatible route, use them rather than synthesizing a different Pivot definition.
5. Add focused regression coverage for changed and untouched source state, including new workbook defaults, all eight cases, and existing postprocess behavior. Update the Sheet button matrix only after live verification.

## Dependencies

- Existing LibreOffice conversion pipeline and standard Python `zipfile`/XML utilities only.
- Excel COM read-only automation and desktop CDP harness already present in this worktree; no external dependency.
- Each completed, independently reviewable plan/implementation/test/documentation item is committed immediately as requested.

## Risks and mitigations

- Source-XLSX preservation can overwrite newly requested states. Apply explicit user state after source restoration and distinguish absent metadata from explicit default values.
- OOXML element ordering and attributes can make Excel repair a workbook. Preserve existing tags and update only targeted attributes/defined names; test against the ticket's real batch.
- A cleared Print_Area is an explicit removal, not missing metadata. Represent the difference unambiguously.
- Pivot cache and visible summary can disagree. Verify both Excel PivotTable presence/configuration and refreshed displayed values, and do not claim a full refresh fix if only one is updated.
- Indent repair can affect shared style records. Clone/update narrowly and confirm unaffected styles retain their original values.
- Excel COM and CDP tests need the isolated profile `E:\VNOffice-profiles\codex-fs13`; keep automation read-only on Excel and use real mouse/keyboard CDP actions for the UI.

## Test plan

- Focused unit tests for each OOXML state transformation and preservation of untouched values.
- Required worktree checks from the ticket: `npm test`; `python -m unittest discover -s tests`; XLSX regression batch lan01, lan02, lan04, lan06, lan09, lan11, lan22, lan26; UTF-8/BOM scan.
- Desktop UI verification through real mouse and keyboard input over CDP, followed by Excel COM read-only checks for cases 1–8.
- Regenerate `docs/SHEET-BUTTON-MATRIX-1011.md` with `scripts/audit-0610/gen_sheet_button_matrix.py` after measured results.
- Report each command's actual result; do not call unrun work PASS.

## Rollback

Revert the narrowly scoped S13 commits in reverse order. No source workbook fixtures are overwritten; generated probes and profile data remain outside the repository. The plan commit can be reverted independently.
