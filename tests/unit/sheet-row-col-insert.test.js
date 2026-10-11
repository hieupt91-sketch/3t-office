/** Behavioral tests — real row/column insertion for VN Sheet. */
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { createSheetGridWithSheets } from "./sheet-test-fixtures.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

function container() {
  return { querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, classList: { add() {}, remove() {}, toggle() {} } };
}

function assert(condition, message) { if (!condition) throw new Error(message); }

function seedGrid() {
  const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
  for (let row = 1; row <= 5; row++) for (const col of ["A", "B", "C"]) grid.setCellValue(col, row, `${col}${row}-old`, false);
  grid.undoStack = [];
  grid.redoStack = [];
  return grid;
}

export async function runSheetRowColInsertTests() {
  const results = [];
  const test = async (name, callback) => {
    try { await callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Insert Row: hàng 3 mới trống, dữ liệu A1:C5 cũ dời đúng xuống hàng 4:6", () => {
    const grid = seedGrid();
    const oldCount = grid.rowCount;
    grid.selectCell("B", 3);
    assert(grid.insertRow(), "insertRow phải trả true");
    assert(grid.rowCount === oldCount + 1, "Số hàng hiển thị phải tăng đúng 1");
    for (const col of ["A", "B", "C"]) {
      assert(!grid.cellsData.has(`${col}3`), `${col}3 mới phải trống`);
      assert(grid.cellsData.get(`${col}4`)?.val === `${col}3-old`, `${col}3 cũ phải dời xuống ${col}4`);
      assert(grid.cellsData.get(`${col}6`)?.val === `${col}5-old`, `${col}5 cũ phải dời xuống ${col}6`);
    }
  });

  await test("Insert Column: cột B mới trống, dữ liệu B:C cũ dời đúng sang C:D", () => {
    const grid = seedGrid();
    const oldCount = grid.cols.length;
    grid.selectCell("B", 3);
    assert(grid.insertColumn(), "insertColumn phải trả true");
    assert(grid.cols.length === oldCount + 1 && grid.cols.at(-1) === "AA", "Phải thêm cột AA thật vào cuối lưới");
    for (let row = 1; row <= 5; row++) {
      assert(!grid.cellsData.has(`B${row}`), `B${row} mới phải trống`);
      assert(grid.cellsData.get(`C${row}`)?.val === `B${row}-old`, `B${row} cũ phải dời sang C${row}`);
      assert(grid.cellsData.get(`D${row}`)?.val === `C${row}-old`, `C${row} cũ phải dời sang D${row}`);
    }
  });

  await test("Insert Row dịch comment, conditional formatting, validation, print area và page break", () => {
    const grid = seedGrid();
    const sheet = grid.activeSheet;
    grid.commentsBySheet[sheet].B3 = { coord: "B3", text: "Ghi chú", author: "QA" };
    grid.conditionalFormattingBySheet[sheet] = [{ id: "cf", range: { start: { c: "A", r: 2 }, end: { c: "C", r: 4 } } }];
    grid.dataValidationsBySheet[sheet] = [{ id: "dv", range: { start: { c: "B", r: 3 }, end: { c: "B", r: 5 } } }];
    grid.printAreaBySheet[sheet] = "A2:C5";
    grid.pageBreaksBySheet[sheet] = { rows: [3, 8], cols: ["B"] };
    grid.insertRow(3);
    assert(grid.commentsBySheet[sheet].B4?.coord === "B4" && !grid.commentsBySheet[sheet].B3, "Comment phải dời B3 → B4");
    assert(grid.conditionalFormattingBySheet[sheet][0].range.end.r === 5, "Conditional Formatting giao điểm phải mở rộng đến hàng 5");
    assert(grid.dataValidationsBySheet[sheet][0].range.start.r === 4 && grid.dataValidationsBySheet[sheet][0].range.end.r === 6, "Validation phải dời 3:5 → 4:6");
    assert(grid.printAreaBySheet[sheet] === "A2:C6", "Print area phải mở rộng A2:C5 → A2:C6");
    assert(grid.pageBreaksBySheet[sheet].rows.join(",") === "4,9", "Page breaks phải dịch theo hàng");
  });

  await test("Insert Column dịch metadata theo cột và cập nhật tham chiếu công thức A1/range", () => {
    const grid = seedGrid();
    const sheet = grid.activeSheet;
    grid.setCellValue("A", 8, "=SUM(B3:C5)", false);
    grid.commentsBySheet[sheet].B3 = { coord: "B3", text: "Ghi chú" };
    grid.conditionalFormattingBySheet[sheet] = [{ id: "cf", range: { start: { c: "A", r: 2 }, end: { c: "C", r: 4 } } }];
    grid.dataValidationsBySheet[sheet] = [{ id: "dv", range: { start: { c: "B", r: 3 }, end: { c: "C", r: 5 } } }];
    grid.printAreaBySheet[sheet] = "A2:C5";
    grid.pageBreaksBySheet[sheet] = { rows: [3], cols: ["B", "D"] };
    grid.insertColumn("B");
    assert(grid.commentsBySheet[sheet].C3?.coord === "C3", "Comment phải dời B3 → C3");
    assert(grid.conditionalFormattingBySheet[sheet][0].range.end.c === "D", "Conditional Formatting giao điểm phải mở rộng sang D");
    assert(grid.dataValidationsBySheet[sheet][0].range.start.c === "C" && grid.dataValidationsBySheet[sheet][0].range.end.c === "D", "Validation phải dời B:C → C:D");
    assert(grid.printAreaBySheet[sheet] === "A2:D5", "Print area phải mở rộng A2:C5 → A2:D5");
    assert(grid.pageBreaksBySheet[sheet].cols.join(",") === "C,E", "Page breaks phải dịch theo cột");
    assert(grid.cellsData.get("A8")?.formula === "=SUM(C3:D5)", "Công thức phải cập nhật B3:C5 → C3:D5");
  });

  await test("Undo/Redo khôi phục nguyên tử dữ liệu, metadata và kích thước lưới", () => {
    const grid = seedGrid();
    const sheet = grid.activeSheet;
    grid.commentsBySheet[sheet].B3 = { coord: "B3", text: "Undo me" };
    grid.insertRow(3);
    assert(grid.undoStack.length === 1, "Insert phải tạo đúng một history action");
    grid.undo();
    assert(grid.rowCount === 200 && grid.cellsData.get("B3")?.val === "B3-old" && grid.commentsBySheet[sheet].B3, "Undo phải phục hồi toàn bộ state trước insert");
    grid.redo();
    assert(grid.rowCount === 201 && grid.cellsData.get("B4")?.val === "B3-old" && grid.commentsBySheet[sheet].B4, "Redo phải áp lại toàn bộ state sau insert");
  });

  await test("Insert chỉ thay đổi dữ liệu/metadata của sheet đang active", () => {
    const grid = seedGrid();
    const first = grid.activeSheet;
    grid.commentsBySheet[first].A3 = { coord: "A3", text: "Sheet A" };
    grid.switchSheet("Nhân sự");
    grid.setCellValue("A", 3, "Sheet B", false);
    grid.commentsBySheet[grid.activeSheet].A3 = { coord: "A3", text: "Sheet B" };
    grid.switchSheet(first);
    grid.insertRow(3);
    grid.switchSheet("Nhân sự");
    assert(grid.cellsData.get("A3")?.val === "Sheet B", "Dữ liệu sheet B không được dời");
    assert(grid.commentsBySheet[grid.activeSheet].A3?.text === "Sheet B", "Metadata sheet B không được dời");
  });

  await test("Adapter dispatch và Command Bus xử lý hai lệnh ribbon với args=null", async () => {
    const grid = seedGrid();
    const adapter = new SheetAdapter(grid);
    adapter.attach();
    grid.selectCell("A", 3);
    assert(await adapter.handleDispatch(".uno:InsertRowsBefore", null, "sheet.row.insert"), "handleDispatch row phải xử lý lệnh");
    assert(grid.cellsData.get("A4")?.val === "A3-old", "Dispatch row phải mutation dữ liệu thật");
    grid.selectCell("B", 2);
    assert(await globalCommandBus.execute("sheet.col.insert"), "Command Bus column phải xử lý args=null");
    assert(grid.cellsData.get("C2")?.val === "B2-old", "Command Bus column phải mutation dữ liệu thật");
  });

  return results;
}
