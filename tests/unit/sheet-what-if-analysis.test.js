import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { SHEET_HELP_ENTRIES } from "../../platform/help/entries-sheet.js";

const container = () => ({ querySelector() { return null; }, querySelectorAll() { return []; }, classList: { add() {}, remove() {}, toggle() {} } });
const assert = (value, message) => { if (!value) throw new Error(message); };
const put = (grid, coord, value) => { const [, c, r] = /^([A-Z]+)(\d+)$/.exec(coord); grid.setCellValue(c, +r, value, false); };

export async function runSheetWhatIfAnalysisTests() {
  const results = [];
  const test = async (name, fn) => { try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  await test("Data Table một biến tính đúng 3 giá trị, giữ công thức/input và Undo/Redo atomic", () => {
    const grid = new SheetGridController(container());
    put(grid, "D1", 5); put(grid, "A1", "=D1*2"); put(grid, "B1", 1); put(grid, "C1", 3); put(grid, "D1", 7);
    const before = grid.undoStack.length;
    const result = grid.calculateDataTable({ range: { start: { c: "A", r: 1 }, end: { c: "D", r: 2 } }, rowInputCell: "$D$1" });
    assert(result.results.B2 === 2 && result.results.C2 === 6 && result.results.D2 === 14, `Kết quả sai: ${JSON.stringify(result.results)}`);
    assert(grid.cellsData.get("A1").formula === "=D1*2" && grid.cellsData.get("D1").val === 7, "Đã sửa công thức gốc hoặc input thật");
    assert(grid.undoStack.length === before + 1, "Data Table không atomic");
    grid.undo(); assert(!grid.cellsData.has("B2"), "Undo không xóa kết quả"); grid.redo(); assert(grid.cellsData.get("D2").val === 14, "Redo không phục hồi kết quả");
  });

  await test("Data Table hai biến khớp phép tính tay cho ma trận 2x2", () => {
    const grid = new SheetGridController(container());
    put(grid, "D1", 0); put(grid, "E1", 0); put(grid, "A1", "=D1+E1*2"); put(grid, "B1", 1); put(grid, "C1", 3); put(grid, "A2", 10); put(grid, "A3", 20);
    const { results } = grid.calculateDataTable({ range: { start: { c: "A", r: 1 }, end: { c: "C", r: 3 } }, rowInputCell: "D1", columnInputCell: "E1" });
    assert(results.B2 === 21 && results.C2 === 23 && results.B3 === 41 && results.C3 === 43, `Ma trận sai: ${JSON.stringify(results)}`);
    assert(grid.cellsData.get("D1").val === 0 && grid.cellsData.get("E1").val === 0, "Giá trị thử rò vào ô thật");
  });

  await test("Scenario Manager thêm/sửa/xóa/hiển thị và đổi kết quả công thức đúng", () => {
    const grid = new SheetGridController(container()); put(grid, "B1", 1); put(grid, "B2", 2); put(grid, "C1", "=B1+B2*2");
    const low = grid.saveScenario({ name: "Thấp", changingCells: "B1, B2", values: "10, 5" });
    const high = grid.saveScenario({ name: "Cao", changingCells: "B1 B2", values: [20, 10] });
    grid.applyScenario(low.id); assert(grid.cellsData.get("C1").val === 20, "Kịch bản Thấp sai");
    grid.applyScenario(high.id); assert(grid.cellsData.get("C1").val === 40, "Kịch bản Cao sai");
    grid.undo(); assert(grid.cellsData.get("C1").val === 20, "Undo Hiển thị sai"); grid.redo(); assert(grid.cellsData.get("C1").val === 40, "Redo Hiển thị sai");
    grid.saveScenario({ name: "Cao sửa", changingCells: "B1,B2", values: "30,15" }, high.id); assert(grid.getScenarios().find(item => item.id === high.id).values[0] === 30, "Sửa kịch bản sai");
    assert(grid.deleteScenario(low.id) && grid.getScenarios().length === 1, "Xóa kịch bản sai");
  });

  await test("What-If dropdown, command adapter và Help được nối đúng", async () => {
    const data = SHEET_RIBBON_TABS.find(tab => tab.id === "data");
    const dropdown = data.groups.flatMap(group => group.items).find(item => item.id === "sheet-what-if-analysis");
    assert(dropdown?.type === "dropdown" && dropdown.items.map(item => item.commandId).join(",") === "sheet.data.goalSeek,sheet.data.dataTable,sheet.data.scenarioManager", "Dropdown What-If sai");
    let dataCalls = 0, scenarioCalls = 0;
    const mock = new Proxy({}, { get(target, key) { if (key in target) return target[key]; return () => { if (key === "showDataTableDialog") dataCalls++; if (key === "showScenarioManagerDialog") scenarioCalls++; return true; }; } });
    new SheetAdapter(mock).attach(); await globalCommandBus.execute("sheet.data.dataTable"); await globalCommandBus.execute("sheet.data.scenarioManager");
    assert(dataCalls === 1 && scenarioCalls === 1, "Adapter command sai");
    assert(SHEET_HELP_ENTRIES.some(entry => entry.id === "sheet.data.whatIfAnalysis" && entry.commandIds.includes("sheet.data.dataTable")), "Thiếu Help What-If");
  });
  return results;
}
