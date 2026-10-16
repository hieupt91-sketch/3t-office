/**
 * Test Suite: Xác thực dữ liệu đối chiếu Excel 2016 (bộ chuẩn tests/functions/dv-golden-1.json, đo bằng Excel COM Validation.Value).
 */
import fs from "node:fs";
import { createSheetGridWithSheets } from "./sheet-test-fixtures.js";

const container = () => ({
  querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {},
  classList: { add() {}, remove() {}, contains() { return false; } }
});

export async function runSheetDvGoldenTests() {
  const results = [];
  const golden = JSON.parse(fs.readFileSync(new URL("../functions/dv-golden-1.json", import.meta.url), "utf8"));
  for (const item of golden.cases) {
    try {
      const grid = createSheetGridWithSheets(container(), ["S"]);
      const range = { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } };
      if (!grid.addDataValidation(range, { ...item.rule, allowBlank: true })) throw new Error("cấu hình bị từ chối");
      const actual = item.values.map(value => !!grid.validateCellValue("A", 1, value).valid);
      if (actual.join() !== item.excelValid.join()) throw new Error(`Excel=${item.excelValid.map(Number).join("")} VN=${actual.map(Number).join("")}`);
      results.push({ name: `Xác thực dữ liệu khớp Excel 2016: ${item.name}`, pass: true });
    } catch (error) {
      results.push({ name: `Xác thực dữ liệu khớp Excel 2016: ${item.name}`, pass: false, error: error.message });
    }
  }
  return results;
}