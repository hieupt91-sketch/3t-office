# Agent Handoff

TASK: Writer DOCX anchor passthrough
AGENT/ROLE: Codex / Writer integration
BRANCH: fix/writer-anchor-passthrough
WORKTREE: E:\VNOffice-codex-writer-anchors
OBJECTIVE: Preserve non-editable Word floating drawings and their package dependencies across VN Writer save.
FINDINGS: LibreOffice rasterizes WPG/WPS drawings during DOCX-to-HTML conversion. It can also emit many generated anchors, so global ordinal matching is unsafe. Changing relativeFrom while retaining LibreOffice posOffset shifts editable text boxes by the page margin.
IMPLEMENTATION SUMMARY: Match unique wp:docPr names first. Between stable name matches, allow only a conservative first group/shape-to-generated-picture fallback. Copy the source wp:anchor, allocate collision-free rIds and docPr ids, copy referenced internal media, retain external hyperlink relationships, and add missing image content-type defaults. Editable text boxes retain LibreOffice coordinate origins. Behind-page wrapNone pictures are returned to a body paragraph selected from nearby normalized source text, which preserves MYTIME screenshots without changing its 88-page count.
FILES CHANGED: adapters/libreoffice/common/ooxml_zip_patch.py; tests/test_writer_anchor_passthrough.py; tests/test_writer_section_headerfooter_postprocess.py; platform/help/entries-writer.js; docs/HANDOFF-WRITER-ANCHOR-PASSTHROUGH.md
COMMANDS RUN: python unit tests; Writer Python test discovery; node scripts/check-syntax.js; node tests/run-tests.js; real round-trip helper; Word 2016 COM open/page oracle; Word 2016 PDF export; LibreOffice PDF-to-PNG conversion.
BUILD RESULT: PASS - node scripts/check-syntax.js (92/92).
TEST RESULTS: PASS - node tests/run-tests.js (1714/1714); python Writer discovery (29/29); focused anchor passthrough (2/2); real Word 2016 checks below.
KNOWN FAILURES: None.
RISKS: Ambiguous unnamed/duplicate-name drawings remain LibreOffice output rather than being guessed. Complex non-behind groups after the first unmatched group in a segment are intentionally not replaced when their safe ownership cannot be proven.
DEPENDENCIES/BLOCKERS: Microsoft Word 2016 and LibreOffice were available locally for verification.
CORE PATCH ID (if any): None; Adapter-layer package patch only.
NEXT ACTION: Review the conservative ambiguity policy if Writer later supports editing floating objects directly.

## Real Word 2016 verification

| Document | Word open | Pages | Visual comparison |
|---|---:|---:|---|
| Aquara round-trip | OK | 17 | Page 1 restored the purple full-page cover, Aqara and SM Connection logos, and CATALOG / GIỚI THIỆU SẢN PHẨM, matching `_word_png/aquara_orig_p1.png`. |
| MYTIME round-trip | OK | 88 | Page 3 restored both embedded setup screenshots and the diagonal MY Time watermark in the same page regions as `_word_png/mytime_word_p3.png`. |

Generated verification files were deliberately excluded from Git.


> **Correction 2026-09-14 (Claude):** every MYTIME page count in this document was measured with Word COM ComputeStatistics(wdStatisticPages), which is wrong in a hidden window (it reports 88 for a 44-page document). Word's PDF export of the original MYTIME has **44** pages; the edited-save output currently has **73** (43 section breaks lost). Use _word_oracle3.ps1 (PDF-based) going forward. See HANDOFF-WRITER-SAVE-SECTIONS*.md.
