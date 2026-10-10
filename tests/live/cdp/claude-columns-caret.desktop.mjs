import { launchApp } from "./session.mjs";
import { mouseClick, typeText, press } from "./actions.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("writer", { filePath: "E:\\VN OFice\\file test\\landocx\\d24.docx", startTimeoutMilliseconds: 240000, readyTimeoutMilliseconds: 240000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
const clickSel = async (q) => { const p = JSON.parse(await ev(`(() => { const e=document.querySelector(${JSON.stringify(q)}); e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`)); await mouseClick(session.cdp, p.x, p.y); };
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body')&&document.querySelector('.vno-writer-body').textContent.length>300", { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
  await sleep(8000);
  // dat con tro giua doan van o muc GIUA bang chuot that
  const pos = JSON.parse(await ev(`(() => { const ps=[...document.querySelectorAll('.vno-writer-body p')].filter(p=>p.textContent.length>80); const p=ps[Math.floor(ps.length/2)]; p.scrollIntoView({block:'center'}); const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT); let t; while((t=w.nextNode())&&t.data.length<12); const r=document.createRange(); r.setStart(t,6); r.collapse(true); const b=r.getBoundingClientRect(); window.__probeText=p.textContent.slice(0,30); return JSON.stringify({x:b.left,y:b.top+b.height/2}); })()`));
  await mouseClick(session.cdp, pos.x, pos.y); await sleep(300);
  const where = () => ev(`JSON.stringify((() => { const s=getSelection(); const n=s.anchorNode; const el=n&&(n.nodeType===3?n.parentElement:n); const p=el&&el.closest('p,h1,h2,li,td'); return {inBody: !!(n && document.querySelector('.vno-writer-body').contains(n)), para: p?p.textContent.slice(0,30):null, offset:s.anchorOffset}; })())`);
  const before = JSON.parse(await where()); console.log("truoc cot :", JSON.stringify(before));
  await clickSel("#vno-ribbon-tab-layout"); await sleep(400);
  await clickSel('[data-command-id="writer.page.columns2"]'); await sleep(1200);
  const afterCols = JSON.parse(await where()); console.log((afterCols.para === before.para && afterCols.offset === before.offset ? "PASS" : "FAIL") + " | Ap 2 cot trong tai lieu nhieu muc: con tro giu nguyen doan/offset | " + JSON.stringify(afterCols));
  await typeText(session.cdp, "ZZ", 8); await sleep(400);
  const zz = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.vno-writer-body p')].filter(p=>p.textContent.includes('ZZ')).map(p=>p.textContent.slice(0,40)))`)); console.log((zz.length === 1 && zz[0].includes("phápZZ") || zz[0].includes("pháp ZZ") ? "PASS" : "FAIL") + " | Go tiep sau khi ap cot vao dung doan | " + JSON.stringify(zz));
  await press(session.cdp, "z", { ctrl: true }, 150); await sleep(500);
  console.log("sau Ctrl+Z:", await where(), "| cot tai muc:", await ev("document.querySelectorAll('.vno-section-content').length"));
} finally { await session.close(); }