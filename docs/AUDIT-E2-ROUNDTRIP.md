# E2: XLSX save and reopen audit

**Worktree:** `fix/excel-e2-codex`

**Oracle:** local Excel 2016 COM, opened read-only, one workbook per run.

**Desktop profile:** `E:\VNOffice-profiles\codex-fe2`; desktop interaction uses CDP.

## Results

| Input | Required batch outcome | Output |
|---|---|---|
| LAN01 | FAIL at load, 912.7 s | none |
| LAN02 | FAIL at load, 912.3 s | none |
| LAN04 | FAIL at load, 912.9 s | none |
| LAN06 | FAIL at load, 913.4 s | none |
| LAN09 | FAIL at load, 913.5 s | none |
| LAN11 | FAIL at load, 914.3 s | none |
| LAN22 | FAIL at load, 913.6 s | none |
| LAN26 | FAIL at load, 913.1 s | none |

For every batch item, `adapter.sourceFilePath` never matched the requested workbook and no XLSX output was produced. LAN01 remained at quick-view progress 28% with an empty model; LAN02 is only 63 KB, so file size alone does not account for the stall. The eight-file batch exited 1. Its local diagnostic JSON files are under ignored `_batch_document_audit/` and are not committed.

The rollback probe launched a copy of LAN02 with `VNO_OPEN_VIEWFIRST=0`, used CDP to sample the desktop state, and waited five minutes. The app stayed on an empty sheet (no source path, zero cells, no quick-view overlay). No mouse-driven edit, save, or reopen could proceed. The original LAN02 was not changed.

## Oracle and required gates

- `excel_dump.ps1` opened original LAN02 read-only in Excel COM and wrote a 6.4 MB JSON dump. No VN Sheet output exists to compare against it. The sample-home smoke check also passed (`ReadOnly=true`, one sheet, 84 captured cells). LAN01 dump was stopped because its used range is about 2.7 million cells.
- `npm test`: PASS, 3119/3119.
- `python -m unittest discover -s tests`: PASS, 912 tests in 646.305 s; two unclosed-stream `ResourceWarning`s.
- Eight-file XLSX batch: FAIL, all eight at load, no outputs.
- The 28-file `sheet_formulas_vs_cache` run is INVALID for acceptance: its wait observed quick-view before the full model attached. Do not use its low raw scores as a comparison; the required 0.9.9 floor is NOT RUN validly.
- Aggregate feature workbook: prepared locally, but the desktop did not load a full model; no saved output or comparison is accepted.

## Changes and rollback

- Plan committed before implementation in `docs/PLAN-E2-XLSX-ROUNDTRIP.md`.
- Added `scripts/audit-0610/excel_dump.ps1`, a read-only COM dumper with ownership tracking that only closes its own Excel process.
- No application XLSX behavior changed: no valid saved output was available to reproduce a fidelity deviation. Audit-only changes can be reverted by reverting their isolated commits; there is no feature flag or application behavior change to roll back.

## Blocking evidence and next action

The task is blocked at desktop open/full-model load, before serialization. Resolve why a workbook launch leaves the Sheet app empty or at quick-view progress, then repeat CDP mouse/keyboard save and reopen, Excel COM source/output comparisons for LAN01–LAN28 plus the feature workbook, fix reproduced mismatches, and rerun all required gates including a valid 28-file formula/cache run at or above the 0.9.9 baseline. No fidelity fix or PASS claim is made in this audit.
