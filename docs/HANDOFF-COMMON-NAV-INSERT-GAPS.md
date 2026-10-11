# Agent Handoff

TASK: Common navigation shortcuts and VN Sheet Insert gaps
AGENT/ROLE: Codex / implementation and verification
BRANCH: `feature/common-nav-shortcuts-insert-gaps`
WORKTREE: `E:\VNOffice-codex-common-shortcuts`
OBJECTIVE: Add Ctrl+Home/Ctrl+End navigation to Sheet and Writer; add Sheet sparklines, hyperlinks, and floating text boxes with Excel-like Insert grouping.

FINDINGS:
- `UnoBridge._bindAllStandardCommands()` only binds definitions that have a truthy mapping in `command-dispatch-mapper.js`; all new commands therefore include mappings.
- Ctrl+K is intentionally owned by the shared `common.edit.hyperlink` shortcut. Sheet keeps `sheet.insert.hyperlink` as its Ribbon/API command, while `SheetAdapter` routes both IDs to the same implementation. This preserves suite-wide shortcut uniqueness.
- Sheet `cellsData` already aliases the active sheet, so End navigation can calculate the used-area endpoint without crossing sheet boundaries.

IMPLEMENTATION SUMMARY:
- Added `sheet.nav.home`, `sheet.nav.end`, `writer.nav.docStart`, and `writer.nav.docEnd`, including shortcuts, i18n, UNO mappings, and adapter dispatch.
- Sheet End scans non-empty value/formula entries and selects the maximum used row and maximum used column; Home selects A1. Both collapse any prior range selection and restore grid focus/scroll.
- Writer navigation creates a collapsed DOM Range at the beginning/end of the writer body, updates Selection, focuses the editor, and scrolls the boundary into view.
- Added Sheet Insert groups in order after Illustrations/Charts: Sparklines, Links, Text. Added line/column SVG sparklines in cells, safe `http(s)`/`mailto` hyperlinks, and editable/resizable floating text boxes.
- Added a dedicated Edge Playwright test covering real Ribbon clicks, keyboard shortcuts, dialogs, and `globalCommandBus.execute()`.

FILES CHANGED:
- `platform/commands/command-definitions.js`
- `platform/i18n/strings-en.js`
- `platform/i18n/strings-vi.js`
- `adapters/libreoffice/common/command-dispatch-mapper.js`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `adapters/libreoffice/writer/writer-adapter.js`
- `apps/sheet/sheet-grid.js`
- `apps/sheet/sheet-ribbon.js`
- `tests/live/common-nav-insert-gaps.playwright.mjs`
- `docs/HANDOFF-COMMON-NAV-INSERT-GAPS.md`

COMMANDS RUN:
- `node --check` on changed JavaScript/Playwright files
- `git diff --check`
- `node tests/run-tests.js` (measured with `System.Diagnostics.Stopwatch`)
- `node tests/live/common-nav-insert-gaps.playwright.mjs`

BUILD RESULT: NOT RUN — repository validation path for this change is the syntax suite plus browser runtime suite; no separate build command was requested or identified.

TEST RESULTS:
- PASS — `node tests/run-tests.js`: 616/616, 0 failures, 12.27 seconds (under 60 seconds).
- PASS — Edge Playwright using `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe` and the requested `playwright-core` installation.
- PASS — Sheet Home/End through `globalCommandBus.execute()`; Ctrl+Home/Ctrl+End through real keyboard input in Sheet and Writer; Ctrl+K through real keyboard input in Sheet.
- PASS — real clicks insert a line sparkline and a floating text box; hyperlink dialog creates a rendered safe link.

KNOWN FAILURES: None.

RISKS:
- Sparklines are intentionally compact SVG renderings stored in cell metadata; they do not yet implement Excel's full sparkline editing/style palette.
- Text boxes support editing and browser resize, but not drag positioning, rotation, or rich text.
- Slicer, Timeline, 3D Map, Add-ins, WordArt, Symbols, PivotTable Insert shortcuts, and expanded chart-type gallery remain out of scope as permitted by the task.

DEPENDENCIES/BLOCKERS: None. No new dependency added.
CORE PATCH ID (if any): None; no LibreOffice Core/upstream patch.
NEXT ACTION: Review commits and merge manually when approved. Do not merge automatically.

COMMITS:
- `31718d1` — navigation commands and implementations
- `a009953` — Sheet Insert groups/features and Playwright coverage
- `2af7788` — preserve common Ctrl+K ownership while routing it to Sheet hyperlinks
