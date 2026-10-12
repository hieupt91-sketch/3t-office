// Do thoi gian TUNG thao tac khi sua o dau tien tren tep lon: click o, tung phim, Enter, Ctrl+Z.
// Chay: VNO_APP_ROOT=<repo> node --experimental-websocket scripts/audit-0610/probe_typing_cost.mjs <LOCALAPPDATA> <tep.xlsx> [x y]
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { mouseClick, press } from "../../tests/live/cdp/actions.mjs";
const [lad, file, xs, ys] = process.argv.slice(2);
const x = Number(xs || 860), y = Number(ys || 420);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const session = await launchApp("sheet", { localAppData: lad, filePath: file, startTimeoutMilliseconds: 600000, readyTimeoutMilliseconds: 600000 });
const ev = (e, ms = 900000) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: ms });
const rec = [];
const time = async (name, fn) => { const t = Date.now(); await fn(); rec.push(`${name}=${Date.now() - t}ms`); console.error(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${name} ${Date.now() - t}ms`); };
try {
  const norm = file.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase(); return p === ${JSON.stringify(norm)}; })()`, { timeoutMilliseconds: 600000, intervalMilliseconds: 250 });
  await sleep(3000);
  await ev(`window.__lt = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ entryTypes: ['longtask'] }); } catch (e) {} true`);
  await time("click", () => mouseClick(session.cdp, x, y));
  for (const ch of "TEST") await time("key_" + ch, () => press(session.cdp, ch.toLowerCase(), { shift: true }, 20));
  await time("Enter", () => press(session.cdp, "Enter", {}, 20));
  await sleep(1500);
  const state = JSON.parse(await ev(`JSON.stringify({ lt: (window.__lt || []).sort((a, b) => b[1] - a[1]).slice(0, 6), found: (() => { const g = window.__vnoAppInstance.grid; for (const [k, v] of g.cellsData) { if (v && /^TEST/.test(String(v.val))) return k + ':' + v.val; } return null; })(), undo: window.__vnoAppInstance.grid.undoStack?.length })`));
  console.log(JSON.stringify({ timings: rec, ...state }));
} finally { try { await session.close(); } catch {} }
