// Cot 2 dat o MUC GIUA cua tai lieu nhieu muc (d24: 3 muc): luu DOCX that va in w:cols cua tung w:sectPr.
// Ky vong (kieu Word): chi muc co con tro co w:cols w:num="2".
import { launchApp } from "../../tests/live/cdp/session.mjs";
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const file = process.argv.slice(2).find((a) => !a.startsWith("--")) || "E:\\VN OFice\\file test\\landocx\\d24.docx";
const outDir = "E:\\VNOffice-test\\columns"; mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "cols-saved.docx");
const session = await launchApp("writer", { filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e, o) => session.cdp.evaluate(e, o);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let info;
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 200", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(6000);
  info = await ev(`(() => {
    const b = document.querySelector('.vno-writer-body');
    const breaks = [...b.querySelectorAll('.vno-section-break, [data-vno-section-type]')];
    let target = null;
    if (breaks.length) { let n = breaks[0].nextElementSibling; while (n && !(n.matches('p,h1,h2,h3') && n.textContent.trim().length > 3)) n = n.nextElementSibling; target = n; }
    if (!target) { const ps = [...b.querySelectorAll('p,h1,h2,h3')].filter(p => p.textContent.trim().length > 3 && !p.closest('table')); target = ps[Math.floor(ps.length / 2)]; }
    b.focus(); target.scrollIntoView({ block: 'center' });
    const w = document.createTreeWalker(target, NodeFilter.SHOW_TEXT); let n, tn = null; while ((n = w.nextNode())) { if (n.data.trim()) { tn = n; break; } }
    const r = document.createRange(); r.setStart(tn, 0); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    return { sectionBreaks: breaks.length, caretText: target.textContent.trim().slice(0, 40) };
  })()`);
  await ev(`(async () => { const m = await import('/platform/commands/command-bus.js'); return await m.globalCommandBus.execute('writer.page.columns2', null); })()`, { awaitPromise: true });
  await sleep(1200);
  info.live = await ev(`(() => { const b = document.querySelector('.vno-writer-body'); return { cls: b.className.slice(0, 80), bodyColumnCount: b.style.columnCount || '' }; })()`);
  await ev(`(() => { window.__c = window.__vnoAppInstance.adapter._contentForExport(); return window.__c.length; })()`);
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer", window.__c, ${JSON.stringify(outPath)}, ${JSON.stringify(file)})`, { timeoutMilliseconds: 1200000 });
  info.status = saved && saved.status;
} finally { await session.close(); }
const py = [
  "import zipfile, re, sys",
  "x = zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode('utf8', 'ignore')",
  "secs = re.findall(r'<w:sectPr[ >].*?</w:sectPr>', x, re.S)",
  "print('sectPr:', len(secs))",
  "for i, s in enumerate(secs):",
  "    cols = re.findall(r'<w:cols[^>]*/?>', s)",
  "    print(' muc', i + 1, cols[:1] or '(khong co w:cols)')",
].join("\n");
writeFileSync(path.join(outDir, "check.py"), py, "utf8");
console.log(JSON.stringify(info));
console.log(spawnSync("python", [path.join(outDir, "check.py"), outPath], { encoding: "utf8" }).stdout);
