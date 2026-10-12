# FIX-S16 results

Branch `audit/sheet-s16-codex`, worktree `E:\VNOffice-codex-fs16`. CDP profile: `E:\VNOffice-profiles\codex-fs16`. All app interactions used the desktop runner; Excel COM opened saved files ReadOnly.

## Group A: controls with XLSX output

- Font family, size and number category: matched Excel. The runner could not focus native `<select>` controls by mouse/keys; CDP set the visible select's DOM `value`, dispatched a bubbling `change`, then saved. The exact steps and before/after values are in the runner log and evidence `evidence/s16/fontArial.png`, `size16.png`, `numNumber.png`, `numCurrency.png`, `numAccounting.png`.
- Format Cells: UI applied Currency / 2 decimals; Excel read B2 `NumberFormat='#,##0.00 [$₫]'`. The dialog visibly disables Font, Border, Fill and Protection tabs; those subfeatures are not claimed as verified. Evidence: `evidence/s16/CellsDialog.png`.
- Sheet and workbook protection: Excel read `ProtectContents=True` and `ProtectStructure=True`. Evidence: `ProtectSheet.png`, `ProtectWorkbook.png`.
- Seven function categories: UI opened each category, showed the expected default function (PMT, IF, CONCAT, TODAY, VLOOKUP, SUM, AVERAGE), inserted a valid formula, and Excel read each formula/result back. Evidence: `Category*.png`.
- View Normal, Zoom Reset, Zoom to Selection: Excel read `View=1`, `Zoom=100`, and `Zoom=200` after selecting A1:G6. Evidence: `ViewNormal.png`, `ZoomReset.png`, `ZoomToSelection.png`.
- `sheet.calc.calculationOptions` is a reproducible known gap: UI set Manual, but Excel read `Application.Calculation=-4105` and `xl/workbook.xml` `<calcPr>` omitted `calcMode`.
- `sheet.insert.textbox` is a reproducible known gap: app showed the inserted text box, while Excel read `Shapes.Count=0` from the saved XLSX.
- Adapter handoff for those gaps: `docs/AGENT-HANDOFF-FIX-S16-ADAPTER-GAPS.md`.

## UI-only tools

Formula evaluation, Watch Window and spell-check controls are marked `KHÁC CÓ CHỦ Ý`: their observed results are transient UI state, not workbook properties. The evaluator showed H2 `=SUM(C2:C6)` and 20615.1; Watch Window listed H2. Evidence: `EvaluateFormula.png`, `WatchWindow.png`, `SpellCheck.png`, `ToggleSpellCheck.png`.

## Verification status

- CDP runner syntax check: PASS (`node --check scripts/audit-0610/word_parallel/app-ops-sheet.desktop.mjs`).
- Excel COM ReadOnly group-A readback: PASS for checked files; the two known gaps above were recorded as mismatches.
- `npm test`, Python unittest discovery, XLSX corpus batch and encoding scan: NOT RUN yet; run after groups B and C.
