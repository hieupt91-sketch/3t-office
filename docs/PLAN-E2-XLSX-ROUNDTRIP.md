# E2 PLAN: XLSX round-trip fidelity

## Objective
Compare original XLSX content with VN Sheet output after reopen, using a read-only Excel 2016 COM dump as the local oracle. Cover values, formulas, cell formatting, dimensions, sheet visibility/freeze/filter, names, validation, conditional formatting, tables, charts, images, notes, and print settings where COM exposes them. Record unsupported or structurally different areas explicitly.

## Current capability
The repo provides formula/cache comparison and UI-specific CDP checks, but no comprehensive Excel COM JSON dump. VN Sheet XLSX import/export paths are in `apps/sheet` and shared platform XLSX modules; inspect them before modifying behavior.

## Files/modules
- `scripts/audit-0610/excel_dump.ps1`: read-only Excel COM extraction and JSON output.
- `docs/audit-e2-roundtrip.md`: corpus coverage, observed mismatches, and explanations.
- Only fix app/platform XLSX code when a reproducible round-trip mismatch is found; preserve existing supported behavior for files not exercising the fix.

## Dependency
No new external dependency. Excel COM and PowerShell are local Windows audit tooling only.

## Risk
COM object-model gaps and Excel recalculation can produce false mismatches. Excel must be opened read-only, one workbook at a time, and only the PID created by the audit may be terminated. Sample files remain local. Do not save through Excel.

## Test plan
- Use the dedicated desktop profile and CDP mouse/keyboard input to open, save, close, and reopen in VN Sheet.
- Compare source/output with `excel_dump.ps1` for LAN01–LAN28 and a feature workbook.
- Run the requested npm, Python unittest, eight-file batch XLSX, and 28-file formula/cache gates; compare cache scores to the 0.9.9 baseline.
- Scan changed text/code for UTF-8 BOM and mojibake.

## Rollback
The audit script and report can be reverted independently. Any behavior fix must be guarded by an explicit opt-in `VNO_XLSX_E2_ROUNDTRIP` flag until validated; rollback is to unset the flag/revert that isolated commit. Do not alter tests, fixtures, or expected outputs to mask discrepancies.
