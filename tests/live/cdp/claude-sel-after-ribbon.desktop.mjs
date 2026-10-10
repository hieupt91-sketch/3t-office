import { launchApp } from "./session.mjs";
import { typeText, mouseClick } from "./actions.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("writer", { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
const sel = () => ev(`JSON.stringify((() => { const s=getSelection(); const b=document.querySelector('.vno-writer-body'); return {rc:s.rangeCount, inBody: !!(s.anchorNode && b.contains(s.anchorNode)), anchor: s.anchorNode && s.anchorNode.nodeName, active: document.activeElement.tagName+'.'+String(document.activeElement.className).slice(0,26)}; })())`);
const clickSel = async (q) => { const p = JSON.parse(await ev(`(() => { const e=document.querySelector(${JSON.stringify(q)}); const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`)); await mouseClick(session.cdp, p.x, p.y); };
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(4000);
  await ev("document.querySelector('.vno-writer-body').focus()");
  await typeText(session.cdp, "Van ban de chen hop", 8); await sleep(300);
  console.log("1 sau go chu   :", await sel());
  await clickSel("#vno-ribbon-tab-insert"); await sleep(500);
  console.log("2 sau bam tab Chen:", await sel());
  const caret = await ev(`JSON.stringify((() => { const r=getSelection().getRangeAt(0).getBoundingClientRect(); const e=document.querySelector('.vno-writer-body').getBoundingClientRect(); const ed=(document.querySelector('.vno-writer-viewport')||document.body).getBoundingClientRect(); return {caretX:Math.round(r.left), caretY:Math.round(r.top), bodyLeft:Math.round(e.left), bodyTop:Math.round(e.top)}; })())`);
  console.log("caret/body:", caret);
  await clickSel('[data-command-id="writer.insert.textbox"]'); await sleep(600);
  console.log("textbox rect:", await ev(`JSON.stringify((() => { const t=document.querySelector('.vno-writer-textbox'); const r=t.getBoundingClientRect(); return {x:Math.round(r.left), y:Math.round(r.top)}; })())`));
  console.log("3 ngay sau bam nut:", await sel());
} finally { await session.close(); }