# E2: XLSX save and reopen audit

**Worktree:** `fix/excel-e2-codex`  
**Oracle:** local Excel 2016 COM, workbook opened read-only, one workbook per run.  
**Desktop path:** VN Sheet launched from this worktree with the dedicated E2 profile; CDP is used for desktop interaction.

## Current results

| Input | Desktop round-trip | Result |
|---|---|---|
| LAN01 | CDP roundtrip runner, dirty save path | FAIL at load after 912.7 s; `adapter.sourceFilePath` never matched source; no output XLSX |
| LAN02 | CDP roundtrip runner, dirty save path | FAIL at load after 912.3 s; `adapter.sourceFilePath` never matched source; no output XLSX |
| LAN04 | CDP roundtrip runner, dirty save path | FAIL at load after 912.9 s; `adapter.sourceFilePath` never matched source; no output XLSX |
| LAN06, LAN09, LAN11, LAN22, LAN26 | Pending in the required batch | — |

The three failures remained in quick view at 28%, with no full grid model attached. LAN01 contains a sheet with about 2.7 million stored cells; LAN02 is 63 KB, so file size alone does not explain the shared load timeout. The runner wrote per-file `.cdp-audit.json` diagnostics under the ignored `_batch_document_audit` directory. These workbook files and diagnostics are local audit data and are not committed.

## Tool and gates

- `scripts/audit-0610/excel_dump.ps1`: Excel COM read-only JSON dump; verified on the small local `test_sheet_home.xlsx` (one sheet, 84 captured cells, `ReadOnly=true`). The LAN01 dump was stopped because its used range includes 2.7 million stored cells and the first per-cell COM implementation did not finish in practical time. Comprehensive 28-file source/output comparison is pending.
- `npm test`: PASS, 3119/3119.
- `python -m unittest discover -s tests`: PASS, 912 tests in 646.305 s; two unclosed-stream `ResourceWarning`s were emitted.
- Eight-file batch XLSX audit: running; first three files failed before serialization, so no Excel comparison or product save/reopen conclusion is available yet.
- 28-file formula/cache script was run, but its startup wait observed quick-view state before the full Sheet model attached. Its raw low match scores are not accepted as a valid Excel comparison or a PASS. Re-run after full-load handling is resolved.

## Code changes and rollback

- Added the pre-change plan in `docs/PLAN-E2-XLSX-ROUNDTRIP.md`.
- Added the read-only COM dumper and metadata coverage. No application XLSX save/load implementation has been changed because no valid round-trip output has been produced to compare.
- Audit tool rollback: revert the isolated audit-script commits. No feature flag or application behavior change has been introduced.

## Next actions

1. Finish LAN06, LAN09, LAN11, LAN22, and LAN26 batch runs and retain their per-file load/save diagnostics.
2. Resolve or isolate the full-load timeout without changing test fixtures or expected values; then use CDP keyboard/mouse to save, reopen in VN Sheet, and compare original/output JSON through Excel COM.
3. Compare all 28 LAN inputs and outputs plus an aggregate feature workbook; document and fix each reproducible mismatch, then rerun every required gate and record the 0.9.9 per-file formula/cache floor.
