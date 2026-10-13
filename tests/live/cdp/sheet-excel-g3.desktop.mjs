// EXCEL-G3 desktop acceptance: create charts through UI, save XLSX and reopen.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, sleep } from "./actions.mjs";
import { listZipEntries, readZipEntry } from "../../helpers/zip-package.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA to a dedicated EXCEL-G3 profile.");
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "excel-g3-roundtrip.xlsx");
copyFileSync(path.resolve("tests/live/cdp/test_sheet_home.xlsx"), file);

const types = ["bar-horizontal", "column-stacked", "column-stacked-100", "scatter", "combo", "radar", "bubble"];
const check = (condition, message, detail = "") => {
  if (!condition) throw new Error(`${message}${detail ? ` | ${detail}` : ""}`);
  console.log(`PASS | ${message}${detail ? ` | ${detail}` : ""}`);
};

let session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  await cdp.evaluate(`(() => { const g=window.__vnoAppInstance.grid;
    [["A",1,"Tháng"],["B",1,"Thực hiện"],["C",1,"Kế hoạch"],["D",1,"Quy mô"],
     ["A",2,"T1"],["B",2,10],["C",2,14],["D",2,5],
     ["A",3,"T2"],["B",3,18],["C",3,16],["D",3,8],
     ["A",4,"T3"],["B",4,25],["C",4,23],["D",4,12]].forEach(([c,r,v])=>g.setCellValue(c,r,v));
    g.selectCell("A",1);g.selectCell("D",4,true);return true; })()`);
  await click(cdp, "#vno-ribbon-tab-insert");
  for (const type of types) {
    await click(cdp, '[data-command-id="sheet.chart.insert"]');
    await cdp.waitFor(`!!document.querySelector('[data-chart-type="${type}"]')`, { timeoutMilliseconds: 10000 });
    await click(cdp, `[data-chart-type="${type}"]`);
    await click(cdp, "[data-chart-apply]");
    await cdp.waitFor(`window.__vnoAppInstance.grid.getCharts().some(c=>c.type==="${type}")`, { timeoutMilliseconds: 10000 });
    check(await cdp.evaluate(`!!document.querySelector('svg[data-chart-type="${type}"]')`), `UI tạo ${type}`);
  }
  await cdp.evaluate(`(() => { const panels=[...document.querySelectorAll('.vno-sheet-chart')]; const combo=window.__vnoAppInstance.grid.getCharts().find(c=>c.type==='combo'); const panel=panels.find(p=>p.dataset.chartId===combo.id); panel.querySelector('[data-chart-data-labels]').click(); panel.querySelector('[data-chart-switch]').click(); panel.querySelector('[data-chart-trendline]').click(); return true; })()`);
  const combo = JSON.parse(await cdp.evaluate(`JSON.stringify((()=>{const c=window.__vnoAppInstance.grid.getCharts().find(x=>x.type==='combo');return {dataLabels:c.dataLabels,switchRowsColumns:c.switchRowsColumns,trendline:c.trendline,series:c.series.length}})())`));
  check(combo.dataLabels && combo.switchRowsColumns && combo.trendline && combo.series >= 2, "UI bật nhãn/chuyển hàng-cột/đường xu hướng", JSON.stringify(combo));
  await cdp.evaluate("window.__vnoAppInstance.adapter.isDirty=true");
  const saved = await cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 180000 });
  check(saved !== false, "Lưu XLSX qua app desktop");
  await sleep(1000);
} finally {
  await session.close();
}

const packageBytes = readFileSync(file);
const chartParts = listZipEntries(packageBytes).map(entry => entry.name).filter(name => /^xl\/charts\/chart\d+\.xml$/i.test(name)).sort();
check(chartParts.length === types.length, "XLSX có đủ chart native", String(chartParts.length));
const xmls = chartParts.map(name => readZipEntry(packageBytes, name).toString("utf8"));
for (const marker of ["barDir val=\"bar\"", "grouping val=\"stacked\"", "grouping val=\"percentStacked\"", "scatterChart", "lineChart", "radarChart", "bubbleChart"]) {
  check(xmls.some(xml => xml.includes(marker)), `OOXML có ${marker}`);
}
check(xmls.some(xml => xml.includes('<c:showVal val="1"') && xml.includes("<c:trendline")), "OOXML giữ nhãn dữ liệu và đường xu hướng");

session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  await session.cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  const reopened = JSON.parse(await session.cdp.evaluate(`JSON.stringify(window.__vnoAppInstance.grid.getCharts().map(c=>({type:c.type,dataLabels:!!c.dataLabels,switchRowsColumns:!!c.switchRowsColumns,trendline:!!c.trendline,series:c.series?.length||0})))`));
  check(types.every(type => reopened.some(chart => chart.type === type)), "Mở lại giữ đủ loại biểu đồ", JSON.stringify(reopened));
  const reopenedCombo = reopened.find(chart => chart.type === "combo");
  check(reopenedCombo?.dataLabels && reopenedCombo?.switchRowsColumns && reopenedCombo?.trendline, "Mở lại giữ thành phần biểu đồ", JSON.stringify(reopenedCombo));
} finally {
  await session.close();
}
