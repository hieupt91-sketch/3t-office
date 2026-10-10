// Go 1 ky tu vao tai lieu nhap tu DOCX (nhu phep sua cua bo kiem tra DOCX) roi in danh sach bang bi bao 'da sua' (vno-table-edits).
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { typeText } from "../../tests/live/cdp/actions.mjs";
const file = process.argv.slice(2).find((a) => !a.startsWith("--")) || "E:\\VN OFice\\file test\\landocx\\d01.docx";
const session = await launchApp("writer", { filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 300", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(6000);
  const where = await ev(`(() => {
    const b = document.querySelector('.vno-writer-body'); b.focus();
    const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT); let n, tn = null;
    while ((n = w.nextNode())) { if (n.data.trim().length > 60 && !n.parentElement.closest('.vno-toc-block')) { tn = n; break; } }
    const r = document.createRange(); r.setStart(tn, Math.min(10, tn.data.length)); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    return { inTable: !!tn.parentElement.closest('table'), text: tn.data.trim().slice(0, 30) };
  })()`);
  await typeText(session.cdp, "x", 60);
  await sleep(800);
  const edits = await ev(`(() => {
    const a = window.__vnoAppInstance.adapter; const clone = a.bodyDom.cloneNode(true);
    const e = a._tableEditsForExport(clone);
    const tb = [...clone.querySelectorAll('table')].filter(t => !t.parentElement.closest('table')).find(t => a._tableKeyText(t) === (e[0] ? e[0].k : '')); const why = tb ? { srcRows: tb.getAttribute('data-vno-src-rows'), rows: tb.rows.length, badRows: [...tb.rows].map((r, i) => ({ i, idx: r.getAttribute('data-vno-src-idx'), cells: r.getAttribute('data-vno-src-cells'), now: r.cells.length })).filter(x => x.idx === null || Number(x.idx) !== x.i || x.cells === null || Number(x.cells) !== x.now).slice(0, 6), rowSpan: [...tb.querySelectorAll('td,th')].filter(c => c.rowSpan > 1).length } : null; return { count: e.length, row7: tb ? tb.rows[7].outerHTML.slice(0, 260) : null, why };
  })()`);
  console.log(JSON.stringify({ where, edits }));
} finally { await session.close(); }
