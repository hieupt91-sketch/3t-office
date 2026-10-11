import { SheetGridController } from "../../apps/sheet/sheet-grid.js";

function container() {
  return { querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, classList: { add() {}, remove() {}, toggle() {} } };
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function clip(grid, start, end) {
  const range = grid._normalizeRange({ start, end });
  const cells = [];
  for (let r = range.start.r; r <= range.end.r; r++) {
    const row = [];
    for (let c = grid._columnNumber(range.start.c); c <= grid._columnNumber(range.end.c); c++) row.push(structuredClone(grid.cellsData.get(`${grid._columnLabel(c)}${r}`) || { val: "", formula: "", style: {} }));
    cells.push(row);
  }
  return { range, cells };
}

export async function runSheetPasteSpecialTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  test("Paste Values Only giữ kết quả đã tính nhưng loại công thức", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 2); grid.setCellValue("B", 1, 3); grid.setCellValue("C", 1, "=A1+B1");
    const source = clip(grid, { c: "C", r: 1 }, { c: "C", r: 1 });
    assert(Number(String(source.cells[0][0].val).replace(/[^0-9,.-]/g, "").replace(",", ".")) === 5, "Ô nguồn phải có kết quả công thức bằng 5");
    grid.applyPasteSpecial(source, "values", { c: "D", r: 1 });
    assert(grid.cellsData.get("D1").val === source.cells[0][0].val, "Ô đích phải nhận đúng kết quả đã tính");
    assert(grid.cellsData.get("D1").formula === "", "Ô đích không được còn công thức");
  });

  test("Paste Formats Only không thay đổi dữ liệu đích", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 10); grid.cellsData.get("A1").style = { backgroundColor: "#ff0000", fontWeight: "bold", numberFormat: { category: "currency" } };
    grid.setCellValue("B", 1, 99);
    grid.applyPasteSpecial(clip(grid, { c: "A", r: 1 }, { c: "A", r: 1 }), "formats", { c: "B", r: 1 });
    assert(grid.cellsData.get("B1").val === 99, "Giá trị đích phải giữ nguyên");
    assert(grid.cellsData.get("B1").style.backgroundColor === "#ff0000" && grid.cellsData.get("B1").style.numberFormat.category === "currency", "Phải dán đủ style và number format");
  });

  test("Transpose xoay đúng hàng thành cột và là một bước Undo/Redo", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, "Một"); grid.setCellValue("B", 1, "Hai"); grid.undoStack = [];
    grid.applyPasteSpecial(clip(grid, { c: "A", r: 1 }, { c: "B", r: 1 }), "transpose", { c: "D", r: 2 });
    assert(grid.cellsData.get("D2").val === "Một" && grid.cellsData.get("D3").val === "Hai", "Hàng nguồn phải thành cột đích");
    assert(grid.undoStack.length === 1, "Paste Special phải là đúng một bước history");
    grid.undo(); assert((grid.cellsData.get("D2")?.val || "") === "" && (grid.cellsData.get("D3")?.val || "") === "", "Undo phải khôi phục cả vùng");
    grid.redo(); assert(grid.cellsData.get("D2").val === "Một" && grid.cellsData.get("D3").val === "Hai", "Redo phải dán lại cả vùng");
  });

  test("Paste Formulas Only dịch tham chiếu tương đối và không dán style", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 4); grid.setCellValue("B", 1, "=A1*2"); grid.cellsData.get("B1").style = { color: "red" };
    grid.setCellValue("D", 1, 7); grid.setCellValue("E", 1, 123); grid.cellsData.get("E1").style = { color: "blue" };
    grid.applyPasteSpecial(clip(grid, { c: "B", r: 1 }, { c: "B", r: 1 }), "formulas", { c: "E", r: 1 });
    assert(grid.cellsData.get("E1").formula === "=D1*2" && String(grid.cellsData.get("E1").val).includes("14"), "Công thức tương đối phải dịch và tính lại");
    assert(grid.cellsData.get("E1").style.color === "blue", "Style đích phải giữ nguyên");
  });
  test("Paste Source keeps merged cells and Undo/Redo in one history step", () => {
    const grid = new SheetGridController(container());
    const source = {
      range: { start: { c: "A", r: 1 }, end: { c: "B", r: 2 } },
      cells: [
        [{ val: "Gộp", formula: "", style: { fontWeight: "bold" } }, { val: "", formula: "", style: {} }],
        [{ val: "", formula: "", style: {} }, { val: "", formula: "", style: {} }]
      ],
      mergedRanges: [{ start: { c: "A", r: 1 }, end: { c: "B", r: 2 } }]
    };
    grid.undoStack = [];
    grid.applyPasteSpecial(source, "source", { c: "D", r: 3 });
    assert(grid.getMergedRanges().some(range => range.start.c === "D" && range.start.r === 3 && range.end.c === "E" && range.end.r === 4), "Ô gộp tương đối phải được tạo tại D3:E4");
    assert(grid.undoStack.length === 1, "Dán dữ liệu và ô gộp phải là đúng một bước history");
    grid.undo();
    assert(!grid.getMergedRanges().length && (grid.cellsData.get("D3")?.val || "") === "", "Undo phải bỏ cả dữ liệu và ô gộp");
    grid.redo();
    assert(grid.cellsData.get("D3")?.val === "Gộp" && grid.getMergedRanges().some(range => range.start.c === "D" && range.end.c === "E"), "Redo phải khôi phục dữ liệu và ô gộp");
  });
  return results;
}
