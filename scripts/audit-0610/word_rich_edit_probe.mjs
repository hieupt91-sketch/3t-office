import { launchApp } from "../../tests/live/cdp/session.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const src = "E:\\VNOffice-profiles\\claude-wordpar\\rich_src.docx", out = "E:\\VNOffice-profiles\\claude-wordpar\\rich_edited.docx";
const session = await launchApp("writer", { filePath: src, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 240000 });
try {
  await session.cdp.waitFor("document.querySelector('.vno-writer-body')?.textContent.includes('P30')", { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
  await sleep(2500);
  const n = await ev(`(() => { const b=document.querySelector('.vno-writer-body'); b.focus(); const ps=[...b.querySelectorAll('p, li')]; let n=0; for (const p of ps) { if(!/^\\s*P\\d\\d/.test(p.textContent)) continue; const r=document.createRange(); r.selectNodeContents(p); r.collapse(false); const s=getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('insertText', false, ' ZZ'); n++; } return n; })()`);
  await sleep(800);
  const saved = await ev(`(async () => { const a=window.__vnoAppInstance.adapter; a.isDirty=true; return JSON.stringify(await globalThis.globalUnoBridge.saveRealFileInPlace('writer', a._contentForExport(), ${JSON.stringify(out)}, ${JSON.stringify(src)})).slice(0,60); })()`);
  console.log("edited", n, saved);
} finally { await session.close(); }

