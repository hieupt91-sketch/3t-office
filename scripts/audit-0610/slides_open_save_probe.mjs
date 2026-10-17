// Hoi quy mo-roi-luu PPTX: mo tung tep bang app Slides (CDP), luu lai bang pipeline that, ghi duong dan tep da luu.
// Dung: node --experimental-websocket scripts/audit-0610/slides_open_save_probe.mjs <thu-muc-goc-ma-nguon> <thu-muc-ra> <tep1.pptx> [tep2.pptx ...]
import path from "node:path";
import { pathToFileURL } from "node:url";
const [root, outDir, ...files] = process.argv.slice(2);
const { launchApp } = await import(pathToFileURL(path.join(root, "tests/live/cdp/session.mjs")).href);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0;
for (const file of files) {
  const session = await launchApp("slides", { filePath: file, localAppData: process.env.VNO_CDP_LOCALAPPDATA || path.join(outDir, "profile") });
  const cdp = session.cdp; const ev = e => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 180000 });
  try {
    let loaded = false;
    for (let i = 0; i < 600 && !loaded; i++) { loaded = await ev(`Boolean(window.__vnoAppInstance && window.__vnoAppInstance.canvas && window.__vnoAppInstance.canvas.slides && window.__vnoAppInstance.canvas.slides.length && window.__vnoAppInstance.canvas.imported)`); if (!loaded) await sleep(500); }
    const target = path.join(outDir, "saved-" + path.basename(file));
    // Tuần tự hóa và lưu NGAY TRONG trang: bộ tệp lớn (hàng chục MB FODP) không đi qua kênh CDP.
    const res = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; const content = a.serializeToFodp(); return await window.pywebview.api.save_document_in_place(content, 'slides', ${JSON.stringify(target)}, ${JSON.stringify(file)}); })()`);
    console.log(`${loaded ? "OPEN" : "NOT-LOADED"} | ${path.basename(file)} | save=${res && res.status}`);
    if (res && res.status === "ok") ok++;
  } catch (error) { console.log(`ERROR | ${path.basename(file)} | ${error.message}`); }
  finally { try { await session.close(); } catch {} }
}
console.log(`SAVED ${ok}/${files.length}`);