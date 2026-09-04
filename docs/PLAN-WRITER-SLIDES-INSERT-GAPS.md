# Plan — Writer & Slides Insert tab gaps (observed Microsoft Word / PowerPoint)

## Objective

Close the specified Insert-tab gaps in VN Writer and VN Slides so the ribbon groups match the installed Microsoft Word and PowerPoint Insert tabs, with live handlers (no dead buttons) routed `Ribbon → Command Bus → LibreOffice Adapter → app model/DOM`.

Do not touch `apps/sheet/**` or `adapters/libreoffice/sheet/**`. Do not merge to `main`.

## Current capability / reuse

- Writer already has Pages (page break), Tables, Illustrations (Pictures/Shapes/SmartArt/Chart), Hyperlink, Header & Footer, Comments (Review), TOC & Notes.
- Writer shapes layer already supports drag-move; Text Box reuses that layer with `type: "textbox"` and editable text.
- Slides already has Pictures, Shapes, SmartArt, Text Box (`slides.text.insert`), Comments, Video/Audio, and a draggable/resizable shapes layer.
- Slides already renders a master footer with page index; Header & Footer / Date / Slide Number extend that placeholder, they do not invent a second chrome layer.
- Shared Command Bus, UNO mapper, i18n catalogs, and SVG icon registry already exist. New commands must be added to **all four**: definitions, UNO map, `handleDispatch`, i18n VI/EN.

## Files / modules

- `platform/ui-kit/symbol-picker.js` — shared special-character picker (Writer + Slides).
- `platform/ui-kit/datetime-picker.js` — shared date/time format helper + dialog.
- `platform/ui-kit/icons.js`, `platform/ui-kit/ui-kit.css` — vector icons and picker styles.
- `platform/commands/command-definitions.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`.
- `adapters/libreoffice/common/command-dispatch-mapper.js` — required so `CommandBus.execute()` binds via UnoBridge.
- `apps/writer/writer-ribbon.js`, `apps/writer/insert-dialogs.js`, `apps/writer/writer.css`.
- `adapters/libreoffice/writer/writer-adapter.js` — handlers (UI never calls LibreOffice internals).
- `apps/slides/slides-ribbon.js`, `apps/slides/insert-dialogs.js`, `apps/slides/slides-canvas.js`, `apps/slides/slides.css`.
- `adapters/libreoffice/slides/slides-adapter.js`.
- `tests/unit/writer-slides-insert-gaps.test.js`, `tests/live/writer-slides-insert-gaps.playwright.mjs`, `tests/run-tests.js`.
- `docs/HANDOFF-WRITER-SLIDES-INSERT-GAPS.md`.

## Dependencies

No product dependency. No Core/upstream patch. Live audit uses installed Edge and the existing external `playwright-core` path.

## Risks

- Forgetting the UNO map leaves `CommandBus.execute()` unbound even if `handleDispatch` has a case. Tests must call `globalCommandBus.execute()`, not only `adapter.handleDispatch()`.
- Writer Text Box must remain independently draggable without stealing caret from the document body.
- Drop Cap must wrap the first letter of the current paragraph and be undoable via existing snapshot history.
- Equation is a **reduced** text/MathML-style box, not Word’s full equation editor.
- Slides Table must persist in `slide.shapes` so FODP save already serializes it.
- Header/Footer placeholders must auto-update on slide change and not collide with Slide Master footer.

## Test plan

- Unit: ribbon group order, command metadata, UNO two-way mapping, i18n VI/EN, adapter behavior with options (no dialog), and `CommandBus.execute()` through the UnoBridge bind path.
- Playwright (real Edge, real mouse/keyboard): Writer Insert Symbol/Date/Text Box/Drop Cap/Bookmark/Equation/Cross-reference; Slides Insert Table/Symbol/Header&Footer/Date/Slide Number.
- `node tests/run-tests.js` under 60 seconds, 100% PASS.
- `node --check` on changed JS. `git diff --check`.

## Rollback

Task commits land separately (plan, shared platform, Writer, Slides, tests/handoff). Revert in reverse order. No migration, dependency, or Core patch.

## Explicitly skipped (observed but out of scope)

Writer: Cover Page, Blank Page (Page Break already exists), Quick Parts, WordArt, Signature Line, Object, Store/My Add-ins, Wikipedia.
Slides: Photo Album, Screenshot, Online Pictures, Action, WordArt, Object, Add-ins, Equation (Writer-only reduced editor).
