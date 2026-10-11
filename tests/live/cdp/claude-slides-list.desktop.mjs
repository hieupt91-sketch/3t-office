import { launchApp } from "./session.mjs";
import { mouseClick } from "./actions.mjs";
import { copyFileSync, mkdirSync } from "node:fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync("E:\\VNOffice-profiles\\claude-slides", { recursive: true });
copyFileSync("E:\\VN OFice\\file test\\sample-3.pptx", "E:\\VNOffice-profiles\\claude-slides\\s3.pptx");
const session = await launchApp("slides", { filePath: "E:\\VNOffice-profiles\\claude-slides\\s3.pptx", startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
const clickSel = async (q) => { const p = await ev(`(() => { const e=document.querySelector(${JSON.stringify(q)}); if(!e) return null; const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`); if (!p) return false; const { x, y } = JSON.parse(p); await mouseClick(session.cdp, x, y); return true; };
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-ribbon')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(6000);
  const tabs = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('[id^="vno-ribbon-tab-"]')].map(x=>x.id.replace('vno-ribbon-tab-','')))`));
  for (const t of tabs) {
    await clickSel("#vno-ribbon-tab-" + t); await sleep(350);
    const ids = await ev(`[...document.querySelectorAll('.vno-ribbon-content [data-command-id]')].map(b=>b.dataset.commandId.replace(/^slides\\./,'S.')+'('+(b.textContent.trim().replace(/\\s+/g,' ').slice(0,14))+')').join('  ')`);
    console.log("[" + t + "] " + ids);
  }
  console.log("adapter keys:", await ev("Object.keys(window.__vnoAppInstance.adapter).slice(0,40).join(',')"));
  console.log("canvas keys:", await ev("Object.keys(window.__vnoAppInstance.adapter.canvas).slice(0,60).join(',')"));
} finally { await session.close(); }