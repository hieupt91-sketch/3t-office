# Agent Handoff
TASK: Brief 7 - fix edit-loss regression introduced by 74b3843
AGENT/ROLE: Codex / Writer + LibreOffice integration
BRANCH: fix/writer-spacing-align-cover
WORKTREE: E:\VNOffice-codex-writer-spacing
OBJECTIVE: Never return the source DOCX after any editor-zone change; preserve edited floating textbox text, untouched native anchors, and original pagination.
FINDINGS: `isDirty` missed native `execCommand()` mutations. The edited-document fallback in `postprocess_writer_docx` could therefore return the source bytes. LibreOffice also collects Aquara anchors into one paragraph, so carrier relocation could overwrite the edited textbox. On MYTIME, relocating already-correct page breaks plus restoring source paragraph spacing caused 88 pages to become 90.
IMPLEMENTATION SUMMARY: Snapshot and hash normalized full `editorDom.innerHTML` after open, combine it with `isDirty` for the pristine marker, and explicitly mark edited/untouched nested paragraphs on the export clone. Removed edited-document source fallback. Drawing-led native catalogues transplant simple edited textbox text into native OOXML so the edit stays inside the original 11-anchor layout. Long edited documents retain LibreOffice's 43 break positions while untouched anchors are relocated. Paragraph spacing and carrier `sectPr` are not reintroduced because measured Word pagination regresses when they are.
FILES CHANGED: adapters/libreoffice/writer/writer-adapter.js; adapters/libreoffice/common/ooxml_zip_patch.py; tests/unit/writer-floating-image-import.test.js; tests/unit/writer-docx-audit.test.js; tests/test_writer_section_headerfooter_postprocess.py; this handoff.
COMMANDS RUN: `python _roundtrip_save_writer_edit.py <worktree> "<worktree>\file test\aquara  final (1) (2).docx" _rt_edit.docx`; same exact script for MYTIME; `_roundtrip_save_writer.py` for pristine Aquara; Word COM `_word_oracle.ps1`; DOCX ZIP measurements; `python -m unittest tests.test_writer_section_headerfooter_postprocess`; `npm test`; `git diff --check`.
BUILD RESULT: PASS - `npm test` includes syntax validation of 92 JavaScript files.
TEST RESULTS: PASS - JavaScript 1723/1723; Python Writer postprocess 26/26. Exact app measurement: Aquara edit output 22,757,962 B, SHA-256 f324878d4d337eca0939a981b59db7c4ffe7c1b1aac8dd3a2b8b7cc087bbc7d2 (source 01e4884eadb55282162a9aba9ab13325282e56098aa67bf871d8fcb331c672e7), `ZZ` present once, 16 Word pages, 11 `wp:anchor`, 9 page breaks, Word opens OK. MYTIME edit output 34,516,080 B, SHA-256 66ed2478b8f20862f6b07c3c34894e5358b15081a3b7fcc5edce7e7b9e45bf3b, `ZZ` present once, 88 Word pages, 137 anchors, 43 page breaks, Word opens OK. Pristine Aquara output 23,771,853 B and SHA-256 exactly equals source.
KNOWN FAILURES: None.
RISKS: Native-group text transplantation is deliberately limited to short anchor-heavy catalogues and simple inserted text that ends with an existing native text run; other edits continue through LibreOffice rather than guessing.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): N/A - adapter/postprocess only.
NEXT ACTION: Merge the committed regression fix.
