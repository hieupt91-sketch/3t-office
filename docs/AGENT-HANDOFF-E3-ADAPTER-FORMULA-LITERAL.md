# Agent Handoff
TASK: E3 dependency — formula string literal corruption in XLSX save path
AGENT/ROLE: Codex / Sheet app owner; adapter owner required
BRANCH: fix/excel-e3-codex
WORKTREE: E:\VNOffice-codex-fe3
OBJECTIVE: Preserve quoted formula text while converting ODF formulas to XLSX.
FINDINGS: CDP state after Ctrl+Enter in H1:H3 was `=A4+$B$1&" A4"`, `=A5+$B$1&" A4"`, `=A6+$B$1&" A4"`. Excel 2016 COM 16.0.4266 opened the app-saved workbook read-only and returned H2 Formula `=A5+$B$1&" [.A4]"`, Value2 `0 [.A4]`. The readback used `scripts/audit-0610/word_parallel/excel-read.ps1` on the app output copied to `E:\VNOffice-profiles\codex-fe3\app_formulaPack.xlsx`.
IMPLEMENTATION SUMMARY: No `adapters/**` edits were made because AGENTS.md assigns that directory to the adapter owner. The E3 input matrix records the saved formula literal case as failing. Likely conversion site is `_formulaToOdf()` in `adapters/libreoffice/sheet/sheet-adapter.js`; cell-reference rewriting must ignore quoted string tokens.
FILES CHANGED: `apps/sheet/sheet-grid.js`, `tests/live/cdp/e3-input.desktop.mjs`, `docs/EXCEL2016-INPUT-MATRIX.md`, `platform/help/entries-sheet.js`; no adapter files.
COMMANDS RUN: `node --experimental-websocket tests/live/cdp/e3-input.desktop.mjs` (60/60 PASS); app Save As; `powershell -File scripts/audit-0610/word_parallel/excel-read.ps1 -Files E:\VNOffice-profiles\codex-fe3\app_formulaPack.xlsx` (read-only COM reproduction).
BUILD RESULT: CDP desktop input parity case PASS; Excel COM saved-file readback FAIL for quoted cell-like text.
TEST RESULTS: Relative/absolute reference translation and literal preservation in the live grid PASS; saved XLSX/Excel round-trip FAIL.
KNOWN FAILURES: Formula text `" A4"` is rewritten as `" [.A4]"` after save and changes the computed value.
RISKS: Other quoted formula literals that resemble cell references can be corrupted in saved workbooks.
DEPENDENCIES/BLOCKERS: Adapter owner must implement and test string-literal-safe reference conversion, including true references, quoted text, whole-column references, and round trips. Then rerun CDP Save As and Excel COM ReadOnly checks.
CORE PATCH ID (if any): None.
NEXT ACTION: Adapter owner fixes the serializer and returns a commit for E3 branch revalidation.
