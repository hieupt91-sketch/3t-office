# Plan — Ribbon gaps observed in Microsoft Office

## Objective

Close the specified Home-tab gaps in VN Sheet and VN Writer while preserving the route `Ribbon → Command Bus → LibreOffice Adapter → app model/DOM` and leaving Slides untouched.

## Current capability / reuse

- Reuse the existing ribbon `select` pattern from Writer and the existing Sheet selection/style/history/rendering machinery.
- Reuse `SheetGridController.applyNumberFormat()` for the quick number category and decimal controls.
- Reuse Writer's current contenteditable commands, snapshot history, selection helpers, and adapter dispatch path.
- Extend existing command definitions, i18n dictionaries, and SVG icon registry; add no dependency and make no LibreOffice Core patch.

## Files / modules

- `apps/sheet/sheet-ribbon.js`, `sheet-grid.js`, `sheet.css`: Home ribbon layout, selected-cell formatting, wrapping/row presentation.
- `apps/writer/writer-ribbon.js`, `writer.css`: Home ribbon placement and formatting-mark presentation.
- `adapters/libreoffice/sheet/sheet-adapter.js`, `adapters/libreoffice/writer/writer-adapter.js`: required command-to-app abstraction handlers. These are the existing adapters explicitly referenced by the requested behavior; UI will not call implementation internals.
- `platform/commands/command-definitions.js`, `platform/i18n/*`, `platform/ui-kit/icons.js`: shared command metadata, localization, and vector icons.
- `tests/unit/*`, `tests/live/ribbon-gaps-real-office.playwright.mjs`, `tests/run-tests.js`: regression and real mouse/keyboard coverage.
- `docs/HANDOFF-RIBBON-GAPS-REAL-OFFICE.md`: final evidence and review handoff.

## Dependencies

No product dependency. The live audit uses the machine's installed Edge and externally available `playwright-core`, matching existing repository practice.

## Risks

- Virtualized Sheet rows must reapply styles after scrolling and avoid stale CSS when a style is removed.
- Wrap Text must not corrupt explicit row heights; dynamic visible height needs deterministic restoration.
- Writer sorting must preserve block markup, selection/focus, and undo history.
- Show/Hide marks are a view state and must not alter saved document content.
- Paragraph shading/borders must apply to the containing blocks, including table cells, without colliding with page borders.

## Test plan

- Add behavioral coverage for ribbon order, commands, style persistence, size steps, vertical alignment, wrapping, indent bounds, quick number categories/decimals, Writer sort/marks/shading/borders/change-case icon.
- Add Playwright coverage that clicks real ribbon controls and types/selects through real browser input; assert rendered cells/document DOM and zero page errors.
- Run syntax checks, `node tests/run-tests.js` with measured duration (<60 seconds), live Playwright, and `git diff --check`.

## Rollback

Each numbered task lands in its own commit. Reviewers can revert an individual task commit in reverse order; there is no data migration, dependency, or Core patch.
