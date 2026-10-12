# Agent Handoff
TASK: FIX-T12 (Doc vs Word), ticket `docs/tickets-0710/FIX-T12.md`
AGENT/ROLE: Codex, Writer / document-format integration
BRANCH: `audit/doc-t12-codex`
WORKTREE: `E:\VNOffice-codex-ft12`
OBJECTIVE: Resolve the remaining document-vs-Word differences for Writer Word Count, native editable DOCX chart/diagram/watermark objects, and Word-readable document theme and line numbering.
FINDINGS:
- `Review > Word Count` counts explicit `<br>` line breaks after the character change in commit `dd300cc0`, but corpus parity remains outside the ticket's 0.2% character-with-spaces tolerance for 6 of 7 documents. Current live app vs Word COM (`characters with spaces / no spaces`): d01 37188/29290 vs 37388/29290 (0.535%); d02 24209/19756 vs 24271/19756 (0.255%); d06 996/790 vs 2057/790 (51.6%); d07 36611/30414 vs 37178/30413 (1.52%); d13 16007/13377 vs 16004/13376 (0.019%); d20 8362/7068 vs 8773/7020 (4.69%); d24 app 0/0, Word COM 0/-2 (empty-document COM anomaly). A Word COM-created mini-document confirmed repeated spaces count individually and an explicit line break contributes one character; the corpus mismatch still needs a reliable DOM/Word whitespace rule.
- d06 has 60 body shapes and 443 characters in Word text frames; Word's document statistics are 2057/790. This is a diagnostic lead, not a complete explanation of the app's 996/790 result.
- Native chart, diagram, watermark, theme, and line-number verification is described under TEST RESULTS.
IMPLEMENTATION SUMMARY:
- Added `docs/PLAN-DOC-T12-CHART.md` before feature implementation.
- Export newly inserted Writer charts as editable native Word chart parts with embedded workbooks, and newly inserted diagrams as editable grouped DrawingML shapes. Restrict package changes to newly inserted objects and preserve imported content.
- Export native Word text watermark shapes in the header while retaining the preview/PDF watermark overlay.
- Persist selected Writer theme colors/fonts to the DOCX theme part only when a non-default theme is selected; preserve imported default themes. Export continuous line-number settings through `w:lnNumType`.
- Add concrete Vietnamese chart help in the Writer Help catalog. Existing chart/diagram, watermark, and line-number guides were checked against their actual UI.
- Restore explicit manual line breaks to Word Count's character-with-spaces total. Attempts to count raw HTML text nodes were reverted because they overcounted structural whitespace.
FILES CHANGED:
- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `adapters/libreoffice/writer/writer-adapter.js`
- `apps/writer/word-count.js`
- `main.py`
- `platform/help/entries-writer.js`
- `tests/live/cdp/writer-fix-t12-chart.desktop.mjs`
- `tests/live/cdp/writer-fix-t12-count-corpus.desktop.mjs`
- `tests/live/cdp/writer-fix-t12-diagram.desktop.mjs`
- `tests/live/cdp/writer-fix-t12-theme-lines.desktop.mjs`
- `tests/live/cdp/writer-fix-t12-watermark.desktop.mjs`
- `tests/test_writer_notes_export.py`
- `tests/unit/writer-word-count.test.js`
- `docs/PLAN-DOC-T12-CHART.md`
COMMANDS RUN:
- `npm test` — PASS, 3093/3093.
- `python -m unittest discover -s tests` — PASS, 891 tests (full run completed before the final narrowly scoped theme-marker and watermark-conversion adjustments).
- `python -m unittest discover -s tests -p test_writer_notes_export.py` — PASS, 30 tests after the export adjustments.
- `python -m py_compile main.py adapters/libreoffice/common/ooxml_zip_patch.py` — PASS.
- `node --check adapters/libreoffice/writer/writer-adapter.js` — PASS; the full npm suite also runs repository JS syntax checks.
- `git diff --check main...HEAD` — PASS.
- UTF-8 scan of 13 changed files — PASS: no BOM, invalid UTF-8, or replacement character.
- Live CDP `writer-fix-t12-chart.desktop.mjs` — PASS; Word COM readback found one editable chart (`HasChart=True`, embedded workbook `Book1`) and DOCX chart/workbook parts.
- Live CDP `writer-fix-t12-diagram.desktop.mjs` — PASS; Word COM readback found one editable group with four items.
- Live CDP `writer-fix-t12-watermark.desktop.mjs` — PASS after final export adjustment; Word COM readback: header Shapes=1, name `PowerPlusWaterMarkObject1`, body Shapes=0, body InlineShapes=0.
- Live CDP `writer-fix-t12-theme-lines.desktop.mjs` — PASS; DOCX theme has the chosen Modern palette and Be Vietnam Pro fonts; Word COM line numbering Active=-1, CountBy=1, RestartMode=0. Word COM `Document.Theme` was null for both the app file and a Word-created control file, so it is not a useful theme oracle.
- DOCX batch d01,d02,d06,d07,d13,d20,d24 — PASS after rerunning d13 following the imported-theme fix; all seven retained Word page counts (d13 10→10).
- XLSX batch lan01,02,04,06,09,11,22,26 — PASS across the initial three and an isolated-profile retry of the remaining five; each had zero page diffs, clean lint, and Excel COM readback.
- Slides live suites: roundtrip 8/8 PASS; fix-L2 20/20 PASS; fix-L3 13/13 PASS.
BUILD RESULT: `npm test` PASS. No production build command is defined by the ticket run.
TEST RESULTS: Native object, theme/line-number, Writer/Sheet/Slides desktop and package checks passed as listed. The required Writer Word Count corpus threshold is NOT MET: only d13 of seven is within 0.2%. Do not mark FIX-T12 fully passed until the count mismatch is resolved and all seven corpus documents are rechecked.
KNOWN FAILURES: Word Count corpus parity remains outside tolerance on d01,d02,d06,d07,d20. d24 returns a Word COM `charactersNoSpaces=-2` despite the empty app document; investigate whether this COM result is a Word empty-document artifact. `npm test` and focused Python tests pass. Full Python suite passed before the final limited export corrections; focused export tests passed afterward.
RISKS: Further Word Count adjustment may change treatment of repeated spaces, whitespace-only DOM nodes, list labels, tables, text frames, and manual line breaks. Keep Word COM as the oracle and retain the failing corpus evidence until parity is demonstrated.
DEPENDENCIES/BLOCKERS: No external dependencies. Completion is pending a defensible Word Count whitespace/story rule meeting the ticket's <=0.2% threshold on at least six DOCX files; d06 currently has a particularly large discrepancy.
CORE PATCH ID (if any): None.
NEXT ACTION: Continue from this branch and investigate Word Count whitespace accounting using Word COM controlled documents and the existing d01,d02,d06,d07,d13,d20,d24 corpus. Preserve the current COM/result data; do not relax the ticket tolerance or rewrite tests to hide the mismatch. After a fix, rerun all seven Word Count probes and the required test/batch checks.
