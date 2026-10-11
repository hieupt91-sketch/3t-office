import { launchApp } from "./session.mjs";
import { mouseClick } from "./actions.mjs";
import { writeFileSync } from "node:fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const template = "E:\\VNOffice-profiles\\claude-excelpar\\template.xlsx";
const session = await launchApp("sheet", { filePath: template, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 300000 });
try {
  await session.cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
  await sleep(1500);
  const pos = JSON.parse(await ev(`(() => { const e=document.querySelector('.vno-grid-cell[data-coord="E2"]'); const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`));
  await mouseClick(session.cdp, pos.x, pos.y); await sleep(250);
  await ev(`(() => { [...document.querySelectorAll('[data-command-id="sheet.cell.alignRight"]')].find(n=>n.getBoundingClientRect().width>0).click(); return 1; })()`); await sleep(600);
  const fods = await ev("window.__vnoAppInstance.adapter.serializeToFods()");
  writeFileSync("E:\\VNOffice-profiles\\claude-excelpar\\right.fods", fods);
  console.log("fods bytes", fods.length);
} finally { await session.close(); }