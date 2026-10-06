// D15a (phan anh): chen anh bang cung HTML voi _insertImageDialog (khong qua hop chon tep goc), doi kich thuoc, luu DOCX, mo lai.
import fs from "node:fs/promises"; import os from "node:os"; import path from "node:path";
import { execFile } from "node:child_process"; import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";
const run = promisify(execFile);
const docx = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "vno-img-")), "img.docx");
let failed = 0; const rec = (n, ok, v) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", n, "|", JSON.stringify(v).slice(0, 200)); };
// PNG 40x30 do (hop le) tao bang python khong can thu vien: dung PNG 1x1 co ban roi co gian bang CSS
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
try {
  const ev = (e, o) => session.cdp.evaluate(e, o);
  await ev(`(()=>{const b=document.querySelector('.vno-writer-body'); b.innerHTML='<p>TRUOC</p><p>SAU</p>'; b.focus(); const t=b.firstChild.firstChild; const r=document.createRange(); r.setStart(t,t.length); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r);})()`);
  await ev(`(()=>{ const a=window.__vnoAppInstance.adapter; a.flushTyping(); document.execCommand('insertHTML', false, '<img src="data:image/png;base64,${PNG}" data-vno-wrap="inline" tabindex="0" style="max-width:100%; height:auto; margin:10pt 0; display:inline;" /><p><br></p>'); a.isDirty=true; a.recordSnapshot('writer.image.insert'); })()`);
  const n1 = await ev(`document.querySelectorAll('.vno-writer-body img').length`);
  rec("Chen anh (cung HTML voi nut Hinh anh)", n1 === 1, n1);
  await ev(`(()=>{const i=document.querySelector('.vno-writer-body img'); i.style.width='200px'; i.style.height='100px'; i.style.maxWidth='none'; window.__vnoAppInstance.adapter.recordSnapshot('image.resize');})()`);
  await ev(`window.__vnoGlobalCommandBus.execute('common.edit.undo'); true`); await new Promise(r => setTimeout(r, 400));
  const w = await ev(`document.querySelector('.vno-writer-body img')?.style.width || ''`);
  rec("Hoan tac thay doi kich thuoc", w === "" || w === "auto", w);
  await ev(`window.__vnoGlobalCommandBus.execute('common.edit.redo'); true`); await new Promise(r => setTimeout(r, 400));
  const w2 = await ev(`document.querySelector('.vno-writer-body img')?.style.width || ''`);
  rec("Lam lai kich thuoc 200px", w2 === "200px", w2);
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(docx)},null)`, { timeoutMilliseconds: 1200000 });
  rec("Luu DOCX", saved?.status === "ok", saved?.status);
  const py = String.raw`import sys,zipfile,re
z=zipfile.ZipFile(sys.argv[1]); x=z.read('word/document.xml').decode('utf-8')
ext=re.findall(r'<wp:extent cx="(\d+)" cy="(\d+)"',x); print(len(re.findall(r'<w:drawing>',x)), len(re.findall(r'<wp:inline',x)), len(re.findall(r'<wp:anchor',x)), ext, [n for n in z.namelist() if n.startswith('word/media/')])`;
  const { stdout } = await run(process.env.VNO_PYTHON || "python", ["-c", py, docx], { encoding: "utf8" });
  const m = /^(\d+) (\d+) (\d+) (\[.*\]) (\[.*\])/.exec(stdout.trim());
  rec("DOCX co w:drawing + tep media", !!m && Number(m[1]) >= 1 && /media/.test(m[5]), stdout.trim());
  const ext = m ? JSON.parse(m[4].replace(/\(/g, "[").replace(/\)/g, "]").replace(/'/g, '"')) : [];
  const cx = Number(ext[0]?.[0]), cy = Number(ext[0]?.[1]);
  rec("Kich thuoc EMU ~ 200x100 px (1905000 x 952500, +-2%)", Math.abs(cx - 1905000) / 1905000 < 0.02 && Math.abs(cy - 952500) / 952500 < 0.02, { cx, cy });
} catch (e) { rec("Loi chay", false, String(e?.stack || e)); } finally { await session.close(); }
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS"); process.exit(failed ? 1 : 0);