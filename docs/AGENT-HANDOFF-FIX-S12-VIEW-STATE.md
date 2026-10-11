# Agent Handoff

TASK: FIX-S12 — persist worksheet view toggles in XLSX  
AGENT/ROLE: Sheet audit / handoff to Adapter owner  
BRANCH: `audit/sheet-s12-codex`  
WORKTREE: `E:\VNOffice-codex-fs12`  
OBJECTIVE: Persist Sheet ribbon view state for gridlines, row/column headings, zoom, formula bar, and worksheet view mode and formula-display state in saved XLSX.

## FINDINGS

Two separate desktop CDP probes confirm the UI/model toggles work:

- `sheet.view.gridlines`: app model `gridlinesVisible=false`; Excel COM ReadOnly still reports `DisplayGridlines=1`.
- `sheet.view.headings`: app model `headingsVisible=false`; Excel COM ReadOnly still reports `DisplayHeadings=1`.

Both buttons are **LỆCH ĐÃ BIẾT** in the S12 matrix.

Evidence:

- `docs/tickets-0710/evidence/s12/fix-s12-gridlines.png`
- `docs/tickets-0710/evidence/s12/fix-s12-headings.png`
- `docs/tickets-0710/evidence/s12/fix-s12-zoomIn.png`
- `docs/tickets-0710/evidence/s12/fix-s12-zoomOut.png`
- `docs/tickets-0710/evidence/s12/fix-s12-formulaBar.png`
- `docs/tickets-0710/evidence/s12/fix-s12-pageBreakPreview.png`
- `docs/tickets-0710/evidence/s12/fix-s12-pageLayoutView.png`
- `docs/tickets-0710/evidence/s12/fix-s12-showFormulas.png`
- CDP logs: `E:\VNOffice-profiles\codex-fs12\s12-gridlines-retry.log`, `s12-headings-retry.log`
- Excel COM read-only logs: `E:\VNOffice-profiles\codex-fs12\excel-gridlines-retry.log`, `excel-headings-retry.log`
- Outputs: `E:\VNOffice-profiles\codex-fs12\app_S12retry_gridlines.xlsx`, `app_S12retry_headings.xlsx`

## IMPLEMENTATION SUMMARY

No adapter/export code changed. App view state changes, but saved XLSX retains default display flags.

## FILES CHANGED

Handoff and S12 audit evidence/results only. Product fix remains with Adapter owner.

## COMMANDS RUN

- Desktop CDP audit with `OPS=gridlines` and `OPS=headings` separately.
- Excel COM opened each output read-only with `scripts/audit-0610/word_parallel/excel-read.ps1`.

## BUILD RESULT

NOT RUN for this adapter handoff.

## TEST RESULTS

PASS: app model and visual state toggle off in each probe.  
FAIL: Excel COM read-only retains both flags as 1 in output XLSX.

## KNOWN FAILURES

The XLSX `sheetView` does not reflect the app's hidden gridlines/headings state the changed zoom, or hidden formula bar. Excel reports default zoom 100%, `DisplayFormulaBar=1`, and `DisplayFormulas=0`.

## RISKS

Persisting view state may require OOXML workbook-view metadata outside FODS. Preserve defaults when the user has not changed these settings and verify Excel reopening behavior.

## DEPENDENCIES/BLOCKERS

Adapter owner to inspect Sheet XLSX export and post-processing for `showGridLines` and `showRowColHeaders`, add regression coverage, and confirm untouched workbooks retain current view flags.

CORE PATCH ID: None.

NEXT ACTION: Adapter owner implements and tests view-state export; rerun each CDP toggle and Excel COM read-only comparison. Mark the two buttons KHỚP only when Excel reads both flags as 0.
