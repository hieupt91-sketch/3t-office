# Handoff: VN Writer Arrange Group

## Scope and branch

- Worktree: `E:\VNOffice-codex-writer-arrange-group`
- Branch: `feature/writer-arrange-group`, created from `main` at `ac5ed59e`
- Not merged into `main`
- Changed only Writer application code, the Writer LibreOffice adapter, related tests, and this task's docs. No Sheet/Slides source was changed.

The repository does not contain the referenced `/09-templates/AGENT-HANDOFF.md`; this handoff follows the structure used by the existing Writer handoff documents.

## Delivered

- A contextual `Định dạng Hình ảnh` tab. It is hidden until exactly one Writer `<img>` is selected and disappears when selection leaves the image.
- Wrap Text modes:
  - In Line with Text: `display:inline; float:none; position:static`
  - Square: `float:left`
  - Tight: simplified as `float:right`
  - Behind Text: `position:absolute; z-index:-1`
  - In Front of Text: `position:absolute; z-index:10`
  - Top and Bottom: block flow without float
- Nine fixed page-position presets using absolute `left`/`top` percentages plus transforms.
- Bring Forward / Send Backward update z-index and relative DOM stacking order, including images wrapped by separate paragraph containers.
- Align Left/Center/Right/Top/Middle/Bottom against the Writer body/page while preserving the other axis.
- Each operation participates in Writer's existing snapshot-based Undo/Redo and dirty state.
- Newly inserted images start as keyboard-focusable inline images. Delete/Backspace removes a selected image when focus is not in a form control.
- The selection outline is session-only and stripped from export HTML.

## Architecture

Writer continues to use its existing document model: images are plain `<img>` elements inside the contenteditable `.vno-writer-body`. `WriterArrangeController` is Writer-owned UI/application logic; it does not call LibreOffice internals. Save and export continue through `WriterAdapter._contentForExport()` and the existing LibreOffice bridge.

No external dependency, paid library, build-system change, shared-platform change, or LibreOffice Core patch was introduced.

## Verification

- `node tests/run-tests.js`: **PASS — 868/868**, 0 failures. Observed end-to-end wall time was about **47.6 seconds**, under the required 60 seconds.
- `node tests/live/writer-arrange.playwright.mjs`: **PASS — 10/10 checks** on a running Writer canvas in headless Edge. The test uses real clicks and Playwright's file chooser; no SendKeys.
- `node tests/live/writer-arrange-real-conversion.mjs`: **PASS** for real soffice HTML → DOCX → HTML image retention, Square/left alignment retention, and real PDF creation (observed PDF size 29,599 bytes).
- Syntax checks are also included in and passed by the master suite.

## Real DOCX/PDF fidelity limits

LibreOffice's StarWriter HTML importer preserves the image and translates Square `float:left` into a left-aligned Writer image through DOCX round trip. It does **not** preserve the exact CSS `position:absolute; left/top:100%; transform:...` representation on DOCX → HTML round trip. Custom `data-vno-*` attributes and exact CSS z-index/percentage coordinates are therefore not reliable after closing and reopening a DOCX.

Consequences:

- Session editing, Undo/Redo, and HTML sent to Save/PDF contain all selected styles.
- Square wrapping has verified DOCX round-trip fidelity.
- PDF is generated successfully by real soffice, but the test does not claim pixel-identical absolute coordinates.
- Tight, Behind/In Front, nine Position presets, Align coordinates, and z-order can be normalized by LibreOffice when saved as DOCX; exact restoration after reopening is **not guaranteed** with the current HTML bridge.
- Closing this gap reliably requires a richer Writer export/import representation (ODF/UNO anchored-frame or OOXML drawing metadata), which is outside this task's allowed Writer HTML adapter scope and should be a separately reviewed import/export task.

## Commits

- `3b59c98` — `docs(writer): plan contextual image arrange group`
- `bc4c48c` — `feat(writer): add contextual image arrange controls`
- `1e6c679` — `test(writer): verify arrange controls live and via soffice`

## Review notes

- Confirm contextual-tab behavior with imported DOCX images as well as newly inserted images.
- If exact Word-compatible anchoring becomes mandatory, plan an Adapter/import-export enhancement before changing LibreOffice Core.
