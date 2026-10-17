// Mở từng tệp .docx trong app Writer thật (CDP), gõ thêm " ZZ" vào 5 đoạn đầu có chữ, lưu bằng luồng lưu thật.
// Dùng: node --experimental-websocket word_lan_edit_style_probe.mjs <thư-mục-ra> <tệp1.docx> <tệp2.docx> ...
import { launchApp } from "../../tests/live/cdp/session.mjs";
import fs from "node:fs";
import path from "node:path";

const [outDir, ...files] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
for (const [index, file] of files.entries()) {
  const src = path.join(outDir, `src${index}.docx`);
  const out = path.join(outDir, `edited${index}.docx`);
  fs.copyFileSync(file, src);
  const session = await launchApp("writer", { filePath: src, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 240000 });
  try {
    await session.cdp.waitFor("(document.querySelector('.vno-writer-body')?.textContent || '').trim().length > 20", { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
    await new Promise((r) => setTimeout(r, 3000));
    const n = await ev(`(() => { const b=document.querySelector('.vno-writer-body'); b.focus(); const ps=[...b.querySelectorAll('p, li')].filter(p => (p.textContent||'').trim().length > 15).slice(0, 5); for (const p of ps) { const r=document.createRange(); r.selectNodeContents(p); r.collapse(false); const s=getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('insertText', false, ' ZZ'); } return ps.length; })()`);
    await new Promise((r) => setTimeout(r, 800));
    const saved = await ev(`(async () => { const a=window.__vnoAppInstance.adapter; a.isDirty=true; return JSON.stringify(await globalThis.globalUnoBridge.saveRealFileInPlace('writer', a._contentForExport(), ${JSON.stringify(out)}, ${JSON.stringify(src)})).slice(0,60); })()`);
    console.log(index, path.basename(file), "edited", n, saved);
  } catch (error) {
    console.log(index, path.basename(file), "ERROR", error.message);
  } finally {
    await session.close();
  }
}
