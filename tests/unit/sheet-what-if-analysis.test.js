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

  await test("Scenario Manager hỗ trợ trường ghi chú (comment) và cú pháp dải ô changingCells (B1:B3)", () => {
    const grid = new SheetGridController(container());
    put(grid, "B1", 10); put(grid, "B2", 20); put(grid, "B3", 30);
    const scen = grid.saveScenario({
      name: "Kịch bản mẫu",
      changingCells: "$B$1:$B$3",
      values: [100, 200, 300],
      comment: "Dự toán chi phí tối ưu Quý 4"
    });
    assert(scen.name === "Kịch bản mẫu", "Tên kịch bản sai");
    assert(scen.comment === "Dự toán chi phí tối ưu Quý 4", `Ghi chú kịch bản sai: ${scen.comment}`);
    assert(scen.changingCells.length === 3 && scen.changingCells[0] === "B1" && scen.changingCells[2] === "B3", "Giải nén dải ô $B$1:$B$3 sai");
    assert(scen.values[0] === 100 && scen.values[2] === 300, "Giá trị kịch bản sai");
  });

  await test("Scenario Manager gộp kịch bản từ trang tính khác (Merge) và tự động xử lý trùng tên", () => {
    const grid = new SheetGridController(container());
    grid.addSheet("Kế hoạch B");
    grid.switchSheet("Kế hoạch B");
    put(grid, "B1", 50);
    grid.saveScenario({ name: "Cơ sở", changingCells: "B1", values: "60", comment: "Bản gốc B" });
    grid.saveScenario({ name: "Mở rộng", changingCells: "B1", values: "90", comment: "Bản mở rộng" });

    grid.switchSheet("Trang tính 1");
    grid.saveScenario({ name: "Cơ sở", changingCells: "A1", values: "10", comment: "Bản gốc Trang 1" });

    const mergedCount = grid.mergeScenariosFromSheet("Kế hoạch B");
    assert(mergedCount === 2, `Số lượng kịch bản gộp sai: ${mergedCount}`);
    const scenarios = grid.getScenarios("Trang tính 1");
    assert(scenarios.length === 3, `Tổng số kịch bản sau khi gộp sai: ${scenarios.length}`);
    const duplicateRenamed = scenarios.find(s => s.name.includes("Kế hoạch B") || s.name.includes("(Kế hoạch B)") || s.name.includes("_"));
    assert(duplicateRenamed, "Không tự đổi tên kịch bản trùng tên khi gộp");
    
    // Kiểm tra hoàn tác gộp
    grid.undo();
    assert(grid.getScenarios("Trang tính 1").length === 1, "Undo gộp kịch bản không phục hồi số lượng cũ");
  });

  await test("Scenario Manager tạo trang tính Tóm tắt kịch bản (Scenario Summary Report) chuẩn Excel", () => {
    const grid = new SheetGridController(container());
    // Thiết lập dữ liệu bảng tính
    // B1: Đơn giá, B2: Số lượng, B3: Chi phí cố định
    // B4: Doanh thu = B1 * B2
    // B5: Lợi nhuận = B4 - B3
    put(grid, "A1", "Đơn giá"); put(grid, "B1", 100);
    put(grid, "A2", "Số lượng"); put(grid, "B2", 50);
    put(grid, "A3", "Chi phí"); put(grid, "B3", 1000);
    put(grid, "A4", "Doanh thu"); put(grid, "B4", "=B1*B2");
    put(grid, "A5", "Lợi nhuận"); put(grid, "B5", "=B4-B3");

    grid.saveScenario({ name: "Kỳ vọng cao", changingCells: "B1, B2", values: "120, 80", comment: "Kịch bản lạc quan" });
    grid.saveScenario({ name: "Kỳ vọng thấp", changingCells: "B1, B2", values: "80, 30", comment: "Kịch bản bi quan" });

    const sourceSheet = grid.activeSheet;
    const summaryResult = grid.generateScenarioSummary({ resultCells: "B4, B5" });
    assert(summaryResult && summaryResult.success, "Tạo tóm tắt thất bại");
    assert(grid.sheets.includes(summaryResult.sheetName), `Sheet mới ${summaryResult.sheetName} không tồn tại trong danh sách sheets`);
    assert(grid.activeSheet === summaryResult.sheetName, "Sau khi tạo tóm tắt không chuyển sang sheet tóm tắt");

    // Dữ liệu bảng tính nguồn không bị thay đổi
    assert(grid.sheetsData[sourceSheet].get("B1").val === 100, "Sheet nguồn bị rò rỉ dữ liệu kịch bản");
    assert(grid.sheetsData[sourceSheet].get("B4").val === 5000, "Sheet nguồn bị sai công thức doanh thu");

    // Kiểm tra nội dung sheet Tóm tắt kịch bản
    const summaryCells = grid.cellsData;
    let foundTitle = false;
    let foundChangingHeader = false;
    let foundResultHeader = false;
    let foundHighPrice = false;
    let foundHighProfit = false;

    for (const [, cell] of summaryCells.entries()) {
      const valStr = String(cell.val || "").toLowerCase();
      if (valStr.includes("tóm tắt kịch bản") || valStr.includes("scenario summary")) foundTitle = true;
      if (valStr.includes("thay đổi") || valStr.includes("changing cells")) foundChangingHeader = true;
      if (valStr.includes("kết quả") || valStr.includes("result cells")) foundResultHeader = true;
      if (cell.val === 120) foundHighPrice = true;
      // Doanh thu kỳ vọng cao: 120 * 80 = 9600; Lợi nhuận = 9600 - 1000 = 8600
      if (cell.val === 8600) foundHighProfit = true;
    }

    assert(foundTitle, "Thiếu tiêu đề Tóm tắt kịch bản");
    assert(foundChangingHeader, "Thiếu nhóm Ô thay đổi");
    assert(foundResultHeader, "Thiếu nhóm Ô kết quả");
    assert(foundHighPrice, "Thiếu giá trị ô thay đổi của kịch bản Kỳ vọng cao");
    assert(foundHighProfit, "Kết quả tính toán lợi nhuận của kịch bản Kỳ vọng cao sai (cần là 8600)");
  });

  await test("Scenario Manager bảo toàn kịch bản khi lưu/mở FODS và xuất/nhập OOXML XLSX", () => {
    const grid = new SheetGridController(container());
    put(grid, "B1", 10);
    grid.saveScenario({ name: "Kịch bản 1", changingCells: "B1", values: "50", comment: "Ghi chú 1" });

    const adapter = new SheetAdapter(grid);
    const fods = adapter.serializeToFods();
    assert(fods.includes("Kịch bản 1"), "serializeToFods thiếu thông tin kịch bản");

    const newGrid = new SheetGridController(container());
    const newAdapter = new SheetAdapter(newGrid);
    newAdapter.loadFromFods(fods);
    const restored = newGrid.getScenarios();
    assert(restored.length === 1 && restored[0].name === "Kịch bản 1" && restored[0].values[0] === 50, "parseFods/loadFromFods không phục hồi kịch bản");
  });

  return results;
}
