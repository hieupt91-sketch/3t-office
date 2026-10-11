# Agent Handoff

TASK: Continue `docs/tickets-0710/FIX-S12.md` from main
AGENT/ROLE: Codex / Sheet ribbon audit
BRANCH: `audit/sheet-s14-codex`
WORKTREE: `E:\VNOffice-codex-fs14`
OBJECTIVE: Compare the 138 Sheet ribbon commands against Excel using real CDP UI actions and read-only Excel COM inspection of the saved XLSX files.
FINDINGS: The matrix is now 87 KHỚP EXCEL / 51 CHƯA ĐỐI CHIẾU (72/66 at this worktree's start). Hyperlink export was fixed in the adapter/parser and verified in Excel. Formula name/error/recalculation, image, both Sparkline types, comments insert/delete, and page layout actions gained saved-file evidence. Comment Previous/Next and Header/Footer remain unchecked. Home alignment remains unchecked: hit testing found the `alignTop` node at `(412,56)` under the ribbon tabs while its panel starts at `y=78`, and the hit target is the tab strip. The runner now refuses to count this as a button click. See `docs/tickets-0710/FIX-S12-RESULTS.md` and `docs/SHEET-BUTTON-MATRIX-1011.md`.
IMPLEMENTATION SUMMARY: Reused the existing CDP runner, Excel COM reader, matrix generator, adapter export path, and in-app Help/i18n. Fixed hyperlink persistence in the Sheet FODS save/load path. No LibreOffice Core changes and no new dependencies.
FILES CHANGED: `adapters/libreoffice/sheet/sheet-adapter.js`, `adapters/libreoffice/sheet/sheet-payload-parser.js`, `tests/unit/sheet-comments-printarea.test.js`, `scripts/audit-0610/gen_sheet_button_matrix.py`, `scripts/audit-0610/word_parallel/app-ops-sheet.desktop.mjs`, `scripts/audit-0610/word_parallel/excel-read.ps1`, `docs/SHEET-BUTTON-MATRIX-1011.md`, `docs/tickets-0710/FIX-S12-RESULTS.md`, and `docs/tickets-0710/evidence/fix-s12-*.png`.
COMMANDS RUN: `npm test`; `python -m unittest discover -s tests`; dirty-save XLSX batch for lan01/02/04/06/09/11/22/26; Sheet matrix generator; CDP + Excel COM read-only probes; `node --check` for the runner; UTF-8/no-BOM scan of changed text files; `git diff --check` for worktree and branch diff.
BUILD RESULT: NOT RUN separately; no build-system change.
TEST RESULTS: PASS `npm test`, 3089/3089. PASS Python discovery, 883 tests in 506.094 seconds; emitted subprocess `ResourceWarning`s but ended OK. PASS XLSX batch, 8/8 with `saved=yes`, `diffs=0`, lint clean, Excel PASS.
KNOWN FAILURES: No failing verification command. Some CDP probes were inconclusive and therefore remain unchecked rather than being represented as Excel parity.
RISKS: 51 of 138 scanned commands remain unverified. Current evidence does not establish parity for the remaining Home formatting, Insert Pivot chart, formula navigation/tools, comments navigation/resolve, or other remaining commands.
DEPENDENCIES/BLOCKERS: Inspect Sheet ribbon layout and command-node geometry, then fix within `apps/sheet/**` if the mispositioned/occluded command is reproducible in the UI. Excel COM must remain ReadOnly and one workbook at a time.
CORE PATCH ID (if any): None.
NEXT ACTION: Continue remaining commands by priority, add VI Help/i18n for any feature code changes, update the generator evidence map only after Excel readback, commit each verified group, and rerun required verification after product-code changes.
