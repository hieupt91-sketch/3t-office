# E2: XLSX round-trip audit

**Branch:** `fix/excel-e2-codex`\
**Run date:** 2026-10-13\
**Desktop profile:** `E:\VNOffice-profiles\cdp-fe2`; `TEMP`/`TMP` and `VNO_CDP_LOCALAPPDATA` were redirected to E:.\
**Load mode:** P1b full load (`VNO_OPEN_VIEWFIRST=0`). Batch saves used `VNO_AUDIT_MARK_DIRTY=1`; source matching required normalized `adapter.sourceFilePath` equality and a nonempty sheet model.

## Environment and load result

The previous audit ran while C: had no free space and produced no full model. For this rerun, C: had about 7.49 GB free and E: about 48.7 GB free. All 28 LAN workbooks loaded through the full-model path, were saved, and reopened in VN Sheet: **28/28 reopen checks passed**, with the expected saved path, at least one sheet, and no quick-view overlay. LAN14 reopened with 10 sheets and 1,435,546 cells; LAN25 reopened with 1 sheet and 4,772 cells.

The required eight-file batch (`LAN01, 02, 04, 06, 09, 11, 22, 26`) saved successfully with zero reported cell differences and Excel-open checks passing. The other 20 saved; 18 were reported PASS, LAN14 and LAN25 were reported FAIL for the reasons below. LAN14 saved its XLSX and later reopened, but the batch process timed out during CDP close/evaluation after 1,784.3 seconds (`Runtime.evaluate` timeout). Its FODS was 321,880,153 bytes and XLSX was 7,229,410 bytes. LAN25 saved and reopened, but the comparator reported 9,419 differences.

## Differences and limits

- LAN25 source and output both retain the `productTable` table at A1:Z183, with identical sheet dimensions, values, and formulas. The cell comparator reports table-style formatting as explicit output cell styles: 4,072 font/fill differences and 4,578 border differences are consistent with materializing the source `TableStyleMedium2`. It also reports 910 number-format strings (`#,##0.##0` versus `#,##0.000`). Those formats appear intended to render equivalently, but Excel `DisplayFormat`/`.Text` verification did not complete. Treat these as unresolved formatting differences, not a pass.
- LAN14’s saved workbook reopened fully in VN Sheet. The batch comparison found zero reported content differences; only the CDP close/evaluation timed out. The formula/cache run found four line-ending-only text differences (LF vs CRLF).
- Formula/cache was rerun with `--force`, full P1b, and a fresh result path. It checked 72,837 formulas: 72,707 matched (99.82%) versus the 0.9.9 aggregate baseline 37,118/72,837 (50.96%). The per-file gate **FAILS** because LAN28 is 152/275 (55.27%) versus its 0.9.9 baseline 267/275 (97.09%). The full cell-level JSON remains outside the repository because it contains document values. Sanitized results: [AUDIT-E2-FORMULA-CACHE-2026-10-13.md](AUDIT-E2-FORMULA-CACHE-2026-10-13.md).
- Remaining formula/cache differences: LAN02 has two `_XLL.VND` results where VN Sheet returns text and the source cache is `#NAME?` (likely legacy add-in unavailable when cache was generated); LAN14 has four LF/CRLF differences; LAN19 has one `SUM` result where VN Sheet returns `#VALUE!` but cache is numeric; LAN28 has the VLOOKUP regression above.
- `excel_dump.ps1` was extended for bounded UsedRange overrides and bulk COM extraction. Direct source/output Excel COM dumps were completed for LAN02 and LAN25; a bounded source dump was completed for LAN01. Direct Excel COM source-and-output dumps for all 28 have **not** been completed. The 28-file round-trip comparisons above use the batch XLSX comparator, with Excel-open validation, not 56 direct COM dumps.
- The 34 feature-specific `app_*.xlsx` outputs are individual files under `E:\VNOffice-profiles\codex-fe4`. A combined feature workbook has not yet been round-tripped and compared in this run. An Excel COM attempt to combine them was rejected by Excel (`RPC_E_CALL_REJECTED`) before producing an output file; no source workbook was saved. The exact COM process remained responsive, so it was left running rather than terminating an unverified Excel session.

## Verification

- `npm test`: **PASS**, 3,133/3,133.
- `python -m unittest discover -s tests`: **PASS**, 912 tests in 503.318 s; two unclosed-stream `ResourceWarning`s.
- `node --check scripts/audit-0610/reopen_xlsx_roundtrips.mjs`: **PASS**.
- PowerShell parse check for `excel_dump.ps1`: **PASS**.
- 28-file VN Sheet reopen: **PASS**, 28/28.
- Eight-file required batch: **PASS**, 8/8 saved, zero reported differences.
- Twenty-file remainder: **18 PASS, 2 FAIL** (LAN14 close timeout; LAN25 formatting differences).
- Formula/cache per-file gate: **FAIL**, LAN28 regression.

## Files and rollback

This is audit tooling/reporting only; no application XLSX behavior was changed. The COM dump supports explicit bounded ranges so inflated UsedRange metadata can be narrowed without dumping millions of blank cells. Audit script and report changes can be reverted independently. No sample workbook contents or cell-level formula results are committed.
