import { launchApp } from "./session.mjs";
import { mouseClick, typeText, press } from "./actions.mjs";
import { mkdirSync } from "node:fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync("E:\\VNOffice-profiles\\claude-slides", { recursive: true });
const session = await launchApp("slides", { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
const clickSel = async (q) => { const p = await ev(`(() => { const e=document.querySelector(${JSON.stringify(q)}); if(!e) return null; e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`); if (!p) return false; const { x, y } = JSON.parse(p); await mouseClick(session.cdp, x, y); return true; };
const info = (label) => ev(`(() => { const c=window.__vnoAppInstance.adapter.canvas; const s=c.slides[c.currentSlideIndex]; return ${JSON.stringify(label)}+' | slides='+c.slides.length+' cur='+c.currentSlideIndex+' | keys='+Object.keys(s||{}).join(',')+' | shapes='+((s&&s.shapes)?s.shapes.length:'?')+' | json='+JSON.stringify(s).slice(0,380); })()`);
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-ribbon')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(5000);
  console.log(await info("mo moi"));
  await clickSel('[data-command-id="slides.slide.new"]'); await sleep(600);
  console.log(await info("Trang moi"));
  await clickSel('[data-command-id="slides.slide.duplicate"]'); await sleep(600);
  console.log(await info("Nhan doi"));
  await clickSel('[data-command-id="slides.text.insert"]'); await sleep(600);
  console.log(await info("Hop van ban"));
  await typeText(session.cdp, "Xin chao", 8); await sleep(400);
  console.log(await info("go chu"));
  await clickSel('[data-command-id="slides.shape.insert"]'); await sleep(800);
  console.log("dialog sau Hinh khoi:", await ev("[...document.querySelectorAll('.vno-dialog-box')].filter(e=>e.offsetParent).map(e=>e.textContent.trim().replace(/\\s+/g,' ').slice(0,80)).join('||')"));
} finally { await session.close(); }