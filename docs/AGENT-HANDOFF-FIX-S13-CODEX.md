# Agent Handoff

TASK: `docs/tickets-0710/FIX-S13.md`
AGENT/ROLE: Codex — Sheet save pipeline / verification
BRANCH: `fix/sheet-s13-codex`
WORKTREE: `E:\VNOffice-codex-fs13`
OBJECTIVE: Persist Sheet view and print state, indentation changes, and refreshed Pivot results in XLSX; preserve untouched source view state.

## FINDINGS

- LibreOffice FODS→XLSX plus `ooxml_zip_patch.py` is the existing save path; no Core patch or dependency was needed.
- The app already tracked these states. The save path needed explicit changed-state metadata and narrowly scoped OOXML updates.
- Untouched source `sheetView`/`workbookView` attributes must survive a content-only save.

## IMPLEMENTATION SUMMARY

- Fixed all FIX-S13 items: indent decrease, print-area clear, gridlines/headings, show-formulas, formula bar, page views, zoom, and Pivot refresh.
- Added focused Python/JS regression coverage and updated the generated Sheet button matrix with Excel COM evidence.
- Preserved source view values on a live content edit: Excel COM read-only reported gridlines/headings `0`, zoom `85`, `View=2`, `DisplayFormulas=1`, and `ActiveWindow.DisplayFormulaBar=0`.
- UI actions used real CDP mouse/keyboard input. Excel validation opened output files read-only. `Application.DisplayFormulaBar` is app-global; the per-window value is `ActiveWindow.DisplayFormulaBar`.

## FILES CHANGED

- `apps/sheet/sheet-grid.js`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `tests/test_sheet_zoom_roundtrip.py`
- `tests/unit/sheet-pivot-save-fods.test.js`
- `tests/unit/sheet-pivot-table.test.js`
- `scripts/audit-0610/gen_sheet_button_matrix.py`
- `docs/PLAN-SHEET-S13.md`
- `docs/SHEET-BUTTON-MATRIX-1011.md`
- `docs/AGENT-HANDOFF-FIX-S13-CODEX.md`

## COMMANDS RUN

- `npm test` — **PASS**, 3,087/3,087.
- `python -m unittest discover -s tests` — **FAIL**, 880 run; one unrelated updater temp-directory cleanup error (`WinError 32`, detached helper still held the path). The affected test rerun alone — **PASS**.
- Required XLSX batch (`lan01`, `lan02`, `lan04`, `lan06`, `lan09`, `lan11`, `lan22`, `lan26`) — **PASS**, every file saved, `diffs=0`, lint clean, Excel PASS.
- CDP + Excel COM read-only for all eight FIX-S13 cases — **PASS**; includes `View=2/3`, zoom `110/90`, formula display, formula bar, print-area clear, indent `0`, and refreshed Pivot total `2222` without repeated rows.
- `python -X utf8 scripts/audit-0610/gen_sheet_button_matrix.py docs/ribbon-scan-sheet-1011.json docs/SHEET-BUTTON-MATRIX-1011.md` — **PASS**, 138 commands; 72 match, 66 unchecked, no known-gap entries.
- UTF-8/no-BOM scan of changed files and `git diff --check` — **PASS**.
- Build — **NOT RUN**; not required by the ticket.

## BUILD RESULT

NOT RUN.

## TEST RESULTS

- Focused S13 Python and JS regression tests — **PASS**.
- Full npm suite — **PASS**, 3,087/3,087.
- Full Python suite — **FAIL**, only the updater cleanup race above; isolated retry passed.
- Required eight-workbook batch and live Excel COM checks — **PASS**.

## KNOWN FAILURES

- Full Python discovery has one unrelated, intermittent cleanup error in `tests/test_updater.py::UpdaterTests::test_detached_helper_process_runs_from_a_path_with_spaces`. Its updater assertions reported success, and the isolated rerun passed.

## RISKS

- The full Python discovery result is not a clean pass. No S13 regression was observed in focused or batch verification.
- Excel exposes a global `Application.DisplayFormulaBar` value separately from each workbook window; the saved per-window state was verified through `ActiveWindow.DisplayFormulaBar`.

## DEPENDENCIES/BLOCKERS

None.

CORE PATCH ID (if any): None.

## NEXT ACTION

Review commits on `fix/sheet-s13-codex`. If the updater cleanup race recurs, fix it in its owning updater task.

## COMMITS

- `252cd83c` plan gate.
- `aed11c98`–`330cb09e` S13 implementation and regression fixes.
- `332c3b3b` generated button-matrix evidence.
- Handoff document committed separately after creation.
