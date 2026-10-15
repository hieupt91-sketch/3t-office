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

  test("Transpose formula refs xoay trục tham chiếu tương đối chính xác như Excel", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 10);
    grid.setCellValue("A", 2, 20);
    grid.setCellValue("B", 1, "=A1*2");
    grid.setCellValue("B", 2, "=A2*2");
    const source = clip(grid, { c: "A", r: 1 }, { c: "B", r: 2 });
    grid.applyPasteSpecial(source, "transpose", { c: "D", r: 1 });
    assert(grid.cellsData.get("D1").val === 10, "D1 phải là 10");
    assert(grid.cellsData.get("D2").formula === "=D1*2", "D2 phải nhận formula =D1*2");
    assert(grid.cellsData.get("E1").val === 20, "E1 phải là 20");
    assert(grid.cellsData.get("E2").formula === "=E1*2", "E2 phải nhận formula =E1*2");
  });

  test("Transpose vung SUM chuyen vi thanh dong SUM tuong ung", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 1);
    grid.setCellValue("A", 2, 2);
    grid.setCellValue("A", 3, 3);
    grid.setCellValue("A", 4, "=SUM(A1:A3)");
    const source = clip(grid, { c: "A", r: 1 }, { c: "A", r: 4 });
    grid.applyPasteSpecial(source, "transpose", { c: "C", r: 1 });
    assert(grid.cellsData.get("F1").formula === "=SUM(C1:E1)", "F1 phải nhận =SUM(C1:E1)");
  });

  test("Paste Special Operation Add, Subtract, Multiply, Divide len so", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 5);
    const source = clip(grid, { c: "A", r: 1 }, { c: "A", r: 1 });

    // Add
    grid.setCellValue("B", 1, 10);
    grid.applyPasteSpecial(source, "values", { c: "B", r: 1 }, { operation: "add" });
    assert(grid.cellsData.get("B1").val === 15, "10 + 5 phải bằng 15");

    // Subtract
    grid.setCellValue("B", 2, 20);
    grid.applyPasteSpecial(source, "values", { c: "B", r: 2 }, { operation: "subtract" });
    assert(grid.cellsData.get("B2").val === 15, "20 - 5 phải bằng 15");

    // Multiply
    grid.setCellValue("B", 3, 7);
    grid.applyPasteSpecial(source, "values", { c: "B", r: 3 }, { operation: "multiply" });
    assert(grid.cellsData.get("B3").val === 35, "7 * 5 phải bằng 35");

    // Divide
    grid.setCellValue("B", 4, 30);
    grid.applyPasteSpecial(source, "values", { c: "B", r: 4 }, { operation: "divide" });
    assert(grid.cellsData.get("B4").val === 6, "30 / 5 phải bằng 6");
  });

  test("Paste Special Operation tren o co cong thuc ghep bieu thuc an toan", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 5);
    const source = clip(grid, { c: "A", r: 1 }, { c: "A", r: 1 });
    grid.setCellValue("B", 1, "=2*4");
    grid.applyPasteSpecial(source, "source", { c: "B", r: 1 }, { operation: "add" });
    assert(grid.cellsData.get("B1").formula === "=(2*4)+5", "Công thức đích phải được ghép an toàn");

    grid.setCellValue("A", 2, "=2+3");
    grid.setCellValue("B", 2, "=10+2");
    const source2 = clip(grid, { c: "A", r: 2 }, { c: "A", r: 2 });
    grid.applyPasteSpecial(source2, "formulas", { c: "B", r: 2 }, { operation: "multiply" });
    assert(grid.cellsData.get("B2").formula === "=(10+2)*(2+3)", "Nhân hai công thức phải bọc ngoặc đúng");
  });

  test("Paste Special Skip Blanks bo qua o nguon trong", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 100);
    // A2 trống
    grid.setCellValue("B", 1, 1);
    grid.setCellValue("B", 2, 2);
    const source = clip(grid, { c: "A", r: 1 }, { c: "A", r: 2 });

    // With skipBlanks: true -> B2 giữ nguyên 2
    grid.applyPasteSpecial(source, "source", { c: "B", r: 1 }, { skipBlanks: true });
    assert(grid.cellsData.get("B1").val === 100, "B1 phải nhận 100");
    assert(grid.cellsData.get("B2").val === 2, "B2 phải giữ nguyên giá trị 2 do bỏ qua ô trống");

    // Without skipBlanks: false -> C2 bị ghi đè thành trống
    grid.setCellValue("C", 1, 1);
    grid.setCellValue("C", 2, 2);
    grid.applyPasteSpecial(source, "source", { c: "C", r: 1 }, { skipBlanks: false });
    assert(grid.cellsData.get("C1").val === 100, "C1 phải nhận 100");
    assert((grid.cellsData.get("C2")?.val || "") === "", "C2 phải bị ghi đè thành ô trống");
  });

  test("Paste Special All Except Borders giu nguyen vien dich", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 42);
    grid.cellsData.get("A1").style = { border: "2px solid red", fontWeight: "bold" };
    grid.setCellValue("B", 1, 99);
    grid.cellsData.get("B1").style = { border: "1px dashed blue" };
    const source = clip(grid, { c: "A", r: 1 }, { c: "A", r: 1 });
    grid.applyPasteSpecial(source, "allExceptBorders", { c: "B", r: 1 });
    assert(grid.cellsData.get("B1").val === 42, "B1 phải nhận giá trị nguồn 42");
    assert(grid.cellsData.get("B1").style.fontWeight === "bold", "B1 phải nhận chữ đậm nguồn");
    assert(grid.cellsData.get("B1").style.border === "1px dashed blue", "Viền đích phải giữ nguyên");
  });
  return results;
}
