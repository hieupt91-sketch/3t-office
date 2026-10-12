# Agent Handoff

TASK: `docs/tickets-0710/FIX-S18.md` — persist Sheet PivotChart links in XLSX and verify Create from Selection names.
AGENT/ROLE: Codex / VN Sheet adapter and persistence.
BRANCH: `fix/sheet-s18-codex`.
WORKTREE: `E:\VNOffice-codex-fs18`.
OBJECTIVE: Save PivotCharts as Excel-linked charts using the existing PivotTable/PivotCache, preserve regular chart saves, verify createFromSelection references, update the generated Sheet button matrix, and record the result.

FINDINGS: Excel requires `c:pivotSource/c:name` in `[filename]sheet!pivottable` form. A bare PivotTable name allowed the file to open but left `Chart.PivotLayout.PivotTable` unbound. The chart is associated through the existing worksheet-to-PivotTable relationship; no Core change or new dependency was needed. Empty `references count="0"` inside `pivotArea` caused Excel to reject a test artifact, so the minimal `pivotArea` is emitted without that empty child.

IMPLEMENTATION SUMMARY: Extended the existing OOXML postprocessor to map each exported chart to the PivotTable part on its host worksheet, qualify the source name with the actual XLSX output filename, and emit matching chart `pivotFmts` and PivotTable `chartFormats`. `main.py` passes the output filename. XLSX import strips the workbook/sheet qualifier to restore the stable PivotTable identity in VN Sheet. Regular charts are left unchanged. The existing Vietnamese Help article already documents Insert > Biểu đồ Pivot and Data > Làm mới Pivot; it was reviewed and required no change. Updated generated button evidence for PivotChart and `sheet.formula.createFromSelection`.

COMMITS:
- `c290b8aa` docs(sheet): plan FIX-S18 PivotChart XLSX linking
- `6809ef45` fix(sheet): bind exported PivotCharts to PivotTables
- `b96dc6d4` fix(sheet): map PivotChart IDs to exported table names
- `7f5077b4` fix(sheet): restore PivotChart links when opening XLSX
- `203fdfdc` docs(sheet): record PivotChart package verification
- `7e78ced3` fix(sheet): omit empty pivot chart references
- `7e797f6d` docs(sheet): clarify Excel PivotChart source naming
- `9c36fe47` fix(sheet): qualify PivotChart source name for Excel
- `f4886bfd` fix(sheet): normalize qualified PivotChart imports
- `60691194` docs(sheet): verify PivotChart and selection names
- This handoff commit.

FILES CHANGED: `adapters/libreoffice/common/ooxml_zip_patch.py`; `main.py`; `tests/test_sheet_pivot_chart_xlsx.py`; `docs/PLAN-SHEET-S18.md`; `scripts/audit-0610/gen_sheet_button_matrix.py`; `docs/SHEET-BUTTON-MATRIX-1011.md`; `docs/AGENT-HANDOFF-FIX-S18.md`.

COMMANDS RUN:
- `python -m unittest tests.test_sheet_pivot_chart_xlsx`: PASS, 3 tests.
- `python -m py_compile adapters/libreoffice/common/ooxml_zip_patch.py main.py`: PASS.
- Desktop CDP using real clicks/keys and `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fs18`: PASS; created and saved the PivotChart, reopened the XLSX, changed source C2 to 130, refreshed Pivot, and observed chart data update from `[1,1,120,80]` to `[130,80,60]`.
- Excel COM ReadOnly on `fix-s18-pivot.xlsx`: PASS; `ChartObjects.Count=1`, `Chart.PivotLayout.PivotTable.Name=DoanhThuTheoKhuVuc`, `PivotFields.Count=3`, and 2 worksheets.
- Desktop CDP `sheet.formula.createFromSelection` on A1:C6 plus Excel COM ReadOnly: PASS; Names.Count=3 and references are `STT=Sheet1!$A$2:$A$6`, `H__t_n=Sheet1!$B$2:$B$6`, `S__ti_n=Sheet1!$C$2:$C$6`.
- `npm test`: PASS, 3109/3109.
- `python -m unittest discover -s tests`: PASS, 905 tests in 471.382s. Existing ResourceWarnings for unclosed streams were printed; no test failed.
- XLSX batch with `VNO_AUDIT_MARK_DIRTY=1` for lan01, lan02, lan04, lan06, lan09, lan11, lan22, lan26: PASS 8/8, all `saved=yes`, `diffs=0`, `lint=clean`, `excel=PASS`. Report: `E:\VNOffice-profiles\codex-fs18\batch-xlsx-s18-final\batch_document_audit_report.md`.
- UTF-8/BOM scan: PASS, 8 changed tracked files, no BOM or invalid UTF-8. `git diff --check`: PASS.
- Build: NOT RUN; no build-system changes.

TEST RESULTS: All requested automated suites, the desktop PivotChart round-trip/refresh check, Excel COM checks, and the XLSX batch passed.

KNOWN FAILURES: None in the requested checks. Python emitted existing ResourceWarnings for unclosed text streams.

RISKS: Direct callers of `postprocess_sheet_xlsx()` that need to export a PivotChart must supply `workbook_filename`; the desktop save path in `main.py` does so. Excel matching depends on the actual output filename and worksheet relationship being available in the package.

DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): N/A — LibreOffice Core was not modified.
NEXT ACTION: No remaining FIX-S18 work. The updated Sheet matrix shows 118 KHỚP EXCEL and 20 KHÁC CÓ CHỦ Ý; `createFromSelection` and PivotChart no longer remain unchecked/known-gap.
