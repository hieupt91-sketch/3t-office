# Agent Handoff
TASK: Brief 6 — preserve floating-anchor/page-break carrier paragraphs after edited DOCX save
AGENT/ROLE: Codex / Writer integration
BRANCH: fix/writer-spacing-align-cover
WORKTREE: E:\VNOffice-codex-writer-spacing
OBJECTIVE: Keep untouched carriers in their original paragraph slots after another paragraph is edited, without recreating a user-deleted carrier.
FINDINGS: LibreOffice drops paragraph section boundaries during HTML-to-DOCX conversion and may expand grouped drawings into transient flow paragraphs. Document-wide pristine gating therefore cannot repair edited files.
IMPLEMENTATION SUMMARY: Added per-paragraph untouched-marker relocation, bounded empty-carrier matching, section-to-page-break normalization, conservative lossless handling for already-present emphasis edits, and page-break paragraph export semantics.
FILES CHANGED: adapters/libreoffice/common/ooxml_zip_patch.py; adapters/libreoffice/writer/writer-adapter.js; tests/test_writer_section_headerfooter_postprocess.py; tests/unit/writer-floating-image-import.test.js; docs/HANDOFF-WRITER-EDITED-DOC-CARRIERS.md
COMMANDS RUN: python -m unittest tests.test_writer_section_headerfooter_postprocess; node tests/unit/writer-floating-image-import.test.js; npm test; real desktop edit/save harness for Aquara and MYTIME; Microsoft Word COM page-count verification; DOCX anchor-map verification.
BUILD RESULT: PASS — npm test completed.
TEST RESULTS: PASS — 1721/1721 automated tests. Real app: Aquara 16 pages, 9 PB, 11 anchors; MYTIME 88 pages, 43 PB, 137 anchors; bold markup retained.
KNOWN FAILURES: None.
RISKS: Lossless-source normalization is intentionally gated to documents where every safe floating carrier survives and each unmarked emphasis edit already exists in the matching source paragraph.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): N/A — adapter/post-process only.
NEXT ACTION: None.


> **Correction 2026-09-14 (Claude):** every MYTIME page count in this document was measured with Word COM ComputeStatistics(wdStatisticPages), which is wrong in a hidden window (it reports 88 for a 44-page document). Word's PDF export of the original MYTIME has **44** pages; the edited-save output currently has **73** (43 section breaks lost). Use _word_oracle3.ps1 (PDF-based) going forward. See HANDOFF-WRITER-SAVE-SECTIONS*.md.
