# Agent Handoff

TASK: FIX-T14 — Writer Word Count, WordArt and view-button comparison
AGENT/ROLE: Codex — Writer integration audit
BRANCH: audit/doc-t14-codex
WORKTREE: E:\VNOffice-codex-ft14
OBJECTIVE: Resolve remaining Word Count deltas, verify WordArt and view commands against Word, and refresh the Writer button matrix.

FINDINGS:
- Desktop CDP remeasured d01/d02/d06/d07/d13/d20: Writer word counts remain 8138/4627/236/6159/2761/1353; T13 Word COM deltas remain −16/+2/0/+2/−3/−1. d24 closes the desktop WebView before returning statistics.
- Word COM controls could not run: `Documents.Add()` hung while a hidden `WINWORD.EXE` PID 8096, started before this task, remained active. Only PIDs launched by this task were stopped. Word COM readback for print/zoom and WordArt is also pending.
- Native desktop Save As now writes one editable DOCX DrawingML `wps:wsp` WordArt with `a:prstTxWarp= textFadeRight`; the shape contains its text and leaves no placeholder bookmarks. Desktop CDP verifies print preview is one A4 page (210×297 mm; 794×1123 px), page-width fit is 1286/1329 px at 162%, reset is 100%, and New Window opens an independent blank WebView with no content sync. The latter is documented as an intentional difference.

IMPLEMENTATION SUMMARY:
- Added the T14 plan and Word COM control script. Wired the existing FODT Fontwork serializer into DOCX export, then replaced inline HTML placeholders with editable DrawingML WordArt while preserving adjacent paragraph text and unique drawing IDs.
- Fixed page-width mode being cleared during zoom synchronization. Updated the Vietnamese in-app WordArt instructions and refreshed the generated 120-row Writer button matrix. The matrix keeps unmeasured Word COM comparisons in `CHƯA ĐỐI CHIẾU` and Word Count in `LỆCH ĐÃ BIẾT`.

FILES CHANGED:
- `docs/PLAN-DOC-T14.md`; `docs/DOC-BUTTON-MATRIX-1011.md`; `docs/tickets-0710/HANDOFF-FIX-T14-CODEX.md`
- `apps/writer/writer-view-controller.js`; `platform/help/entries-writer.js`; `adapters/libreoffice/writer/writer-adapter.js`; `adapters/libreoffice/common/ooxml_zip_patch.py`; `main.py`
- `scripts/audit-0610/gen_doc_button_matrix.py`; `scripts/audit-0610/word_parallel/wordcount-controls-t14.ps1`; `scripts/audit-0610/word_parallel/writer-view-t14.desktop.mjs`; `scripts/audit-0610/word_parallel/writer-wordart-t14.desktop.mjs`
- `tests/unit/writer-zoom-wheel.test.js`; `tests/test_writer_notes_export.py`

COMMANDS RUN:
- `npm test`
- `$env:LOCALAPPDATA=E:\VNOffice-profiles\codex-ft14\python-local; python -X utf8 -m unittest discover -s tests`
- `python -X utf8 -m unittest tests.test_writer_notes_export`
- Desktop CDP: `writer-view-t14.desktop.mjs`, `writer-wordart-t14.desktop.mjs`, and `wordcount-corpus-t13.desktop.mjs` (full corpus and isolated d24 attempt)
- Word COM control script attempted twice; both runs hung at Word document creation because of the existing hidden Word process.
- Matrix generator; Python compile; JavaScript syntax checks; PowerShell parse; UTF-8/no-BOM scan; `git diff --check main...HEAD`.

BUILD RESULT: NOT RUN — no build-system change.
TEST RESULTS:
- `npm test`: PASS, 3108/3108.
- `python -X utf8 -m unittest discover -s tests`: PASS, 904 tests in 510.842 seconds. Existing ResourceWarnings and a subprocess reader-thread UnicodeDecodeError were emitted; the test process exited 0 with `OK`.
- `python -X utf8 -m unittest tests.test_writer_notes_export`: PASS, 32 tests.
- Writer desktop view audit: PASS for the measured app states above. WordArt DOCX desktop save and OOXML inspection: PASS for one native DrawingML shape, text and warp, no leftover bookmarks.
- Word Count corpus: d01/d02/d06/d07/d13/d20 measured; prior deltas remain. d24: BLOCKED by the LibreOffice import crash/CDP disconnect. Word COM controls and Word property comparisons: BLOCKED by the pre-existing hidden Word process.
- Encoding, syntax, Python compile and diff checks: PASS.

KNOWN FAILURES:
- Word Count is still outside the requested ≤0.1% target for d01 and d13; the required Word COM token controls were not measured, so no tokenization rule was changed.
- d24 still cannot return a desktop statistic in this worktree.

RISKS:
- WordArt was verified from the emitted DOCX structure, but Word COM `Shape.TextEffect` readback and other preset appearances remain unverified.
- Print page count/PDF dimensions, `Zoom.PageFit` and zoom percentage have app measurements only; their Word COM comparisons remain unverified.

DEPENDENCIES/BLOCKERS: Existing hidden Word COM process (PID 8096) prevents isolated Word automation; retry after that process exits. No new dependency.
CORE PATCH ID (if any): None.
NEXT ACTION: Rerun the T14 Word COM controls and view/print/WordArt comparisons when Word COM is available; use those token measurements to finish word-count parity and update the remaining matrix rows.
