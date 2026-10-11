# Agent Handoff
TASK: FIX-S3 — Sheet: lan09 Excel save/open, active sheet, arrow-only AutoFilter, lan14 timeout
AGENT/ROLE: Codex / Sheet integration
BRANCH: `fix/sheet-save-s3-codex`
WORKTREE: `E:\VNOffice-codex-fs3`
OBJECTIVE: Fix the ticketed Sheet round-trip issues; run only the seven named XLSX audits with the requested profile; report test truthfully.
FINDINGS:
- lan09 source workbook selects `NVR` (activeTab 10). Import parsing and `_commitWorkbook` already selected `NVR`; the view-first quick view always opened sheet index 0 and restored `Tin moi` at transition. The quick view now opens on the XLSX active sheet. Final live audit reports `NVR -> NVR`.
- lan09’s saved XLSX still fails Excel COM `Workbooks.Open` with “Unable to get the Open property of the Workbooks class”. Input lan09 opens in Excel COM. The saved ZIP has no duplicate members; XML, relationships, content types, and referenced parts were structurally checked; LibreOffice headless and openpyxl load it. Diagnostic copies with external links removed and with all `extLst` blocks removed also fail Excel COM. Root cause remains unresolved; do not report the lan09 Excel result as PASS.
- lan14 produced an XLSX that passes Excel COM and has zero content diffs/lint findings, but the audit CDP `Runtime.evaluate` timed out after 1744.5 seconds. The 329,536,087-byte `.sent.fods` was written at 02:09:29 and the 7,194,415-byte XLSX at 02:12:51; no sidecar timing result was returned, so the time after file creation is not attributed to a confirmed save stage. Do not report lan14 audit as PASS.
- Arrow-only AutoFilter save behavior already existed in the S2 implementation; added regression coverage for `<autoFilter ref>` and `_xlnm._FilterDatabase` without filter criteria.
IMPLEMENTATION SUMMARY:
- Replaced a stale FODS `ActiveTable` with the XLSX active sheet in the JavaScript and Python overlays; updated Python expectations to make XLSX activeTab authoritative.
- Kept the quick-view sheet index aligned with the active sheet from `xl/workbook.xml`, preventing the preview-to-full-load transition from changing the active sheet.
- Added round-trip phase timings and profile/CDP/active-sheet state to the CDP audit sidecar.
- Added arrow-only AutoFilter regression coverage.
FILES CHANGED:
- `adapters/libreoffice/sheet/xlsx-active-sheet.js`
- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `adapters/libreoffice/sheet/sheet-adapter.js` (active sheet overlays)
- `main.py`
- `tests/unit/sheet-xlsx-native-open-overlay.test.js`
- `tests/test_sheet_active_tab_overlay.py`
- `tests/test_sheet_hidden_autofilter.py`
- `tests/live/cdp/roundtrip-file.mjs`
COMMANDS RUN:
- `npm test`
- `python -m unittest discover -s tests`
- `python -m unittest tests.test_sheet_active_tab_overlay`
- Focused AutoFilter unittest and Sheet active-overlay JavaScript tests.
- Requested seven-file batch audit with `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fs3`, `VNO_AUDIT_MARK_DIRTY=1`, and `--no-reuse-saved`; repeated lan09 after the active-sheet correction and lan06/lan11 after the quick-view correction. CDP selected separate ports (lan09 final: 51824; lan06: 53206; lan11: 53469).
- Excel COM checks used the repo helper, which verifies a newly created Excel PID and terminates only that PID.
BUILD RESULT: NOT RUN (ticket requested tests, not a build).
TEST RESULTS:
- PASS — `npm test`: 3038/3038.
- PASS — `python -m unittest discover -s tests`: 814 tests in 449.454 seconds.
- PASS — `python -m unittest tests.test_sheet_active_tab_overlay`: 18 tests.
- PASS — lan06 final re-audit: 0 diffs, clean lint, Excel PASS, active `VAT Nhập` preserved.
- PASS — lan11 final re-audit: 0 diffs, clean lint, Excel PASS, active `Reyee` preserved.
- PASS — lan09 content/lint/active-sheet checks: 0 diffs, clean lint, active `NVR` preserved; Excel COM FAIL.
- PASS — arrow-only AutoFilter Python regression test.
KNOWN FAILURES:
- lan09 Excel COM open failure persists after the diagnostic checks listed above.
- lan14 audit timed out at 1744.5 seconds despite a generated XLSX that Excel COM opens; no final CDP sidecar was produced.
- In the requested seven-file batch before the active-sheet correction: lan01/02/04/06/11 passed; lan09 failed Excel COM and active sheet; lan14 timed out. Post-fix lan09 now preserves active sheet; post-fix lan06/11 both pass. lan01/02/04 were not repeated after the quick-view-only change.
RISKS: FIX-S3 is not fully closed while lan09’s Excel-open failure and lan14’s long-running CDP call remain unexplained. The XLSX active sheet comes from native workbook activeTab; when it cannot be mapped to LibreOffice’s sheet list, quick view safely falls back to index 0.
DEPENDENCIES/BLOCKERS: None requiring user input.
CORE PATCH ID (if any): None.
NEXT ACTION: Continue lan09 Excel package isolation with a real Excel repair/open diagnostic or a minimal part-level comparison; instrument lan14 Python save/bridge stages separately before changing the save path. Use a private Excel PID per test and retain `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fs3` with a free CDP port.
