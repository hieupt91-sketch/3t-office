// Mo tung tai lieu trong corpus bang app that, cho tai xong han, luu ra thu muc dich (giu ten) de do so trang bang Word that.
// Chay: node --experimental-websocket scripts/audit-0610/doc_corpus_save_all.mjs <thu-muc-dich> [bat-dau]
import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "../../tests/live/cdp/session.mjs";

const outDir = path.resolve(process.argv[2] || "E:\\VNOffice-profiles\\corpus-saved");
const start = Number(process.argv[3] || 0);
const sources = [];
for (const dir of ["E:\\VN OFice\\file test\\landocx", "E:\\VN OFice\\file test\\lan-legacy"]) {
  for (const name of (await fs.readdir(dir)).sort()) if (/\.(docx?)$/i.test(name)) sources.push(path.join(dir, name));
}
await fs.mkdir(outDir, { recursive: true });
let failures = 0;
for (const [index, input] of sources.entries()) {
  if (index < start) continue;
  const name = path.basename(input);
  const output = path.join(outDir, name.replace(/\.doc$/i, ".docx"));
  if (/^d10\./i.test(name)) { console.log(`SKIP | ${name} | tep PDF doi duoi docx`); continue; }
  const started = Date.now();
  let session;
  try {
    session = await launchApp("writer", { filePath: input });
    await session.cdp.waitFor("(() => { const a = window.__vnoAppInstance?.adapter; return !!a?._sourcePath && (document.querySelector('.vno-writer-body')?.innerText || '').length > 0; })()", { timeoutMilliseconds: 600000, intervalMilliseconds: 1000 });
    await new Promise((resolve) => setTimeout(resolve, 4000)); // cho moc nguyen ban duoc ghi (nguoi dung that luon luu sau do)
    const saved = await session.cdp.evaluate(`globalThis.globalUnoBridge.saveRealFileInPlace('writer', window.__vnoAppInstance.adapter._contentForExport(), ${JSON.stringify(output)}, ${JSON.stringify(input)})`, { timeoutMilliseconds: 1500000 });
    const ok = saved?.status === "ok";
    if (!ok) failures += 1;
    console.log(`${ok ? "OK  " : "FAIL"} | ${name} | ${Math.round((Date.now() - started) / 1000)}s | ${ok ? "" : JSON.stringify(saved).slice(0, 160)}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL | ${name} | ${String(error).slice(0, 160)}`);
  } finally {
    try { await session?.close(); } catch { /* da dong */ }
  }
}
console.log(failures ? `TONG: ${failures} loi` : "TONG: da luu het");
