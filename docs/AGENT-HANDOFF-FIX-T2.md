# Agent Handoff
TASK: FIX-T2 — Writer U18 word count, U19 change case, U29 Ctrl+D Font dialog
AGENT/ROLE: Codex — Writer behavior and verification
BRANCH: `fix/doc-misc-t2-codex`
WORKTREE: `E:\VNOffice-codex-ft2`
OBJECTIVE: Make the Writer AI summary count agree with status/dialog; preserve selection and inline formatting during Aa case changes; open the Font dialog with Ctrl+D.
FINDINGS: The local rule AI provider counted via its own `split(/\s+/)`. `WriterAdapter.changeCase()` replaced selected rich text with plain text through `execCommand("insertText")`. Writer had no `writer.format.fontDialog` command or Ctrl+D binding.
IMPLEMENTATION SUMMARY: The Writer shell now passes the adapter's `getWordCountStats()` result to local AI responses; the provider displays only the supplied count and no longer invents counts with a separate split. Aa transforms a cloned range's text nodes and restores the complete selection. Added an accessible, keyboard-usable Font dialog with font family, point size, color, bold, italic and underline; registered Ctrl+D in Writer scope and documented it in Vietnamese in-app Help and the shortcut reference.
THREE MEASURED DELTAS:
- U18: AI-specific word-count expressions `2 -> 0`; both quick summary and local smart search use the optional caller-supplied word count.
- U19: selected text remains selected at `8 -> 8` characters through all three case states; computed size remains `14 pt`, color remains `rgb(180, 20, 20)`, and weight remains `700`.
- U29: Writer Ctrl+D route `0 -> 1` command/dialog route; desktop opened the dialog and applied Arial 18 pt while retaining the selected text.
FILES CHANGED:
- `adapters/libreoffice/writer/writer-adapter.js`
- `apps/writer/font-dialog.js`
- `apps/writer/writer-app.js`
- `docs/SHORTCUT-COVERAGE.md`
- `platform/ai/providers/rule-based-provider.js`
- `platform/commands/command-definitions.js`
- `platform/help/entries-writer.js`
- `platform/i18n/strings-en.js`
- `platform/i18n/strings-vi.js`
- `platform/shell/app-shell.js`
- `tests/live/cdp/writer-fix-t2.desktop.mjs`
- `tests/unit/ai-service.test.js`
- `tests/unit/writer-help.test.js`
- `tests/unit/writer-mouse-shortcuts.test.js`
COMMANDS RUN: `npm test`; `node --experimental-websocket tests/live/cdp/writer-fix-t2.desktop.mjs`; `python -m unittest discover -s tests`; `node --check` on edited JavaScript entry points; `git diff --check`.
BUILD RESULT: NOT RUN (no build-system changes).
TEST RESULTS: JavaScript suite `3002/3002 PASS`; desktop CDP `6/6 PASS` (U18 status, Word Count dialog, and AI summary match; U19 selection/style/case cycle; U29 Ctrl+D open and font-size/family apply); Python `811 tests`, `OK` in `441.350s`; `git diff --check` PASS. Python emitted ResourceWarnings for unclosed test file handles; no tests failed.
KNOWN FAILURES: None in executed tests.
RISKS: The Font dialog applies character settings to the selected range. With a collapsed selection, it can open, but Apply does not format future typing.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Review the diff; no push or merge performed.
