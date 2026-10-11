// Ma tran GAP: nhom tinh nang thu 4 luu DOCX dung (hang tieu de lap, cac loai ngat muc, trang bia, trang trang, muc luc, danh sach da cap, huong/le giay, dau trang, tieu de trang dau khac).
// Chay: node --experimental-websocket scripts/audit-0610/doc_matrix_roundtrip.mjs
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";

const run = promisify(execFile);
const docx = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "vno-matrix4-")), "matrix4.docx");
let failed = 0;
const rec = (name, ok, value) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 200)); };
const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
try {
  const ev = (expression, options) => session.cdp.evaluate(expression, options);
  const A = "window.__vnoAppInstance.adapter";
  await session.cdp.waitFor("!!(globalThis.globalUnoBridge && globalThis.globalUnoBridge.desktopApi && globalThis.globalUnoBridge.hasRealEngine)", { timeoutMilliseconds: 120000, intervalMilliseconds: 500 });
  await ev(`(() => { const b=document.querySelector('.vno-writer-body'); b.innerHTML='<h1>MUCMOT</h1><p>SEC1P</p><p>TBLP</p><p>SEC2P</p><p>SEC3P</p><p>MLP</p><p>BKP</p><p>LNKP</p><p>ENDP</p>'; b.focus(); })()`);
  const caret = (mark) => ev(`(() => { const w=document.createTreeWalker(document.querySelector('.vno-writer-body'),NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){ if(n.data.trim().startsWith(${JSON.stringify(mark)})){ const r=document.createRange(); r.setStart(n,n.data.length); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r); return true; } } return false; })()`);
  const call = async (label, expression) => { try { const r = await ev(expression, { timeoutMilliseconds: 60000 }); rec(`Goi ${label}`, r !== false && r !== null && r !== undefined, r); } catch (e) { rec(`Goi ${label}`, false, String(e).slice(0, 150)); } };
  await caret("TBLP");
  await call("insertTable(2,3)", `(() => !!${A}.insertTable(2,3))()`);
  await call("toggleTableHeaderRow", `(() => { const c=document.querySelector('.vno-writer-body table td'); const r=document.createRange(); r.selectNodeContents(c); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r); return !!${A}.toggleTableHeaderRow(); })()`);
  await caret("SEC1P"); await call("section continuous", `(() => !!${A}.insertSectionBreak('continuous'))()`);
  await caret("SEC2P"); await call("section evenPage", `(() => !!${A}.insertSectionBreak('evenPage'))()`);
  await caret("SEC3P"); await call("section oddPage", `(() => !!${A}.insertSectionBreak('oddPage'))()`);
  await caret("MLP"); await call("applyMultilevelList", `(() => !!${A}.applyMultilevelList('decimal'))()`);
  await caret("BKP"); await call("insertBookmark", `(async () => !!(await ${A}.insertBookmark({ name: 'MARKBK' })))()`);
  await caret("LNKP"); await call("insertHyperlink", `(() => !!${A}.insertHyperlink({ url: 'https://example.com/lnk', text: 'LNKTEXT' }))()`);
  await call("setPageSetup landscape+margins", `(() => !!${A}.setPageSetup({ orientation: 'landscape', size: 'a4', margins: { top: 22, bottom: 22, left: 33, right: 17 } }))()`);
  await call("setDifferentFirstPage", `(() => !!${A}.setDifferentFirstPage(true))()`);
  await call("setWatermark", `(() => !!${A}.setWatermark({ text: 'WMKDRAFT', color: '#cccccc', opacity: 0.4 }))()`);
  await caret("ENDP"); await call("insertBlankPage", `(() => !!${A}.insertBlankPage())()`);
  await call("insertTableOfContents", `(() => !!${A}.insertTableOfContents())()`);
  await call("insertCoverPage", `(() => { const id = (${A}.coverPageTemplates || ${A}._coverTemplates || [])[0]?.id; return !!${A}.insertCoverPage(id || 'report', { title: 'COVERTITLE' }); })()`);
  { const exp = await ev(`${A}._contentForExport()`); const m = exp.match(/<!--vno-sections-meta: (\[[\s\S]*?\]) -->/); const meta = m ? JSON.parse(m[1]) : []; console.log("META:", JSON.stringify(meta.map(x => x.id + ":" + x.type + ":" + x.breakMarkerPresent))); console.log("DOMMARKERS:", JSON.stringify(await ev(`[...document.querySelectorAll(".vno-writer-body .vno-section-break")].map(x=>x.dataset.vnoSectionBreak+">"+x.dataset.vnoSectionId)`))); }
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",${A}._contentForExport(),${JSON.stringify(docx)},null)`, { timeoutMilliseconds: 1200000 });
  rec("Luu DOCX", saved?.status === "ok", saved?.status);
} catch (error) { rec("Loi chay", false, String(error?.stack || error)); } finally { await session.close(); }

const py = String.raw`import sys,zipfile,re,json
z=zipfile.ZipFile(sys.argv[1]); names=z.namelist(); x=z.read('word/document.xml').decode('utf-8')
allx=x+''.join(z.read(n).decode('utf-8','ignore') for n in names if n.startswith('word/header') or n.startswith('word/footer'))
num=z.read('word/numbering.xml').decode('utf-8') if 'word/numbering.xml' in names else ''
types=re.findall(r'<w:sectPr[\s\S]*?</w:sectPr>',x)
tt=[(re.search(r'<w:type w:val="(\w+)"',s) or [None,'nextPage'])[1] if re.search(r'<w:type ',s) else 'nextPage' for s in types]
print(json.dumps({
 'tblHeader': '<w:tblHeader' in x,
 'sectionCount': len(types),
 'sectionTypes': tt,
 'hasContinuous': 'continuous' in tt, 'hasEven': 'evenOnly' in tt or 'evenPage' in tt, 'hasOdd': 'oddOnly' in tt or 'oddPage' in tt,
 'landscape': bool(re.search(r'<w:pgSz[^>]*w:orient="landscape"',x)),
 'pgMar': re.findall(r'<w:pgMar[^>]*/>',x)[-1:] ,
 'titlePg': '<w:titlePg' in x,
 'multilevel': num.count('<w:lvl ')>=9 or 'multiLevelType' in num,
 'bookmark': 'markbk' in x.lower(),
 'hyperlink': 'LNKTEXT' in x and ('<w:hyperlink' in x or 'HYPERLINK' in x),
 'watermark': 'WMKDRAFT' in allx,
 'toc': ('TOC \\' in x) or ('w:sdt' in x and 'TOC' in x) or 'MUCMOT' in x,
 'tocField': bool(re.search(r'TOC\s+\\',x)),
 'cover': 'COVERTITLE' in x,
 'pageBreaks': x.count('w:type="page"')+x.count('<w:pageBreakBefore'),
}))`;
try {
  const { stdout } = await run(process.env.VNO_PYTHON || "python", ["-c", py, docx], { encoding: "utf8" });
  const r = JSON.parse(stdout);
  console.log(JSON.stringify(r));
  rec("DOCX: hang tieu de lap (w:tblHeader)", r.tblHeader, r.tblHeader);
  rec("DOCX: nhieu section (>=4)", r.sectionCount >= 4, r.sectionCount);
  rec("DOCX: section lien tuc", r.hasContinuous, r.sectionTypes);
  rec("DOCX: section trang chan", r.hasEven, r.sectionTypes);
  rec("DOCX: section trang le", r.hasOdd, r.sectionTypes);
  rec("DOCX: huong ngang", r.landscape, r.landscape);
  rec("DOCX: le trang", r.pgMar.length > 0, r.pgMar);
  rec("DOCX: trang dau khac (titlePg)", r.titlePg, r.titlePg);
  rec("DOCX: danh sach da cap", r.multilevel, r.multilevel);
  rec("DOCX: dau trang (bookmark)", r.bookmark, r.bookmark);
  rec("DOCX: lien ket", r.hyperlink, r.hyperlink);
  rec("DOCX: hinh mo", r.watermark, r.watermark);
  rec("DOCX: muc luc (truong TOC)", r.tocField, r.tocField);
  rec("DOCX: trang bia", r.cover, r.cover);
  rec("DOCX: ngat trang (trang trang)", r.pageBreaks >= 1, r.pageBreaks);
} catch (error) { rec("Loi doc DOCX", false, String(error).slice(0, 200)); }
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS");
process.exit(failed ? 1 : 0);