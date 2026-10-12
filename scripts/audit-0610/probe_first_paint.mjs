// Do thoi gian tu luc mo tep den khi THAY DU LIEU (xem nhanh hien chu) va den khi sua duoc, theo dong ho cua nguoi dung.
// Chay: VNO_APP_ROOT=<repo> node --experimental-websocket scripts/audit-0610/probe_first_paint.mjs <LOCALAPPDATA> <tep.xlsx>
import { launchApp } from "../../tests/live/cdp/session.mjs";
const [lad, file] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const session = await launchApp("sheet", { localAppData: lad, filePath: file, startTimeoutMilliseconds: 600000, readyTimeoutMilliseconds: 600000 });
const ev = (e, ms = 120000) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: ms });
const out = { file: file.split("\\").pop(), tPageReadyMs: Date.now() - t0 };
try {
  const t1 = Date.now();
  const sees = `(() => { const t = (document.body.innerText || ''); const hasData = [...document.querySelectorAll('.vno-sheet-quick-view, .vno-sheet-container')].some(n => (n.innerText || '').replace(/\\s+/g, '').length > 120); return hasData; })()`;
  await session.cdp.waitFor(sees, { timeoutMilliseconds: 600000, intervalMilliseconds: 50 });
  out.tFirstDataVisibleAfterPageMs = Date.now() - t1;
  out.tFirstDataVisibleFromLaunchMs = Date.now() - t0;
  const norm = file.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase(); return p === ${JSON.stringify(norm)}; })()`, { timeoutMilliseconds: 600000, intervalMilliseconds: 250 });
  out.tFullModelFromLaunchMs = Date.now() - t0;
  out.sample = (await ev(`(document.querySelector('.vno-sheet-quick-view, .vno-sheet-container')||{innerText:''}).innerText.replace(/\\s+/g,' ').slice(0,80)`));
} catch (e) { out.error = String(e.message).slice(0, 160); }
finally { try { await session.close(); } catch {} }
console.log(JSON.stringify(out));
