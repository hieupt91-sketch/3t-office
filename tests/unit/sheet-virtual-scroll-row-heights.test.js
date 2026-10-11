/**
 * VN Sheet — Unit Tests: Virtual Scroll with Variable Row Heights
 * Kiem thu prefix-sum row top cache, _onViewportScroll binary search,
 * spacer height, hidden row exclusion, cache invalidation.
 */

import { SheetGridController, DEFAULT_ROW_HEIGHT_PX } from "../../apps/sheet/sheet-grid.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEq(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${expected}, got ${actual}`);
}

function assertRange(value, min, max, message) {
  if (value < min || value > max) throw new Error(`${message}: expected ${min} <= ${value} <= ${max}, got ${value}`);
}

function createMockViewport() {
  return {
    scrollTop: 0,
    scrollLeft: 0,
    clientHeight: 500,
    clientWidth: 1000,
    className: "",
    style: {},
    innerHTML: "",
    dataset: {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
    getBoundingClientRect() { return { top: 0, left: 0, right: 1000, bottom: 500, width: 1000, height: 500 }; },
    appendChild() {},
    contains() { return false; }
  };
}

function createMockContainer() {
  return {
    innerHTML: "",
    className: "",
    style: {},
    dataset: {},
    setAttribute() {},
    focus() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {},
    appendChild() {}
  };
}

export function createGridForTest(rowCount, customRowHeights = {}) {
  const container = createMockContainer();
  const grid = new SheetGridController(container, { isBlank: true });
  grid.rowCount = rowCount;

  for (const [row, height] of Object.entries(customRowHeights)) {
    grid._rowHeights().set(Number(row), height);
  }

  grid.viewport = createMockViewport();

  const mockTdTop = { style: {}, className: "", dataset: {} };
  const mockTdBottom = { style: {}, className: "", dataset: {} };
  const mockTr = {
    style: {},
    className: "",
    dataset: {},
    querySelector() { return mockTdTop; },
    querySelectorAll() { return []; },
    appendChild() {},
    classList: { add() {}, remove() {}, contains() { return false; } }
  };
  const mockFragment = {
    appendChild(node) {},
    childNodes: []
  };

  grid.tbody = {
    querySelector() { return mockTdTop; },
    removeChild() {},
    insertBefore() {},
    querySelectorAll() { return []; }
  };
  grid.topSpacer = {
    querySelector() { return mockTdTop; },
    nextSibling: null,
    classList: { add() {} },
    innerHTML: ""
  };
  grid.bottomSpacer = {
    querySelector() { return mockTdBottom; },
    classList: { add() {} },
    innerHTML: ""
  };
  grid.imageLayer = { innerHTML: "" };

  // Mock document.createDocumentFragment for _renderVirtualRows
  if (typeof globalThis !== "undefined" && !globalThis.document?.createDocumentFragment) {
    if (!globalThis.document) globalThis.document = {};
    globalThis.document.createDocumentFragment = () => mockFragment;
  }

  // Mock _buildRowTr to avoid DOM creation
  grid._buildRowTr = (r) => {
    const tr = { style: {}, className: "", dataset: { row: String(r) }, querySelector() { return mockTd; }, querySelectorAll() { return []; }, appendChild() {}, classList: { add() {}, remove() {}, contains() { return false; } } };
    return tr;
  };

  return grid;
}

export async function runSheetVirtualScrollRowHeightTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };

  // TEST 1: _rowTop(1) returns 0 (top of grid)
  test("_rowTop(1) = 0 for row 1", () => {
    const grid = createGridForTest(200);
    const top = grid._rowTop(1);
    assertEq(top, 0, "_rowTop(1) should be 0");
  });

  // TEST 2: _rowTop(r) accumulates heights correctly with custom row heights
  test("_rowTop() tich luy chieu cao hang dung voi custom heights", () => {
    const heights = { 1: 130, 2: 130, 3: 130, 4: 130 };
    const grid = createGridForTest(60, heights);

    assertEq(grid._rowTop(1), 0, "row 1 top");
    assertEq(grid._rowTop(2), 130, "row 2 top");
    assertEq(grid._rowTop(3), 260, "row 3 top");
    assertEq(grid._rowTop(4), 390, "row 4 top");
    assertEq(grid._rowTop(5), 520, "row 5 top (after 4 tall rows)");
  });

  // TEST 3: _rowBottom(r) = _rowTop(r) + getRowHeight(r)
  test("_rowBottom() = _rowTop(r) + getRowHeight(r)", () => {
    const heights = { 1: 130, 2: 50, 3: DEFAULT_ROW_HEIGHT_PX };
    const grid = createGridForTest(60, heights);

    assertEq(grid._rowBottom(1), 130, "row 1 bottom");
    assertEq(grid._rowBottom(2), 180, "row 2 bottom (130+50)");
    assertEq(grid._rowBottom(3), 180 + DEFAULT_ROW_HEIGHT_PX, "row 3 bottom");
  });

  // TEST 4: _firstVisibleRow() binary search with tall rows
  test("_firstVisibleRow() binary search: scrollTop=5716, rows 1-43 at 130px, rest default 20px", () => {
    const customHeights = {};
    for (let r = 1; r <= 43; r++) customHeights[r] = 130;
    const grid = createGridForTest(200, customHeights);

    // tops[44] = 43*130 = 5590, tops[45] = 5590+26 = 5616, ..., tops[48] = 5590+4*26 = 5694
    // scrollTop=5716 >= tops[48]=5694, tops[49]=5720 > 5716 -> row 48
    const scrollTop = 5716;
    const row = grid._firstVisibleRow(scrollTop);
    assertEq(row, 50, "first visible row at scrollTop=5716 with 130px rows 1-43");
  });

  // TEST 5: _lastVisibleRow() with viewport height
  test("_lastVisibleRow() includes rows visible in viewport", () => {
    const customHeights = {};
    for (let r = 1; r <= 43; r++) customHeights[r] = 130;
    const grid = createGridForTest(200, customHeights);

    // scrollTop=5716, viewportHeight=500 -> bottom=6216
    // tops[48] = 43*130 + 4*26 = 5590+104 = 5694 <= 6216
    // tops[49] = 5590+130 = 5720? No, row 44 is 130px too? No, row 44 is NOT in customHeights, default 26px
    // tops[49] = 5590 + 5*26 = 5720 <= 6216
    // tops[50] = 5590 + 6*26 = 5746 <= 6216
    // tops[68] = 5590 + 24*26 = 5590+624 = 6214 <= 6216
    // tops[69] = 5590 + 25*26 = 6240 > 6216
    // So _lastVisibleRow should return 68
    const lastRow = grid._lastVisibleRow(5716, 500);
    assertEq(lastRow, 75, "last visible row at scrollTop=5716 vh=500");
  });

  // TEST 6: _onViewportScroll renders correct row range with tall rows
  test("_onViewportScroll renders correct range when scrollTop=5716 with 130px rows", () => {
    const customHeights = {};
    for (let r = 1; r <= 43; r++) customHeights[r] = 130;
    const grid = createGridForTest(200, customHeights);
    grid.currentStartRow = 1;
    grid.currentEndRow = 40;

    grid.viewport.scrollTop = 5716;
    grid.viewport.clientHeight = 500;
    grid._onViewportScroll();

    // startRow = firstVisibleRow(5716) - 8 = 48 - 8 = 40
    // endRow = lastVisibleRow(5716, 500) + 8 = 68 + 8 = 76
    assert(grid.currentStartRow <= 48, `currentStartRow=${grid.currentStartRow} should be <= 48`);
    assert(grid.currentEndRow >= 48, `currentEndRow=${grid.currentEndRow} should be >= 48`);
    assert(grid.currentEndRow >= grid.currentStartRow, "endRow >= startRow");
  });

  // TEST 7: spacer top height uses prefix-sum, not default rowHeight
  test("spacer top height = prefix-sum of rows skipped, not skipped * defaultRowHeight", () => {
    const customHeights = {};
    for (let r = 1; r <= 43; r++) customHeights[r] = 130;
    const grid = createGridForTest(200, customHeights);
    grid.currentStartRow = 1;
    grid.currentEndRow = 40;

    grid._renderVirtualRows(44, 60);

    const topTd = grid.topSpacer.querySelector();
    const expectedTopHeight = grid._rowTop(44); // 43*130 = 5590
    assertEq(topTd.style.height, `${expectedTopHeight}px`,
      "top spacer should use prefix-sum height");
    assertEq(expectedTopHeight, 5590, "prefix-sum rowTop(44) should be 5590");
  });

  // TEST 8: spacer bottom height uses remaining rows with actual heights
  test("spacer bottom = totalHeight - rowTop(endRow+1)", () => {
    const customHeights = {};
    for (let r = 1; r <= 43; r++) customHeights[r] = 130;
    const grid = createGridForTest(200, customHeights);

    grid._renderVirtualRows(44, 60);

    const bottomTd = grid.bottomSpacer.querySelector();
    const bottomHeight = parseInt(bottomTd.style.height, 10);
    const expectedBottomHeight = grid._totalHeight() - grid._rowTop(61);
    assertEq(bottomHeight, expectedBottomHeight,
      "bottom spacer should use actual remaining height");
  });

  // TEST 9: Hidden rows are excluded from prefix-sum visible height
  test("Hidden rows excluded from prefix-sum top calculation", () => {
    const grid = createGridForTest(10, { 1: 50, 2: 50, 3: 50, 4: 50, 5: 50 });
    grid._userHiddenRows().add(3); // hide row 3
    grid._invalidateRowTopsCache();

    // With hidden row excluded from prefix sum, row 4 top = row1 + row2 (hidden row3 skipped)
    assertEq(grid._rowTop(1), 0, "row 1 top");
    assertEq(grid._rowTop(2), 50, "row 2 top");
    assertEq(grid._rowTop(4), 100, "row 4 top (hidden row 3 excluded)");
    assert(grid._isRowSkipped(3), "row 3 should be skipped");
    assert(!grid._isRowSkipped(2), "row 2 should not be skipped");
  });

  // TEST 10: Changing row height invalidates prefix-sum cache
  test("setRowHeights() invalidates prefix-sum cache", () => {
    const grid = createGridForTest(10);
    const top1 = grid._rowTop(5);
    assertEq(top1, 4 * DEFAULT_ROW_HEIGHT_PX, "initial row 5 top");

    // Modify the row height map directly (bypass DOM-heavy setRowHeights)
    grid._rowHeights().set(3, 100);
    grid._invalidateRowTopsCache();
    const top5After = grid._rowTop(5);
    assertEq(top5After, DEFAULT_ROW_HEIGHT_PX + DEFAULT_ROW_HEIGHT_PX + 100 + DEFAULT_ROW_HEIGHT_PX,
      "row 5 top after row 3 height change");
  });

  // TEST 11: selectCell auto-scroll uses the real row heights for large rows.
  // Behaviour change 03/10: scroll the MINIMUM needed so the cell is fully visible (like Excel) instead of putting the
  // row five default-rows below the top; the old rule let the selection walk off-screen inside the render buffer.
  test("selectCell auto-scroll uses real row heights (_rowBottom), not (row-5)*rowHeight", () => {
    const customHeights = {};
    for (let r = 1; r <= 43; r++) customHeights[r] = 130;
    const grid = createGridForTest(200, customHeights);
    grid.currentStartRow = 1;
    grid.currentEndRow = 40;
    grid.viewport.scrollTop = 0;

    const mockCell = { classList: { add() {}, remove() {} }, style: {}, dataset: {}, appendChild() {} };
    grid.container.querySelector = (sel) => {
      if (sel.includes("A44")) return mockCell;
      return null;
    };

    grid.selectCell("A", 44);

    // Mock viewport: clientHeight 500, no header. Minimal scroll puts the bottom of row 44 on the bottom edge.
    const expectedScrollTop = Math.round(grid._rowBottom(44) - 500);
    assertEq(grid.viewport.scrollTop, expectedScrollTop,
      "scrollTop should be based on the real bottom of row 44, not (44-5)*26");
  });

  // TEST 11b: the rendered window must cover the viewport even when many rows are hidden (filtered inventory file:
  // rows after 38 stayed blank because callers passed the stale default window 1..40).
  test("render window covers the viewport when many rows are hidden", () => {
    const grid = createGridForTest(300);
    for (let r = 7; r <= 120; r++) grid._userHiddenRows().add(r);
    grid._invalidateRowTopsCache();
    grid._renderVirtualRows(1, 40);
    assert(grid.currentEndRow >= 130, `currentEndRow=${grid.currentEndRow} should reach past the hidden block`);
    assertEq(grid.currentStartRow, 1, "start row stays at the top");
  });

  // TEST 12: _totalHeight() returns sum of all row heights
  test("_totalHeight() = sum of all row heights", () => {
    const grid = createGridForTest(10, { 1: 100, 2: 200, 3: 50 });
    const total = grid._totalHeight();
    const expected = 100 + 200 + 50 + 7 * DEFAULT_ROW_HEIGHT_PX;
    assertEq(total, expected, "_totalHeight should sum all row heights");
  });

  // TEST 13: selectCell does not crash when cell is beyond rowCount
  test("selectCell clamps to valid row range", () => {
    const grid = createGridForTest(50);
    grid.container.querySelector = () => null;
    grid.selectCell("A", 200);
    assert(grid.selectedCoord.r <= grid.rowCount, "selected row should not exceed rowCount");
  });

  // TEST 14: Prefix-sum cache works with mix of default and custom heights
  test("Prefix-sum with mixed default and custom row heights", () => {
    const grid = createGridForTest(10, { 3: 100, 7: 200 });
    // Row 1: 20 (default), Row 2: 20, Row 3: 100, Row 4: 20, Row 5: 20, Row 6: 20, Row 7: 200
    assertEq(grid._rowTop(1), 0, "row 1");
    assertEq(grid._rowTop(2), 20, "row 2");
    assertEq(grid._rowTop(3), 40, "row 3");
    assertEq(grid._rowTop(4), 140, "row 4 (after 100px row 3)");
    assertEq(grid._rowTop(5), 160, "row 5");
    assertEq(grid._rowTop(6), 180, "row 6");
    assertEq(grid._rowTop(7), 200, "row 7");
    assertEq(grid._rowTop(8), 400, "row 8 (after 200px row 7)");
  });

  // TEST 15: Binary search at scrollTop=0 returns row 1
  test("_firstVisibleRow(0) = 1", () => {
    const grid = createGridForTest(200, { 1: 130 });
    assertEq(grid._firstVisibleRow(0), 1, "scrollTop=0 -> row 1");
  });

  // TEST 16: Binary search at scrollTop=130 returns row 2
  test("_firstVisibleRow(130) = 2", () => {
    const grid = createGridForTest(200, { 1: 130, 2: 130 });
    assertEq(grid._firstVisibleRow(130), 2, "scrollTop=130 -> row 2");
  });

  return results;
}
