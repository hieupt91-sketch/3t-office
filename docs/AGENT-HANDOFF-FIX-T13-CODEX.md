# Agent Handoff — FIX-T13

TASK: FIX-T13 — Writer Word Count and DOC/Word button matrix
AGENT/ROLE: Codex — Writer integration and audit
BRANCH: audit/doc-t13-codex
WORKTREE: E:\VNOffice-codex-ft13
OBJECTIVE: Use Word COM as the count oracle, correct Writer counting, verify d01/d02/d06/d07/d13/d20/d24 on desktop, and refresh Writer matrix evidence.

FINDINGS:
- Word COM controls established the counting rules: preserve repeated spaces and whitespace-only runs; include list labels, table text, explicit breaks, tabs, field results and special characters; exclude text-frame content and field instructions. A Word-created empty document returns words/chars 0/0. The d24 fixture returns `charactersWithSpaces=-2`, so this is a fixture-specific Word COM anomaly.
- Desktop CDP + Word COM character counts meet the ticket's ≤0.2% threshold for six of seven corpus files. d01 is 37,372 vs 37,388 with spaces and 29,274 vs 29,290 without spaces (0.043%); d02, d06, d07, d13, d20 match both character totals exactly. LibreOffice desktop crashes while importing d24, so no desktop count is claimed for it.
- Word word-token totals still differ: d01 -16, d02 +2, d07 +2, d13 -3, d20 -1; d06 matches. CJK controls now match Word COM. Matrix records the residual word-token differences and retains `LỆCH ĐÃ BIẾT` for Word Count.
- d20's 42 legacy FORMCHECKBOX field results and 46 numbered-list labels explain its previous 42-character deficit. UI dialog now matches the Word COM character totals after opening Review.
- Button matrix: 108 KHỚP WORD, 5 KHÁC CÓ CHỦ Ý, 5 CHƯA ĐỐI CHIẾU, 2 LỆCH ĐÃ BIẾT (120 rows). Native chart/diagram, theme, watermark and line-number evidence uses FIX-T12 COM readback. Macro model is documented as a local Command Bus recorder, distinct from VBA.

IMPLEMENTATION SUMMARY:
- Word Count uses imported OOXML text runs for original documents, preserves whitespace and special field results, skips layout tabs/text frames/field instructions, uses OOXML list metadata for marker counts, and avoids double-counting explicit breaks. Trusted input invalidates source counts; import normalization and Review UI state retain the source count. CJK codepoints are counted as separate Word tokens.
- Added Word COM control-document and desktop CDP probes, refreshed the matrix generator and generated matrix. No Core patch, external dependency, or build-system change.

FILES CHANGED:
- `apps/writer/word-count.js`
- `adapters/libreoffice/writer/writer-adapter.js`
- `apps/writer/writer-app.js`
- `tests/unit/writer-word-count.test.js`
- `scripts/audit-0610/word_parallel/wordcount-controls-t13.ps1`
- `scripts/audit-0610/word_parallel/wordcount-controls-t13.desktop.mjs`
- `scripts/audit-0610/word_parallel/wordcount-corpus-t13.desktop.mjs`
- `scripts/audit-0610/gen_doc_button_matrix.py`
- `docs/PLAN-DOC-T13-WORDCOUNT.md`
- `docs/DOC-BUTTON-MATRIX-1011.md`
- This handoff file.

COMMANDS RUN:
- `npm test`
- `python -X utf8 -m unittest discover -s tests`
- `scripts/audit-0610/word_parallel/wordcount-controls-t13.ps1` (Word COM control corpus)
- `node --experimental-websocket scripts/audit-0610/word_parallel/wordcount-controls-t13.desktop.mjs` (desktop controls; focused reruns for list, whitespace, text frame, page field and special characters)
- `node --experimental-websocket scripts/audit-0610/word_parallel/wordcount-corpus-t13.desktop.mjs` (desktop d01/d02/d06/d07/d13/d20; d24 attempted and crashed on import)
- `scripts/audit-0610/word_parallel/group6-t11-count-word.ps1` (Word COM seven-file batch)
- `python -X utf8 scripts/audit-0610/gen_doc_button_matrix.py docs/ribbon-scan-writer-1011.json docs/DOC-BUTTON-MATRIX-1011.md`
- `node --check` on modified JavaScript files; UTF-8/no-BOM scan for all files changed from `main`; `git diff --check main...HEAD`.

BUILD RESULT: NOT RUN — no build-system change or build request in FIX-T13.
TEST RESULTS:
- `npm test`: PASS, 3108/3108.
- `python -X utf8 -m unittest discover -s tests`: PASS, 902 tests in 476.702s, exit code 0. The run emitted existing `ResourceWarning`s and one non-fatal `UnicodeDecodeError` in a subprocess reader thread; test runner still completed `OK`.
- Focused Writer Word Count tests: PASS, 21/21.
- Word COM batch: PASS/complete, seven input files measured. d24 returned 0 words, 0 chars without spaces, and -2 chars with spaces.
- Desktop corpus: d01/d02/d06/d07/d13/d20 measured; six satisfy the character threshold. d24: BLOCKED by LibreOffice desktop crash during import; CDP closed before a response.
- Desktop controlled cases: list 13/15 characters, whitespace-only run 9/12, repeated spaces 9/13, text frame 8/9, page field 8/10, special characters 7/12 and 7 words all match Word COM.
- Encoding scan: PASS, 10 changed files checked, UTF-8 valid, no BOM. JS syntax and `git diff --check`: PASS.

KNOWN FAILURES:
- Word token totals remain different on five corpus files as listed above, despite the required character threshold being met on six of seven.
- d24 cannot be imported by this desktop build; Word COM fixture count is anomalous (-2 with spaces). A new Word COM document confirms ordinary empty count is 0/0.
- Full Python test run emitted a non-fatal subprocess pipe decode exception and ResourceWarnings; exit code remained 0.

RISKS: Source OOXML counts reflect the imported file until real trusted user input invalidates them. The d24 import crash remains outside this Word Count fix; no LibreOffice Core patch was made.
DEPENDENCIES/BLOCKERS: No new dependency. Follow-up is needed if exact Word word-token totals or desktop d24 import become acceptance requirements.
CORE PATCH ID (if any): None.
NEXT ACTION: Follow up on the five residual Word token deltas and investigate d24 import crash separately; preserve this ticket's recorded six-of-seven character result and Word COM `-2` artifact evidence.
