# Agent Handoff

TASK: i18n (VI/EN) coverage gap audit — recently-merged dialogs missing bilingual support
AGENT/ROLE: Antigravity (agy) — UI/i18n string audit; completed/finalized by Claude after agy hit its background-task timeout mid-run
BRANCH: `fix/i18n-coverage-gap-audit`
WORKTREE: `E:\VNOffice-agy-i18n-gap-audit`
OBJECTIVE: Find and fix VI-hardcoded strings in dialogs merged this session (Paste Special, Merge Cells confirm, Name Manager, Remove Duplicates, Subtotal, Text to Columns, Presenter/Reading View/Rehearse Timings) that would still show Vietnamese text after switching locale to English.

IMPLEMENTATION SUMMARY:

- Replaced hardcoded Vietnamese strings with `t("namespace.key", "vi fallback")` calls across `apps/sheet/sheet-grid.js` (Paste Special dialog, Merge Cells confirm dialog, Name Manager, Remove Duplicates, Subtotal, Text to Columns, Error Checking reason strings, cell-validation dropdown aria-label) and `apps/slides/slides-canvas.js` (Presenter Console, Reading View, Rehearse Timings aria-labels/timer label).
- Added matching key pairs to both `platform/i18n/strings-vi.js` and `platform/i18n/strings-en.js` (parallel, verified present in both catalogs for every new key).
- Fixed a small pre-existing hardcoded placeholder in `apps/writer/writer-illustrations.js` (Chart dialog's Label/Value input placeholders ignored the existing `isEn` flag; now respect it, matching the pattern already used for that dialog's other strings).
- Extended `tests/unit/sheet-slides-i18n-shortcuts.test.js` with a dedicated EN/VI round-trip test for every new key.

BUG FOUND AND FIXED (by Claude, during independent verification — not part of agy's original scope, but a genuine pre-existing latent defect this task's changes exposed):

- `tests/unit/writer-refmail-audit.test.js` line 323 had `const origLocale = getLocale;` — missing the `()` call, so it captured the **function reference**, not the current locale string. Its `finally { setLocale(origLocale); }` was therefore a silent no-op (`_catalogs[functionRef]` is never defined), leaving the global i18n module's `_currentLocale` stuck on `"en"` after that test ran, for the rest of the single-process test run.
- This was invisible before because no downstream test asserted an exact hardcoded Vietnamese string that also went through `t()`. Once this task converted the Presenter Console / Rehearse Timings aria-labels to `t()` calls, `tests/unit/slides-dialogs-a11y.test.js`'s hardcoded-Vietnamese-string assertions started failing — not because the new i18n code was wrong, but because the locale was already stuck on `"en"` by the time that suite ran.
- Fixed with a one-character change: `const origLocale = getLocale();`. Root-caused via a temporary trace instrumentation in `setLocale()` (added and removed during debugging, not part of the final diff) that logged every locale change with its call site across a full `node tests/run-tests.js` run — this pinpointed the exact line whose "reset" never actually fired.

SCOPE NOTE (honestly incomplete, as instructed): this task was scoped to the dialogs from features merged most recently this session, not a full-repo sweep. `docs/FEATURE-PARITY-ROADMAP.md`'s existing self-reported "~80% i18n coverage, some option descriptions/presets/Presenter View still hardcoded" note is now more accurate for the items listed above, but other pre-existing hardcoded strings elsewhere in the suite were not audited in this pass.

FILES CHANGED:

- `apps/sheet/sheet-grid.js`
- `apps/slides/slides-canvas.js`
- `apps/writer/writer-illustrations.js`
- `platform/i18n/strings-vi.js`
- `platform/i18n/strings-en.js`
- `tests/unit/sheet-slides-i18n-shortcuts.test.js`
- `tests/unit/writer-refmail-audit.test.js` (pre-existing bug fix, see above)

TEST RESULTS:

- `node tests/run-tests.js`: **767/767 PASS, 0 FAIL** (this branch predates several main-branch merges from this session, hence the lower total than main's current count).

KNOWN FAILURES: None remaining.
RISKS: None identified beyond the scope note above.
DEPENDENCIES/BLOCKERS: None. No new dependency, no paid library.
NEXT ACTION: Review and merge through the normal workflow.
