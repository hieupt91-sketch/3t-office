// Kiem tra ban DA CAI: luu bang duong luu that cua app ra dinh dang cu (.doc/.xls/.ppt) tu tep mau.
// Chay: node --experimental-websocket scripts/audit-0610/installed_saveas_legacy.mjs <thu-muc-cai> <LOCALAPPDATA co lap> <thu-muc-ra>
import { launchApp } from "../../tests/live/cdp/session.mjs";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const inst = process.argv[2];
const lad = process.argv[3];
const outDir = process.argv[4];
fs.mkdirSync(outDir, { recursive: true });
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cases = [
  { app: "writer", src: path.join(repo, "tests/fixtures/real-office-samples/sample-writer.docx"), out: "saveas-test.doc", ready: "!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 20", content: "window.__vnoAppInstance.adapter._contentForExport()" },
  { app: "sheet", src: path.join(repo, "tests/fixtures/real-office-samples/sample-sheet.xlsx"), out: "saveas-test.xls", ready: "(window.__vnoAppInstance?.adapter?.grid || window.__vnoAppInstance?.grid) && !document.querySelector('.vno-sheet-quick-view')", content: "window.__vnoAppInstance.adapter.serializeToFods()" },
  { app: "slides", src: path.join(repo, "tests/fixtures/real-office-samples/sample-slides.pptx"), out: "saveas-test.ppt", ready: "window.__vnoAppInstance?.adapter?.canvas?.slides?.length > 0", content: "window.__vnoAppInstance.adapter.serializeToFodp()" },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const c of cases) {
  const out = path.join(outDir, c.out);
  const session = await launchApp(c.app, { root: path.join(inst, "app"), python: path.join(inst, "python", "python.exe"), localAppData: lad, filePath: c.src, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  try {
    const norm = c.src.replace(/\\/g, "/").toLowerCase();
    await session.cdp.waitFor(`(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase(); return p === ${JSON.stringify(norm)} && (${c.ready}); })()`, { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
    await sleep(2000);
    await session.cdp.evaluate("window.__vnoAppInstance.adapter.isDirty = true");
    const r = await session.cdp.evaluate(`(() => { const content = ${c.content}; return globalThis.globalUnoBridge.saveRealFileInPlace(${JSON.stringify(c.app)}, content, ${JSON.stringify(out)}, ${JSON.stringify(c.src)}); })()`, { awaitPromise: true, timeoutMilliseconds: 300000 });
    const size = fs.existsSync(out) ? fs.statSync(out).size : -1;
    console.log(c.app.padEnd(7), "->", c.out, "| status:", r && r.status, "| bytes:", size, "|", String((r && r.message) || "").slice(0, 100));
  } catch (e) {
    console.log(c.app.padEnd(7), "LOI:", String(e.message).slice(0, 160));
  } finally {
    await session.close();
  }
}
