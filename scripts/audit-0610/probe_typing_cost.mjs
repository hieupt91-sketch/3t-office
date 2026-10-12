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
  const expectedName = file.replace(/\\/g, "/").split("/").at(-1).toLowerCase();
  const expectedTitle = expectedName.replace(/\.xlsx$/, "");
  await session.cdp.waitFor(`Boolean(window.__vnoSheetQuickViewController?.active) && String(document.title || '').toLowerCase().startsWith(${JSON.stringify(expectedTitle)})`, { timeoutMilliseconds: 600000, intervalMilliseconds: 50 });
  const before = JSON.parse(await ev(`JSON.stringify({ quickActive: window.__vnoSheetQuickViewController?.active, quickStatus: window.__vnoSheetQuickViewController?.status?.textContent, target: (() => { const e = document.elementFromPoint(${x}, ${y}); return { tag: e?.tagName, className: String(e?.className || ''), text: String(e?.textContent || '').slice(0, 40) }; })() })`));
  await ev(`window.__lt = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ entryTypes: ['longtask'] }); } catch (e) {} true`);
  await time("click", () => mouseClick(session.cdp, x, y));
  for (const ch of "TEST") await time("key_" + ch, () => press(session.cdp, ch.toLowerCase(), { shift: true }, 20));
  await time("Enter", () => press(session.cdp, "Enter", {}, 20));
  await sleep(1500);
  const state = JSON.parse(await ev(`JSON.stringify({ quickActive: window.__vnoSheetQuickViewController?.active, quickHistory: window.__vnoSheetQuickViewController?.pendingHistory?.length, quickOverrides: window.__vnoSheetQuickViewController?.valueOverrides?.size, lt: (window.__lt || []).sort((a, b) => b[1] - a[1]).slice(0, 6), found: (() => { const q = window.__vnoSheetQuickViewController; if (q?.active) { const key = q._cellKey(q.activeSheet, q.selected.row - 1, q.selected.col); for (const [k, v] of q.valueOverrides) if (/^TEST/.test(String(v))) return k + ':' + v; } const g = window.__vnoAppInstance.grid; for (const [k, v] of g.cellsData) { if (v && /^TEST/.test(String(v.val))) return k + ':' + v.val; } return null; })(), undo: window.__vnoAppInstance.grid.undoStack?.length })`));
  console.log(JSON.stringify({ before, timings: rec, ...state }));
} finally { try { await session.close(); } catch {} }
