import { SheetGridController } from "../../apps/sheet/sheet-grid.js";

const mockContainer = () => ({
  setAttribute() {}, style: {}, innerHTML: "", className: "", appendChild() {}, insertBefore() {},
  querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, dispatchEvent() {},
  classList: { add() {}, remove() {}, toggle() {} }, focus() {}
});

function fixture() {
  const grid = new SheetGridController(mockContainer());
  const values = [
    ["Region", "Product", "Amount"],
    ["North", "Pen", 10],
    ["South", "Pen", 20],
    ["North", "Paper", 30],
    ["South", "Paper", 40],
    ["East", "Pen", 50]
  ];
  values.forEach((row, rowIndex) => row.forEach((value, colIndex) => grid.setCellValue(grid._columnLabel(colIndex + 1), rowIndex + 1, value, false)));
  grid.formatAsTable("tableBlue", { start: { c: "A", r: 1 }, end: { c: "C", r: 6 } }, false, { name: "SalesTable", hasHeaders: true });
  grid.undoStack = [];
  grid.redoStack = [];
  return grid;
}

export async function runSheetSlicerTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const equal = (actual, expected, label) => {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) throw new Error(`${label}: mong đợi ${e}, nhận ${a}`);
  };

  test("Slicer: tạo từ cột Bảng và chọn một giá trị lọc đúng hàng", () => {
    const grid = fixture();
    const slicer = grid.tableSlicer.create("SalesTable", "Region", {}, false);
    equal(grid.tableSlicer.values(slicer), ["North", "South", "East"], "items");
    grid.tableSlicer.select(slicer.id, "North", {}, false);
    equal([...grid.hiddenRows], [3, 5, 6], "hidden rows");
  });

  test("Slicer: Ctrl/Shift và nút chọn nhiều giữ tập lựa chọn", () => {
    const grid = fixture();
    const slicer = grid.tableSlicer.create("SalesTable", "Region", {}, false);
    grid.tableSlicer.select(slicer.id, "North", {}, false);
    grid.tableSlicer.select(slicer.id, "East", { ctrlKey: true }, false);
    equal(slicer.selectedValues, ["North", "East"], "Ctrl selection");
    grid.tableSlicer.clear(slicer.id, false);
    grid.tableSlicer.select(slicer.id, "North", {}, false);
    grid.tableSlicer.select(slicer.id, "East", { shiftKey: true }, false);
    equal(slicer.selectedValues, [], "Shift selected every item and normalized to clear state");
    grid.tableSlicer.toggleMulti(slicer.id, false);
    if (!slicer.multiSelect) throw new Error("multi-select chưa bật");
  });

  test("Slicer: hai cột kết hợp VÀ và đánh dấu mục không có dữ liệu", () => {
    const grid = fixture();
    const region = grid.tableSlicer.create("SalesTable", "Region", {}, false);
    const product = grid.tableSlicer.create("SalesTable", "Product", {}, false);
    grid.tableSlicer.select(region.id, "East", {}, false);
    grid.tableSlicer.select(product.id, "Paper", {}, false);
    equal([...grid.hiddenRows], [2, 3, 4, 5, 6], "AND hidden rows");
    const paperState = grid.tableSlicer.itemStates(product).find(item => item.value === "Paper");
    if (paperState.available) throw new Error("Paper phải ở trạng thái không có dữ liệu dưới Region=East");
  });

  test("Slicer: giao với bộ lọc tự động trên cột khác", () => {
    const grid = fixture();
    const slicer = grid.tableSlicer.create("SalesTable", "Region", {}, false);
    grid.applyFilter("C", new Set(["40"]), false);
    grid.tableSlicer.select(slicer.id, "South", {}, false);
    equal([...grid.hiddenRows], [2, 3, 4, 6], "AutoFilter AND slicer");
  });

  test("Slicer: SUBTOTAL phản ứng theo hàng đang hiện", () => {
    const grid = fixture();
    grid.setCellValue("E", 1, "=SUBTOTAL(109,C2:C6)", false);
    grid._recalculateAllFormulas();
    const slicer = grid.tableSlicer.create("SalesTable", "Region", {}, false);
    grid.tableSlicer.select(slicer.id, "North", {}, false);
    equal(grid.cellsData.get("E1")?.val, 40, "SUBTOTAL");
  });

  test("Slicer: chèn/chọn/xóa có hoàn tác và làm lại", () => {
    const grid = fixture();
    const slicer = grid.tableSlicer.create("SalesTable", "Region");
    grid.tableSlicer.select(slicer.id, "South");
    grid.undo();
    equal(grid.slicersBySheet.Sheet1[0].selectedValues, [], "undo selection");
    grid.redo();
    equal(grid.slicersBySheet.Sheet1[0].selectedValues, ["South"], "redo selection");
    grid.tableSlicer.remove(slicer.id);
    grid.undo();
    equal(grid.slicersBySheet.Sheet1.length, 1, "undo delete");
  });

  return results;
}
