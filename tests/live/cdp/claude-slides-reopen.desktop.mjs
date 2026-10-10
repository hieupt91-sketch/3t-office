import { launchApp } from "./session.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("slides", { filePath: "E:\\VNOffice-profiles\\claude-slides-rt\\saved.pptx", startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
try {
  await session.cdp.waitFor("window.__vnoAppInstance?.adapter?.canvas?.slides?.length > 0", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(4000);
  console.log("DOM co chu:", await ev("document.body.innerText.includes('Hop kiem thu Claude')"));
  console.log("slide0 keys:", await ev("(() => { const s=window.__vnoAppInstance.adapter.canvas.slides[0]; return Object.keys(s).join(',')+' | shapes='+(s.shapes||[]).length+' | transition='+JSON.stringify(s.transition)+' | imported='+(s.imported?Object.keys(s.imported).join(','):'-'); })()"));
  console.log("canvas.imported:", await ev("(() => { const i=window.__vnoAppInstance.adapter.canvas.imported; return i? (Array.isArray(i)? 'array '+i.length : typeof i+' keys='+Object.keys(i).slice(0,15).join(',')) : String(i); })()"));
  console.log("so slide trong sorter/nav:", await ev("document.querySelectorAll('[data-slide-index], .vno-slide-nav-item, .vno-slide-thumb').length"));
} finally { await session.close(); }