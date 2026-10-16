import fs from "node:fs";
import { createSheetGridWithSheets } from "../../tests/unit/sheet-test-fixtures.js";
const spec = JSON.parse(fs.readFileSync("E:/VNOffice-briefs/cfdiff/spec.json", "utf8"));
const excel = JSON.parse(fs.readFileSync("E:/VNOffice-briefs/cfdiff/excel.json", "utf8").replace(/^\uFEFF/, ""));
const container = { querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, classList: { add() {}, remove() {}, contains() { return false; } } };
let bad = 0, total = 0;
for (const c of spec) {
  const grid = createSheetGridWithSheets(container, ["S"]);
  c.values.forEach((v, i) => { if (v !== "") grid.setCellValue("A", i + 1, typeof v === "string" ? v : v); });
  const n = c.values.length;
  const range = { start: { c: "A", r: 1 }, end: { c: "A", r: n } };
  grid.addConditionalFormattingRule(range, { ...c.rule, color: "#ffe699" });
  const vn = [];
  for (let r = 1; r <= n; r++) { const v = grid._conditionalCellVisual("A", r); vn.push(!!(v && v.fill)); }
  const ex = excel.find(e => e.name === c.name).hit.map(Boolean);
  const diff = vn.map((x, i) => x === ex[i] ? null : `A${i + 1}(${JSON.stringify(c.values[i])}): Excel=${ex[i]} VN=${x}`).filter(Boolean);
  total += n; bad += diff.length;
  console.log(`${diff.length ? "FAIL" : "PASS"} | ${c.name}${diff.length ? " | " + diff.join("; ") : ""}`);
}
console.log(`SUMMARY ${total - bad}/${total} o khop Excel 2016; ${spec.length} kich ban`);