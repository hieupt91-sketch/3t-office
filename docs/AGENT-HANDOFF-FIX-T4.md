# Agent Handoff
TASK: FIX-T4 — Writer textbox, TOC spacing/layering, Elegant theme preview (U26/U27/U15)
AGENT/ROLE: Codex — Writer adapter/UI fixes and verification
BRANCH: `fix/doc-textbox-t4-codex`
WORKTREE: `E:\VNOffice-codex-ft4`
OBJECTIVE: Fix the three existing Writer behaviors listed in `docs/tickets-0710/TICKET-FIX-T4.md` without adding a feature.
FINDINGS:
- U26: Text boxes used fixed editor coordinates and left the default sample unselected.
- U27: Measured 66 px between the TOC header rule and the first entry; a floating textbox could overlap the TOC while the shapes layer had the higher stacking order.
- U15: The Elegant card preview inherited its theme font and letter spacing; the Vietnamese sample needed an explicit font stack and normal spacing.
IMPLEMENTATION SUMMARY:
- U26: Anchor the textbox to the current Writer caret, focus it after the ribbon click finishes, and select the default “Nhập văn bản” sample for replacement. Update in-app Vietnamese Help with the actual path and steps.
- U27: Reduce the measured header-to-entry gap to 6 px and put the TOC at z-index 20 above the shapes layer at z-index 10.
- U15: Render the theme sample with Arial/Noto Sans and normal letter/word spacing while preserving the Elegant theme heading font.
- Commits: `9331a9e5` U26; `a55c8702` U27; `7e32d4d2` U15.
FILES CHANGED:
- `adapters/libreoffice/writer/writer-adapter.js`
- `apps/writer/writer.css`
- `apps/writer/theme-gallery.js`
- `platform/help/entries-writer.js`
- `tests/unit/writer-slides-insert-gaps.test.js`
- `tests/unit/writer-toc-footnotes.test.js`
- `tests/unit/writer-ribbon-breadth.test.js`
- `tests/live/cdp/writer-fix-t4.desktop.mjs`
- `tests/live/cdp/writer-fix-t4-layout.desktop.mjs`
- `tests/live/cdp/writer-fix-u15-theme.desktop.mjs`
- `docs/AGENT-HANDOFF-FIX-T4.md`
COMMANDS RUN:
- Focused unit runners: Writer Insert 9/9; Writer TOC/footnotes 16/16; Writer ribbon breadth 32/32.
- `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-ft4 node --experimental-websocket tests/live/cdp/writer-fix-t4.desktop.mjs` — CDP port 61585.
- `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-ft4 node --experimental-websocket tests/live/cdp/writer-fix-t4-layout.desktop.mjs` — CDP port 61115.
- `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-ft4 node --experimental-websocket tests/live/cdp/writer-fix-u15-theme.desktop.mjs` — CDP port 61342.
- Python inspected `E:\VNOffice-profiles\codex-ft4\fix-t4-textbox.docx`: `word/document.xml` contains the edited text inside a `w:txbxContent` textbox.
- `npm test`; `python -m unittest discover -s tests`; `git diff --check`.
BUILD RESULT: NOT RUN — no build-system changes.
TEST RESULTS:
- U26 desktop CDP 4/4 PASS: caret placement matched within 36 px (observed 0 px delta), sample selected, typing replaced it, real DOCX save succeeded.
- U27 desktop CDP 2/2 PASS: measured header-to-first-entry gap 6 px; with a textbox deliberately moved over the TOC, TOC z-index 20 exceeded shapes-layer z-index 10.
- U15 desktop CDP 1/1 PASS: sample starts “Ấn bản”, font is Arial/Noto Sans, letter spacing is normal.
- Full JavaScript suite: 3005/3005 PASS.
- Full Python suite: 811 tests, OK.
- `git diff --check`: PASS.
KNOWN FAILURES: None in the final runs. The first CDP invocation without Node's `--experimental-websocket` flag could not connect; rerunning with the repository's Node 20 flag passed.
RISKS: The U27 spacing correction offsets the measured 60 px paged-canvas gap inside the TOC entries; verify again if Writer's page-flow spacing changes.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Review the three issue commits; no push or merge performed.
