// D15: nhom tinh nang thu 2 luu DOCX dung (hop van ban, chu nghe thuat, phuong trinh, cot, chu thich anh, tham chieu cheo, so dong, chu cai dau doan, ky hieu).
// Chay: node --experimental-websocket scripts/audit-0610/doc_features2_roundtrip.mjs
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";

const run = promisify(execFile);
const docx = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "vno-feat2-")), "feat2.docx");
let failed = 0;
const rec = (name, ok, value) => {
  if (!ok) failed += 1;
  console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 200));
};

const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
try {
  const ev = (expression, options) => session.cdp.evaluate(expression, options);
  const A = "window.__vnoAppInstance.adapter";
  await ev(`(() => { const b=document.querySelector('.vno-writer-body'); b.innerHTML='<p>BOXP</p><p>ARTP</p><p>EQP</p><p>SYMP</p><p>CAPP</p><p>DROPP van ban dai de thu chu cai dau doan</p><p>COLP</p><p>COLP2</p>'; b.focus(); })()`);
  const caret = (mark) => ev(`(() => { const w=document.createTreeWalker(document.querySelector('.vno-writer-body'),NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){ if(n.data.trim().startsWith(${JSON.stringify(mark)})){ const r=document.createRange(); r.setStart(n,n.data.length); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r); return true; } } return false; })()`);
  const call = async (label, expression) => {
    try { const result = await ev(expression); rec(`Goi ${label}`, result !== false && result !== null, result); } catch (error) { rec(`Goi ${label}`, false, String(error).slice(0, 150)); }
  };
  await caret("BOXP");
  await call("insertTextBox", `(() => !!${A}.insertTextBox({ text: 'NOIDUNGBOX' }))()`);
  await caret("ARTP");
  await call("insertWordArt", `(() => !!${A}.insertWordArt({ text: 'CHUARTNT', preset: 'blue' }))()`);
  await caret("EQP");
  await call("insertEquation", `(() => !!${A}.insertEquation({ linear: 'a/b + x^2' }))()`);
  await caret("SYMP");
  await call("insertSymbol", `(() => !!${A}.insertSymbol({ symbol: '©' }) || !!${A}.insertSymbol('©'))()`);
  await call("setColumns(2)", `(() => !!${A}.setColumns({ count: 2, gap: 10 }))()`);
  await call("setLineNumbers", `(() => !!${A}.setLineNumbers('continuous'))()`);
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",${A}._contentForExport(),${JSON.stringify(docx)},null)`, { timeoutMilliseconds: 1200000 });
  rec("Luu DOCX", saved?.status === "ok", saved?.status);
} catch (error) {
  rec("Loi chay", false, String(error?.stack || error));
} finally {
  await session.close();
}

const py = String.raw`import sys,zipfile,re,json
z=zipfile.ZipFile(sys.argv[1]); x=z.read('word/document.xml').decode('utf-8')
print(json.dumps({
 'textbox': 'NOIDUNGBOX' in x and bool(re.search(r'txbx|<w:pict|w:framePr|wps:|<w:tbl',x)),
 'wordart': 'CHUARTNT' in x,
 'equation': '<m:oMath' in x,
 'symbol': '©' in x,
 'columns': bool(re.search(r'<w:cols[^>]*w:num="2"',x)),
 'lineNumbers': '<w:lnNumType' in x,
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
