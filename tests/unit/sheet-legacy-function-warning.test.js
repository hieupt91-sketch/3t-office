import { findLegacyUnsupportedFunctions } from "../../apps/sheet/legacy-formula-warning.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetApp } from "../../apps/sheet/sheet-app.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { setLocale } from "../../platform/i18n/i18n.js";

export async function runSheetLegacyFunctionWarningTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const eq = (actual, expected, label) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  };
  test("Nhận diện hàm đời mới thường và có tiền tố _xlfn, kể cả hàm lồng", () => {
    eq(findLegacyUnsupportedFunctions('=IF(A1>0,_xlfn.XLOOKUP(A1;B:B;C:C),_xlfn._xlws.FILTER(D:D;D:D>0))'), ["XLOOKUP", "FILTER"], "danh sách hàm");
    eq(findLegacyUnsupportedFunctions('=_xlfn.SOMEFUTUREFUNC(A1)'), ["SOMEFUTUREFUNC"], "nhận diện hàm có tiền tố _xlfn chưa có trong danh sách");
  });
  test("Mỗi hàm chỉ xuất hiện một lần; bỏ chuỗi văn bản, hàm gần giống và hàm phiên bản cũ", () => {
    eq(findLegacyUnsupportedFunctions('=CONCAT("XLOOKUP(";XLOOKUP(A1;B:B;C:C);XLOOKUP(A2;B:B;C:C))+SUM(1;2)+XLOOKUP2(A1)'), ["CONCAT", "XLOOKUP"], "danh sách hàm");
  });
  test("Cảnh báo mỗi hàm một lần, có thể tắt trong phiên và có chuỗi VI/EN", () => {
    const notifications = [];
    let clears = 0;
    const grid = Object.create(SheetGridController.prototype);
    grid.adapter = { shell: {
      showNotification: notification => notifications.push(notification),
      clearNotification: () => { clears++; }
    } };
    grid._warnForLegacyFormula("=XLOOKUP(A1;B:B;C:C)");
    grid._warnForLegacyFormula("=XLOOKUP(A2;B:B;C:C)");
    eq(notifications.length, 1, "số thông báo XLOOKUP");
    if (!notifications[0].message.includes("XLOOKUP") || !notifications[0].message.includes("#NAME?")) {
      throw new Error("Thông báo phải nêu hàm và lỗi có thể gặp ở phiên bản cũ.");
    }
    grid._warnForLegacyFormula("=_xlfn._xlws.FILTER(A1:A3;A1:A3>0)");
    eq(notifications.length, 2, "số thông báo FILTER mới");
    notifications[1].actions[0].onClick();
    grid._warnForLegacyFormula("=UNIQUE(A1:A3)");
    eq(grid._legacyFunctionWarningsDisabled, true, "trạng thái tắt");
    eq(notifications.length, 2, "không báo sau khi tắt");
    eq(clears, 1, "đóng thanh cảnh báo");
    for (const [locale, catalog, singlePrefix, pluralPrefix] of [
      ["vi", viStrings, "Hàm {function}", "Các hàm {functions}"],
      ["en", enStrings, "Function {function}", "Functions {functions}"]
    ]) {
      if (!catalog.sheetFormulaEntry.legacyFunctionWarning.includes("{functions}")
        || !catalog.sheetFormulaEntry.legacyFunctionWarningOne.includes("{function}")
        || !catalog.sheetFormulaEntry.formulaBarPlaceholder
        || !catalog.sheetFormulaEntry.statusReady
        || !catalog.sheetFormulaEntry.statusCell.includes("{coord}")
        || !catalog.sheetFormulaEntry.disableLegacyFunctionWarning) {
        throw new Error("Thiếu chuỗi cảnh báo hoặc nút tắt ở một ngôn ngữ.");
      }
      setLocale(locale);
      const statusShorts = Object.fromEntries(SheetApp.STATUS_STAT_ITEMS.map(item => [item.key, item.short]));
      const expectedStatusShorts = locale === "en"
        ? { count: "COUNT", counta: "COUNTA", min: "MIN", max: "MAX", avg: "AVERAGE", sum: "SUM" }
        : { count: "ĐẾM", counta: "ĐẾM Ô", min: "NHỎ NHẤT", max: "LỚN NHẤT", avg: "TRUNG BÌNH", sum: "TỔNG CỘNG" };
      eq(statusShorts, expectedStatusShorts, `${locale} nhãn thống kê thanh trạng thái`);
      const oneGrid = Object.create(SheetGridController.prototype);
      const oneMessages = [];
      oneGrid.adapter = { shell: { showNotification: item => oneMessages.push(item) } };
      oneGrid._warnForLegacyFormula("=XLOOKUP(A1;B:B;C:C)");
      if (!oneMessages[0]?.message.startsWith(singlePrefix.replace("{function}", "XLOOKUP"))) {
        throw new Error(`${locale} cảnh báo một hàm phải dùng số ít: ${oneMessages[0]?.message}`);
      }
      const manyGrid = Object.create(SheetGridController.prototype);
      const manyMessages = [];
      manyGrid.adapter = { shell: { showNotification: item => manyMessages.push(item) } };
      manyGrid._warnForLegacyFormula("=XLOOKUP(A1;B:B;C:C)+FILTER(C:C;C:C>0)");
      if (!manyMessages[0]?.message.startsWith(pluralPrefix.replace("{functions}", "XLOOKUP, FILTER"))) {
        throw new Error(`${locale} cảnh báo nhiều hàm phải dùng số nhiều: ${manyMessages[0]?.message}`);
      }
    }
    setLocale("vi");
  });
  return results;
}
