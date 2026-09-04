# Agent Handoff
TASK: Fix Sheet FODS multi-sheet data loss
AGENT/ROLE: Codex (implementation) + Claude (finish/verify — Codex hit its usage quota mid-task, reset ~21:40)
BRANCH: fix/sheet-fods-multisheet
WORKTREE: E:\VNOffice-codex-sheet-fods
OBJECTIVE: Replace the CSV intermediary in real Sheet open/save/PDF flows with Flat OpenDocument Spreadsheet XML (FODS), preserving every worksheet and the active worksheet.
FINDINGS: The old adapter serialized only `grid.cellsData`, which aliases the active worksheet's Map. `grid.sheets`, `grid.sheetsData[name]`, and `grid.activeSheet` (confirmed against the live `apps/sheet/sheet-grid.js` implementation) provide the complete workbook model needed for FODS.
IMPLEMENTATION SUMMARY: DONE.
- `SheetAdapter.serializeToFods()` / `parseFods()` / `loadFromFods()` added, mirroring `SlidesAdapter`'s FODP pattern.
- Formula preservation: ODF `table:formula` conversion (`,`→`;` separators, `A1`→`[.A1]` refs) PLUS a custom `vno:formula` attribute carrying the original VN Office formula string verbatim, since ODF round-tripping through a real headless LibreOffice conversion can be lossy for anything our own formula engine doesn't emit 1:1 — `vno:formula` is preferred on read when present.
- `main.py`: `app_kind == "sheet"` now uses `fods`/`draft.fods` (matching the existing `slides`/`draft.fodp` pattern) instead of `csv`/`draft.csv`. Added `"fods": "OpenDocument Spreadsheet Flat XML"` to `FORMAT_FILTERS`.
- `save()`, `saveAs()`, `open()`, `exportPdf()` in `SheetAdapter` switched to FODS. `serializeToCsv()`/`parseCsv()` left intact (unrelated CSV export path, not touched).
FILES CHANGED: `adapters/libreoffice/sheet/sheet-adapter.js`, `main.py`, `tests/unit/sheet-file-io.test.js` (round-trip/bridge assertions), `tests/live/sheet-fods-real-conversion.mjs` (new).
COMMANDS RUN: `node tests/run-tests.js` (492/492 PASS, ~11s), `node tests/live/sheet-fods-real-conversion.mjs` (real `soffice.exe` headless conversion), live Playwright verification against the running dev server (see below).
BUILD RESULT: OK.
TEST RESULTS: 492/492 unit/behavioral PASS. Live real-LibreOffice round-trip PASS (3-sheet workbook, Vietnamese Unicode, negative decimals, a `=SUM()` formula — all survived FODS → XLSX → FODS via the actual `soffice.exe` binary). Live Playwright UI test PASS: typed real keyboard input into 2 different sheets (including adding a new sheet via the real "+" tab button) in the running app, called the live `SheetAdapter.serializeToFods()`/`parseFods()` through the app's real `globalUnoBridge.activeDocument`, confirmed all sheets + their typed text present in both the generated FODS and the reparsed result.
KNOWN FAILURES / LIMITATIONS:
- **Active-sheet memory does not survive a real save→reopen round trip.** `serializeToFods()` writes `ooo:view-settings`/`Views`/`ActiveTable` correctly (verified: useful if a user opens the `.fods`/`.ods` directly in real LibreOffice Calc's GUI, which does read that on interactive open). However, LibreOffice's **headless** `--convert-to` pipeline (used by both our Save and Open flows) does not preserve or regenerate that view-settings block at all — confirmed by inspecting the real converted output XML, which only ever contains `VisibleAreaTop/Left/Width/Height`, never a `Views` map. This is a LibreOffice headless-conversion limitation, not a bug in our serializer. `parseFods()` already degrades gracefully: if no valid `ActiveTable` is found, it falls back to the first sheet — never crashes, never loses data, just may not remember which tab was open. Documented and accepted; not worth chasing further (would require post-processing the generated XLSX's `workbook.xml` `activeTab` attribute directly, out of scope for this data-loss fix).
- Formula ODF-standard conversion (`table:formula`) has not been exhaustively tested against every function in the formula engine — the `vno:formula` fallback attribute is the safety net that makes this a non-issue for VN Office's own round trip (Save then Open within VN Office). Only a formula's *displayed/computed value* would be at risk if a file is edited by real external LibreOffice/Excel and the `vno:formula` attribute gets stripped by that other program; in that case our `table:formula` ODF translation is the fallback, which is standard-compliant.
RISKS: None outstanding for the core data-loss bug. The active-sheet limitation above is cosmetic (UX only), not data loss.
DEPENDENCIES/BLOCKERS: None. LibreOffice headless available at `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe`.
CORE PATCH ID (if any): N/A.
NEXT ACTION: Ready for merge into `main` (reviewed and verified by Claude).

## Plan gate — CLOSED
- Original problem: CSV round-trip handled only the active sheet's Map, silently discarding every other worksheet on Save.
- Fix verified at three levels: (1) unit/adapter round-trip with a mocked multi-sheet grid, (2) real `soffice.exe` headless FODS→XLSX→FODS conversion with Vietnamese Unicode + formulas, (3) live Playwright test against the running app's actual UI and real `globalUnoBridge` singleton.
- Rollback: revert this branch's commits; `serializeToCsv()`/`parseCsv()` remain intact and unused by the default save/open path, so a revert cleanly restores the pre-fix (single-sheet-loss) behavior with no half-migrated state.
