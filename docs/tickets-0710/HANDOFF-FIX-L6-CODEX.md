TASK: FIX-L6 — Slides vs PowerPoint audit, continued from FIX-L5
AGENT/ROLE: Codex / Slides audit and implementation
BRANCH: audit/slides-l6-codex
WORKTREE: E:\VNOffice-codex-fl6
OBJECTIVE: Compare untested Slides operations to real PowerPoint via COM; perform app operations with CDP; fix reproducible mismatches; capture evidence; run requested tests.
FINDINGS: See `docs/tickets-0710/FIX-L6-RESULTS.md`. Shape format fixed and verified. Textbox/table/image/chart save and reopen verified. Basic diagram is seven individual shapes, not native SmartArt. Animation type/trigger and PowerPoint effect count mismatch; transition enum not confirmed. Layout/Reset and native theme parity remain unresolved. Start-current, pen mode, laser, and speaker notes verified as recorded.
IMPLEMENTATION SUMMARY: Commits `9e38aad6` and `0176ba2c` add shape formatting, Help/i18n, COM/CDP audit and evidence. This commit adds PPTX animation wrapper normalization so PowerPoint reads effects in native order and types.
FILES CHANGED: `adapters/libreoffice/common/ooxml_zip_patch.py`; `tests/test_slides_pptx_animation_timing.py`; `apps/slides/slides-canvas.js`; `adapters/libreoffice/slides/slides-adapter.js`; `platform/help/entries-slides.js`; `platform/i18n/strings-{vi,en}.js`; `tests/unit/slides-basics-audit.test.js`; `tests/unit/slides-shape-rotation-serialize.test.js`; `tests/live/cdp/slides-fix-l6*.desktop.mjs`; `platform/commands/command-definitions.js`; `tests/unit/slides-layouts.test.js`; `scripts/audit-0610/office_parallel/slides/compare.ps1`; `docs/tickets-0710/FIX-L6-{PLAN,RESULTS}.md`; `docs/tickets-0710/evidence/fix-l6/*`.
COMMANDS RUN: Focused Slides tests; CDP insert/controls/image/show scripts; `features-audit.desktop.mjs`; PowerPoint COM comparer on `fix-l6-image.pptx`, `fix-l6-controls.pptx`, `fix-l6-inserts.pptx`, `features-result.pptx`; `npm test`; `python -m unittest`; `python -m unittest discover`; focused animation postprocess unittest 2/2 PASS; `git diff --check` (run before handoff).
BUILD RESULT: NOT RUN (no build requested).
TEST RESULTS: `npm test` PASS 3070/3070. Exact Python unittest commands both ran and exited 1 because no tests were discovered. CDP and PowerPoint COM evidence/results documented in FIX-L6-RESULTS.md.
KNOWN FAILURES: SmartArt native object not produced; native layout/theme parity unconfirmed; actual pen stroke persistence not tested.
RISKS: Do not claim full PowerPoint parity for the known failures. Python unittest is unavailable because the repository has no discoverable Python tests.
DEPENDENCIES/BLOCKERS: Remaining native SmartArt/theme parity work needs follow-up. Native layout mismatch is confirmed (`Slide.Layout=1`, native Two-Column Text=3); a format-semantics change is pending user decision per AGENTS.md §11. Layout Reset UI is present. No external dependency added.
CORE PATCH ID (if any): None.
NEXT ACTION: Next: obtain user decision before changing PPTX layout semantics; then continue SmartArt native parity, theme readback and persisted pen ink. Keep each fix in an isolated commit and add Vietnamese Help/i18n for any newly exposed UI feature.
