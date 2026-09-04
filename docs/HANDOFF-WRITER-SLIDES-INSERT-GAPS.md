# Agent Handoff

TASK: Close Writer and Slides Insert-tab gaps observed against installed Microsoft Word and PowerPoint.
AGENT/ROLE: Grok — Writer + Slides Insert ribbon implementation.
BRANCH: `feature/writer-slides-insert-gaps`
WORKTREE: `E:\VNOffice-grok-insert-gaps`
OBJECTIVE: Add the specified Insert controls so ribbon group order matches Word/PowerPoint, with live CommandBus handlers (UNO mapping + adapter dispatch), shared Symbol picker, and real Edge/Playwright coverage. Do not touch Sheet. Do not merge to `main`.

FINDINGS:
- Worktree/branch already existed, clean, based on `main` at `28af7af`. Confirmed `git branch --show-current` = `feature/writer-slides-insert-gaps`.
- Writer Insert already had Pages (page break), Tables, Illustrations, Hyperlink, Header & Footer, plus extra TOC & Notes. Missing Text, Symbols, Bookmark, Cross-reference, and Comments on Insert.
- Slides Insert was a single “Images & Objects” cluster plus Media. Missing Tables, Header & Footer, Date & Time, Slide Number, Symbol, and Word-like group order.
- Runtime ribbon clicks go through `CommandBus.execute()`. UnoBridge only `bindHandler()`s commands with a `mapVnCommandToUno()` hit. New commands therefore needed definitions + UNO map + `handleDispatch` (Writer also binds in `attach()`).
- Writer shapes layer already supported drag-move; Text Box reuses it as `type: "textbox"` with editable text and a SE resize handle.
- Slides already rendered a master footer with page index; Date / Slide Number / Header & Footer extend that placeholder instead of a second chrome layer.

IMPLEMENTATION SUMMARY:

## Writer Insert (Word order)

Pages | Tables | Illustrations | Links | Comments | Header & Footer | Text | Symbols | (kept existing TOC & Notes)

| Command | Status | Behavior |
|---|---|---|
| `writer.insert.textbox` | Done | Independent draggable/resizable text frame on the shapes layer |
| `writer.format.dropCap` | Done | First letter of current paragraph floats at ~3em for 2–3 lines; click again to remove |
| `writer.insert.dateTime` | Done | Dialog of formats; inserts current date/time at caret |
| `writer.insert.equation` | Done, **reduced** | Styled math text box / presets (`E = mc²`, quadratic…). No graphical equation designer |
| `writer.insert.symbol` | Done | Shared picker (© ® ™ ° ± § × ÷ arrows, basic math) |
| `writer.insert.bookmark` | Done | Named `<a id>` anchor |
| `writer.insert.crossReference` | Done, **reduced** | Internal link to a heading or bookmark name |
| Hyperlink / Comments / Header & Footer / Illustrations / Table / Page Break | Already present; Comments also shown on Insert to match Word |

## Slides Insert (PowerPoint order)

Tables | Images | Illustrations | Comments | Text | Symbols | Media

| Command | Status | Behavior |
|---|---|---|
| `slides.insert.table` | Done | Row/column dialog; HTML table stored in `slide.shapes`, drag/resize like other shapes |
| `slides.insert.headerFooter` | Done | Dialog: date, slide number, footer text, apply to all or current |
| `slides.insert.dateTime` | Done | Auto-updating date placeholder in the footer bar |
| `slides.insert.slideNumber` | Done | Auto-updating `Trang n / N` placeholder |
| `slides.insert.symbol` | Done | Same shared picker; inserts into selected text shape or slide body |
| Text Box / Pictures / Shapes / SmartArt / Comments / Video / Audio | Already present, regrouped |

## Skipped (explicit, out of scope)

Writer: Cover Page, Blank Page (Page Break already exists), Quick Parts, WordArt, Signature Line, Object, Store/My Add-ins, Wikipedia.
Slides: Photo Album, Screenshot, Online Pictures, Action, WordArt, Object, Add-ins, Equation (Writer-only reduced editor).

FILES CHANGED:
- `platform/ui-kit/symbol-picker.js`, `platform/ui-kit/datetime-picker.js`, `platform/ui-kit/icons.js`, `platform/ui-kit/ui-kit.css`
- `platform/commands/command-definitions.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`
- `adapters/libreoffice/common/command-dispatch-mapper.js`
- `apps/writer/writer-ribbon.js`, `apps/writer/insert-dialogs.js`, `apps/writer/writer.css`, `adapters/libreoffice/writer/writer-adapter.js`
- `apps/slides/slides-ribbon.js`, `apps/slides/insert-dialogs.js`, `apps/slides/slides-canvas.js`, `apps/slides/slides.css`, `adapters/libreoffice/slides/slides-adapter.js`
- `tests/unit/writer-slides-insert-gaps.test.js`, `tests/live/writer-slides-insert-gaps.playwright.mjs`, `tests/run-tests.js`
- `docs/PLAN-WRITER-SLIDES-INSERT-GAPS.md`, this handoff

COMMANDS RUN:
- `git status` / `git branch --show-current` — worktree `E:\VNOffice-grok-insert-gaps`, branch `feature/writer-slides-insert-gaps`
- `node --check` on changed JS modules
- `node tests/run-tests.js`
- `node tests/live/writer-slides-insert-gaps.playwright.mjs` against installed Edge + `playwright-core`
- `git diff --check`

BUILD RESULT: PASS — no compile build; syntax/integrity suite passed.

TEST RESULTS:
- Unit: **PASS** `627/627`, `0 FAIL`, elapsed **~12.6s** (< 60s).
- Live Playwright (Edge, real mouse/keyboard): **PASS** all 15 assertions, zero page errors:
  - Writer: Symbol ©, Date & Time span, Text Box, Drop Cap, Equation, Bookmark, Cross-reference, `CommandBus.execute("writer.insert.symbol")`
  - Slides: Table 2×3, Header & Footer date+footer, Slide Number, Symbol ™, `CommandBus.execute("slides.insert.table")`

KNOWN FAILURES: None.

RISKS:
- Equation is a reduced text box, not Word’s OMML designer.
- Cross-reference is heading/bookmark name as an internal `<a href="#id">`, not Word’s full field types (page number, “above/below”).
- Slides Date/Slide Number live in the master footer bar and update on `selectSlide`; they are placeholders, not free-floating shapes.
- Writer Text Box lives on the floating shapes layer (like Shapes), not in the text flow.

DEPENDENCIES/BLOCKERS: No product dependency added. Live test uses installed Edge and existing external `playwright-core`. Sheet tree untouched. No blocker.

CORE PATCH ID (if any): N/A — no Core/upstream patch.

NEXT ACTION: Claude reviews the commits and decides whether to merge; do **not** merge automatically.

## Commit map

- Plan gate
- Shared platform (picker, icons, commands, UNO map, i18n)
- Writer Insert handlers + ribbon
- Slides Insert handlers + ribbon
- Tests + this handoff

## Rollback

Revert those commits in reverse order. No migration, external dependency, file-format semantic change, or Core patch.
