# Plan Q68 — Sheet chart XLSX round-trip

## Objective

Keep a Sheet chart outside its source cells after save and reopen, and retain series names from their header cells.

## Current capability

Sheet already renders charts from selected ranges and saves/reopens XLSX through the LibreOffice adapter. The D10 desktop reproduction showed the inserted chart at `left=346px` with series name `Số lượng`; after reopening, it moved to `left=197.65px`, overlapped B:C, and showed `Series 1`. The saved XLSX retained a DrawingML anchor and `c:strRef` to `C1`, so the loss occurred in VN Sheet's export/import path. LibreOffice also placed a non-decodable chart preview image in the chart frame; importing it as a separate image drew a dashed broken-image box over the chart.

## Files and modules

- `apps/sheet/sheet-grid.js`: persist the same initial x/y coordinates used by chart rendering.
- `adapters/libreoffice/sheet/sheet-adapter.js`: include series label-cell ranges when deriving the imported chart range; discard a chart's redundant preview image before normal image parsing.
- `tests/unit/sheet-charts.test.js` and `tests/unit/sheet-charts-import.test.js`: protect anchor and header import behavior.
- `tests/live/cdp/sheet-d10-chart-roundtrip.desktop.mjs`: desktop save/reopen reproduction and screenshot evidence.
- `docs/EXCEL2016-FEATURE-CHECKLIST.md`: regenerated source line references after moving Sheet code.

## Dependencies

No new dependency. Reuse the existing Sheet chart model, LibreOffice conversion path, and CDP harness.

## Risks

Chart positions are stored in CSS pixels while XLSX anchors are converted through LibreOffice; round-trip position can vary with column widths. The check must establish that the reopened chart starts after the data range, rather than require identical pixels. Adding label cells can expand the imported range by the header row; series data and category labels must remain unchanged.

## Test plan

- Run the D10 desktop case before and after the fix, including screenshots at 1366×768 in light and dark themes.
- Confirm the imported chart does not create a `.vno-image-broken` overlay.
- Check the generated XLSX DrawingML anchor and `c:strRef`/cached series name.
- Run Sheet chart unit tests, the Node suite, i18n parity, checklist evidence, related pytest, and the 27-file LAN XLSX audit. Excel COM is blocked by task instruction; record `BLOCKED` and rely on LibreOffice package diff/lint.

## Rollback

Revert the Q68 D10 commit; it changes only Sheet chart placement/import and its regression evidence.
