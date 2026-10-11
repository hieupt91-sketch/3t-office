# Agent Handoff

TASK: Batch fidelity audit of 28 real company workbooks from the LAN share (`file test/lan/lan01..lan28.xlsx`, mapping in `file test/lan/_map.txt`; never committed) — open in the real app, save, compare with `scripts/audit-sheet-import.mjs --xlsx-vs-xlsx`, open the result in real Excel 2016.
AGENT/ROLE: Claude (orchestrator) with opencode/nemotron for the follow-up fixes
BRANCH: main (fixes 12f3a00, 10a7706, 7f8c168, 4f7e6f0)
WORKTREE: E:\VNOffice-opencode-lan-audit (batch runner `_batch_audit.py`, reports `_batch_audit_report_round1.md` / `_batch_audit_report.md`)
OBJECTIVE: Find the defect classes that real documents hit, fix the blocking ones, leave a measured list for the rest.

FINDINGS (round 1 = main 4f7e6f0, round 2 = main 12f3a00):
| # | Defect class | Round 1 | Round 2 | Fix |
|---|---|---|---|---|
| 1 | Workbook never loads in the app (demo workbook stays) | 9/28 (lan02 61 KB!, 04, 05, 06, 08, 09, 12, 22, 23, 28) | 3/28 (lan06 11 MB, lan08, lan09 13 MB/395 images) | DOM branch threw `RangeError: Map maximum size exceeded`: a border-only cell repeated 16384 columns (Excel "format whole row") and rows repeated to 1 M were counted as data. Used range now ignores border-only runs > 64 columns / > 32 rows; materialization always capped at `lastDataCol` (12f3a00). Remaining 3 are payload size/time: lan06 → 139 MB FODS (2.47 M `<table:table-cell>` for 830 rows), lan09 → 395 images. |
| 2 | Save produced a 231 MB FODS and never finished | lan02, lan20 | 0 | serializeToFods wrote 1,048,576 `<table:table-row>` per sheet when the source hid every row below the data; trailing empty rows are now run-length encoded (`table:number-rows-repeated`). |
| 3 | Excel refuses the saved file: AutoFilter exported as an Excel Table part (header-only range / empty caption) | lan11 | 0 | Database ranges are named `__Anonymous_Sheet_DB__<n>`; leftover `xl/tables/*` AutoFilter parts are stripped in postprocess (10a7706). |
| 4 | Excel refuses the saved file: whole-column cross-sheet reference `'Giá cost1'!$A:$C` left in Excel syntax inside ODF → LibreOffice wrote `'giá cost1' $A:$C` | lan28 | fixed after round 2 | `_formulaToOdf`/`_formulaFromOdf` handle `A:C` and quoted sheet names (7f8c168). Verified: `_rt_lan28.xlsx` opens, 12 sheets. |
| 5 | Excel refuses the saved file: external workbook references `[1]ds!N$8:O$7760` become `'file:///…xlsx'#$ds.N$8:O$7760`, cached values become `#VALUE!`, `xl/externalLinks/*` dropped | lan14, lan22 | same | OPEN — brief `TASK-BRIEF-SHEET-EXTERNAL-LINKS.md` (opencode running in `E:\VNOffice-opencode-sheet-extlinks`). |
| 6 | Column widths narrower than Excel (Normal font + width unit) | all files | 0 columnWidth diffs except style-tail columns | 4f7e6f0. |
| 7 | Hidden columns "Z..XFD" (user hid all unused columns) lost | — | lan02 16358, lan19 630 | OPEN — model has no compact "hidden from column X onward"; parse drops hidden cols beyond `effectiveColLimit`, serialize caps at 4096 columns. |
| 8 | Whole-row/whole-sheet formatting on empty cells (fill/font/borders far outside data) | — | lan01 (35 k), lan05 (10 k), lan14 (1.4 M) | OPEN by design (memory); needs a row/column default-style model instead of per-cell entries. |
| 9 | Conditional formatting rules lost (lan14: 509 → 1, Dahua 240/194 rules) | — | same | OPEN — auditor does not compare `conditionalFormatting`; the adapter keeps only rule types it models. |
| 10 | Hidden rows lost (lan01 2635, lan28 173, lan02 4) | — | same | OPEN — rows hidden via `<row hidden="1">` inside the data range are not all preserved; measure with the auditor `hiddenRow` group. |
| 11 | Formula/value diffs in files with volatile or external formulas (lan01 formula=200, value=479) | — | same | Partly #5; the rest is LibreOffice recalculation writing different cached values. |

Files that are now essentially clean (≤ 20 diffs after LibreOffice-representation groups): lan18, lan23; small residues (< 2 k): lan10, lan15, lan19, lan21, lan24, lan26 (KHÓA CỬA), lan04, lan03.

IMPLEMENTATION SUMMARY: see commits 12f3a00 (used range + row RLE + regex-branch border cells), 10a7706 (AutoFilter table parts), 7f8c168 (whole-column refs), 4f7e6f0 (Normal font/column widths). Tooling in the scratchpad: `_batch_audit.py` (runner), `_excel_open_test.ps1` (ONE Excel instance per run — spawning Excel COM per file from Python reported false FAILs), `_xlsx_validate.py`, `_xlsx_sheetcheck.py`, `_xlsx_cellscan.py`, `_xlsx_only_sheets.py`, `_xlsx_bisect_rows.py` (Excel-rejection bisect), `_probe_dom_load.py` (run `loadFromFods` inside the real app and get the JS exception), `_fods_stats.py`.
FILES CHANGED: adapters/libreoffice/sheet/sheet-adapter.js; adapters/libreoffice/sheet/xlsx-native-postprocess.js; adapters/libreoffice/common/ooxml_zip_patch.py; tests/unit/sheet-import-cell-styles.test.js; tests/unit/sheet-import-audit.test.js; tests/test_sheet_autofilter_table.py; tests/test_sheet_save_colwidth.py; docs/HANDOFF-SHEET-LAN-BATCH-AUDIT.md
COMMANDS RUN: `python _batch_audit.py E:\VNOffice-opencode-lan-audit` (2 rounds, ~2 h each); per-file `_roundtrip_save_sheet.py` + auditor + `_excel_open_test.ps1`; node/python gates after each fix.
BUILD RESULT: PASS — node tests 1749/1749, python sheet tests OK (after 7f8c168).
TEST RESULTS: round 2 — 25/28 load, 25/28 saved files open in Excel (3 external-link failures: lan14, lan22; lan28 fixed after the run); KHÓA CỬA borders still 120/230/140/70/265/72 = 100 %.
KNOWN FAILURES: rows 5, 7, 8, 9, 10 above; lan06/lan08/lan09 open time/payload.
RISKS: the used-range bound drops whole-row formatting on empty cells (row 8) — visible in Excel as lost fills on blank rows; STYLE_ONLY_MAX_*_REPEAT constants (64/32) are a heuristic.
DEPENDENCIES/BLOCKERS: Codex weekly cap until 2026-09-19; opencode/nemotron is the only implementer (2–4 h per brief).
CORE PATCH ID (if any): None.
NEXT ACTION: (1) merge the external-links fix when opencode delivers and re-run `_batch_audit.py` (round 3); (2) Python-side FODS trimming before the pywebview bridge (lan06 139 MB → the used-range bound applied in `overlay_sheet_xlsx_fods`) and image streaming for lan09; (3) hidden-column/row tails as compact ranges; (4) extend the auditor with conditionalFormatting/dataValidation counts and hand the CF loss to an agent.

## Round 3 (main 8f1f7c2, 2026-09-15 04:30–05:27)
- **28/28 saved workbooks open in Excel 2016** (lan14 THI ONLINE 4 sheets, lan22, lan28 now OK). 25/28 load in the app (lan06, lan08, lan09 still not loaded — payload/time).
- Diff totals unchanged from round 2 except the fixed files: lan22 1354 → 982 (formula/value 0), lan28 14512 → 14509, lan02 17437 → 17374.
- Batch note: the first round-3 run was killed by the harness for low memory while lan14 was open together with round-2 leftovers; lan14 (1.5 M cells) must run alone at the end. _roundtrip_save_sheet.py now stops waiting as soon as the output file exists (the save-done flag never flips because the success alert awaits a click) — 20 min → ~1 min per file.
## Round 4 (main d854992, 2026-09-15 chiều) — sau tối ưu FODS + sửa ô ngày

26/26 workbook (trừ lan06 VAT 8 phút và lan14 1,5M ô chạy riêng): **26/26 lưu được, 26/26 Excel 2016 mở OK**.
So với vòng 3: không file nào tăng lệch; giảm nhờ ô ngày thành giá trị thật: lan01 81773→81294, lan02 17437→17357,
lan05 52963→52895, lan25 9417→9229, lan28 14509→14289, lan15/16/17/07/12/13 giảm 3–9.
**lan08 (HIKVISION 395 ảnh) và lan09 (COTIMEX) nay tải được trong app** (vòng 2–3 "not loaded"): lan08 4314 lệch,
lan09 115450 lệch (lần đầu so được nội dung thật — cần phân loại). lan06 (VAT): xem HANDOFF-SHEET-OPEN-HEAVY-FODS-FINDINGS.md
(146 MB → 2 MB, mở sau 470 s, lưu Excel OK).
Sự cố trong ngày: bộ tối ưu FODS cắt dải viền 16374 cột còn 54 làm lan05 không mở được ("Map maximum size exceeded") —
sửa ca546f3 (giữ > 64 cột). Bảng đầy đủ: `_batch_audit_report.md` vòng 4 trong worktree audit (không commit, chứa tên file thật).
