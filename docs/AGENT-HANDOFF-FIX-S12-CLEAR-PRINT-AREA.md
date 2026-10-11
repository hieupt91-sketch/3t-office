# Agent Handoff

TASK: FIX-S12 — clear print area round-trip defect  
AGENT/ROLE: Sheet audit / handoff to Adapter owner  
BRANCH: `audit/sheet-s12-codex`  
WORKTREE: `E:\VNOffice-codex-fs12`  
OBJECTIVE: Make Sheet → Bố trí trang → Xóa vùng in persist as an empty Print_Area in the saved XLSX.

## FINDINGS

The desktop app action is confirmed through CDP: starting from an app-saved workbook with Excel `PrintArea='$A$1'`, clicking Xóa vùng in sets `grid.printAreaBySheet.Sheet1` to `null`. The app then saves a separate XLSX. Excel COM opens that output read-only and still reports `PrintArea='$A$1'`. The matrix records `sheet.page.clearPrintArea` as **LỆCH ĐÃ BIẾT**.

Evidence:

- `docs/tickets-0710/evidence/s12/fix-s12-clearArea.png`
- Profile log: `E:\VNOffice-profiles\codex-fs12\s12-clear-area-retry.log`
- Excel COM read-only log: `E:\VNOffice-profiles\codex-fs12\excel-clearArea-retry.log`
- Input fixture: `E:\VNOffice-profiles\codex-fs12\app_S12_printArea.xlsx`
- Output XLSX: `E:\VNOffice-profiles\codex-fs12\app_S12retry_clearArea.xlsx`

## IMPLEMENTATION SUMMARY

No adapter/export code changed in this handoff. The confirmed state transition is correct in `SheetGridController.clearPrintArea`; the saved workbook retains the prior print area.

## FILES CHANGED

Handoff and S12 audit evidence/results only. Product fix remains with the Adapter owner.

## COMMANDS RUN

- CDP app audit: `OPS=printArea`, then `OPS=clearArea` with the first app output as `VNO_AUDIT_TEMPLATE`.
- Excel COM read-only: `scripts/audit-0610/word_parallel/excel-read.ps1` on each output file separately.

## BUILD RESULT

NOT RUN for this adapter handoff.

## TEST RESULTS

PASS: app model cleared the value to null.  
FAIL: Excel COM read-only still reports `$A$1` after app save.

## KNOWN FAILURES

The exported XLSX retains the `_xlnm.Print_Area` / print-ranges value after the app model clears it.

## RISKS

Adapter export or OOXML preservation may be restoring source metadata. Keep the test read-only on Excel and verify both a newly set and a cleared print area.

## DEPENDENCIES/BLOCKERS

Adapter owner to inspect Sheet FODS serialization and XLSX round-trip/preservation paths in `adapters/libreoffice/sheet/**` and related export code. Add or extend a regression test proving that explicit clear removes the stored print area while untouched workbooks preserve it.

CORE PATCH ID: None.

NEXT ACTION: Adapter owner implements the round-trip fix, runs focused Sheet export tests, then re-runs the two-file CDP/Excel COM probe. S12 should move the button to KHỚP only after Excel reads an empty PrintArea.
