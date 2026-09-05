import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SHEET_COMMANDS } from "../../platform/commands/command-definitions.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

function container() {
  const classes = new Set();
  const dataset = {};
  return {
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    dataset,
    classList: {
      add(...names) { names.forEach(name => classes.add(name)); },
      remove(...names) { names.forEach(name => classes.delete(name)); },
      toggle(name, force) {
        if (force === true) classes.add(name);
        else if (force === false) classes.delete(name);
        else if (classes.has(name)) classes.delete(name);
        else classes.add(name);
      },
      contains(name) { return classes.has(name); }
    }
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function flattenRibbon(items) {
  return items.flatMap(item => item.items ? flattenRibbon(item.items) : [item]);
}

const SOURCE_STYLE = {
  backgroundColor: "#FFF200",
  border: "2px solid #0f172a",
  fontWeight: "bold",
  textAlign: "right",
  numberFormat: { category: "currency", currencySymbol: "₫", decimals: 0, useThousands: true, negativeStyle: 0 }
};

export async function runSheetFormatPainterTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  test("Ribbon Home / Bảng nhớ tạm có sheet.edit.formatPainter cạnh Dán đặc biệt", () => {
    const clipboard = SHEET_RIBBON_TABS[0].groups.find(group => group.id === "clipboard");
    const ids = flattenRibbon(clipboard.items).map(item => item.commandId);
    assert(ids.includes("common.edit.paste"), "Thiếu Dán");
    assert(ids.includes("sheet.edit.pasteSpecial"), "Thiếu Dán đặc biệt");
    assert(ids.includes("sheet.edit.formatPainter"), "Thiếu Format Painter");
    assert(ids.indexOf("sheet.edit.formatPainter") > ids.indexOf("sheet.edit.pasteSpecial") - 3, "Format Painter phải nằm nhóm clipboard");
  });

  test("Command sheet.edit.formatPainter được khai báo, có icon cọ vẽ, map UNO Calc", () => {
    const cmd = SHEET_COMMANDS.find(item => item.id === "sheet.edit.formatPainter");
    assert(cmd, "Thiếu command sheet.edit.formatPainter");
    assert(cmd.icon === "formatPainter", "Phải dùng icon formatPainter");
    assert(cmd.isToggle === true, "Phải là lệnh toggle để nút hiện trạng thái đang bật");
    assert(!cmd.shortcut, "Không được trùng Ctrl+Shift+C của Writer Format Painter");
    assert(VN_TO_UNO_MAP["sheet.edit.formatPainter"] === ".uno:FormatPaintbrush", "Phải map .uno:FormatPaintbrush của Calc");
  });

  test("Format Painter: click ô đích nhận đủ style nguồn, giá trị/công thức đích không đổi", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 1500);
    grid.cellsData.get("A1").style = structuredClone(SOURCE_STYLE);
    grid.setCellValue("B", 1, 99);
    grid.cellsData.get("B1").formula = "=50+49";
    grid.cellsData.get("B1").style = { color: "#111111", backgroundColor: "#ffffff" };
    grid.selectCell("A", 1);
    assert(grid.toggleFormatPainter() === true, "Bật Format Painter phải thành công");
    assert(grid.formatPainter?.sourceCoord === "A1", "Nguồn phải là ô đang chọn");
    assert(grid.container.classList.contains("vno-format-painter-active"), "Phải gắn class con trỏ cọ vẽ");
    grid.selectCell("B", 1);
    assert(grid.applyFormatPainterToSelection() === true, "Áp dụng lên ô đích phải thành công");
    const dest = grid.cellsData.get("B1");
    assert(dest.val === 99, "Giá trị đích không được đổi");
    assert(dest.formula === "=50+49", "Công thức đích không được đổi");
    assert(dest.style.backgroundColor === "#FFF200", "Phải copy màu nền");
    assert(dest.style.border === "2px solid #0f172a", "Phải copy viền");
    assert(dest.style.numberFormat.category === "currency", "Phải copy numberFormat");
    assert(dest.style.textAlign === "right", "Phải copy textAlign");
    assert(dest.style.fontWeight === "bold", "Phải copy font");
    assert(!grid.formatPainter, "Chế độ một lần phải tự tắt sau khi áp dụng");
    assert(!grid.container.classList.contains("vno-format-painter-active"), "Con trỏ phải trở về bình thường");
  });

  test("Format Painter: kéo chọn vùng đích áp dụng cùng style cho mọi ô, không đụng data", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 10);
    grid.cellsData.get("A1").style = structuredClone(SOURCE_STYLE);
    grid.setCellValue("C", 2, "x");
    grid.setCellValue("D", 3, "y");
    grid.selectCell("A", 1);
    grid.startFormatPainter();
    grid.selectionRange = { start: { c: "C", r: 2 }, end: { c: "D", r: 3 } };
    grid.applyFormatPainterToSelection();
    for (const coord of ["C2", "D2", "C3", "D3"]) {
      const item = grid.cellsData.get(coord);
      assert(item.style.backgroundColor === "#FFF200", `${coord} phải nhận màu nền nguồn`);
      assert(item.style.numberFormat.category === "currency", `${coord} phải nhận numberFormat`);
    }
    assert(grid.cellsData.get("C2").val === "x", "C2 giữ nguyên giá trị");
    assert(grid.cellsData.get("D3").val === "y", "D3 giữ nguyên giá trị");
    assert((grid.cellsData.get("D2")?.val || "") === "", "Ô trống vẫn trống sau khi chỉ copy style");
  });

  test("Format Painter: double-click khóa chế độ, áp dụng được nhiều lần đến khi Esc", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 1);
    grid.cellsData.get("A1").style = structuredClone(SOURCE_STYLE);
    grid.setCellValue("B", 1, "một");
    grid.setCellValue("C", 1, "hai");
    grid.selectCell("A", 1);
    grid.toggleFormatPainter({ locked: true });
    assert(grid.formatPainter.locked === true, "Phải vào chế độ khóa");
    assert(grid.container.dataset.formatPainter === "locked", "dataset phải ghi locked");
    grid.selectCell("B", 1);
    grid.applyFormatPainterToSelection();
    assert(grid.formatPainter?.locked === true, "Khóa phải giữ sau lần áp dụng đầu");
    assert(grid.cellsData.get("B1").style.backgroundColor === "#FFF200", "B1 phải nhận style");
    assert(grid.cellsData.get("B1").val === "một", "B1 giữ giá trị");
    grid.selectCell("C", 1);
    grid.applyFormatPainterToSelection();
    assert(grid.cellsData.get("C1").style.border === "2px solid #0f172a", "C1 phải nhận style lần 2");
    assert(grid.cellsData.get("C1").val === "hai", "C1 giữ giá trị");
    assert(grid.formatPainter, "Chế độ khóa vẫn bật trước Esc");
    grid.cancelFormatPainter();
    assert(!grid.formatPainter, "Esc/hủy phải tắt chế độ");
    assert(!grid.container.classList.contains("vno-format-painter-active"), "Class cọ vẽ phải gỡ");
  });

  test("Format Painter: Esc hủy khi chưa áp dụng; bấm lại nút cũng tắt", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 5);
    grid.cellsData.get("A1").style = { backgroundColor: "#00ff00" };
    grid.selectCell("A", 1);
    grid.toggleFormatPainter();
    assert(grid.formatPainter, "Phải đang bật");
    const keydown = grid.container.addEventListener;
    assert(typeof keydown === "function", "container mock phải có addEventListener");
    grid.cancelFormatPainter();
    assert(!grid.formatPainter, "cancelFormatPainter phải tắt");
    grid.toggleFormatPainter();
    grid._formatPainterActivatedAt = Date.now() - 500;
    assert(grid.toggleFormatPainter() === false, "Bấm lại nút sau khi đã bật phải tắt");
    assert(!grid.formatPainter, "Bấm lại nút phải hủy chế độ");
  });

  test("Format Painter: mỗi lần áp dụng là một bước Undo/Redo atomic, khôi phục đúng style cũ", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 100);
    grid.cellsData.get("A1").style = structuredClone(SOURCE_STYLE);
    grid.setCellValue("B", 1, 77);
    grid.cellsData.get("B1").style = { backgroundColor: "#abcdef", color: "#111111" };
    grid.selectCell("A", 1);
    grid.startFormatPainter();
    grid.selectCell("B", 1);
    grid.undoStack = [];
    grid.applyFormatPainterToSelection();
    assert(grid.undoStack.length === 1, "Một lần áp dụng phải đúng một bước history");
    assert(grid.undoStack[0].type === "batch-cells", "Phải dùng batch-cells atomic");
    assert(grid.cellsData.get("B1").style.backgroundColor === "#FFF200", "Style mới phải được áp");
    grid.undo();
    assert(grid.cellsData.get("B1").val === 77, "Undo không được đụng giá trị");
    assert(grid.cellsData.get("B1").style.backgroundColor === "#abcdef", "Undo phải trả màu nền cũ");
    assert(grid.cellsData.get("B1").style.color === "#111111", "Undo phải trả color cũ");
    assert(!grid.cellsData.get("B1").style.numberFormat, "Undo phải gỡ numberFormat đã sơn");
    grid.redo();
    assert(grid.cellsData.get("B1").style.backgroundColor === "#FFF200", "Redo phải sơn lại style nguồn");
    assert(grid.cellsData.get("B1").val === 77, "Redo không được đụng giá trị");
  });

  await (async () => {
    const name = "SheetAdapter handleDispatch sheet.edit.formatPainter gọi grid.toggleFormatPainter";
    try {
      const calls = [];
      const adapter = new SheetAdapter({
        toggleFormatPainter(args) { calls.push(args || {}); return true; }
      });
      const ok = await adapter.handleDispatch(".uno:FormatPaintbrush", { locked: true }, "sheet.edit.formatPainter");
      assert(ok === true, "Dispatch phải thành công");
      assert(calls[0]?.locked === true, "Phải chuyển args.locked");
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  })();

  return results;
}
