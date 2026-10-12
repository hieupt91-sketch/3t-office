// Kiem tra IN tren ban da cai: Ctrl+P (phim that) -> hop thoai In/xem truoc; chup anh; do thoi gian.
// Chay: node --experimental-websocket scripts/audit-0610/installed_sheet_print.mjs <thu-muc-cai> <LOCALAPPDATA co lap> <tep.xlsx> <anh.png>
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press } from "../../tests/live/cdp/actions.mjs";
import fs from "node:fs";
import path from "node:path";
const [inst, lad, file, png] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
const session = await launchApp("sheet", { root: path.join(inst, "app"), python: path.join(inst, "python", "python.exe"), localAppData: lad, filePath: file, startTimeoutMilliseconds: 600000, readyTimeoutMilliseconds: 600000 });
const ev = (e, ms = 120000) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: ms });
const out = { file: path.basename(file) };
try {
  const norm = file.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase(); return p === ${JSON.stringify(norm)} && !!window.__vnoAppInstance?.grid?.cellsData; })()`, { timeoutMilliseconds: 600000, intervalMilliseconds: 250 });
  log("mo xong"); await sleep(2500);
  await ev(`(() => { const e = document.querySelector('.vno-sheet-container'); if (e) e.focus(); return true; })()`);
  const tP = Date.now();
  await press(session.cdp, "p", { ctrl: true }, 300);
  let shown = false;
  try { await session.cdp.waitFor(`[...document.querySelectorAll('[role=dialog], .vno-dialog-box, .vno-print-preview, .vno-print-dialog, .vno-modal')].some(n => { const b = n.getBoundingClientRect(); return b.width > 50 && b.height > 50; })`, { timeoutMilliseconds: 240000, intervalMilliseconds: 300 }); shown = true; } catch {}
  out.dialogShown = shown; out.tDialogMs = Date.now() - tP;
  const tPrev = Date.now(); try { await session.cdp.waitFor("!/Đang tải|Loading/i.test((document.querySelector('.vno-print-dialog')||document.body).innerText)", { timeoutMilliseconds: 420000, intervalMilliseconds: 500 }); out.tPreviewMs = Date.now() - tPrev; log('xem truoc xong ' + out.tPreviewMs); } catch { out.previewTimeout = true; log('xem truoc QUA 420s'); }
  await sleep(1500);
  out.ui = await ev(`JSON.stringify((() => { const d = [...document.querySelectorAll('[role=dialog], .vno-dialog-box, .vno-print-preview, .vno-print-dialog, .vno-modal')].filter(n => n.getBoundingClientRect().width > 50)[0]; return d ? { cls: String(d.className).slice(0, 60), text: d.innerText.replace(/\\s+/g, ' ').slice(0, 260), imgs: d.querySelectorAll('img, canvas, iframe, embed, object').length } : null; })())`);
  const shot = await session.cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(png, Buffer.from((shot.result || shot).data, "base64"));
} catch (e) { out.error = String(e.message).slice(0, 200); }
finally { try { await session.close(); } catch {} }
console.log(JSON.stringify(out));
