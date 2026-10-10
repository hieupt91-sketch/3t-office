import { launchApp } from "./session.mjs";
import { typeText, press } from "./actions.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const file = process.env.PERF_FILE || "E:\\VN OFice\\file test\\landocx\\d07.docx";
const session = await launchApp("writer", { filePath: file, startTimeoutMilliseconds: 240000, readyTimeoutMilliseconds: 240000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body')&&document.querySelector('.vno-writer-body').textContent.length>300", { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
  await sleep(8000);
  await ev("(() => { const b=document.querySelector('.vno-writer-body'); b.focus(); const ps=[...b.querySelectorAll('p')].filter(p=>p.textContent.length>60); const p=ps[Math.floor(ps.length/2)]; p.scrollIntoView({block:'center'}); const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT); let tn=w.nextNode(); while(tn&&tn.data.length<12) tn=w.nextNode(); const r=document.createRange(); r.setStart(tn,10); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r); return 1 })()");
  const times = [];
  for (let run = 0; run < 3; run++) {
    const t0 = Date.now();
    await typeText(session.cdp, "abcdefghij abcdefghij abcdefghij abcdefghij", 0);
    times.push(Date.now() - t0);
    await sleep(500);
  }
  console.log("TYPING_MS_PER_RUN(43 ky tu):", times.join(","), "| trung binh moi phim:", (times.reduce((a, b) => a + b, 0) / times.length / 43).toFixed(1) + " ms", "| ky tu tai lieu:", await ev("document.querySelector('.vno-writer-body').textContent.length"));
} finally { await session.close(); }