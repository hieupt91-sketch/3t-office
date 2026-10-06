// Do do tre go phim THAT tren tai lieu that co hinh noi neo theo trang (d24.docx, 16 trang): Event Timing API.
// Chay: node --experimental-websocket scripts/audit-0610/doc_typing_latency_doc.mjs [duong-dan-docx]
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press } from "../../tests/live/cdp/actions.mjs";
const file = process.argv[2] || "E:\\VN OFice\\file test\\landocx\\d24.docx";
const session = await launchApp("writer", { filePath: file, startTimeoutMilliseconds: 120000 });
const ev = (e, o) => session.cdp.evaluate(e, o);
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 50", { timeoutMilliseconds: 120000, intervalMilliseconds: 500 });
  await new Promise((r) => setTimeout(r, 6000));
  const info = await ev(`(() => { const b=document.querySelector('.vno-writer-body'); const t=document.createTreeWalker(b,NodeFilter.SHOW_TEXT); let n,last=null; while(n=t.nextNode()){ if(n.data.trim().length>3) last=n; } b.focus(); const r=document.createRange(); r.setStart(last,Math.min(2,last.data.length)); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r); window.__ev=[]; new PerformanceObserver(l => { for (const e of l.getEntries()) if (['keydown','keypress','keyup','beforeinput','input'].includes(e.name)) window.__ev.push([e.name, Math.round(e.duration)]); }).observe({ type: 'event', durationThreshold: 16, buffered: false }); return { floats: b.querySelectorAll('[data-vno-float-anchor]').length, pages: document.querySelectorAll('.vno-page-auto-gap').length + 1 }; })()`);
  for (let i = 0; i < 60; i += 1) { await press(session.cdp, "a", {}, 110); if (i % 15 === 14) await new Promise((r) => setTimeout(r, 700)); }
  await new Promise((r) => setTimeout(r, 1500));
  const events = await ev("window.__ev");
  const d = events.map((e) => e[1]).sort((a, b) => a - b);
  const over100 = d.filter((x) => x > 100).length;
  console.log(JSON.stringify({ file: file.split("\\").pop(), ...info, eventsOver16ms: d.length, max: d[d.length - 1] || 0, over100ms: over100 }));
  console.log(over100 === 0 ? "PASS | khong phim nao tre > 100 ms" : `FAIL | ${over100} su kien > 100 ms`);
} finally { await session.close(); }