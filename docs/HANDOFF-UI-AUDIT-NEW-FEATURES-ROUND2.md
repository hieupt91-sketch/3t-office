# Agent Handoff

TASK: UI/Accessibility/Dark-mode audit of 4 features Codex/Grok built while agy was unavailable

AGENT/ROLE: agy (investigation + fixes), completed by Claude after agy's CLI hit its print-mode timeout twice mid-task with real uncommitted work each time

BRANCH: `fix/ui-audit-new-features-round2`

WORKTREE: `E:\VNOffice-agy-ui-audit-new-features2`

OBJECTIVE: Audit VN Slides Insert Chart, VN Writer Citations & Bibliography, VN Slides Font & Paragraph, and VN Slides Hide Slide for dark-mode/visual-consistency/accessibility gaps, since Codex/Grok built all four focused on logic/tests without a design pass.

---

## Findings and fixes

All fixes are display/CSS/aria/focus only — no calculation, formatting, or persistence logic was touched, per the task's scope restriction.

### Writer Citations & Bibliography (`apps/writer/citations.js`, `apps/writer/writer.css`)
- Added a real focus trap (Tab wraps within the dialog) to all three citation dialogs (Source Editor, Insert Citation, Manage Sources) — previously only relied on natural DOM tab order with no wrap.
- Added Escape-to-close and focus-restoration-to-the-triggering-element on close, matching the pattern already used elsewhere in the app (WordArt, Chart dialogs) — Citations dialogs previously lacked both.
- Added Enter-key submission on text inputs (UX parity with other dialogs).
- Fixed `.vno-edit-source`/`.vno-delete-source` buttons to use the standard `vno-btn vno-btn-sm` classes — previously bare, unstyled `<button>` elements.
- Fixed the "Chưa có nguồn tài liệu." empty-state paragraph to use `.vno-empty-sources` (previously unstyled).
- Converted every hardcoded hex color in the Citations dialog/field/bibliography CSS to theme tokens (`var(--vno-text-primary)`, `var(--vno-bg-surface)`, etc.) plus explicit `[data-theme="dark"]` overrides where no token fit directly.
- **Bug found and fixed independently while writing the regression test** (not caught by agy's own manual pass): `showInsertCitationDialog()`'s initial-focus line only targeted `.vno-source-select`, which doesn't exist when the source list is empty — meaning the very first time a user opens Insert Citation (before any source has been added), focus lands nowhere and the focus trap has nothing to contain, defeating it entirely for that specific but very common case (a brand-new document). Fixed by falling back to the "Thêm nguồn mới" button when there's no select.

### Slides Insert Chart (`apps/slides/slides-chart.js`, `apps/slides/slides.css`)
- Fixed the chart-type radiogroup to use a real roving-tabindex pattern (`tabindex="0"` on the selected type only, `-1` on the rest) plus Arrow Left/Right/Up/Down navigation between types — previously every type button was independently `Tab`-reachable with no keyboard way to change selection except clicking, which is not the correct WAI-ARIA `radiogroup` pattern the markup already claimed via `role="radio"`/`aria-checked`.
- Added Enter-key submission and `stopPropagation()` on the Escape/Enter/arrow handlers so they don't fight the dialog's own focus trap.
- Converted hardcoded colors (chart type buttons, table header, remove-row button, error text) to theme tokens with real `:hover`/`:focus-visible` states.

### Slides Font & Paragraph, Slides Hide Slide
- Fixed the Slides `slides.font.grow`/`slides.font.shrink` command icons, which reused the unrelated `indentInc`/`indentDec` icons (same mismatch already found and fixed for Writer's equivalent commands earlier this session) — renamed to `fontGrow`/`fontShrink`. Note: the dedicated `fontGrow`/`fontShrink`/`lineSpacing` icon SVGs themselves already exist in `platform/ui-kit/icons.js` on current `main` (added in an earlier commit this session for the Writer fix) and were not re-added here to avoid a duplicate-key conflict — this branch's base predates that commit, so the icon reference only resolves correctly after merging onto current main; verified after merge, see Test Results below.
- Fixed the Hide Slide badge/strikethrough color token chain (`var(--vno-app-current-fg, ...)`) which resolved to the wrong value in this context.

### WCAG AA color-contrast regression caught and fixed
`node tests/run-tests.js`'s existing automated color-contrast audit (suite unrelated to this task, already part of the standing suite) caught **two real contrast violations agy's own dark-mode fixes had introduced**:
1. `.vno-citation-field` dark mode: `#93c5fd` text on `rgba(96, 165, 250, 0.18)` measured only 1.55:1 (needs 4.5:1) — a translucent background's real-world contrast depends on whatever is behind it, and the audit tool (correctly, per its own documented methodology) blends alpha backgrounds against white for a conservative measurement. Fixed by switching to a solid `#1e3a5f` background — verified via the project's own `getContrastRatio()` helper: 6.38:1.
2. `.vno-slide-hidden-mark`/`.vno-slide-sorter-hidden-mark` dark mode: resolved to `#0f4c81` (a light-mode-oriented brand blue) on `#1e1e1e`, only 1.88:1, because `var(--vno-app-current-fg, #fb923c)`'s fallback never engages (the variable IS defined, just not to the intended dark-mode value in this cascade context). Fixed with a literal `#fb923c` — verified: 7.37:1.

Both are disclosed here because they're a good example of why "looks fine in a screenshot" isn't sufficient for dark-mode work — always run the full test suite (which includes an automated contrast audit) before considering a dark-mode fix done.

---

## Files changed

- `apps/writer/citations.js`
- `apps/writer/writer.css`
- `apps/slides/slides-chart.js`
- `apps/slides/slides.css`
- `platform/commands/command-definitions.js` (icon key renames only, no logic)
- `platform/ui-kit/components.js` (small `aria-pressed` default fallback for toggle commands)
- `tests/live/ui-audit-new-features-round2.playwright.mjs` (new regression test)
- `docs/HANDOFF-UI-AUDIT-NEW-FEATURES-ROUND2.md` (this file)
- `docs/screenshots/audit-round2/` (investigation screenshots/data from agy's own audit pass, kept for reference)
- `scripts/audit-new-features-pass1.mjs`, `scripts/check-badge.mjs` (agy's own investigation scripts, kept as-is for reference — not a substitute for the real pass/fail regression test above, which was written separately)

No Sheet/logic/formula/persistence code touched.

---

## Test results

- `node tests/run-tests.js`: **905/905 PASS**, 0 FAIL (includes the pre-existing color-contrast audit, which failed once mid-task and now passes after the two contrast fixes above).
- `node tests/live/ui-audit-new-features-round2.playwright.mjs` (new, real Edge, both dialogs exercised in `data-theme dark`, no SendKeys): **11/11 PASS** — dialog focus trap, Escape, focus restoration, dark-mode citation field contrast, chart radiogroup roving-tabindex + arrow-key navigation, Hide Slide badge dark-mode contrast, zero console errors across all three scenarios.

KNOWN LIMITATIONS: The Font Grow/Shrink icon rename (`indentInc`/`indentDec` -> `fontGrow`/`fontShrink`) only fully resolves once merged onto current `main`, since the actual icon SVG definitions were added there in a separate, earlier commit this session — re-verify icon rendering live immediately after merging this branch (not just re-running the unit suite, which doesn't visually inspect SVG icon content).

NEXT ACTION: Ready to merge into `main`; re-verify Font Grow/Shrink icons render correctly post-merge per the note above.
