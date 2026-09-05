/**
 * Real LibreOffice round-trip for Conditional Formatting + Data Validation.
 * Parses XML bytes after soffice hop (not only parseFods) so a lenient parser
 * cannot hide a missing calcext:condition / table:content-validation.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";

assert.ok(findSoffice(), "LibreOffice soffice.exe not found");

const sheet = "Kiểm tra lưu";
const grid = {
  sheets: [sheet],
  activeSheet: sheet,
  sheetsData: {
    [sheet]: new Map([
      ["A2", { val: 95, formula: "", style: {} }],
      ["A3", { val: 45, formula: "", style: {} }],
      ["B2", { val: "Đạt", formula: "", style: {} }],
      ["C2", { val: 8, formula: "", style: {} }]
    ])
  },
  commentsBySheet: { [sheet]: {} },
  namedRangesBySheet: { [sheet]: [] },
  namedRangesWorkbook: [],
  printAreaBySheet: { [sheet]: null },
  conditionalFormattingBySheet: {
    [sheet]: [
      { id: "cf-high", range: { start: { c: "A", r: 2 }, end: { c: "A", r: 4 } }, type: "greaterThan", value: 80, color: "#c6efce" },
      { id: "cf-low", range: { start: { c: "A", r: 2 }, end: { c: "A", r: 4 } }, type: "lessThan", value: 50, color: "#ffc7ce" },
      { id: "cf-blank", range: { start: { c: "A", r: 2 }, end: { c: "A", r: 4 } }, type: "blank", value: null, color: "#fff2cc" }
    ]
  },
  dataValidationsBySheet: {
    [sheet]: [
      { id: "dv-list", range: { start: { c: "B", r: 2 }, end: { c: "B", r: 4 } }, type: "list", values: ["Đạt", "Không đạt", "Đang xử lý"] },
      { id: "dv-number", range: { start: { c: "C", r: 2 }, end: { c: "C", r: 4 } }, type: "numberRange", min: 0, max: 10 }
    ]
  }
};

const sourceXml = new SheetAdapter(grid).serializeToFods();
assert.match(sourceXml, /<calcext:conditional-formats>/);
assert.match(sourceXml, /<table:content-validations>/);
assert.match(sourceXml, /calcext:value="(?:&gt;|>)80"/);
assert.match(sourceXml, /cell-content-is-in-list/);
assert.match(sourceXml, /cell-content-is-between\(0,10\)/);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-sheet-cf-real-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "rules.fods");
fs.writeFileSync(source, sourceXml, "utf8");

try {
  const xlsxPath = convertWithSoffice(source, "xlsx", path.join(tempRoot, "xlsx"), { profileDir, appKind: "sheet" });
  const roundPath = convertWithSoffice(xlsxPath, "fods", path.join(tempRoot, "fods"), { profileDir, appKind: "sheet" });
  const xml = fs.readFileSync(roundPath, "utf8");
  assert.match(xml, /<calcext:conditional-format\b/, "soffice dropped calcext:conditional-format");
  assert.match(xml, /<calcext:condition\b/, "soffice dropped calcext:condition");
  assert.match(xml, /<table:content-validation\b/, "soffice dropped table:content-validation");
  assert.match(xml, /cell-content-is-in-list|cell-content-is-in-list/, "list validation missing in XML");
  assert.match(xml, /Đạt/, "list value Đạt missing");
  assert.match(xml, /cell-content-is-between/, "numberRange missing in XML");

  const parsed = new SheetAdapter(null).parseFods(xml);
  const rules = parsed.conditionalFormattingBySheet[sheet] || [];
  const validations = parsed.dataValidationsBySheet[sheet] || [];
  for (const [type, value] of [["greaterThan", 80], ["lessThan", 50], ["blank", null]]) {
    const rule = rules.find(item => item.type === type);
    assert.ok(rule, `CF ${type} missing after hop: ${JSON.stringify(rules)}`);
    assert.equal(rule.value, value);
    assert.equal(rule.range.start.c, "A");
    assert.equal(rule.range.end.r, 4);
  }
  const list = validations.find(item => item.type === "list");
  const number = validations.find(item => item.type === "numberRange");
  assert.deepEqual(list?.values, ["Đạt", "Không đạt", "Đang xử lý"]);
  assert.equal(list.range.end.r, 4, `list range collapsed: ${JSON.stringify(list.range)}`);
  assert.equal(number?.min, 0);
  assert.equal(number?.max, 10);
  console.log(`PASS: CF + Data Validation survived FODS → XLSX → FODS XML parse (${fs.statSync(xlsxPath).size} bytes).`);
} finally {
  if (process.env.VNO_KEEP_FODS_TEST_OUTPUT) console.log(`Kept ${tempRoot}`);
  else fs.rmSync(tempRoot, { recursive: true, force: true });
}
