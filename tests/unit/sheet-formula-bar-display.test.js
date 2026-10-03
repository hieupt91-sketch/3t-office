import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { createSheetGridWithSheets } from "./sheet-test-fixtures.js";

export async function runSheetFormulaBarDisplayTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const eq = (actual, expected) => {
    if (actual !== expected) throw new Error(`Mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
  };
  const bar = data => SheetGridController.prototype._formulaBarTextFor.call({}, data);

  test("Thanh công thức: ngày hiện dd/mm/yyyy như Excel, không hiện số serial", () => {
    eq(bar({ val: 46387, style: { numberFormat: { category: "date" } } }), "31/12/2026");
  });
  test("Thanh công thức: giờ hiện h:mm, có giây thì h:mm:ss", () => {
    eq(bar({ val: 13 / 24 + 45 / 1440, style: { numberFormat: { category: "time" } } }), "13:45");
    eq(bar({ val: 13 / 24 + 45 / 1440 + 30 / 86400, style: { numberFormat: { category: "time" } } }), "13:45:30");
  });
  test("Thanh công thức: phần trăm hiện 25%, -7%, 12.5%, không lẫn lỗi dấu phẩy động", () => {
    eq(bar({ val: 0.25, style: { numberFormat: { category: "percentage" } } }), "25%");
    eq(bar({ val: -0.07, style: { numberFormat: { category: "percentage" } } }), "-7%");
    eq(bar({ val: 0.125, style: { numberFormat: { category: "percentage" } } }), "12.5%");
  });
  test("Thanh công thức: công thức, số thường, chữ và ô trống giữ nguyên", () => {
    eq(bar({ formula: "=A1*2", val: 20 }), "=A1*2");
    eq(bar({ val: 1234.56 }), 1234.56);
    eq(bar({ val: "hello" }), "hello");
    eq(bar(undefined), "");
  });

  // Chuyển ô bằng phím: nhảy qua ô gộp, bỏ qua hàng/cột ẩn (lỗi thật thấy trên file tồn kho).
  const container = () => ({
    querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }
  });
  const gridAt = (c, r) => {
    const grid = createSheetGridWithSheets(container(), ["Sheet1"]);
    grid.selectedCoord = { c, r };
    return grid;
  };
  const target = (grid, nextCol, nextRow) => {
    const t = grid._resolveKeyboardTarget(nextCol, nextRow);
    return `${t.c}${t.r}`;
  };

  test("Chuyển ô: mũi tên xuống từ ô gộp A6:A7 sang A8, không kẹt lại ô gộp", () => {
    const grid = gridAt("A", 6);
    grid.getMergedRanges().push({ start: { c: "A", r: 6 }, end: { c: "A", r: 7 } });
    eq(target(grid, "A", 7), "A8");
    grid.selectedCoord = { c: "A", r: 8 };
    eq(target(grid, "A", 7), "A6");
  });
  test("Chuyển ô: mũi tên phải/trái từ ô gộp B6:C7 sang D6 và A6", () => {
    const grid = gridAt("B", 6);
    grid.getMergedRanges().push({ start: { c: "B", r: 6 }, end: { c: "C", r: 7 } });
    eq(target(grid, "C", 6), "D6");
    eq(target(grid, "A", 6), "A6");
  });
  test("Chuyển ô: rơi vào ô gộp khác thì chọn ô neo góc trên trái", () => {
    const grid = gridAt("A", 1);
    grid.getMergedRanges().push({ start: { c: "A", r: 2 }, end: { c: "F", r: 2 } });
    eq(target(grid, "A", 2), "A2");
    grid.selectedCoord = { c: "C", r: 1 };
    eq(target(grid, "C", 2), "A2");
  });
  test("Chuyển ô: bỏ qua hàng ẩn khi đi xuống và đi lên", () => {
    const grid = gridAt("A", 6);
    for (let r = 7; r <= 17; r += 1) grid.hiddenRows.add(r);
    eq(target(grid, "A", 7), "A18");
    grid.selectedCoord = { c: "A", r: 18 };
    eq(target(grid, "A", 17), "A6");
  });
  test("Chuyển ô: hết hàng thì đứng yên, không nhảy ra ngoài bảng", () => {
    const grid = gridAt("A", 1);
    eq(target(grid, "A", 0), "A1");
    grid.selectedCoord = { c: "A", r: grid.rowCount };
    eq(target(grid, "A", grid.rowCount + 1), `A${grid.rowCount}`);
  });
  return results;
}
