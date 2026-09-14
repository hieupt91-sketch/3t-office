# Agent Handoff

TASK: VN Writer canvas — page-relative floating frames (Word WPG cover groups, page-anchored text boxes) landed on page 1 and hid the Aquara cover; canvas said "Trang 1 / 1", "0 words" after open
AGENT/ROLE: agy (rounds 1–3) + Claude (verification, structural fixes) / Writer UI + adapter import
BRANCH: fix/writer-canvas-page-floats
WORKTREE: E:\VNOffice-agy-writer-floats
OBJECTIVE: Open `aquara  final (1) (2).docx` and see the same 16 pages as Word 2016 — cover on page 1, logo + "CÂU CHUYỆN THƯƠNG HIỆU" on page 2 — without changing the saved DOCX (16 pages, MYTIME 88).

FINDINGS (all measured on the real app, `_probe_writer_dom.py` / `_probe_blocks.py` / `_capture_vnwriter_scroll.py`):
- `_ooxmlFloatingAnchorMetadata` was consumed sequentially (`anchors[anchorIndex++]`) for every absolutely positioned LibreOffice span: 11 `wp:anchor` vs 148 spans → group extents (14.6×21.3 cm, white background) were assigned to text boxes, which covered the cover raster.
- LibreOffice HTML keeps the 11 group rasters (`sd-abs-pos` Shape1..Shape11/Picture N, exact `wp:anchor` order) and the `textboxN` frames in their anchor paragraphs, but dumps the 125 at-page `FrameN` text frames into paragraph 0 with page-relative `top` and no page information; inline groups (`wp:inline` + `wpg:wgp`) are exported as a plain `<img name="ShapeN">` plus loose frames.
- LibreOffice text frames are `<span><p>…</p></span>`; wrapping the carrier paragraph in `<p>` made the browser auto-close it, so frames and the paragraph text spilled into `body` as loose siblings (the spilled absolute spans then inflated live pagination to 23 pages).
- `_recomputeLivePagination` only counted `page-break-before` carriers; it never inserted a visual gap, so every explicit page started on the same sheet as the previous one and page-relative floats of pages 2–16 stacked on page 1.
- Writing the live-aligned `top` into `element.style` re-serialized the style attribute (`border:none` → `border-width:medium;…`), which changed the undo snapshot and the pristine/untouched fingerprints: an unedited Aquara took the general export path (18 pages, 13.5 MB) instead of the pristine shortcut (16 pages, original bytes).
- The print preview clipped page-relative floats at the text area (`.vno-print-preview-body{overflow:hidden}`), so the cover raster started 25 mm inside the page.

IMPLEMENTATION SUMMARY:
1. Anchor metadata is mapped by raster index only (`sd-abs-pos` image k ↔ `wp:anchor` k); text frames never take group metadata.
2. `_ooxmlGroupChildTextboxes` reads every `wps:wsp` text box of anchored and inline groups (text, `a:off/a:ext` in `a:chOff/a:chExt` space, `a:solidFill`); frames are matched by normalized text (exact, then containment) and moved next to raster k with page-relative geometry, or into a `position:relative; display:inline-block` wrapper around the inline group image with group-local geometry. Unmatched frames keep their LibreOffice geometry.
3. `_makeFloatingAnchorContainers` wraps any carrier that contains block descendants in `<div data-vno-float-anchor>` (position:relative, reserve = min(top+height−margin, usable page height)); `_prepareFloatingFramesForExport` re-emits a div carrier's page break as an empty `<p style="page-break-before:always">` so LibreOffice still breaks the page.
4. `_recomputeLivePagination` inserts `.vno-page-auto-gap` before manual/imported page breaks (not before the first block) and then `_alignPageRelativeFloats` computes `top = (topCm − marginTopCm)px − (container.offsetTop − pageStartTop)` per float and writes it to a `<style id="vno-live-float-tops">` sheet keyed by `data-vno-float-id` (assigned once at import) — element styles are never touched.
5. Raster z-index 1, group text boxes z-index 2 (the page-2 raster used to paint over its text).
6. Open now triggers live pagination + word count (`Trang 1 / 16`, `1689 từ`).
7. Print preview: `.vno-print-preview-sheet{overflow:hidden}`, body `overflow:visible`.

FILES CHANGED: adapters/libreoffice/writer/writer-adapter.js; apps/writer/writer.css; tests/unit/writer-floating-image-import.test.js; docs/HANDOFF-WRITER-CANVAS-PAGE-FLOATS.md
COMMANDS RUN: node scripts/check-syntax.js; node tests/run-tests.js; python -m unittest discover -s tests -p "test_writer*.py"; real app probes/captures (`_probe_writer_dom.py`, `_probe_blocks.py`, `_capture_vnwriter_scroll.py`, `_preview_pages.py`); `_roundtrip_save_writer.py` / `_roundtrip_save_writer_edit.py` + Word 2016 COM `_word_oracle3.ps1`.
BUILD RESULT: PASS — syntax check; node tests 1743/1743; python writer tests OK.
TEST RESULTS (real measurements, 2026-09-14):
| Check | Before | After | Word 2016 |
|---|---:|---:|---:|
| Aquara canvas page count after open | 1 (status never updated) | 16 | 16 |
| Aquara canvas page 1 | white text boxes of pages 5–8 over the cover | blue cover, logos, CATALOG / GIỚI THIỆU SẢN PHẨM (`_r4_p1.png`) | `_word_png/aquara_word.png` |
| Aquara canvas page 2 | — | logo + CÂU CHUYỆN THƯƠNG HIỆU + paragraphs (`_r4_p2.png`) | `_word_png/aquara_p2.png` |
| Aquara print preview | 16 sheets, cover clipped 25 mm inside | 16 sheets, cover edge-to-edge (`_preview_aq2.png`) | 16 |
| Save unedited Aquara | 16 (pristine shortcut) | 16, original bytes (pristine shortcut intact) | 16 |
| Save Aquara with "ZZ" + bold | 16 | 16, "ZZ" present | 16 |
| Save MYTIME with edit | 88 | 88 | 88 |
| Floats with zero geometry / spilled into body | 113 / 82 | 0 / 0 | — |
KNOWN FAILURES:
- Canvas body starts 38 px below the top margin (page padding 94.5 px + 26 px header + 12 px gap) while Word keeps the header inside the margin; every page-relative float and all text sit 38 px lower than Word and the usable height is 38 px shorter. Needs the header/footer positioned inside the margins.
- The single-sheet canvas simulates page boundaries with a fixed 64 px gap (+16 px margins); floats that extend into the top margin overlap that gap band visually.
- MYTIME canvas and print preview count 44 pages (Word 88): overflow inside sections is not produced (paragraph-relative images do not reserve flow height the way Word does). Not caused by this branch.
- The LibreOffice raster of a WPG group is a bitmap (page 1 has a white strip on the right); vector reconstruction would need a media sidecar.
- Aquara group text boxes edited in the canvas are still saved through the text-transplant path (native XML); geometry edits to those boxes are not persisted.
RISKS: Documents whose anchor carrier contains blocks now export `<p PB></p><div>` instead of `<p PB>`; verified on Aquara/MYTIME only. `_ooxmlGroupChildTextboxes` matches by text — duplicated box texts inside one group are matched in document order.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Move header/footer into the page margins (canvas layout), then re-measure Aquara/MYTIME float positions against Word page PNGs; investigate MYTIME 44 vs 88 (reserve for paragraph-relative wrapTopAndBottom images + section page sizes).
