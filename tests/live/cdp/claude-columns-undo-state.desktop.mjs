import { launchApp } from "./session.mjs";
import { mouseClick, typeText, press } from "./actions.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("writer", { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
const clickSel = async (q) => { const p = JSON.parse(await ev(`(() => { const e=document.querySelector(${JSON.stringify(q)}); const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`)); await mouseClick(session.cdp, p.x, p.y); };
const state = () => ev(`JSON.stringify((() => { const a=window.__vnoAppInstance.adapter; const b=document.querySelector('.vno-writer-body'); return {adapterCols:a.columns&&a.columns.count, secCols:Object.fromEntries(Object.entries(a.sectionPageSetups||{}).map(([k,v])=>[k,v&&v.columns&&v.columns.count])), css:getComputedStyle(b).columnCount, sectionKeys:Object.keys(a.sectionPageSetups||{}).length}; })())`);
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(4000);
  await ev("document.querySelector('.vno-writer-body').focus()");
  await typeText(session.cdp, "Mot doan van ban de thu cot.", 8); await sleep(500);
  console.log("ban dau   :", await state());
  await clickSel("#vno-ribbon-tab-layout"); await sleep(300);
  await clickSel('[data-command-id="writer.page.columns2"]'); await sleep(800);
  console.log("sau 2 cot :", await state());
  await press(session.cdp, "z", { ctrl: true }, 150); await sleep(800);
  console.log("sau Ctrl+Z:", await state());
  await press(session.cdp, "y", { ctrl: true }, 150); await sleep(800);
  console.log("sau Ctrl+Y:", await state());
} finally { await session.close(); }