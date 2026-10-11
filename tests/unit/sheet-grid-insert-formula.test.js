import { SheetGridController } from "../../apps/sheet/sheet-grid.js";

const assert = (condition, message) => { if (!condition) throw new Error(message); };

function makeGrid(values) {
  const grid = Object.create(SheetGridController.prototype);
  grid.selectedCoord = { c: "C", r: 7 };
  grid.cellsData = new Map(Object.entries(values).map(([row, val]) => [`C${row}`, { val }]));
  grid.formulaInput = { value: "" };
  grid.setCellValue = (col, row, formula) => {
    grid.written = { col, row, formula };
    return true;
  };
  return grid;
}

export async function runSheetGridInsertFormulaTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test("AutoAverage includes the full contiguous numeric range above the active cell", () => {
    const grid = makeGrid({ 1: "Số tiền", 2: 1234.5, 3: 5678.9, 4: 2468, 5: 1357.2, 6: 9876.5 });
    grid.insertFormula("AVERAGE");
    assert(grid.written.formula === "=AVERAGE(C2:C6)", `Formula sai: ${grid.written.formula}`);
    assert(grid.formulaInput.value === "=AVERAGE(C2:C6)", `Formula bar sai: ${grid.formulaInput.value}`);
  });

  test("AutoSum stops at the first blank or nonnumeric cell", () => {
    const grid = makeGrid({ 2: 10, 3: 20, 4: "ghi chú", 5: 50, 6: 60 });
    grid.insertFormula("SUM");
    assert(grid.written.formula === "=SUM(C5:C6)", `Formula sai: ${grid.written.formula}`);
  });

  test("Shrink Font moves down from imported 11 pt despite px rounding", () => {
    const grid = Object.create(SheetGridController.prototype);
    grid.selectedCoord = { c: "B", r: 2 };
    grid.cellsData = new Map([["B2", { style: { fontSize: "14.67px" } }]]);
    grid.setStyle = (prop, value) => { grid.changed = [prop, value]; return true; };
    grid.adjustFontSize(-1);
    assert(JSON.stringify(grid.changed) === JSON.stringify(["fontSize", "13.33px"]), `Font size sai: ${JSON.stringify(grid.changed)}`);
  });

  return results;
}
