# Agent Handoff
TASK: Fix Sheet FODS multi-sheet data loss
AGENT/ROLE: Codex / Sheet + Integration
BRANCH: fix/sheet-fods-multisheet
WORKTREE: E:\VNOffice-codex-sheet-fods
OBJECTIVE: Replace the CSV intermediary in real Sheet open/save/PDF flows with Flat OpenDocument Spreadsheet XML (FODS), preserving every worksheet and the active worksheet.
FINDINGS: The current adapter serializes only `grid.cellsData`, which aliases the active worksheet's Map. `grid.sheets`, `grid.sheetsData[name]`, and `grid.activeSheet` already provide the complete workbook model needed for FODS.
IMPLEMENTATION SUMMARY: IN PROGRESS
FILES CHANGED: IN PROGRESS
COMMANDS RUN: IN PROGRESS
BUILD RESULT: NOT RUN
TEST RESULTS: NOT RUN
KNOWN FAILURES: None known yet.
RISKS: ODF formula syntax conversion; XML namespace parsing in browser and Node tests; rebuilding sheet tabs/state on load; LibreOffice filter compatibility.
DEPENDENCIES/BLOCKERS: LibreOffice headless is available at C:\Users\3T Computer\tools\libreoffice\program\soffice.exe. No new dependency planned.
CORE PATCH ID (if any): N/A — no Core/upstream patch.
NEXT ACTION: Implement and test FODS serialization/parsing, switch the Python intermediary, then run automated and live verification.

## Plan gate

- Current capability: CSV round-trip handles only the active Map and loses all other worksheets.
- Files/modules: `adapters/libreoffice/sheet/sheet-adapter.js`, `main.py`, Sheet file-I/O tests, a Sheet live Playwright test, and this handoff.
- Dependency: Existing LibreOffice headless converter only; no external package or architecture change.
- Test plan: Three-sheet adapter round-trip, bridge payload assertions, real FODS → XLSX → FODS conversion, full `node tests/run-tests.js` under 60 seconds, and HTTP + Playwright UI-data round-trip.
- Rollback: Revert the small scoped commits; CSV helpers remain intact and no file-format model migration is introduced.
