import { connectToPort } from "../../tests/live/cdp/client.mjs";
const port = Number(process.argv[2]);
const cdp = await connectToPort(port);
const ev = (e, ms = 15000) => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: ms });
try {
  const t = Date.now();
  const state = await ev(`JSON.stringify((() => {
    const q = (s) => document.querySelector(s);
    const vis = (n) => { if (!n) return false; const r = n.getBoundingClientRect(); const cs = getComputedStyle(n); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    const a = window.__vnoAppInstance?.adapter;
    const overlays = [...document.querySelectorAll('[role=dialog], .vno-dialog-box, .vno-modal, .vno-overlay, .vno-loading, [role=progressbar], .vno-sheet-quick-view, .vno-toast, .vno-notification')].filter(vis).map(n => ({ cls: String(n.className).slice(0, 60), text: (n.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 100), z: getComputedStyle(n).zIndex, w: Math.round(n.getBoundingClientRect().width), h: Math.round(n.getBoundingClientRect().height) }));
    return { title: document.title, overlays, canvas: !!q('canvas'), src: a?._sourcePath || a?.sourceFilePath || null, dirty: a?.isDirty, openState: a?._openState || a?.openState || null, gridCells: window.__vnoAppInstance?.grid?.cellsData?.size, active: document.activeElement && document.activeElement.tagName + '.' + String(document.activeElement.className).slice(0, 40), bodyCls: document.body.className };
  })())`);
  console.log("rtt_ms:", Date.now() - t);
  console.log(state);
  const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
  const fs = await import("node:fs");
  fs.writeFileSync(process.argv[3] || "E:\\VNOffice-e2e-0910\\usab\\live.png", Buffer.from((shot.result || shot).data, "base64"));
} finally {
  try { await cdp.close(); } catch {}
}
