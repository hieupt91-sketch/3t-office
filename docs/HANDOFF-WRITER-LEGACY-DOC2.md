# Agent Handoff

TASK: Writer legacy `.doc` layout wave 2 (Codex)
AGENT/ROLE: Codex / Writer integration and layout
BRANCH: `fix/writer-legacy-doc2-codex`
WORKTREE: `E:\VNOffice-codex-writer-legacy-doc2`
OBJECTIVE: Diagnose and reduce Word/canvas/save page-count differences for legacy DOCs while preserving existing OOXML shapes and avoiding LibreOffice Core changes.

FINDINGS:

- `legacy13.doc`: an anchored `wrapSquare` image can be reinterpreted by the legacy DOC filter after edits elsewhere in the document. Comparing only the image paragraph misses that save case.
- `legacy18.doc`: the DOCX import has a trailing chain of empty paragraphs with direct `w:keepNext`. Browser pixel rounding left the chain just inside the live pagination threshold; Word moves it to page 3.
- `legacy20.doc`: the Word page-count oracle encountered a modal error dialog and timed out.

IMPLEMENTATION SUMMARY:

- Added source-aware DOC export preparation. It compares body text and changes square wrapping to `wrapNone` only for anchored-image documents whose body text was edited.
- Imported direct and inherited OOXML `keepNext` onto normalized Writer paragraphs, removed the internal marker on export, and honored keep-next groups in print pagination. Live pagination applies a 2px rounding tolerance to trailing empty keep-next chains; non-empty heading groups use normal block pagination to avoid false extra pages.
- No LibreOffice Core changes, new dependencies, Sheet changes, or external data flows.

FILES CHANGED:

- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `adapters/libreoffice/writer/writer-adapter.js`
- `main.py`
- `tests/test_writer_legacy_doc_save.py`
- `tests/unit/writer-legacy-keep-next.test.js`
- `tests/run-tests.js`
- `docs/HANDOFF-WRITER-LEGACY-DOC2.md`

COMMANDS RUN:

- `node tests/run-tests.js`
- `python -m unittest discover -s tests`
- `python -m unittest tests.test_writer_legacy_doc_save -v`
- Targeted Writer legacy keep-next unit tests
- `_batch_writer.py` for the 20 legacy DOC corpus, then re-runs for `legacy13.doc` and `legacy18.doc`
- `_batch_writer.py` for DOCX `d01`–`d09`, `d11`–`d24` (excluded `d10`)
- `_writer_shape_counts.py` for both DOCX batch output directories
- Foreground Word COM anchor-page comparison for `d04`, `d06`, `d07`, `d09`, and `d24`
- `_canvas_para_metrics.py` targeted rechecks for `legacy18.docx`, `d01.docx`, `d13.docx`, and `d19.docx`
- `git diff --check`

BUILD RESULT: NOT RUN — this task changes Writer import/export and pagination; automated test suites and document round-trips were run.

TEST RESULTS:

- PASS — Node suite: 1855/1855.
- PASS — Python suite: 381/381.
- PASS — legacy DOC save unit tests: 3/3.
- PASS — keep-next unit tests: 4/4.
- PASS — DOCX corpus `d01`–`d09`, `d11`–`d24`: Word/save page counts matched. Live canvas rechecks confirmed corrected page counts for `d01` (19), `d13` (10), and `d19` (2); other batch entries matched Word. `ZZ` was present in saved files.
- PASS — shape counts: zero excess `wsp`/`txbx`/`txc`/media and zero duplicate `wp:docPr` IDs across the 23 DOCX files.
- PASS — Word anchor-page checks: `d04`, `d06`, `d07`, `d09`, and `d24` had zero missing/page-mismatched shapes.
- PASS — legacy DOC `legacy01`–`legacy17` and `legacy19`: Word, canvas, and saved page counts matched. `legacy13.doc` recheck after the fix: 1/1/1.
- FAIL — `legacy18.doc`: Word 3 / canvas 3 / saved DOC 2. Live canvas and print pagination are corrected; save-to-DOC still loses enough body flow to remain one page short.
- BLOCKED — `legacy20.doc`: Word oracle timed out on a modal dialog; no reliable saved-page count.

KNOWN FAILURES:

- The task is not fully green until `legacy18.doc` saves as 3 pages. The current output retains its trailing keepNext properties, but the DOC round-trip produces fewer body paragraphs than the source conversion.
- `legacy20.doc` requires a non-modal Word oracle run or dismissal of its document error dialog before its saved-page count can be verified.
- The 20-file DOC batch was interrupted at `legacy20` after the Word oracle stalled; all `legacy01`–`legacy19` rows were recorded. `legacy20` is reported as BLOCKED based on the reproduced oracle timeout.

RISKS:

- The DOC compatibility shim changes wrapping for edited legacy documents with square-wrapped floating anchors. Unedited documents and unrelated wrapping types are left alone.
- Live pagination handles the observed trailing blank keep-next chain; broader heading pagination remains governed by existing block behavior to avoid adding false pages.

DEPENDENCIES/BLOCKERS: Word COM modal behavior for `legacy20`; unresolved body-flow loss on saved `legacy18.doc`.

CORE PATCH ID (if any): None.

NEXT ACTION:

1. Compare source and saved `legacy18.doc` body paragraph sequence around the trailing keepNext chain and preserve the missing flow paragraphs in the source-aware DOC export path.
2. Re-run the `legacy18.doc` Word/canvas/saved oracle and the full 20-file DOC batch.
3. Resolve or bypass the `legacy20.doc` Word modal with an approved foreground measurement path.

COMMITS:

- `ffc3c97` — findings committed before code changes.
- `5d28a0a` — root-cause findings addendum.
- `cfa97e5` — Writer DOC export and keep-next changes.
