import { SheetGridController } from "../../apps/sheet/sheet-grid.js";

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
  return results;
}
