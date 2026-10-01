import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";

function assert(condition, message) { if (!condition) throw new Error(message); }
function container() {
  return { querySelector() { return null; }, querySelectorAll() { return []; }, classList: { add() {}, remove() {}, toggle() {} } };
}

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
      const profileDir = path.join(root, "profile");
      fs.writeFileSync(source, new SheetAdapter(makeGrid()).serializeToFods(), "utf8");
      const xlsx = convertWithSoffice(source, "xlsx", path.join(root, "xlsx"), { profileDir, timeoutMs: 20000 });
      const roundTrip = convertWithSoffice(xlsx, "fods", path.join(root, "fods"), { profileDir, timeoutMs: 20000 });
      verifyRules(new SheetAdapter(null).parseFods(fs.readFileSync(roundTrip, "utf8")), "LibreOffice FODS -> XLSX -> FODS");
    } finally {
      if (process.env.VNO_KEEP_FODS_TEST_OUTPUT) console.log(`Kept CF/validation test files at ${root}`);
      else fs.rmSync(root, { recursive: true, force: true });
    }
  });
  test("Sheet FODS import (S28a): đọc calcext:target-range-address nhiều vùng cách nhau khoảng trắng và calcext:value='duplicate'", () => {
    const fodsXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:calcext="urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0"
 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0">
 <office:styles>
  <style:style style:name="ConditionalStyle_5f_225" style:display-name="ConditionalStyle_225" style:family="table-cell">
   <style:table-cell-properties fo:background-color="#ffc7ce"/>
  </style:style>
 </office:styles>
 <office:body>
  <office:spreadsheet>
   <table:table table:name="Báo giá">
    <table:table-column/>
    <table:table-row>
     <table:table-cell office:value-type="string"><text:p>ABC</text:p></table:table-cell>
    </table:table-row>
    <calcext:conditional-formats>
     <calcext:conditional-format calcext:target-range-address="&apos;Báo giá&apos;.C3:&apos;Báo giá&apos;.C3 &apos;Báo giá&apos;.D4:&apos;Báo giá&apos;.D10">
      <calcext:condition calcext:apply-style-name="ConditionalStyle_225" calcext:value="duplicate" calcext:base-cell-address="&apos;Báo giá&apos;.C3"/>
     </calcext:conditional-format>
    </calcext:conditional-formats>
   </table:table>
  </office:spreadsheet>
 </office:body>
</office:document>`;
    const wb = new SheetAdapter(null).parseFods(fodsXml);
    const rules = wb.conditionalFormattingBySheet["Báo giá"] || [];
    assert(rules.length === 2, `Phải parse đủ 2 vùng target, thực tế: ${rules.length}`);
    assert(rules[0].type === "duplicate" && rules[0].color === "#ffc7ce", `Rule 1 sai: ${JSON.stringify(rules[0])}`);
    assert(rules[0].range.start.c === "C" && rules[0].range.start.r === 3 && rules[0].range.end.c === "C" && rules[0].range.end.r === 3, "Rule 1 range C3:C3 sai");
    assert(rules[1].type === "duplicate" && rules[1].color === "#ffc7ce", `Rule 2 sai: ${JSON.stringify(rules[1])}`);
    assert(rules[1].range.start.c === "D" && rules[1].range.start.r === 4 && rules[1].range.end.c === "D" && rules[1].range.end.r === 10, "Rule 2 range D4:D10 sai");
  });

  test("Sheet Grid CF (S28a): _matchingConditionalRule tô màu ô trùng lặp (duplicate)", () => {
    const sheet = "Sheet1";
    const grid = new SheetGridController(container());
    grid.sheets = [sheet];
    grid.activeSheet = sheet;
    grid.cellsData.set("A1", { val: "Apple" });
    grid.cellsData.set("A2", { val: "Banana" });
    grid.cellsData.set("A3", { val: "apple" }); // trùng với A1 (case-insensitive)
    grid.cellsData.set("A4", { val: "Orange" });
    grid.conditionalFormattingBySheet[sheet] = [{
      id: "cf-dup",
      range: { start: { c: "A", r: 1 }, end: { c: "A", r: 4 } },
      type: "duplicate",
      color: "#ffc7ce"
    }];

    const matchA1 = grid._matchingConditionalRule("A", 1);
    const matchA2 = grid._matchingConditionalRule("A", 2);
    const matchA3 = grid._matchingConditionalRule("A", 3);
    const matchA4 = grid._matchingConditionalRule("A", 4);

    assert(matchA1 && matchA1.color === "#ffc7ce", "A1 trùng phải match rule duplicate");
    assert(matchA2 === null, "A2 không trùng không được match");
    assert(matchA3 && matchA3.color === "#ffc7ce", "A3 trùng phải match rule duplicate");
    assert(matchA4 === null, "A4 không trùng không được match");
  });

  test("Sheet FODS save (S28a): serializeToFods khong sinh hang trieu o rong cho quy tac CF toan cot", () => {
    const sheet = "Sheet1";
    const grid = {
      sheets: [sheet],
      activeSheet: sheet,
      cellsData: new Map([["A1", { val: "Header", formula: "", style: {} }]]),
      sheetsData: {},
      commentsBySheet: { [sheet]: {} },
      mergedRangesBySheet: { [sheet]: [] },
      namedRangesBySheet: { [sheet]: [] },
      namedRangesWorkbook: [],
      printAreaBySheet: { [sheet]: null },
      rowHeightsBySheet: { [sheet]: {} },
      colWidthsBySheet: { [sheet]: {} },
      userHiddenRowsBySheet: { [sheet]: [] },
      userHiddenColsBySheet: { [sheet]: [] },
      imagesBySheet: { [sheet]: [] },
      conditionalFormattingBySheet: {
        [sheet]: [{
          id: "cf-full-col",
          range: { start: { c: "C", r: 16 }, end: { c: "C", r: 1048576 } },
          type: "duplicate",
          color: "#ffc7ce"
        }]
      },
      dataValidationsBySheet: { [sheet]: [] },
      pivotTablesBySheet: { [sheet]: [] },
      chartsBySheet: { [sheet]: [] },
      pageBreaksBySheet: { [sheet]: { rows: [], cols: [] } },
      protectionBySheet: { [sheet]: { enabled: false } },
      outlineGroupsBySheet: { [sheet]: [] }
    };
    const xml = new SheetAdapter(grid).serializeToFods();
    assert(xml.includes("calcext:conditional-formats"), "Phai chua conditional formats");
    assert(xml.length < 50000, `XML khong duoc bung hang trieu ky tu, thuc te dai ${xml.length}`);
  });
  return results;
}

