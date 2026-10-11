import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { click, mouseClick, sleep } from "../../tests/live/cdp/actions.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const profile = process.env.VNO_CDP_LOCALAPPDATA;
const op = process.env.S6_OP || "decInc";
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA to the dedicated S6 profile.");
if (!process.env.VNO_APP_ROOT) throw new Error("Set VNO_APP_ROOT to this worktree.");
mkdirSync(profile, { recursive: true });

const template = path.join(profile, "s6-template.xlsx");
execFileSync("python", ["-c", [
  "import sys, openpyxl",
  "w=openpyxl.Workbook(); s=w.active; s.title='Sheet1'",
  "s['B2']=1234.5; s['C2']=0.075; s['D2']=45000; s['E2']='VN Office'",
  "w.save(sys.argv[1])"
].join("; "), template], { stdio: "inherit" });
const output = path.join(profile, `app_${op}.xlsx`);
copyFileSync(template, output);

const operations = {
  decInc: { cell: "B2", kind: "button", id: "sheet.format.increaseDecimal" },
  decDec: { cell: "B2", kind: "button", id: "sheet.format.decreaseDecimal" },
  numNumber: { cell: "B2", kind: "select", id: "sheet.format.quickCategory", value: "number" },
  numCurrency: { cell: "B2", kind: "select", id: "sheet.format.quickCategory", value: "currency" },
  numAccounting: { cell: "B2", kind: "select", id: "sheet.format.quickCategory", value: "accounting" },
  numDate: { cell: "D2", kind: "select", id: "sheet.format.quickCategory", value: "date" },
  numPercent: { cell: "C2", kind: "select", id: "sheet.format.quickCategory", value: "percentage" },
  percentBtn: { cell: "C2", kind: "button", id: "sheet.format.percent" },
  thousands: { cell: "B2", kind: "button", id: "sheet.format.standard" },
  fillDefault: { cell: "E2", kind: "button", id: "sheet.cell.fillColor" },
  textColorDefault: { cell: "E2", kind: "button", id: "sheet.cell.textColor" },
};
const action = operations[op];
if (!action) throw new Error(`Unknown S6 operation: ${op}`);

const session = await launchApp("sheet", { filePath: output, localAppData: profile, root: process.env.VNO_APP_ROOT });
try {
  console.log(`CDP_PORT ${session.debugPort} | PROFILE ${session.localAppData} | OP ${op}`);
  const expectedPath = output.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(() => { const a=window.__vnoAppInstance?.adapter; const p=String(a?._sourcePath||a?.sourceFilePath||'').replace(/\\\\/g,'/').toLowerCase(); return p===${JSON.stringify(expectedPath)} && window.__vnoAppInstance?.grid?.cellsData?.size>0 && !document.querySelector('.vno-sheet-quick-view'); })()`, { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  const cell = action.cell;
  const pos = await session.cdp.evaluate(`(() => { const e=document.querySelector('.vno-grid-cell[data-coord=${JSON.stringify(cell)}]'); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  if (!pos) throw new Error(`Cell ${cell} not rendered`);
  await mouseClick(session.cdp, pos.x, pos.y);
  await sleep(250);
  if (action.kind === "button") {
    const selector = `[data-command-id="${action.id}"]`;
    const index = await session.cdp.evaluate(`(() => [...document.querySelectorAll(${JSON.stringify(selector)})].findIndex(n=>n.getBoundingClientRect().width>0))()`);
    if (index < 0) throw new Error(`Visible ribbon button not found: ${action.id}`);
    await click(session.cdp, selector, index);
  } else {
    const selected = await session.cdp.evaluate(`(() => { const e=document.querySelector('select[data-command-id="${action.id}"]'); if(!e) return false; e.value=${JSON.stringify(action.value)}; e.dispatchEvent(new Event('change',{bubbles:true})); return e.value===${JSON.stringify(action.value)}; })()`);
    if (!selected) throw new Error(`Ribbon selection failed: ${action.id}=${action.value}`);
  }
  await sleep(500);
  const model = await session.cdp.evaluate(`(() => { const g=window.__vnoAppInstance.grid; const col=${JSON.stringify(cell.replace(/\d+/g, ""))}; const i=g.cellsData.get(${JSON.stringify(cell)}); return {value:i?.val,format:i?.style?.numberFormat,fill:i?.style?.backgroundColor,color:i?.style?.color,columnWidth:g.getColumnWidth(col),defaultWidth:g.defaultColWidth,storedWidth:g._colWidths().get(col),autoFitWidth:g.computeAutoFitColumnWidth(col),selectedCoord:g.selectedCoord}; })()`);
  console.log(`MODEL ${JSON.stringify(model)}`);
  await session.cdp.evaluate("window.__vnoAppInstance.adapter.isDirty=true");
  const saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 300000 });
  if (saved === false || saved?.status === "error") throw new Error(`Save failed: ${JSON.stringify(saved)}`);
  console.log(`SAVED ${JSON.stringify(saved)}`);
} finally {
  await session.close();
}
