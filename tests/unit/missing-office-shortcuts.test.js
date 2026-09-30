/**
 * VN Office — Unit & Behavioral Tests: Missing Office Shortcuts
 * Kiểm thử toàn diện các phím tắt Office bổ sung:
 * 1. VN Writer: Ctrl+] (Tăng cỡ chữ 1 điểm), Ctrl+[ (Giảm cỡ chữ 1 điểm) & Hoàn tác Ctrl+Z
 * 2. VN Sheet: Shift+F11 (Chèn trang tính mới trước trang hiện tại) & Hoàn tác Ctrl+Z
 * 3. VN Sheet: Ctrl+Shift++ (Chèn ô/hàng/cột — hộp thoại khi chọn ô, chèn ngay khi chọn cả hàng/cột) & Hoàn tác Ctrl+Z
 * 4. VN Sheet: Ctrl+- (Xóa ô/hàng/cột — hộp thoại khi chọn ô, xóa ngay khi chọn cả hàng/cột) & Hoàn tác Ctrl+Z
 * 5. VN Sheet: F11 (Chèn biểu đồ chuẩn Excel trong vùng lưới) & Phím tắt container
 * Tuân thủ AGENTS.md mục 8 (Test truthfulness) & mục 2.
 */

import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { CommandBus, globalCommandBus } from "../../platform/commands/command-bus.js";
import { registerAllStandardCommands } from "../../platform/commands/command-definitions.js";

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

function createMockContainer() {
  const listeners = {};
  return {
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(type, handler) {
      (listeners[type] ||= []).push(handler);
    },
    removeEventListener(type, handler) {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter(h => h !== handler);
      }
    },
    dispatchEvent(event) {
      const handlers = listeners[event.type] || [];
      for (const h of handlers) h(event);
      return !event.defaultPrevented;
    },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(child) { return child; },
    _listeners: listeners,
  };
}

function createMockWriterDom(initialHtml = '<p><font style="font-size: 12pt;">Văn bản kiểm thử</font></p>') {
  let currentHtml = initialHtml;
  const fontEls = [];

  const bodyEl = {
    get innerHTML() { return currentHtml; },
    set innerHTML(val) { currentHtml = val; },
    innerText: "Văn bản kiểm thử",
    textContent: "Văn bản kiểm thử",
    tagName: "DIV",
    focus() {},
    contains() { return true; },
    addEventListener() {},
    removeEventListener() {},
    getElementsByTagName(tag) {
      if (tag.toLowerCase() === "font") {
        return fontEls;
      }
      return [];
    },
    querySelectorAll() { return []; },
    querySelector() { return null; },
  };

  const editorDom = {
    get innerHTML() { return currentHtml; },
    set innerHTML(val) { currentHtml = val; },
    tagName: "DIV",
    focus() {},
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    querySelector(sel) {
      if (sel === ".vno-writer-body") return bodyEl;
      return null;
    },
    querySelectorAll() { return []; },
    getElementsByTagName(tag) {
      if (tag.toLowerCase() === "font") {
        return fontEls;
      }
      return [];
    },
    addEventListener() {},
    removeEventListener() {},
  };

  return { editorDom, bodyEl, fontEls };
}

export async function runMissingOfficeShortcutsTests() {
  const results = [];

  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message || String(err) });
    }
  };

  // =========================================================================
  // PHẦN 1: VN WRITER — Ctrl+] & Ctrl+[ (Tăng / Giảm cỡ chữ 1 pt) & Ctrl+Z Undo
  // =========================================================================

  await test("Writer Ctrl+]: _adjustFontSizePt(+1) tăng đúng 1 pt và hoàn tác Ctrl+Z", () => {
    const { editorDom, bodyEl, fontEls } = createMockWriterDom();
    const adapter = new WriterAdapter(editorDom);
    adapter.attach();

    let fontPt = "12pt";
    const mockFont = {
      size: "7",
      style: {
        get fontSize() { return fontPt; },
        set fontSize(v) {
          fontPt = v;
          bodyEl.innerHTML = `<p><font style="font-size: ${v};">Văn bản kiểm thử</font></p>`;
          editorDom.innerHTML = bodyEl.innerHTML;
        }
      },
      removeAttribute(attr) { if (attr === "size") this.size = null; },
    };
    fontEls.push(mockFont);

    const prevWindow = globalThis.window;
    const prevDoc = globalThis.document;
    try {
      globalThis.window = {
        getSelection: () => ({
          rangeCount: 1,
          anchorNode: {
            nodeType: 3,
            parentNode: { style: { fontSize: "12pt" } },
          },
        }),
        getComputedStyle: () => ({ fontSize: "16px" }), // 16px * 0.75 = 12pt
      };
      globalThis.document = {
        execCommand: () => true,
        querySelectorAll: () => [],
      };

      // Tăng 1 pt: 12pt -> 13pt
      adapter._adjustFontSizePt(1);

      assert(mockFont.style.fontSize === "13pt", `Cỡ chữ phải là 13pt nhưng nhận: ${mockFont.style.fontSize}`);
      assert(adapter.canUndo(), "Phải có thể hoàn tác sau khi tăng cỡ chữ");

      // Hoàn tác
      adapter.undo();
      assert(adapter.canRedo(), "Phải có thể làm lại sau khi hoàn tác");

      // Làm lại
      adapter.redo();
      assert(adapter.canUndo(), "Phải có thể hoàn tác sau khi làm lại");
    } finally {
      globalThis.window = prevWindow;
      globalThis.document = prevDoc;
    }
  });

  await test("Writer Ctrl+[: _adjustFontSizePt(-1) giảm đúng 1 pt và kẹp tối thiểu 1 pt", () => {
    const { editorDom, bodyEl, fontEls } = createMockWriterDom('<p><font style="font-size: 14pt;">Văn bản kiểm thử</font></p>');
    const adapter = new WriterAdapter(editorDom);
    adapter.attach();

    let fontPt = "14pt";
    const mockFont = {
      size: "7",
      style: {
        get fontSize() { return fontPt; },
        set fontSize(v) {
          fontPt = v;
          bodyEl.innerHTML = `<p><font style="font-size: ${v};">Văn bản kiểm thử</font></p>`;
          editorDom.innerHTML = bodyEl.innerHTML;
        }
      },
      removeAttribute(attr) { if (attr === "size") this.size = null; },
    };
    fontEls.push(mockFont);

    const prevWindow = globalThis.window;
    const prevDoc = globalThis.document;
    try {
      globalThis.window = {
        getSelection: () => ({
          rangeCount: 1,
          anchorNode: {
            nodeType: 3,
            parentNode: { style: { fontSize: "14pt" } },
          },
        }),
        getComputedStyle: () => ({ fontSize: "18.666px" }), // ~14pt
      };
      globalThis.document = {
        execCommand: () => true,
        querySelectorAll: () => [],
      };

      // Giảm 1 pt từ 14pt -> 13pt
      adapter._adjustFontSizePt(-1);
      assert(mockFont.style.fontSize === "13pt", `Cỡ chữ phải giảm về 13pt nhưng nhận: ${mockFont.style.fontSize}`);

      // Kiểm tra kẹp tối thiểu 1 pt khi ở 1 pt
      mockFont.size = "7";
      globalThis.window.getComputedStyle = () => ({ fontSize: "1.333px" }); // 1pt
      adapter._adjustFontSizePt(-1);
      assert(mockFont.style.fontSize === "1pt", `Cỡ chữ tối thiểu không được dưới 1pt: ${mockFont.style.fontSize}`);
    } finally {
      globalThis.window = prevWindow;
      globalThis.document = prevDoc;
    }
  });

  await test("Writer: handleDispatch thực thi writer.font.grow1pt và writer.font.shrink1pt", async () => {
    const { editorDom } = createMockWriterDom();
    const adapter = new WriterAdapter(editorDom);
    adapter.attach();

    let adjustedDelta = 0;
    adapter._adjustFontSizePt = (delta) => { adjustedDelta = delta; };

    const resGrow = await adapter.handleDispatch("writer.font.grow1pt");
    assert(resGrow === true, "handleDispatch writer.font.grow1pt phải trả về true");
    assert(adjustedDelta === 1, "writer.font.grow1pt phải gọi delta = 1");

    const resShrink = await adapter.handleDispatch("writer.font.shrink1pt");
    assert(resShrink === true, "handleDispatch writer.font.shrink1pt phải trả về true");
    assert(adjustedDelta === -1, "writer.font.shrink1pt phải gọi delta = -1");
  });

  // =========================================================================
  // PHẦN 2: VN SHEET — Shift+F11 (Chèn trang tính mới trước trang hiện tại)
  // =========================================================================

  await test("Sheet Shift+F11: addSheetBefore chèn trang tính mới TRƯỚC trang hiện tại và có Ctrl+Z hoàn tác", () => {
    const container = createMockContainer();
    const grid = new SheetGridController(container);

    // Khởi tạo 3 sheets: Sheet1, Sheet2, Sheet3
    grid.sheets = ["Sheet1", "Sheet2", "Sheet3"];
    grid.activeSheet = "Sheet2";
    grid.sheetsData = {
      Sheet1: new Map(),
      Sheet2: new Map(),
      Sheet3: new Map(),
    };
    grid.undoStack = [];
    grid.redoStack = [];

    // Chèn sheet mới trước "Sheet2"
    const newSheetName = grid.addSheetBefore("Sheet2", "NewSheetBefore", true);
    assert(newSheetName === "NewSheetBefore", "Tên sheet mới phải đúng");
    assert(grid.sheets.length === 4, `Số sheets phải là 4, nhận: ${grid.sheets.length}`);
    assert(grid.sheets[1] === "NewSheetBefore", `NewSheetBefore phải nằm ở vị trí index 1 (trước Sheet2), danh sách: ${grid.sheets.join(", ")}`);
    assert(grid.sheets[2] === "Sheet2", `Sheet2 phải bị đẩy sang index 2, danh sách: ${grid.sheets.join(", ")}`);
    assert(grid.activeSheet === "NewSheetBefore", "Active sheet phải là trang tính mới vừa chèn");

    // Hoàn tác Ctrl+Z
    assert(grid.canUndo(), "Phải có thể hoàn tác chèn sheet");
    grid.undo();
    assert(grid.sheets.length === 3, `Sau undo số sheets phải về 3, nhận: ${grid.sheets.length}`);
    assert(!grid.sheets.includes("NewSheetBefore"), "NewSheetBefore phải bị xóa sau undo");
    assert(grid.activeSheet === "Sheet2", `Active sheet sau undo phải khôi phục về Sheet2, nhận: ${grid.activeSheet}`);

    // Làm lại Ctrl+Y
    assert(grid.canRedo(), "Phải có thể làm lại sau undo");
    grid.redo();
    assert(grid.sheets.length === 4, `Sau redo số sheets phải là 4, nhận: ${grid.sheets.length}`);
    assert(grid.sheets[1] === "NewSheetBefore", "Sau redo NewSheetBefore phải được phục hồi đúng vị trí index 1 trước Sheet2");
  });

  await test("Sheet: SheetAdapter đăng ký và dispatch lệnh sheet.sheet.insertBefore", async () => {
    const container = createMockContainer();
    const grid = new SheetGridController(container);
    grid.sheets = ["Sheet1", "Sheet2"];
    grid.activeSheet = "Sheet2";

    let calledBefore = false;
    grid.addSheetBefore = (target) => {
      calledBefore = (target === undefined || target === "Sheet2");
      return "Sheet3";
    };

    const adapter = new SheetAdapter(grid);
    adapter.attach();

    const handled = await adapter.handleDispatch("sheet.sheet.insertBefore");
    assert(handled === true, "handleDispatch sheet.sheet.insertBefore phải trả về true");
    assert(calledBefore === true, "phải gọi grid.addSheetBefore");
  });

  // =========================================================================
  // PHẦN 3: VN SHEET — Ctrl+Shift++ & Ctrl+- trên Hàng và Cột (Chèn / Xóa ngay)
  // =========================================================================

  await test("Sheet Ctrl+Shift++ khi chọn cả hàng: chèn ngay hàng mới không cần hộp thoại & hoàn tác Ctrl+Z", () => {
    const container = createMockContainer();
    const grid = new SheetGridController(container);

    for (let r = 1; r <= 5; r++) {
      grid.setCellValue("A", r, `A${r}-val`, false);
      grid.setCellValue("B", r, `B${r}-val`, false);
    }
    grid.undoStack = [];
    grid.redoStack = [];

    // Chọn toàn bộ hàng 3 (từ A đến cột cuối)
    const lastCol = grid.cols[grid.cols.length - 1];
    grid.selectionRange = { start: { c: "A", r: 3 }, end: { c: lastCol, r: 3 } };
    assert(grid.isEntireRowSelected(), "isEntireRowSelected() phải trả về true");

    // Thực hiện phím tắt
    const res = grid.handleInsertShortcut();
    assert(res === true, "handleInsertShortcut phải trả về true");

    // Hàng 3 mới phải trống, giá trị cũ ở A3 dời xuống A4
    assert(!grid.cellsData.has("A3"), "A3 mới phải trống");
    assert(grid.cellsData.get("A4")?.val === "A3-val", "A3 cũ phải dời xuống A4");

    // Hoàn tác Ctrl+Z
    assert(grid.canUndo(), "Phải có thể hoàn tác chèn hàng");
    grid.undo();
    assert(grid.cellsData.get("A3")?.val === "A3-val", "Sau undo A3 phải khôi phục giá trị ban đầu");
  });

  await test("Sheet Ctrl+Shift++ khi chọn cả cột: chèn ngay cột mới không cần hộp thoại & hoàn tác Ctrl+Z", () => {
    const container = createMockContainer();
    const grid = new SheetGridController(container);

    for (let r = 1; r <= 5; r++) {
      grid.setCellValue("B", r, `B${r}-val`, false);
      grid.setCellValue("C", r, `C${r}-val`, false);
    }
    grid.undoStack = [];
    grid.redoStack = [];

    // Chọn toàn bộ cột B (từ hàng 1 đến hàng cuối)
    grid.selectionRange = { start: { c: "B", r: 1 }, end: { c: "B", r: grid.rowCount } };
    assert(grid.isEntireColumnSelected(), "isEntireColumnSelected() phải trả về true");

    // Thực hiện phím tắt
    const res = grid.handleInsertShortcut();
    assert(res === true, "handleInsertShortcut phải trả về true");

    // Cột B mới phải trống, giá trị cũ ở B1 dời sang C1
    assert(!grid.cellsData.has("B1"), "B1 mới phải trống");
    assert(grid.cellsData.get("C1")?.val === "B1-val", "B1 cũ phải dời sang C1");

    // Hoàn tác Ctrl+Z
    assert(grid.canUndo(), "Phải có thể hoàn tác chèn cột");
    grid.undo();
    assert(grid.cellsData.get("B1")?.val === "B1-val", "Sau undo B1 phải khôi phục giá trị ban đầu");
  });

  await test("Sheet Ctrl+- khi chọn cả hàng: xóa ngay hàng đã chọn & hoàn tác Ctrl+Z", () => {
    const container = createMockContainer();
    const grid = new SheetGridController(container);

    for (let r = 1; r <= 5; r++) {
      grid.setCellValue("A", r, `A${r}-val`, false);
    }
    grid.undoStack = [];
    grid.redoStack = [];

    // Chọn toàn bộ hàng 3
    const lastCol = grid.cols[grid.cols.length - 1];
    grid.selectionRange = { start: { c: "A", r: 3 }, end: { c: lastCol, r: 3 } };
    assert(grid.isEntireRowSelected(), "isEntireRowSelected() phải trả về true");

    // Thực hiện phím tắt xóa
    const res = grid.handleDeleteShortcut();
    assert(res === true, "handleDeleteShortcut phải trả về true");

    // Hàng 3 bị xóa: A4 cũ dời lên A3
    assert(grid.cellsData.get("A3")?.val === "A4-val", "A4 cũ phải dời lên vị trí A3");

    // Hoàn tác Ctrl+Z
    grid.undo();
    assert(grid.cellsData.get("A3")?.val === "A3-val", "Sau undo A3 phải khôi phục giá trị cũ");
  });

  await test("Sheet Ctrl+- khi chọn cả cột: xóa ngay cột đã chọn & hoàn tác Ctrl+Z", () => {
    const container = createMockContainer();
    const grid = new SheetGridController(container);

    grid.setCellValue("A", 1, "A1-val", false);
    grid.setCellValue("B", 1, "B1-val", false);
    grid.setCellValue("C", 1, "C1-val", false);
    grid.undoStack = [];
    grid.redoStack = [];

    // Chọn toàn bộ cột B
    grid.selectionRange = { start: { c: "B", r: 1 }, end: { c: "B", r: grid.rowCount } };
    assert(grid.isEntireColumnSelected(), "isEntireColumnSelected() phải trả về true");

    // Thực hiện phím tắt xóa
    const res = grid.handleDeleteShortcut();
    assert(res === true, "handleDeleteShortcut phải trả về true");

    // Cột B bị xóa: C1 cũ dời sang B1
    assert(grid.cellsData.get("B1")?.val === "C1-val", "C1 cũ phải dời sang vị trí B1");

    // Hoàn tác Ctrl+Z
    grid.undo();
    assert(grid.cellsData.get("B1")?.val === "B1-val", "Sau undo B1 phải khôi phục giá trị ban đầu");
  });

  // =========================================================================
  // PHẦN 4: VN SHEET — Dịch ô (Shift Down/Right & Shift Up/Left) & Ctrl+Z Undo
  // =========================================================================

  await test("Sheet shiftCellsDown: dời các ô xuống dưới và hoàn tác Ctrl+Z", () => {
    const container = createMockContainer();
    const grid = new SheetGridController(container);

    grid.setCellValue("B", 2, "B2-val", false);
    grid.setCellValue("B", 3, "B3-val", false);
    grid.setCellValue("B", 4, "B4-val", false);
    grid.undoStack = [];
    grid.redoStack = [];

    // Dời vùng B2:B2 xuống 1 hàng
    const range = { start: { c: "B", r: 2 }, end: { c: "B", r: 2 } };
    grid.shiftCellsDown(range, true);

    assert(!grid.cellsData.has("B2"), "B2 phải trống sau khi dời xuống");
    assert(grid.cellsData.get("B3")?.val === "B2-val", "B2 cũ dời xuống B3");
    assert(grid.cellsData.get("B4")?.val === "B3-val", "B3 cũ dời xuống B4");
    assert(grid.cellsData.get("B5")?.val === "B4-val", "B4 cũ dời xuống B5");

    // Hoàn tác Ctrl+Z
    grid.undo();
    assert(grid.cellsData.get("B2")?.val === "B2-val", "B2 phải được phục hồi sau undo");
    assert(grid.cellsData.get("B3")?.val === "B3-val", "B3 phải được phục hồi sau undo");
    assert(grid.cellsData.get("B4")?.val === "B4-val", "B4 phải được phục hồi sau undo");
    assert(!grid.cellsData.has("B5"), "B5 phải trống sau undo");
  });

  await test("Sheet shiftCellsRight: dời các ô sang phải và hoàn tác Ctrl+Z", () => {
    const container = createMockContainer();
    const grid = new SheetGridController(container);

    grid.setCellValue("B", 2, "B2-val", false);
    grid.setCellValue("C", 2, "C2-val", false);
    grid.undoStack = [];
    grid.redoStack = [];

    // Dời ô B2 sang phải
    const range = { start: { c: "B", r: 2 }, end: { c: "B", r: 2 } };
    grid.shiftCellsRight(range, true);

    assert(!grid.cellsData.has("B2"), "B2 phải trống sau khi dời sang phải");
    assert(grid.cellsData.get("C2")?.val === "B2-val", "B2 cũ dời sang C2");
    assert(grid.cellsData.get("D2")?.val === "C2-val", "C2 cũ dời sang D2");

    // Hoàn tác Ctrl+Z
    grid.undo();
    assert(grid.cellsData.get("B2")?.val === "B2-val", "B2 phục hồi sau undo");
    assert(grid.cellsData.get("C2")?.val === "C2-val", "C2 phục hồi sau undo");
    assert(!grid.cellsData.has("D2"), "D2 phải trống sau undo");
  });

  await test("Sheet shiftCellsUp: dời các ô lên trên và hoàn tác Ctrl+Z", () => {
    const container = createMockContainer();
    const grid = new SheetGridController(container);

    grid.setCellValue("B", 2, "B2-val", false);
    grid.setCellValue("B", 3, "B3-val", false);
    grid.setCellValue("B", 4, "B4-val", false);
    grid.undoStack = [];
    grid.redoStack = [];

    // Xóa ô B2 bằng cách dời lên
    const range = { start: { c: "B", r: 2 }, end: { c: "B", r: 2 } };
    grid.shiftCellsUp(range, true);

    assert(grid.cellsData.get("B2")?.val === "B3-val", "B3 dời lên B2");
    assert(grid.cellsData.get("B3")?.val === "B4-val", "B4 dời lên B3");
    assert(!grid.cellsData.has("B4"), "B4 phải trống sau khi dời lên");

    // Hoàn tác Ctrl+Z
    grid.undo();
    assert(grid.cellsData.get("B2")?.val === "B2-val", "B2 phục hồi sau undo");
    assert(grid.cellsData.get("B3")?.val === "B3-val", "B3 phục hồi sau undo");
    assert(grid.cellsData.get("B4")?.val === "B4-val", "B4 phục hồi sau undo");
  });

  await test("Sheet shiftCellsLeft: dời các ô sang trái và hoàn tác Ctrl+Z", () => {
    const container = createMockContainer();
    const grid = new SheetGridController(container);

    grid.setCellValue("B", 2, "B2-val", false);
    grid.setCellValue("C", 2, "C2-val", false);
    grid.setCellValue("D", 2, "D2-val", false);
    grid.undoStack = [];
    grid.redoStack = [];

    // Xóa ô B2 bằng cách dời sang trái
    const range = { start: { c: "B", r: 2 }, end: { c: "B", r: 2 } };
    grid.shiftCellsLeft(range, true);

    assert(grid.cellsData.get("B2")?.val === "C2-val", "C2 dời sang B2");
    assert(grid.cellsData.get("C2")?.val === "D2-val", "D2 dời sang C2");
    assert(!grid.cellsData.has("D2"), "D2 phải trống sau khi dời trái");

    // Hoàn tác Ctrl+Z
    grid.undo();
    assert(grid.cellsData.get("B2")?.val === "B2-val", "B2 phục hồi sau undo");
    assert(grid.cellsData.get("C2")?.val === "C2-val", "C2 phục hồi sau undo");
    assert(grid.cellsData.get("D2")?.val === "D2-val", "D2 phục hồi sau undo");
  });

  // =========================================================================
  // PHẦN 5: VN SHEET — Phím tắt Container (Ctrl+Shift++, Ctrl+-, Shift+F11, F11)
  // =========================================================================

  await test("Sheet Container Keydown: Bắt phím Shift+F11 gọi addSheetBefore", () => {
    const container = createMockContainer();
    const grid = new SheetGridController(container);
    grid._bindGridKeyboardNavigation();
    grid.sheets = ["Sheet1", "Sheet2"];
    grid.activeSheet = "Sheet1";

    let addSheetCalled = false;
    grid.addSheetBefore = () => { addSheetCalled = true; };

    const event = {
      type: "keydown",
      key: "F11",
      shiftKey: true,
      ctrlKey: false,
      altKey: false,
      target: { tagName: "DIV" },
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() {},
    };

    container.dispatchEvent(event);
    assert(addSheetCalled === true, "Shift+F11 trên container phải gọi addSheetBefore");
    assert(event.defaultPrevented === true, "Shift+F11 phải preventDefault");
  });

  await test("Sheet Container Keydown: Bắt phím F11 gọi chèn biểu đồ sheet.chart.insert", () => {
    const container = createMockContainer();
    const grid = new SheetGridController(container);
    grid._bindGridKeyboardNavigation();

    let executedCommand = null;
    const prevHandler = globalCommandBus.handlers?.["sheet.chart.insert"];
    try {
      globalCommandBus.bindHandler("sheet.chart.insert", () => { executedCommand = "sheet.chart.insert"; });

      const event = {
        type: "keydown",
        key: "F11",
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
        target: { tagName: "DIV" },
        preventDefault() { this.defaultPrevented = true; },
        stopPropagation() {},
      };

      container.dispatchEvent(event);
      assert(executedCommand === "sheet.chart.insert", "F11 trên container phải thực thi sheet.chart.insert");
      assert(event.defaultPrevented === true, "F11 phải preventDefault");
    } finally {
      if (prevHandler) globalCommandBus.bindHandler("sheet.chart.insert", prevHandler);
    }
  });

  await test("Sheet Container Keydown: Bắt phím Ctrl+Shift++ gọi handleInsertShortcut", () => {
    const container = createMockContainer();
    const grid = new SheetGridController(container);
    grid._bindGridKeyboardNavigation();

    let insertShortcutCalled = false;
    grid.handleInsertShortcut = () => { insertShortcutCalled = true; };

    const event = {
      type: "keydown",
      key: "+",
      shiftKey: true,
      ctrlKey: true,
      altKey: false,
      target: { tagName: "DIV" },
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() {},
    };

    container.dispatchEvent(event);
    assert(insertShortcutCalled === true, "Ctrl+Shift++ trên container phải gọi handleInsertShortcut");
  });

  await test("Sheet Container Keydown: Bắt phím Ctrl+- gọi handleDeleteShortcut", () => {
    const container = createMockContainer();
    const grid = new SheetGridController(container);
    grid._bindGridKeyboardNavigation();

    let deleteShortcutCalled = false;
    grid.handleDeleteShortcut = () => { deleteShortcutCalled = true; };

    const event = {
      type: "keydown",
      key: "-",
      shiftKey: false,
      ctrlKey: true,
      altKey: false,
      target: { tagName: "DIV" },
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() {},
    };

    container.dispatchEvent(event);
    assert(deleteShortcutCalled === true, "Ctrl+- trên container phải gọi handleDeleteShortcut");
  });

  return results;
}
