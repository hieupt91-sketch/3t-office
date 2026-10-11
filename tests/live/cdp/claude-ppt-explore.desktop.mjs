import { launchApp } from "./session.mjs";
import { mouseClick } from "./actions.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const template = "E:\\VNOffice-profiles\\claude-pptpar\\template.pptx";
const session = await launchApp("slides", { filePath: template, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 300000 });
try {
  const norm = template.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase(); return p === ${JSON.stringify(norm)} && a?.canvas?.slides?.length > 0 && JSON.stringify(a.canvas.slides[0].shapes||[]).includes('Alpha'); })()`, { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
  await sleep(2000);
  console.log("model:", await ev(`JSON.stringify(window.__vnoAppInstance.adapter.canvas.slides[0].shapes.map(s=>({id:s.id,type:s.type,x:s.x,y:s.y,w:s.w,h:s.h,text:(s.text||'').slice(0,30),keys:Object.keys(s).join(',').slice(0,160)})))`));
  console.log("dom shapes:", await ev(`[...document.querySelectorAll('[data-shape-id]')].map(e=>e.dataset.shapeId+':'+e.className.slice(0,40)).join(' | ')`));
} finally { await session.close(); }