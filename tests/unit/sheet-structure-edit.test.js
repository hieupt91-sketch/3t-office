import { SheetGridController } from "../../apps/sheet/sheet-grid.js";

function mockContainer() {
  return {
    setAttribute() {}, style: {}, innerHTML: "", className: "", appendChild() {}, insertBefore() {},
    querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, dispatchEvent() {},
    classList: { add() {}, remove() {}, toggle() {} }, focus() {}
  };
}
function assert(condition, message) { if (!condition) throw new Error(message); }

function twoSheetGrid() {
  const grid = new SheetGridController(mockContainer());
  grid.setCellValue("A", 1, 1); grid.setCellValue("A", 2, 2); grid.setCellValue("A", 3, 3); grid.setCellValue("A", 4, 4);
  grid.sheets = ["Sheet1", "Sheet2"];
  grid.sheetsData.Sheet2 = new Map([
    ["A1", { val: 10, formula: "=SUM(Sheet1!A1:A4)", style: {} }],
    ["A2", { val: 2, formula: "=Sheet1!A2*5", style: {} }],
    ["A3", { val: 3, formula: "=A1+Sheet1!A3", style: {} }]
  ]);
  return grid;
}

export async function runSheetStructureEditTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Xóa hàng: công thức ở trang khác trỏ vào trang này cũng cập nhật, hoàn tác khôi phục", () => {
    const grid = twoSheetGrid();
    assert(grid.deleteRow(2), "deleteRow phải chạy");
    const s2 = grid.sheetsData.Sheet2;
    assert(s2.get("A1").formula === "=SUM(Sheet1!A1:A3)", `Vùng phải co lại: ${s2.get("A1").formula}`);
    assert(s2.get("A2").formula === "=#REF!*5", `Ô bị xóa phải thành #REF!: ${s2.get("A2").formula}`);
    assert(s2.get("A3").formula === "=A1+Sheet1!A2", `Tham chiếu sau hàng xóa dịch lên, tham chiếu nội bộ giữ nguyên: ${s2.get("A3").formula}`);
    assert(grid.undo(), "undo phải chạy");
    assert(grid.sheetsData.Sheet2.get("A1").formula === "=SUM(Sheet1!A1:A4)" && grid.sheetsData.Sheet2.get("A2").formula === "=Sheet1!A2*5", "Hoàn tác phải trả công thức trang khác");
    assert(grid.redo(), "redo phải chạy");
    assert(grid.sheetsData.Sheet2.get("A2").formula === "=#REF!*5", "Làm lại phải áp lại");
  });

  await test("Chèn hàng/cột ở trang khác không làm đổi tham chiếu trỏ vào trang này", () => {
    const grid = twoSheetGrid();
    grid.switchSheet?.("Sheet2");
    if (grid.activeSheet !== "Sheet2") { grid.activeSheet = "Sheet2"; }
    grid.insertRow(1);
    const a = [...grid.sheetsData.Sheet2.values()].map(item => item.formula).filter(Boolean);
    assert(a.includes("=SUM(Sheet1!A1:A4)") && a.includes("=Sheet1!A2*5"), `Tham chiếu trang khác phải giữ nguyên: ${a}`);
  });

  await test("Sắp xếp: công thức theo hàng được dịch cùng hàng, chỉ cột trong vùng chọn bị di chuyển", () => {
    const grid = new SheetGridController(mockContainer());
    [[3, "=A1*10", "giữ1"], [1, "=A2*10", "giữ2"], [2, "=A3*10", "giữ3"]].forEach(([n, f, keep], i) => {
      grid.setCellValue("A", i + 1, n); grid.setCellValue("B", i + 1, f); grid.setCellValue("D", i + 1, keep);
    });
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "B", r: 3 } };
    grid.selectedCoord = { c: "A", r: 1 };
    assert(grid.sort("A", true), "sort phải chạy");
    const col = c => [1, 2, 3].map(r => grid.cellsData.get(`${c}${r}`));
    assert(col("A").map(x => x.val).join() === "1,2,3", `Cột A phải tăng dần: ${col("A").map(x => x.val)}`);
    assert(col("B").map(x => x.formula).join() === "=A1*10,=A2*10,=A3*10", `Công thức phải trỏ đúng hàng của chính nó: ${col("B").map(x => x.formula)}`);
    assert(col("D").map(x => x.val).join() === "giữ1,giữ2,giữ3", "Cột ngoài vùng chọn không được xáo trộn");
  });

  await test("Cắt-dán: công thức trỏ vào ô bị cắt đi theo ô, công thức bị cắt giữ nguyên tham chiếu, hoàn tác khôi phục", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, 5); grid.setCellValue("B", 1, "=A1*2"); grid.setCellValue("C", 1, "=B1+1");
    grid.selectionRange = { start: { c: "B", r: 1 }, end: { c: "B", r: 1 } }; grid.selectedCoord = { c: "B", r: 1 };
    assert(grid.copySelection(true), "cắt phải chạy");
    grid.selectedCoord = { c: "B", r: 4 }; grid.selectionRange = { start: { c: "B", r: 4 }, end: { c: "B", r: 4 } };
    assert(grid.pasteClipboard(), "dán phải chạy");
    assert(grid.cellsData.get("B4").formula === "=A1*2", `Ô bị cắt phải giữ tham chiếu: ${grid.cellsData.get("B4").formula}`);
    assert(grid.cellsData.get("C1").formula === "=B4+1", `Công thức trỏ vào ô bị cắt phải đi theo: ${grid.cellsData.get("C1").formula}`);
    assert(grid.undo(), "hoàn tác phải chạy");
    assert(grid.cellsData.get("C1").formula === "=B1+1" && grid.cellsData.get("B1").formula === "=A1*2", "Hoàn tác phải trả lại công thức gốc");
  });

  await test("SUBTOTAL/AGGREGATE bỏ hàng bị lọc, mã 101-111 bỏ cả hàng ẩn tay, tính lại khi lọc/ẩn/bỏ lọc", () => {
    const grid = new SheetGridController(mockContainer());
    [["A", 1, "Ten"], ["B", 1, "Gia"], ["A", 2, "x"], ["B", 2, 10], ["A", 3, "y"], ["B", 3, 20], ["A", 4, "x"], ["B", 4, 30], ["A", 5, "y"], ["B", 5, 40]].forEach(([c, r, v]) => grid.setCellValue(c, r, v));
    ["=SUBTOTAL(9,B2:B5)", "=SUBTOTAL(109,B2:B5)", "=SUM(B2:B5)", "=SUBTOTAL(3,A2:A5)", "=SUBTOTAL(103,A2:A5)", "=AGGREGATE(9,5,B2:B5)"].forEach((f, i) => grid.setCellValue("D", i + 1, f));
    const read = () => [1, 2, 3, 4, 5, 6].map(r => grid.cellsData.get(`D${r}`).val).join(",");
    grid.isFilterActive = true; grid.sheetStates[grid.activeSheet].filterRange = "A1:B5";
    grid.applyFilter("A", new Set(["x"]));
    assert(read() === "40,40,100,2,2,40", `Sau khi lọc: ${read()}`);
    grid.hideRows([2]);
    assert(read() === "40,30,100,2,1,30", `Sau khi ẩn tay hàng 2: ${read()}`);
    grid.unhideRows([2]); grid.clearAllFilters();
    assert(read() === "100,100,100,4,4,100", `Sau khi bỏ lọc: ${read()}`);
  });

  return results;
}