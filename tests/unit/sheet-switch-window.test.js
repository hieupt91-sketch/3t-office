/**
 * Sheet switch must recompute the virtual window for the NEW sheet.
 * Regression (04/10/2026, lan14): Sheet1 has 33.586 hidden rows so its window was 1..32.951; switchSheet
 * reused that stale window for Sheet2 and built ~17.600 extra blank rows (680.000 DOM nodes, WebView2 2 -> 4.8 GB).
 */

import { createGridForTest } from "./sheet-virtual-scroll-row-heights.test.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function prepareTwoSheetGrid() {
  const grid = createGridForTest(33692);
  for (const name of ["renderCharts", "renderImages", "renderTextBoxes", "selectCell", "_syncCommandStates", "_applyProtectionUi",
    "_updateWatchWindow", "_renderColumnHeaders", "_updateFilterButtons", "_renderSheetTabs", "_updateFormulaReferenceVisuals"]) {
    grid[name] = () => {};
  }
  grid.sheets = ["S1", "S2"];
  grid.activeSheet = "S1";
  const hidden = new Set();
  for (let row = 1; row <= 33000; row++) hidden.add(row);
  grid.userHiddenRowsBySheet = { S1: hidden, S2: new Set() };
  grid.sheetsData = { S1: new Map(), S2: new Map() };
  grid._invalidateRowTopsCache();
  return grid;
}

export async function runSheetSwitchWindowTests() {
  const results = [];
  const test = (name, callback) => {
    try { callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test("a sheet whose first visible rows are far down gets a far window (premise)", () => {
    const grid = prepareTwoSheetGrid();
    grid._renderVirtualRows(1, 40);
    assert(grid.currentEndRow > 33000, `S1 window should reach the visible rows, got ${grid.currentEndRow}`);
  });

  test("switchSheet recomputes the window for the new sheet instead of reusing the previous one", () => {
    const grid = prepareTwoSheetGrid();
    grid._renderVirtualRows(1, 40);
    const staleEnd = grid.currentEndRow;
    grid.switchSheet("S2", { skipSave: true });
    assert(staleEnd > 33000, "premise: previous sheet window is far");
    assert(grid.currentEndRow < 200, `S2 must render only its own first screen, got end row ${grid.currentEndRow}`);
    assert(grid.currentStartRow === 1, `S2 window should start at row 1, got ${grid.currentStartRow}`);
  });

  test("switchSheet back to the sheet with hidden rows still reaches its visible rows", () => {
    const grid = prepareTwoSheetGrid();
    grid.switchSheet("S2", { skipSave: true });
    grid.switchSheet("S1", { skipSave: true });
    assert(grid.currentEndRow > 33000, `S1 must still cover its visible rows, got ${grid.currentEndRow}`);
  });

  return results;
}
