import {
  ViewWindowCache,
  captureQuickViewState,
  mapFormatBlocks,
  quickViewColumnLabel,
  restoreQuickViewState,
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

  return results;
}

