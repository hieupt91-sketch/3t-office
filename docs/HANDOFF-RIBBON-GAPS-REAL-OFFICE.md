# Agent Handoff

TASK: Close Home ribbon gaps observed against installed Microsoft Excel and Word.
AGENT/ROLE: Codex — Sheet/Writer ribbon and formatting implementation.
BRANCH: `feature/ribbon-gaps-real-office`
WORKTREE: `E:\VNOffice-codex-ribbon-gaps`
OBJECTIVE: Add the specified Sheet Font, Alignment, and Number controls plus Writer Change Case, Sort, Show/Hide, Shading, and Borders without touching Slides.

FINDINGS:
- The requested worktree and branch already existed at the requested location, clean and based on `main` commit `9eee102`; Git worktree creation was therefore not repeated.
- Sheet already had reusable `item.style`, virtual rendering, history, and `applyNumberFormat()` paths. New number controls reuse that method.
- Runtime ribbon commands require direct adapter binding during app activation; dispatch-only switch cases are insufficient for commands without an existing UNO map.
- The legacy Format Cells regression suite requires both the group launcher and an explicit button, so both remain.

IMPLEMENTATION SUMMARY:
- Task 1: Sheet font family/size selects and standard-step grow/shrink buttons; formatting persists as `style.fontFamily` and `style.fontSize`.
- Task 2: top/middle/bottom alignment, Wrap Text with visible row growth, and bounded indent steps.
- Task 3: quick General/Number/Currency/Accounting/Date/Percentage/Scientific/Text selector and decimal controls preserving active category/config.
- Task 4: Writer Change Case Aa vector icon/button; A–Z sorting for paragraphs/list items; view-only formatting marks; paragraph/table-cell shading and border selector.
- Added bilingual metadata, purpose-built SVG icons, unit regression coverage, and real Edge/Playwright coverage using ribbon mouse actions and editor keyboard input.

FILES CHANGED: `apps/sheet/sheet-ribbon.js`, `apps/sheet/sheet-grid.js`, `apps/sheet/sheet.css`, `apps/writer/writer-ribbon.js`, `apps/writer/writer.css`, `adapters/libreoffice/sheet/sheet-adapter.js`, `adapters/libreoffice/writer/writer-adapter.js`, `platform/commands/command-definitions.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, `platform/ui-kit/icons.js`, `tests/unit/ribbon-gaps-real-office.test.js`, `tests/live/ribbon-gaps-real-office.playwright.mjs`, `tests/run-tests.js`, plan and this handoff.

COMMANDS RUN:
- `node --check` on every changed JavaScript module.
- `node tests/run-tests.js` with PowerShell Stopwatch.
- `node tests/live/ribbon-gaps-real-office.playwright.mjs` against installed Microsoft Edge.
- `git diff --check`.

BUILD RESULT: PASS — this repository has no compile build; syntax/integrity suite passed.
TEST RESULTS: PASS — `608/608`, `0 FAIL`, final elapsed `12.24s`. Live Playwright PASS for all nine evidence assertions, with zero browser page errors.
KNOWN FAILURES: None.
RISKS: Wrap height is calculated for the rendered virtual row from actual browser `scrollHeight`; rows outside the viewport regain the wrap class when rendered. Show/Hide uses removable view-only spans for literal space/tab marks plus CSS pseudo-elements for paragraph/line-break marks; export and undo snapshots strip these session wrappers so document content is unchanged.
DEPENDENCIES/BLOCKERS: No product dependency added. Live test uses installed Edge and external `playwright-core` already used by this repository. No blocker.
CORE PATCH ID (if any): N/A — no Core/upstream patch.
NEXT ACTION: Claude reviews the four task commits plus validation/handoff commit and decides whether to merge; do not merge automatically.

## Commit map

- `66f38c5` plan gate
- `d7facbb` Task 1 — Sheet Font
- `e23aa7e` Task 2 — Sheet Alignment
- `f437875` Task 3 — Sheet Number
- `9cad81e` Task 4 — Writer Font/Paragraph
- Final validation/handoff commit contains regression fixes and tests.

## Rollback

Revert task commits in reverse order. There is no migration, external dependency, file-format semantic change, or Core patch.
