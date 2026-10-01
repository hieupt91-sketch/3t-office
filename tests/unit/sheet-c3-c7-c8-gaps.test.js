import { SheetGridController } from "../../apps/sheet/sheet-grid.js";

const container = () => ({ querySelector: () => null, querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} }, focus() {} });
const put = (grid, coord, val) => grid.cellsData.set(coord, { val, formula: "", style: {} });
const assert = (value, message) => { if (!value) throw new Error(message); };

export async function runSheetC3C7C8GapTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };
  test("Ctrl+A selects current contiguous region, then whole capped sheet", () => {
    const grid = new SheetGridController(container());
    put(grid, "A1", "Name"); put(grid, "B1", "Score"); put(grid, "A2", "Beta"); put(grid, "B2", 2); put(grid, "A3", "Alpha"); put(grid, "B3", 1);
    grid.selectCell("B", 2); grid.selectAll();
    assert(grid._rangeLabel(grid.selectionRange) === "A1:B3", "Ctrl+A lần đầu phải chọn vùng dữ liệu hiện tại");
    grid.selectAll();
    assert(grid._rangeLabel(grid.selectionRange) === "A1:XFD1048576", "Ctrl+A lần hai phải chọn toàn trang tính hiện có");
  });
  test("Sort preserves a detected text header", () => {
    const grid = new SheetGridController(container());
    [["A1", "Name"], ["B1", "Score"], ["A2", "Beta"], ["B2", 2], ["A3", "Alpha"], ["B3", 1]].forEach(([c, v]) => put(grid, c, v));
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "B", r: 3 } };
    assert(grid.sort("A", true), "Sort phải thực hiện được");
    assert(grid.cellsData.get("A1").val === "Name" && grid.cellsData.get("A2").val === "Alpha", "Sort không được kéo header vào data");
  });
  test("Delete sheet and tab color are undoable", () => {
    const grid = new SheetGridController(container());
    grid.addSheet("Data", false); grid.switchSheet("Data");
    assert(grid.setTabColor("#ff0000"), "Đặt màu tab thất bại");
    assert(grid.sheetStates.Data.tabColor === "#ff0000", "Màu tab chưa vào state");
    assert(grid.undo(), "Undo màu tab thất bại"); assert(!grid.sheetStates.Data.tabColor, "Undo màu tab chưa khôi phục");
    assert(grid.deleteSheet("Data"), "Xóa sheet thất bại"); assert(!grid.sheets.includes("Data"), "Sheet vẫn còn sau khi xóa");
    assert(grid.undo() && grid.sheets.includes("Data"), "Undo xóa sheet thất bại");
  });
  return results;
}
