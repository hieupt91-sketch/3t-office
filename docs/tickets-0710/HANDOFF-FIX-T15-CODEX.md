# Agent Handoff

TASK: FIX-T15 — Writer word count and five DOC/Word button comparisons
AGENT/ROLE: Codex — Writer integration and audit
BRANCH: audit/doc-t15-codex
WORKTREE: E:\VNOffice-codex-ft15
OBJECTIVE: Match Word tokenization within 0.05% on the seven-document corpus, diagnose d24 desktop behavior, compare five Writer ribbon buttons with Word COM, and refresh the Writer button matrix.

FINDINGS:
- Word COM controls confirmed whitespace-token behavior for the requested punctuation, symbols, email/URL, ordinal, tabs, NBSP, line breaks and page-number field. Word counts each shell token matching `--word` as two words; page/column breaks separate words without adding a character; standalone `<w:sym>` symbol runs contribute text/count.
- After the fixes, desktop counts: d01 8154 (Word 8154), d02 4627 (Word 4625; +2/0.043%), d06 236 (236), d07 6159 (6157; +2/0.032%), d13 2764 (2764), d20 1354 (1354), d24 0 (Word main story 0). All are exact or within 0.05%. d24 opens in the desktop app; the earlier batch harness issue came from retrieving the entire large inline-image HTML payload, not an app crash.
- Word COM reports native WordArt as Shape.Type=15 (`msoTextEffect`) with nonempty TextEffect.Text. The emitted VN Office shape reads as Type=17 (`msoTextBox`) with empty TextEffect.Text and editable TextFrame text. Matrix records this as an intentional distinction: VN Office emits its own editable decorative DrawingML text shape and does not claim native WordArt effect parity.
- App Page Width activates fit-to-width; Word COM reports Zoom.PageFit=3. Reset returns 100% / PageFit=0. App and Word Print Preview both render one portrait A4 page; app preview is 794x1123 px and Word COM page is 595.35x841.95 pt. The app Print button opened its integrated printer dialog and preview (8 installed printer entries). No print job was submitted.

IMPLEMENTATION SUMMARY:
- `apps/writer/word-count.js`: count standalone OOXML symbol runs, treat `--word` tokens as Word does, and use a zero-character separator for page/column breaks.
- Added focused Writer word-count regression tests and committed the FIX-T15 plan before implementation.
- Refreshed generated Writer comparison matrix: all 120 active button rows are classified (113 match, 7 intentional differences; zero pending rows), including Word count and the five requested buttons.
- No document save semantics, Core/upstream code, UI framework, build system, or external dependency changed. Existing Vietnamese Help already covers the word-count and print commands.

FILES CHANGED:
- `apps/writer/word-count.js`; `tests/unit/writer-word-count.test.js`
- `docs/PLAN-DOC-T15.md`; `docs/DOC-BUTTON-MATRIX-1011.md`; `scripts/audit-0610/gen_doc_button_matrix.py`
- `scripts/audit-0610/word_parallel/{d24-open-t15.desktop.mjs,wordcount-controls-t15.ps1,wordcount-corpus-token-diff-t15.ps1,wordcount-word-tokens-t15.ps1,writer-view-t15.ps1}`
- `docs/tickets-0710/HANDOFF-FIX-T15-CODEX.md`

COMMANDS RUN:
- `npm test`
- `$env:LOCALAPPDATA='E:\VNOffice-profiles\codex-ft15\python-local'; python -X utf8 -m unittest discover -s tests`
- Writer desktop via CDP: six-document corpus (`d01,d02,d06,d07,d13,d20`), isolated d24 count probe, view/print-preview/zoom, and Print dialog open/preview.
- Word COM: seven-document corpus and token controls; `writer-view-t15.ps1 -SkipPdf` for zoom, Print Preview and WordArt readback. A4 probe used `wdPaperA4` (enum 7).
- Slides desktop regression batches: `claude-slides-roundtrip.desktop.mjs`; `slides-fix-l2.desktop.mjs`; `slides-fix-l3.desktop.mjs`.
- `python -X utf8 scripts/audit-0610/gen_doc_button_matrix.py docs/ribbon-scan-writer-1011.json docs/DOC-BUTTON-MATRIX-1011.md`; UTF-8/BOM scan on changed text files; `git diff --check e78a0e38..HEAD`.

BUILD RESULT: NOT RUN — no build-system change.
TEST RESULTS:
- `npm test`: PASS, 3112/3112.
- `python -X utf8 -m unittest discover -s tests`: PASS, 907 tests in 540.358 seconds; process exited `OK`. Python emitted existing ResourceWarnings and a subprocess reader thread reported a UnicodeDecodeError during the run.
- Slides desktop batches: PASS 8/8, PASS 20/20, PASS 13/13 behaviors.
- Writer desktop: all seven files exact or within the 0.05% word-count tolerance; d24 opened and returned 0 words. Print dialog preview and zoom controls measured as above.
- Matrix generator and `git diff --check`: PASS. Encoding scan: 10 changed text files, UTF-8 without BOM/errors.

KNOWN FAILURES:
- Word COM `ExportAsFixedFormat` hung in earlier attempts, so a PDF file/physical print output was NOT RUN. The final COM script used `-SkipPdf`; Print Preview page count and physical A4 geometry were measured instead. The app Print dialog was observed but not submitted to a printer.
- A diagnostic iteration of Word's COM Words collection hung and was stopped; token counts used Word COM document statistics and the control suite instead.

RISKS: WordArt retains editable text but Word treats the saved shape as a generic text box, not native WordArt. This is recorded as an intentional product difference in the matrix. d02 and d07 counts are not exact, but are inside the ticket's 0.05% threshold.
DEPENDENCIES/BLOCKERS: None. No new dependencies. No Core patch.
CORE PATCH ID (if any): None.
NEXT ACTION: None for FIX-T15. If native WordArt parity or PDF/physical print comparison becomes a requirement, scope that as a separate task.
