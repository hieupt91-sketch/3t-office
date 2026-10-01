import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetChartBuilder } from "../../apps/sheet/sheet-chart.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SHEET_HELP_ENTRIES } from "../../platform/help/entries-sheet.js";

const container = () => ({ querySelector() { return null; }, querySelectorAll() { return []; }, classList: { add() {}, remove() {}, toggle() {} } });
const assert = (value, message) => { if (!value) throw new Error(message); };
const put = (grid, coord, value) => { const [, c, r] = /^([A-Z]+)(\d+)$/.exec(coord); grid.setCellValue(c, +r, value, false); };

export async function runSheetPivotChartTests() {
  const results = [];
  const test = async (name, fn) => { try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  await test("PivotChart lấy dữ liệu Pivot đã tổng hợp và tự cập nhật khi Refresh", async () => {
    const grid = new SheetGridController(container()); const source = grid.activeSheet;
    await grid.initializeOptionalDocumentFeatures();
    put(grid, "A1", "Vùng"); put(grid, "B1", "Doanh số"); put(grid, "A2", "Bắc"); put(grid, "B2", 10); put(grid, "A3", "Bắc"); put(grid, "B3", 20); put(grid, "A4", "Nam"); put(grid, "B4", 5);
    const pivot = grid.createPivotTable({ sourceSheet: source, sourceRange: "A1:B4", rows: ["Vùng"], columns: [], values: [{ field: "Doanh số", aggregate: "SUM" }] });
    const target = grid.activeSheet; const chart = grid.insertPivotChart("bar", pivot, pivot.resultRange);
    assert(chart.kind === "pivot" && chart.pivotId === pivot.id, "Chart chưa liên kết pivotId");
    assert(chart.labels.join(",") === "Bắc,Nam" && chart.data.join(",") === "30,5", `Chart không dùng kết quả tổng hợp: ${chart.labels}/${chart.data}`);
    grid.switchSheet(source); put(grid, "B2", 40); grid.refreshPivotTable(target);
    assert(chart.data.join(",") === "60,5", `Refresh Pivot chưa cập nhật chart: ${chart.data}`);
    assert(grid.sheetsData[target].get("B2").val === 60, "Bảng Pivot refresh sai");
  });

  await test("PivotChart chỉ hỗ trợ Cột/Tròn, SVG và Undo dùng chart history chung", async () => {
    const grid = new SheetGridController(container()); const source = grid.activeSheet;
    await grid.initializeOptionalDocumentFeatures();
    put(grid, "A1", "Loại"); put(grid, "B1", "SL"); put(grid, "A2", "A"); put(grid, "B2", 4);
    const pivot = grid.createPivotTable({ sourceSheet: source, sourceRange: "A1:B2", rows: ["Loại"], values: [{ field: "SL", aggregate: "SUM" }] });
    assert(grid.insertPivotChart("line", pivot, pivot.resultRange) === false, "Không được nhận kiểu Đường");
    const chart = grid.insertPivotChart("pie", pivot, pivot.resultRange); assert(SheetChartBuilder.generateSvg(chart).includes('data-chart-type="pie"'), "Không sinh SVG Tròn");
    assert(grid.undo() && grid.getCharts().length === 0, "Undo chèn PivotChart sai"); assert(grid.redo() && grid.getCharts()[0].kind === "pivot", "Redo chèn PivotChart sai");
  });

  await test("Ribbon, command icon và Help có PivotChart cạnh chart thường", () => {
    const charts = SHEET_RIBBON_TABS.find(tab => tab.id === "insert").groups.find(group => group.labelKey === "sheetRibbon.group.charts").items;
    assert(charts.map(item => item.commandId).join(",") === "sheet.chart.insert,sheet.chart.pivotChart", "Vị trí PivotChart sai");
    assert(SHEET_HELP_ENTRIES.some(entry => entry.id === "sheet.chart.pivotChart"), "Thiếu Help PivotChart");
  });
  return results;
}
