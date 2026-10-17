import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { PivotTableEngine } from "../../apps/sheet/pivot-table.js";

function container() {
  return {
    setAttribute() {}, style: {}, innerHTML: "", className: "", appendChild() {}, insertBefore() {},
    querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, dispatchEvent() {},
    classList: { add() {}, remove() {}, toggle() {} }, focus() {}
  };
}

function fixture() {
  const grid = new SheetGridController(container());
  grid.pivotTableEngine = PivotTableEngine;
  const rows = [
    ["Date", "Region", "Product", "Amount"],
    ["2024-01-05", "North", "Pen", 10],
    ["2024-01-20", "South", "Pen", 20],
    ["2024-02-10", "North", "Paper", 30],
    ["2024-03-15", "South", "Paper", 40],
    ["2024-04-01", "East", "Pen", 50],
    ["2024-05-12", "North", "Paper", 60],
    ["2024-07-07", "South", "Pen", 70],
    ["2025-01-09", "East", "Paper", 80]
  ];
  rows.forEach((row, rowIndex) => row.forEach((value, columnIndex) => grid.setCellValue(grid._columnLabel(columnIndex + 1), rowIndex + 1, value, false)));
  const pivot = grid.createPivotTable({
    id: "pivot-sales-one",
    name: "Sales Pivot",
    sourceRange: "A1:D9",
    rows: ["Region"],
    columns: [],
    values: [{ field: "Amount", aggregate: "SUM" }],
    showGrandTotal: true
  }, false);
  grid.undoStack = [];
  grid.redoStack = [];
  return { grid, pivot };
}

function assert(condition, message) { if (!condition) throw new Error(message); }

export async function runSheetPivotSlicerTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test("Pivot Slicer: chọn mục tính lại hàng và tổng", () => {
    const { grid, pivot } = fixture();
    const slicer = grid.tableSlicer.createPivot(pivot, "Region", {}, false);
    assert(JSON.stringify(grid.tableSlicer.values(slicer)) === JSON.stringify(["North", "South", "East"]), "Danh sách Region sai");
    grid.tableSlicer.select(slicer.id, "North", {}, false);
    assert(grid.cellsData.get("A2")?.val === "North" && grid.cellsData.get("B2")?.val === 100, "Pivot chưa lọc North=100");
    assert(grid.cellsData.get("A3")?.val === "Grand Total" && grid.cellsData.get("B3")?.val === 100, "Tổng Pivot chưa tính lại");
  });

  test("Pivot Slicer: Ctrl/Shift và nhiều slicer giao theo VÀ", () => {
    const { grid, pivot } = fixture();
    const region = grid.tableSlicer.createPivot(pivot, "Region", {}, false);
    const product = grid.tableSlicer.createPivot(pivot, "Product", {}, false);
    grid.tableSlicer.select(region.id, "North", {}, false);
    grid.tableSlicer.select(region.id, "East", { ctrlKey: true }, false);
    grid.tableSlicer.select(product.id, "Paper", {}, false);
    assert(JSON.stringify(region.selectedValues) === JSON.stringify(["North", "East"]), "Ctrl đa chọn sai");
    assert(grid.cellsData.get("A2")?.val === "North" && grid.cellsData.get("B2")?.val === 90, "Giao Region/Product sai");
    assert(grid.cellsData.get("A3")?.val === "East" && grid.cellsData.get("B3")?.val === 80, "East Paper phải còn 80");
    const pen = grid.tableSlicer.itemStates(product).find(item => item.value === "Pen");
    assert(pen?.available, "Pen vẫn có dữ liệu với North/East");
  });

  test("Timeline: nhận trường ngày, lọc khoảng và đổi mức Ngày/Tháng/Quý/Năm", () => {
    const { grid, pivot } = fixture();
    assert(grid._pivotFieldIsDate(pivot, "Date"), "Date phải được nhận là trường ngày");
    assert(!grid._pivotFieldIsDate(pivot, "Region"), "Region không được nhận là trường ngày");
    const timeline = grid.tableSlicer.createPivot(pivot, "Date", { kind: "timeline" }, false);
    const bounds = grid._pivotTimelineBounds(timeline);
    assert(bounds.min === "2024-01-05" && bounds.max === "2025-01-09", `Biên ngày sai: ${JSON.stringify(bounds)}`);
    assert(grid.tableSlicer.setTimelineRange(timeline.id, "2024-02-01", "2024-05-31", false), "Không đặt được khoảng thời gian");
    assert(grid.cellsData.get("B5")?.val === 180, `Tổng khoảng thời gian phải là 180, nhận ${grid.cellsData.get("B5")?.val}`);
    assert(grid.tableSlicer.setTimelineGranularity(timeline.id, "quarters", false) && timeline.granularity === "quarters", "Không đổi được mức Quý");
    assert(!grid.tableSlicer.setTimelineRange(timeline.id, "2024-06-01", "2024-05-01", false), "Khoảng đảo phải bị từ chối");
  });

  test("Slicer chung: tùy chọn cột, cỡ nút, kiểu và undo/redo", () => {
    const { grid, pivot } = fixture();
    const slicer = grid.tableSlicer.createPivot(pivot, "Region");
    grid.tableSlicer.updateOptions(slicer.id, { caption: "Khu vực", numberOfColumns: 3, buttonHeight: 34, style: "dark" });
    assert(slicer.caption === "Khu vực" && slicer.numberOfColumns === 3 && slicer.buttonHeight === 34 && slicer.style === "dark", "Tùy chọn chưa áp dụng đủ");
    grid.undo();
    const undone = grid.slicersBySheet[grid.activeSheet][0];
    assert(undone.caption === "Region" && undone.numberOfColumns === 1, "Undo tùy chọn sai");
    grid.redo();
    assert(grid.slicersBySheet[grid.activeSheet][0].style === "dark", "Redo tùy chọn sai");
  });

  test("Report Connections: một bộ lọc tính lại hai Bảng tổng hợp dùng chung nguồn", () => {
    const { grid, pivot } = fixture();
    const secondSheet = "Pivot Two";
    grid.addSheet(secondSheet, false);
    const second = grid.createPivotTable({
      id: "pivot-sales-two", name: "Sales Pivot Two", sourceSheet: pivot.sourceSheet, sourceRange: pivot.sourceRange,
      rows: ["Product"], columns: [], values: [{ field: "Amount", aggregate: "SUM" }], showGrandTotal: true,
      targetSheet: secondSheet, targetCoord: "A1"
    }, false);
    grid.switchSheet(pivot.targetSheet);
    const slicer = grid.tableSlicer.createPivot(pivot, "Region", { connectedPivotIds: [pivot.id, second.id] }, false);
    grid.tableSlicer.select(slicer.id, "North", {}, false);
    assert(grid.sheetsData[pivot.targetSheet].get("B2")?.val === 100, "Bảng tổng hợp thứ nhất chưa lọc");
    assert(grid.sheetsData[secondSheet].get("B2")?.val === 10 && grid.sheetsData[secondSheet].get("B3")?.val === 90, "Bảng tổng hợp thứ hai chưa lọc");
  });

  return results;
}
