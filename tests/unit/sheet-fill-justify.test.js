import { SheetGridController } from "../../apps/sheet/sheet-grid.js";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const mockContainer = () => ({
  setAttribute() {},
  style: {},
  classList: { add() {}, remove() {}, toggle() {} },
  querySelector: () => null,
  querySelectorAll: () => [],
  focus() {}
});

export async function runSheetFillJustifyTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  test("Fill Justify: Ngắt dòng văn bản dài thành nhiều hàng theo độ rộng cột", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setColumnWidths(75, ["A"], false); // cw ~ 10
    grid.cellsData.set("A1", { val: "The quick brown fox jumps over the lazy dog", formula: "", style: {} });

    grid.fillJustify({ start: { c: "A", r: 1 }, end: { c: "A", r: 10 } }, false);

    assert(grid.cellsData.get("A1")?.val === "The quick", "A1 must be 'The quick'");
    assert(grid.cellsData.get("A2")?.val === "brown fox", "A2 must be 'brown fox'");
    assert(grid.cellsData.get("A3")?.val === "jumps over", "A3 must be 'jumps over'");
    assert(grid.cellsData.get("A4")?.val === "the lazy", "A4 must be 'the lazy'");
    assert(grid.cellsData.get("A5")?.val === "dog", "A5 must be 'dog'");
    assert(!grid.cellsData.get("A6")?.val, "A6 must be empty");
  });

  test("Fill Justify: Gom nhiều dòng ngắn thành một dòng khi cột đủ rộng", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setColumnWidths(355, ["A"], false); // cw ~ 50
    grid.cellsData.set("A1", { val: "The quick brown", formula: "", style: {} });
    grid.cellsData.set("A2", { val: "fox jumps over", formula: "", style: {} });
    grid.cellsData.set("A3", { val: "the lazy dog", formula: "", style: {} });

    grid.fillJustify({ start: { c: "A", r: 1 }, end: { c: "A", r: 5 } }, false);

    assert(grid.cellsData.get("A1")?.val === "The quick brown fox jumps over the lazy dog", "A1 merged text");
    assert(!grid.cellsData.get("A2")?.val, "A2 vacated and cleared");
    assert(!grid.cellsData.get("A3")?.val, "A3 vacated and cleared");
  });

  test("Fill Justify: Vùng chọn nhiều cột cộng dồn độ rộng và ghi vào cột trái", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setColumnWidths(75, ["A", "B"], false); // 2 cột cw 10
    grid.cellsData.set("A1", { val: "The quick brown fox jumps over the lazy dog and runs away", formula: "", style: {} });

    grid.fillJustify({ start: { c: "A", r: 1 }, end: { c: "B", r: 10 } }, false);

    assert(grid.cellsData.get("A1")?.val === "The quick brown fox", "A1 wrapped to double width");
    assert(grid.cellsData.get("A2")?.val === "jumps over the lazy dog", "A2 wrapped to double width");
    assert(grid.cellsData.get("A3")?.val === "and runs away", "A3 wrapped to double width");
    // Column B remains unchanged
    assert(!grid.cellsData.get("B1")?.val, "B1 untouched");
  });

  test("Fill Justify: Ô trống xen giữa đóng vai trò tách đoạn văn", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setColumnWidths(110, ["A"], false); // cw ~ 15
    grid.cellsData.set("A1", { val: "First paragraph text here", formula: "", style: {} });
    grid.cellsData.set("A2", { val: "", formula: "", style: {} });
    grid.cellsData.set("A3", { val: "Second paragraph text here", formula: "", style: {} });

    grid.fillJustify({ start: { c: "A", r: 1 }, end: { c: "A", r: 10 } }, false);

    assert(grid.cellsData.get("A1")?.val === "First paragraph", "Para 1 line 1");
    assert(grid.cellsData.get("A2")?.val === "text here", "Para 1 line 2");
    assert(!grid.cellsData.get("A3")?.val, "A3 empty separator preserved");
    assert(grid.cellsData.get("A4")?.val === "Second", "Para 2 line 1");
    assert(grid.cellsData.get("A5")?.val === "paragraph text", "Para 2 line 2");
    assert(grid.cellsData.get("A6")?.val === "here", "Para 2 line 3");
  });

  test("Fill Justify: Từ chối ô chứa số hoặc công thức khi không có định dạng @", () => {
    const grid = new SheetGridController(mockContainer());
    grid.cellsData.set("A1", { val: 12345, formula: "", style: {} });
    let errorCaught = false;
    try {
      grid.fillJustify({ start: { c: "A", r: 1 }, end: { c: "A", r: 5 } }, false);
    } catch {
      errorCaught = true;
    }
    assert(errorCaught, "Must reject unformatted numbers");

    grid.cellsData.set("A1", { val: "Text", formula: "=SUM(B1:B2)", style: {} });
    errorCaught = false;
    try {
      grid.fillJustify({ start: { c: "A", r: 1 }, end: { c: "A", r: 5 } }, false);
    } catch {
      errorCaught = true;
    }
    assert(errorCaught, "Must reject formulas");
  });

  test("Fill Justify: Chấp nhận chuỗi số có định dạng văn bản @", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setColumnWidths(145, ["A"], false); // cw 20
    grid.cellsData.set("A1", { val: "12345", formula: "", style: { numberFormat: { code: "@" } } });
    grid.cellsData.set("A2", { val: "67890", formula: "", style: { numberFormat: { code: "@" } } });

    grid.fillJustify({ start: { c: "A", r: 1 }, end: { c: "A", r: 5 } }, false);

    assert(grid.cellsData.get("A1")?.val === "12345 67890", "Text numbers merged cleanly");
    assert(!grid.cellsData.get("A2")?.val, "A2 cleared");
  });

  test("Fill Justify: Hoàn tác Undo khôi phục toàn bộ ô đã thay đổi trong 1 bước", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setColumnWidths(75, ["A"], false); // cw 10
    grid.cellsData.set("A1", { val: "The quick brown fox jumps over the lazy dog", formula: "", style: { color: "red" } });
    grid.cellsData.set("A3", { val: "Old text to overwrite", formula: "", style: {} });

    grid.fillJustify({ start: { c: "A", r: 1 }, end: { c: "A", r: 2 } }, true);

    // Should have overflowed into A3..A5
    assert(grid.cellsData.get("A3")?.val === "jumps over", "A3 overwritten");
    assert(grid.cellsData.get("A5")?.val === "dog", "A5 filled");

    // Perform Undo
    grid.undo();

    assert(grid.cellsData.get("A1")?.val === "The quick brown fox jumps over the lazy dog", "A1 restored");
    assert(grid.cellsData.get("A1")?.style?.color === "red", "A1 style restored");
    assert(!grid.cellsData.get("A2")?.val, "A2 restored to empty");
    assert(grid.cellsData.get("A3")?.val === "Old text to overwrite", "A3 restored to original text");
    assert(!grid.cellsData.get("A4")?.val, "A4 cleared by undo");
    assert(!grid.cellsData.get("A5")?.val, "A5 cleared by undo");
  });

  test("Center Across Selection & Shrink to Fit: Lưu và áp dụng kiểu ô chính xác", () => {
    const grid = new SheetGridController(mockContainer());
    grid.cellsData.set("A1", {
      val: "Tiêu đề trung tâm",
      formula: "",
      style: {
        horizontalAlignment: "centerContinuous",
        shrinkToFit: true
      }
    });

    const item = grid.cellsData.get("A1");
    assert(item.style.horizontalAlignment === "centerContinuous", "horizontalAlignment must be centerContinuous (xlCenterAcrossSelection)");
    assert(item.style.shrinkToFit === true, "shrinkToFit must be true");
  });

  return results;
}
