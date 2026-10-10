// Bam TUNG nut cua 1 tab ribbon (chuot that qua CDP) tren tai lieu DAI trong app desktop, in phan THAY DOI THAT cua tai lieu:
// thuoc tinh the goc, so phan tu theo the/lop, kieu doan duoc chon, hop thoai mo ra; roi dong hop thoai + Ctrl+Z.
// Chay: node --experimental-websocket scripts/audit-0610/doc_tab_effect_probe.mjs <tabId> [docx] [--only=id1,id2]
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press } from "../../tests/live/cdp/actions.mjs";
const args = process.argv.slice(2);
const tab = args.find((a) => !a.startsWith("--")) || "layout";
const file = args.filter((a) => !a.startsWith("--"))[1] || "E:\\VN OFice\\file test\\landocx\\d07.docx";
const only = (args.find((a) => a.startsWith("--only=")) || "").replace("--only=", "").split(",").filter(Boolean);
const session = await launchApp("writer", { filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SKIP = /^common\.file\.(open|save|saveAs|new|close|recent|share|options|backstage|exportPdf)|^common\.app\.|^common\.help\./;

const SELECT = `(() => {
  const b = document.querySelector('.vno-writer-body');
  const ps = [...b.querySelectorAll(':scope > p')].filter(p => p.textContent.trim().length > 80 && !p.querySelector('img'));
  const p = ps[Math.floor(ps.length / 2)]; p.id = 'probe-target';
  const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let n, tn = null;
  while ((n = w.nextNode())) { if (n.data.trim().length > 25) { tn = n; break; } }
  b.focus(); p.scrollIntoView({ block: 'center' });
  const st = Math.max(0, tn.data.search(/\\S/));
  const r = document.createRange(); r.setStart(tn, st); r.setEnd(tn, Math.min(tn.data.length, st + 20));
  const s = getSelection(); s.removeAllRanges(); s.addRange(r); return true;
})()`;
const SNAP = `(() => {
  const b = document.querySelector('.vno-writer-body'); const page = document.querySelector('.vno-writer-page');
  const p = document.getElementById('probe-target');
  const count = {}; b.querySelectorAll('*').forEach(e => { const k = e.tagName + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''); count[k] = (count[k] || 0) + 1; });
  const attrs = (el) => el ? Object.fromEntries([...el.attributes].filter(a => a.name !== 'id').map(a => [a.name, a.value.slice(0, 160)])) : {};
  const dlg = [...document.querySelectorAll('[role=dialog], .vno-dialog-box, .vno-modal')].filter(d => d.offsetParent !== null).map(d => (d.getAttribute('aria-label') || d.querySelector('h1,h2,h3,.vno-dialog-title')?.textContent || d.textContent).trim().slice(0, 60));
  const menu = [...document.querySelectorAll('[role=menu]')].filter(m => m.offsetParent !== null).map(m => [...m.querySelectorAll('[data-command-id]')].map(x => x.dataset.commandId).slice(0, 12).join(','));
  return { bodyAttrs: attrs(b), pageAttrs: attrs(page), pAttrs: attrs(p), pHeight: p ? Math.round(p.getBoundingClientRect().height) : null,
    pageCount: document.querySelectorAll('.vno-page-auto-gap').length + 1, htmlLen: b.innerHTML.length, count, dlg, menu,
    cssVars: Object.fromEntries(['--vno-page-width','--vno-page-height','--vno-page-margin-top','--vno-page-margin-left','--vno-columns'].map(k => [k, getComputedStyle(page || b).getPropertyValue(k)])) };
})()`;
const diff = (a, b) => {
  const out = [];
  for (const sect of ["bodyAttrs", "pageAttrs", "pAttrs", "cssVars"]) {
    for (const k of new Set([...Object.keys(a[sect] || {}), ...Object.keys(b[sect] || {})])) {
      if ((a[sect] || {})[k] !== (b[sect] || {})[k]) out.push(`${sect}.${k}: "${(a[sect] || {})[k] ?? ""}" -> "${(b[sect] || {})[k] ?? ""}"`);
    }
  }
  for (const k of new Set([...Object.keys(a.count), ...Object.keys(b.count)])) {
    if ((a.count[k] || 0) !== (b.count[k] || 0)) out.push(`+${(b.count[k] || 0) - (a.count[k] || 0)} <${k}>`);
  }
  if (a.pHeight !== b.pHeight) out.push(`doan chieu cao ${a.pHeight}->${b.pHeight}px`);
  if (a.pageCount !== b.pageCount) out.push(`so trang ${a.pageCount}->${b.pageCount}`);
  if (b.dlg.length) out.push(`HOP THOAI: ${b.dlg.join(' | ')}`);
  if (b.menu.length) out.push(`MENU: ${b.menu.join(' || ').slice(0, 200)}`);
  return out;
};
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 5000", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(6000);
  await ev(`(() => { const t = document.getElementById('vno-ribbon-tab-${tab}'); if (t) { t.hidden = false; t.click(); } return !!t; })()`);
  await sleep(500);
  const buttons = await ev(`[...document.querySelectorAll('.vno-ribbon-content [data-command-id]')].filter(x => x.offsetParent !== null && !x.closest('[hidden]')).map(x => ({ id: x.dataset.commandId, label: (x.getAttribute('aria-label') || x.title || x.textContent || '').trim().slice(0, 40), tag: x.tagName, toggle: x.getAttribute('aria-pressed') }))`);
  // Muc nam trong menu tha xuong: mo tung nut tha xuong, doc cac muc, de bam ve sau qua chinh nut tha xuong do.
  const toggles = await ev(`[...document.querySelectorAll('.vno-ribbon-content button[data-dropdown-toggle]')].filter(x => x.offsetParent !== null).map((x, i) => ({ i, id: x.dataset.commandId || x.dataset.dropdownToggle || ('toggle' + i), label: (x.getAttribute('aria-label') || x.title || x.textContent || '').trim().slice(0, 40) }))`);
  const subItems = [];
  for (const t of toggles) {
    await ev(`(() => { const x = [...document.querySelectorAll('.vno-ribbon-content button[data-dropdown-toggle]')].filter(e => e.offsetParent !== null)[${t.i}]; x && x.click(); return true; })()`);
    await sleep(350);
    const items = await ev(`[...document.querySelectorAll('[role=menu] [data-command-id], .vno-dropdown-menu [data-command-id], .vno-ribbon-dropdown [data-command-id]')].filter(x => x.offsetParent !== null).map(x => ({ id: x.dataset.commandId, label: (x.getAttribute('aria-label') || x.title || x.textContent || '').trim().slice(0, 40), arg: x.dataset.commandArg || x.dataset.arg || '' }))`);
    for (const it of items) subItems.push({ ...it, tag: "BUTTON", via: t.i, viaLabel: t.label });
    await press(session.cdp, "Escape", {}, 200);
    await ev(`document.body.click(); true`);
    await sleep(200);
  }
  console.log(`(tim thay ${buttons.length} nut truc tiep, ${toggles.length} nut tha xuong, ${subItems.length} muc trong menu)`);
  const seen = new Set(); let n = 0;
  for (const btn of [...buttons, ...subItems]) {
    const key = btn.id + "|" + (btn.arg || "") + "|" + (btn.via ?? "");
    if (seen.has(key) || SKIP.test(btn.id) || btn.tag === "SELECT" || btn.tag === "INPUT") continue;
    if (only.length && !only.includes(btn.id)) continue;
    seen.add(key); n += 1;
    await ev(`(() => { document.querySelectorAll('[role=dialog] button[data-dialog-action="cancel"], .vno-dialog-box [data-dialog-action="cancel"]').forEach(b => b.click()); return true; })()`);
    await ev(SELECT);
    const before = await ev(SNAP);
    if (btn.via !== undefined) {
      await ev(`(() => { const x = [...document.querySelectorAll('.vno-ribbon-content button[data-dropdown-toggle]')].filter(e => e.offsetParent !== null)[${btn.via}]; x && x.click(); return true; })()`);
      await sleep(350);
      await ev(`(() => { const e = [...document.querySelectorAll('[role=menu] [data-command-id="${btn.id}"], .vno-dropdown-menu [data-command-id="${btn.id}"], .vno-ribbon-dropdown [data-command-id="${btn.id}"]')].filter(x => x.offsetParent !== null).find(x => ${JSON.stringify(btn.arg)} === '' || (x.dataset.commandArg || x.dataset.arg || '') === ${JSON.stringify(btn.arg)}); e && e.click(); return !!e; })()`);
    } else {
      await ev(`(() => { const e = [...document.querySelectorAll('.vno-ribbon-content [data-command-id="${btn.id}"]')].find(x => x.offsetParent !== null); e && e.click(); return !!e; })()`);
    }
    await sleep(900);
    const after = await ev(SNAP);
    const d = diff(before, after);
    console.log(`## ${btn.via !== undefined ? "[menu " + btn.viaLabel + "] " : ""}${btn.id}${btn.arg ? "(" + btn.arg + ")" : ""} | ${btn.label} | ${d.length ? d.join(" ; ") : "KHONG DOI GI (im lang?)"}`);
    // dong hop thoai / menu, hoan tac
    await press(session.cdp, "Escape", {}, 250);
    await ev(`(() => { document.querySelectorAll('[role=dialog] [data-dialog-action="cancel"], .vno-dialog-box [data-dialog-action="cancel"], .vno-dialog-box .vno-dialog-close').forEach(b => b.click()); return true; })()`);
    await sleep(300);
    await ev(`document.querySelector('.vno-writer-body').focus(); true`);
    if (d.some((x) => !x.startsWith("HOP THOAI") && !x.startsWith("MENU"))) await press(session.cdp, "z", { ctrl: true }, 450);
  }
  console.log(`TONG ${n} nut tab ${tab}`);
} finally { await session.close(); }
