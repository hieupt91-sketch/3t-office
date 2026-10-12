/**
 * In-memory FODS serialize/parse for features that used to look correct on
 * canvas but were dropped on Save: charts, page breaks, sparklines, protect,
 * outline. Soffice round-trips live in tests/live/sheet-fods-*-real-conversion.mjs.
 */
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeBase(sheet = "Doanh thu") {
  return {
    sheets: [sheet],
    activeSheet: sheet,
    sheetsData: {
      [sheet]: new Map([
        ["A1", { val: "Tháng", formula: "", style: {} }],
        ["B1", { val: "Doanh thu", formula: "", style: {} }],
        ["A2", { val: "T1", formula: "", style: {} }],
        ["B2", { val: 120, formula: "", style: {} }],
        ["A3", { val: "T2", formula: "", style: {} }],
        ["B3", { val: 200, formula: "", style: {} }],
        ["C5", { val: "", formula: "", style: {}, sparkline: { type: "line", values: [120, 200], sourceRange: { start: { c: "B", r: 2 }, end: { c: "B", r: 3 } } } }]
      ])
    },
    commentsBySheet: { [sheet]: {} },
    mergedRangesBySheet: { [sheet]: [] },
    namedRangesBySheet: { [sheet]: [] },
    namedRangesWorkbook: [],
    printAreaBySheet: { [sheet]: null },
    conditionalFormattingBySheet: { [sheet]: [] },
    dataValidationsBySheet: { [sheet]: [] },
    chartsBySheet: {
      [sheet]: [{
        id: "chart-dt",
        type: "bar",
        range: { start: { c: "A", r: 1 }, end: { c: "B", r: 3 } },
        title: "Doanh thu theo tháng",
        xAxisTitle: "Tháng",
        yAxisTitle: "Doanh thu",
        labels: ["T1", "T2"],
        data: [120, 200]
      }]
    },
    pageBreaksBySheet: { [sheet]: { rows: [4], cols: ["C"] } },
    protectionBySheet: { [sheet]: { enabled: true, password: "session-only" } },
    workbookProtection: { enabled: true, password: "" },
    outlineGroupsBySheet: { [sheet]: [{ id: "outline-1", axis: "row", start: 2, end: 3, collapsed: true }] }
  };
}

export async function runSheetRealexportFodsTests() {
  const results = [];
  const test = (name, callback) => {
    try { callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test("serializeToFods ghi chart:chart, page-break, sparkline, protect, outline", () => {
    const xml = new SheetAdapter(makeBase()).serializeToFods();
    assert(/<chart:chart\b/i.test(xml), "thiếu chart:chart");
    assert(/chart:class="chart:bar"/i.test(xml), "thiếu chart:bar");
    assert(/chart:values-cell-range-address=/i.test(xml), "thiếu series values");
    assert(/chart:dimension="x"[\s\S]*?<chart:title><text:p>Tháng<\/text:p>/i.test(xml), "thiếu tiêu đề riêng trục X");
    assert(/chart:dimension="y"[\s\S]*?<chart:title><text:p>Doanh thu<\/text:p>/i.test(xml), "thiếu tiêu đề riêng trục Y");
    assert(/fo:break-before="page"/i.test(xml), "thiếu fo:break-before=page");
    assert(/<calcext:sparkline-groups>/i.test(xml), "thiếu sparkline-groups");
    assert(/calcext:type="line"/i.test(xml), "thiếu sparkline line");
    assert(/table:protected="true"/i.test(xml), "thiếu table:protected");
    assert(/table:structure-protected="true"/i.test(xml), "thiếu structure-protected");
    assert(/<table:table-row-group\b/i.test(xml), "thiếu table-row-group");
    assert(/table:display="false"/i.test(xml), "outline collapsed phải display=false");
  });

  test("parseFods đọc lại chart, page break, sparkline, protect, outline", () => {
    const sheet = "Doanh thu";
    const parsed = new SheetAdapter(null).parseFods(new SheetAdapter(makeBase()).serializeToFods());
    const chart = parsed.chartsBySheet[sheet]?.[0];
    assert(chart?.type === "bar", `chart type=${chart?.type}`);
    assert(chart?.title === "Doanh thu theo tháng", `title=${chart?.title}`);
    assert(chart?.xAxisTitle === "Tháng" && chart?.yAxisTitle === "Doanh thu", `axis titles=${JSON.stringify(chart)}`);
    assert(chart?.range?.start?.c === "A" && chart?.range?.end?.c === "B", `range=${JSON.stringify(chart?.range)}`);
    assert(JSON.stringify(chart?.data) === JSON.stringify([120, 200]), `data=${JSON.stringify(chart?.data)}`);
    assert(parsed.pageBreaksBySheet[sheet].rows.includes(4), `rows=${JSON.stringify(parsed.pageBreaksBySheet[sheet])}`);
    assert(parsed.pageBreaksBySheet[sheet].cols.includes("C"), `cols=${JSON.stringify(parsed.pageBreaksBySheet[sheet])}`);
    const spark = parsed.sheetsData[sheet].get("C5")?.sparkline;
    assert(spark?.type === "line", `spark=${JSON.stringify(spark)}`);
    assert(spark?.sourceRange?.start?.c === "B" && spark?.sourceRange?.end?.r === 3, `spark range=${JSON.stringify(spark?.sourceRange)}`);
    assert(parsed.protectionBySheet[sheet]?.enabled === true, "sheet protect");
    assert(parsed.workbookProtection?.enabled === true, "workbook protect");
    const group = parsed.outlineGroupsBySheet[sheet].find(item => item.axis === "row");
    assert(group?.start === 2 && group?.end === 3 && group?.collapsed === true, `outline=${JSON.stringify(group)}`);
  });

  test("serialize pie dùng chart:circle; PivotChart gắn vno:chart-kind", () => {
    const sheet = "Pivot";
    const grid = makeBase(sheet);
    grid.chartsBySheet[sheet] = [
      { id: "pie-1", type: "pie", range: { start: { c: "A", r: 1 }, end: { c: "B", r: 3 } }, title: "Cơ cấu", labels: ["T1", "T2"], data: [120, 200] },
      { id: "pivot-1", type: "bar", kind: "pivot", pivotId: "pivot-import-1", range: { start: { c: "A", r: 1 }, end: { c: "B", r: 3 } }, title: "Biểu đồ Pivot", labels: ["T1", "T2"], data: [120, 200] }
    ];
    const xml = new SheetAdapter(grid).serializeToFods();
    assert(/chart:class="chart:circle"/i.test(xml), "pie phải là chart:circle");
    assert(/vno:chart-kind="pivot"/i.test(xml), "PivotChart phải gắn vno:chart-kind");
    const parsed = new SheetAdapter(null).parseFods(xml);
    assert(parsed.chartsBySheet[sheet].some(item => item.type === "pie"), "parse pie");
    assert(parsed.chartsBySheet[sheet].some(item => item.kind === "pivot" && item.pivotId === "pivot-import-1"), "parse pivot kind");
  });

  return results;
}
