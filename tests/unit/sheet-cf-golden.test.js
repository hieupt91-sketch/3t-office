/**
 * Test Suite: Định dạng có điều kiện đối chiếu Excel 2016 (bộ chuẩn tests/functions/cf-golden-1.json, đo bằng Excel COM)
 * và ROW()/COLUMN() không đối số trả đúng dòng/cột của ô đang tính.
 */
import fs from "node:fs";
import { createSheetGridWithSheets } from "./sheet-test-fixtures.js";

const container = () => ({
  querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {},
  classList: { add() {}, remove() {}, contains() { return false; } }
});

export async function runSheetCfGoldenTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const golden = JSON.parse(fs.readFileSync(new URL("../functions/cf-golden-1.json", import.meta.url), "utf8"));
  for (const item of golden.cases) {
    test(`CF khớp Excel 2016: ${item.name}`, () => {
      const grid = createSheetGridWithSheets(container(), ["S"]);
      item.values.forEach((value, index) => { if (value !== "") grid.setCellValue("A", index + 1, value); });
      const range = { start: { c: "A", r: 1 }, end: { c: "A", r: item.values.length } };
      grid.addConditionalFormattingRule(range, { ...item.rule, color: "#ffe699" });
      const actual = item.values.map((_, index) => !!grid._conditionalCellVisual("A", index + 1)?.fill);
      if (actual.join() !== item.excelHit.join()) {
        throw new Error(`Excel=${item.excelHit.map(Number).join("")} VN=${actual.map(Number).join("")}`);
      }
    });
  }
  test("ROW() và COLUMN() không đối số trả dòng/cột của chính ô chứa công thức", () => {
    const grid = createSheetGridWithSheets(container(), ["S"]);
    grid.setCellValue("C", 5, "=ROW()");
    grid.setCellValue("D", 7, "=COLUMN()");
    grid.setCellValue("AB", 9, "=ROW()*100+COLUMN()");
    const value = key => Number(grid.cellsData.get(key)?.val);
    if (value("C5") !== 5) throw new Error(`C5 =ROW() cho ${value("C5")}`);
    if (value("D7") !== 4) throw new Error(`D7 =COLUMN() cho ${value("D7")}`);
    if (value("AB9") !== 928) throw new Error(`AB9 cho ${value("AB9")}`);
  });
  return results;
}