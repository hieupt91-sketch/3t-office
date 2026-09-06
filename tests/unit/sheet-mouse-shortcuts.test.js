import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

function mockContainer() {
  const listeners = {};
  return {
    setAttribute() {},
    style: {},
    innerHTML: "",
    className: "",
    appendChild() {},
    insertBefore() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(event, fn) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    dispatchEvent(e) {
      (listeners[e.type] || []).forEach(fn => fn(e));
    },
    classList: { add() {}, remove() {}, toggle() {} },
    focus() { this._focused = true; },
    _listeners: listeners
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runSheetMouseShortcutsTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("Sheet Parity: selectCurrentColumn (Ctrl+Space) chọn toàn bộ cột từ 1 đến rowCount", () => {
    const grid = new SheetGridController(mockContainer());
    grid.selectCell("C", 5);
    grid.selectCurrentColumn();
    const range = grid.selectionRange;
    assert(range.start.c === "C" && range.start.r === 1, "Bắt đầu phải là C1");
    assert(range.end.c === "C" && range.end.r === grid.rowCount, `Kết thúc phải là C${grid.rowCount}`);
  });

  await test("Sheet Parity: selectCurrentRow (Shift+Space) chọn toàn bộ hàng từ A đến cột cuối", () => {
    const grid = new SheetGridController(mockContainer());
    grid.selectCell("D", 8);
    grid.selectCurrentRow();
    const range = grid.selectionRange;
    assert(range.start.c === "A" && range.start.r === 8, "Bắt đầu phải là A8");
    assert(range.end.c === grid.cols[grid.cols.length - 1] && range.end.r === 8, "Kết thúc phải là cột cuối hàng 8");
  });

  await test("Sheet Parity: toggleShowFormulas (Ctrl+`) chuyển đổi cờ showFormulas", () => {
    const grid = new SheetGridController(mockContainer());
    assert(grid.showFormulas === false, "Mặc định showFormulas phải false");
    const state1 = grid.toggleShowFormulas();
    assert(state1 === true && grid.showFormulas === true, "toggle lần 1 phải bật true");
    const state2 = grid.toggleShowFormulas();
    assert(state2 === false && grid.showFormulas === false, "toggle lần 2 phải tắt false");
  });

  await test("Sheet Parity: insertCurrentTime (Ctrl+Shift+;) chèn thời gian dạng hh:mm:ss", () => {
    const grid = new SheetGridController(mockContainer());
    grid.selectCell("B", 3);
    grid.insertCurrentTime();
    const data = grid.cellsData.get("B3");
    assert(data && /^\d{2}:\d{2}:\d{2}$/.test(data.val), `Giá trị phải là giờ hh:mm:ss, thực tế: ${data?.val}`);
  });

  await test("Sheet Parity: Autofill số tăng dần và công thức tương đối kèm Undo/Redo", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "10");
    grid.setCellValue("A", 2, "20");
    
    // Kéo autofill từ A1:A2 xuống A3:A4
    const src = { start: { c: "A", r: 1 }, end: { c: "A", r: 2 } };
    const target = { direction: "down", startCol: "A", endCol: "A", startRow: 3, endRow: 4 };
    grid._executeAutofill(src, target);
    
    assert(grid.cellsData.get("A3")?.val === 30, `A3 phải là 30, thực tế: ${grid.cellsData.get("A3")?.val}`);
    assert(grid.cellsData.get("A4")?.val === 40, `A4 phải là 40, thực tế: ${grid.cellsData.get("A4")?.val}`);

    // Test Undo
    grid.undo();
    assert(!grid.cellsData.get("A3")?.val, "Sau Undo A3 phải trống");
    assert(!grid.cellsData.get("A4")?.val, "Sau Undo A4 phải trống");

    // Test Redo
    grid.redo();
    assert(grid.cellsData.get("A3")?.val === 30, "Sau Redo A3 phải là 30");
  });

  await test("Sheet Parity: Cell Move kéo thả viền ô di chuyển nội dung và style kèm Undo/Redo", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("B", 2, "XinChao");
    grid.selectedCoord = { c: "B", r: 2 };
    grid.setStyle("fontWeight", "bold");
    
    // Di chuyển từ B2 sang D5
    grid._executeCellMove({ c: "B", r: 2 }, { c: "D", r: 5 });
    
    assert(!grid.cellsData.get("B2")?.val, "B2 phải trống sau khi move");
    const d5 = grid.cellsData.get("D5");
    assert(d5?.val === "XinChao", `D5 phải là XinChao, thực tế: ${d5?.val}`);
    assert(d5?.style?.fontWeight === "bold", "D5 phải giữ style bold");

    // Test Undo
    grid.undo();
    assert(grid.cellsData.get("B2")?.val === "XinChao", "Sau Undo B2 phải có lại dữ liệu");
    assert(!grid.cellsData.get("D5")?.val, "Sau Undo D5 phải trống");
  });

  await test("Sheet Parity: Header double-click autoFitColumn và autoFitRow tính toán kích thước", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "Chuỗi ký tự rất rất dài để test auto fit độ rộng cột");
    const width = grid.autoFitColumn("A");
    assert(width && width > 120, `Độ rộng cột A phải được co giãn > 120px, thực tế: ${width}`);

    const height = grid.autoFitRow(1);
    assert(height && height >= 24, "Chiều cao hàng 1 phải >= 24px");
  });

  await test("Sheet Parity: F4 lặp lại lệnh gần nhất (common.edit.repeat)", () => {
    const def = globalCommandBus.getDefinition("common.edit.repeat");
    assert(def && def.shortcut === "F4", "Lệnh repeat phải được định nghĩa với phím tắt F4");
  });

  await test("Sheet Parity: _startRangeSelect với shiftKey mở rộng range, không shift thì reset về 1 ô", () => {
    const grid = new SheetGridController(mockContainer());
    grid.selectCell("G", 2, false);
    assert(grid.getSelectedRangeLabel() === "G2", "Ban đầu phải là G2");

    grid._startRangeSelect({ shiftKey: true, button: 0 }, "G", 4);
    grid._isSelectingRange = false;
    grid.selectCell("G", 4, true);
    assert(grid.getSelectedRangeLabel() === "G2:G4", `_startRangeSelect Shift+G4 phải ra G2:G4, nhận: ${grid.getSelectedRangeLabel()}`);
    assert(grid.selectedCoord.c === "G" && grid.selectedCoord.r === 2, "Neo selectedCoord phải giữ G2");

    grid._startRangeSelect({ shiftKey: false, button: 0 }, "G", 4);
    grid._isSelectingRange = false;
    grid.selectCell("G", 4, false);
    assert(grid.getSelectedRangeLabel() === "G4", `Click không Shift phải reset về G4, nhận: ${grid.getSelectedRangeLabel()}`);
  });

  return results;
}
