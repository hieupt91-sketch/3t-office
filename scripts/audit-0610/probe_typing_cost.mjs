// Do thoi gian TUNG thao tac khi sua o dau tien tren tep lon: click o, tung phim, Enter, Ctrl+Z.
// Chay: VNO_APP_ROOT=<repo> node --experimental-websocket scripts/audit-0610/probe_typing_cost.mjs <LOCALAPPDATA> <tep.xlsx> [x y]
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { mouseClick, press } from "../../tests/live/cdp/actions.mjs";
const [lad, file, xs, ys] = process.argv.slice(2);
const requestedPoint = xs !== undefined && ys !== undefined ? { x: Number(xs), y: Number(ys) } : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const session = await launchApp("sheet", { localAppData: lad, filePath: file, startTimeoutMilliseconds: 600000, readyTimeoutMilliseconds: 600000 });
const ev = (e, ms = 900000) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: ms });
const rec = [];
const time = async (name, fn) => { const t = Date.now(); await fn(); rec.push(`${name}=${Date.now() - t}ms`); console.error(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${name} ${Date.now() - t}ms`); };
try {
const expectedName = file.replace(/\\/g, "/").split("/").at(-1).toLowerCase();
  const expectedTitle = expectedName.replace(/\.xlsx$/, "");
  await session.cdp.waitFor(`(() => { const q = window.__vnoSheetQuickViewController; return Boolean(q?.active) && String(q.status?.textContent || '').includes('có thể sửa ô trong lúc chờ') && String(document.title || '').toLowerCase().startsWith(${JSON.stringify(expectedTitle)}); })()`, { timeoutMilliseconds: 30000, intervalMilliseconds: 50 });
  const point = requestedPoint || JSON.parse(await ev(`JSON.stringify((() => { const e = window.__vnoSheetQuickViewController?._selectedElement?.(); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })())`));
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error("Quick view did not render an editable selected cell.");
  const before = JSON.parse(await ev(`JSON.stringify({ quickActive: window.__vnoSheetQuickViewController?.active, quickStatus: window.__vnoSheetQuickViewController?.status?.textContent, target: (() => { const e = document.elementFromPoint(${point.x}, ${point.y}); return { tag: e?.tagName, className: String(e?.className || ''), text: String(e?.textContent || '').slice(0, 40) }; })() })`));
  if (!before.quickActive || !before.quickStatus?.includes("có thể sửa ô trong lúc chờ") || !before.target.className.includes("vno-sheet-quick-cell")) {
    throw new Error("Typing latency probe did not land on an editable quick-view cell during background loading: " + JSON.stringify(before));
  }
  await ev(`window.__lt = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ entryTypes: ['longtask'] }); } catch (e) {} true`);
  await time("click", () => mouseClick(session.cdp, point.x, point.y));
  await time("key_T", () => press(session.cdp, "t", { shift: true }, 20));
  await time("Enter", () => press(session.cdp, "Enter", {}, 20));
  await sleep(1500);
  const state = JSON.parse(await ev(`JSON.stringify({ quickActive: window.__vnoSheetQuickViewController?.active, quickHistory: window.__vnoSheetQuickViewController?.pendingHistory?.length, quickOverrides: window.__vnoSheetQuickViewController?.valueOverrides?.size, lt: (window.__lt || []).sort((a, b) => b[1] - a[1]).slice(0, 6), found: (() => { const q = window.__vnoSheetQuickViewController; if (q?.active) { for (const [k, v] of q.valueOverrides) if (String(v) === 'T') return k + ':' + v; } const g = window.__vnoAppInstance.grid; for (const [k, v] of g.cellsData) { if (v && v.val === 'T') return k + ':' + v.val; } return null; })(), undo: window.__vnoAppInstance.grid.undoStack?.length })`));
  console.log(JSON.stringify({ before, timings: rec, ...state }));
} finally { try { await session.close(); } catch {} }
