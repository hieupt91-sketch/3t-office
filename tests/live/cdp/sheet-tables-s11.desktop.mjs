import { launchApp } from "./session.mjs";
import { mouseClick, mouseDrag, press, typeText, insertText } from "./actions.mjs";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = process.env.VNO_APP_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA is required");
const evidence = path.join(root, "docs", "tickets-0710", "evidence");
await mkdir(profile, { recursive: true });
await mkdir(evidence, { recursive: true });

async function clickSelector(cdp, selector) {
  const value = await cdp.evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el)return null;el.scrollIntoView({block:'nearest'});const r=el.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2});})()`);
  if (!value) throw new Error(`Missing UI element: ${selector}`);
  await mouseClick(cdp, JSON.parse(value).x, JSON.parse(value).y);
}

async function screenshot(cdp, name) {
  const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, 60000);
  await writeFile(path.join(evidence, name), Buffer.from((shot.result || shot).data, "base64"));
}

async function saveAs(cdp, output, source) {
  await cdp.evaluate("window.__vnoAppInstance.adapter.isDirty = true");
  return cdp.evaluate(`(() => { const fods=window.__vnoAppInstance.adapter.serializeToFods(); return globalThis.globalUnoBridge.saveRealFileInPlace("sheet",fods,${JSON.stringify(output)},${JSON.stringify(source)}); })()`, { awaitPromise: true, timeoutMilliseconds: 300000 });
}

const template = path.join(root, "tests", "live", "cdp", "test_sheet_home.xlsx");
const createdPath = path.join(profile, "s11-created.xlsx");
const created = await launchApp("sheet", { root, localAppData: profile, filePath: template, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = created.cdp;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  const range = await cdp.evaluate(`(() => {const a=document.querySelector('.vno-grid-cell[data-coord="A1"]'),b=document.querySelector('.vno-grid-cell[data-coord="G6"]');if(!a||!b)return null;const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return JSON.stringify({x1:x.left+x.width/2,y1:x.top+x.height/2,x2:y.left+y.width/2,y2:y.top+y.height/2});})()`);
  if (!range) throw new Error("Could not select audit range A1:G6");
  const rect = JSON.parse(range);
  await mouseDrag(cdp, rect.x1, rect.y1, rect.x2, rect.y2);
  await clickSelector(cdp, '[data-command-id="sheet.style.formatAsTable"]');
  await cdp.waitFor("!!document.querySelector('.vno-format-table-dialog')", { timeoutMilliseconds: 10000 });
  await clickSelector(cdp, ".vno-table-name");
  const nameFocus = await cdp.evaluate("JSON.stringify({active:document.activeElement?.className,value:document.querySelector('.vno-table-name')?.value})");
  await press(cdp, "Home");
  await press(cdp, "End", { shift: true });
  await press(cdp, "Backspace");
  await insertText(cdp, "S11AuditTable");
  const enteredName = await cdp.evaluate("document.querySelector('.vno-table-name')?.value");
  if (enteredName !== "S11AuditTable") throw new Error(`Table name keyboard entry failed (${nameFocus}; value=${enteredName})`);
  await screenshot(cdp, "fix-s11-create-dialog.png");
  await clickSelector(cdp, ".vno-table-create-action");
  await cdp.waitFor("window.__vnoAppInstance.grid.tablesBySheet[window.__vnoAppInstance.grid.activeSheet]?.[0]?.name === 'S11AuditTable'", { timeoutMilliseconds: 10000 });
  await screenshot(cdp, "fix-s11-created-table.png");
  const initial = await cdp.evaluate("JSON.stringify(window.__vnoAppInstance.grid.tablesBySheet.Sheet1[0])");
  const saved = await saveAs(cdp, createdPath, template);
  if (saved?.status !== "ok" && saved?.status !== "success" && saved?.status !== "saved") throw new Error(`Created table save failed: ${JSON.stringify(saved)}`);
  const activeSheet = await cdp.evaluate("window.__vnoAppInstance.grid.activeSheet");
  const addedRow = await cdp.evaluate(`(() => {const e=document.querySelector('.vno-grid-cell[data-coord="A7"]');if(!e)return null;const r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2});})()`);
  if (!addedRow) throw new Error("Could not locate row immediately below the table");
  await mouseClick(cdp, JSON.parse(addedRow).x, JSON.parse(addedRow).y);
  await typeText(cdp, "S11 expanded row");
  await press(cdp, "Enter");
  await new Promise(resolve => setTimeout(resolve, 500));
  const afterEntry = await cdp.evaluate(`JSON.stringify({table:window.__vnoAppInstance.grid.tablesBySheet[${JSON.stringify(activeSheet)}]?.[0],cell:window.__vnoAppInstance.grid.cellsData.get('A7'),coord:window.__vnoAppInstance.grid.selectedCoord})`);
  if (!JSON.parse(afterEntry)?.table?.ref.endsWith("7")) throw new Error(`Adjacent row did not expand table: ${afterEntry}`);
  const expanded = await cdp.evaluate(`JSON.stringify(window.__vnoAppInstance.grid.tablesBySheet[${JSON.stringify(activeSheet)}][0])`);
  const tableCell = await cdp.evaluate(`(() => {const e=document.querySelector('.vno-grid-cell[data-coord="A7"]');if(!e)return null;const r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2});})()`);
  await mouseClick(cdp, JSON.parse(tableCell).x, JSON.parse(tableCell).y);
  await clickSelector(cdp, '[data-command-id="sheet.style.formatAsTable"]');
  await cdp.waitFor("!!document.querySelector('.vno-table-rename-action')", { timeoutMilliseconds: 10000 });
  await clickSelector(cdp, ".vno-table-rename");
  await press(cdp, "Home");
  await press(cdp, "End", { shift: true });
  await press(cdp, "Backspace");
  await insertText(cdp, "S11RenamedTable");
  await clickSelector(cdp, ".vno-table-rename-action");
  const renamed = await cdp.evaluate(`JSON.stringify(window.__vnoAppInstance.grid.tablesBySheet[${JSON.stringify(activeSheet)}][0])`);
  const renamedPath = path.join(profile, "s11-renamed-expanded.xlsx");
  const renamedSaved = await saveAs(cdp, renamedPath, template);
  if (renamedSaved?.status !== "ok" && renamedSaved?.status !== "success" && renamedSaved?.status !== "saved") throw new Error(`Renamed table save failed: ${JSON.stringify(renamedSaved)}`);
  await clickSelector(cdp, '[data-command-id="sheet.style.formatAsTable"]');
  await cdp.waitFor("!!document.querySelector('.vno-table-convert-action')", { timeoutMilliseconds: 10000 });
  await clickSelector(cdp, ".vno-table-convert-action");
  const converted = await cdp.evaluate(`JSON.stringify(window.__vnoAppInstance.grid.tablesBySheet[${JSON.stringify(activeSheet)}])`);
  console.log(JSON.stringify({ output: createdPath, initial, saved, expanded, renamedOutput: renamedPath, renamedSaved, renamed, converted }));
} finally {
  await created.close();
}

const existingPath = path.join(root, "tests", "fixtures", "ton-kho-3t.xlsx");
const preservedPath = path.join(profile, "s11-existing-table-roundtrip.xlsx");
const opened = await launchApp("sheet", { root, localAppData: profile, filePath: existingPath, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = opened.cdp;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  const tables = await cdp.evaluate("JSON.stringify(window.__vnoAppInstance.grid.tablesBySheet)");
  if (!tables.includes("productTable")) throw new Error(`Existing table was not imported: ${tables}`);
  await screenshot(cdp, "fix-s11-existing-table-open.png");
  const saved = await saveAs(cdp, preservedPath, existingPath);
  if (saved?.status !== "ok" && saved?.status !== "success" && saved?.status !== "saved") throw new Error(`Existing table save failed: ${JSON.stringify(saved)}`);
  console.log(JSON.stringify({ input: existingPath, output: preservedPath, tables, saved }));
} finally {
  await opened.close();
}
