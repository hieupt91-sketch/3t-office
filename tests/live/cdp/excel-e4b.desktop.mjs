import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp } from "./session.mjs";
import { click, insertText, sleep } from "./actions.mjs";

const root = process.env.VNO_APP_ROOT;
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!root || !profile) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
mkdirSync(profile, { recursive: true });

const template = path.join(profile, "excel-e4b-template.xlsx");
const output = path.join(profile, "excel-e4b-result.xlsx");
execFileSync("python", ["-c", [
  "import openpyxl,sys",
  "w=openpyxl.Workbook(); s=w.active; s.title='Bao cao'",
  "s['A1']='Thang'; s['B1']='Doanh thu'",
  "s['A2']='T1'; s['B2']=120",
  "s['A3']='T2'; s['B3']=180",
  "w.save(sys.argv[1])"
].join(";"), template], { stdio: "inherit" });
copyFileSync(template, output);

async function waitLoaded(session) {
  const wanted = output.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(() => {
    const a=window.__vnoAppInstance?.adapter;
    const p=String(a?._sourcePath||a?.sourceFilePath||'').replace(/\\\\/g,'/').toLowerCase();
    return p===${JSON.stringify(wanted)} && window.__vnoAppInstance?.grid?.cellsData?.size>0;
  })()`, { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
}

let session = await launchApp("sheet", { filePath: output, localAppData: profile, root });
try {
  console.log(`CDP_PORT ${session.debugPort} PID ${session.child.pid} PROFILE ${profile}`);
  await waitLoaded(session);
  await click(session.cdp, '.vno-grid-cell[data-coord="D5"]');
  await click(session.cdp, "#vno-ribbon-tab-view");
  await click(session.cdp, '[data-command-id="sheet.view.split"]');
  const split = await session.cdp.evaluate(`(() => { const g=window.__vnoAppInstance.grid; return {
    row:g.splitRow,col:g.splitCol,x:g.splitX,y:g.splitY,frozen:g.isFrozenPanes,
    bars:document.querySelectorAll('.vno-sheet-split-bar').length
  }; })()`);
  if (split.row !== 4 || split.col !== 3 || split.frozen || split.bars !== 2) {
    throw new Error(`Split UI/model mismatch: ${JSON.stringify(split)}`);
  }

  const chartId = await session.cdp.evaluate(`(async () => {
    const g=window.__vnoAppInstance.grid;
    await g.initializeOptionalDocumentFeatures();
    return g.insertChart('bar',{start:{c:'A',r:1},end:{c:'B',r:3}}).id;
  })()`, { awaitPromise: true });
  await session.cdp.waitFor(`!!document.querySelector('[data-chart-id=${JSON.stringify(chartId)}] [data-chart-axis-titles]')`);
  await click(session.cdp, `[data-chart-id="${chartId}"] [data-chart-axis-titles]`);
  await session.cdp.waitFor("!!document.querySelector('.vno-chart-axis-dialog')");
  await click(session.cdp, "#vno-chart-axis-x");
  await insertText(session.cdp, "Tháng báo cáo");
  await click(session.cdp, "#vno-chart-axis-y");
  await insertText(session.cdp, "Doanh thu thuần");
  await click(session.cdp, "[data-axis-apply]");
  const chart = await session.cdp.evaluate(`window.__vnoAppInstance.grid.getCharts()[0]`);
  if (chart.xAxisTitle !== "Tháng báo cáo" || chart.yAxisTitle !== "Doanh thu thuần") {
    throw new Error(`Axis title UI mismatch: ${JSON.stringify(chart)}`);
  }
  await session.cdp.evaluate("window.__vnoAppInstance.adapter.isDirty=true");
  const saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 300000 });
  if (saved === false || saved?.status === "error") throw new Error(`Save failed: ${JSON.stringify(saved)}`);
  console.log(`MODEL ${JSON.stringify({ split, xAxisTitle: chart.xAxisTitle, yAxisTitle: chart.yAxisTitle })}`);
} finally {
  await session.close();
}

const native = JSON.parse(execFileSync("python", ["-c", [
  "import json,re,sys,zipfile",
  "z=zipfile.ZipFile(sys.argv[1])",
  "s=z.read('xl/worksheets/sheet1.xml').decode('utf-8')",
  "p=re.search(r'<pane\\b[^>]*/?>',s)",
  "charts=[z.read(n).decode('utf-8') for n in z.namelist() if re.match(r'xl/charts/chart\\d+\\.xml$',n)]",
  "texts=lambda x: re.findall(r'<a:t>(.*?)</a:t>',x)",
  "print(json.dumps({'pane':p.group(0) if p else '', 'chartTexts':[texts(x) for x in charts]},ensure_ascii=False))"
].join(";"), output], { encoding: "utf8" }));
if (!/state="split"/.test(native.pane) || /state="frozen/.test(native.pane)) throw new Error(`OOXML pane mismatch: ${native.pane}`);
const nativeTexts = native.chartTexts.flat();
if (!nativeTexts.includes("Tháng báo cáo") || !nativeTexts.includes("Doanh thu thuần")) {
  throw new Error(`OOXML axis titles missing: ${JSON.stringify(native)}`);
}
console.log(`OOXML ${JSON.stringify(native)}`);

session = await launchApp("sheet", { filePath: output, localAppData: profile, root });
try {
  await waitLoaded(session);
  await sleep(500);
  const reopened = await session.cdp.evaluate(`(() => { const g=window.__vnoAppInstance.grid; const c=g.getCharts()[0]; return {
    row:g.splitRow,col:g.splitCol,x:g.splitX,y:g.splitY,frozen:g.isFrozenPanes,
    xAxisTitle:c?.xAxisTitle,yAxisTitle:c?.yAxisTitle
  }; })()`);
  if (reopened.row !== 4 || reopened.col !== 3 || reopened.frozen
    || reopened.xAxisTitle !== "Tháng báo cáo" || reopened.yAxisTitle !== "Doanh thu thuần") {
    throw new Error(`Reopen mismatch: ${JSON.stringify(reopened)}`);
  }
  console.log(`REOPEN ${JSON.stringify(reopened)}`);
} finally {
  await session.close();
}

console.log(`PASS ${output}`);
