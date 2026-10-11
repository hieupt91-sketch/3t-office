# Agent Handoff
TASK: FIX-S10 — Continue FIX-S9 Sheet/Excel parity groups
AGENT/ROLE: Codex / VN Sheet audit and implementation
BRANCH: `fix/sheet-s10-codex`
WORKTREE: `E:\VNOffice-codex-fs10`
OBJECTIVE: Verify the remaining formula, paste, find/replace, sorting, duplicate removal, and sheet management groups through real CDP UI input and Excel read-only XLSX readback; fix reproducible gaps; run the requested suite and XLSX batch.
FINDINGS: Formula recalculation, Paste Special values/formats/formulas, multilevel sort, duplicate removal, and sheet rename/move/delete matched Excel. Find/Replace lacked Excel-style whole-cell matching; the Sheet dialog now exposes “Khớp toàn bộ nội dung ô”, wired to the shared matcher and documented in Vietnamese with VI/EN labels.
IMPLEMENTATION SUMMARY: Added optional `matchCell` to the shared find engine, a Sheet-only checkbox in the shared dialog, Sheet search-state tracking, Vietnamese Help/i18n, matcher and localization regression coverage, and extended the real-CDP Find/Replace audit. Other groups required no product code changes.
FILES CHANGED: `apps/sheet/sheet-grid.js`; `platform/find/find-engine.js`; `platform/find/find-dialog.js`; `platform/help/entries-sheet.js`; `platform/i18n/strings-en.js`; `platform/i18n/strings-vi.js`; `tests/unit/find-replace-shared.test.js`; `tests/unit/sheet-slides-i18n-shortcuts.test.js`; `scripts/audit-0610/word_parallel/app-ops-sheet.desktop.mjs`; `docs/tickets-0710/FIX-S10-RESULTS.md`; updated CDP screenshots under `docs/tickets-0710/evidence/`.
COMMANDS RUN: CDP audit packs with `VNO_APP_ROOT=E:\VNOffice-codex-fs10`, `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fs10`, `VNO_AUDIT_MARK_DIRTY=1`; Excel COM read-only on formula, paste-special, find/replace, custom-sort, remove-duplicates, and sheet-management XLSX outputs; `npm test`; `python -u scripts/layout-audit/batch_document_audit.py xlsx E:\VNOffice-codex-fs10 lan01.xlsx lan02.xlsx lan04.xlsx lan06.xlsx lan09.xlsx lan11.xlsx lan22.xlsx lan26.xlsx --input-dir "E:\VNOffice-codex-fs10\file test\lan" --out-dir "E:\VNOffice-profiles\codex-fs10\batch"`; `git diff --check`.
BUILD RESULT: NOT RUN (ticket required `npm test` and XLSX batch; no separate build command requested).
TEST RESULTS: `npm test` PASS 3062/3062, 0 FAIL. XLSX batch PASS 8/8, `diffs=0`, lint clean, Excel COM PASS. Six requested groups verified; Find/Replace fixed and verified through CDP and Excel.
KNOWN FAILURES: None.
RISKS: `matchCell` is optional and false by default; the checkbox appears only for Sheet, leaving Writer/Slides behavior unchanged. Existing Help/i18n remains in Shared Platform as required.
DEPENDENCIES/BLOCKERS: None. Excel COM opened saved files with `ReadOnly=true`; UI input used mouse/keyboard through CDP. No SendKeys or process termination was used.
CORE PATCH ID (if any): N/A.
NEXT ACTION: Review and merge the six group commits plus this handoff/verification commit.
