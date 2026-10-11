// Danh sách đa cấp kiểu văn bản pháp quy: Điều 1. / 1. / a) -> DOCX phải có 3 cấp (ilvl 0,1,2) và định dạng số đúng. Chỉ CDP.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { insertText } from "../../tests/live/cdp/actions.mjs";

const execFileAsync = promisify(execFile);
const docx = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "vno-legal-")), "legal.docx");
let session, failed = 0;
const rec = (name, ok, value) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 500)); };
async function caretIn(ev, text) {
  return ev(`(() => { const w=document.createTreeWalker(document.querySelector('.vno-writer-body'),NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){ if(n.data.includes(${JSON.stringify(text)})){ const r=document.createRange(); r.setStart(n,n.data.length); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r); return true; } } return false; })()`);
}
try {
  session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
  const ev = (e, o) => session.cdp.evaluate(e, o);
  await ev(`document.querySelector('.vno-writer-body')?.focus()`);
  await insertText(session.cdp, "DIEU_1\nKHOAN_1\nDIEM_A\nDIEU_2");
  await ev(`(() => { const b=document.querySelector('.vno-writer-body'); const r=document.createRange(); r.selectNodeContents(b); const s=getSelection(); s.removeAllRanges(); s.addRange(r); })()`);
  rec("Áp dụng danh sách đa cấp Điều/Khoản/Điểm", await ev(`globalThis.__vnoGlobalCommandBus.execute('writer.para.multilevelList','nd30')`) !== false, true);
  await caretIn(ev, "KHOAN_1");
  rec("Hạ KHOAN_1 xuống cấp 2", await ev(`window.__vnoAppInstance.adapter.changeListLevel(1)`) !== false, true);
  await caretIn(ev, "DIEM_A");
  await ev(`window.__vnoAppInstance.adapter.changeListLevel(1)`);
  await ev(`window.__vnoAppInstance.adapter.changeListLevel(1)`);
  const depth = await ev(`(() => [...document.querySelectorAll('.vno-writer-body li')].map(li => ({t:(li.firstChild?.textContent||li.textContent).slice(0,8), depth:(() => { let d=0,e=li.parentElement; while(e && e.classList && !e.classList.contains('vno-writer-body')){ if(/^(OL|UL)$/.test(e.tagName)) d++; e=e.parentElement; } return d; })()})))()`);
  console.log("CAY:", JSON.stringify(depth));
  rec("Cây danh sách: ĐIỀU cấp 1, KHOẢN cấp 2, ĐIỂM cấp 3", depth.length >= 3 && depth.find(x => x.t.startsWith("KHOAN")).depth === 2 && depth.find(x => x.t.startsWith("DIEM")).depth === 3, depth);
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(docx)},null)`, { timeoutMilliseconds: 1200000 });
  rec("Lưu DOCX", saved?.status === "ok", saved?.status);
  const py = String.raw`import sys,zipfile,re,json
z=zipfile.ZipFile(sys.argv[1]); x=z.read('word/document.xml').decode('utf-8')
paras=[]
for p in re.findall(r'<w:p[ >].*?</w:p>',x,re.S):
  t=''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>',p))
  m=re.search(r'<w:ilvl w:val="(\d+)"/>\s*<w:numId w:val="(\d+)"/>',p)
  if t: paras.append({'t':t[:8],'ilvl':m.group(1) if m else None,'numId':m.group(2) if m else None})
num=z.read('word/numbering.xml').decode('utf-8') if 'word/numbering.xml' in z.namelist() else ''
nid=paras[0]['numId'] if paras and paras[0]['numId'] else None
m=re.search(r'<w:num w:numId="'+str(nid)+r'"[^>]*>.*?<w:abstractNumId w:val="(\d+)"',num,re.S) if nid else None
ab=re.search(r'<w:abstractNum [^>]*w:abstractNumId="'+(m.group(1) if m else '0')+r'".*?</w:abstractNum>',num,re.S)
lv=re.findall(r'<w:lvl w:ilvl="(\d)".*?<w:numFmt w:val="([^"]+)".*?<w:lvlText w:val="([^"]*)"',ab.group(0) if ab else '',re.S)[:9]
print(json.dumps({'paras':paras,'levels':lv},ensure_ascii=False))`;
  const { stdout } = await execFileAsync(process.env.VNO_PYTHON || "python", ["-c", py, docx], { encoding: "utf8" });
  const x = JSON.parse(stdout);
  console.log("DOCX:", JSON.stringify(x));
  const byText = key => x.paras.find(p => p.t.startsWith(key));
  rec("DOCX: ĐIỀU ilvl 0, KHOẢN ilvl 1, ĐIỂM ilvl 2", byText("DIEU_1")?.ilvl === "0" && byText("KHOAN_1")?.ilvl === "1" && byText("DIEM_A")?.ilvl === "2", x.paras);
  rec("DOCX: cấp 1 có chữ Điều, cấp 3 dạng a)", x.levels.some(l => l[0] === "0" && /Điều/.test(l[2])) && x.levels.some(l => l[0] === "2" && /%3\)/.test(l[2])), x.levels);
} catch (error) {
  rec("Lỗi chạy", false, String(error?.stack || error));
} finally { await session?.close?.(); }
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS");
process.exit(failed ? 1 : 0);
