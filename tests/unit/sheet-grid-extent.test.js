/**
 * Unit & Behavioral Tests — Sheet Grid Extent (1,048,576 rows x 16,384 columns virtualization & navigation)
 */

import { SheetGridController } from "../../apps/sheet/sheet-grid.js";

function mockContainer() {
  const listeners = {};
  const el = {
    tagName: "DIV",
    style: {},
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; }
    },
    dataset: {},
    appendChild(child) { return child; },
    insertBefore(newNode, refNode) { return newNode; },
    removeChild(child) { return child; },
    querySelector(sel) {
      if (sel === ".vno-sheet-viewport") {
        return {
          scrollTop: 0,
          scrollLeft: 0,
          clientHeight: 600,
          clientWidth: 1000,
          addEventListener(evt, cb) { listeners[evt] = cb; },
          getBoundingClientRect() { return { top: 0, left: 0, width: 1000, height: 600 }; }
        };
      }
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener(evt, cb) { listeners[evt] = cb; },
    removeEventListener() {},
    focus() {},
    getBoundingClientRect() { return { top: 0, left: 0, width: 1000, height: 600 }; }
  };
  return el;
}

function ensureMockDocument() {
  if (typeof globalThis.document === "undefined") {
    globalThis.document = {
      createElement(tag) {
        return {
          tagName: tag.toUpperCase(),
          children: [],
          style: {},
          dataset: {},
          className: "",
          classList: {
            add(c) { this.className = `${this.className || ""} ${c}`.trim(); },
            remove(c) { this.className = (this.className || "").replace(c, "").trim(); },
            contains(c) { return (this.className || "").includes(c); },
            toggle(c, force) {
              const has = this.contains(c);
              const want = force !== undefined ? !!force : !has;
              if (want) this.add(c); else this.remove(c);
              return want;
            }
          },
          appendChild(c) { this.children.push(c); return c; },
          querySelector(sel) {
            const cls = typeof sel === "string" ? sel.replace(".", "") : "";
            return this.children.find(c => c.className && c.className.includes(cls)) || null;
          },
          querySelectorAll() { return []; },
          addEventListener() {},
          removeEventListener() {},
          setAttribute() {},
          getAttribute() { return null; }
        };
      }
    };
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runSheetGridExtentTests() {
  ensureMockDocument();
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.stack || err.message });
    }
  };

  await test("Grid bounds: 1,048,576 rows and 16,384 columns (A to XFD)", () => {
    const grid = new SheetGridController(mockContainer());
    assert(grid.rowCount === 1048576, `rowCount must be 1048576, got ${grid.rowCount}`);
    assert(grid.cols.length === 16384, `cols length must be 16384, got ${grid.cols.length}`);
    assert(grid.cols[0] === "A", `first col must be A, got ${grid.cols[0]}`);
    assert(grid.cols[grid.cols.length - 1] === "XFD", `last col must be XFD, got ${grid.cols[grid.cols.length - 1]}`);
    assert(grid._columnNumber("XFD") === 16384, `_columnNumber('XFD') must be 16384, got ${grid._columnNumber("XFD")}`);
    assert(grid._columnLabel(16384) === "XFD", `_columnLabel(16384) must be XFD, got ${grid._columnLabel(16384)}`);
    const [c, r] = grid._splitCoord("XFD1048576");
    assert(c === "XFD" && r === 1048576, `_splitCoord('XFD1048576') must be ['XFD', 1048576], got [${c}, ${r}]`);
  });

  await test("Viewport math: 2D virtual row and column calculations stay bounded", () => {
    const grid = new SheetGridController(mockContainer());
    // At top-left
    const firstR = grid._firstVisibleRow(0);
    const lastR = grid._lastVisibleRow(0, 500);
    assert(firstR === 1, `first row at 0 must be 1, got ${firstR}`);
    assert(lastR >= 20 && lastR <= 30, `last row for 500px must be ~25, got ${lastR}`);

    const firstC = grid._firstVisibleCol(0);
    const lastC = grid._lastVisibleCol(0, 800);
    assert(firstC === 1, `first col at 0 must be 1, got ${firstC}`);
    assert(lastC >= 10 && lastC <= 16, `last col for 800px must be ~13, got ${lastC}`);

    // At far row (1,000,000 * 20px = 20,000,000px)
    const farTop = (1000000 - 1) * 20;
    const farFirstR = grid._firstVisibleRow(farTop);
    const farLastR = grid._lastVisibleRow(farTop, 500);
    assert(farFirstR === 1000000, `far first row must be 1000000, got ${farFirstR}`);
    assert(farLastR >= 1000020 && farLastR <= 1000030, `far last row must be ~1000025, got ${farLastR}`);

    // Total table width covers 16,384 columns
    const totalW = grid._totalWidth();
    assert(totalW === 16384 * 64, `totalWidth must be 1048576px, got ${totalW}`);
    const totalH = grid._totalHeight();
    assert(totalH === 1048576 * 20, `totalHeight must be 20971520px, got ${totalH}`);
  });

  await test("Virtual DOM node count: bounded cell elements per row regardless of scroll position", () => {
    const grid = new SheetGridController(mockContainer());
    // Row tr creation with startColNum=100, endColNum=120
    const tr = grid._buildRowTr(500, 100, 120);
    // Number of children = frozenCols (0) + left spacer (1) + 21 visible cells + right spacer (1) + header (1) = 24
    assert(tr.children.length <= 25, `Row should have bounded cell count, got ${tr.children.length}`);
    const leftSpacer = tr.querySelector(".vno-grid-cell-spacer-left");
    const rightSpacer = tr.querySelector(".vno-grid-cell-spacer-right");
    assert(leftSpacer !== null, "Left spacer cell must exist for virtualization");
    assert(rightSpacer !== null, "Right spacer cell must exist for virtualization");
  });

  await test("Sparse data model: storing far cell does not allocate intermediate empty cells", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("XFD", 1048576, "FarEdge", false);
    assert(grid.cellsData.size === 1, `cellsData must have exactly 1 cell, got ${grid.cellsData.size}`);
    assert(grid.cellsData.has("XFD1048576"), "cellsData must contain XFD1048576");
    assert(grid.cellsData.get("XFD1048576").val === "FarEdge", "cell value must match");
    assert(!grid.cellsData.has("A2"), "A2 must not be allocated");
    assert(!grid.cellsData.has("B100"), "B100 must not be allocated");
  });

  await test("Sparse formula evaluation: large range =SUM(A1:A1048576) evaluates sparsely without freezing", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, 10, false);
    grid.setCellValue("A", 5, 20, false);
    grid.setCellValue("A", 1000000, 30, false);

    grid.formulaEngine.clearCache();
    const start = performance.now();
    const sumResult = grid.formulaEngine.evaluate("=SUM(A1:A1048576)");
    const elapsed = performance.now() - start;

    assert(sumResult === 60, `=SUM(A1:A1048576) must be 60, got ${sumResult}`);
    assert(elapsed < 50, `Sparse sum should evaluate in < 50ms, took ${elapsed.toFixed(1)}ms`);

    // Far single cell reference
    grid.setCellValue("XFD", 1048576, 500, false);
    const refResult = grid.formulaEngine.evaluate("=XFD1048576*2");
    assert(refResult === 1000, `=XFD1048576*2 must be 1000, got ${refResult}`);
  });

  await test("Name Box navigation: jumping to single cell, range, and whole column/row", () => {
    const grid = new SheetGridController(mockContainer());

    // Single cell jump
    assert(grid._jumpToNameBoxAddress("XFD1048576"), "jump to XFD1048576 must succeed");
    assert(grid.selectedCoord.c === "XFD" && grid.selectedCoord.r === 1048576, `selectedCoord must be XFD1048576, got ${grid.selectedCoord.c}${grid.selectedCoord.r}`);
    assert(grid.getSelectionNameLabel() === "XFD1048576", `Name Box label must be XFD1048576, got ${grid.getSelectionNameLabel()}`);

    // Range jump
    assert(grid._jumpToNameBoxAddress("B2:D10"), "jump to B2:D10 must succeed");
    assert(grid.selectionRange.start.c === "B" && grid.selectionRange.start.r === 2, "start must be B2");
    assert(grid.selectionRange.end.c === "D" && grid.selectionRange.end.r === 10, "end must be D10");

    // Case-insensitivity and dollar signs
    assert(grid._jumpToNameBoxAddress("=$a$1"), "jump to =$a$1 must succeed");
    assert(grid.selectedCoord.c === "A" && grid.selectedCoord.r === 1, "selectedCoord must be A1");

    // Column range jump
    assert(grid._jumpToNameBoxAddress("C:E"), "jump to C:E must succeed");
    assert(grid.selectionRange.start.c === "C" && grid.selectionRange.end.c === "E", "col range must span C:E");
    assert(grid.selectionRange.start.r === 1 && grid.selectionRange.end.r === 1048576, "col range must span all rows");

    // Row range jump
    assert(grid._jumpToNameBoxAddress("5:8"), "jump to 5:8 must succeed");
    assert(grid.selectionRange.start.r === 5 && grid.selectionRange.end.r === 8, "row range must span rows 5:8");
    assert(grid.selectionRange.start.c === "A" && grid.selectionRange.end.c === "XFD", "row range must span all cols");
  });

  await test("Keyboard jumps: fast Ctrl+Arrow navigation over empty and populated regions", () => {
    const grid = new SheetGridController(mockContainer());

    // Empty column: Ctrl+Down from A1 jumps to 1,048,576 instantly
    const t0 = performance.now();
    const targetRow = grid._findNextCtrlArrowRow("A", 1, 1);
    const elapsedDown = performance.now() - t0;
    assert(targetRow === 1048576, `Ctrl+Down in empty column must jump to 1048576, got ${targetRow}`);
    assert(elapsedDown < 10, `Ctrl+Down should execute in < 10ms, took ${elapsedDown.toFixed(2)}ms`);

    // Ctrl+Up from row 1,048,576 jumps back to row 1
    const targetUp = grid._findNextCtrlArrowRow("A", 1048576, -1);
    assert(targetUp === 1, `Ctrl+Up in empty column must jump to 1, got ${targetUp}`);

    // Data cluster: A1..A5 and A20..A25
    for (let r = 1; r <= 5; r++) grid.setCellValue("A", r, `Data${r}`, false);
    for (let r = 20; r <= 25; r++) grid.setCellValue("A", r, `Data${r}`, false);

    assert(grid._findNextCtrlArrowRow("A", 1, 1) === 5, "From A1, Ctrl+Down jumps to end of cluster A5");
    assert(grid._findNextCtrlArrowRow("A", 5, 1) === 20, "From A5, Ctrl+Down jumps across empty space to A20");
    assert(grid._findNextCtrlArrowRow("A", 20, 1) === 25, "From A20, Ctrl+Down jumps to end of cluster A25");
    assert(grid._findNextCtrlArrowRow("A", 25, 1) === 1048576, "From A25, Ctrl+Down jumps to bottom edge 1048576");

    // Empty row: Ctrl+Right from A jumps to XFD instantly
    const targetCol = grid._findNextCtrlArrowCol("A", 1, 1);
    assert(targetCol === "XFD", `Ctrl+Right in empty row must jump to XFD, got ${targetCol}`);
    const targetColLeft = grid._findNextCtrlArrowCol("XFD", 1, -1);
    assert(targetColLeft === "A", `Ctrl+Left from XFD must jump to A, got ${targetColLeft}`);
  });

  await test("Selection full extent: Ctrl+A, Ctrl+Space, Shift+Space", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "V1", false);
    grid.setCellValue("A", 2, "V2", false);
    grid.setCellValue("B", 1, "V3", false);
    grid.setCellValue("B", 2, "V4", false);
    grid.selectCell("A", 1);

    // First Ctrl+A: selects current region A1:B2
    grid.selectAll();
    assert(grid.selectionRange.start.c === "A" && grid.selectionRange.start.r === 1, "Ctrl+A region start A1");
    assert(grid.selectionRange.end.c === "B" && grid.selectionRange.end.r === 2, "Ctrl+A region end B2");

    // Second Ctrl+A: selects entire 1,048,576 x 16,384 sheet
    grid.selectAll();
    assert(grid.selectionRange.start.c === "A" && grid.selectionRange.start.r === 1, "Full sheet start A1");
    assert(grid.selectionRange.end.c === "XFD" && grid.selectionRange.end.r === 1048576, "Full sheet end XFD1048576");

    // Ctrl+Space: select entire column
    grid.selectCell("C", 10);
    grid.selectCurrentColumn();
    assert(grid.selectionRange.start.c === "C" && grid.selectionRange.end.c === "C", "Col selection column C");
    assert(grid.selectionRange.start.r === 1 && grid.selectionRange.end.r === 1048576, "Col selection all rows");

    // Shift+Space: select entire row
    grid.selectCell("D", 50);
    grid.selectCurrentRow();
    assert(grid.selectionRange.start.r === 50 && grid.selectionRange.end.r === 50, "Row selection row 50");
    assert(grid.selectionRange.start.c === "A" && grid.selectionRange.end.c === "XFD", "Row selection all columns");
  });

  return results;
}
