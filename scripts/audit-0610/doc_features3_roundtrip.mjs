// D15: nhom 3 - chu thich hinh/bang (SEQ), tham chieu cheo (REF), danh muc hinh, chu cai dau doan, ngat trang, ngat muc doi huong, dau trang/chan trang + so trang.
// Chay: node --experimental-websocket scripts/audit-0610/doc_features3_roundtrip.mjs
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";

const run = promisify(execFile);
const docx = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "vno-feat3-")), "feat3.docx");
let failed = 0;
const rec = (name, ok, value) => {
  if (!ok) failed += 1;
  console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 200));
};

const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
try {
  const ev = (expression, options) => session.cdp.evaluate(expression, options);
  const A = "window.__vnoAppInstance.adapter";
  await ev(`(() => { const b=document.querySelector('.vno-writer-body'); b.innerHTML='<h1>MUCMOT</h1><p>CAPP</p><p>REFP</p><p>DROPP van ban dai de thu chu cai dau doan lon</p><p>BREAKP</p><p>SECP</p>'; b.focus(); })()`);
  const caret = (mark) => ev(`(() => { const w=document.createTreeWalker(document.querySelector('.vno-writer-body'),NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){ if(n.data.trim().startsWith(${JSON.stringify(mark)})){ const r=document.createRange(); r.setStart(n,n.data.length); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r); return true; } } return false; })()`);
  const call = async (label, expression) => {
    try { const result = await ev(expression); rec(`Goi ${label}`, result !== false && result !== null, result); } catch (error) { rec(`Goi ${label}`, false, String(error).slice(0, 150)); }
  };
  await caret("CAPP");
  await call("insertCaption", `(() => !!${A}.insertCaption({ kind: 'Hình', text: 'NHANHINH1' }))()`);
  await caret("REFP");
  await call("insertCrossReference", `(() => !!${A}.insertCrossReference({ type: 'heading', target: 'MUCMOT' }))()`);
  await caret("DROPP");
  await call("applyDropCap", `(() => !!${A}.applyDropCap({ lines: 3 }))()`);
  await caret("BREAKP");
  await call("insertPageBreak", `(() => !!${A}._insertPageBreak({ count: 1 }))()`);
  await caret("SECP");
  await call("insertSectionBreak(nextPage)", `(() => !!${A}.insertSectionBreak('nextPage'))()`);
  await call("setPageSetup(landscape)", `(() => !!${A}.setPageSetup({ orientation: 'landscape' }))()`);
  await ev(`(() => { const h = document.querySelector('.vno-writer-header, [data-vno-zone=header]'); if (h) { h.innerHTML = '<p>DAUTRANGX</p>'; } const f = document.querySelector('.vno-writer-footer, [data-vno-zone=footer]'); if (f) { f.innerHTML = '<p>CHANTRANGX</p>'; } return !!h && !!f; })()`);
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",${A}._contentForExport(),${JSON.stringify(docx)},null)`, { timeoutMilliseconds: 1200000 });
  rec("Luu DOCX", saved?.status === "ok", saved?.status);
} catch (error) {
  rec("Loi chay", false, String(error?.stack || error));
} finally {
  await session.close();
}

const py = String.raw`import sys,zipfile,re,json
z=zipfile.ZipFile(sys.argv[1]); names=z.namelist(); x=z.read('word/document.xml').decode('utf-8')
parts=''.join(z.read(n).decode('utf-8','replace') for n in names if re.match(r'word/(header|footer)\d*\.xml',n))
print(json.dumps({
 'caption': 'NHANHINH1' in x,
 'captionSEQ': bool(re.search(r'SEQ\s',x)),
 'crossRef': bool(re.search(r'REF\s|w:hyperlink w:anchor',x)),
 'dropCap': bool(re.search(r'w:dropCap|<w:framePr[^>]*w:dropCap',x)),
 'pageBreak': bool(re.search(r'<w:br w:type="page"/>|<w:pageBreakBefore',x)),
 'sectionBreak': len(re.findall(r'<w:sectPr',x))>=2,
 'landscape': 'w:orient="landscape"' in x,
 'headerText': 'DAUTRANGX' in parts,
 'footerText': 'CHANTRANGX' in parts,
}))`;
try {
  const { stdout } = await run(process.env.VNO_PYTHON || "python", ["-c", py, docx], { encoding: "utf8" });
  const result = JSON.parse(stdout);
  for (const [key, value] of Object.entries(result)) rec(`DOCX: ${key}`, value, value);
} catch (error) {
  rec("Loi doc DOCX", false, String(error).slice(0, 200));
}
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS");
process.exit(failed ? 1 : 0);
