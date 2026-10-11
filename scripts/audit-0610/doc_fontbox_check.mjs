// D15: ô Phông chữ/Cỡ chữ đồng bộ theo con trỏ; chọn cỡ pt bất kỳ lưu DOCX đúng w:sz (pt x 2).
import fs from "node:fs/promises"; import os from "node:os"; import path from "node:path";
import { execFile } from "node:child_process"; import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";
const run = promisify(execFile);
const docx = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "vno-fb-")), "fb.docx");
let failed = 0; const rec = (n, ok, v) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", n, "|", JSON.stringify(v).slice(0, 200)); };
const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
try {
  const ev = (e, o) => session.cdp.evaluate(e, o);
  await ev(`(() => { const b=document.querySelector('.vno-writer-body'); b.innerHTML='<p>SZONE</p><p>SZTWO</p><p>PLAIN</p>'; b.focus(); })()`);
  const sel = (m) => ev(`(() => { const w=document.createTreeWalker(document.querySelector('.vno-writer-body'),NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){ if(n.data.trim()===${JSON.stringify(m)}){ const r=document.createRange(); r.selectNodeContents(n); const s=getSelection(); s.removeAllRanges(); s.addRange(r); return true; } } return false; })()`);
  const cmd = async (m, id, a) => { await sel(m); await ev(`window.__vnoGlobalCommandBus.execute(${JSON.stringify(id)}, ${JSON.stringify(a)}); true`); await new Promise(r => setTimeout(r, 200)); };
  await cmd("SZONE", "writer.font.size", "11");
  await cmd("SZTWO", "writer.font.size", "72");
  await cmd("SZTWO", "writer.font.family", "Georgia");
  const opts = await ev(`[...document.querySelector('select[data-command-id="writer.font.size"]').options].map(o=>o.value)`);
  rec("Danh sach co chu day du (8..72, >=15 muc)", opts.length >= 15 && opts.includes("11") && opts.includes("72"), opts);
  const boxes = async (m) => { await sel(m); await new Promise(r => setTimeout(r, 400)); return ev(`({size: document.querySelector('select[data-command-id="writer.font.size"]').value, family: document.querySelector('select[data-command-id="writer.font.family"]').value})`); };
  const b1 = await boxes("SZONE"); rec("Dat con tro vao chu 11 pt -> o Co chu hien 11", b1.size === "11", b1);
  const b2 = await boxes("SZTWO"); rec("Dat con tro vao chu 72 pt Georgia -> o Co chu 72, o Phong Georgia", b2.size === "72" && b2.family === "Georgia", b2);
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(docx)},null)`, { timeoutMilliseconds: 1200000 });
  rec("Luu DOCX", saved?.status === "ok", saved?.status);
  const py = String.raw`import sys,zipfile,re
x=zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode('utf-8')
for m in ('SZONE','SZTWO'):
    i=x.find(m); j=max(x.rfind('<w:r>',0,i),x.rfind('<w:r ',0,i)); s=re.search(r'<w:sz w:val="(\d+)"',x[j:i]); print(m, s.group(1) if s else 'none')`;
  const { stdout } = await run(process.env.VNO_PYTHON || "python", ["-c", py, docx], { encoding: "utf8" });
  rec("DOCX: 11 pt -> w:sz 22 va 72 pt -> w:sz 144", /SZONE 22/.test(stdout) && /SZTWO 144/.test(stdout), stdout.trim());
} catch (e) { rec("Loi chay", false, String(e?.stack || e)); } finally { await session.close(); }
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS"); process.exit(failed ? 1 : 0);