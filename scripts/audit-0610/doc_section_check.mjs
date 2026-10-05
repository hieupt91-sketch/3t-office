// Đổi hướng trang theo MỤC (phần trước dọc, phụ lục ngang) -> lưu DOCX -> đọc sectPr. Chỉ CDP.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { insertText } from "../../tests/live/cdp/actions.mjs";

const execFileAsync = promisify(execFile);
const docx = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "vno-section-")), "sec.docx");
let session, failed = 0;
const rec = (name, ok, value) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 400)); };
try {
  session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
  const ev = (e, o) => session.cdp.evaluate(e, o);
  await ev(`document.querySelector('.vno-writer-body')?.focus()`);
  await insertText(session.cdp, "PORTRAIT_P");
  await ev(`globalThis.__vnoGlobalCommandBus.execute('writer.section.nextPage')`);
  await new Promise(r => setTimeout(r, 300));
  await ev(`document.querySelector('.vno-writer-body')?.focus()`);
  await insertText(session.cdp, "LANDSCAPE_P");
  const before = await ev(`(() => { const a=window.__vnoAppInstance.adapter; return {active:a.getActiveSectionId?.(), ids:Object.keys(a.sectionPageSetups||{}), sel: (getSelection().anchorNode?.parentElement?.textContent||'').slice(0,20)}; })()`);
  console.log("TRUOC:", JSON.stringify(before));
  await ev(`window.__vnoAppInstance.adapter.setPageSetup({ orientation: 'landscape' })`);
  await new Promise(r => setTimeout(r, 300));
  const after = await ev(`(() => { const a=window.__vnoAppInstance.adapter; return Object.fromEntries(Object.entries(a.sectionPageSetups||{}).map(([k,v])=>[k,{o:v.orientation,w:v.widthMm,h:v.heightMm}])); })()`);
  console.log("SAU:", JSON.stringify(after));
  const html = await ev(`window.__vnoAppInstance.adapter._contentForExport()`);
  const markers = [...html.matchAll(/data-vno-section-[a-z-]+="[^"]*"/g)].map(m => m[0]).slice(0, 12);
  console.log("MARKERS:", JSON.stringify(markers));
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(docx)},null)`, { timeoutMilliseconds: 1200000 });
  rec("Lưu DOCX", saved?.status === "ok", saved?.status);
  const py = String.raw`import sys,zipfile,re,json
x=zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode('utf-8')
secs=re.findall(r'<w:sectPr\b.*?</w:sectPr>',x,re.S)
out=[]
for s in secs:
  m=re.search(r'<w:pgSz\b([^>]*)/>',s); out.append(m.group(1).strip() if m else None)
print(json.dumps(out))`;
  const { stdout } = await execFileAsync(process.env.VNO_PYTHON || "python", ["-c", py, docx]);
  const sections = JSON.parse(stdout);
  console.log("SECTPR:", stdout.trim());
  rec("DOCX có 2 mục", sections.length >= 2, sections.length);
  const dims = sections.map(s => { const w = Number((s || "").match(/w:w="(\d+)"/)?.[1]); const h = Number((s || "").match(/w:h="(\d+)"/)?.[1]); return { w, h }; });
  rec("Mục đầu dọc (h > w)", dims[0] && dims[0].h > dims[0].w, dims[0]);
  rec("Mục cuối ngang (w > h)", dims.at(-1) && dims.at(-1).w > dims.at(-1).h, dims.at(-1));
} catch (error) {
  rec("Lỗi chạy", false, String(error?.stack || error));
} finally { await session?.close?.(); }
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS");
process.exit(failed ? 1 : 0);
