// Bang (Table): chen hang/cot + dong tong qua menu API -> luu XLSX -> mo lai -> vung bang giu dung; doc XML bang goc.
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp } from "./session.mjs";
const root = process.env.VNO_APP_ROOT, profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!root || !profile) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
mkdirSync(profile, { recursive: true });
const template = path.join(profile, "tbl-template.xlsx"), output = path.join(profile, "tbl-result.xlsx");
execFileSync("python", ["-c", ["import openpyxl,sys", "w=openpyxl.Workbook(); s=w.active; s.title='Bang'", "[s.append(r) for r in [['Ten','SL'],['a',1],['b',2],['c',3]]]", "w.save(sys.argv[1])"].join(";"), template], { stdio: "inherit" });
copyFileSync(template, output);
const loaded = (s) => s.cdp.waitFor(`(() => { const a=window.__vnoAppInstance?.adapter; const p=String(a?._sourcePath||a?.sourceFilePath||'').replace(/\\\\/g,'/').toLowerCase(); return p===${JSON.stringify(output.replace(/\\/g, "/").toLowerCase())} && window.__vnoAppInstance?.grid?.cellsData?.size>0; })()`, { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let session = await launchApp("sheet", { filePath: output, localAppData: profile, root });
let ref1;
try {
  await loaded(session); await sleep(1500);
  ref1 = await session.cdp.evaluate(`(async () => { const g = window.__vnoAppInstance.grid; await g.initializeOptionalDocumentFeatures?.(); g.selectCell('A',1); g.selectCell('B',4,true); g.formatAsTable('tableBlue'); g.selectCell('B',3); g.insertTableRow(g.tablesBySheet[g.activeSheet][0].name, 'below'); g.insertTableColumn(g.tablesBySheet[g.activeSheet][0].name, 'right'); g.toggleTableTotalRow(g.tablesBySheet[g.activeSheet][0].name); return JSON.stringify(g.tablesBySheet[g.activeSheet].map(t => ({ ref: t.ref, totals: !!t.showTotals }))); })()`, { awaitPromise: true });
  console.log("MODEL", ref1);
  await session.cdp.evaluate("window.__vnoAppInstance.adapter.isDirty=true");
  const saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 300000 });
  if (saved === false || saved?.status === "error") throw new Error("Save failed " + JSON.stringify(saved));
} finally { await session.close(); }
const native = execFileSync("python", ["-c", ["import re,sys,zipfile", "z=zipfile.ZipFile(sys.argv[1])", "t=[z.read(n).decode('utf-8') for n in z.namelist() if re.match(r'xl/tables/table\\d+\\.xml$',n)]", "print(' || '.join(re.search(r'<table\\b[^>]*>',x).group(0)[:300] + ' tc=' + str(len(re.findall(r'<tableColumn\\b',x))) + ' totals=' + str('totalsRowCount' in x) for x in t))"].join(";"), output], { encoding: "utf8" }).trim();
console.log("OOXML", native);
session = await launchApp("sheet", { filePath: output, localAppData: profile, root });
try {
  await loaded(session); await sleep(1500);
  const re = await session.cdp.evaluate(`JSON.stringify(Object.values(window.__vnoAppInstance.grid.tablesBySheet).flat().map(t => ({ ref: t.ref, totals: !!t.showTotals })))`);
  console.log("REOPEN", re);
  const a = JSON.parse(ref1), b = JSON.parse(re);
  if (!b.length || a[0].ref !== b[0].ref) throw new Error(`Reopen table mismatch: ${ref1} vs ${re}`);
  console.log("PASS", output);
} finally { await session.close(); }