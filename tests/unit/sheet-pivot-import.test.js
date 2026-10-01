/**
 * Sheet Pivot Table import fidelity.
 *
 * Fixture: hand-written FODS DataPilot → soffice --convert-to xlsx (NOT VN serialize).
 * VN Sheet open path: xlsx → soffice --convert-to fods → parseFods/loadFromFods.
 * Live soffice convert is in tests/scripts/probe-sheet-pivot-import.mjs (not this suite)
 * so run-tests.js stays under 60s. SOFFICE_PIVOT_FODS is the DataPilot block soffice
 * actually wrote from that XLSX (range form Sheet.A1:Sheet.E6, tableooo:display-name).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { readZipEntry } from "../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FODS = path.join(root, "tests", "fixtures", "real-office-samples", "src", "sample-sheet-pivot.fods");
const XLSX = path.join(root, "tests", "fixtures", "real-office-samples", "sample-sheet-pivot.xlsx");

/** Captured from soffice XLSX→FODS of sample-sheet-pivot.xlsx (probe 05/09/2026). */
const SOFFICE_PIVOT_FODS = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:tableooo="http://openoffice.org/2009/table"
 office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  <office:body><office:spreadsheet>
    <table:table table:name="DoanhThuNguon">
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Tháng</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Khu vực</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Doanh thu</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>T1</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Bắc</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="120"><text:p>120</text:p></table:table-cell>
      </table:table-row>
      <table:table-row table:number-rows-repeated="7"><table:table-cell/></table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>T3</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Trung</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="85"><text:p>85</text:p></table:table-cell>
      </table:table-row>
    </table:table>
    <table:table table:name="BangTongHop">
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Sum - Doanh thu</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Khu vực</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>T1</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Bắc</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="120"><text:p>120</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="150"><text:p>150</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="180"><text:p>180</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="450"><text:p>450</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Total Result</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="260"><text:p>260</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="310"><text:p>310</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="365"><text:p>365</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="935"><text:p>935</text:p></table:table-cell>
      </table:table-row>
    </table:table>
    <table:database-ranges>
      <table:database-range table:name="NguonDoanhThu" table:target-range-address="DoanhThuNguon.A1:DoanhThuNguon.C10"/>
    </table:database-ranges>
    <table:data-pilot-tables>
      <table:data-pilot-table table:name="DoanhThuTheoKhuVuc" table:application-data="" table:target-range-address="BangTongHop.A1:BangTongHop.E6" table:buttons="BangTongHop.A2 BangTongHop.B1" table:show-filter-button="false">
        <table:source-cell-range table:cell-range-address="DoanhThuNguon.A1:DoanhThuNguon.C10"/>
        <table:data-pilot-field table:source-field-name="Khu vực" table:orientation="row" table:used-hierarchy="-1" table:function="auto"/>
        <table:data-pilot-field table:source-field-name="Tháng" table:orientation="column" table:used-hierarchy="-1" table:function="auto"/>
        <table:data-pilot-field table:source-field-name="Doanh thu" tableooo:display-name="Sum - Doanh thu" table:orientation="data" table:used-hierarchy="-1" table:function="sum"/>
      </table:data-pilot-table>
    </table:data-pilot-tables>
  </office:spreadsheet></office:body>
</office:document>`;

function assert(condition, message) { if (!condition) throw new Error(message); }

function container() {
  return { querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, classList: { add() {}, remove() {}, toggle() {} } };
}

function assertPivotConfig(pivot, context) {
  assert(pivot, `${context}: thiếu pivot`);
  assert(pivot.sourceSheet === "DoanhThuNguon", `${context}: sourceSheet=${pivot.sourceSheet}`);
  assert(pivot.sourceRange === "A1:C10", `${context}: sourceRange=${pivot.sourceRange}`);
  assert(pivot.targetSheet === "BangTongHop", `${context}: targetSheet=${pivot.targetSheet}`);
  assert(pivot.rows.join("|") === "Khu vực", `${context}: rows=${JSON.stringify(pivot.rows)}`);
  assert(pivot.columns.join("|") === "Tháng", `${context}: columns=${JSON.stringify(pivot.columns)}`);
  assert(pivot.values.length === 1 && pivot.values[0].field === "Doanh thu" && pivot.values[0].aggregate === "SUM", `${context}: values=${JSON.stringify(pivot.values)}`);
}

function assertSourceAndCachedResult(workbook, context) {
  assert(workbook.sheets.join("|") === "DoanhThuNguon|BangTongHop", `${context}: sheets=${workbook.sheets.join("|")}`);
  const source = workbook.sheetsData.DoanhThuNguon;
  assert(source.get("A1")?.val === "Tháng" && source.get("B1")?.val === "Khu vực" && source.get("C1")?.val === "Doanh thu", `${context}: header nguồn sai`);
  assert(source.get("A2")?.val === "T1" && source.get("B2")?.val === "Bắc" && source.get("C2")?.val === 120, `${context}: T1 Bắc 120 sai: ${JSON.stringify(source.get("C2"))}`);
  assert(source.get("C10")?.val === 85, `${context}: T3 Trung 85 sai`);
  const result = workbook.sheetsData.BangTongHop;
  const numbers = [];
  for (const [, item] of result.entries()) {
    if (typeof item?.val === "number") numbers.push(item.val);
  }
  assert(numbers.includes(120) && numbers.includes(935), `${context}: bảng kết quả pivot không còn số 120/935: ${numbers.join(",")}`);
}

export async function runSheetPivotImportTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const asyncTest = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test("Hiện trạng: FODS không DataPilot không bị lỗi và không bịa pivot", () => {
    const xml = fs.readFileSync(path.join(root, "tests", "fixtures", "real-office-samples", "src", "sample-sheet.fods"), "utf8");
    const workbook = new SheetAdapter(null).parseFods(xml);
    assert(workbook.sheets.includes("Doanh thu"), "mất sheet Doanh thu");
    assert(Array.isArray(workbook.pivotTablesBySheet["Doanh thu"]) && workbook.pivotTablesBySheet["Doanh thu"].length === 0, `không DataPilot phải rỗng: ${JSON.stringify(workbook.pivotTablesBySheet)}`);
  });

  test("parseFods đọc DataPilot tay (ODF 1.3) vào đúng model pivotTablesBySheet", () => {
    const xml = fs.readFileSync(FODS, "utf8");
    assert(/<table:data-pilot-table/i.test(xml), "fixture FODS phải có DataPilot");
    assert(/<table:database-range/i.test(xml), "fixture FODS phải có database-range");
    const workbook = new SheetAdapter(null).parseFods(xml);
    assertSourceAndCachedResult(workbook, "FODS tay");
    const pivot = workbook.pivotTablesBySheet.BangTongHop?.[0];
    assertPivotConfig(pivot, "FODS tay");
    assert(workbook.pivotTablesBySheet.DoanhThuNguon.length === 0, "pivot không được gắn vào sheet nguồn");
  });

  test("DataPilot cùng sheet nguồn không map (refresh sẽ xóa nguồn)", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  <office:body><office:spreadsheet>
    <table:table table:name="KeToan">
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Khu vực</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Doanh thu</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Bắc</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="120"><text:p>120</text:p></table:table-cell>
      </table:table-row>
    </table:table>
    <table:data-pilot-tables>
      <table:data-pilot-table table:name="CungSheet" table:target-range-address="KeToan.D1:KeToan.E4">
        <table:source-cell-range table:cell-range-address="KeToan.A1:KeToan.B2"/>
        <table:data-pilot-field table:source-field-name="Khu vực" table:orientation="row" table:function="auto"/>
        <table:data-pilot-field table:source-field-name="Doanh thu" table:orientation="data" table:function="sum"/>
      </table:data-pilot-table>
    </table:data-pilot-tables>
  </office:spreadsheet></office:body>
</office:document>`;
    const workbook = new SheetAdapter(null).parseFods(xml);
    assert(workbook.sheetsData.KeToan.get("B2")?.val === 120, "ô nguồn cùng sheet bị mất");
    assert(workbook.pivotTablesBySheet.KeToan.length === 0, `cùng sheet không được map: ${JSON.stringify(workbook.pivotTablesBySheet)}`);
  });

  test("loadFromFods gắn pivotTablesBySheet trên grid, dữ liệu nguồn và bảng kết quả còn", () => {
    const grid = new SheetGridController(container());
    const xml = fs.readFileSync(FODS, "utf8");
    assert(new SheetAdapter(grid).loadFromFods(xml), "loadFromFods thất bại");
    assert(grid.sheets.join("|") === "DoanhThuNguon|BangTongHop", `sheets=${grid.sheets.join("|")}`);
    assert(grid.sheetsData.DoanhThuNguon.get("C2")?.val === 120, "loadFromFods mất T1 Bắc 120");
    assert(grid.pivotTablesBySheet.DoanhThuNguon.length === 0, "state pivot rò sang sheet nguồn");
    assertPivotConfig(grid.pivotTablesBySheet.BangTongHop[0], "loadFromFods");
  });

  await asyncTest("Config import tương thích PivotTableEngine.refresh (không throw)", async () => {
    const grid = new SheetGridController(container());
    assert(new SheetAdapter(grid).loadFromFods(fs.readFileSync(FODS, "utf8")), "loadFromFods thất bại");
    await grid.initializeOptionalDocumentFeatures();
    const ok = grid.refreshPivotTable("BangTongHop", false);
    assert(ok, "refreshPivotTable phải chạy được với config import");
    assert(grid.sheetsData.BangTongHop.get("A2")?.val === "Bắc", `A2 sau refresh=${grid.sheetsData.BangTongHop.get("A2")?.val}`);
    assert(grid.sheetsData.BangTongHop.get("B2")?.val === 120, `Bắc T1 sau refresh phải 120, được ${grid.sheetsData.BangTongHop.get("B2")?.val}`);
    assert(grid.sheetsData.DoanhThuNguon.get("C2")?.val === 120, "refresh không được đụng sheet nguồn");
  });

  test("XLSX soffice là Pivot Excel native, không phải bảng thường", () => {
    assert(fs.existsSync(XLSX), `Thiếu fixture XLSX: ${XLSX}`);
    const table = readZipEntry(XLSX, "xl/pivotTables/pivotTable1.xml");
    const cache = readZipEntry(XLSX, "xl/pivotCache/pivotCacheDefinition1.xml");
    assert(table, "xlsx thiếu xl/pivotTables/pivotTable1.xml");
    assert(cache, "xlsx thiếu xl/pivotCache/pivotCacheDefinition1.xml");
    const tableXml = table.toString("utf8");
    const cacheXml = cache.toString("utf8");
    assert(tableXml.includes('name="DoanhThuTheoKhuVuc"'), "pivotTable name sai");
    assert(/sheet="DoanhThuNguon"/.test(cacheXml) && /ref="A1:C10"/.test(cacheXml), "pivotCache nguồn sai");
  });

  test("FODS soffice (XLSX→FODS, range Sheet.A1:Sheet.E6) parse đúng DataPilot", () => {
    const workbook = new SheetAdapter(null).parseFods(SOFFICE_PIVOT_FODS);
    assertSourceAndCachedResult(workbook, "FODS soffice");
    assertPivotConfig(workbook.pivotTablesBySheet.BangTongHop?.[0], "FODS soffice");
    assert(workbook.sheetsData.BangTongHop.get("A1")?.val === "Sum - Doanh thu", "phải giữ caption Calc, không flatten");
  });

  await asyncTest("adapter.open() nạp FODS soffice: nhận pivot, không mất số liệu", async () => {
    const grid = new SheetGridController(container());
    const adapter = new SheetAdapter(grid);
    const orig = globalUnoBridge.openRealFile;
    globalUnoBridge.openRealFile = async () => ({ status: "ok", content: SOFFICE_PIVOT_FODS, fileName: "sample-sheet-pivot.xlsx" });
    try {
      const ok = await adapter.open();
      assert(ok, "open() trả về false");
      assert(grid.sheetsData.DoanhThuNguon.get("C2")?.val === 120, "open() mất dữ liệu nguồn");
      const resultNumbers = [...grid.sheetsData.BangTongHop.values()].map(item => item?.val).filter(value => typeof value === "number");
      assert(resultNumbers.includes(120) && resultNumbers.includes(935), `open() mất số bảng kết quả: ${resultNumbers.join(",")}`);
      assertPivotConfig(grid.pivotTablesBySheet.BangTongHop[0], "open()");
      assert(adapter.sourceFileName === "sample-sheet-pivot", `sourceFileName=${adapter.sourceFileName}`);
    } finally {
      globalUnoBridge.openRealFile = orig;
    }
  });

  return results;
}
