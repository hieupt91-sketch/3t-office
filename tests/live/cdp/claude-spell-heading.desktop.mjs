import { launchApp } from "./session.mjs";
import { press, typeText } from "./actions.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("writer", { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(4000);
  await ev("document.querySelector('.vno-writer-body').focus()");
  await press(session.cdp, "1", { ctrl: true, alt: true }, 100);
  await typeText(session.cdp, "Tieu de xyzabc qwertyu", 8);
  await sleep(1500);
  const info = await ev(`JSON.stringify((() => { const b=document.querySelector('.vno-writer-body'); const h=b.querySelector('h1,h2'); const s=getSelection(); const n=s.anchorNode; const el=n.nodeType===3?n.parentElement:n; return {tag:h&&h.tagName, markers:b.querySelectorAll('.vno-spelling-uncertain').length, bg:getComputedStyle(el).backgroundColor, qv:document.queryCommandValue('hiliteColor'), qvFore:document.queryCommandValue('foreColor'), color:getComputedStyle(el).color}; })())`);
  console.log("TIEU DE:", info);
  // Binh thuong
  await press(session.cdp, "Enter", {}, 60);
  await press(session.cdp, "n", { ctrl: true, shift: true }, 100);
  await typeText(session.cdp, "Doan xyzabc qwertyu", 8); await sleep(1500);
  console.log("DOAN THUONG:", await ev("document.querySelector('.vno-writer-body').querySelectorAll('p .vno-spelling-uncertain').length + ' dau gach do trong doan thuong'"));
} finally { await session.close(); }