/**
 * Sheet Charts import fidelity.
 *
 * Fixture: hand-written FODS <chart:chart> → soffice --convert-to xlsx (NOT VN serialize).
 * VN Sheet open path: xlsx → soffice --convert-to fods → parseFods/loadFromFods.
 * Live soffice convert is in tests/scripts/probe-sheet-charts-import.mjs (not this suite)
 * so run-tests.js stays under 60s. SOFFICE_CHART_FODS is the chart block soffice
 * actually wrote from that XLSX (no plot-area cell-range-address, local-table cache,
 * preview <draw:image> beside live <draw:object>/<chart:chart>).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { readZipEntry } from "../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FODS = path.join(root, "tests", "fixtures", "real-office-samples", "src", "sample-sheet-charts.fods");
const XLSX = path.join(root, "tests", "fixtures", "real-office-samples", "sample-sheet-charts.xlsx");

/** Captured from soffice XLSX→FODS of sample-sheet-charts.xlsx (probe 05/09/2026). */
const SOFFICE_CHART_FODS = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0"
 xmlns:xlink="http://www.w3.org/1999/xlink"
 xmlns:chartooo="http://openoffice.org/2010/chart"
 office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  <office:body><office:spreadsheet>
    <table:table table:name="DoanhThu">
      <table:shapes>
        <draw:frame draw:z-index="0" draw:name="BieuDoCot" svg:width="11.999cm" svg:height="7.999cm" svg:x="0.984cm" svg:y="0.4cm">
          <draw:object draw:notify-on-update-of-ranges="DoanhThu.A2:DoanhThu.A5 DoanhThu.B1:DoanhThu.B1 DoanhThu.B2:DoanhThu.B5">
            <office:document office:mimetype="application/vnd.oasis.opendocument.chart">
              <office:body><office:chart>
                <chart:chart svg:width="12cm" svg:height="8cm" xlink:href=".." xlink:type="simple" chart:class="chart:bar">
                  <chart:title><text:p><text:span>Doanh thu theo tháng</text:span></text:p></chart:title>
                  <chart:plot-area chart:style-name="ch4" svg:x="0.24cm" svg:y="1.065cm" svg:width="9.178cm" svg:height="6.775cm">
                    <chart:axis chart:dimension="x" chart:name="primary-x">
                      <chart:categories table:cell-range-address="DoanhThu.A2:DoanhThu.A5"/>
                    </chart:axis>
                    <chart:series chart:values-cell-range-address="DoanhThu.B2:DoanhThu.B5" chart:label-cell-address="DoanhThu.B1:DoanhThu.B1" chart:class="chart:bar">
                      <chart:data-point chart:repeated="4"/>
                    </chart:series>
                  </chart:plot-area>
                  <table:table table:name="local-table">
                    <table:table-header-rows>
                      <table:table-row>
                        <table:table-cell/><table:table-cell office:value-type="string"><text:p>Doanh thu</text:p></table:table-cell>
                      </table:table-row>
                    </table:table-header-rows>
                    <table:table-rows>
                      <table:table-row>
                        <table:table-cell office:value-type="string"><text:p>T1</text:p></table:table-cell>
                        <table:table-cell office:value-type="float" office:value="120"><text:p>120</text:p></table:table-cell>
                      </table:table-row>
                    </table:table-rows>
                  </table:table>
                </chart:chart>
              </office:chart></office:body>
            </office:document>
          </draw:object>
          <draw:image>
            <office:binary-data>QQ==</office:binary-data>
          </draw:image>
        </draw:frame>
      </table:shapes>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Tháng</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Doanh thu</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>T1</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="120"><text:p>120</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>T2</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="150"><text:p>150</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>T3</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="180"><text:p>180</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>T4</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="200"><text:p>200</text:p></table:table-cell>
      </table:table-row>
    </table:table>
  </office:spreadsheet></office:body>
</office:document>`;

function assert(condition, message) { if (!condition) throw new Error(message); }

function container() {
  return { querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, classList: { add() {}, remove() {}, toggle() {} } };
}

function assertSourceCells(workbook, context) {
  assert(workbook.sheets.includes("DoanhThu"), `${context}: thiếu sheet DoanhThu, có ${workbook.sheets.join("|")}`);
  assert(!workbook.sheets.includes("local-table"), `${context}: local-table bị leak thành sheet: ${workbook.sheets.join("|")}`);
  assert(!workbook.sheets.includes("Trang tính 2"), `${context}: table-row bị nhận nhầm sheet: ${workbook.sheets.join("|")}`);
  const data = workbook.sheetsData.DoanhThu;
  assert(data.get("A1")?.val === "Tháng" && data.get("B1")?.val === "Doanh thu", `${context}: header sai ${JSON.stringify(data.get("A1"))}/${JSON.stringify(data.get("B1"))}`);
  assert(data.get("A2")?.val === "T1" && data.get("B2")?.val === 120, `${context}: T1 120 sai`);
  assert(data.get("A5")?.val === "T4" && data.get("B5")?.val === 200, `${context}: T4 200 sai`);
}

function assertImportedBarChart(chart, context) {
  assert(chart, `${context}: thiếu chart`);
  assert(chart.type === "bar", `${context}: type=${chart.type}`);
  assert(chart.range?.start?.c === "A" && chart.range?.start?.r === 2, `${context}: start=${JSON.stringify(chart.range?.start)}`);
  assert(chart.range?.end?.c === "B" && chart.range?.end?.r === 5, `${context}: end=${JSON.stringify(chart.range?.end)}`);
  assert(chart.title === "Doanh thu theo tháng", `${context}: title=${chart.title}`);
  assert(JSON.stringify(chart.labels) === JSON.stringify(["T1", "T2", "T3", "T4"]), `${context}: labels=${JSON.stringify(chart.labels)}`);
  assert(JSON.stringify(chart.data) === JSON.stringify([120, 150, 180, 200]), `${context}: data=${JSON.stringify(chart.data)}`);
}

export async function runSheetChartsImportTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const asyncTest = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test("Hiện trạng: FODS không chart không bị lỗi và không bịa biểu đồ", () => {
    const xml = fs.readFileSync(path.join(root, "tests", "fixtures", "real-office-samples", "src", "sample-sheet.fods"), "utf8");
    const workbook = new SheetAdapter(null).parseFods(xml);
    assert(workbook.sheets.includes("Doanh thu"), "mất sheet Doanh thu");
    assert(Array.isArray(workbook.chartsBySheet["Doanh thu"]) && workbook.chartsBySheet["Doanh thu"].length === 0, `không chart phải rỗng: ${JSON.stringify(workbook.chartsBySheet)}`);
  });

  test("parseFods đọc chart:chart tay (ODF 1.3) vào đúng model chartsBySheet", () => {
    const xml = fs.readFileSync(FODS, "utf8");
    assert(/<chart:chart\b/i.test(xml), "fixture FODS phải có chart:chart");
    assert(/chart:class="chart:bar"/i.test(xml), "fixture FODS phải là chart:bar");
    assert(/<draw:object\b/i.test(xml), "fixture FODS phải có draw:object");
    const workbook = new SheetAdapter(null).parseFods(xml);
    assertSourceCells(workbook, "FODS tay");
    assert(workbook.sheets.length === 1, `FODS tay không được thêm sheet ảo: ${workbook.sheets.join("|")}`);
    assertImportedBarChart(workbook.chartsBySheet.DoanhThu?.[0], "FODS tay");
  });

  test("Nested local-table + draw:image preview không flatten mất chart và không leak sheet", () => {
    const workbook = new SheetAdapter(null).parseFods(SOFFICE_CHART_FODS);
    assertSourceCells(workbook, "FODS soffice");
    assert(workbook.sheets.length === 1 && workbook.sheets[0] === "DoanhThu", `sheets=${workbook.sheets.join("|")}`);
    assertImportedBarChart(workbook.chartsBySheet.DoanhThu?.[0], "FODS soffice");
  });

  test("parseFods giữ vị trí neo chart svg:x/y để lần lưu không dồn chart về mặc định", () => {
    const workbook = new SheetAdapter(null).parseFods(SOFFICE_CHART_FODS);
    const chart = workbook.chartsBySheet.DoanhThu?.[0];
    assert(chart, "Thiếu chart đã import");
    assert(chart.x === 37, `x=${chart.x}; mong đợi 0.984 cm đổi sang px`);
    assert(chart.y === 15, `y=${chart.y}; mong đợi 0.4 cm đổi sang px`);
  });

  test("parseFods ánh xạ anchor DrawingML từ XLSX sang tọa độ lưới", () => {
    const xml = SOFFICE_CHART_FODS
      .replace('office:mimetype="application/vnd.oasis.opendocument.spreadsheet"', 'office:mimetype="application/vnd.oasis.opendocument.spreadsheet" xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0"')
      .replace('<draw:frame ', '<draw:frame vno:chart-anchor-from-col="15" vno:chart-anchor-from-colOff="9525" vno:chart-anchor-from-row="1" vno:chart-anchor-from-rowOff="19050" ');
    const chart = new SheetAdapter(null).parseFods(xml).chartsBySheet.DoanhThu?.[0];
    assert(chart?.x === 961, `x=${chart?.x}; mong đợi cột P + colOff`);
    assert(chart?.y === 22, `y=${chart?.y}; mong đợi hàng 2 + rowOff`);
  });

  test("parseFods giữ loại và trục từng chuỗi trong biểu đồ kết hợp", () => {
    const xml = `<?xml version="1.0"?><office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0" office:mimetype="application/vnd.oasis.opendocument.spreadsheet"><office:body><office:spreadsheet><table:table table:name="Data"><table:shapes><draw:frame svg:x="1cm" svg:y="1cm" vno:chart-type="combo"><draw:object><chart:chart chart:class="chart:bar"><chart:plot-area><chart:axis chart:dimension="x"><chart:categories table:cell-range-address="Data.A2:Data.A3"/></chart:axis><chart:series chart:class="chart:bar" chart:values-cell-range-address="Data.B2:Data.B3" chart:label-cell-address="Data.B1"/><chart:series chart:class="chart:bar" chart:values-cell-range-address="Data.C2:Data.C3" chart:label-cell-address="Data.C1"/><chart:series chart:class="chart:line" chart:values-cell-range-address="Data.D2:Data.D3" chart:label-cell-address="Data.D1"/></chart:plot-area></chart:chart></draw:object></draw:frame></table:shapes><table:table-row><table:table-cell office:value-type="string"><text:p>Kỳ</text:p></table:table-cell><table:table-cell office:value-type="string"><text:p>Thu</text:p></table:table-cell><table:table-cell office:value-type="string"><text:p>Chi</text:p></table:table-cell><table:table-cell office:value-type="string"><text:p>Lũy kế</text:p></table:table-cell></table:table-row><table:table-row><table:table-cell office:value-type="string"><text:p>T1</text:p></table:table-cell><table:table-cell office:value-type="float" office:value="10"><text:p>10</text:p></table:table-cell><table:table-cell office:value-type="float" office:value="20"><text:p>20</text:p></table:table-cell><table:table-cell office:value-type="float" office:value="200"><text:p>200</text:p></table:table-cell></table:table-row><table:table-row><table:table-cell office:value-type="string"><text:p>T2</text:p></table:table-cell><table:table-cell office:value-type="float" office:value="15"><text:p>15</text:p></table:table-cell><table:table-cell office:value-type="float" office:value="25"><text:p>25</text:p></table:table-cell><table:table-cell office:value-type="float" office:value="250"><text:p>250</text:p></table:table-cell></table:table-row></table:table></office:spreadsheet></office:body></office:document>`;
    const chart = new SheetAdapter(null).parseFods(xml).chartsBySheet.Data?.[0];
    assert(chart?.type === "combo", `type=${chart?.type}`);
    assert(chart.series.map(item => item.chartType).join(",") === "bar,bar,line", JSON.stringify(chart.series));
    assert(chart.series.map(item => item.axisGroup).join(",") === "primary,primary,secondary", JSON.stringify(chart.series));
  });

  test("chart:class không thuộc 4 loại SVG VN Sheet thì bỏ qua, không bịa type", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0"
 office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  <office:body><office:spreadsheet>
    <table:table table:name="KeToan">
      <table:shapes>
        <draw:frame>
          <draw:object>
            <chart:chart chart:class="chart:stock">
              <chart:series chart:values-cell-range-address="KeToan.B2:KeToan.B3" chart:class="chart:stock"/>
            </chart:chart>
          </draw:object>
        </draw:frame>
      </table:shapes>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>T1</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="10"><text:p>10</text:p></table:table-cell>
      </table:table-row>
    </table:table>
  </office:spreadsheet></office:body>
</office:document>`;
    const workbook = new SheetAdapter(null).parseFods(xml);
    assert(workbook.sheetsData.KeToan.get("B1")?.val === 10 || workbook.sheetsData.KeToan.get("B2")?.val === 10 || workbook.sheets.includes("KeToan"), "mất sheet KeToan");
    assert(workbook.chartsBySheet.KeToan.length === 0, `stock chart không được map: ${JSON.stringify(workbook.chartsBySheet)}`);
  });

  test("Nhiều series: chỉ lấy series đầu, ghi seriesCount", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0"
 office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  <office:body><office:spreadsheet>
    <table:table table:name="DoanhThu">
      <table:shapes>
        <draw:frame>
          <draw:object>
            <chart:chart chart:class="chart:line">
              <chart:title><text:p>Hai series</text:p></chart:title>
              <chart:plot-area table:cell-range-address="DoanhThu.A1:DoanhThu.C3">
                <chart:categories table:cell-range-address="DoanhThu.A2:DoanhThu.A3"/>
                <chart:series chart:values-cell-range-address="DoanhThu.B2:DoanhThu.B3" chart:class="chart:line"/>
                <chart:series chart:values-cell-range-address="DoanhThu.C2:DoanhThu.C3" chart:class="chart:line"/>
              </chart:plot-area>
            </chart:chart>
          </draw:object>
        </draw:frame>
      </table:shapes>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Tháng</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>A</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>B</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>T1</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="10"><text:p>10</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="20"><text:p>20</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>T2</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="11"><text:p>11</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="21"><text:p>21</text:p></table:table-cell>
      </table:table-row>
    </table:table>
  </office:spreadsheet></office:body>
</office:document>`;
    const workbook = new SheetAdapter(null).parseFods(xml);
    const chart = workbook.chartsBySheet.DoanhThu?.[0];
    assert(chart?.type === "line", `type=${chart?.type}`);
    assert(chart.seriesCount === 2, `seriesCount=${chart.seriesCount}`);
    assert(JSON.stringify(chart.data) === JSON.stringify([10, 11]), `chỉ series B, được ${JSON.stringify(chart.data)}`);
    assert(JSON.stringify(chart.labels) === JSON.stringify(["T1", "T2"]), `labels=${JSON.stringify(chart.labels)}`);
  });

  test("loadFromFods gắn chartsBySheet trên grid, dữ liệu nguồn còn", () => {
    const grid = new SheetGridController(container());
    assert(new SheetAdapter(grid).loadFromFods(fs.readFileSync(FODS, "utf8")), "loadFromFods thất bại");
    assert(grid.sheets.join("|") === "DoanhThu", `sheets=${grid.sheets.join("|")}`);
    assert(grid.sheetsData.DoanhThu.get("B5")?.val === 200, "loadFromFods mất T4 200");
    assertImportedBarChart(grid.chartsBySheet.DoanhThu[0], "loadFromFods");
  });

  test("XLSX soffice là Chart Excel native (xl/charts/chart1.xml), không phải ảnh", () => {
    assert(fs.existsSync(XLSX), `Thiếu fixture XLSX: ${XLSX}`);
    const chartXml = readZipEntry(XLSX, "xl/charts/chart1.xml");
    const drawing = readZipEntry(XLSX, "xl/drawings/drawing1.xml");
    assert(chartXml, "xlsx thiếu xl/charts/chart1.xml");
    assert(drawing, "xlsx thiếu xl/drawings/drawing1.xml");
    const text = chartXml.toString("utf8");
    assert(/<c:barChart\b/.test(text), "xlsx không phải c:barChart");
    assert(text.includes("DoanhThu!$B$2:$B$5"), "xlsx mất formula giá trị B2:B5");
    assert(text.includes("DoanhThu!$A$2:$A$5"), "xlsx mất formula category A2:A5");
    assert(text.includes("Doanh thu theo tháng"), "xlsx mất title");
    assert(text.includes(">120<") && text.includes(">200<"), "xlsx mất cache 120/200");
    assert(/<c:chart\b/.test(drawing.toString("utf8")) || /graphicData/.test(drawing.toString("utf8")), "drawing1.xml không nhúng graphicFrame chart");
    const drawingRels = readZipEntry(XLSX, "xl/drawings/_rels/drawing1.xml.rels");
    assert(drawingRels && /charts\/chart1\.xml/.test(drawingRels.toString("utf8")), "drawing rels không trỏ tới xl/charts/chart1.xml");
  });

  test("serializeToFods ghi chart:chart và parseFods đọc lại đúng range/type/title", () => {
    const grid = new SheetGridController(container());
    const adapter = new SheetAdapter(grid);
    assert(adapter.loadFromFods(fs.readFileSync(FODS, "utf8")), "loadFromFods thất bại");
    const saved = adapter.serializeToFods();
    assert(saved.includes("DoanhThu") && saved.includes(">200<"), "serialize mất dữ liệu ô");
    assert(/<chart:chart\b/i.test(saved), "serialize phải ghi chart:chart khi workbook có biểu đồ");
    assert(/chart:class="chart:bar"/i.test(saved), "serialize phải giữ class bar");
    assert(/chart:values-cell-range-address="[^"]*B2[^"]*B5/i.test(saved), "serialize phải trỏ series B2:B5");
    const roundTrip = new SheetAdapter(null).parseFods(saved);
    assertImportedBarChart(roundTrip.chartsBySheet.DoanhThu?.[0], "serializeToFods -> parseFods");
  });

  await asyncTest("adapter.open() nạp FODS soffice: nhận chart, không mất số liệu", async () => {
    const grid = new SheetGridController(container());
    const adapter = new SheetAdapter(grid);
    const orig = globalUnoBridge.openRealFile;
    globalUnoBridge.openRealFile = async () => ({ status: "ok", content: SOFFICE_CHART_FODS, fileName: "sample-sheet-charts.xlsx" });
    try {
      const ok = await adapter.open();
      assert(ok, "open() trả về false");
      assert(grid.sheetsData.DoanhThu.get("B2")?.val === 120, "open() mất T1 120");
      assertImportedBarChart(grid.chartsBySheet.DoanhThu[0], "open()");
      assert(adapter.sourceFileName === "sample-sheet-charts", `sourceFileName=${adapter.sourceFileName}`);
    } finally {
      globalUnoBridge.openRealFile = orig;
    }
  });

  return results;
}
