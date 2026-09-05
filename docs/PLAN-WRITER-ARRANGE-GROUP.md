# Plan: VN Writer Arrange Group

## Objective

Add a contextual image-formatting surface for Writer images, with CSS-backed text wrapping, nine page-position presets, stacking order, and page alignment.

## Current capability

- Writer inserts a plain `<img>` into `.vno-writer-body` through `document.execCommand("insertHTML")`.
- Undo/redo snapshots preserve Writer DOM HTML.
- Save and PDF export send `_contentForExport()` HTML through the existing LibreOffice bridge.
- Imported DOCX is normalized from LibreOffice StarWriter HTML.

## Files and modules

- `apps/writer/writer-arrange.js`: Writer-owned image selection, arrangement operations, and contextual UI.
- `apps/writer/writer-app.js`: lifecycle integration only.
- `apps/writer/writer.css`: selected-image and contextual-group states.
- `adapters/libreoffice/writer/writer-adapter.js`: reuse insertion, history, import, and export boundaries.
- `tests/unit/writer-arrange.test.js`, `tests/live/writer-arrange.playwright.mjs`, and real-conversion test coverage.
- `docs/HANDOFF-WRITER-ARRANGE-GROUP.md`: completion evidence and real fidelity limits.

No Sheet, Slides, platform, shared command, build-system, external dependency, or LibreOffice Core changes are planned.

## Dependencies

- Reuse WriterAdapter snapshot/history and HTML save/export pipeline.
- Reuse the existing Writer ribbon DOM and app lifecycle.
- Use native CSS and DOM APIs only.

## Risks

- LibreOffice's HTML import may translate or discard some CSS positioning, float, and z-index semantics in DOCX.
- Absolute positioning must be anchored to the Writer page without removing the image from saved HTML.
- Contextual UI must disappear on non-image selection and after Writer unmount.

## Test plan

- Behavioral tests for Square/Tight/In Line/Behind/In Front, all nine position presets, stacking order, and alignment.
- Live Playwright test using real clicks and a real file chooser; no SendKeys.
- Real soffice DOCX round trip plus PDF generation and artifact inspection.
- `node tests/run-tests.js` must finish in under 60 seconds with 100% PASS.

## Rollback

Revert the feature commits on `feature/writer-arrange-group`. There is no schema migration, external state, or Core patch.
