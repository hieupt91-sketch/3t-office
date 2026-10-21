import {
  ViewWindowCache,
  captureQuickViewState,
  mapFormatBlocks,
  quickViewColumnLabel,
  restoreQuickViewState,
  SheetQuickView,
  viewFormatToStyle
} from "../../apps/sheet/sheet-quick-view.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function equal(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export async function runSheetQuickViewTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("P8 quick view ánh xạ chỉ số cột sang nhãn Excel", () => {
    equal([0, 25, 26, 701, 16383].map(quickViewColumnLabel), ["A", "Z", "AA", "ZZ", "XFD"], "column labels");
  });

  await test("P8 quick view ánh xạ block định dạng UNO sang CSS", () => {
    const style = viewFormatToStyle({
      font: "Arial", size: 12.5, weight: 150, posture: "ITALIC", underline: 1,
      strike: 1, color: 0x123456, bg: 0xfef3c7, halign: "CENTER", valign: "BOTTOM", wrap: true
    });
    equal(style, {
      fontFamily: "Arial", fontSize: "12.5pt", fontWeight: "700", fontStyle: "italic",
      color: "#123456", backgroundColor: "#fef3c7", textAlign: "center",
      verticalAlign: "bottom", whiteSpace: "pre-wrap", textDecoration: "underline line-through"
    }, "format style");
  });

  await test("P8 quick view block định dạng phủ đúng vùng tương đối", () => {
    const mapped = mapFormatBlocks([
      { r0: 0, c0: 0, r1: 1, c1: 0, weight: 150 },
      { r0: 0, c0: 1, r1: 1, c1: 2, bg: 255 }
    ], 2, 3);
    assert(mapped[0][0].fontWeight === "700" && mapped[1][0].fontWeight === "700", "bold block must cover first column");
    assert(mapped[0][1].backgroundColor === "#0000ff" && mapped[1][2].backgroundColor === "#0000ff", "background block must cover rectangle");
  });

  await test("P8 quick view cache gộp hai yêu cầu cửa sổ đang chạy", async () => {
    const cache = new ViewWindowCache(3);
    let calls = 0;
    const loader = async () => { calls += 1; return { values: [["A1"]] }; };
    const [a, b] = await Promise.all([cache.getOrLoad("0:0:0", loader), cache.getOrLoad("0:0:0", loader)]);
    assert(calls === 1, `loader called ${calls} times`);
    assert(a === b && a.values[0][0] === "A1", "both callers must share the same window");
  });

  await test("P8 quick view cache giới hạn LRU, không giữ toàn workbook", () => {
    const cache = new ViewWindowCache(2);
    cache.set("a", 1); cache.set("b", 2); cache.get("a"); cache.set("c", 3);
    assert(cache.get("b") === undefined, "least-recent window must be evicted");
    assert(cache.get("a") === 1 && cache.get("c") === 3, "recent windows must remain");
  });

  await test("P8 quick view cache bỏ lỗi để cuộn có thể thử lại", async () => {
    const cache = new ViewWindowCache(2);
    let calls = 0;
    try { await cache.getOrLoad("x", async () => { calls += 1; throw new Error("UNO tạm bận"); }); } catch {}
    const value = await cache.getOrLoad("x", async () => { calls += 1; return 42; });
    assert(calls === 2 && value === 42, "failed request must not poison the cache");
  });

  await test("P1 quick view nhận kích thước sheet lười từ cửa sổ đầu tiên", () => {
    const view = new SheetQuickView();
    view.sheets = [{ name: "Chi tiết", rows: 1, cols: 1, dimensions_known: false }];
    assert(view._applyWindowDimensions({ sheet_rows: 1200, sheet_cols: 24 }), "first window supplies used dimensions");
    assert(view.sheets[0].rows === 1200 && view.sheets[0].cols === 24 && view.sheets[0].dimensions_known, "sheet can scroll using its discovered range");
  });

  await test("P1 local XLSX preview gắn UNO mà giữ sheet đang chọn", async () => {
    const calls = [];
    const view = new SheetQuickView({
      bridge: { sheetViewWindow: async (...args) => {
        calls.push(args);
        return { ok: true, values: [["UNO"]], formulas: [[""]], strings: [["UNO"]], formats: [], col_widths: [2646], row_heights: [529], col_hidden: [false], row_hidden: [false], sheet_rows: 20, sheet_cols: 10 };
      } },
      timers: { setTimeout, clearTimeout }
    });
    view.active = true;
    view.docId = "xlsx-preview-local";
    view.viewport = { scrollTop: 0, scrollLeft: 0 };
    view.sheets = [{ name: "Sheet1", rows: 42, cols: 3 }, { name: "Sheet2", rows: 1, cols: 1 }];
    view.activeSheet = 1;

    const attached = await view.attachEngine({
      doc_id: "uno-doc-1", sourcePath: "E:\\sample.xlsx", sheet: 0,
      sheets: [{ name: "Sheet1", rows: 42, cols: 3 }, { name: "Sheet2", rows: 1, cols: 1, dimensions_known: false }],
      r0: 0, c0: 0,
      window: { ok: true, values: [["FIRST"]], formulas: [[""]], strings: [["FIRST"]], formats: [], col_widths: [2646], row_heights: [529], col_hidden: [false], row_hidden: [false] }
    });

    assert(attached && view.docId === "uno-doc-1", "the UNO session replaces the preview session id");
    assert(view.activeSheet === 1 && view.sheets[view.activeSheet].name === "Sheet2", "the sheet selected during preview is retained by name");
    equal(calls[0], ["uno-doc-1", 1, 0, 0, 0, 0, true, true], "the newly selected sheet receives its first UNO query");
    assert(view.sheets[1].rows === 20 && view.sheets[1].cols === 10, "the attached sheet dimensions enable scrolling");
  });

  await test("P1 quick view lấy viewport từ XLSX trước UNO và chuyển sang UNO sau attach", async () => {
    const calls = [];
    const view = new SheetQuickView({
      bridge: {
        sheetXlsxPreviewWindow: async (...args) => { calls.push(["xlsx", ...args]); return { ok: true, values: [["LOCAL"]], sheet_rows: 1000, sheet_cols: 50 }; },
        sheetViewWindow: async (...args) => { calls.push(["uno", ...args]); return { ok: true, values: [["UNO"]] }; }
      },
      timers: { setTimeout, clearTimeout }
    });
    view.active = true;
    view.docId = "xlsx-preview-local";
    view.sourcePath = "E:\\sample.xlsx";
    view.sheets = [{ name: "Sheet1", rows: 1000, cols: 50 }];
    view.viewport = { scrollTop: 2000, scrollLeft: 2100 };
    await view._requestVisibleWindow();
    equal(calls[0], ["xlsx", "E:\\sample.xlsx", 0, 40, 20, 79, 39], "early scroll reads its local XLSX viewport");

    view.docId = "view1_123";
    view.cache.clear();
    await view._requestVisibleWindow();
    equal(calls[1], ["uno", "view1_123", 0, 40, 20, 79, 39, true, true], "the attached view switches to the UNO bridge");
  });

  await test("P1 click trong quick view không để grid nền chiếm focus bàn phím", () => {
    const cell = { dataset: { row: "41", col: "2" }, classList: { add() {} } };
    let stopped = false;
    const view = new SheetQuickView();
    view.active = true;
    view.sheets = [{ name: "Sheet1", rows: 100, cols: 10 }];
    view.root = {
      focus() {},
      querySelectorAll: () => []
    };
    view._handleClick({
      stopPropagation() { stopped = true; },
      target: { closest: selector => selector === ".vno-sheet-quick-cell" ? cell : null }
    });
    assert(stopped && view.selected.row === 41 && view.selected.col === 2, "quick view handles the click without bubbling to SheetGrid");
  });

  await test("P1 quick view giữ sửa ô và Ctrl+Z/Ctrl+Y trong journal", () => {
    const view = new SheetQuickView({ timers: { setTimeout, clearTimeout } });
    view.active = true;
    const cell = { dataset: { row: "1", col: "0", value: "before" }, style: {} };
    view.root = { querySelectorAll: () => [cell] };
    view.sheets = [{ name: "Sheet1", rows: 10, cols: 5 }];
    view.selected = { row: 1, col: 0 };
    view._queueValueEdit(1, 0, "TEST123");
    assert(view.valueOverrides.get("0:1:0") === "TEST123", "typed value must appear in the quick model");
    assert(view._undoPendingEdit() && view.valueOverrides.get("0:1:0") === "before", "undo restores the original value");
    assert(view._redoPendingEdit() && view.valueOverrides.get("0:1:0") === "TEST123", "redo restores the typed value");
  });

  await test("P1 delete and cell formatting remain undoable while hydration is pending", () => {
    const view = new SheetQuickView({ timers: { setTimeout, clearTimeout } });
    view.active = true;
    const cell = { dataset: { row: "1", col: "0", value: "existing" }, style: { fontWeight: "normal" } };
    view.root = { querySelectorAll: () => [cell] };
    view.sheets = [{ name: "Sheet1", rows: 10, cols: 5 }];
    view.selected = { row: 1, col: 0 };
    view._queueValueEdit(1, 0, "");
    assert(view.valueOverrides.get("0:1:0") === "", "delete is visible in the quick view");
    assert(view._undoPendingEdit() && view.valueOverrides.get("0:1:0") === "existing", "undo restores a deleted value");
    assert(view._redoPendingEdit() && view.valueOverrides.get("0:1:0") === "", "redo clears the value again");
    view._toggleQuickStyle("fontWeight", "bold", "normal");
    assert(view.styleOverrides.get("0:1:0")?.fontWeight === "bold", "format command changes the quick style");
    assert(view._undoPendingEdit() && view.styleOverrides.get("0:1:0")?.fontWeight === "normal", "undo restores the original style");
    assert(view._redoPendingEdit() && view.styleOverrides.get("0:1:0")?.fontWeight === "bold", "redo reapplies cell formatting");
  });

  await test("P1 paste is one undoable group and replays only applied edits into the full grid", () => {
    const view = new SheetQuickView({ timers: { setTimeout, clearTimeout } });
    view.active = true;
    view.root = { querySelectorAll: () => [] };
    view.sheets = [{ name: "Sheet1", rows: 10, cols: 5 }];
    view.selected = { row: 1, col: 0 };
    view._pasteText("a\tb\nc\td");
    assert(view.pendingHistory.length === 1 && view.pendingHistory[0].edits.length === 4, "a 2x2 paste is one history group");
    view._undoPendingEdit();
    const grid = {
      activeSheet: "Sheet1", cellsData: new Map(), undoStack: [], redoStack: [],
      setCellValue(col, row, value) { this.cellsData.set(`${col}${row}`, { val: value, formula: "", style: {} }); },
      _recordHistory(action) { this.undoStack.push(action); this.redoStack = []; },
      undo() {
        const action = this.undoStack.pop(); if (!action) return false;
        for (const [key, value] of Object.entries(action.before)) value ? this.cellsData.set(key, value) : this.cellsData.delete(key);
        this.redoStack.push(action); return true;
      },
      redo() {
        const action = this.redoStack.pop(); if (!action) return false;
        for (const [key, value] of Object.entries(action.after)) value ? this.cellsData.set(key, value) : this.cellsData.delete(key);
        this.undoStack.push(action); return true;
      },
      selectCell() {}, _renderVirtualRows() {}
    };
    assert(view.applyPendingEditsToGrid(grid), "journal must replay once after hydration");
    assert(!grid.cellsData.has("A1") && !grid.cellsData.has("B1"), "undone paste must restore absent cells as absent");
    assert(grid.undoStack.length === 0 && grid.redoStack.length === 1, "hydration keeps the undone paste available for redo");
    assert(grid.redo() && grid.cellsData.get("A1")?.val === "a" && grid.cellsData.get("B2")?.val === "d", "redo after hydration reapplies the full paste");
  });

  await test("P8 quick view chụp sheet, ô chọn và neo cuộn", () => {
    equal(captureQuickViewState({
      sheets: [{ name: "Tổng hợp" }, { name: "Chi tiết" }], activeSheet: 1,
      selected: { row: 20003, col: 4 }, anchorRow: 19998, anchorCol: 2
    }), {
      sheetName: "Chi tiết", sheetIndex: 1, selectedRow: 20003, selectedCol: 4,
      anchorRow: 19998, anchorCol: 2
    }, "captured state");
  });

  await test("P8 chuyển sang lưới thật giữ sheet, ô chọn và vị trí cuộn", () => {
    const calls = [];
    const grid = {
      sheets: ["Tổng hợp", "Chi tiết"], activeSheet: "Tổng hợp", rowHeight: 26, defaultColWidth: 100,
      viewport: { scrollTop: 0, scrollLeft: 0 },
      switchSheet(name, options) { calls.push(["sheet", name, options]); this.activeSheet = name; },
      selectCell(col, row) { calls.push(["cell", col, row]); },
      _rowTop(row) { return (row - 1) * 30; },
      _colLeft(col) { return (col - 1) * 90; },
      _onViewportScroll() { calls.push(["scroll"]); }
    };
    const restored = restoreQuickViewState(grid, {
      sheetName: "Chi tiết", sheetIndex: 1, selectedRow: 20003, selectedCol: 4,
      anchorRow: 19998, anchorCol: 2
    });
    assert(restored, "restore should succeed");
    equal(calls[0], ["sheet", "Chi tiết", { skipSave: true }], "sheet transition");
    equal(calls[1], ["cell", "E", 20003], "selected cell transition");
    assert(grid.viewport.scrollTop === 599910 && grid.viewport.scrollLeft === 180, "scroll anchor transition");
  });

  await test("P8 quick view failure retry reopens source once and keeps the preview readable", async () => {
    const { SheetQuickView } = await import("../../apps/sheet/sheet-quick-view.js");
    const makeElement = () => ({ attrs: {}, listeners: {}, children: [], classList: { add() {}, remove() {} }, setAttribute(n, v) { this.attrs[n] = v; }, addEventListener(n, fn) { this.listeners[n] = fn; }, appendChild(child) { this.children.push(child); }, remove() {} });
    const status = makeElement();
    let opens = 0, closes = 0, openedPath = null;
    const view = new SheetQuickView({
      documentRef: { createElement: makeElement },
      getSourceFilePath: () => "E:\\báo cáo.xlsx",
      reopenFile: async path => { opens += 1; openedPath = path; return { status: "ok" }; },
      grid: { container: { classList: { remove() {} } } },
      bridge: { sheetViewClose: async () => { closes += 1; } }
    });
    view.active = true; view.docId = "doc"; view.root = makeElement(); view.status = status;
    await view.failFullLoad();
    const retry = status.children[0];
    assert(retry?.textContent === "Thử lại" && retry.attrs["aria-label"], "failure exposes accessible retry");
    await retry.listeners.click();
    assert(opens === 1 && openedPath === "E:\\báo cáo.xlsx", "retry reopens the source once");
    assert(closes === 0 && view.active === true, "the readable preview stays until the user closes the window");
    assert(/Đã mở bản gốc/.test(status.textContent) && /chép lại/.test(status.textContent), `success message expected: ${status.textContent}`);
  });

  await test("P8 quick view retry: a Python error result is shown again with the button, never treated as success", async () => {
    const { SheetQuickView } = await import("../../apps/sheet/sheet-quick-view.js");
    const makeElement = () => ({ attrs: {}, listeners: {}, children: [], classList: { add() {}, remove() {} }, setAttribute(n, v) { this.attrs[n] = v; }, addEventListener(n, fn) { this.listeners[n] = fn; }, appendChild(child) { this.children.push(child); }, remove() {} });
    const status = makeElement();
    let opens = 0;
    const view = new SheetQuickView({
      documentRef: { createElement: makeElement },
      getSourceFilePath: () => "E:\\x.xlsx",
      reopenFile: async () => { opens += 1; return { status: "error", message: "Tệp đang bị khóa" }; },
      grid: { container: { classList: { remove() {} } } },
      bridge: { sheetViewClose: async () => {} }
    });
    view.active = true; view.docId = "doc"; view.root = makeElement(); view.status = status;
    await view.failFullLoad();
    const retry = status.children[0];
    const first = await retry.listeners.click();
    assert(opens === 1 && /Tệp đang bị khóa/.test(status.textContent), `error text expected: ${status.textContent}`);
    assert(retry.disabled === false && status.children.includes(retry), "button is available again for another attempt");
    assert(first === undefined || first === false, "not reported as success");
    view._retrying = false;
    await view.retryFullLoad();
    assert(opens === 2, "a second attempt is possible after a failure");
  });

  await test("P8 quick view without a reopen callback keeps the preview readable and shows no button", async () => {
    const { SheetQuickView } = await import("../../apps/sheet/sheet-quick-view.js");
    const makeElement = () => ({ attrs: {}, children: [], classList: { add() {}, remove() {} }, setAttribute() {}, addEventListener() {}, appendChild(child) { this.children.push(child); }, remove() {} });
    const status = makeElement();
    const view = new SheetQuickView({ documentRef: { createElement: makeElement }, grid: { container: { classList: { remove() {} } } }, bridge: {} });
    view.active = true; view.docId = "doc"; view.root = makeElement(); view.status = status;
    await view.failFullLoad();
    assert(status.children.length === 0 && /chép lại nội dung sửa/.test(status.textContent), "no button, preserve temporary edits before reopening");
  });

  await test("P8 quick view reports 100 percent after full model load", () => {
    let shellStatus = "";
    const view = new SheetQuickView({ shell: { setStatus: text => { shellStatus = text; } } });
    view.active = true;
    view.root = {};
    view.status = { textContent: "" };
    view.updateProgress("Đã nạp đầy đủ", 100);
    assert(view.status.textContent === "Đã nạp đầy đủ 100%", `quick-view status: ${view.status.textContent}`);
    assert(shellStatus === "Đã nạp đầy đủ 100%", `application status: ${shellStatus}`);
  });

  return results;
}

