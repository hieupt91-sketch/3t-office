import { SheetGridController } from "../../apps/sheet/sheet-grid.js";

const assert = (condition, message) => { if (!condition) throw new Error(message); };

function mockContainer() {
  const elements = new Map();
  return {
    querySelector: (sel) => elements.get(sel) || null,
    querySelectorAll: () => [],
    focus() {},
    classList: { add() {}, remove() {}, toggle() {} },
    _setMockElement: (sel, el) => elements.set(sel, el)
  };
}

export async function runSheetAutofillDragTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  // 1. NHẤP ĐÚP CHỐT ĐIỀN
  test("Double-click: Ưu tiên cột trái liền kề trước cột phải", () => {
    const grid = new SheetGridController(mockContainer());
    // Cột trái A có 10 dòng
    for (let r = 1; r <= 10; r++) grid.cellsData.set(`A${r}`, { val: r, formula: "", style: {} });
    // Cột phải C có 5 dòng
    for (let r = 1; r <= 5; r++) grid.cellsData.set(`C${r}`, { val: r, formula: "", style: {} });
    // Cột B chọn B1: 100
    grid.cellsData.set("B1", { val: 100, formula: "", style: {} });
    grid.selectionRange = { start: { c: "B", r: 1 }, end: { c: "B", r: 1 } };
    grid.selectedCoord = { c: "B", r: 1 };

    const ok = grid._autofillDownToAdjacentData();
    assert(ok === true, "Phải thực hiện điền");
    assert(grid.cellsData.get("B10")?.val === 100, "Phải điền xuống đến dòng 10 của cột trái A");
    assert(!grid.cellsData.has("B11"), "Không được điền quá dòng 10");
  });

  test("Double-click: Cột trái trống thì lấy theo cột phải liền kề", () => {
    const grid = new SheetGridController(mockContainer());
    // Cột A hoàn toàn trống
    // Cột C có 7 dòng
    for (let r = 1; r <= 7; r++) grid.cellsData.set(`C${r}`, { val: `c${r}`, formula: "", style: {} });
    grid.cellsData.set("B1", { val: "item", formula: "", style: {} });
    grid.selectionRange = { start: { c: "B", r: 1 }, end: { c: "B", r: 1 } };
    grid.selectedCoord = { c: "B", r: 1 };

    const ok = grid._autofillDownToAdjacentData();
    assert(ok === true, "Phải điền theo cột phải khi cột trái trống");
    assert(grid.cellsData.get("B7")?.val === "item", "Phải điền đến dòng 7 của cột phải");
    assert(!grid.cellsData.has("B8"), "Không được điền vượt quá cột phải");
  });

  test("Double-click: Dừng lại trước ô trống liền kề", () => {
    const grid = new SheetGridController(mockContainer());
    // Cột A: A1, A2, A3 có dữ liệu, A4 trống, A5, A6 có dữ liệu
    grid.cellsData.set("A1", { val: 1, formula: "", style: {} });
    grid.cellsData.set("A2", { val: 2, formula: "", style: {} });
    grid.cellsData.set("A3", { val: 3, formula: "", style: {} });
    grid.cellsData.set("A5", { val: 5, formula: "", style: {} });
    grid.cellsData.set("A6", { val: 6, formula: "", style: {} });

    grid.cellsData.set("B1", { val: "val", formula: "", style: {} });
    grid.selectionRange = { start: { c: "B", r: 1 }, end: { c: "B", r: 1 } };
    grid.selectedCoord = { c: "B", r: 1 };

    grid._autofillDownToAdjacentData();
    assert(grid.cellsData.get("B3")?.val === "val", "Điền đến dòng 3");
    assert(!grid.cellsData.has("B4"), "Phải dừng ở ô trống trước A4");
  });

  test("Double-click trong Excel Table: Điền đến hết hàng dữ liệu cuối của bảng", () => {
    const grid = new SheetGridController(mockContainer());
    grid.formatAsTable("tableBlue", { start: { c: "B", r: 2 }, end: { c: "D", r: 8 } }, false, {
      hasHeaders: true,
      name: "Table1"
    });
    grid.cellsData.set("C2", { val: "Tiêu đề", formula: "", style: {} });
    grid.cellsData.set("C3", { val: "=B3*2", formula: "=B3*2", style: {} });
    grid.selectionRange = { start: { c: "C", r: 3 }, end: { c: "C", r: 3 } };
    grid.selectedCoord = { c: "C", r: 3 };

    const ok = grid._autofillDownToAdjacentData();
    assert(ok === true, "Phải điền trong bảng");
    assert(grid.cellsData.get("C8")?.formula === "=B8*2", "Điền đến hàng dữ liệu cuối của bảng (dòng 8)");
    assert(!grid.cellsData.has("C9"), "Không điền vượt ra ngoài bảng");
  });

  // 2. GIỮ CTRL KHI KÉO CHỐT ĐIỀN (ĐẢO CHIỀU SAO CHÉP <-> ĐIỀN CHUỖI)
  test("Ctrl+kéo: 1 số đơn bình thường copy -> giữ Ctrl chuyển thành điền chuỗi", () => {
    const grid = new SheetGridController(mockContainer());
    grid.cellsData.set("A1", { val: 10, formula: "", style: {} });

    // Không Ctrl: copy -> 10, 10, 10
    grid._executeAutofill(
      { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } },
      { direction: "down", startCol: "A", endCol: "A", startRow: 2, endRow: 4, isCtrlPressed: false }
    );
    assert(grid.cellsData.get("A2")?.val === 10, "Không Ctrl: số đơn sao chép 10");
    assert(grid.cellsData.get("A3")?.val === 10, "Không Ctrl: số đơn sao chép 10");

    // Giữ Ctrl: đảo chiều thành series -> 11, 12, 13
    grid._executeAutofill(
      { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } },
      { direction: "down", startCol: "A", endCol: "A", startRow: 2, endRow: 4, isCtrlPressed: true }
    );
    assert(grid.cellsData.get("A2")?.val === 11, "Giữ Ctrl: số đơn tăng chuỗi thành 11");
    assert(grid.cellsData.get("A3")?.val === 12, "Giữ Ctrl: số đơn tăng chuỗi thành 12");
    assert(grid.cellsData.get("A4")?.val === 13, "Giữ Ctrl: số đơn tăng chuỗi thành 13");
  });

  test("Ctrl+kéo: Chuỗi 2 số bình thường điền chuỗi -> giữ Ctrl chuyển thành sao chép", () => {
    const grid = new SheetGridController(mockContainer());
    grid.cellsData.set("A1", { val: 1, formula: "", style: {} });
    grid.cellsData.set("A2", { val: 2, formula: "", style: {} });

    // Không Ctrl: series -> 3, 4
    grid._executeAutofill(
      { start: { c: "A", r: 1 }, end: { c: "A", r: 2 } },
      { direction: "down", startCol: "A", endCol: "A", startRow: 3, endRow: 4, isCtrlPressed: false }
    );
    assert(grid.cellsData.get("A3")?.val === 3 && grid.cellsData.get("A4")?.val === 4, "Không Ctrl: tăng 3, 4");

    // Giữ Ctrl: đảo chiều thành copy lặp lại -> 1, 2
    grid._executeAutofill(
      { start: { c: "A", r: 1 }, end: { c: "A", r: 2 } },
      { direction: "down", startCol: "A", endCol: "A", startRow: 3, endRow: 4, isCtrlPressed: true }
    );
    assert(grid.cellsData.get("A3")?.val === 1, "Giữ Ctrl: lặp lại 1");
    assert(grid.cellsData.get("A4")?.val === 2, "Giữ Ctrl: lặp lại 2");
  });

  test("Ctrl+kéo: Chữ có đuôi số bình thường tăng chuỗi -> giữ Ctrl chuyển thành sao chép", () => {
    const grid = new SheetGridController(mockContainer());
    grid.cellsData.set("A1", { val: "Tập 1", formula: "", style: {} });

    // Không Ctrl: tăng -> Tập 2, Tập 3
    grid._executeAutofill(
      { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } },
      { direction: "down", startCol: "A", endCol: "A", startRow: 2, endRow: 3, isCtrlPressed: false }
    );
    assert(grid.cellsData.get("A2")?.val === "Tập 2", "Không Ctrl: Tập 2");

    // Giữ Ctrl: sao chép -> Tập 1, Tập 1
    grid._executeAutofill(
      { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } },
      { direction: "down", startCol: "A", endCol: "A", startRow: 2, endRow: 3, isCtrlPressed: true }
    );
    assert(grid.cellsData.get("A2")?.val === "Tập 1", "Giữ Ctrl: sao chép Tập 1");
    assert(grid.cellsData.get("A3")?.val === "Tập 1", "Giữ Ctrl: sao chép Tập 1");
  });

  // 3. TÙY CHỌN TỰ ĐIỀN (AUTO FILL OPTIONS)
  test("Tùy chọn Tự điền: Áp dụng lại 'copy' chuyển kết quả từ chuỗi sang sao chép", () => {
    const grid = new SheetGridController(mockContainer());
    grid.cellsData.set("A1", { val: "Mục 1", formula: "", style: {} });
    grid._executeAutofill(
      { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } },
      { direction: "down", startCol: "A", endCol: "A", startRow: 2, endRow: 3 }
    );
    assert(grid.cellsData.get("A2")?.val === "Mục 2", "Ban đầu là chuỗi Mục 2");

    grid._applyAutofillOption("copy");
    assert(grid.cellsData.get("A2")?.val === "Mục 1", "Sau khi chọn Sao chép ô: A2 thành Mục 1");
    assert(grid.cellsData.get("A3")?.val === "Mục 1", "Sau khi chọn Sao chép ô: A3 thành Mục 1");
  });

  test("Tùy chọn Tự điền: 'formats' chỉ điền định dạng, giữ nguyên giá trị ô đích", () => {
    const grid = new SheetGridController(mockContainer());
    grid.cellsData.set("A1", { val: 100, formula: "", style: { fontWeight: "bold", backgroundColor: "#FFFF00" } });
    grid.cellsData.set("A2", { val: "Giữ lại tôi", formula: "", style: {} });

    grid._executeAutofill(
      { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } },
      { direction: "down", startCol: "A", endCol: "A", startRow: 2, endRow: 2 }
    );
    grid._applyAutofillOption("formats");

    const a2 = grid.cellsData.get("A2");
    assert(a2.val === "Giữ lại tôi", "Giá trị ô A2 phải được giữ nguyên");
    assert(a2.style.fontWeight === "bold", "Định dạng in đậm phải được sao chép");
    assert(a2.style.backgroundColor === "#FFFF00", "Màu nền phải được sao chép");
  });

  test("Tùy chọn Tự điền: 'withoutFormats' điền giá trị nhưng không sao chép định dạng", () => {
    const grid = new SheetGridController(mockContainer());
    grid.cellsData.set("A1", { val: 10, formula: "", style: { fontWeight: "bold", backgroundColor: "#FF0000" } });
    grid.cellsData.set("A2", { val: 20, formula: "", style: { fontStyle: "italic" } });

    grid._executeAutofill(
      { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } },
      { direction: "down", startCol: "A", endCol: "A", startRow: 2, endRow: 2 }
    );
    grid._applyAutofillOption("withoutFormats");

    const a2 = grid.cellsData.get("A2");
    assert(a2.val === 10, "Giá trị phải được điền");
    assert(!a2.style.fontWeight || a2.style.fontWeight === "normal", "Không được nhận in đậm từ A1");
    assert(!a2.style.backgroundColor, "Không được nhận màu nền từ A1");
  });

  test("Tùy chọn Tự điền ngày: weekdays, months, years", () => {
    const grid = new SheetGridController(mockContainer());
    // Thứ Sáu 16/10/2026
    grid.cellsData.set("A1", { val: "16/10/2026", formula: "", style: {} });

    // Weekdays
    grid._executeAutofill(
      { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } },
      { direction: "down", startCol: "A", endCol: "A", startRow: 2, endRow: 3, fillType: "weekdays" }
    );
    assert(grid.cellsData.get("A2")?.val === "19/10/2026", "Thứ Sáu nhảy sang Thứ Hai 19/10/2026 (bỏ qua T7/CN)");
    assert(grid.cellsData.get("A3")?.val === "20/10/2026", "Thứ Ba 20/10/2026");

    // Months với ngày cuối tháng 31/01/2026
    grid.cellsData.set("B1", { val: "31/01/2026", formula: "", style: {} });
    grid._executeAutofill(
      { start: { c: "B", r: 1 }, end: { c: "B", r: 1 } },
      { direction: "down", startCol: "B", endCol: "B", startRow: 2, endRow: 4, fillType: "months" }
    );
    assert(grid.cellsData.get("B2")?.val === "28/02/2026", "Tháng 2 năm thường kết thúc 28/02");
    assert(grid.cellsData.get("B3")?.val === "31/03/2026", "Tháng 3 trở lại 31/03");
    assert(grid.cellsData.get("B4")?.val === "30/04/2026", "Tháng 4 kết thúc 30/04");

    // Years với năm nhuận 29/02/2024
    grid.cellsData.set("C1", { val: "29/02/2024", formula: "", style: {} });
    grid._executeAutofill(
      { start: { c: "C", r: 1 }, end: { c: "C", r: 1 } },
      { direction: "down", startCol: "C", endCol: "C", startRow: 2, endRow: 3, fillType: "years" }
    );
    assert(grid.cellsData.get("C2")?.val === "28/02/2025", "Năm sau không nhuận -> 28/02/2025");
    assert(grid.cellsData.get("C3")?.val === "28/02/2026", "28/02/2026");
  });

  // 4. KÉO-THẢ VIỀN VÙNG CHỌN (MOVE, COPY, INSERT)
  test("Kéo viền di chuyển: Di chuyển ô và tự động cập nhật công thức tham chiếu", () => {
    const grid = new SheetGridController(mockContainer());
    grid.cellsData.set("A1", { val: 10, formula: "", style: {} });
    grid.cellsData.set("A2", { val: 20, formula: "", style: {} });
    grid.cellsData.set("B1", { val: 30, formula: "=A1+A2", style: {} });

    // Di chuyển A1:A2 sang D1:D2
    grid._executeCellMove({ start: { c: "A", r: 1 }, end: { c: "A", r: 2 } }, { c: "D", r: 1 }, false);

    assert(!grid.cellsData.has("A1") || grid.cellsData.get("A1")?.val === "", "A1 phải bị xóa");
    assert(!grid.cellsData.has("A2") || grid.cellsData.get("A2")?.val === "", "A2 phải bị xóa");
    assert(grid.cellsData.get("D1")?.val === 10, "D1 nhận giá trị 10");
    assert(grid.cellsData.get("D2")?.val === 20, "D2 nhận giá trị 20");

    // Tham chiếu ở B1 phải đổi thành =D1+D2
    assert(grid.cellsData.get("B1")?.formula === "=D1+D2", `Công thức B1 phải đổi thành =D1+D2, nhận ${grid.cellsData.get("B1")?.formula}`);
    assert(grid.cellsData.get("B1")?.val === 30, "B1 tính lại = 30");

    // Hoàn tác đúng 1 bước
    grid.undo();
    assert(grid.cellsData.get("A1")?.val === 10, "Undo: A1 trở lại 10");
    assert(grid.cellsData.get("A2")?.val === 20, "Undo: A2 trở lại 20");
    assert(grid.cellsData.get("B1")?.formula === "=A1+A2", "Undo: B1 trở lại =A1+A2");
  });

  test("Ctrl+kéo viền sao chép: Giữ ô nguồn và tịnh tiến công thức tương đối", () => {
    const grid = new SheetGridController(mockContainer());
    grid.cellsData.set("A1", { val: 10, formula: "", style: {} });
    grid.cellsData.set("A2", { val: 20, formula: "=A1*2", style: {} });

    // Sao chép A1:A2 sang D1:D2
    grid._executeCellMove({ start: { c: "A", r: 1 }, end: { c: "A", r: 2 } }, { c: "D", r: 1 }, true);

    assert(grid.cellsData.get("A1")?.val === 10, "A1 nguồn vẫn giữ nguyên 10");
    assert(grid.cellsData.get("A2")?.val === 20, "A2 nguồn vẫn giữ nguyên 20");
    assert(grid.cellsData.get("D1")?.val === 10, "D1 nhận 10");
    assert(grid.cellsData.get("D2")?.formula === "=D1*2", `D2 nhận công thức tịnh tiến =D1*2, nhận ${grid.cellsData.get("D2")?.formula}`);
    assert(grid.cellsData.get("D2")?.val === 20, "D2 tính = 20");
  });

  test("Shift+kéo viền chèn: Đẩy các ô lân cận xuống dưới mà không ghi đè", () => {
    const grid = new SheetGridController(mockContainer());
    grid.cellsData.set("A1", { val: "Chèn 1", formula: "", style: {} });
    grid.cellsData.set("A2", { val: "Chèn 2", formula: "", style: {} });
    grid.cellsData.set("B1", { val: "Cũ B1", formula: "", style: {} });
    grid.cellsData.set("B2", { val: "Cũ B2", formula: "", style: {} });

    // Shift+kéo A1:A2 chèn vào B1 hướng xuống
    grid._executeCellInsert(
      { start: { c: "A", r: 1 }, end: { c: "A", r: 2 } },
      { c: "B", r: 1 },
      false,
      "down"
    );

    assert(grid.cellsData.get("B1")?.val === "Chèn 1", "B1 nhận Chèn 1");
    assert(grid.cellsData.get("B2")?.val === "Chèn 2", "B2 nhận Chèn 2");
    assert(grid.cellsData.get("B3")?.val === "Cũ B1", "Cũ B1 bị đẩy xuống B3");
    assert(grid.cellsData.get("B4")?.val === "Cũ B2", "Cũ B2 bị đẩy xuống B4");

    // Hoàn tác
    grid.undo();
    assert(grid.cellsData.get("B1")?.val === "Cũ B1", "Undo: B1 trở lại Cũ B1");
    assert(grid.cellsData.get("B2")?.val === "Cũ B2", "Undo: B2 trở lại Cũ B2");
    assert(!grid.cellsData.has("B3") || grid.cellsData.get("B3")?.val === "", "Undo: B3 trống");
  });

  return results;
}
