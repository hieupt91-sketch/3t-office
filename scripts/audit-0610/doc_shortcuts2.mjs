// D9: kiem chung phim tat VN Writer bang CDP, MOI phim co dieu kien dau + doi chieu trang thai thuc.
// Chay: node --experimental-websocket scripts/audit-0610/doc_shortcuts2.mjs
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press } from "../../tests/live/cdp/actions.mjs";
const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
const results = [];
const ev = (e) => session.cdp.evaluate(e);
const SETUP = `(() => { const b=document.querySelector('.vno-writer-body'); b.innerHTML='<p>Xin chào các bạn</p><p>Đoạn hai ở đây</p>'; b.focus(); const t=b.firstChild.firstChild; const r=document.createRange(); r.setStart(t,0); r.setEnd(t,t.length); const s=getSelection(); s.removeAllRanges(); s.addRange(r); window.__ud = null; })()`;
const P1 = `document.querySelector('.vno-writer-body p').outerHTML`;
const FS = `(() => { const p=document.querySelector('.vno-writer-body p'); let n=p; while(n.firstElementChild && n.firstElementChild.tagName!=='BR') n=n.firstElementChild; return parseFloat(getComputedStyle(n).fontSize); })()`;
const IND = `(() => { const p=document.querySelector('.vno-writer-body p'); let sum=0; for (let n=p; n && !n.classList?.contains('vno-writer-body'); n=n.parentElement) { const c=getComputedStyle(n); sum+=parseFloat(c.marginLeft)+parseFloat(c.paddingLeft); } return sum+parseFloat(getComputedStyle(p).textIndent||0); })()`;
const VIS = `[...document.querySelectorAll('[role=dialog], .vno-dialog, .vno-find-panel, .vno-findbar, [class*=find], [class*=replace]')].filter(x => x.getClientRects().length > 0 && !/Tiếng Việt/.test(x.innerText||'') && (x.innerText||'').trim().length > 0).length + (document.querySelector('.vno-ai-sidebar:not(.is-hidden)') ? 1 : 0)`;
const add = (key, status, detail) => { results.push({ key, status, detail }); console.log(`${status.padEnd(9)} ${key.padEnd(15)} ${detail || ""}`); };
async function keyTest(key, combo, mods, check, opts = {}) {
  try {
    await ev(SETUP);
    const before = { html: await ev(P1), fs: await ev(FS), ind: await ev(IND), vis: await ev(VIS), text: await ev(`document.querySelector('.vno-writer-body').innerText`) };
    if (opts.pre) await opts.pre();
    await press(session.cdp, combo, mods, 500);
    const after = { html: await ev(P1), fs: await ev(FS), ind: await ev(IND), vis: await ev(VIS), text: await ev(`document.querySelector('.vno-writer-body').innerText`) };
    const verdict = await check(before, after);
    add(key, verdict === true ? "CO" : "SAI", verdict === true ? "" : String(verdict || `truoc=${before.html.slice(0,90)} sau=${after.html.slice(0,120)}`));
    for (let i = 0; i < 2; i++) await press(session.cdp, "Escape", {}, 120).catch(() => {});
  } catch (e) { add(key, "LOI", String(e).slice(0, 120)); }
}
try {
  await keyTest("Ctrl+B", "b", { ctrl: true }, (b, a) => /<(b|strong)\b|font-weight/i.test(a.html) && !/<(b|strong)\b/i.test(b.html));
  await keyTest("Ctrl+I", "i", { ctrl: true }, (b, a) => /<(i|em)\b|font-style/i.test(a.html));
  await keyTest("Ctrl+U", "u", { ctrl: true }, (b, a) => /<u\b|underline/i.test(a.html));
  await keyTest("Ctrl+L", "l", { ctrl: true }, (b, a) => /text-align:\s*left|align="left"/i.test(a.html) || b.html === a.html && "trai la mac dinh (khong doi)");
  await keyTest("Ctrl+E", "e", { ctrl: true }, (b, a) => /text-align:\s*center/i.test(a.html));
  await keyTest("Ctrl+R", "r", { ctrl: true }, (b, a) => /text-align:\s*right/i.test(a.html));
  await keyTest("Ctrl+J", "j", { ctrl: true }, async () => (await ev(`getComputedStyle(document.querySelector('.vno-writer-body p')).textAlign`)) === "justify" || "doan khong o che do can deu", { pre: async () => { await press(session.cdp, "e", { ctrl: true }, 300); } });
  await keyTest("Ctrl+1", "1", { ctrl: true }, (b, a) => /--vno-lh:\s*1(\.0)?\b/.test(a.html));
  await keyTest("Ctrl+2", "2", { ctrl: true }, (b, a) => /--vno-lh:\s*2(\.0)?\b/.test(a.html));
  await keyTest("Ctrl+5", "5", { ctrl: true }, (b, a) => /--vno-lh:\s*1\.5/.test(a.html));
  await keyTest("Ctrl+Shift+>", ">", { ctrl: true, shift: true }, (b, a) => a.fs > b.fs || `co chu ${b.fs} -> ${a.fs}`);
  await keyTest("Ctrl+Shift+<", "<", { ctrl: true, shift: true }, (b, a) => a.fs < b.fs || `co chu ${b.fs} -> ${a.fs}`);
  await keyTest("Ctrl+]", "]", { ctrl: true }, (b, a) => a.fs > b.fs || `co chu ${b.fs} -> ${a.fs}`);
  await keyTest("Ctrl+[", "[", { ctrl: true }, (b, a) => a.fs < b.fs || `co chu ${b.fs} -> ${a.fs}`);
  await keyTest("Ctrl+M", "m", { ctrl: true }, (b, a) => a.ind > b.ind || `thut le ${b.ind} -> ${a.ind}`);
  await keyTest("Ctrl+Shift+M", "m", { ctrl: true, shift: true }, async (b, a) => { const mid = await ev(`window.__indMid`); return (mid > 0 && a.ind < mid) || `thut le truoc ${mid} -> sau ${a.ind}`; }, { pre: async () => { await press(session.cdp, "m", { ctrl: true }, 400); await ev(`window.__indMid = ${IND}`); } });
  await keyTest("Ctrl+Enter", "Enter", { ctrl: true }, (b, a) => /page-break|vno-page-break/i.test(a.html + "") || (a.text !== b.text) || "khong thay dau ngat trang");
  await keyTest("Shift+F3", "F3", { shift: true }, (b, a) => a.text !== b.text || "chu khong doi hoa/thuong");
  await keyTest("Ctrl+A", "a", { ctrl: true }, async () => (await ev(`getSelection().toString().replace(/\\s+/g,'').length`)) >= 20 || "vung chon khong phai toan bo");
  await keyTest("Ctrl+Home", "Home", { ctrl: true }, async () => (await ev(`(()=>{const s=getSelection(); const b=document.querySelector('.vno-writer-body'); const n=s.anchorNode; if(!n) return false; if(n===b) return s.anchorOffset===0; const p=(n.nodeType===3?n.parentElement:n).closest('p'); return p===b.querySelector('p') && s.anchorOffset===0})()`)) || "con tro khong o dau tai lieu", { pre: async () => { await ev(`(()=>{const b=document.querySelector('.vno-writer-body'); const t=b.lastChild.firstChild; const r=document.createRange(); r.setStart(t,3); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r);})()`); } });
  await keyTest("Ctrl+End", "End", { ctrl: true }, async () => (await ev(`(()=>{const s=getSelection(); const b=document.querySelector('.vno-writer-body'); const n=s.anchorNode; if(!n) return false; if(n===b) return s.anchorOffset>=b.childNodes.length; const p=(n.nodeType===3?n.parentElement:n).closest('p'); return p===b.lastElementChild && s.anchorOffset>=(n.nodeType===3?n.length:0)})()`)) || "con tro khong o cuoi tai lieu", { pre: async () => { await ev(`(()=>{const b=document.querySelector('.vno-writer-body'); const t=b.firstChild.firstChild; const r=document.createRange(); r.setStart(t,2); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r);})()`); } });
  // Hoan tac / lam lai
  try {
    await ev(SETUP); await press(session.cdp, "b", { ctrl: true }, 500);
    const bold = await ev(P1); await press(session.cdp, "z", { ctrl: true }, 600); const undone = await ev(P1);
    await press(session.cdp, "y", { ctrl: true }, 600); const redone = await ev(P1);
    add("Ctrl+Z", !/<(b|strong)\b/i.test(undone) && /<(b|strong)\b/i.test(bold) ? "CO" : "SAI", `dam=${/<(b|strong)\b/i.test(bold)} sau Z=${/<(b|strong)\b/i.test(undone)}`);
    add("Ctrl+Y", /<(b|strong)\b/i.test(redone) ? "CO" : "SAI", `sau Y dam=${/<(b|strong)\b/i.test(redone)}`);
  } catch (e) { add("Ctrl+Z/Y", "LOI", String(e).slice(0, 100)); }
  // Hop thoai / bang tim kiem
  for (const [k, c, mods] of [["Ctrl+F", "f", { ctrl: true }], ["Ctrl+H", "h", { ctrl: true }], ["Ctrl+K", "k", { ctrl: true }], ["F7", "F7", {}]]) {
    await keyTest(k, c, mods, (b, a) => a.vis > b.vis || `bang/hop thoai hien: ${b.vis} -> ${a.vis}`);
  }
  // Can he dieu hanh (hop thoai tep goc): chi kiem tra khong loi
  for (const k of ["Ctrl+N", "Ctrl+O", "Ctrl+S", "Ctrl+P", "F12", "Ctrl+Shift+S"]) add(k, "BO QUA", "mo hop thoai tep/in cua he dieu hanh - khong dieu khien duoc bang CDP, xem ma tran lenh");
  const tally = results.reduce((o, r) => (o[r.status] = (o[r.status] || 0) + 1, o), {});
  console.log("TONG:", JSON.stringify(tally));
} finally { await session.close(); }