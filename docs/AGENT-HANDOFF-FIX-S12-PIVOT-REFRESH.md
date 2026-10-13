# Agent Handoff
TASK: FIX-S12 — refresh imported Sheet Pivot Table
AGENT/ROLE: Sheet audit / handoff to Adapter owner
BRANCH: `audit/sheet-s12-codex`
WORKTREE: `E:\VNOffice-codex-fs12`
OBJECTIVE: Refresh a Pivot Table imported from XLSX so the grouped summary reflects updated source cells without duplicating stale rows.
FINDINGS:
- Created a Pivot through Sheet UI from A1:C6. Excel COM ReadOnly confirmed `Sheet1 (2).PivotTables.Count=1` and a summary by name/SUM amount.
- Reopened that XLSX in Sheet; changed source `Sheet1!C2` from 1234.5 to 2222 through CDP, then clicked Refresh Pivot.
- Saved XLSX contains `Sheet1!C2=2222`, but Excel COM reads stale `Sheet1 (2)!B2=1234.5`, repeated detail rows for Trần Thị B and Phạm Thị D, and stale total 20615.1.
IMPLEMENTATION SUMMARY: No product code changed; this is an adapter/export/import handoff based on a reproducible round trip.
FILES CHANGED: Audit scripts, S12 matrix/results/evidence, this handoff.
COMMANDS RUN: `node --experimental-websocket scripts/audit-0610/word_parallel/app-ops-sheet.desktop.mjs` with `OPS=pivotTable`, then `OPS=pivotRefresh` and `VNO_AUDIT_TEMPLATE=E:\VNOffice-profiles\codex-fs12\app_S12_pivotTable.xlsx`; Excel COM ReadOnly through `scripts/audit-0610/word_parallel/excel-read.ps1` on each XLSX separately.
BUILD RESULT: NOT RUN; no product code changed.
TEST RESULTS: PASS — initial Pivot Table is present as an Excel PivotTable. FAIL — after changing source and refreshing, Excel output remains stale and duplicated.
KNOWN FAILURES: `sheet.data.pivotRefresh` does not yield an updated summary on XLSX round trip.
RISKS: Do not rebuild or overwrite the source sheet while refreshing; retain source range, row/column/value field configuration, and a single summary result.
DEPENDENCIES/BLOCKERS: Adapter owner to inspect Pivot import, grid `sheetsData` synchronization, and save/export serialization. Rerun with a changed source value and verify PivotTable cache plus displayed results.
CORE PATCH ID (if any): None.
NEXT ACTION: Fix and test Pivot refresh in the adapter layer; rerun this CDP + Excel COM ReadOnly probe and update the S12 matrix only after values and PivotTable structure agree.
