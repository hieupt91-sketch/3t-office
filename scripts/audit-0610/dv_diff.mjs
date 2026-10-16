import fs from "node:fs";
import { createSheetGridWithSheets } from "../../tests/unit/sheet-test-fixtures.js";
const spec = JSON.parse(fs.readFileSync("E:/VNOffice-briefs/dvdiff/spec.json", "utf8"));
const excel = JSON.parse(fs.readFileSync("E:/VNOffice-briefs/dvdiff/excel.json", "utf8").replace(/^\uFEFF/, ""));
const container = { querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, classList: { add() {}, remove() {}, contains() { return false; } } };
let bad = 0, total = 0;
for (const c of spec) {
  const grid = createSheetGridWithSheets(container, ["S"]);
  const range = { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } };
  const rule = grid.addDataValidation(range, { ...c.rule, allowBlank: true });
  if (!rule) { console.log(`FAIL | ${c.name} | cau hinh bi tu choi`); bad += c.values.length; total += c.values.length; continue; }
  const ex = excel.find(e => e.name === c.name).valid.map(Boolean);
  const diff = [];
  c.values.forEach((v, i) => {
    const vn = !!grid.validateCellValue("A", 1, v).valid;
    total++;
    if (vn !== ex[i]) { bad++; diff.push(`${JSON.stringify(v)}: Excel=${ex[i]} VN=${vn}`); }
  });
  console.log(`${diff.length ? "FAIL" : "PASS"} | ${c.name}${diff.length ? " | " + diff.join("; ") : ""}`);
}
console.log(`SUMMARY ${total - bad}/${total} gia tri khop Excel 2016; ${spec.length} kich ban`);