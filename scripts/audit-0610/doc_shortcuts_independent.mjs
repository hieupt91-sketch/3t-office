// Kiem tra DOC LAP phim tat Word tren tai lieu dai (d07, 55 trang) trong app desktop that (CDP, khong SendKeys).
// Moi phim: chon 1 doan GIUA tai lieu, bam phim, do HIEU QUA that (queryCommandState / kieu / the khoi), roi Ctrl+Z phai tra lai noi dung.
// Chay: node --experimental-websocket scripts/audit-0610/doc_shortcuts_independent.mjs [duong-dan-docx]
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press } from "../../tests/live/cdp/actions.mjs";

const file = process.argv.slice(2).find((a) => !a.startsWith("--")) || "E:\\VN OFice\\file test\\landocx\\d07.docx";
const session = await launchApp("writer", { filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rows = [];

// Chon 20 ky tu dau cua 1 doan o khoang giua tai lieu (khong nam trong bang/danh sach).
const SELECT = `(() => {
  const b = document.querySelector('.vno-writer-body');
  const ps = [...b.querySelectorAll(':scope > p')].filter(p => p.textContent.trim().length > 60 && !p.closest('table,li'));
  if (!ps.length) return null;
  const p = ps[Math.floor(ps.length / 2)];
  const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let n, tn = null;
  while ((n = w.nextNode())) { if (n.data.trim().length > 25) { tn = n; break; } }
  if (!tn) return null;
  b.focus();
  const start = Math.max(0, tn.data.search(/\\S/));
  const r = document.createRange(); r.setStart(tn, start); r.setEnd(tn, Math.min(tn.data.length, start + 20));
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  window.__sel = { text: s.toString(), id: (p.id || (p.id = 'sc-target')) };
  p.scrollIntoView({ block: 'center' });
  return { text: s.toString(), tag: p.tagName };
})()`;
const STATE = (cmd) => `document.queryCommandState('${cmd}')`;
const BLOCK = `(() => { const p = document.getElementById(window.__sel.id); const li = p && p.closest('li'); const b = p && p.closest('h1,h2,h3,h4,h5,h6,p,li'); return b ? b.tagName : (p ? p.tagName : ''); })()`;
const SNAP = `(() => document.querySelector('.vno-writer-body').innerHTML.length)()`;
const LH = `(() => { const sel = getSelection(); let n = sel.anchorNode; n = n.nodeType === 3 ? n.parentElement : n; const b = n.closest('p,h1,h2,h3,h4,h5,h6,li'); const cs = getComputedStyle(b); return Math.round(parseFloat(cs.lineHeight) / parseFloat(cs.fontSize) * 100) / 100; })()`;
const FS = `(() => { const sel = getSelection(); let n = sel.anchorNode; n = n.nodeType === 3 ? n.parentElement : n; return parseFloat(getComputedStyle(n).fontSize); })()`;
const TXT = `(() => document.getElementById(window.__sel.id)?.textContent.slice(0, 120) || '')()`;

const cases = [
  { name: "Ctrl+B in dam", key: "b", mod: { ctrl: true }, probe: STATE("bold"), expect: true },
  { name: "Ctrl+I in nghieng", key: "i", mod: { ctrl: true }, probe: STATE("italic"), expect: true },
  { name: "Ctrl+U gach chan", key: "u", mod: { ctrl: true }, probe: STATE("underline"), expect: true },
  { name: "Ctrl+E can giua", key: "e", mod: { ctrl: true }, probe: STATE("justifyCenter"), expect: true },
  { name: "Ctrl+R can phai", key: "r", mod: { ctrl: true }, probe: STATE("justifyRight"), expect: true },
  { name: "Ctrl+L can trai", key: "l", mod: { ctrl: true }, probe: STATE("justifyLeft"), expect: true },
  { name: "Ctrl+J can deu", key: "j", mod: { ctrl: true }, probe: STATE("justifyFull"), expect: true },
  { name: "Ctrl+1 gian dong don", key: "1", mod: { ctrl: true }, probe: LH, check: (v) => v >= 0.95 && v <= 1.35 },
  { name: "Ctrl+2 gian dong doi", key: "2", mod: { ctrl: true }, probe: LH, check: (v) => v >= 1.9 && v <= 2.45 },
  { name: "Ctrl+5 gian dong 1.5", key: "5", mod: { ctrl: true }, probe: LH, check: (v) => v >= 1.45 && v <= 1.85 },
  { name: "Ctrl+Shift+L dau dong", key: "l", mod: { ctrl: true, shift: true }, probe: `(() => { const p = document.getElementById(window.__sel.id); return !!(p && (p.closest('ul') || document.querySelector('.vno-writer-body ul li')) ); })()`, expect: true },
  { name: "Ctrl+Alt+1 Heading 1", key: "1", mod: { ctrl: true, alt: true }, probe: BLOCK, check: (v) => v === "H1" },
  { name: "Ctrl+Space xoa dinh dang (sau Ctrl+B)", pre: [{ key: "b", mod: { ctrl: true } }], key: " ", mod: { ctrl: true }, probe: STATE("bold"), expect: false },
  { name: "Ctrl+] tang co chu", key: "]", mod: { ctrl: true }, probe: FS, relative: "up" },
  { name: "Ctrl+[ giam co chu", key: "[", mod: { ctrl: true }, probe: FS, relative: "down" },
  { name: "Shift+F3 doi hoa/thuong", key: "F3", mod: { shift: true }, probe: TXT, relative: "textchange" },
  { name: "Ctrl+= chi so duoi", key: "=", mod: { ctrl: true }, probe: STATE("subscript"), expect: true },
  { name: "Ctrl+Shift+= chi so tren", key: "=", mod: { ctrl: true, shift: true }, probe: STATE("superscript"), expect: true },
];

try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 5000", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(5000);
  const info = await ev(`({ paras: document.querySelectorAll('.vno-writer-body p').length, pages: document.querySelectorAll('.vno-page-auto-gap').length + 1 })`);
  console.log("tai lieu:", JSON.stringify(info));
  for (const c of cases) {
    const sel = await ev(SELECT);
    if (!sel) { rows.push({ name: c.name, result: "BLOCKED: khong chon duoc doan" }); continue; }
    for (const pre of c.pre || []) { await press(session.cdp, pre.key, pre.mod || {}, 250); }
    const beforeLen = await ev(SNAP);
    const beforeVal = c.relative ? await ev(c.probe) : null;
    await press(session.cdp, c.key, c.mod || {}, 450);
    const val = await ev(c.probe);
    let pass;
    if (c.relative === "up") pass = val > beforeVal;
    else if (c.relative === "down") pass = val < beforeVal;
    else if (c.relative === "textchange") pass = val !== beforeVal;
    else if (c.check) pass = !!c.check(val);
    else pass = val === c.expect;
    // Hoan tac: Ctrl+Z (tuc la 1 buoc cho phim chinh; phim "pre" can them 1 lan)
    const undoCount = 1 + (c.pre ? c.pre.length : 0);
    for (let i = 0; i < undoCount; i += 1) await press(session.cdp, "z", { ctrl: true }, 350);
    const afterLen = await ev(SNAP);
    const undoOk = Math.abs(afterLen - beforeLen) <= 2 || afterLen === beforeLen;
    rows.push({ name: c.name, value: JSON.stringify(val), beforeVal: JSON.stringify(beforeVal), effect: pass ? "DUNG" : "SAI/CAM", undo: undoOk ? "OK" : `lech(${beforeLen}->${afterLen})` });
  }
} finally { await session.close(); }
for (const r of rows) console.log(`${r.effect || r.result} | ${r.name} | gia tri=${r.value ?? ""} truoc=${r.beforeVal ?? ""} | hoan tac=${r.undo ?? ""}`);
const bad = rows.filter((r) => r.effect !== "DUNG" || r.undo !== "OK");
console.log(`TONG | ${rows.length - bad.length}/${rows.length} dung va hoan tac duoc | ${bad.length} loi`);
process.exitCode = bad.length ? 1 : 0;
