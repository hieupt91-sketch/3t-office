import { launchApp } from "./session.mjs";
import { mouseClick } from "./actions.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("slides", { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
const clickSel = async (q) => { const p = await ev(`(() => { const e=document.querySelector(${JSON.stringify(q)}); if(!e) return null; const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`); if (!p) return false; const { x, y } = JSON.parse(p); await mouseClick(session.cdp, x, y); return true; };
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-ribbon')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(5000);
  const count = () => ev("(() => { const c=window.__vnoAppInstance.adapter.canvas; return (c.slides[c.currentSlideIndex].shapes||[]).filter(s=>/chart/i.test(s.type||'')).length + '/' + (c.slides[c.currentSlideIndex].shapes||[]).length; })()");
  const before = await count();
  await clickSel("#vno-ribbon-tab-insert"); await sleep(400);
  await clickSel('[data-command-id="slides.insert.chart"]'); await sleep(900);
  const dlg = await ev("[...document.querySelectorAll('.vno-dialog-box')].filter(e=>e.offsetParent).map(e=>e.textContent.trim().replace(/\\s+/g,' ').slice(0,70)).join('||')");
  console.log("hop thoai:", dlg);
  await ev(`(() => { const d=[...document.querySelectorAll('.vno-dialog-box')].find(e=>e.offsetParent); const b=[...d.querySelectorAll('button')].find(x=>/^(Chèn|Insert)/i.test(x.textContent.trim())); b.click(); return 1; })()`); await sleep(1200);
  const after = await count();
  console.log((before !== after ? "PASS" : "FAIL") + " | Chen bieu do tu hop thoai mac dinh: bieu do/tong doi tuong " + before + " -> " + after);
} finally { await session.close(); }