// Bảng dài 50 hàng + "Hàng tiêu đề" -> DOCX phải có w:tblHeader (lặp hàng đầu mỗi trang). Chỉ CDP.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { insertText } from "../../tests/live/cdp/actions.mjs";

const execFileAsync = promisify(execFile);
const docx = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "vno-tblhdr-")), "tbl.docx");
let session, failed = 0;
const rec = (name, ok, value) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 300)); };
try {
  session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
  const ev = (e, o) => session.cdp.evaluate(e, o);
  await ev(`document.querySelector('.vno-writer-body')?.focus()`);
  await insertText(session.cdp, "TRUOC_BANG");
  await ev(`window.__vnoAppInstance.adapter.insertTable(50, 3)`);
  await ev(`(() => { const c=document.querySelector('.vno-writer-body table td'); const r=document.createRange(); r.selectNodeContents(c); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r); })()`);
  const toggled = await ev(`globalThis.__vnoGlobalCommandBus.execute('writer.table.toggleHeaderRow')`);
  const dom = await ev(`(() => { const t=document.querySelector('.vno-writer-body table'); return {rows:t.rows.length, header:t.rows[0].classList.contains('vno-table-header-row')}; })()`);
  rec("Bảng 50 hàng, hàng đầu là hàng tiêu đề", toggled !== false && dom.rows === 50 && dom.header, dom);
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(docx)},null)`, { timeoutMilliseconds: 1200000 });
  rec("Lưu DOCX", saved?.status === "ok", saved?.status);
  const py = String.raw`import sys,zipfile,re,json
x=zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode('utf-8')
rows=re.findall(r'<w:tr\b.*?</w:tr>',x,re.S)
print(json.dumps({'rows':len(rows),'headerRows':sum(1 for r in rows if '<w:tblHeader' in r),'firstIsHeader':bool(rows) and '<w:tblHeader' in rows[0]}))`;
  const { stdout } = await execFileAsync(process.env.VNO_PYTHON || "python", ["-c", py, docx]);
  const x = JSON.parse(stdout);
  rec("DOCX: 50 hàng, đúng 1 hàng tiêu đề lặp (w:tblHeader) và là hàng đầu", x.rows === 50 && x.headerRows === 1 && x.firstIsHeader, x);
} catch (error) {
  rec("Lỗi chạy", false, String(error?.stack || error));
} finally { await session?.close?.(); }
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS");
process.exit(failed ? 1 : 0);
