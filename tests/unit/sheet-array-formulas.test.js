import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { SHEET_COMMANDS } from "../../platform/commands/command-definitions.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

function container() {
  return { querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, classList: { add() {}, remove() {}, toggle() {} } };
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function numberAt(grid, sheet, coord) {
  const value = grid.sheetsData[sheet].get(coord)?.val;
  return typeof value === "number" ? value : Number(String(value).replace(/\./g, "").replace(/[^\d-]/g, ""));
}

export async function runSheetArrayFormulaTests() {
  const results = [];
  const test = async (name, fn) => { try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  await test("Cross-sheet: SUM sheet có khoảng trắng trả đúng tổng và recalc khi nguồn đổi", () => {
    const grid = new SheetGridController(container());
    grid.switchSheet("Kế hoạch Q3");
    [1, 2, 3, 4, 5].forEach((value, index) => grid.setCellValue("A", index + 1, value, false));
    grid.switchSheet("Dự toán chi phí");
    grid.setCellValue("C", 1, "=SUM('Kế hoạch Q3'!A1:A5)", false);
    assert(numberAt(grid, "Dự toán chi phí", "C1") === 15, "Tổng cross-sheet phải bằng 15");
    grid.switchSheet("Kế hoạch Q3");
    grid.setCellValue("A", 5, 10, false);
    assert(numberAt(grid, "Dự toán chi phí", "C1") === 20, "Formula ở sheet khác phải recalc thành 20");
  });

  await test("Cross-sheet: tham chiếu ô đơn và xóa sheet trả #REF! không crash", () => {
    const grid = new SheetGridController(container());
    grid.switchSheet("Kế hoạch Q3"); grid.setCellValue("B", 2, 42, false);
    grid.switchSheet("Dự toán chi phí"); grid.setCellValue("C", 2, "='Kế hoạch Q3'!B2", false);
    assert(numberAt(grid, "Dự toán chi phí", "C2") === 42, "Ô đơn cross-sheet phải bằng 42");
    grid.deleteSheet("Kế hoạch Q3", false);
    assert(grid.sheetsData["Dự toán chi phí"].get("C2")?.val === "#REF!", "Xóa sheet nguồn phải tạo #REF!");
  });

  await test("Named Range workbook giữ sheet đích khi dùng từ sheet khác", () => {
    const grid = new SheetGridController(container());
    grid.switchSheet("Kế hoạch Q3");
    grid.setCellValue("A", 1, 7, false); grid.setCellValue("A", 2, 8, false);
    grid.saveNamedRange({ name: "DoanhThu_Q3", ref: "A1:A2", scope: "workbook" }, false);
    grid.switchSheet("Nhân sự"); grid.setCellValue("B", 1, "=SUM(DoanhThu_Q3)", false);
    assert(numberAt(grid, "Nhân sự", "B1") === 15, "Named range phải đọc sheet nơi nó được định nghĩa");
  });

  await test("Array formula: nhân hai vùng điền từng ô và recalc element-wise", () => {
    const grid = new SheetGridController(container());
    for (let row = 1; row <= 5; row++) { grid.setCellValue("A", row, row, false); grid.setCellValue("B", row, row + 1, false); }
    grid.undoStack = []; grid.selectionRange = { start: { c: "C", r: 1 }, end: { c: "C", r: 5 } }; grid.selectedCoord = { c: "C", r: 1 };
    assert(grid.enterArrayFormula({ formula: "=A1:A5*B1:B5" }), "Nhập array formula phải thành công");
    assert([2, 6, 12, 20, 30].every((v, i) => numberAt(grid, grid.activeSheet, `C${i + 1}`) === v), "Mỗi ô C1:C5 phải có tích đúng");
    assert(grid.cellsData.get("C3").isArrayFormula && grid.cellsData.get("C3").arrayRange === "C1:C5", "Metadata array phải có trên mọi ô");
    grid.setCellValue("A", 3, 10, false);
    assert(numberAt(grid, grid.activeSheet, "C3") === 40, "Array formula phải recalc theo nguồn");
  });

  await test("Array formula: một bước Undo/Redo khôi phục nguyên cả vùng", () => {
    const grid = new SheetGridController(container());
    for (let row = 1; row <= 5; row++) { grid.setCellValue("A", row, row, false); grid.setCellValue("B", row, 2, false); grid.setCellValue("C", row, `old-${row}`, false); }
    grid.undoStack = []; grid.selectionRange = { start: { c: "C", r: 1 }, end: { c: "C", r: 5 } }; grid.selectedCoord = { c: "C", r: 1 };
    grid.enterArrayFormula({ formula: "=A1:A5+B1:B5" });
    assert(grid.undoStack.length === 1, "Điền cả vùng phải chỉ tạo một history action");
    grid.undo(); assert([1,2,3,4,5].every(row => grid.cellsData.get(`C${row}`)?.val === `old-${row}`), "Undo phải khôi phục cả vùng");
    grid.redo(); assert([3,4,5,6,7].every((v, i) => numberAt(grid, grid.activeSheet, `C${i + 1}`) === v), "Redo phải điền lại cả vùng");
  });

  await test("Array aggregate: SUM(A1:A5*B1:B5) trả một giá trị", () => {
    const grid = new SheetGridController(container());
    for (let row = 1; row <= 5; row++) { grid.setCellValue("A", row, row, false); grid.setCellValue("B", row, 2, false); }
    assert(grid.formulaEngine.evaluateArray("=SUM(A1:A5*B1:B5)") === 30, "SUMPRODUCT-style phải bằng 30");
  });

  await test("Xóa một ô thuộc array formula xóa cả vùng trong một bước undo", () => {
    const grid = new SheetGridController(container());
    for (let row = 1; row <= 3; row++) grid.setCellValue("A", row, row, false);
    grid.selectionRange = { start: { c: "C", r: 1 }, end: { c: "C", r: 3 } }; grid.selectedCoord = { c: "C", r: 1 };
    grid.enterArrayFormula({ formula: "=A1:A3+10" }); grid.undoStack = [];
    grid.setCellValue("C", 2, "");
    assert([1,2,3].every(row => !grid.cellsData.has(`C${row}`)) && grid.undoStack.length === 1, "Xóa lẻ phải xóa nguyên vùng bằng một action");
    grid.undo(); assert([11,12,13].every((v, i) => numberAt(grid, grid.activeSheet, `C${i + 1}`) === v), "Undo phải phục hồi nguyên vùng array");
  });

  await test("Command, dispatch và i18n VI/EN của arrayEnter đầy đủ", async () => {
    const command = SHEET_COMMANDS.find(item => item.id === "sheet.formula.arrayEnter");
    assert(command?.shortcut === "Ctrl+Shift+Enter" && command.icon, "Command phải có shortcut và icon thật");
    assert(viStrings.commands[command.id]?.label && viStrings.commands[command.id]?.tooltip && enStrings.commands[command.id]?.label && enStrings.commands[command.id]?.tooltip, "Phải có i18n song ngữ");
    const grid = new SheetGridController(container()); grid.selectionRange = { start: { c: "C", r: 1 }, end: { c: "C", r: 1 } }; grid.selectedCoord = { c: "C", r: 1 };
    const adapter = new SheetAdapter(grid); adapter.attach();
    assert(await adapter.handleDispatch(null, { formula: "=1+2" }, command.id), "handleDispatch phải xử lý command thật");
    assert(await globalCommandBus.execute(command.id, { formula: "=2+3" }), "bindHandler phải xử lý command thật");
  });
  return results;
}
