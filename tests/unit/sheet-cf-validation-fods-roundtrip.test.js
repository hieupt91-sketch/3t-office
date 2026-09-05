import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";

function assert(condition, message) { if (!condition) throw new Error(message); }

function makeGrid() {
  const sheet = "Kiểm tra lưu";
  return {
    sheets: [sheet], activeSheet: sheet,
    sheetsData: { [sheet]: new Map([
      ["A2", { val: 95, formula: "", style: {} }], ["A3", { val: 45, formula: "", style: {} }],
      ["B2", { val: "Đạt", formula: "", style: {} }], ["C2", { val: 8, formula: "", style: {} }]
    ]) },
    commentsBySheet: { [sheet]: {} }, namedRangesBySheet: { [sheet]: [] }, namedRangesWorkbook: [], printAreaBySheet: { [sheet]: null },
    conditionalFormattingBySheet: { [sheet]: [
      { id: "cf-high", range: { start: { c: "A", r: 2 }, end: { c: "A", r: 4 } }, type: "greaterThan", value: 80, color: "#c6efce" },
      { id: "cf-low", range: { start: { c: "A", r: 2 }, end: { c: "A", r: 4 } }, type: "lessThan", value: 50, color: "#ffc7ce" },
      { id: "cf-blank", range: { start: { c: "A", r: 2 }, end: { c: "A", r: 4 } }, type: "blank", value: null, color: "#fff2cc" }
    ] },
    dataValidationsBySheet: { [sheet]: [
      { id: "dv-list", range: { start: { c: "B", r: 2 }, end: { c: "B", r: 4 } }, type: "list", values: ["Đạt", "Không đạt", "Đang xử lý"] },
      { id: "dv-number", range: { start: { c: "C", r: 2 }, end: { c: "C", r: 4 } }, type: "numberRange", min: 0, max: 10 }
    ] }
  };
}

function verifyRules(workbook, context) {
  const rules = workbook.conditionalFormattingBySheet["Kiểm tra lưu"] || [];
  const validations = workbook.dataValidationsBySheet["Kiểm tra lưu"] || [];
  for (const [type, value, color] of [["greaterThan", 80, "#c6efce"], ["lessThan", 50, "#ffc7ce"], ["blank", null, "#fff2cc"]]) {
    const rule = rules.find(item => item.type === type);
    assert(rule, `${context}: thiếu CF ${type}: ${JSON.stringify(rules)}`);
    assert(rule.value === value && rule.color === color, `${context}: CF ${type} sai value/màu: ${JSON.stringify(rule)}`);
    assert(rule.range.start.c === "A" && rule.range.start.r === 2 && rule.range.end.c === "A" && rule.range.end.r === 4, `${context}: CF ${type} sai range`);
  }
  const list = validations.find(item => item.type === "list");
  const number = validations.find(item => item.type === "numberRange");
  assert(list?.values.join("|") === "Đạt|Không đạt|Đang xử lý", `${context}: list validation sai: ${JSON.stringify(validations)}`);
  assert(list.range.start.c === "B" && list.range.start.r === 2 && list.range.end.c === "B" && list.range.end.r === 4, `${context}: list range sai`);
  assert(number?.min === 0 && number?.max === 10, `${context}: numberRange sai: ${JSON.stringify(validations)}`);
  assert(number.range.start.c === "C" && number.range.start.r === 2 && number.range.end.c === "C" && number.range.end.r === 4, `${context}: numberRange range sai`);
}

export async function runSheetCfValidationFodsRoundTripTests() {
  const results = [];
  const test = (name, callback) => {
    try { callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  test("Sheet FODS save: CF và validation round-trip nội bộ không mất rule, màu hoặc range", () => {
    const xml = new SheetAdapter(makeGrid()).serializeToFods();
    assert(xml.includes("calcext:conditional-formats"), "serializer phải ghi conditional-formats");
    assert(xml.includes("table:content-validations"), "serializer phải ghi content-validations");
    verifyRules(new SheetAdapter(null).parseFods(xml), "serializeToFods -> parseFods");
  });
  test("Sheet FODS save: LibreOffice giữ CF và validation qua FODS -> XLSX -> FODS", () => {
    assert(findSoffice(), "Không tìm thấy LibreOffice soffice.exe");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vno-cf-validation-"));
    try {
      const source = path.join(root, "rules.fods");
      fs.writeFileSync(source, new SheetAdapter(makeGrid()).serializeToFods(), "utf8");
      const xlsx = convertWithSoffice(source, "xlsx", path.join(root, "xlsx"), { profileDir: path.join(root, "profile-xlsx"), timeoutMs: 20000 });
      const roundTrip = convertWithSoffice(xlsx, "fods", path.join(root, "fods"), { profileDir: path.join(root, "profile-fods"), timeoutMs: 20000 });
      verifyRules(new SheetAdapter(null).parseFods(fs.readFileSync(roundTrip, "utf8")), "LibreOffice FODS -> XLSX -> FODS");
    } finally {
      if (process.env.VNO_KEEP_FODS_TEST_OUTPUT) console.log(`Kept CF/validation test files at ${root}`);
      else fs.rmSync(root, { recursive: true, force: true });
    }
  });
  return results;
}
