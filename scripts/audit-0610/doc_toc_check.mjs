// Kiem tra MUC LUC (Tham chieu > Muc luc tu dong / Cap nhat) tren tai lieu co nhieu tieu de that, trong app desktop (CDP).
// Do: so muc, noi dung & cap tung muc so voi tieu de that cua tai lieu, bam muc de nhay dung tieu de, cap nhat khi them tieu de, Hoan tac.
// Chay: node --experimental-websocket scripts/audit-0610/doc_toc_check.mjs [docx]
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press } from "../../tests/live/cdp/actions.mjs";
const file = process.argv.slice(2).find((a) => !a.startsWith("--")) || "E:\\VN OFice\\file test\\landocx\\d13.docx";
const session = await launchApp("writer", { filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 2000", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(5000);
  out.headings = await ev(`(() => [...document.querySelectorAll('.vno-writer-body h1,.vno-writer-body h2,.vno-writer-body h3,.vno-writer-body h4,.vno-writer-body h5,.vno-writer-body h6')].filter(h => !h.closest('.vno-toc-block')).map(h => ({ lvl: +h.tagName[1], text: h.textContent.trim().replace(/\\s+/g, ' ').slice(0, 60) })))()`);
  // dat con tro o dau tai lieu
  await ev(`(() => { const b = document.querySelector('.vno-writer-body'); b.focus(); const p = b.querySelector('p, h1, h2, h3'); const r = document.createRange(); r.setStart(p, 0); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return true; })()`);
  await ev(`(() => { const t = document.getElementById('vno-ribbon-tab-references'); if (t) { t.hidden = false; t.click(); } return true; })()`);
  await sleep(500);
  await ev(`(() => { const e = [...document.querySelectorAll('.vno-ribbon-content [data-command-id="writer.reference.tocInsert"]')].find(x => x.offsetParent !== null); e && e.click(); return !!e; })()`);
  await sleep(1500);
  out.toc = await ev(`(() => { const blk = document.querySelector('.vno-toc-block'); if (!blk) return null; const rows = [...blk.querySelectorAll('.vno-toc-entries > *')]; return { count: rows.length, empty: !!blk.querySelector('.vno-toc-empty'), first: rows.slice(0, 6).map(r => ({ cls: r.className.toString().slice(0, 40), text: r.textContent.trim().replace(/\\s+/g, ' ').slice(0, 70), lvl: r.dataset.level || r.dataset.vnoTocLevel || null, page: (r.querySelector('[class*=page]') || {}).textContent || null })), index: [...document.querySelectorAll('.vno-writer-body > *')].indexOf(blk) }; })()`);
  // bam muc thu 3 -> nhay dung tieu de
  out.click = await ev(`(() => { const blk = document.querySelector('.vno-toc-block'); const rows = blk ? [...blk.querySelectorAll('.vno-toc-entries > *')] : []; const r = rows[Math.min(10, rows.length - 1)]; if (!r) return null; const want = r.textContent.trim().replace(/\\s+/g, ' ').slice(0, 25); const a = r.querySelector('a, button, [role=link]') || r; a.click(); return { want }; })()`);
  await sleep(1200);
  out.afterClick = await ev(`(() => { const hs = [...document.querySelectorAll('.vno-writer-body h1,.vno-writer-body h2,.vno-writer-body h3,.vno-writer-body h4')].filter(h => !h.closest('.vno-toc-block')); let best = null, bd = 1e9; for (const h of hs) { const d = Math.abs(h.getBoundingClientRect().top - 120); if (d < bd) { bd = d; best = h; } } return { nearest: best ? best.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40) : null, dist: Math.round(bd) }; })()`);
  // them 1 tieu de moi o giua tai lieu roi Cap nhat muc luc
  const before = out.toc ? out.toc.count : 0;
  await ev(`(() => { const b = document.querySelector('.vno-writer-body'); const ps = [...b.querySelectorAll(':scope > p')].filter(p => p.textContent.trim().length > 30); const p = ps[Math.floor(ps.length / 2)]; const h = document.createElement('h1'); h.textContent = 'TIEU DE KIEM THU MUC LUC'; p.after(h); return true; })()`);
  await ev(`(() => { const e = [...document.querySelectorAll('.vno-ribbon-content [data-command-id="writer.reference.tocUpdate"]')].find(x => x.offsetParent !== null); e && e.click(); return !!e; })()`);
  await sleep(1500);
  out.afterUpdate = await ev(`(() => { const blk = document.querySelector('.vno-toc-block'); const rows = blk ? [...blk.querySelectorAll('.vno-toc-entries > *')] : []; return { count: rows.length, hasNew: rows.some(r => /TIEU DE KIEM THU/i.test(r.textContent)), blocks: document.querySelectorAll('.vno-toc-block').length }; })()`);
  out.beforeCount = before;
} finally { await session.close(); }
console.log(JSON.stringify(out, null, 1));
const hs = out.headings || [];
const maxLvlUsed = Math.max(0, ...hs.map((h) => h.lvl));
console.log(`TIEU DE THAT: ${hs.length} (cap toi da ${maxLvlUsed}); MUC LUC: ${out.toc ? out.toc.count : "khong co"} muc; sau them tieu de + cap nhat: ${out.afterUpdate ? out.afterUpdate.count : "?"} (co tieu de moi: ${out.afterUpdate ? out.afterUpdate.hasNew : "?"}); khoi muc luc sau cap nhat: ${out.afterUpdate ? out.afterUpdate.blocks : "?"}`);
