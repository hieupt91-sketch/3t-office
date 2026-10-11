// Chan doan cac phim tat nghi van tren tai lieu dai: in phan HTML + style THAT SU doi cua doan sau moi phim, roi Ctrl+Z.
// Chay: node --experimental-websocket scripts/audit-0610/doc_shortcut_probe.mjs [docx]
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press } from "../../tests/live/cdp/actions.mjs";
const file = process.argv.slice(2).find((a) => !a.startsWith("--")) || "E:\\VN OFice\\file test\\landocx\\d07.docx";
const session = await launchApp("writer", { filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SELECT = `(() => {
  const b = document.querySelector('.vno-writer-body');
  const ps = [...b.querySelectorAll(':scope > p')].filter(p => p.textContent.trim().length > 80 && !p.querySelector('img'));
  const p = ps[Math.floor(ps.length / 2)]; p.id = 'probe-target';
  const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let n, tn = null;
  while ((n = w.nextNode())) { if (n.data.trim().length > 25) { tn = n; break; } }
  b.focus(); p.scrollIntoView({ block: 'center' });
  const st = Math.max(0, tn.data.search(/\\S/));
  const r = document.createRange(); r.setStart(tn, st); r.setEnd(tn, Math.min(tn.data.length, st + 20));
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  window.__beforeH = p.getBoundingClientRect().height; window.__beforeOuter = p.outerHTML; window.__beforeStyle = p.getAttribute('style') || '';
  return s.toString();
})()`;
const DIFF = `(() => {
  const p = document.getElementById('probe-target'); const a = window.__beforeOuter, b = p.outerHTML;
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const s = getSelection(); let n = s.anchorNode; n = n && (n.nodeType === 3 ? n.parentElement : n);
  const blk = n && n.closest('p,h1,h2,h3,h4,h5,h6,li'); const cs = n ? getComputedStyle(n) : null; const cb = blk ? getComputedStyle(blk) : null;
  return { heightBefore: window.__beforeH, heightAfter: p.getBoundingClientRect().height, lhOnP: getComputedStyle(p).lineHeight, vnoLhVar: getComputedStyle(p).getPropertyValue('--vno-lh'), styleBefore: window.__beforeStyle, styleAfter: p.getAttribute('style') || '', tagAfter: blk ? blk.tagName : null,
    selAfter: s.toString().slice(0, 30), fontSizeAfter: cs && cs.fontSize, lineHeight: cb && cb.lineHeight, blockFont: cb && cb.fontSize,
    firstDiffAt: i, beforeSnippet: a.slice(Math.max(0, i - 20), i + 90), afterSnippet: b.slice(Math.max(0, i - 20), i + 160) };
})()`;
const cases = [
  { name: "Ctrl+1", key: "1", mod: { ctrl: true } },
  { name: "Ctrl+2", key: "2", mod: { ctrl: true } },
  { name: "Ctrl+Alt+1", key: "1", mod: { ctrl: true, alt: true } },
  { name: "Ctrl+]", key: "]", mod: { ctrl: true } },
  { name: "Ctrl+Shift+> (key >)", key: ">", mod: { ctrl: true, shift: true } },
  { name: "Ctrl+Shift++ (key +)", key: "+", mod: { ctrl: true, shift: true } },
];
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 5000", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(6000);
  for (const c of cases) {
    await ev(SELECT);
    await press(session.cdp, c.key, c.mod, 600);
    const d = await ev(DIFF);
    console.log("== " + c.name + " :: " + JSON.stringify(d));
    await press(session.cdp, "z", { ctrl: true }, 400);
  }
} finally { await session.close(); }
