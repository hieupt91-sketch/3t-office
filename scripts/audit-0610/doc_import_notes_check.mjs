// Tai lieu nhap tu DOCX co chu thich: mo -> (khong sua | sua mot chu) -> luu -> chu thich van con va khong lo ma tam.
// DOCX nguon tu tao bang app. Chay: node --experimental-websocket scripts/audit-0610/doc_import_notes_check.mjs
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { typeText } from "../../tests/live/cdp/actions.mjs";

const run = promisify(execFile);
const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vno-impn-"));
const source = path.join(dir, "source.docx");
let failed = 0;
const rec = (name, ok, value) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 200)); };

// Mo that, cho tai xong han (roundtripFile xuat qua som: _sourcePath co truoc khi moc nguyen ban duoc ghi), tuy chon go them chu, roi luu.
async function reopenAndSave(input, output, edit) {
  const s = await launchApp("writer", { filePath: input });
  try {
    await s.cdp.waitFor("(document.querySelector('.vno-writer-body')?.innerText || '').includes('DOANMOT')", { timeoutMilliseconds: 300000, intervalMilliseconds: 500 });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    if (edit) {
      await s.cdp.evaluate("(() => { const b=document.querySelector('.vno-writer-body'); b.focus(); const w=document.createTreeWalker(b,NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){ if(n.data.includes('DOANHAI')){ const r=document.createRange(); r.setStart(n,3); r.collapse(true); const g=getSelection(); g.removeAllRanges(); g.addRange(r); return true; } } return false; })()");
      await typeText(s.cdp, "ZZ");
    }
    const saved = await s.cdp.evaluate("globalThis.globalUnoBridge.saveRealFileInPlace('writer',window.__vnoAppInstance.adapter._contentForExport()," + JSON.stringify(output) + "," + JSON.stringify(input) + ")", { timeoutMilliseconds: 1200000 });
    if (saved?.status !== "ok") throw new Error("save " + JSON.stringify(saved));
  } finally {
    await s.close();
  }
}

const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
try {
  const ev = (expression, options) => session.cdp.evaluate(expression, options);
  const A = "window.__vnoAppInstance.adapter";
  await session.cdp.waitFor("!!(globalThis.globalUnoBridge && globalThis.globalUnoBridge.desktopApi && globalThis.globalUnoBridge.hasRealEngine)", { timeoutMilliseconds: 120000, intervalMilliseconds: 500 });
  await ev(`(() => { const b=document.querySelector('.vno-writer-body'); b.innerHTML='<p>DOANMOT noi dung</p><p>DOANHAI noi dung</p>'; b.focus(); const t=b.firstChild.firstChild; const r=document.createRange(); r.setStart(t,t.length); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r); })()`);
  rec("Chen chu thich cuoi trang", await ev(`!!${A}.insertFootnote({ text: 'GHICHUMOT' })`), true);
  let saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",${A}._contentForExport(),${JSON.stringify(source)},null)`, { timeoutMilliseconds: 1200000 });
  if (saved?.status !== "ok") {
    console.log("INFO | lan luu dau bao loi, thu lai:", JSON.stringify(saved).slice(0, 200));
    saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",${A}._contentForExport(),${JSON.stringify(source)},null)`, { timeoutMilliseconds: 1200000 });
  }
  rec("Tao DOCX nguon co chu thich", saved?.status === "ok", saved?.status);
} catch (error) {
  rec("Loi tao nguon", false, String(error?.stack || error));
} finally {
  await session.close();
}

const py = "import sys,zipfile\nz=zipfile.ZipFile(sys.argv[1])\nx=z.read('word/document.xml').decode()\nf=z.read('word/footnotes.xml').decode() if 'word/footnotes.xml' in z.namelist() else ''\nprint('ref' if 'footnoteReference' in x else 'noref', 'text' if 'GHICHUMOT' in f else 'notext', 'TOKEN' if 'VNOFN' in x else 'clean')";
const check = async (file) => (await run(process.env.VNO_PYTHON || "python", ["-c", py, file], { encoding: "utf8" })).stdout.trim();
try {
  const origin = await check(source);
  rec("Nguon: chu thich that", origin === "ref text clean", origin);
  const same = path.join(dir, "same.docx");
  await reopenAndSave(source, same, false);
  const sameResult = await check(same);
  rec("Mo roi luu khong sua: chu thich con, khong lo ma tam", sameResult === "ref text clean", sameResult);
  const edited = path.join(dir, "edited.docx");
  await reopenAndSave(source, edited, true);
  const editedResult = await check(edited);
  rec("Mo, sua mot chu roi luu: chu thich con, khong lo ma tam", editedResult === "ref text clean", editedResult);
} catch (error) {
  rec("Loi kiem tra", false, String(error?.stack || error));
}
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS");
process.exit(failed ? 1 : 0);
