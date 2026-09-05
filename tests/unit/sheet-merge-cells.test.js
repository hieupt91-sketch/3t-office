/** Behavioral tests — Excel-compatible merged cells in VN Sheet. */
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

function container() {
  return { querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, classList: { add() {}, remove() {}, toggle() {} } };
}

function assert(condition, message) { if (!condition) throw new Error(message); }

export async function runSheetMergeCellsTests() {
  const results = [];
  const test = async (name, callback) => {
    try { await callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Merge & Center giữ duy nhất dữ liệu top-left và chọn toàn vùng từ ô covered", async () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, "Tiêu đề", false);
    grid.setCellValue("B", 1, "Sẽ mất", false);
    grid.setCellValue("A", 2, "Sẽ mất", false);
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "C", r: 2 } };
    assert(await grid.mergeCells("mergeCenter", undefined, { confirmDataLoss: false }), "Merge phải thành công");
    const merged = grid.getMergedRanges()[0];
    assert(grid._rangeLabel(merged) === "A1:C2", "Model phải lưu đúng A1:C2");
    assert(grid.cellsData.get("A1")?.val === "Tiêu đề" && !grid.cellsData.has("B1") && !grid.cellsData.has("A2"), "Chỉ top-left được giữ dữ liệu");
    assert(grid.cellsData.get("A1")?.style?.textAlign === "center", "Merge & Center phải căn giữa");
    grid.selectCell("C", 2);
    assert(grid.getSelectedRangeLabel() === "A1:C2" && grid.selectedCoord.c === "A" && grid.selectedCoord.r === 1, "Click ô covered phải chọn toàn vùng merge");
  });

  await test("Merge Cells giữ căn chỉnh; Merge Across tạo một vùng merge trên mỗi hàng", async () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, "x", false);
    grid.cellsData.get("A1").style = { textAlign: "right" };
    await grid.mergeCells("mergeCells", { start: { c: "A", r: 1 }, end: { c: "B", r: 1 } }, { confirmDataLoss: false });
    assert(grid.cellsData.get("A1").style.textAlign === "right", "Merge Cells không được đổi căn chỉnh");
    await grid.mergeCells("mergeAcross", { start: { c: "C", r: 1 }, end: { c: "E", r: 3 } }, { confirmDataLoss: false });
    assert(grid.getMergedRanges().map(range => grid._rangeLabel(range)).join(",") === "A1:B1,C1:E1,C2:E2,C3:E3", "Merge Across phải tách theo từng hàng");
  });

  await test("Unmerge, Undo và Redo phục hồi model/dữ liệu đối xứng theo từng bước", async () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, "Giữ lại", false);
    grid.setCellValue("B", 1, "Xóa khi merge", false);
    grid.undoStack = [];
    await grid.mergeCells("mergeCells", { start: { c: "A", r: 1 }, end: { c: "B", r: 2 } }, { confirmDataLoss: false });
    assert(grid.undoStack.length === 1, "Merge phải là đúng một bước undo");
    grid.undo();
    assert(grid.getMergedRanges().length === 0 && grid.cellsData.get("B1")?.val === "Xóa khi merge", "Undo merge phải phục hồi dữ liệu trước merge");
    grid.redo();
    assert(grid.getMergedRanges().length === 1 && !grid.cellsData.has("B1"), "Redo merge phải xóa lại dữ liệu covered");
    grid.unmergeCells();
    assert(grid.getMergedRanges().length === 0 && grid.cellsData.get("A1")?.val === "Giữ lại" && !grid.cellsData.has("B1"), "Unmerge giữ top-left, ô còn lại rỗng");
    grid.undo();
    assert(grid.getMergedRanges().length === 1, "Undo unmerge phải phục hồi vùng merge");
    grid.redo();
    assert(grid.getMergedRanges().length === 0, "Redo unmerge phải tách lại");
  });

  await test("Adapter và Command Bus gọi đúng cả bốn lệnh merge", async () => {
    const grid = new SheetGridController(container());
    const adapter = new SheetAdapter(grid);
    adapter.attach();
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "B", r: 1 } };
    assert(await globalCommandBus.execute("sheet.cell.mergeCenter"), "Command mergeCenter phải chạy");
    assert(await adapter.handleDispatch(".uno:SplitCell", null, "sheet.cell.unmerge"), "Dispatch unmerge phải chạy");
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "B", r: 2 } };
    assert(await globalCommandBus.execute("sheet.cell.mergeAcross"), "Command mergeAcross phải chạy");
  });

  await test("Insert/Delete hàng và cột mở rộng, thu hẹp, dịch hoặc loại vùng merge", async () => {
    const grid = new SheetGridController(container());
    await grid.mergeCells("mergeCells", { start: { c: "B", r: 2 }, end: { c: "D", r: 4 } }, { confirmDataLoss: false });
    grid.undoStack = [];
    grid.insertRow(3);
    assert(grid._rangeLabel(grid.getMergedRanges()[0]) === "B2:D5", "Insert row bên trong phải mở rộng merge");
    grid.insertColumn("C");
    assert(grid._rangeLabel(grid.getMergedRanges()[0]) === "B2:E5", "Insert column bên trong phải mở rộng merge");
    grid.deleteRow(5);
    assert(grid._rangeLabel(grid.getMergedRanges()[0]) === "B2:E4", "Delete row cuối vùng phải thu hẹp merge");
    grid.deleteColumn("B");
    assert(grid._rangeLabel(grid.getMergedRanges()[0]) === "B2:D4", "Delete column đầu vùng phải thu hẹp merge");
    grid.undo();
    assert(grid._rangeLabel(grid.getMergedRanges()[0]) === "B2:E4", "Undo delete phải phục hồi merge range");

    await grid.mergeCells("mergeCells", { start: { c: "A", r: 8 }, end: { c: "C", r: 8 } }, { confirmDataLoss: false });
    grid.deleteRow(8);
    assert(!grid.getMergedRanges().some(range => range.start.r === 8 && range.end.r === 8), "Delete toàn bộ chiều cao phải xóa merge");
  });

  return results;
}
