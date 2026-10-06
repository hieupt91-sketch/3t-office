// Ma tran GAP batch 5: tham chieu (trich dan, thu muc, chu thich + danh muc hinh), chu de, truong tron thu, co dong doan (keepNext/widow/pageBreakBefore) luu DOCX dung.
// Chay: node --experimental-websocket scripts/audit-0610/doc_matrix_roundtrip2.mjs
import fs from "node:fs/promises"; import os from "node:os"; import path from "node:path";
import { execFile } from "node:child_process"; import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";
const run = promisify(execFile);
const docx = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "vno-matrix5-")), "matrix5.docx");
let failed = 0;
const rec = (name, ok, value) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 220)); };
const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
try {
  const ev = (e, o) => session.cdp.evaluate(e, o); const A = "window.__vnoAppInstance.adapter"; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await session.cdp.waitFor("!!(globalThis.globalUnoBridge && globalThis.globalUnoBridge.desktopApi && globalThis.globalUnoBridge.hasRealEngine)", { timeoutMilliseconds: 120000, intervalMilliseconds: 500 });
  await ev(`(() => { const b=document.querySelector('.vno-writer-body'); b.innerHTML='<h1>HEADKEEP</h1><p>PARAKEEP noi dung</p><p>CITEP</p><p>BIBP</p><p>CAPFIG</p><p>TOFP</p><p>MERGEP</p><p>WIDOWP</p><p>BREAKP</p>'; b.focus(); })()`);
  const caret = (mark) => ev(`(() => { const w=document.createTreeWalker(document.querySelector('.vno-writer-body'),NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){ if(n.data.trim().startsWith(${JSON.stringify(mark)})){ const r=document.createRange(); r.setStart(n,n.data.length); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r); return true; } } return false; })()`);
  const call = async (label, expression) => { try { const r = await ev(expression, { timeoutMilliseconds: 60000 }); rec(`Goi ${label}`, r !== false && r !== null && r !== undefined, r); } catch (e) { rec(`Goi ${label}`, false, String(e).slice(0, 150)); } };
  // Hop thoai doan van: tick giu cung trang / ngat trang truoc / tat mo coi goa
  const paraFlags = async (mark, flags) => {
    await caret(mark);
    await ev(`document.querySelector('[data-command="writer.format.paragraphDialog"]')?.click(); true`); await sleep(500);
    await ev(`(() => { const set=(id,v)=>{ const e=document.querySelector(id); if(e && e.checked!==v) e.click(); }; ${flags} const ok=document.querySelector('.vno-dialog-box .vno-dialog-ok-btn, .vno-dialog-box [data-ok], .vno-dialog-box .vno-dialog-submit-btn') || [...document.querySelectorAll('.vno-dialog-box button')].filter(b=>/Đồng ý|OK|Áp dụng|Lưu/i.test(b.innerText)).pop(); ok?.click(); })()`); await sleep(500);
  };
  await ev(`(() => { const t=document.getElementById('vno-ribbon-tab-home'); t.hidden=false; t.click(); })()`); await sleep(300);
  await paraFlags("HEADKEEP", `set('#vno-para-keepnext', true);`);
  await paraFlags("WIDOWP", `set('#vno-para-widow', false);`);
  await paraFlags("BREAKP", `set('#vno-para-pagebefore', true);`);
  await caret("CITEP"); await call("setCitationStyle(MLA)", `(() => !!${A}.setCitationStyle('mla'))()`);
  await call("insertCitation", `(() => !!${A}.insertCitation({ id: 'src-a', type: 'book', author: 'Nguyen Van A', title: 'SACHMAU', year: '2020', publisher: 'NXB Moi' }))()`);
  await caret("BIBP"); await call("insertBibliography", `(() => !!${A}.insertBibliography())()`);
  await caret("CAPFIG"); await call("insertCaption", `(() => !!${A}.insertCaption({ label: 'Hình', text: 'CHUTHICHMAU' }))()`);
  await caret("TOFP"); await call("insertTableOfFigures", `(() => !!${A}.insertTableOfFigures({}))()`);
  await caret("MERGEP"); await call("insertMergeField", `(() => !!${A}.insertMergeField({ field: 'HoTen' }))()`);
  await call("applyDocumentTheme", `(() => !!${A}.applyDocumentTheme('office'))()`);
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",${A}._contentForExport(),${JSON.stringify(docx)},null)`, { timeoutMilliseconds: 1200000 });
  rec("Luu DOCX", saved?.status === "ok", saved?.status);
} catch (error) { rec("Loi chay", false, String(error?.stack || error)); } finally { await session.close(); }
const py = String.raw`import sys,zipfile,re,json
z=zipfile.ZipFile(sys.argv[1]); x=z.read('word/document.xml').decode('utf-8')
def para(t):
    for m in re.finditer(r'<w:p\b[\s\S]*?</w:p>',x):
        if t in re.sub(r'<[^>]+>','',m.group(0)): return m.group(0)
    return ''
head=para('HEADKEEP'); wid=para('WIDOWP'); brk=para('BREAKP')
print(json.dumps({
 'keepNext': '<w:keepNext' in head,
 'widowOff': bool(re.search(r'<w:widowControl w:val="(0|false)"',wid)),
 'pageBreakBefore': ('<w:pageBreakBefore' in brk) or bool(re.search(r'<w:br w:type="page"/></w:r></w:p><w:p>(?:(?!</w:p>).)*BREAKP',x)),
 'citationText': 'Nguyen' in x or 'NXB' in x,
 'bibliography': 'SACHMAU' in x,
 'captionSeq': bool(re.search(r'SEQ\s+(Hình|Figure|Hinh)',x,re.I)) and 'CHUTHICHMAU' in x,
 'tofField': bool(re.search(r'TOC\s+\\[^"<]*[cC]',x)) or 'TOF' in x or bool(re.search(r'instrText[^>]*>\s*TOC',x)),
 'mergeField': 'MERGEFIELD' in x and 'HoTen' in x,
}))`;
try {
  const { stdout } = await run(process.env.VNO_PYTHON || "python", ["-c", py, docx], { encoding: "utf8" });
  const r = JSON.parse(stdout); console.log(JSON.stringify(r));
  for (const [k, v] of Object.entries(r)) rec(`DOCX: ${k}`, v, v);
} catch (error) { rec("Loi doc DOCX", false, String(error).slice(0, 200)); }
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS");
process.exit(failed ? 1 : 0);