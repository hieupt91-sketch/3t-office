import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { FormulaEngine } from "../../apps/sheet/formula-engine.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
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

export async function runSheetKeyboardAuditTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("FormulaEngine: Biểu thức số học trong đối số hàm tài chính (0.08/12, 12*5) tính toán chính xác", () => {
    const engine = new FormulaEngine();
    const pmt = engine.evaluate("=PMT(0.08/12, 12*5, 100000000)");
    assert(typeof pmt === "number", `PMT phải trả về số, thực tế: ${pmt}`);
    assert(Math.abs(pmt - (-2027639.43)) < 0.1, `PMT phải xấp xỉ -2027639.43, thực tế: ${pmt}`);

    const sln = engine.evaluate("=SLN(100000000, 10000000, 10/2)");
    assert(sln === 18000000, `SLN với 10/2 phải trả về 18000000, thực tế: ${sln}`);
  });

  await test("SheetGridController: Range extension (Shift+click/Arrow) giữ nguyên selectedCoord là anchor", () => {
    const grid = new SheetGridController(mockContainer());
    grid.selectCell("J", 20, false);
    assert(grid.selectedCoord.c === "J" && grid.selectedCoord.r === 20, "Active ban đầu phải là J20");
    
    // Mở rộng vùng chọn tới J25
    grid.selectCell("J", 25, true);
    assert(grid.selectionRange.start.c === "J" && grid.selectionRange.start.r === 20, "Start range phải là J20");
    assert(grid.selectionRange.end.c === "J" && grid.selectionRange.end.r === 25, "End range phải là J25");
    assert(grid.selectedCoord.c === "J" && grid.selectedCoord.r === 20, "selectedCoord phải giữ nguyên J20 (anchor)");
  });

  await test("SheetGridController: Xóa vùng chọn bằng Delete/Backspace xóa toàn bộ ô trong vùng và giữ style", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 10, "ValA", false);
    grid.setCellValue("B", 10, "ValB", false);
    grid.selectedCoord = { c: "A", r: 10 };
    grid.setStyle("fontWeight", "bold", false);

    grid.selectionRange = { start: { c: "A", r: 10 }, end: { c: "B", r: 10 } };
    grid.selectedCoord = { c: "A", r: 10 };

    // Mô phỏng xóa vùng chọn
    const cells = grid.formulaEngine.expandRange(grid.getSelectedRangeLabel());
    cells.forEach(coord => {
      const [c, r] = grid._splitCoord(coord);
      grid.setCellValue(c, r, "");
    });

    assert(grid.cellsData.get("A10")?.val === "", "A10 phải rỗng");
    assert(grid.cellsData.get("B10")?.val === "", "B10 phải rỗng");
    assert(grid.cellsData.get("A10")?.style?.fontWeight === "bold", "Định dạng style của A10 phải còn nguyên");
  });

  await test("SheetGridController: _focusFormulaInputAtEnd đặt con trỏ ở cuối nội dung", () => {
    const container = mockContainer();
    const grid = new SheetGridController(container);
    let selectionStart = -1;
    let selectionEnd = -1;
    let focused = false;
    grid.formulaInput = {
      value: "ExistingValue",
      focus() { focused = true; },
      setSelectionRange(s, e) { selectionStart = s; selectionEnd = e; }
    };

    grid._focusFormulaInputAtEnd();
    assert(focused, "formulaInput phải được focus");
    assert(selectionStart === 13 && selectionEnd === 13, "Con trỏ phải đặt ở cuối (vị trí 13)");
  });

  await test("SheetAdapter: Clipboard cache fallback hoạt động khi navigator.clipboard bị chặn", async () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("C", 5, "SaoChepDuLieu", false);
    grid.selectedCoord = { c: "C", r: 5 };

    const adapter = new SheetAdapter(null);
    adapter.grid = grid;

    // Copy C5
    await adapter._copySelectedCell(false);
    assert(adapter._clipboardText === "SaoChepDuLieu", "Cache clipboard của adapter phải lưu 'SaoChepDuLieu'");

    // Paste sang D5
    grid.selectCell("D", 5, false);
    await adapter._pasteIntoSelectedCell();
    assert(grid.cellsData.get("D5")?.val === "SaoChepDuLieu", "D5 phải nhận đúng giá trị dán từ fallback cache");
  });

  return results;
}
