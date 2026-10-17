import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { createSheetGridWithSheets } from "./sheet-test-fixtures.js";
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
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
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
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    grid.switchSheet("Kế hoạch Q3"); grid.setCellValue("B", 2, 42, false);
    grid.switchSheet("Dự toán chi phí"); grid.setCellValue("C", 2, "='Kế hoạch Q3'!B2", false);
    assert(numberAt(grid, "Dự toán chi phí", "C2") === 42, "Ô đơn cross-sheet phải bằng 42");
    grid.deleteSheet("Kế hoạch Q3", false);
    assert(grid.sheetsData["Dự toán chi phí"].get("C2")?.val === "#REF!", "Xóa sheet nguồn phải tạo #REF!");
  });

  await test("Named Range workbook giữ sheet đích khi dùng từ sheet khác", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    grid.switchSheet("Kế hoạch Q3");
    grid.setCellValue("A", 1, 7, false); grid.setCellValue("A", 2, 8, false);
    grid.saveNamedRange({ name: "DoanhThu_Q3", ref: "A1:A2", scope: "workbook" }, false);
    grid.switchSheet("Nhân sự"); grid.setCellValue("B", 1, "=SUM(DoanhThu_Q3)", false);
    assert(numberAt(grid, "Nhân sự", "B1") === 15, "Named range phải đọc sheet nơi nó được định nghĩa");
  });

  await test("Array formula: nhân hai vùng điền từng ô và recalc element-wise", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    for (let row = 1; row <= 5; row++) { grid.setCellValue("A", row, row, false); grid.setCellValue("B", row, row + 1, false); }
    grid.undoStack = []; grid.selectionRange = { start: { c: "C", r: 1 }, end: { c: "C", r: 5 } }; grid.selectedCoord = { c: "C", r: 1 };
    assert(grid.enterArrayFormula({ formula: "=A1:A5*B1:B5" }), "Nhập array formula phải thành công");
    assert([2, 6, 12, 20, 30].every((v, i) => numberAt(grid, grid.activeSheet, `C${i + 1}`) === v), "Mỗi ô C1:C5 phải có tích đúng");
    assert(grid.cellsData.get("C3").isArrayFormula && grid.cellsData.get("C3").arrayRange === "C1:C5", "Metadata array phải có trên mọi ô");
    grid.setCellValue("A", 3, 10, false);
    assert(numberAt(grid, grid.activeSheet, "C3") === 40, "Array formula phải recalc theo nguồn");
  });

  await test("TRANSPOSE: Ctrl+Shift+Enter fills only the transposed shape and recalculates", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    [[1, 2, 3], [4, 5, 6]].forEach((row, rowIndex) => row.forEach((value, colIndex) => {
      grid.setCellValue(grid.cols[colIndex], rowIndex + 1, value, false);
    }));
    grid.undoStack = [];
    grid.selectionRange = { start: { c: "D", r: 1 }, end: { c: "E", r: 3 } };
    grid.selectedCoord = { c: "D", r: 1 };
    assert(grid.enterArrayFormula({ formula: "=TRANSPOSE(A1:C2)" }), "TRANSPOSE phải nhận vùng đích 3 hàng × 2 cột");
    assert([[1, 4], [2, 5], [3, 6]].every((row, rowIndex) => row.every((value, colIndex) =>
      numberAt(grid, grid.activeSheet, `${grid.cols[3 + colIndex]}${rowIndex + 1}`) === value)), "TRANSPOSE phải đảo hàng/cột theo thứ tự ô");
    assert(grid.formulaEngine.evaluate("=TRANSPOSE(A1:C2)") === "#VALUE!", "Nhập như công thức scalar phải trả #VALUE! như Excel 2016");
    grid.selectionRange = { start: { c: "F", r: 1 }, end: { c: "H", r: 2 } };
    grid.selectedCoord = { c: "F", r: 1 };
    assert(!grid.enterArrayFormula({ formula: "=TRANSPOSE(A1:C2)" }), "Sai kích thước vùng đích phải bị từ chối");
    grid.setCellValue("C", 2, 9, false);
    assert(numberAt(grid, grid.activeSheet, "E3") === 9, "Mảng TRANSPOSE phải tính lại khi ô nguồn đổi");
  });

  await test("Array formula: một bước Undo/Redo khôi phục nguyên cả vùng", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    for (let row = 1; row <= 5; row++) { grid.setCellValue("A", row, row, false); grid.setCellValue("B", row, 2, false); grid.setCellValue("C", row, `old-${row}`, false); }
    grid.undoStack = []; grid.selectionRange = { start: { c: "C", r: 1 }, end: { c: "C", r: 5 } }; grid.selectedCoord = { c: "C", r: 1 };
    grid.enterArrayFormula({ formula: "=A1:A5+B1:B5" });
    assert(grid.undoStack.length === 1, "Điền cả vùng phải chỉ tạo một history action");
    grid.undo(); assert([1,2,3,4,5].every(row => grid.cellsData.get(`C${row}`)?.val === `old-${row}`), "Undo phải khôi phục cả vùng");
    grid.redo(); assert([3,4,5,6,7].every((v, i) => numberAt(grid, grid.activeSheet, `C${i + 1}`) === v), "Redo phải điền lại cả vùng");
  });

  await test("Array aggregate: SUM(A1:A5*B1:B5) trả một giá trị", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    for (let row = 1; row <= 5; row++) { grid.setCellValue("A", row, row, false); grid.setCellValue("B", row, 2, false); }
    assert(grid.formulaEngine.evaluateArray("=SUM(A1:A5*B1:B5)") === 30, "SUMPRODUCT-style phải bằng 30");
  });

  await test("Không sửa một phần mảng; chọn cả khối mới xóa được trong một bước undo", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    for (let row = 1; row <= 3; row++) grid.setCellValue("A", row, row, false);
    grid.selectionRange = { start: { c: "C", r: 1 }, end: { c: "C", r: 3 } }; grid.selectedCoord = { c: "C", r: 1 };
    grid.enterArrayFormula({ formula: "=A1:A3+10" }); grid.undoStack = [];
    grid.selectionRange = { start: { c: "C", r: 2 }, end: { c: "C", r: 2 } }; grid.selectedCoord = { c: "C", r: 2 };
    assert(grid.setCellValue("C", 2, "") === false, "Xóa một ô thành viên phải bị chặn");
    assert([11,12,13].every((v, i) => numberAt(grid, grid.activeSheet, `C${i + 1}`) === v), "Chặn sửa phải giữ nguyên cả mảng");
    grid.selectionRange = { start: { c: "C", r: 1 }, end: { c: "C", r: 3 } }; grid.selectedCoord = { c: "C", r: 1 };
    grid.setCellValue("C", 1, "");
    assert([1,2,3].every(row => !grid.cellsData.has(`C${row}`)) && grid.undoStack.length === 1, "Xóa cả khối phải là một action");
    grid.undo(); assert([11,12,13].every((v, i) => numberAt(grid, grid.activeSheet, `C${i + 1}`) === v), "Undo phải phục hồi nguyên vùng array");
  });

  await test("Hàm ma trận/thống kê điền đúng hình dạng và CSE SUM(IF) một ô", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    [[1, 2], [3, 4]].forEach((values, r) => values.forEach((value, c) => grid.setCellValue(grid.cols[c], r + 1, value, false)));
    [[5, 6], [7, 8]].forEach((values, r) => values.forEach((value, c) => grid.setCellValue(grid.cols[c + 2], r + 1, value, false)));
    grid.selectionRange = { start: { c: "F", r: 1 }, end: { c: "G", r: 2 } }; grid.selectedCoord = { c: "F", r: 1 };
    assert(grid.enterArrayFormula({ formula: "=MMULT(A1:B2,C1:D2)" }), "MMULT phải nhận vùng 2×2");
    assert([19, 22, 43, 50].every((value, index) => numberAt(grid, grid.activeSheet, `${index % 2 ? "G" : "F"}${Math.floor(index / 2) + 1}`) === value), "MMULT sai phần tử");
    grid.selectionRange = { start: { c: "J", r: 1 }, end: { c: "J", r: 1 } }; grid.selectedCoord = { c: "J", r: 1 };
    assert(grid.formulaEngine.evaluate("=SUM(IF(A1:B2>1,1,0))") === "#VALUE!", "Nhập thường không được tự chuyển thành CSE");
    assert(grid.enterArrayFormula({ formula: "=SUM(IF(A1:B2>1,1,0))" }), "CSE một ô SUM(IF) phải được nhận");
    assert(numberAt(grid, grid.activeSheet, "J1") === 3, "SUM(IF) CSE phải bằng 3");
    assert(grid._formulaBarTextFor("F1") === "{=MMULT(A1:B2,C1:D2)}", "Thanh công thức phải hiện ngoặc mảng");
    grid.selectionRange = { start: { c: "L", r: 1 }, end: { c: "M", r: 1 } }; grid.selectedCoord = { c: "L", r: 1 };
    assert(!grid.enterArrayFormula({ formula: "=MUNIT(2)" }), "Vùng cùng số ô nhưng sai hình dạng phải bị từ chối");
  });

  await test("Command, dispatch và i18n VI/EN của arrayEnter đầy đủ", async () => {
    const command = SHEET_COMMANDS.find(item => item.id === "sheet.formula.arrayEnter");
    assert(command?.shortcut === "Ctrl+Shift+Enter" && command.icon, "Command phải có shortcut và icon thật");
    assert(viStrings.commands[command.id]?.label && viStrings.commands[command.id]?.tooltip && enStrings.commands[command.id]?.label && enStrings.commands[command.id]?.tooltip, "Phải có i18n song ngữ");
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]); grid.selectionRange = { start: { c: "C", r: 1 }, end: { c: "C", r: 1 } }; grid.selectedCoord = { c: "C", r: 1 };
    const adapter = new SheetAdapter(grid); adapter.attach();
    assert(await adapter.handleDispatch(null, { formula: "=1+2" }, command.id), "handleDispatch phải xử lý command thật");
    assert(await globalCommandBus.execute(command.id, { formula: "=2+3" }), "bindHandler phải xử lý command thật");
  });
  await test("Array formula: FODS matrix spans round-trip và loadFromFods khôi phục toàn vùng", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    for (let row = 1; row <= 3; row++) {
      grid.setCellValue("A", row, row, false);
      grid.setCellValue("B", row, 10, false);
    }
    grid.selectionRange = { start: { c: "C", r: 1 }, end: { c: "C", r: 3 } };
    grid.selectedCoord = { c: "C", r: 1 };
    grid.enterArrayFormula({ formula: "=A1:A3*B1:B3" });
    const adapter = new SheetAdapter(grid);
    const xml = adapter.serializeToFods();
    assert((xml.match(/table:number-matrix-rows-spanned="3"/g) || []).length === 1, "Matrix span phải chỉ có trên ô góc");
    assert((xml.match(/table:formula=/g) || []).length === 1, "Array formula không được lặp trên ô thành viên");
    const parsed = adapter.parseFods(xml);
    const sheet = grid.activeSheet;
    assert([1, 2, 3].every(row => parsed.sheetsData[sheet].get(`C${row}`)?.isArrayFormula), "Parser không khôi phục metadata toàn vùng");
    assert(parsed.sheetsData[sheet].get("C2")?.arrayRange === "C1:C3", "Parser khôi phục sai arrayRange");

    const loaded = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    assert(new SheetAdapter(loaded).loadFromFods(xml), "loadFromFods thất bại");
    assert(loaded.sheetsData[sheet].get("C3")?.formula === "=A1:A3*B1:B3", "loadFromFods không khôi phục array formula");
  });
  return results;
}
