# Agent Handoff

TASK: Resolve the FIX-S16 Sheet adapter export gaps for calculation mode and text boxes.
AGENT/ROLE: Codex / Sheet ribbon audit handoff to Adapter owner
BRANCH: `audit/sheet-s16-codex`
WORKTREE: `E:\VNOffice-codex-fs16`
OBJECTIVE: Persist manual calculation mode to XLSX `calcPr`, export Sheet text boxes as shapes, and preserve resolved-comment state where the supported file model allows it, while keeping the established UI-to-adapter boundary.
FINDINGS: Through CDP UI, `sheet.calc.calculationOptions` changed from automatic to manual, but Excel COM ReadOnly reported `Application.Calculation=-4105`; `xl/workbook.xml` had `<calcPr>` without `calcMode`. The text box command displayed `S16 text box` in the app, but Excel COM ReadOnly reported `Shapes.Count=0` after save. `sheet.review.commentResolve` set `commentsBySheet.Sheet1.C2.resolved=true` and the ribbon showed a checkmark, but Excel COM ReadOnly only saw the legacy note; `xl/comments1.xml` had no resolved state. Evidence: `docs/tickets-0710/evidence/s16/CalculationManual.png`, `TextBox.png`, `CommentResolve.png`; XLSX outputs are under the audit profile `E:\VNOffice-profiles\codex-fs16`.
IMPLEMENTATION SUMMARY: No adapter source was changed by the Sheet audit agent. Implement through the existing Sheet adapter/package export path; do not call LibreOffice internals from UI.
FILES CHANGED: `scripts/audit-0610/gen_sheet_button_matrix.py`; `docs/SHEET-BUTTON-MATRIX-1011.md`; `docs/tickets-0710/FIX-S16-RESULTS.md`; evidence named above.
COMMANDS RUN: CDP desktop via `scripts/audit-0610/word_parallel/app-ops-sheet.desktop.mjs` with `VNO_APP_ROOT=E:\VNOffice-codex-fs16`, `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fs16`, `VNO_AUDIT_MARK_DIRTY=1`; Excel read-only via `scripts/audit-0610/word_parallel/excel-read.ps1`.
BUILD RESULT: NOT RUN.
TEST RESULTS: Audit evidence reproduced both mismatches. Full repository verification is recorded in the parent FIX-S16 handoff.
KNOWN FAILURES: Manual calculation mode is not persisted; inserted text boxes are omitted from XLSX; resolved-comment state is absent from the exported legacy comment.
RISKS: Text box shape serialization affects XLSX semantics and needs fixture coverage. Calculation mode must be exported without changing cell formula caches or recalculation policy unintentionally. Resolved comments may need threaded-comment OOXML, a larger semantic change than toggling the current legacy note.
DEPENDENCIES/BLOCKERS: Adapter ownership; coordinate through `adapters/**` owner. Add a Vietnamese in-app help update if the supported behavior or limitations change.
CORE PATCH ID (if any): None.
NEXT ACTION: Implement the two adapter export paths and decide the supported resolved-comment format; verify with fresh CDP saves and Excel COM ReadOnly for each workbook, then update the matrix from `LỆCH ĐÃ BIẾT` only after readback passes.
