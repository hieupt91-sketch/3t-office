// D15: kiem chung ribbon Writer - moi lenh phai: doi noi dung, mo hop thoai, hoac thong bao; khong duoc im lang.
// Chay: node --experimental-websocket scripts/audit-0610/doc_cmd_smoke.mjs
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { insertText, press } from "../../tests/live/cdp/actions.mjs";
const IDS = (process.argv[2] || "").split(",").filter(Boolean);
const DEFAULT = ["writer.insert.coverPage","writer.page.blank","writer.page.break","writer.table.insert","writer.table.fromText","writer.insert.bookmark","writer.insert.crossReference","writer.header.insert","writer.footer.insert","writer.insert.textbox","writer.insert.wordart","writer.insert.dateTime","writer.insert.equation","writer.insert.symbol","writer.page.watermark","writer.page.color","writer.page.border","writer.page.setupDialog","writer.page.margins","writer.page.orientation","writer.page.size","writer.page.columns","writer.section.nextPage","writer.section.continuous","writer.section.evenPage","writer.section.oddPage","writer.section.options","writer.pageNumber.format","writer.section.delete","writer.reference.tocInsert","writer.reference.tocUpdate","writer.reference.footnoteInsert","writer.reference.endnoteInsert","writer.reference.citationInsert","writer.reference.sourcesManage","writer.reference.citationStyle","writer.reference.bibliographyInsert","writer.reference.captionInsert","writer.reference.tofInsert","writer.reference.tofUpdate"];
const ids = IDS.length ? IDS : DEFAULT;
const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
const out = [];
try {
  const ev = (e, o) => session.cdp.evaluate(e, o);
  const snap = () => ev(`(() => { const b=document.querySelector('.vno-writer-body'); const ds=[...document.querySelectorAll('.vno-dialog, .vno-modal, [role=dialog], .vno-dialog-overlay')].filter(x=>x.offsetParent!==null && !/Tiếng Việt/.test(x.innerText||'') && (x.innerText||'').trim().length>0); const d=ds[ds.length-1]; window.__dlgCount=ds.length; const n=document.querySelector('.vno-toast, .vno-notice, .vno-status-message, [role=status]'); return { len:b.innerHTML.length, html:b.innerHTML.slice(0,4000), tail:b.innerHTML.slice(-600), page:document.querySelector('.vno-writer-page')?.innerHTML.length, dialog: d? (d.innerText||'').slice(0,200).replace(/\\s+/g,' '):null, dlgCount: ds.length, notice:n? (n.innerText||'').slice(0,80):null, statusText: (document.querySelector('.vno-statusbar')?.innerText||'').slice(0,100).replace(/\\s+/g,' ') }; })()`);
  for (const id of ids) {
    await ev(`(() => { const b=document.querySelector('.vno-writer-body'); b.innerHTML='<p>Xin chao the gioi</p><p>Dong hai</p>'; b.focus(); const r=document.createRange(); r.setStart(b.firstChild.firstChild,3); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r); })()`);
    const before = await snap();
    let err = null;
    try { await ev(`setTimeout(() => { try { window.__vnoGlobalCommandBus.execute(${JSON.stringify(id)}, null); } catch (e) { window.__lastCmdErr = String(e); } }, 0); true`); } catch (e) { err = String(e).slice(0, 80); }
    await new Promise(r => setTimeout(r, 900));
    const after = await snap();
    const cmdErr = await ev(`window.__lastCmdErr || null`).catch(() => null);
    const changed = before.len !== after.len || before.html !== after.html || before.page !== after.page || before.tail !== after.tail;
    const rawKey = /\b(?:writer|common|platform)\.[a-z]+\.[A-Za-z.]{3,}\b/.exec(`${after.dialog || ""} ${after.notice || ""}`)?.[0];
    const result = rawKey ? "LO KHOA I18N" : cmdErr || err ? "LOI" : after.dialog ? "HOP THOAI" : changed ? "DOI NOI DUNG" : (after.notice || after.statusText !== before.statusText) ? "THONG BAO" : "IM LANG";
    out.push({ id, result, dialog: after.dialog, notice: after.notice, err: cmdErr || err });
    console.log(`${result.padEnd(13)} ${id}${after.dialog ? " | " + after.dialog : ""}${cmdErr ? " | " + cmdErr : ""}`);
    for (let i = 0; i < 3; i++) { await press(session.cdp, "Escape").catch(() => {}); await new Promise(r => setTimeout(r, 120)); }
    await ev(`window.__lastCmdErr = null`).catch(() => {});
  }
  const bad = out.filter(x => x.result === "IM LANG" || x.result === "LOI" || x.result === "LO KHOA I18N");
  console.log(`TONG: ${out.length} lenh | im lang/loi: ${bad.length} -> ${bad.map(x => x.id).join(", ")}`);
} finally { await session.close(); }