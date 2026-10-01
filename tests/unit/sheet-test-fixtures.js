import { SheetGridController } from "../../apps/sheet/sheet-grid.js";

/** Build a named workbook fixture through the same sheet operations exposed by the app. */
export function createSheetGridWithSheets(container, sheetNames) {
  const names = [...new Set((sheetNames || []).filter(Boolean))];
  const grid = new SheetGridController(container);
  if (names.length && names[0] !== "Sheet1") {
    grid.renameSheet("Sheet1", names[0], false);
  }
  for (const name of names.slice(1)) {
    grid.addSheet(name, false);
  }
  if (names.length) grid.switchSheet(names[0]);
  grid.undoStack = [];
  grid.redoStack = [];
  return grid;
}
