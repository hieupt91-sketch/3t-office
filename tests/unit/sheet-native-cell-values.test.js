import assert from "node:assert/strict";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SHEET_HELP_ENTRIES } from "../../platform/help/entries-sheet.js";

function mockContainer() {
  return {
    querySelector: () => null,
    querySelectorAll: () => [],
    focus() {},
    classList: { add() {}, remove() {}, toggle() {} }
  };
}

export async function runSheetNativeCellValuesTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test("Typed numbers, pasted numeric text, and fill series stay numeric and calculate", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "123", false);
    const pasted = {
      range: { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } },
      cells: [[{ val: "456", formula: "", style: {} }]]
    };
    grid.applyPasteSpecial(pasted, "all", { c: "B", r: 1 }, { coerceInput: true });
    grid.setCellValue("A", 2, "125", false);
    grid._executeAutofill(
      { start: { c: "A", r: 1 }, end: { c: "A", r: 2 } },
      { direction: "down", startCol: "A", endCol: "A", startRow: 3, endRow: 4 }
    );
    grid.setCellValue("C", 1, "=SUM(A1:A4)", false);

    assert.equal(typeof grid.cellsData.get("A1").val, "number");
    assert.equal(typeof grid.cellsData.get("B1").val, "number");
    assert.deepEqual([3, 4].map(row => grid.cellsData.get(`A${row}`).val), [127, 129]);
    assert.equal(grid.cellsData.get("C1").val, 504);
  });

  test("Date input becomes a formatted Excel serial and Undo restores the previous cell style", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "30/01/2026");
    const cell = grid.cellsData.get("A1");
    assert.equal(typeof cell.val, "number");
    assert.equal(cell.style.numberFormat.category, "date");
    assert.equal(cell.style.numberFormat.dateFormat, "dd/mm/yyyy");
    assert.equal(new SheetAdapter(grid)._excelSerialToIsoDate(cell.val), "2026-01-30");
    assert.equal(grid.undo(), true);
    assert.equal(grid.cellsData.get("A1").val, "");
    assert.equal(grid.cellsData.get("A1").style.numberFormat, undefined);
  });

  test("FODS writes entered numbers and dates as typed values while apostrophe keeps text", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "123", false);
    grid.setCellValue("A", 2, "30/01/2026", false);
    grid.setCellValue("A", 3, "'00123", false);
    const fods = new SheetAdapter(grid).serializeToFods();
    assert.match(fods, /<table:table-cell office:value-type="float" office:value="123"/);
    assert.match(fods, /<table:table-cell office:value-type="date" office:date-value="2026-01-30"/);
    assert.match(fods, /<table:table-cell office:value-type="string"[^>]*>\s*<text:p>00123<\/text:p>/);
  });

  test("Vietnamese Help explains numeric/date entry, external paste, fill and forced text", () => {
    const entry = SHEET_HELP_ENTRIES.find(item => item.id === "sheet.input.nativeValues");
    assert.ok(entry, "Missing native value Help entry");
    const content = [entry.title, entry.summary, ...(entry.steps || [])].join(" ");
    for (const term of ["123", "dd/mm/yyyy", "dán", "Điền", "SUM", "COUNT", "'00123", "XLSX"]) {
      assert.match(content, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    }
  });

  return results;
}
