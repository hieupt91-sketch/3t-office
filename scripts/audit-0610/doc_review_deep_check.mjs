// Theo doi thay doi + binh luan bang thao tac that: go chu moi (ins), xoa chu (del), binh luan -> luu DOCX -> doc XML -> mo lai -> luu lai.
// Chay: node --experimental-websocket scripts/audit-0610/doc_review_deep_check.mjs
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press, typeText } from "../../tests/live/cdp/actions.mjs";

const run = promisify(execFile);
const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vno-rev-"));
const first = path.join(dir, "rev1.docx");
const second = path.join(dir, "rev2.docx");
let failed = 0;
const rec = (name, ok, value) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 220)); };

const py = "import sys,zipfile,re,json\nz=zipfile.ZipFile(sys.argv[1])\nx=z.read('word/document.xml').decode()\nc=z.read('word/comments.xml').decode() if 'word/comments.xml' in z.namelist() else ''\nins=re.findall(r'<w:ins\\b[^>]*>(.*?)</w:ins>',x,re.S)\ndel_=re.findall(r'<w:del\\b[^>]*>(.*?)</w:del>',x,re.S)\ntext=lambda s:''.join(re.findall(r'<w:(?:t|delText)[^>]*>([^<]*)<',s))\nprint(json.dumps({'ins':[text(i) for i in ins],'del':[text(d) for d in del_],'comments':re.findall(r'<w:t[^>]*>([^<]*)</w:t>',c),'commentRef':'commentReference' in x,'track':'trackRevisions' in z.read('word/settings.xml').decode()}))";
const read = async (file) => JSON.parse((await run(process.env.VNO_PYTHON || "python", ["-c", py, file], { encoding: "utf8" })).stdout);

const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
try {
  const ev = (expression, options) => session.cdp.evaluate(expression, options);
  const A = "window.__vnoAppInstance.adapter";
  await session.cdp.waitFor("!!(globalThis.globalUnoBridge && globalThis.globalUnoBridge.desktopApi && globalThis.globalUnoBridge.hasRealEngine)", { timeoutMilliseconds: 120000, intervalMilliseconds: 500 });
  await ev(`(() => { const b=document.querySelector('.vno-writer-body'); b.innerHTML='<p>Cau mot can xoa chu BOQUA o giua.</p><p>Cau hai co binh luan o day.</p><p>Cau ba cuoi.</p>'; b.focus(); })()`);
  const selectWord = (word) => ev(`(() => { const w=document.createTreeWalker(document.querySelector('.vno-writer-body'),NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){ const i=n.data.indexOf(${JSON.stringify(word)}); if(i>=0){ const r=document.createRange(); r.setStart(n,i); r.setEnd(n,i+${word.length}); const s=getSelection(); s.removeAllRanges(); s.addRange(r); return true; } } return false; })()`);
  const caretAfter = (word) => ev(`(() => { const w=document.createTreeWalker(document.querySelector('.vno-writer-body'),NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){ const i=n.data.indexOf(${JSON.stringify(word)}); if(i>=0){ const r=document.createRange(); r.setStart(n,i+${word.length}); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r); return true; } } return false; })()`);

  // Binh luan (truoc khi bat theo doi)
  await selectWord("binh luan");
  rec("Them binh luan", await ev(`${A}.insertComment({ content: 'NOIDUNGBL', author: 'Kiem thu' }).then(r => !!r)`), true);

  // Bat theo doi thay doi, go chu moi, xoa chu
  await ev(`${A}.toggleTrackChanges(true); true`);
  await caretAfter("Cau ba");
  await typeText(session.cdp, " THEMMOI", 40);
  await selectWord("BOQUA");
  await press(session.cdp, "Delete", {}, 400);
  const dom = await ev(`document.querySelector('.vno-writer-body').innerHTML.slice(0,700)`);
  rec("Theo doi: DOM co danh dau them/xoa", /data-vno-change/.test(dom), dom.slice(0, 160));

  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",${A}._contentForExport(),${JSON.stringify(first)},null)`, { timeoutMilliseconds: 1200000 });
  rec("Luu DOCX", saved?.status === "ok", saved?.status);
} catch (error) {
  rec("Loi chay", false, String(error?.stack || error));
} finally {
  await session.close();
}

try {
  const one = await read(first);
  rec("DOCX: co chen (w:ins) 'THEMMOI'", one.ins.some((t) => t.includes("THEMMOI")), one.ins);
  rec("DOCX: co xoa (w:del) 'BOQUA'", one.del.some((t) => t.includes("BOQUA")), one.del);
  rec("DOCX: binh luan NOIDUNGBL + dau tham chieu", one.comments.some((t) => t.includes("NOIDUNGBL")) && one.commentRef, { comments: one.comments, ref: one.commentRef });
  rec("DOCX: bat che do theo doi (settings)", one.track, one.track);
  // Mo lai that va luu lai
  const s2 = await launchApp("writer", { filePath: first });
  try {
    await s2.cdp.waitFor("(document.querySelector('.vno-writer-body')?.innerText || '').includes('Cau mot')", { timeoutMilliseconds: 300000, intervalMilliseconds: 500 });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const state = await s2.cdp.evaluate(`JSON.stringify({ ins: document.querySelectorAll('[data-vno-change="insert"], ins').length, del: document.querySelectorAll('[data-vno-change="delete"], del').length, comments: (window.__vnoAppInstance.adapter.comments || []).length })`);
    rec("Mo lai: thay doi va binh luan hien lai trong app", /"ins":[1-9]/.test(state) && /"del":[1-9]/.test(state) && /"comments":[1-9]/.test(state), state);
    const saved2 = await s2.cdp.evaluate(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(second)},${JSON.stringify(first)})`, { timeoutMilliseconds: 1200000 });
    rec("Luu lai sau khi mo", saved2?.status === "ok", saved2?.status);
  } finally {
    await s2.close();
  }
  const two = await read(second);
  rec("Sau mo lai + luu lai: van con chen/xoa/binh luan", two.ins.some((t) => t.includes("THEMMOI")) && two.del.some((t) => t.includes("BOQUA")) && two.comments.some((t) => t.includes("NOIDUNGBL")), two);
} catch (error) {
  rec("Loi doc/mo lai", false, String(error?.stack || error).slice(0, 300));
}
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS");
process.exit(failed ? 1 : 0);
