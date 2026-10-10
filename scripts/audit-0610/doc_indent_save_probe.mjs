// Thut le 1 lan (Ctrl+M) tren tai lieu dai roi LUU DOCX bang duong luu that cua app; in w:ind cua doan do trong tep luu.
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press } from "../../tests/live/cdp/actions.mjs";
import path from "node:path";
import { mkdirSync } from "node:fs";
const file = process.argv.slice(2).find((a) => !a.startsWith("--")) || "E:\\VN OFice\\file test\\landocx\\d07.docx";
const outDir = "E:\\VNOffice-test\\indent"; mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "indent-saved.docx");
const session = await launchApp("writer", { filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e, o) => session.cdp.evaluate(e, o);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 5000", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(6000);
  const marker = await ev(`(() => {
    const b = document.querySelector('.vno-writer-body');
    const ps = [...b.querySelectorAll(':scope > p')].filter(p => p.textContent.trim().length > 80 && !p.querySelector('img'));
    const p = ps[Math.floor(ps.length / 2)]; p.id = 'probe-target';
    const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let n, tn = null;
    while ((n = w.nextNode())) { if (n.data.trim().length > 25) { tn = n; break; } }
    b.focus(); p.scrollIntoView({ block: 'center' });
    const st = Math.max(0, tn.data.search(/\\S/)); const r = document.createRange(); r.setStart(tn, st); r.setEnd(tn, st + 10);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r); return p.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40); })()`);
  await press(session.cdp, "m", { ctrl: true }, 800);
  if (process.env.VNO_PROBE_TOUCH === "1") { await ev(`(() => { const s = getSelection(); s.collapseToEnd(); document.execCommand("insertText", false, "x"); return true; })()`); await sleep(500); }
  const len = await ev(`(() => { window.__c = window.__vnoAppInstance.adapter._contentForExport(); return window.__c.length; })()`);
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer", window.__c, ${JSON.stringify(outPath)}, ${JSON.stringify(file)})`, { timeoutMilliseconds: 1200000 });
  console.log(JSON.stringify({ marker, htmlLen: len, status: saved && saved.status, outPath }));
} finally { await session.close(); }
