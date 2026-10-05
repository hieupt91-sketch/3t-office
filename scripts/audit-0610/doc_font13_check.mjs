// Cỡ chữ 13 pt (chuẩn hành chính): chọn trong ô Cỡ chữ -> DOCX có w:sz=26. Chỉ CDP.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { insertText } from "../../tests/live/cdp/actions.mjs";

const execFileAsync = promisify(execFile);
const docx = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "vno-font13-")), "f13.docx");
let session, failed = 0;
const rec = (name, ok, value) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 200)); };
try {
  session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
  const ev = (e, o) => session.cdp.evaluate(e, o);
  await ev(`document.querySelector('.vno-writer-body')?.focus()`);
  await insertText(session.cdp, "SIZE13_RUN thuong");
  await ev(`(() => { const w=document.createTreeWalker(document.querySelector('.vno-writer-body'),NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){const i=n.data.indexOf('SIZE13_RUN'); if(i>=0){const r=document.createRange(); r.setStart(n,i); r.setEnd(n,i+10); const s=getSelection(); s.removeAllRanges(); s.addRange(r); return true;}} })()`);
  // Chọn đúng như người dùng: giá trị "13" của ô Cỡ chữ
  await ev(`globalThis.__vnoGlobalCommandBus.execute('writer.font.size', '13')`);
  const dom = await ev(`(() => { const f=[...document.querySelectorAll('.vno-writer-body font, .vno-writer-body span')].find(e=>e.textContent==='SIZE13_RUN'); return f ? {tag:f.tagName, size:f.style.fontSize} : null; })()`);
  rec("Áp dụng 13 pt lên đúng đoạn chữ", dom && dom.size === "13pt", dom);
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(docx)},null)`, { timeoutMilliseconds: 1200000 });
  rec("Lưu DOCX", saved?.status === "ok", saved?.status);
  const py = String.raw`import sys,zipfile,re
x=zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode('utf-8')
i=x.find('SIZE13_RUN'); j=x.rfind('<w:r>',0,i); seg=x[j:i]
m=re.search(r'<w:sz w:val="(\d+)"',seg); print(m.group(1) if m else 'none')`;
  const { stdout } = await execFileAsync(process.env.VNO_PYTHON || "python", ["-c", py, docx]);
  rec("DOCX: w:sz = 26 (13 pt)", stdout.trim() === "26", stdout.trim());
} catch (error) {
  rec("Lỗi chạy", false, String(error?.stack || error));
} finally { await session?.close?.(); }
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS");
process.exit(failed ? 1 : 0);
