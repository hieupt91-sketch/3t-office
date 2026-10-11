TASK: FIX-L6 — Slides vs PowerPoint audit, continued from FIX-L5
AGENT/ROLE: Codex / Slides audit and implementation
BRANCH: audit/slides-l6-codex
WORKTREE: E:\VNOffice-codex-fl6
OBJECTIVE: Compare untested Slides operations to real PowerPoint via COM; perform app operations with CDP; fix reproducible mismatches; capture evidence; run requested tests.
FINDINGS: See `docs/tickets-0710/FIX-L6-RESULTS.md`. Shape format fixed and verified. Textbox/table/image/chart save and reopen verified. Basic diagram is seven individual shapes, not native SmartArt. Animation type/trigger and PowerPoint effect count mismatch; transition enum not confirmed. Layout/Reset and native theme parity remain unresolved. Start-current, pen mode, laser, and speaker notes verified as recorded.
IMPLEMENTATION SUMMARY: Commit `9e38aad6` adds shape fill/outline/width/height/rotation UI, adapter serialization, Vietnamese Help/i18n and regression coverage. Follow-up commit fixes Help registry syntax. COM comparator and CDP evidence harness expanded.
FILES CHANGED: `apps/slides/slides-canvas.js`; `adapters/libreoffice/slides/slides-adapter.js`; `platform/help/entries-slides.js`; `platform/i18n/strings-{vi,en}.js`; `tests/unit/slides-basics-audit.test.js`; `tests/unit/slides-shape-rotation-serialize.test.js`; `tests/live/cdp/slides-fix-l6*.desktop.mjs`; `scripts/audit-0610/office_parallel/slides/compare.ps1`; `docs/tickets-0710/FIX-L6-{PLAN,RESULTS}.md`; `docs/tickets-0710/evidence/fix-l6/*`.
COMMANDS RUN: Focused Slides tests; CDP insert/controls/image/show scripts; `features-audit.desktop.mjs`; PowerPoint COM comparer on `fix-l6-image.pptx`, `fix-l6-controls.pptx`, `fix-l6-inserts.pptx`, `features-result.pptx`; `npm test`; `python -m unittest`; `python -m unittest discover`; `git diff --check` (run before handoff).
BUILD RESULT: NOT RUN (no build requested).
TEST RESULTS: `npm test` PASS 3068/3068. Exact Python unittest commands both ran and exited 1 because no tests were discovered. CDP and PowerPoint COM evidence/results documented in FIX-L6-RESULTS.md.
KNOWN FAILURES: SmartArt native object not produced; animation effect type/trigger and native order mismatch in PPTX; Reset command absent; layout/theme native parity unconfirmed; actual pen stroke persistence not tested.
RISKS: Do not claim full PowerPoint parity for the known failures. Python unittest is unavailable because the repository has no discoverable Python tests.
DEPENDENCIES/BLOCKERS: Remaining native SmartArt/animation/layout/theme parity work needs follow-up audit/fix. No external dependency added.
CORE PATCH ID (if any): None.
NEXT ACTION: Continue with SmartArt native parity, animation OOXML/native timeline, layout Reset, theme readback and persisted pen ink. Keep each fix in an isolated commit and add Vietnamese Help/i18n for any newly exposed UI feature.
