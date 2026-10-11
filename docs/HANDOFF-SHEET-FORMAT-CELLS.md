# Agent Handoff
TASK: VN Sheet Format Cells dialog (Ctrl+1), Excel-standard number formatting
AGENT/ROLE: agy (implementation) + Claude (finish/verify — agy's session hit the CLI's own print-timeout wrapper mid-Playwright-verification, not a quota block; real work was left committed + partially uncommitted, Claude finished and verified)
BRANCH: feature/sheet-format-cells-dialog
WORKTREE: E:\VNOffice-agy-sheet-formatcells

## Summary

Built a full Format Cells dialog (`apps/sheet/format-cells-dialog.js`) and number-formatting engine (`apps/sheet/number-formatter.js`) matching real Excel/LibreOffice Calc's Ctrl+1 dialog: category list (General, Number, Currency, Accounting, Date, Percentage, Scientific, Text, Custom) with a live Sample preview, wired into `SheetGridController` (`showFormatCellsDialog()`, `applyNumberFormat()`), the ribbon (Home tab Number group gets a dialog-launcher button matching Excel's corner-launcher convention, next to the existing quick VNĐ-currency/percent buttons which now share the same underlying logic), the Command Bus (`sheet.format.cellsDialog`), and `Ctrl+1` via both the grid's own keydown handler and ShortcutManager.

Accounting vs Currency are correctly distinguished (the point accountants care about most): Accounting left-aligns the currency symbol, right-aligns the number, shows a centered dash for zero, and puts negative numbers in parentheses with no minus sign — verified live, not just in the dialog UI but on real formatted cell values in a running grid. Percentage's two-way behavior is correct: typing `50` into a %-formatted cell stores `0.5` and displays `50.00%` (not `5000%`).

## Verification performed

- `node tests/run-tests.js`: 511/511 PASS (~11s).
- Independently re-ran agy's own live Playwright script (`tests/live/sheet-format-cells.playwright.mjs`) against a freshly started server — confirmed live in a real browser: Ctrl+1 opens the dialog, the ribbon launcher button opens it too, Currency/Accounting/Percentage all render correctly on real cells (`"₫-"` for Accounting zero, `"₫(50,000.00)"` for Accounting negative, `50.00%`/`0.5` for the Percentage two-way case), dialog closes cleanly with no leftover overlay, zero console errors.
- Claude additionally ran a real `soffice.exe` headless round-trip (FODS → XLSX → FODS, same technique as the multi-sheet fix) to check whether the new `vno:number-format` custom XML attribute survives a **real** Save→Open cycle through actual XLSX — see Known Limitation below.

## Known limitation (real, not swept under the rug)

**Number formats set via Format Cells are currently session-only — they do NOT survive a real Lưu (Save) → Mở (Open) round trip through actual XLSX.** `serializeToFods()` stores the format as a custom `vno:number-format="{...JSON...}"` attribute on `<table:table-cell>`, and `parseFods()` reads it back correctly — but this only round-trips within VN Office's own in-memory serialize/parse (confirmed by the existing unit test, renamed to make this scope explicit). When Claude ran the same cell through a **real** `soffice.exe --convert-to` FODS→XLSX→FODS hop, the custom `vno:number-format` attribute was stripped entirely — LibreOffice discards unrecognized namespace attributes at the `<table:table-cell>` level when converting to XLSX, since OOXML has no slot for an attribute it doesn't understand. The underlying cell **value is never lost** (confirmed 1500000 / -50000 both survived intact) — only the format metadata is, so a user who saves and reopens a file will see plain numbers again and need to reapply Format Cells.

This is the same class of limitation as the multi-sheet FODS fix's ActiveTable gap (`docs/HANDOFF-SHEET-FODS-MULTISHEET.md`), but higher-priority to eventually close since number formats are core to the "accountant switching from Excel" bar. The real fix is to stop using a custom attribute and instead emit standard ODF automatic styles: a `<number:number-style>` (or `<number:currency-style>`) definition per distinct format in `<office:automatic-styles>`, referenced from each cell via a real `table:style-name` — this is a first-class ODF/OOXML-shared concept that LibreOffice's conversion pipeline does preserve (unlike arbitrary custom namespaces), since Excel has native number-format records to map onto. Scoped as a follow-up adapter task, not done in this pass — flagged in `docs/FEATURE-PARITY-ROADMAP.md`.

## Files changed
`apps/sheet/format-cells-dialog.js` (new), `apps/sheet/number-formatter.js` (new), `apps/sheet/sheet-grid.js`, `apps/sheet/sheet-ribbon.js`, `apps/sheet/formula-engine.js` (Text-format cells excluded from SUM etc.), `adapters/libreoffice/sheet/sheet-adapter.js`, `platform/commands/command-definitions.js`, `platform/commands/command-bus.js` (`dispatch()` compatibility alias), `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, `platform/i18n/i18n.js` (string-fallback support), `platform/ribbon/ribbon-host.js`, `platform/ui-kit/icons.js`, `tests/unit/sheet-format-cells.test.js`, `tests/live/sheet-format-cells.playwright.mjs` (new), `tests/run-tests.js`.

## Next action
Merged into `main` by Claude after independent verification. Follow-up (not urgent, no data loss involved): real ODF number-style persistence through actual XLSX save/reopen — good next task for whichever agent has adapter/engine capacity.
