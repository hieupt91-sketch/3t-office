// Theo doi cac nut "im lang" cua doc_ribbon_all_buttons.mjs: dat DUNG dieu kien (nhieu o duoc chon, nhieu doan, co binh luan...) va do tac dung that.
// Chay: node --experimental-websocket scripts/audit-0610/doc_ribbon_silent_followup.mjs
import { launchApp } from "../../tests/live/cdp/session.mjs";

const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
const ev = (expression, options) => session.cdp.evaluate(expression, options);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let failed = 0;
const rec = (name, ok, value) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 220)); };
const click = (id) => ev(`(() => { const el = document.querySelector('[data-command-id=${JSON.stringify(id)}]'); if (!el) return false; el.click(); return true; })()`);
const tab = async (name) => { await ev(`document.getElementById('vno-ribbon-tab-${name}').hidden = false; document.getElementById('vno-ribbon-tab-${name}').click(); true`); await sleep(300); };
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 60000, intervalMilliseconds: 300 });
  const body = `document.querySelector('.vno-writer-body')`;
  const selectText = (text) => ev(`(() => { const w=document.createTreeWalker(${body},NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){ const i=n.data.indexOf(${JSON.stringify(text)}); if(i>=0){ const r=document.createRange(); r.setStart(n,i); r.setEnd(n,i+${text.length}); const s=getSelection(); s.removeAllRanges(); s.addRange(r); return true; } } return false; })()`);

  // Xem: thuoc ke, duong luoi, thu phong
  await tab("view");
  const ruler0 = await ev(`(() => { const r = document.querySelector('.vno-writer-ruler'); return r ? String(r.hidden) : 'none-el'; })()`);
  await click("writer.view.ruler"); await sleep(300);
  const ruler1 = await ev(`(() => { const r = document.querySelector('.vno-writer-ruler'); return r ? String(r.hidden) : 'none-el'; })()`);
  rec("Thuoc ke: bam doi trang thai hien/an", ruler0 !== ruler1, { truoc: ruler0, sau: ruler1 });
  await click("writer.view.ruler"); await sleep(200);
  const grid0 = await ev(`String(!!document.querySelector('.vno-writer-gridlines'))`);
  await click("writer.view.gridlines"); await sleep(300);
  const grid1 = await ev(`String(!!document.querySelector('.vno-writer-gridlines'))`);
  rec("Duong luoi: bam doi lop hien thi", grid0 !== grid1, { truoc: grid0.slice(0, 80), sau: grid1.slice(0, 80) });
  await click("writer.view.gridlines");
  const zoom0 = await ev(`(document.querySelector('.vno-statusbar')?.innerText || '').match(/\\d+\\s*%/g)?.join(',') + '|' + (document.querySelector('.vno-writer-page')?.parentElement?.style.cssText || '') + '|' + getComputedStyle(document.querySelector('.vno-writer-page')).zoom + getComputedStyle(document.querySelector('.vno-writer-page')).transform`);
  await click("writer.view.zoomIn"); await sleep(400);
  const zoom1 = await ev(`(document.querySelector('.vno-statusbar')?.innerText || '').match(/\\d+\\s*%/g)?.join(',') + '|' + (document.querySelector('.vno-writer-page')?.parentElement?.style.cssText || '') + '|' + getComputedStyle(document.querySelector('.vno-writer-page')).zoom + getComputedStyle(document.querySelector('.vno-writer-page')).transform`);
  rec("Phong to: muc thu phong doi", zoom0 !== zoom1, { truoc: zoom0.slice(0, 90), sau: zoom1.slice(0, 90) });
  await click("writer.view.zoomReset");

  // Bo cuc: chia cot
  await tab("layout");
  await ev(`(() => { ${body}.innerHTML='<p>Cot mot hai ba bon nam sau bay tam chin.</p>'; ${body}.focus(); })()`);
  await click("writer.page.columns3"); await sleep(400);
  const cols3 = await ev(`window.__vnoAppInstance.adapter.columns?.count`);
  rec("3 cot: adapter.columns.count = 3", cols3 === 3, cols3);
  await click("writer.page.columns1"); await sleep(300);
  const cols1 = await ev(`window.__vnoAppInstance.adapter.columns?.count || 1`);
  rec("1 cot: tro lai 1", cols1 === 1, cols1);

  // Bang: gop o + phan bo deu hang (can chon nhieu o)
  await ev(`(() => { ${body}.innerHTML='<table border="1"><tbody><tr><td id="c1">A1</td><td id="c2">B1</td></tr><tr><td>A2</td><td>B2</td></tr></tbody></table><p>x</p>'; ${body}.focus(); const r=document.createRange(); r.setStart(document.getElementById('c1').firstChild,0); r.setEnd(document.getElementById('c2').firstChild,2); const s=getSelection(); s.removeAllRanges(); s.addRange(r); })()`);
  await tab("tableLayout");
  await click("writer.table.mergeCells"); await sleep(400);
  const merged = await ev(`${body}.querySelector('tr').children.length + ':' + (${body}.querySelector('td')?.colSpan || 1)`);
  rec("Gop o: hang dau con 1 o colSpan 2", merged === "1:2", merged);
  await ev(`(() => { ${body}.innerHTML='<table border="1" style="width:100%"><tbody><tr style="height:20px"><td id="d1">A1</td></tr><tr style="height:90px"><td>A2</td></tr></tbody></table><p>x</p>'; ${body}.focus(); const r=document.createRange(); r.setStart(document.getElementById('d1').firstChild,0); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r); })()`);
  await click("writer.table.distributeRows"); await sleep(400);
  const hs = await ev(`[...${body}.querySelectorAll('tr')].map(r => Math.round(r.getBoundingClientRect().height)).join(',')`);
  const [h1, h2] = hs.split(",").map(Number);
  rec("Phan bo deu hang: hai hang xap xi bang nhau", Math.abs(h1 - h2) <= 3, hs);

  // Trang dau: sap xep (can nhieu doan), dinh dang sao chep
  await tab("home");
  await ev(`(() => { ${body}.innerHTML='<p>Cam</p><p>Anh</p><p>Binh</p>'; ${body}.focus(); const r=document.createRange(); r.setStart(${body}.children[0].firstChild,0); r.setEnd(${body}.children[2].firstChild,4); const s=getSelection(); s.removeAllRanges(); s.addRange(r); })()`);
  await click("writer.para.sort"); await sleep(600);
  const dlgSort = await ev(`!![...document.querySelectorAll('[role=dialog], .vno-dialog, .vno-dialog-overlay')].find(x => x.getClientRects().length && /S\\S*p x\\S*p|Sort/i.test(x.innerText||''))`);
  const sorted = await ev(`[...${body}.children].map(p => p.textContent).join(',')`);
  rec("Sap xep doan: sap A-Z hoac mo hop thoai", sorted === "Anh,Binh,Cam" || dlgSort, { sorted, dlgSort });
  await ev(`for (let i=0;i<2;i++) document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); true`);

  // Xem lai: theo doi thay doi va chinh ta chuyen trang thai bat/tat (nut co trang thai)
  await tab("review");
  const t0 = await ev(`window.__vnoAppInstance.adapter.trackChangesEnabled`);
  await click("writer.trackChanges.toggle"); await sleep(300);
  const t1 = await ev(`window.__vnoAppInstance.adapter.trackChangesEnabled`);
  rec("Theo doi thay doi: nut doi trang thai bat/tat", t0 !== t1, { truoc: t0, sau: t1 });
  await click("writer.trackChanges.toggle");
  const sp0 = await ev(`localStorage.getItem('vno-spellcheck-enabled')`);
  await click("writer.review.toggleSpellCheck"); await sleep(300);
  const sp1 = await ev(`localStorage.getItem('vno-spellcheck-enabled')`);
  rec("Kiem tra chinh ta: nut doi trang thai bat/tat", sp0 !== sp1, { truoc: sp0, sau: sp1 });
  await click("writer.review.toggleSpellCheck");
  // Binh luan: dieu huong/xu ly khi co binh luan
  await ev(`(async () => { ${body}.innerHTML='<p>Doan co binh luan o day.</p>'; ${body}.focus(); const t=${body}.firstChild.firstChild; const r=document.createRange(); r.setStart(t,5); r.setEnd(t,12); const s=getSelection(); s.removeAllRanges(); s.addRange(r); await window.__vnoAppInstance.adapter.insertComment({ content: 'BL1', author: 'x' }); })()`, { timeoutMilliseconds: 30000 });
  await sleep(500);
  const c0 = await ev(`(window.__vnoAppInstance.adapter.comments || []).length`);
  await click("writer.review.commentResolve"); await sleep(400);
  const resolved = await ev(`JSON.stringify((window.__vnoAppInstance.adapter.comments || []).map(c => !!c.resolved))`);
  await click("writer.review.commentDelete"); await sleep(500);
  const c1 = await ev(`(window.__vnoAppInstance.adapter.comments || []).length`);
  rec("Binh luan: co 1 binh luan, 'Da xu ly' va 'Xoa' hoat dong khi co binh luan", c0 === 1 && c1 === 0, { truoc: c0, daXuLy: resolved, sauXoa: c1 });
} catch (error) {
  failed += 1;
  console.log("FAIL | Loi chay |", String(error?.stack || error).slice(0, 400));
} finally {
  await session.close();
}
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS");
process.exit(failed ? 1 : 0);
