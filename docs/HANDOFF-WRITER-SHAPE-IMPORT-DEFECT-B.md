# HANDOFF — Writer Shape Import Defect B

**TASK:** Writer DOCX import: restore Rectangle and Straight Connector shapes from source OOXML  
**AGENT/ROLE:** Codex / Writer adapter  
**BRANCH:** `fix/writer-shape-import-defectb-codex`  
**WORKTREE:** `E:\VNOffice-codex-writer-shape-import-b`  
**OBJECTIVE:** Restore missing d06 Rectangle and Straight Connector shapes by reading DrawingML/VML from the source DOCX and reusing the existing Writer canvas shape renderer.

## FINDINGS

- Read `docs/TASK-BRIEF-WRITER-SHAPE-IMPORT-DEFECT-B-CODEX.md`, `docs/HANDOFF-WRITER-SAVEBACK-R12.md`, and `docs/HANDOFF-WRITER-SAVEBACK-R13.md` before changes.
- The sample folder is not in this worktree. The sample set exists at the external path recorded by the prior handoffs: `E:\VN OFice\file test\landocx`.
- With `$env:LOCALAPPDATA = 'E:\VNOffice-profiles\codex'`, direct OOXML inspection of d06 found 60 `wp:anchor`, 91 `wps:wsp`, 38 `a:prstGeom prst="rect"`, and 54 `a:prstGeom prst="line"`. It also contains 59 `w:pict` and 54 `v:line` elements.
- Among the 60 anchored drawings, 36 anchors contain standalone line geometry, 20 contain standalone rect geometry, two contain grouped rect geometry, one contains grouped line geometry, and one contains a picture. The 38 rect geometries therefore do not directly equal the 37 Rectangle objects reported in the task brief; grouped content and representation mapping must be resolved before deciding what to instantiate.
- Stage 1 LibreOffice DOCX-to-HTML baseline: 60 `<img>`, 0 `<svg>`, 0 `<hr>`, and 0 VML line/shape elements. This confirms no HTML carrier exists for the missing source shapes.
- The 54 DrawingML line geometries and 54 VML `v:line` elements coexist in the same source package. A safe one-to-one relationship, duplicate policy, coordinate source, and z-order mapping have not been established. d06 also contains grouped anchors. This is the complex multi-variant case explicitly covered by the task brief's stop rule.

## IMPLEMENTATION SUMMARY

No source code was changed. Stopped before implementation under the brief's instruction to stop and document when VML/DrawingML variants are more complex than expected. No import/render mechanism was invented.

## FILES CHANGED

- `docs/HANDOFF-WRITER-SHAPE-IMPORT-DEFECT-B.md`

## COMMANDS RUN

- Read the task brief and R12/R13 handoffs.
- Checked tracked worktree status; it was clean at start.
- Confirmed sample availability at `E:\VN OFice\file test\landocx\d06.docx`.
- Inspected d06 `word/document.xml` for DrawingML/VML counts and anchor grouping.
- Ran LibreOffice DOCX-to-HTML on d06 with the required `LOCALAPPDATA` profile and counted resulting drawing representations.

## BUILD RESULT

NOT RUN — implementation stopped at the task brief's complexity gate.

## TEST RESULTS

NOT RUN — implementation stopped at the task brief's complexity gate. The 23-file regression pass was not run.

## KNOWN FAILURES

- Existing import path loses the Rectangle and Connector objects before the app receives LibreOffice HTML, as described in R12/R13.
- No after measurement exists because no implementation was made.

## RISKS

- Treating the parallel DrawingML and VML connector records as independent shapes could double the 54 connectors.
- Treating grouped geometry as standalone canvas shapes could change grouping, z-order, and position.
- `wp:docPr name` must be retained for save-back identity, but the shape identity mapping has not been resolved.

## DEPENDENCIES/BLOCKERS

A focused OOXML mapping pass is needed to determine whether the 54 VML `v:line` objects correspond one-to-one to DrawingML line shapes, and to identify the exact 37 Rectangle records (including group and VML representation rules). Then establish supported coordinate frames (`relativeFrom`, offsets, extents, page and paragraph anchoring) against d06 before wiring those records through the existing `this.shapes` / `renderShapeSvg` canvas path. The 23-file canvas regression and `node tests/run-tests.js` remain pending implementation.

## CORE PATCH ID (if any)

None.

## NEXT ACTION

Resume in a follow-up scope after the mapping pass establishes a deterministic, non-duplicating shape set and coordinate conversion for the d06 source. Preserve the current task constraints and run the requested d06 before/after checks plus all 23 valid DOCX files after implementation.
