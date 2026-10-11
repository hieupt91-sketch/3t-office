import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { PivotTableEngine } from "../../apps/sheet/pivot-table.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { SHEET_COMMANDS } from "../../platform/commands/command-definitions.js";

function container() { return { querySelector(){ return null; }, querySelectorAll(){ return []; }, addEventListener(){}, classList:{ add(){}, remove(){}, toggle(){} } }; }
function assert(condition, message) { if (!condition) throw new Error(message); }
function seed(grid) {
  const data = [["A1","Vùng"],["B1","Sản phẩm"],["C1","Doanh số"],["A2","Bắc"],["B2","Bút"],["C2",10],["A3","Bắc"],["B3","Vở"],["C3",20],["A4","Nam"],["B4","Bút"],["C4",15],["A5","Nam"],["B5","Bút"],["C5",5]];
  data.forEach(([coord,val]) => { const [, col, row] = coord.match(/^([A-Z]+)(\d+)$/); grid.setCellValue(col, +row, val, false); });
}

export async function runSheetPivotTableTests() {
  const results = [];
  const test = async (name, fn) => { try { await fn(); results.push({ name, pass:true }); } catch(error) { results.push({ name, pass:false, error:error.message }); } };

  await test("Pivot engine tạo bảng Rows/Columns/Sum thật từ vùng nguồn", () => {
    const grid = new SheetGridController(container()); seed(grid);
    const table = PivotTableEngine.aggregate(grid.cellsData, { sourceRange:"A1:C5", rows:["Vùng"], columns:["Sản phẩm"], values:[{field:"Doanh số",aggregate:"SUM"}] });
    assert(table[0].join("|") === "Vùng|Bút — SUM Doanh số|Vở — SUM Doanh số", `Header sai: ${table[0]}`);
    assert(table[1].join("|") === "Bắc|10|20" && table[2].join("|") === "Nam|20|0", "Kết quả Sum theo trục sai");
  });

  await test("Pivot Count/Average cho kết quả số chính xác", () => {
    const grid = new SheetGridController(container()); seed(grid);
    const table = PivotTableEngine.aggregate(grid.cellsData, { sourceRange:"A1:C5", rows:["Vùng"], columns:[], values:[{field:"Doanh số",aggregate:"COUNT"},{field:"Doanh số",aggregate:"AVERAGE"}] });
    assert(table[1][1] === 2 && table[1][2] === 15 && table[2][1] === 2 && table[2][2] === 10, "Count/Average sai");
  });

  await test("Tạo Pivot sinh sheet thật, state cô lập và undo/redo phục hồi snapshot", async () => {
    const grid = new SheetGridController(container()); seed(grid); grid.undoStack=[];
    await grid.initializeOptionalDocumentFeatures();
    const source = grid.activeSheet;
    const pivot = grid.createPivotTable({ sourceRange:"A1:C5", rows:["Vùng"], columns:[], values:[{field:"Doanh số",aggregate:"SUM"}] });
    assert(grid.activeSheet === pivot.targetSheet && grid.cellsData.get("B2")?.val === 30, "Sheet Pivot chưa render dữ liệu thật");
    assert(grid.pivotTablesBySheet[source].length === 0 && grid.pivotTablesBySheet[pivot.targetSheet][0].sourceSheet === source, "Pivot state bị rò sheet");
    grid.undo(); assert(!grid.sheets.includes(pivot.targetSheet), "Undo create phải xóa sheet Pivot");
    grid.redo(); assert(grid.cellsData.get("B2")?.val === 30 && grid.pivotTablesBySheet[pivot.targetSheet].length === 1, "Redo phải phục hồi data/config Pivot");
  });

  await test("Refresh đọc lại source và có undo/redo riêng", async () => {
    const grid = new SheetGridController(container()); seed(grid);
    await grid.initializeOptionalDocumentFeatures();
    const pivot = grid.createPivotTable({ sourceRange:"A1:C5", rows:["Vùng"], columns:[], values:[{field:"Doanh số",aggregate:"SUM"}] });
    grid.sheetsData[pivot.sourceSheet].get("C2").val = 100;
    grid.refreshPivotTable(); assert(grid.cellsData.get("B2")?.val === 120, "Refresh chưa lấy dữ liệu nguồn mới");
    grid.undo(); assert(grid.cellsData.get("B2")?.val === 30, "Undo refresh chưa về kết quả cũ");
    grid.redo(); assert(grid.cellsData.get("B2")?.val === 120, "Redo refresh chưa áp dụng kết quả mới");
  });

  await test("Refresh Pivot tải engine nếu XLSX mở chưa khởi tạo engine", async () => {
    const grid = new SheetGridController(container());
    let loads = 0;
    let refreshes = 0;
    grid._loadPivotEngine = async () => { loads += 1; grid.pivotTableEngine = PivotTableEngine; };
    grid.refreshPivotTable = () => { refreshes += 1; return true; };
    const adapter = new SheetAdapter(grid);
    const result = await adapter.handleDispatch("sheet.data.pivotRefresh");
    assert(result && loads === 1 && refreshes === 1, `refresh=${result} loads=${loads} refreshes=${refreshes}`);
  });

  await test("Giảm indent tường minh bỏ dấu XF gốc dù model ban đầu đã là 0", () => {
    const grid = new SheetGridController(container());
    const adapter = new SheetAdapter(grid);
    grid.setCellValue("B", 2, "x", false);
    grid.selectCell("B", 2);
    const item = grid.cellsData.get("B2");
    item.style = { indentLevel: 0, origXf: 4 };
    item.style.styleHashAtImport = adapter._computeStyleHash(item.style);
    grid.adjustIndent(-1);
    assert(item.style.indentLevel === 0, `indentLevel=${item.style.indentLevel}`);
    assert(item.style.origXf === undefined && item.style.styleHashAtImport === undefined, "giảm indent vẫn giữ metadata XF nguồn");
  });

  await test("Xóa sheet Pivot rồi undo phục hồi cả config và bảng", async () => {
    const grid = new SheetGridController(container()); seed(grid);
    await grid.initializeOptionalDocumentFeatures();
    const pivot = grid.createPivotTable({ sourceRange:"A1:C5", rows:["Vùng"], columns:[], values:[{field:"Doanh số",aggregate:"COUNT"}] });
    grid.deleteSheet(pivot.targetSheet); grid.undo();
    assert(grid.activeSheet === pivot.targetSheet && grid.pivotTablesBySheet[pivot.targetSheet][0].id === pivot.id && grid.cellsData.get("B2")?.val === 2, "Undo delete phải phục hồi toàn bộ Pivot sheet");
  });

  await test("Command Pivot dùng icon bảng SVG thật và Refresh có command riêng", () => {
    const pivotCommand = SHEET_COMMANDS.find(command => command.id === "sheet.data.pivotTable");
    assert(pivotCommand?.icon === "pivotTable" && ICONS.pivotTable?.includes("<rect"), "Pivot command thiếu icon bảng thật");
    assert(SHEET_COMMANDS.some(command => command.id === "sheet.data.pivotRefresh") && ICONS.refreshTable?.includes("<path"), "Thiếu command/icon Refresh");
  });
  return results;
}
