# Agent Handoff

TASK: FIX-S12 — decrease indentation XLSX round-trip defect  
AGENT/ROLE: Sheet audit / handoff to Adapter owner  
BRANCH: `audit/sheet-s12-codex`  
WORKTREE: `E:\VNOffice-codex-fs12`  
OBJECTIVE: Persist a decreased cell indent in the app-saved XLSX.

## FINDINGS

CDP bấm Tăng thụt lề trên B2, app saves XLSX, and Excel COM ReadOnly confirms `IndentLevel=1`. The app reopens that XLSX; CDP bấm Giảm thụt lề, and the app model reports `style.indentLevel=0`. After save, Excel COM ReadOnly still reports `IndentLevel=1`. The S12 matrix records `sheet.cell.indentDecrease` as **LỆCH ĐÃ BIẾT**.

Evidence:

- `docs/tickets-0710/evidence/s12/fix-s12-indentDecrease.png`
- Profile log: `E:\VNOffice-profiles\codex-fs12\s12-indent-decrease.log`
- Excel COM read-only log: `E:\VNOffice-profiles\codex-fs12\excel-indent-decrease.log`
- Input XLSX: `E:\VNOffice-profiles\codex-fs12\app_S12_indentIncrease.xlsx`
- Output XLSX: `E:\VNOffice-profiles\codex-fs12\app_S12_indentDecrease.xlsx`

## IMPLEMENTATION SUMMARY

No adapter/export code changed in this handoff. The Sheet model state changes to zero; the saved XLSX retains indent level one.

## FILES CHANGED

Handoff, results, and S12 audit evidence only. Product fix remains with Adapter owner.

## COMMANDS RUN

- CDP desktop app: `OPS=indentIncrease`, then `OPS=indentDecrease` with the increase output as `VNO_AUDIT_TEMPLATE`.
- Excel COM read-only: `scripts/audit-0610/word_parallel/excel-read.ps1` opened each XLSX separately.

## BUILD RESULT

NOT RUN for this adapter handoff.

## TEST RESULTS

PASS: app model changed `indentLevel` to zero.  
FAIL: Excel COM read-only still reports `IndentLevel=1` after app save.

## KNOWN FAILURES

The exported workbook retains the source cell indent after Sheet clears it in the model.

## RISKS

OOXML style deduplication or source-style preservation may restore the original indent. Confirm other unchanged styles still round-trip.

## DEPENDENCIES/BLOCKERS

Adapter owner to inspect `adapters/libreoffice/sheet/**` FODS serialization and XLSX preservation/post-processing, add a regression test for decreasing indent from one to zero, and verify untouched style round-trip remains stable.

CORE PATCH ID: None.

NEXT ACTION: Adapter owner implements and tests the export fix; rerun CDP increase→decrease and Excel COM read-only on each output. Move the S12 matrix item to KHỚP only when the final XLSX reads `IndentLevel=0`.
