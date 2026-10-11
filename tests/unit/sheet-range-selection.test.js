import {
  SheetGridController,
  createSheetSelectionRange,
  getSheetSelectionAutoScrollDelta,
  normalizeSheetSelectionRange
} from "../../apps/sheet/sheet-grid.js";

const assert = (condition, message) => { if (!condition) throw new Error(message); };

function mockContainer() {
  return {
    querySelector: () => null,
    querySelectorAll: () => [],
    focus() {},
    classList: { add() {}, remove() {}, toggle() {} }
  };
}

export async function runSheetRangeSelectionTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  test("Range direction retains its mouse-down anchor while normalization is orientation-independent", () => {
    const range = createSheetSelectionRange({ c: "E", r: 10 }, { c: "B", r: 3 });
    assert(range.start.c === "E" && range.start.r === 10, "Anchor should remain E10 after dragging up and left");
    assert(range.end.c === "B" && range.end.r === 3, "Active endpoint should be B3 after reverse drag");
    const normalized = normalizeSheetSelectionRange(range, ["A", "B", "C", "D", "E"]);
    assert(normalized.start.c === "B" && normalized.start.r === 3, "Normalized top-left should be B3");
    assert(normalized.end.c === "E" && normalized.end.r === 10, "Normalized bottom-right should be E10");
  });

  test("Auto-scroll delta is zero inside the viewport center, signed at each edge, and scales with distance", () => {
    const options = { edgeZone: 48, maxSpeed: 900 };
    const center = getSheetSelectionAutoScrollDelta(100, 0, 200, 16, options);
    const near = getSheetSelectionAutoScrollDelta(165, 0, 200, 16, options);
    const edge = getSheetSelectionAutoScrollDelta(199, 0, 200, 16, options);
    const outside = getSheetSelectionAutoScrollDelta(230, 0, 200, 16, options);
    const left = getSheetSelectionAutoScrollDelta(-10, 0, 200, 16, options);
    assert(center === 0, `Center should not scroll, got ${center}`);
    assert(near > 0 && edge > near && outside > edge, `Right-edge speed should scale and cap by distance: ${near}, ${edge}, ${outside}`);
    assert(left < 0, `Pointer beyond the left edge should scroll backwards, got ${left}`);
  });

  test("Controller selection keeps the fixed anchor and moves the active cell for keyboard extension", () => {
    const grid = new SheetGridController(mockContainer());
    grid.selectCell("B", 3);
    grid.selectCell("E", 10, true);
    assert(grid.selectionRange.start.c === "B" && grid.selectionRange.start.r === 3, "Range anchor should stay B3");
    assert(grid.selectionRange.end.c === "E" && grid.selectionRange.end.r === 10, "Active range end should be E10");
    assert(grid.selectedCoord.c === "E" && grid.selectedCoord.r === 10, "selectedCoord should be the active endpoint");
    grid.selectCell("F", 10, true);
    assert(grid.selectionRange.start.c === "B" && grid.selectionRange.start.r === 3, "Shift extension should reuse B3 as anchor");
    assert(grid.getSelectedRangeLabel() === "B3:F10", `Expected B3:F10, got ${grid.getSelectedRangeLabel()}`);
  });

  test("Ctrl selection areas stay separate and aggregate status values once", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("B", 3, 4, false);
    grid.setCellValue("E", 10, 7, false);
    grid.selectCell("B", 3);
    grid.selectCell("E", 10, false, true);
    const stats = grid._calculateStats();
    assert(grid.selectionRanges.length === 2, `Expected two areas, got ${grid.selectionRanges.length}`);
    assert(grid.getSelectionNameLabel() === "B3,E10", `Expected B3,E10 in name box, got ${grid.getSelectionNameLabel()}`);
    assert(stats.count === 2, `Count should include both areas once, got ${stats.count}`);
    assert(stats.sum.includes("11"), `Sum should include 4 + 7, got ${stats.sum}`);
  });

  test("Whole-row and whole-column drags map to full grid extents", () => {
    const grid = new SheetGridController(mockContainer());
    const rowRange = grid._selectionRangeForPointer({ c: "A", r: 3 }, { c: "A", r: 10 }, "row");
    const columnRange = grid._selectionRangeForPointer({ c: "B", r: 1 }, { c: "E", r: 1 }, "column");
    assert(rowRange.start.c === "A" && (rowRange.end.c === "XFD" || rowRange.end.c === "Z") && rowRange.start.r === 3 && rowRange.end.r === 10, "Row drag should span full columns extent");
    assert(columnRange.start.c === "B" && columnRange.end.c === "E" && columnRange.start.r === 1 && (columnRange.end.r === 1048576 || columnRange.end.r === 200), "Column drag should span full rows extent");
  });

  return results;
}
