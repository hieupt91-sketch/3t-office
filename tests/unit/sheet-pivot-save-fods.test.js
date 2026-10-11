import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";

function assert(condition, message) { if (!condition) throw new Error(message); }

const sourceSheet = "Dữ liệu bán hàng";
const targetSheet = "Tổng hợp Pivot";
const expected = {
  sourceSheet, sourceRange: "A1:G3", rows: ["Khu vực"], columns: ["Tháng"],
  values: [
    { field: "Doanh thu", aggregate: "SUM" }, { field: "Đơn hàng", aggregate: "COUNT" },
    { field: "Biên lợi nhuận", aggregate: "AVERAGE" }, { field: "Thấp nhất", aggregate: "MIN" },
    { field: "Cao nhất", aggregate: "MAX" }
  ],
  targetSheet
};

function makeGrid() {
  const source = new Map();
  ["Tháng", "Khu vực", "Doanh thu", "Đơn hàng", "Biên lợi nhuận", "Thấp nhất", "Cao nhất"].forEach((value, index) => {
    source.set(`${String.fromCharCode(65 + index)}1`, { val: value, formula: "", style: {} });
  });
  [["T1", "Bắc", 120, 2, 60, 10, 120], ["T2", "Nam", 80, 1, 40, 8, 80]].forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => source.set(`${String.fromCharCode(65 + columnIndex)}${rowIndex + 2}`, { val: value, formula: "", style: {} }));
  });
  const target = new Map([
    ["A1", { val: "Khu vực", formula: "", style: {} }], ["B1", { val: "T1", formula: "", style: {} }],
    ["A2", { val: "Bắc", formula: "", style: {} }], ["B2", { val: 120, formula: "", style: {} }]
  ]);
  return {
    sheets: [sourceSheet, targetSheet], activeSheet: targetSheet,
    sheetsData: { [sourceSheet]: source, [targetSheet]: target },
    commentsBySheet: { [sourceSheet]: {}, [targetSheet]: {} },
    namedRangesBySheet: { [sourceSheet]: [], [targetSheet]: [] }, namedRangesWorkbook: [],
    printAreaBySheet: { [sourceSheet]: null, [targetSheet]: null },
    conditionalFormattingBySheet: { [sourceSheet]: [], [targetSheet]: [] },
    dataValidationsBySheet: { [sourceSheet]: [], [targetSheet]: [] },
    pivotTablesBySheet: { [sourceSheet]: [], [targetSheet]: [{ id: "pivot-import-7", name: "Doanh số theo vùng", ...expected, imported: true }] }
  };
}

function verifyPivot(workbook, context) {
  const pivot = workbook.pivotTablesBySheet?.[targetSheet]?.[0];
  assert(pivot, `${context}: thiếu Pivot trên sheet đích`);
  for (const key of ["sourceSheet", "sourceRange", "targetSheet"]) assert(pivot[key] === expected[key], `${context}: ${key}=${pivot[key]}`);
  assert(JSON.stringify(pivot.rows) === JSON.stringify(expected.rows), `${context}: rows=${JSON.stringify(pivot.rows)}`);
  assert(JSON.stringify(pivot.columns) === JSON.stringify(expected.columns), `${context}: columns=${JSON.stringify(pivot.columns)}`);
  assert(JSON.stringify(pivot.values) === JSON.stringify(expected.values), `${context}: values=${JSON.stringify(pivot.values)}`);
}

export async function runSheetPivotSaveFodsTests() {
  const results = [];
  const test = (name, callback) => {
    try { callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  test("Sheet Pivot save: imported Pivot và 5 aggregate round-trip serializeToFods -> parseFods", () => {
    const xml = new SheetAdapter(makeGrid()).serializeToFods();
    assert(xml.includes("<table:data-pilot-tables>"), "serializer không ghi data-pilot-tables");
    for (const fn of ["sum", "count", "average", "min", "max"]) assert(xml.includes(`table:function="${fn}"`), `thiếu function ${fn}`);
    verifyPivot(new SheetAdapter(null).parseFods(xml), "round-trip nội bộ");
  });
  test("Sheet Pivot refresh: FODS ghi vùng kết quả hiện tại cho OOXML PivotTable", () => {
    const grid = makeGrid();
    const pivot = grid.pivotTablesBySheet[targetSheet][0];
    pivot.resultRange = { start: { c: "A", r: 1 }, end: { c: "D", r: 4 } };
    grid.pivotRefreshTouchedBySheet = new Set([targetSheet]);
    const xml = new SheetAdapter(grid).serializeToFods();
    assert(xml.includes('vno:xlsx-location="A1:D4"'), "FODS thiếu vùng kết quả Pivot đã refresh");
  });
  test("Sheet save: thay đổi metadata XLSX không dùng nhánh giữ nguyên workbook nguồn", () => {
    const grid = makeGrid();
    const adapter = new SheetAdapter(grid);
    adapter.sourceFilePath = "C:/workbook.xlsx";
    adapter.isDirty = false;
    grid.xlsxViewStateTouched = new Set(["showGridLines"]);
    let xml = adapter.serializeToFods();
    assert(!xml.includes("vno-pristine-xlsx-source"), "thay đổi chế độ xem vẫn bị đánh dấu workbook nguyên trạng");
    grid.xlsxViewStateTouched.clear();
    grid.printAreaTouchedBySheet = new Set([sourceSheet]);
    xml = adapter.serializeToFods();
    assert(!xml.includes("vno-pristine-xlsx-source"), "thay đổi vùng in vẫn bị đánh dấu workbook nguyên trạng");
    grid.printAreaTouchedBySheet.clear();
    grid.pivotRefreshTouchedBySheet = new Set([targetSheet]);
    xml = adapter.serializeToFods();
    assert(!xml.includes("vno-pristine-xlsx-source"), "làm mới Pivot vẫn bị đánh dấu workbook nguyên trạng");
  });
  test("Sheet save: giảm indent từ 1 về 0 ghi margin 0 và bỏ vno:xf nguồn", () => {
    const grid = makeGrid();
    const adapter = new SheetAdapter(grid);
    const style = { indentLevel: 1, origXf: 5 };
    style.styleHashAtImport = adapter._computeStyleHash(style);
    style.indentLevel = 0;
    grid.sheetsData[sourceSheet].get("A2").style = style;
    const xml = adapter.serializeToFods();
    assert(/fo:margin-left="0\.000cm"/.test(xml), "FODS không ghi giá trị indent 0 tường minh");
    assert(!/<table:table-cell\b[^>]*vno:xf="5"[^>]*>[^<]*<text:p>T1<\/text:p>/s.test(xml), "ô đã giảm indent vẫn giữ XF nguồn");
  });
  test("Sheet Pivot save: LibreOffice giữ DataPilot qua FODS -> XLSX -> FODS", () => {
    assert(findSoffice(), "Không tìm thấy LibreOffice soffice.exe");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vno-pivot-save-"));
    try {
      const source = path.join(root, "pivot.fods");
      const profileDir = path.join(root, "profile");
      fs.writeFileSync(source, new SheetAdapter(makeGrid()).serializeToFods(), "utf8");
      const xlsx = convertWithSoffice(source, "xlsx", path.join(root, "xlsx"), { profileDir, timeoutMs: 60000 });
      const roundTrip = convertWithSoffice(xlsx, "fods", path.join(root, "fods"), { profileDir, timeoutMs: 60000 });
      const xml = fs.readFileSync(roundTrip, "utf8");
      assert(/<table:data-pilot-table\b/i.test(xml), "LibreOffice đã làm mất DataPilot");
      verifyPivot(new SheetAdapter(null).parseFods(xml), "LibreOffice FODS -> XLSX -> FODS");
    } finally {
      if (process.env.VNO_KEEP_FODS_TEST_OUTPUT) console.log(`Kept Pivot test files at ${root}`);
      else fs.rmSync(root, { recursive: true, force: true });
    }
  });
  return results;
}
