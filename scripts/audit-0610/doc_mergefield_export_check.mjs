// Truong tron thu luu DOCX thanh MERGEFIELD cua Word.
// Chay: node --experimental-websocket scripts/audit-0610/doc_mergefield_export_check.mjs
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";

const run = promisify(execFile);
const docx = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "vno-mf-")), "mf.docx");
let failed = 0;
const rec = (name, ok, value) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 200)); };
const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
try {
  const ev = (expression, options) => session.cdp.evaluate(expression, options);
  const A = "window.__vnoAppInstance.adapter";
  await ev(`(() => { const b=document.querySelector('.vno-writer-body'); b.innerHTML='<p>Kinh gui: </p>'; b.focus(); const t=b.firstChild.firstChild; const r=document.createRange(); r.setStart(t,t.length); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r); })()`);
  rec("Chen truong HoTen", await ev(`!!${A}.insertMergeField({ field: 'HoTen' })`), true);
  rec("Chen truong ChucVu", await ev(`!!${A}.insertMergeField({ field: 'ChucVu' })`), true);
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",${A}._contentForExport(),${JSON.stringify(docx)},null)`, { timeoutMilliseconds: 1200000 });
  rec("Luu DOCX", saved?.status === "ok", saved);
  const py = "import sys,zipfile,re\nx=zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode('utf-8')\nprint(re.findall(r'MERGEFIELD\\s+(\\w+)',x))";
  const { stdout } = await run(process.env.VNO_PYTHON || "python", ["-c", py, docx], { encoding: "utf8" });
  rec("DOCX co MERGEFIELD HoTen va ChucVu", /HoTen/.test(stdout) && /ChucVu/.test(stdout), stdout.trim());
} catch (error) {
  rec("Loi chay", false, String(error?.stack || error));
} finally {
  await session.close();
}
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS");
process.exit(failed ? 1 : 0);
