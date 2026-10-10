// Do Thut le (Ctrl+M / nut Thut le / Giam thut le) tren tai lieu dai: le trai/phai tinh ra, the boc, luu DOCX (w:ind) neu co.
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press } from "../../tests/live/cdp/actions.mjs";
const file = process.argv.slice(2).find((a) => !a.startsWith("--")) || "E:\\VN OFice\\file test\\landocx\\d07.docx";
const session = await launchApp("writer", { filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MEASURE = `(() => {
  const p = document.getElementById('probe-target'); const page = document.querySelector('.vno-writer-page') || document.querySelector('.vno-writer-body');
  const pr = p.getBoundingClientRect(); const br = page.getBoundingClientRect();
  const bq = p.closest('blockquote'); let depth = 0; for (let e = p; e && e !== document.body; e = e.parentElement) if (e.tagName === 'BLOCKQUOTE') depth++;
  const cs = getComputedStyle(p), cb = bq ? getComputedStyle(bq) : null;
  return { leftFromPage: Math.round(pr.left - br.left), rightFromPage: Math.round(br.right - pr.right), width: Math.round(pr.width),
    pMarginLeft: cs.marginLeft, pMarginRight: cs.marginRight, pTextIndent: cs.textIndent, bqDepth: depth,
    bqMarginLeft: cb && cb.marginLeft, bqMarginRight: cb && cb.marginRight, parent: p.parentElement.tagName, style: p.getAttribute('style') };
})()`;
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 5000", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(6000);
  await ev(`(() => {
    const b = document.querySelector('.vno-writer-body');
    const ps = [...b.querySelectorAll(':scope > p')].filter(p => p.textContent.trim().length > 80 && !p.querySelector('img'));
    const p = ps[Math.floor(ps.length / 2)]; p.id = 'probe-target';
    const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let n, tn = null;
    while ((n = w.nextNode())) { if (n.data.trim().length > 25) { tn = n; break; } }
    b.focus(); p.scrollIntoView({ block: 'center' });
    const st = Math.max(0, tn.data.search(/\\S/)); const r = document.createRange(); r.setStart(tn, st); r.setEnd(tn, st + 10);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r); return true; })()`);
  console.log("0 goc          ", JSON.stringify(await ev(MEASURE)));
  for (let i = 1; i <= 3; i += 1) {
    await press(session.cdp, "m", { ctrl: true }, 600);
    console.log(`${i} Ctrl+M        `, JSON.stringify(await ev(MEASURE)));
  }
  for (let i = 1; i <= 2; i += 1) {
    await press(session.cdp, "m", { ctrl: true, shift: true }, 600);
    console.log(`${i} Ctrl+Shift+M  `, JSON.stringify(await ev(MEASURE)));
  }
} finally { await session.close(); }
