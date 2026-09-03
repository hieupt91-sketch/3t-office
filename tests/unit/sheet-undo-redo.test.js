/** Behavioral tests — deep, sheet-isolated VN Sheet undo/redo history. */
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

function container() {
  const classes = new Set();
  return {
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    classList: {
      add(...names) { names.forEach(name => classes.add(name)); },
      remove(...names) { names.forEach(name => classes.delete(name)); },
      toggle(name, force) { force ? classes.add(name) : classes.delete(name); },
      contains(name) { return classes.has(name); }
    }
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runSheetUndoRedoTests() {
  const results = [];
  const test = (name, callback) => {
    try {
      callback();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  test("Undo/Redo nhập liệu: gộp chuỗi gõ cùng ô nhưng giữ thao tác rời rạc", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, "a", true, { coalesce: true });
    grid.setCellValue("A", 1, "ab", true, { coalesce: true });
    grid.setCellValue("A", 1, "abc", true, { coalesce: true });
    assert(grid.undoStack.length === 1, "Ba ký tự liên tục trong formula bar phải là một bước");
    grid.undo();
    assert(grid.cellsData.get("A1")?.val === "", "Undo phải trả về giá trị trước khi bắt đầu gõ");
    grid.redo();
    assert(grid.cellsData.get("A1")?.val === "abc", "Redo phải trả lại toàn bộ chuỗi đã gõ");
    grid.setCellValue("A", 1, "lần 2");
    assert(grid.undoStack.length === 2, "Một thao tác rời rạc phải tạo bước history riêng");
  });

  test("Undo/Redo history: giới hạn đúng 100 bước gần nhất", () => {
    const grid = new SheetGridController(container());
    for (let index = 0; index < 105; index++) grid.setCellValue("A", 1, index);
    assert(grid.undoStack.length === 100, `History phải giới hạn 100, nhận ${grid.undoStack.length}`);
    for (let index = 0; index < 100; index++) assert(grid.undo(), `Bước undo ${index + 1} phải thực thi được`);
    assert(grid.cellsData.get("A1")?.val === 4, "Sau 100 undo phải dừng ở trạng thái cổ nhất còn giữ (4)");
  });

  test("Conditional Formatting: thêm/xóa đều undo và redo đúng state thật", () => {
    const grid = new SheetGridController(container());
    const rule = grid.addConditionalFormattingRule({ start: { c: "A", r: 1 }, end: { c: "A", r: 2 } }, { type: "greaterThan", value: 10, color: "#ff0000" });
    grid.undo();
    assert(grid.getConditionalFormattingRules().length === 0, "Undo add phải làm rule biến mất");
    grid.redo();
    assert(grid.getConditionalFormattingRules()[0]?.id === rule.id, "Redo add phải phục hồi đúng rule");
    grid.deleteConditionalFormattingRule(rule.id);
    assert(grid.getConditionalFormattingRules().length === 0, "Delete phải xóa rule thật");
    grid.undo();
    assert(grid.getConditionalFormattingRules()[0]?.id === rule.id, "Undo delete phải phục hồi rule");
    grid.redo();
    assert(grid.getConditionalFormattingRules().length === 0, "Redo delete phải xóa lại rule");
  });

  test("Data Validation: thêm/xóa undo và redo giữ nguyên cấu hình", () => {
    const grid = new SheetGridController(container());
    const validation = grid.addDataValidation({ start: { c: "B", r: 2 }, end: { c: "B", r: 4 } }, { type: "list", values: "Mới, Xong" });
    grid.undo();
    assert(grid.getValidationForCell("B", 3) === null, "Undo add phải bỏ validation khỏi vùng");
    grid.redo();
    assert(grid.getValidationForCell("B", 3)?.values.join(",") === "Mới,Xong", "Redo phải phục hồi danh sách validation");
    grid.deleteDataValidation(validation.id);
    grid.undo();
    assert(grid.getDataValidations()[0]?.id === validation.id, "Undo delete phải phục hồi đúng validation");
    grid.redo();
    assert(grid.getDataValidations().length === 0, "Redo delete phải xóa validation lần nữa");
  });

  test("Charts: insert/delete undo và redo cập nhật collection thật", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 12);
    const chart = grid.insertChart("bar", { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } });
    grid.undo();
    assert(grid.getCharts().length === 0, "Undo insert phải bỏ chart");
    grid.redo();
    assert(grid.getCharts()[0]?.id === chart.id, "Redo insert phải phục hồi chart cùng id");
    grid.deleteChart(chart.id);
    grid.undo();
    assert(grid.getCharts()[0]?.id === chart.id, "Undo delete phải phục hồi chart");
    grid.redo();
    assert(grid.getCharts().length === 0, "Redo delete phải bỏ chart lần nữa");
  });

  test("Sort giảm dần: undo/redo đối xứng và không tạo history phụ", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 4, 1);
    grid.setCellValue("A", 5, 3);
    grid.setCellValue("A", 6, 2);
    grid.undoStack = [];
    grid.sort("A", false);
    assert([4, 5, 6].map(row => grid.cellsData.get(`A${row}`)?.val).join(",") === "3,2,1", "Sort desc phải có hiệu lực thật");
    assert(grid.undoStack.length === 1, "Sort phải là đúng một bước");
    grid.undo();
    assert([4, 5, 6].map(row => grid.cellsData.get(`A${row}`)?.val).join(",") === "1,3,2", "Undo sort phải khôi phục thứ tự gốc");
    grid.redo();
    assert([4, 5, 6].map(row => grid.cellsData.get(`A${row}`)?.val).join(",") === "3,2,1", "Redo phải lặp đúng sort giảm dần");
    assert(grid.undoStack.length === 1, "Redo sort không được sinh history phụ");
  });

  test("Filter: áp dụng và toggle đều có snapshot undo/redo", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 4, "Giữ");
    grid.setCellValue("A", 5, "Ẩn");
    grid.undoStack = [];
    grid.toggleFilter();
    grid.applyFilter("A", new Set(["Giữ"]));
    assert(grid.isFilterActive && grid.hiddenRows.has(5), "Filter phải ẩn hàng không được chọn");
    grid.undo();
    assert(grid.isFilterActive && grid.hiddenRows.size === 0, "Undo apply giữ filter mode nhưng bỏ điều kiện");
    grid.undo();
    assert(!grid.isFilterActive, "Undo toggle phải tắt filter mode");
    grid.redo();
    grid.redo();
    assert(grid.isFilterActive && grid.hiddenRows.has(5) && grid.activeFilters.get("A")?.has("Giữ"), "Redo phải phục hồi chính xác filter");
  });

  test("Freeze panes: undo/redo đúng sheet và không rò sang sheet khác", () => {
    const grid = new SheetGridController(container());
    const first = grid.activeSheet;
    grid.toggleFreezePanes();
    grid.switchSheet("Kế hoạch Q3");
    assert(!grid.isFrozenPanes, "Sheet B không được kế thừa freeze của sheet A");
    grid.undo();
    assert(grid.activeSheet === first && !grid.isFrozenPanes, "Undo phải quay về sheet A và bỏ freeze ở A");
    grid.switchSheet("Kế hoạch Q3");
    assert(!grid.isFrozenPanes, "Undo ở A không được thay đổi sheet B");
    grid.redo();
    assert(grid.activeSheet === first && grid.isFrozenPanes, "Redo phải quay về A và bật lại freeze");
  });

  test("Multi-sheet actions: undo chỉ đổi sheet sở hữu action", () => {
    const grid = new SheetGridController(container());
    const first = grid.activeSheet;
    grid.addConditionalFormattingRule({ start: { c: "C", r: 1 }, end: { c: "C", r: 1 } }, { type: "blank", color: "#ffff00" });
    grid.switchSheet("Nhân sự");
    grid.addDataValidation({ start: { c: "C", r: 1 }, end: { c: "C", r: 1 } }, { type: "list", values: "Có,Không" });
    grid.undo();
    assert(grid.activeSheet === "Nhân sự" && grid.getDataValidations().length === 0, "Undo đầu chỉ phải bỏ validation sheet Nhân sự");
    assert(grid.getConditionalFormattingRules(first).length === 1, "Rule sheet A không được bị ảnh hưởng");
    grid.undo();
    assert(grid.activeSheet === first && grid.getConditionalFormattingRules().length === 0, "Undo kế tiếp phải quay đúng sheet A");
  });

  test("Sheet add/delete: undo/redo phục hồi cả dữ liệu và rule", () => {
    const grid = new SheetGridController(container());
    const original = grid.activeSheet;
    grid.addSheet("Báo cáo");
    grid.setCellValue("D", 8, "Nội dung");
    const rule = grid.addConditionalFormattingRule({ start: { c: "D", r: 8 }, end: { c: "D", r: 8 } }, { type: "blank", color: "#eee000" });
    grid.undo();
    grid.undo();
    grid.undo();
    assert(!grid.sheets.includes("Báo cáo") && grid.activeSheet === original, "Undo add phải loại sheet và quay về sheet trước");
    grid.redo();
    assert(grid.activeSheet === "Báo cáo", "Redo add phải tạo lại và kích hoạt sheet");
    grid.redo();
    grid.redo();
    assert(grid.cellsData.get("D8")?.val === "Nội dung" && grid.getConditionalFormattingRules()[0]?.id === rule.id, "Redo phải phục hồi các action tiếp theo trên sheet");
    grid.deleteSheet("Báo cáo");
    grid.undo();
    assert(grid.cellsData.get("D8")?.val === "Nội dung" && grid.getConditionalFormattingRules()[0]?.id === rule.id, "Undo delete phải phục hồi toàn bộ state sheet");
    grid.redo();
    assert(!grid.sheets.includes("Báo cáo"), "Redo delete phải xóa lại sheet");
  });

  test("Command state: Undo/Redo disabled chính xác theo stack", () => {
    const grid = new SheetGridController(container());
    const changes = new Map();
    const originalUpdate = globalCommandBus.updateState;
    globalCommandBus.updateState = (id, state) => changes.set(id, { ...(changes.get(id) || {}), ...state });
    try {
      grid.undo();
      assert(changes.get("common.edit.undo")?.enabled === false && changes.get("common.edit.redo")?.enabled === false, "Stack rỗng phải disable cả hai nút");
      grid.setCellValue("A", 1, "mới");
      assert(changes.get("common.edit.undo")?.enabled === true && changes.get("common.edit.redo")?.enabled === false, "Sau edit chỉ Undo được enable");
      grid.undo();
      assert(changes.get("common.edit.undo")?.enabled === false && changes.get("common.edit.redo")?.enabled === true, "Sau undo chỉ Redo được enable");
      grid.redo();
      assert(changes.get("common.edit.undo")?.enabled === true && changes.get("common.edit.redo")?.enabled === false, "Sau redo trạng thái nút phải đảo lại");
    } finally {
      globalCommandBus.updateState = originalUpdate;
    }
  });

  return results;
}
