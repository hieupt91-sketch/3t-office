import { SheetGridController } from "../../apps/sheet/sheet-grid.js";

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const mockContainer = () => ({ querySelector: () => null, querySelectorAll: () => [], focus() {} });

export async function runSheetAutoFillTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test("AutoFill continues dd/mm/yyyy dates across month and year boundaries", () => {
    const grid = new SheetGridController(mockContainer());
    grid.cellsData.set("A1", { val: "31/12/2026", formula: "", style: {} });
    grid.cellsData.set("A2", { val: "01/01/2027", formula: "", style: {} });
    grid._executeAutofill(
      { start: { c: "A", r: 1 }, end: { c: "A", r: 2 } },
      { direction: "down", startCol: "A", endCol: "A", startRow: 3, endRow: 5 }
    );
    assert([3, 4, 5].map(row => grid.cellsData.get(`A${row}`)?.val).join(",") === "02/01/2027,03/01/2027,04/01/2027",
      "Date fill should add one day and preserve dd/mm/yyyy text format");
  });

  test("Double-click AutoFill fills to adjacent contiguous data and is one Undo step", () => {
    const grid = new SheetGridController(mockContainer());
    grid.cellsData.set("G1", { val: "1", formula: "", style: {} });
    grid.cellsData.set("G2", { val: "2", formula: "", style: {} });
    for (let row = 1; row <= 6; row++) grid.cellsData.set(`H${row}`, { val: `row${row}`, formula: "", style: {} });
    grid.selectionRange = { start: { c: "G", r: 1 }, end: { c: "G", r: 2 } };

    assert(grid._autofillDownToAdjacentData() === true, "Adjacent data should give double-click AutoFill a target");
    assert([3, 4, 5, 6].map(row => grid.cellsData.get(`G${row}`)?.val).join(",") === "3,4,5,6",
      "Double-click AutoFill should continue the two-value number series");
    grid.undo();
    assert([3, 4, 5, 6].every(row => {
      const cell = grid.cellsData.get(`G${row}`);
      return !cell || cell.val === "";
    }), "One Undo should remove the entire fill");
  });

  test("Double-click AutoFill does nothing without adjacent contiguous data", () => {
    const grid = new SheetGridController(mockContainer());
    grid.cellsData.set("A1", { val: "source", formula: "", style: {} });
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } };
    assert(grid._autofillDownToAdjacentData() === false, "No adjacent data should leave fill unchanged");
    assert(!grid.cellsData.has("A2"), "No target cell should be created");
  });

  return results;
}
