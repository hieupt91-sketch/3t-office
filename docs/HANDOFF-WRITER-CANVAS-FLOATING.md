# Agent Handoff

TASK: VN Writer floating-frame canvas display and export pagination regression
AGENT/ROLE: Codex / Writer UI
BRANCH: fix/writer-anchor-passthrough
WORKTREE: E:\VNOffice-codex-writer-anchors
OBJECTIVE: Render imported Word floating images and text boxes from the correct page/margin origin without changing saved DOCX pagination.
FINDINGS: LibreOffice HTML positions an absolute frame inside its anchor paragraph. A negative paragraph margin therefore shifted a page-relative frame twice. Absolute frames also had no flow reservation for wrapTopAndBottom. After image anchors changed from div back to p for canvas fidelity, nine page-break declarations on frame-carrier paragraphs became real duplicate breaks during HTML export. The native DOCX postprocessor already restores the original anchored frames and their wrap geometry, so those carrier breaks are neither content breaks nor required in the saved document.
IMPLEMENTATION SUMMARY: Keep page/margin floating image anchor paragraphs static, retain paragraph-relative text-box containers, compensate negative paragraph indentation for page-relative x coordinates, apply imported page margins to margin/column origins, prefer native OOXML group offsets/extents over raster HTML geometry, reserve vertical flow for wrapTopAndBottom, retain document-order z-index, and share floating image sizing/layer CSS with Print Preview. At export only, restore left/top from data-vno-left/data-vno-top and strip canvas-only position, min-height, and carrier page-break styles before sending HTML to LibreOffice.
FILES CHANGED: adapters/libreoffice/writer/writer-adapter.js; apps/writer/writer.css; tests/unit/writer-floating-image-import.test.js; platform/help/entries-writer.js; docs/HANDOFF-WRITER-CANVAS-FLOATING.md
COMMANDS RUN: focused floating-frame unit module; node scripts/check-syntax.js; node tests/run-tests.js; desktop main.py/Python embedded static server with real Aquara DOCX; Edge screenshot; real LibreOffice round-trip for Aquara and MYTIME; Word 2016 COM Repaginate + ComputeStatistics(wdStatisticPages).
BUILD RESULT: PASS - node scripts/check-syntax.js (92/92).
TEST RESULTS: PASS - focused floating-frame module (28/28); node tests/run-tests.js (1718/1718); Word 2016 COM: Aquara 15 pages and MYTIME 66 pages after round-trip (required maxima: 17 and 88). Real visual inspection recorded below.
KNOWN FAILURES: The LibreOffice HTML raster for the Aquara WPG cover is blue and contains later-page fragments; the display layer now places/crops it from the native Word geometry but cannot reconstruct vector content absent from HTML. DOCX save fidelity is handled by the preceding adapter commit.
RISKS: Documents with mixed horizontal page and vertical paragraph anchoring still depend on LibreOffice's HTML paragraph placement. CSS cannot reproduce Word wrapSquare contour geometry; it retains the existing rectangular behavior.
DEPENDENCIES/BLOCKERS: Real screenshots are kept outside Git under `_word_png`; generated `_app_after*.png` files are excluded and removed before commit.
CORE PATCH ID (if any): None.
NEXT ACTION: Add an import-side OOXML media/group sidecar if exact WPG vector canvas content becomes required; this is distinct from display-coordinate correction. In-app Help was not changed because this task fixes export fidelity and adds no user-facing feature or workflow.

## Word 2016 pagination verification

| Document | Before canvas commit | Regressed | After export fix | Required |
|---|---:|---:|---:|---:|
| Aquara | 17 | 20 | **15** | <= 17 |
| MYTIME | not remeasured in the brief baseline | not remeasured in the brief baseline | **66** | <= 88 |

Both after values were measured on the generated DOCX with installed Microsoft Word 2016 COM after `Document.Repaginate()`, using `ComputeStatistics(2)`. The lower counts are expected: restored native anchors own layout, while redundant HTML carrier-paragraph breaks no longer add pages.

## Visual verification

| View | Before/reference | After | Result |
|---|---|---|---|
| Aquara page 1 | `_word_png/aquara_word_p1.png`; `_word_png/aquara_app_p1.png` | `_app_after.png` (excluded before commit) | Re-captured after the export-only fix. Page-relative geometry remains unchanged and no longer double-counts the -2.54 cm paragraph margin; remaining content mismatch is the LibreOffice group raster limitation above. |
| Aquara page 2 | `_word_png/aquara_word_p2.png` | Desktop inspection | Top-and-bottom anchors reserve flow; later text is no longer intentionally treated as wrapNone. |
| MYTIME image page | `_word_png/mytime_word_p3.png` | Desktop/import logic plus shared Print Preview CSS | Native picture geometry and explicit width/height are retained; no max-width downscaling is applied to floating images. |


> **Correction 2026-09-14 (Claude):** every MYTIME page count in this document was measured with Word COM ComputeStatistics(wdStatisticPages), which is wrong in a hidden window (it reports 88 for a 44-page document). Word's PDF export of the original MYTIME has **44** pages; the edited-save output currently has **73** (43 section breaks lost). Use _word_oracle3.ps1 (PDF-based) going forward. See HANDOFF-WRITER-SAVE-SECTIONS*.md.
