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

## Group B: clipboard and comment resolution

- Copy, Cut and Paste: CDP used Ctrl+C/Ctrl+X/Ctrl+V. Excel COM ReadOnly confirmed B2 copied to I2, C2 cut to I2 with C2 cleared, and test text pasted to I2. For each clipboard case, the test read the original through the app bridge without logging its contents, set test data, ran the UI operation, and restored the original; all three restorations passed.
- Format Painter: CDP applied Bold at B2 then used Format Painter at C2; Excel COM read `C2.Font.Bold=True`.
- Comment Resolve: UI state became `resolved=true`; Excel COM still read the C2 legacy note, and `xl/comments1.xml` has no resolved state. Recorded as a known gap and added to the Adapter handoff.
- Evidence: `evidence/s16/FormatPainter.png`, `CommentResolve.png`.

## UI-only tools

Formula evaluation, Watch Window and spell-check controls are marked `KHÁC CÓ CHỦ Ý`: their observed results are transient UI state, not workbook properties. The evaluator showed H2 `=SUM(C2:C6)` and 20615.1; Watch Window listed H2. Evidence: `EvaluateFormula.png`, `WatchWindow.png`, `SpellCheck.png`, `ToggleSpellCheck.png`.

## Group C: UI-only commands

- Trace Precedents and Trace Dependents were clicked in the Formulas ribbon with test formulas H2=`=SUM(C2:C6)` and H3=`=H2*2`. The app drew arrows for five precedent cells (C2:C6) and one dependent cell (H3). Remove Arrows cleared both classes and returned the arrow list to empty. These are temporary UI overlays; no XLSX field represents them. Evidence: `evidence/s16/TracePrecedents.png`, `TraceDependents.png`, `TraceRemoveArrows.png`.
- F1 opened the in-app Help panel; the Help tab About command opened the About dialog. Record Macro was toggled on and off without edits while recording; View Macros opened its manager. Evidence: `HelpF1.png`, `About.png`, `MacroRecord.png`, `MacroManager.png`.
- The ribbon command labeled Print Preview opened the document print dialog with printer and page controls. No print action was issued. It currently presents the print dialog rather than a rendered preview; evidence: `PrintPreview.png`.
- New Window was invoked from the View tab. The command is a window action with no workbook property; evidence: `NewWindow.png`.
- AI Assistant opened its local panel. The ribbon screenshot shows Quick Summary, Explain Formula, and Create Formula. Those three content actions were deliberately not activated, so no selected cells, formulas, or document text were sent to AI. Evidence: `AiToggle.png`, `AiActionsEvidence.png`.
- Comment Previous/Next are UI navigation actions with no serialized active-cell position; earlier CDP evidence shows D2→C2 and C2→D2 in `evidence/fix-s12-commentPrevious.png` and `fix-s12-commentNext.png`.
- `sheet.formula.createFromSelection` remains `CHƯA ĐỐI CHIẾU`: the earlier probe found Vietnamese-header name normalization, but exact Excel naming rules were not compared.

## Verification status

- CDP runner syntax check: PASS (`node --check scripts/audit-0610/word_parallel/app-ops-sheet.desktop.mjs`).
- Excel COM ReadOnly group-A and B readback: PASS for checked file-backed outputs; three known gaps (calculation mode, text box export, resolved-comment persistence) are recorded as mismatches.
- `npm test`, Python unittest discovery, XLSX corpus batch and encoding scan: NOT RUN yet; run after groups B and C.
