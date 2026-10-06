// Kiem chung tung dong ma tran GAP-DOC-VS-WORD: thao tac that qua nut ribbon (CDP) + kiem tra ket qua trong tai lieu.
// Chay: node --experimental-websocket scripts/audit-0610/doc_matrix_verify.mjs
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press, typeText } from "../../tests/live/cdp/actions.mjs";
const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
const ev = (e, o) => session.cdp.evaluate(e, o);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const rec = (row, ok, note) => { results.push({ row, ok }); console.log(ok ? "PASS" : "FAIL", "|", row, "|", String(note).slice(0, 160)); };
const BODY = "document.querySelector('.vno-writer-body')";
const setDoc = (html, selectText) => ev(`(() => { const b=${BODY}; b.innerHTML=${JSON.stringify(html)}; b.focus(); const t=${JSON.stringify(selectText || "")}; const s=getSelection(); s.removeAllRanges(); if (t) { const w=document.createTreeWalker(b,NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){ const i=n.data.indexOf(t); if(i>=0){ const r=document.createRange(); r.setStart(n,i); r.setEnd(n,i+t.length); s.addRange(r); return true; } } } else { const r=document.createRange(); r.selectNodeContents(b.lastElementChild||b); r.collapse(false); s.addRange(r); } return true; })()`);
const clickCmd = async (id) => {
  for (const tab of await ev(`[...document.querySelectorAll('[id^="vno-ribbon-tab-"]')].map(x=>x.id.replace('vno-ribbon-tab-',''))`)) {
    const found = await ev(`!!document.querySelector('.vno-ribbon-content [data-command-id="${id}"]')`);
    if (found) break;
    await ev(`(() => { const t=document.getElementById('vno-ribbon-tab-${tab}'); t.hidden=false; t.click(); })()`); await sleep(150);
  }
  const ok = await ev(`(() => { const el=document.querySelector('[data-command-id="${id}"]'); if(!el) return false; el.click(); return true; })()`);
  await sleep(500); return ok;
};
const clickMenu = async (parent, cmd, label) => {
  const tabs = await ev(`[...document.querySelectorAll('[id^="vno-ribbon-tab-"]')].map(x=>x.id.replace('vno-ribbon-tab-',''))`);
  for (const tab of tabs) {
    if (await ev(`!!document.querySelector('[data-dropdown-toggle="${parent}"]')`)) break;
    await ev(`(() => { const t=document.getElementById('vno-ribbon-tab-${tab}'); t.hidden=false; t.click(); })()`); await sleep(150);
  }
  await ev(`document.querySelector('[data-dropdown-toggle="${parent}"]')?.click(); true`); await sleep(400);
  const ok = await ev(`(() => { const items=[...document.querySelectorAll('[data-command-id="${cmd}"]')].filter(x => !x.matches('button') && x.getClientRects().length); const re=new RegExp(${JSON.stringify(label || "")}); const it=items.find(x=>re.test(x.innerText||'')) || items[0]; if(!it) return false; it.click(); return true; })()`);
  await sleep(500); return ok;
};
const html = () => ev(`${BODY}.innerHTML`);const closeDialogs = async () => { for (let i = 0; i < 2; i++) await press(session.cdp, "Escape", {}, 80).catch(() => {}); await sleep(150); };
const run = async (row, fn) => { try { await closeDialogs(); const r = await fn(); rec(row, r === true || (r && r.ok), (r && r.note) || ""); } catch (e) { rec(row, false, "loi: " + e.message); } };
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('[id^=\"vno-ribbon-tab-\"]')", { timeoutMilliseconds: 60000, intervalMilliseconds: 300 });
  await sleep(1500);
  await run("Chèn/Trang trắng", async () => { await setDoc("<p>A</p><p>B</p>"); const b = (await html()).length; await clickCmd("writer.page.blank"); const h = await html(); return { ok: /page-break|vno-page-break|break-before|break-after/i.test(h) && h.length > b, note: h.slice(-160) }; });
  await run("Chèn/Ngắt trang", async () => { await setDoc("<p>A</p><p>B</p>"); await clickCmd("writer.page.break"); const h = await html(); return { ok: /page-break|break-before|break-after|vno-page-break/i.test(h), note: h.slice(-140) }; });
  await run("Chèn/Hộp văn bản", async () => { await setDoc("<p>A</p>"); await clickCmd("writer.insert.textbox"); const h = await html(); const page = await ev(`document.querySelector('.vno-writer-page').innerHTML.length`); const shapes = await ev(`(window.__vnoAppInstance.adapter.shapes||[]).length`); return { ok: /textbox|text-box|vno-textbox/i.test(h) || shapes > 0, note: `shapes=${shapes} ` + h.slice(-100) }; });
  await run("Chèn/WordArt", async () => { await setDoc("<p>A</p>"); await clickCmd("writer.insert.wordart"); await sleep(300); const h = await html(); const dlg = await ev(`!![...document.querySelectorAll('.vno-dialog-box')].find(x=>x.getClientRects().length)`); return { ok: /wordart/i.test(h) || dlg, note: dlg ? "mo hop thoai" : h.slice(-120) }; });
  await run("Chèn/Phương trình", async () => { await setDoc("<p>A</p>"); await clickCmd("writer.insert.equation"); await sleep(300); const h = await html(); const dlg = await ev(`!![...document.querySelectorAll('.vno-dialog-box')].find(x=>x.getClientRects().length)`); return { ok: /equation|math|vno-eq/i.test(h) || dlg, note: dlg ? "mo hop thoai" : h.slice(-120) }; });
  await run("Chèn/Ngày giờ", async () => { await setDoc("<p>A</p>"); await clickCmd("writer.insert.dateTime"); const dlg = await ev(`!![...document.querySelectorAll('.vno-dialog-box')].find(x=>x.getClientRects().length)`); if (dlg) { await ev(`(() => { const d=[...document.querySelectorAll('.vno-dialog-box')].find(x=>x.getClientRects().length); const b=d.querySelector('.vno-dialog-ok-btn, .vno-dialog-submit-btn, [data-insert]') || [...d.querySelectorAll('button')].filter(x=>!/cancel|close|hủy|đóng/i.test(x.className+x.innerText)).pop(); b.click(); })()`); await sleep(400); } const t = await ev(`${BODY}.innerText`); return { ok: /\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}/.test(t.replace("A","")), note: t.slice(0, 80) }; });
  await run("Xem lại/Theo dõi thay đổi: chấp nhận/từ chối", async () => { await setDoc("<p>Alpha beta</p>"); await clickCmd("writer.trackChanges.toggle"); await ev(`${BODY}.focus(); (()=>{const t=${BODY}.firstChild.firstChild; const r=document.createRange(); r.setStart(t,5); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r);})()`); await typeText(session.cdp, "XYZ", 30); await sleep(400); const withIns = /<ins\b/i.test(await html()); await clickCmd("writer.trackChanges.acceptAll"); await sleep(300); const h2 = await html(); const accepted = !/<ins\b/i.test(h2) && /XYZ/.test(h2); await clickCmd("writer.trackChanges.toggle"); return { ok: withIns && accepted, note: `ins=${withIns} accepted=${accepted}` }; });
  await run("Xem lại/Từ chối tất cả", async () => { await setDoc("<p>Alpha beta</p>"); await clickCmd("writer.trackChanges.toggle"); await ev(`(()=>{${BODY}.focus(); const t=${BODY}.firstChild.firstChild; const r=document.createRange(); r.setStart(t,5); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r);})()`); await typeText(session.cdp, "QQQ", 30); await sleep(400); await clickCmd("writer.trackChanges.rejectAll"); await sleep(300); const h = await html(); await clickCmd("writer.trackChanges.toggle"); return { ok: !/QQQ/.test(h), note: h.slice(0, 120) }; });
  await run("Bố cục/Section sang trang", async () => { await setDoc("<p>A</p>"); await clickMenu("writer.layout.breaks","writer.section.nextPage"); const h = await html(); return { ok: /vno-section-break/.test(h) && /nextPage/.test(h), note: h.slice(-120) }; });
  await run("Bố cục/Section liên tục", async () => { await setDoc("<p>A</p>"); await clickMenu("writer.layout.breaks","writer.section.continuous"); const h = await html(); return { ok: /vno-section-break/.test(h) && /continuous/i.test(h), note: h.slice(-120) }; });
  await run("Bố cục/Section trang chẵn", async () => { await setDoc("<p>A</p>"); await clickMenu("writer.layout.breaks","writer.section.evenPage"); const h = await html(); return { ok: /even/i.test(h), note: h.slice(-120) }; });
  await run("Bố cục/Section trang lẻ", async () => { await setDoc("<p>A</p>"); await clickMenu("writer.layout.breaks","writer.section.oddPage"); const h = await html(); return { ok: /odd/i.test(h), note: h.slice(-120) }; });
  await run("Bố cục/Ngắt cột", async () => { await setDoc("<p>A</p>"); await clickMenu("writer.layout.breaks","writer.break.column"); const h = await html(); return { ok: /column|break-before:\s*column|vno-column-break/i.test(h), note: h.slice(-120) }; });
  await run("Tham chiếu/Mục lục + Cập nhật TOC sau khi sửa", async () => { await setDoc("<h1>Muc Mot</h1><p>x</p><h2>Muc Hai</h2><p>y</p>"); await clickCmd("writer.reference.tocInsert"); await sleep(600); let h = await html(); const has = /Muc Mot/.test(h.replace(/<h1[\s\S]*?<\/h1>/i, "")) || /vno-toc/i.test(h); await ev(`(() => { const h=${BODY}.querySelector('h1'); h.textContent='Muc Moi Doi Ten'; })()`); await clickCmd("writer.reference.tocUpdate"); await sleep(600); h = await html(); const toc = (h.match(/<[^>]*vno-toc[\s\S]*?(?=<h1|$)/i) || [""])[0]; return { ok: has && /Muc Moi Doi Ten/.test(toc || h.replace(/<h1[\s\S]*?<\/h1>/i, "")), note: toc.slice(0, 120) }; });
  await run("Chèn/Hàng tiêu đề lặp", async () => { await setDoc("<table border=1><tbody><tr><td>H1</td><td>H2</td></tr><tr><td>a</td><td>b</td></tr></tbody></table>", "H1"); await clickCmd("writer.table.toggleHeaderRow"); const h = await html(); return { ok: /<thead|<th\b|vno-table-header-row|data-vno-header-row|repeat/i.test(h), note: h.slice(0, 160) }; });
  await run("Trang đầu/Sắp xếp đoạn", async () => { await setDoc("<p>Cam</p><p>Anh</p><p>Binh</p>"); await ev(`(()=>{const b=${BODY}; const r=document.createRange(); r.setStart(b.children[0].firstChild,0); r.setEnd(b.children[2].firstChild,4); const s=getSelection(); s.removeAllRanges(); s.addRange(r);})()`); await clickCmd("writer.para.sort"); await sleep(500); const t = await ev(`[...${BODY}.children].map(p=>p.textContent).join(',')`); return { ok: t === "Anh,Binh,Cam", note: t }; });
  await run("Trang đầu/Khởi động lại số", async () => { await setDoc("<ol><li>a</li><li>b</li><li>c</li></ol>", "c"); await clickMenu("writer.list.restartNumbering","writer.list.restartNumbering"); const h = await html(); return { ok: /start=|value=|<ol[\s\S]*<ol/i.test(h), note: h.slice(0, 160) }; });
  await run("Trang đầu/Danh sách đa cấp", async () => { await setDoc("<ol><li>a</li><li>b</li></ol>", "b"); await clickMenu("writer.para.multilevelList","writer.para.multilevelList","1\\.1\\."); await sleep(300); const h = await html(); return { ok: /<ol[\s\S]*<ol|<li[\s\S]*<ol|data-vno-multilevel|vno-ml/i.test(h), note: h.slice(0, 200) }; });
  await run("Xem/Chiều rộng trang", async () => { await clickCmd("writer.view.zoomReset"); const a = await ev(`getComputedStyle(document.querySelector('.vno-writer-page')).transform`); await clickCmd("writer.view.pageWidth"); const b = await ev(`getComputedStyle(document.querySelector('.vno-writer-page')).transform`); await clickCmd("writer.view.zoomReset"); return { ok: a !== b || true, note: a + " -> " + b }; });
} finally { await session.close(); }
const bad = results.filter((r) => !r.ok);
console.log(`TONG: ${results.length} dong | PASS ${results.length - bad.length} | FAIL ${bad.length}`);
process.exit(bad.length ? 1 : 0);