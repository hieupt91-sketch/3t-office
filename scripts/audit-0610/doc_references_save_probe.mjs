// Tab Tham chieu tren tai lieu NHAP TU DOCX: chay lenh that (muc luc, chu thich trang, chu thich cuoi), LUU DOCX that, doc XML.
// Ky vong: muc luc ra field TOC/SDT muc luc voi so muc = so tieu de; chu thich them 1 w:footnote / w:endnote that.
import { launchApp } from "../../tests/live/cdp/session.mjs";
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const file = process.argv.slice(2).find((a) => !a.startsWith("--")) || "E:\\VN OFice\\file test\\landocx\\d13.docx";
const outDir = "E:\\VNOffice-test\\references"; mkdirSync(outDir, { recursive: true });
const cases = [
  { name: "Muc luc tu dong", cmd: "writer.reference.tocInsert" },
  { name: "Chu thich trang", cmd: "writer.reference.footnoteInsert" },
  { name: "Chu thich cuoi", cmd: "writer.reference.endnoteInsert" },
];
const session = await launchApp("writer", { filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e, o) => session.cdp.evaluate(e, o);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const outs = [];
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 300", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(6000);
  const headings = await ev(`document.querySelectorAll('.vno-writer-body h1,.vno-writer-body h2,.vno-writer-body h3').length`);
  for (let i = 0; i < cases.length; i += 1) {
    const c = cases[i];
    await ev(`(() => {
      const b = document.querySelector('.vno-writer-body'); b.focus();
      const ps = [...b.querySelectorAll(':scope > p')].filter(p => p.textContent.trim().length > 60);
      const p = ps[Math.floor(ps.length / 2)]; p.scrollIntoView({ block: 'center' });
      const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let n, tn = null; while ((n = w.nextNode())) { if (n.data.trim().length > 20) { tn = n; break; } }
      const r = document.createRange(); r.setStart(tn, Math.min(12, tn.data.length)); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return true; })()`);
    const exec = await ev(`(async () => { try { const m = await import('/platform/commands/command-bus.js'); const r = await m.globalCommandBus.execute(${JSON.stringify(c.cmd)}, null); return { ok: true, r: String(r).slice(0, 30) }; } catch (e) { return { ok: false, e: String(e).slice(0, 100) }; } })()`, { awaitPromise: true });
    await sleep(1500);
    const live = await ev(`({ tocEntries: document.querySelectorAll('.vno-toc-item').length, footnotes: document.querySelectorAll('.vno-footnote-item').length, endnotes: document.querySelectorAll('.vno-endnote-item').length })`);
    const outPath = path.join(outDir, `case${i}.docx`);
    await ev(`(() => { window.__c = window.__vnoAppInstance.adapter._contentForExport(); return window.__c.length; })()`);
    const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer", window.__c, ${JSON.stringify(outPath)}, ${JSON.stringify(file)})`, { timeoutMilliseconds: 1200000 });
    outs.push({ ...c, outPath, status: saved && saved.status, exec, live });
    await ev(`(() => { const a = window.__vnoAppInstance.adapter; return a.undo ? a.undo() : null; })()`);
    await sleep(600);
  }
  console.log("tieu de that:", headings);
} finally { await session.close(); }
const py = [
  "import zipfile, re, sys, json",
  "rows = json.loads(sys.argv[1]); src = sys.argv[2]",
  "def stats(path):",
  "    z = zipfile.ZipFile(path); x = z.read('word/document.xml').decode('utf8', 'ignore')",
  "    fn = z.read('word/footnotes.xml').decode('utf8', 'ignore') if 'word/footnotes.xml' in z.namelist() else ''",
  "    en = z.read('word/endnotes.xml').decode('utf8', 'ignore') if 'word/endnotes.xml' in z.namelist() else ''",
  "    toc_f = len(re.findall(r'instrText[^>]*>\\s*TOC\\b', x)); toc_sdt = len(re.findall(r'docPartGallery w:val=\"Table of Contents\"', x))",
  "    hyper_anchor = len(re.findall(r'w:anchor=\"_Toc', x))",
  "    return {'toc_field': toc_f, 'toc_sdt': toc_sdt, 'toc_links': hyper_anchor, 'footnotes': len(re.findall(r'<w:footnote ', fn)), 'endnotes': len(re.findall(r'<w:endnote ', en)), 'fnRefs': len(re.findall(r'<w:footnoteReference', x)), 'enRefs': len(re.findall(r'<w:endnoteReference', x))}",
  "print('GOC     ', stats(src))",
  "for r in rows: print(r['name'], '|', stats(r['outPath']), '| live', r['live'], '| exec', r['exec'])",
].join("\n");
writeFileSync(path.join(outDir, "check.py"), py, "utf8");
console.log(spawnSync("python", [path.join(outDir, "check.py"), JSON.stringify(outs), file], { encoding: "utf8" }).stdout);
