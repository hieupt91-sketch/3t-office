import { launchApp } from "./session.mjs";
import { mouseClick, mouseDrag, press } from "./actions.mjs";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = process.env.VNO_APP_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA is required");
await mkdir(profile, { recursive: true });

const template = path.join(root, "tests", "live", "cdp", "test_sheet_home.xlsx");
const output = path.join(profile, "sheet-slicer-roundtrip.xlsx");

async function center(cdp, selector) {
  const raw = await cdp.evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el)return null; el.scrollIntoView({block:'nearest'}); const r=el.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`);
  if (!raw) throw new Error(`Missing UI element: ${selector}`);
  return JSON.parse(raw);
}

async function click(cdp, selector, options) {
  const point = await center(cdp, selector);
  await mouseClick(cdp, point.x, point.y, options);
}

async function saveAs(cdp, target, source) {
  await cdp.evaluate("window.__vnoAppInstance.adapter.isDirty = true");
  return cdp.evaluate(`(() => { const fods=window.__vnoAppInstance.adapter.serializeToFods(); return globalThis.globalUnoBridge.saveRealFileInPlace("sheet",fods,${JSON.stringify(target)},${JSON.stringify(source)}); })()`, { awaitPromise: true, timeoutMilliseconds: 300000 });
}

const created = await launchApp("sheet", { root, localAppData: profile, filePath: template, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = created.cdp;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  const range = JSON.parse(await cdp.evaluate(`(() => { const a=document.querySelector('.vno-grid-cell[data-coord="A1"]'), b=document.querySelector('.vno-grid-cell[data-coord="G6"]'); if(!a||!b)return 'null'; const x=a.getBoundingClientRect(), y=b.getBoundingClientRect(); return JSON.stringify({x1:x.left+x.width/2,y1:x.top+x.height/2,x2:y.left+y.width/2,y2:y.top+y.height/2}); })()`));
  if (!range) throw new Error("Could not select A1:G6");
  await mouseDrag(cdp, range.x1, range.y1, range.x2, range.y2);
  await click(cdp, '[data-command-id="sheet.style.formatAsTable"]');
  await cdp.waitFor("!!document.querySelector('.vno-table-create-action')", { timeoutMilliseconds: 10000 });
  await click(cdp, ".vno-table-create-action");
  await cdp.waitFor("window.__vnoAppInstance.grid.tablesBySheet[window.__vnoAppInstance.grid.activeSheet]?.length === 1", { timeoutMilliseconds: 10000 });

  await click(cdp, '.vno-grid-cell[data-coord="A2"]');
  await cdp.waitFor("!document.querySelector('#vno-ribbon-tab-tableDesign')?.hidden", { timeoutMilliseconds: 10000 });
  await click(cdp, "#vno-ribbon-tab-tableDesign");
  await click(cdp, '[data-command-id="sheet.table.insertSlicer"]');
  await cdp.waitFor("!!document.querySelector('.vno-slicer-column-dialog')", { timeoutMilliseconds: 10000 });
  await click(cdp, ".vno-rule-apply");
  await cdp.waitFor("document.querySelectorAll('.vno-table-slicer').length === 1", { timeoutMilliseconds: 10000 });

  const initial = JSON.parse(await cdp.evaluate("JSON.stringify({slicers:window.__vnoAppInstance.grid.slicersBySheet,hidden:[...window.__vnoAppInstance.grid.hiddenRows],rect:(()=>{const r=document.querySelector('.vno-table-slicer').getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height}})()})"));
  const firstItem = ".vno-table-slicer .vno-slicer-item:nth-child(1)";
  await click(cdp, firstItem);
  const singleHidden = Number(await cdp.evaluate("window.__vnoAppInstance.grid.hiddenRows.size"));
  if (singleHidden < 1) throw new Error("Single slicer selection did not filter table rows");
  await click(cdp, ".vno-table-slicer [data-slicer-clear]");
  if (Number(await cdp.evaluate("window.__vnoAppInstance.grid.hiddenRows.size")) !== 0) throw new Error("Clear slicer did not restore rows");

  await click(cdp, ".vno-table-slicer [data-slicer-multi]");
  await click(cdp, firstItem);
  const secondExists = await cdp.evaluate("!!document.querySelector('.vno-table-slicer .vno-slicer-item:nth-child(2)')");
  if (secondExists) await click(cdp, ".vno-table-slicer .vno-slicer-item:nth-child(2)");
  const selectedCount = Number(await cdp.evaluate("document.querySelectorAll('.vno-table-slicer .vno-slicer-item[aria-selected=\"true\"]').length"));
  if (secondExists && selectedCount < 2) throw new Error("Multi-select did not retain two slicer items");

  const header = await center(cdp, ".vno-table-slicer .vno-slicer-header");
  await mouseDrag(cdp, header.x, header.y, header.x + 40, header.y + 30);
  const grip = await center(cdp, ".vno-table-slicer .vno-slicer-resize");
  await mouseDrag(cdp, grip.x, grip.y, grip.x + 35, grip.y + 25);
  const moved = JSON.parse(await cdp.evaluate("JSON.stringify(window.__vnoAppInstance.grid.slicersBySheet[window.__vnoAppInstance.grid.activeSheet][0])"));
  if (moved.left <= 24 || moved.top <= 24 || moved.width <= 180 || moved.height <= 220) throw new Error(`Drag/resize was not persisted: ${JSON.stringify(moved)}`);

  await click(cdp, ".vno-table-slicer [data-slicer-close]");
  if (Number(await cdp.evaluate("window.__vnoAppInstance.grid.tableSlicer.list().length")) !== 0) throw new Error("Close did not remove slicer");
  await press(cdp, "z", { ctrl: true });
  await cdp.waitFor("document.querySelectorAll('.vno-table-slicer').length === 1", { timeoutMilliseconds: 10000 });

  const saved = await saveAs(cdp, output, template);
  if (!["ok", "success", "saved"].includes(saved?.status)) throw new Error(`Save failed: ${JSON.stringify(saved)}`);
  console.log(JSON.stringify({ phase: "create", output, initial, singleHidden, selectedCount, moved, saved }));
} finally {
  await created.close();
}

const reopened = await launchApp("sheet", { root, localAppData: profile, filePath: output, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = reopened.cdp;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.tableSlicer?.list()?.length === 1 && document.querySelectorAll('.vno-table-slicer').length === 1", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  const state = JSON.parse(await cdp.evaluate("JSON.stringify({slicer:window.__vnoAppInstance.grid.tableSlicer.list()[0],hidden:[...window.__vnoAppInstance.grid.hiddenRows],panelCount:document.querySelectorAll('.vno-table-slicer').length})"));
  if (state.slicer.left <= 24 || state.slicer.width <= 180) throw new Error(`Reopen lost geometry: ${JSON.stringify(state)}`);
  if (!state.hidden.length) throw new Error(`Reopen lost the active slicer filter: ${JSON.stringify(state)}`);
  console.log(JSON.stringify({ phase: "reopen", output, state }));
} finally {
  await reopened.close();
}
