// Doi THIET LAP TRANG (huong giay, le, kho giay) tren tai lieu nhap tu DOCX bang chinh ham cua app (setPageSetup), LUU DOCX that,
// in w:pgSz / w:pgMar cua tung w:sectPr truoc/sau.
import { launchApp } from "../../tests/live/cdp/session.mjs";
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const file = process.argv.slice(2).find((a) => !a.startsWith("--")) || "E:\\VN OFice\\file test\\landocx\\d03.docx";
const outDir = "E:\\VNOffice-test\\pagesetup"; mkdirSync(outDir, { recursive: true });
const cases = [
  { name: "Huong ngang (whole)", setup: { orientation: "landscape" }, scope: "whole" },
  { name: "Le tren 40mm (whole)", setup: { margins: { top: 40 } }, scope: "whole" },
  { name: "Kho A5 (whole)", setup: { size: "a5" }, scope: "whole" },
];
const session = await launchApp("writer", { filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e, o) => session.cdp.evaluate(e, o);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const outs = [];
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 200", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(6000);
  for (let i = 0; i < cases.length; i += 1) {
    const c = cases[i];
    await ev(`(() => { document.querySelector('.vno-writer-body').focus(); return true; })()`);
    const live = await ev(`(() => { const a = window.__vnoAppInstance.adapter; const ok = a.setPageSetup(${JSON.stringify(c.setup)}, ${JSON.stringify(c.scope)}); return { ok, pageSetup: a.pageSetup }; })()`);
    await sleep(900);
    const outPath = path.join(outDir, `case${i}.docx`);
    await ev(`(() => { window.__c = window.__vnoAppInstance.adapter._contentForExport(); return window.__c.length; })()`);
    const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer", window.__c, ${JSON.stringify(outPath)}, ${JSON.stringify(file)})`, { timeoutMilliseconds: 1200000 });
    outs.push({ ...c, outPath, status: saved && saved.status, live: JSON.stringify(live).slice(0, 160) });
    await ev(`(() => { const a = window.__vnoAppInstance.adapter; return a.undo ? a.undo() : null; })()`);
    await sleep(500);
  }
} finally { await session.close(); }
const py = [
  "import zipfile, re, sys, json",
  "rows = json.loads(sys.argv[1]); src = sys.argv[2]",
  "def sect(path):",
  "    x = zipfile.ZipFile(path).read('word/document.xml').decode('utf8', 'ignore')",
  "    out = []",
  "    for s in re.findall(r'<w:sectPr[ >].*?</w:sectPr>', x, re.S):",
  "        pg = re.search(r'<w:pgSz[^>]*/>', s); mar = re.search(r'<w:pgMar[^>]*/>', s)",
  "        w = re.search(r'w:w=\"(\\d+)\"', pg.group(0)) if pg else None; h = re.search(r'w:h=\"(\\d+)\"', pg.group(0)) if pg else None",
  "        o = re.search(r'w:orient=\"(\\w+)\"', pg.group(0)) if pg else None; t = re.search(r'w:top=\"(\\d+)\"', mar.group(0)) if mar else None",
  "        out.append((w.group(1) if w else None, h.group(1) if h else None, o.group(1) if o else 'portrait', t.group(1) if t else None))",
  "    return out",
  "print('GOC     ', sect(src))",
  "for r in rows: print(r['name'], '|', sect(r['outPath']), '|', r['live'][:90])",
].join("\n");
writeFileSync(path.join(outDir, "check.py"), py, "utf8");
console.log(spawnSync("python", [path.join(outDir, "check.py"), JSON.stringify(outs), file], { encoding: "utf8" }).stdout);
