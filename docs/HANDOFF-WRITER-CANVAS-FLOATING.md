# Agent Handoff

TASK: VN Writer floating-frame canvas display
AGENT/ROLE: Codex / Writer UI
BRANCH: fix/writer-anchor-passthrough
WORKTREE: E:\VNOffice-codex-writer-anchors
OBJECTIVE: Render imported Word floating images and text boxes from the correct page/margin origin in the editor and Print Preview.
FINDINGS: LibreOffice HTML positions an absolute frame inside its anchor paragraph. A negative paragraph margin therefore shifted a page-relative frame twice. Absolute frames also had no flow reservation for wrapTopAndBottom, and the generic preview image rule distorted explicit floating geometry.
IMPLEMENTATION SUMMARY: Keep page/margin floating image anchor paragraphs static, retain paragraph-relative text-box containers, compensate negative paragraph indentation for page-relative x coordinates, apply imported page margins to margin/column origins, prefer native OOXML group offsets/extents over raster HTML geometry, reserve vertical flow for wrapTopAndBottom, retain document-order z-index, and share floating image sizing/layer CSS with Print Preview. Save/export preparation was not changed.
FILES CHANGED: adapters/libreoffice/writer/writer-adapter.js; apps/writer/writer.css; tests/unit/writer-floating-image-import.test.js; platform/help/entries-writer.js; docs/HANDOFF-WRITER-CANVAS-FLOATING.md
COMMANDS RUN: focused floating-frame unit module; node scripts/check-syntax.js; node tests/run-tests.js; desktop main.py with real Aquara DOCX; non-interactive desktop screenshots.
BUILD RESULT: PASS - node scripts/check-syntax.js (92/92).
TEST RESULTS: PASS - focused floating-frame module (27/27); node tests/run-tests.js (1717/1717). Real desktop visual inspection recorded below.
KNOWN FAILURES: The LibreOffice HTML raster for the Aquara WPG cover is blue and contains later-page fragments; the display layer now places/crops it from the native Word geometry but cannot reconstruct vector content absent from HTML. DOCX save fidelity is handled by the preceding adapter commit.
RISKS: Documents with mixed horizontal page and vertical paragraph anchoring still depend on LibreOffice's HTML paragraph placement. CSS cannot reproduce Word wrapSquare contour geometry; it retains the existing rectangular behavior.
DEPENDENCIES/BLOCKERS: Real screenshots are kept outside Git under `_word_png`; generated `_app_after*.png` files are excluded and removed before commit.
CORE PATCH ID (if any): None.
NEXT ACTION: Add an import-side OOXML media/group sidecar if exact WPG vector canvas content becomes required; this is distinct from display-coordinate correction.

## Visual verification

| View | Before/reference | After | Result |
|---|---|---|---|
| Aquara page 1 | `_word_png/aquara_word_p1.png`; `_word_png/aquara_app_p1.png` | `_app_after3.png` (excluded before commit) | Page-relative geometry no longer double-counts the -2.54 cm paragraph margin; remaining content mismatch is the LibreOffice group raster limitation above. |
| Aquara page 2 | `_word_png/aquara_word_p2.png` | Desktop inspection | Top-and-bottom anchors reserve flow; later text is no longer intentionally treated as wrapNone. |
| MYTIME image page | `_word_png/mytime_word_p3.png` | Desktop/import logic plus shared Print Preview CSS | Native picture geometry and explicit width/height are retained; no max-width downscaling is applied to floating images. |
