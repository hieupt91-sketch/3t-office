// Chan doan hoi quy cong thuc: sau khi nap xong, du lieu cac sheet co day du khong, SUMIF qua sheet khac ra gi.
// Chay: VNO_APP_ROOT=<repo> node --experimental-websocket scripts/audit-0610/probe_cross_sheet.mjs <LOCALAPPDATA> <tep.xlsx>
import { launchApp } from "../../tests/live/cdp/session.mjs";
const [lad, file] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const session = await launchApp("sheet", { localAppData: lad, filePath: file, startTimeoutMilliseconds: 600000, readyTimeoutMilliseconds: 600000 });
const ev = (e, ms = 300000) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: ms });
const snap = `JSON.stringify((() => { const app = window.__vnoAppInstance; const g = app.grid; const a = app.adapter; const sheets = (g.sheets || []).map(s => { const m = g.sheetsData?.[s]; let f = 0, n = 0; if (m) for (const [k, v] of m) { n++; if (v && v.formula) f++; } return { s, cells: n, formulas: f }; }); const formulas = []; const m0 = g.sheetsData?.[g.sheets[0]]; if (m0) { for (const [k, v] of m0) { if (v && v.formula && /SUMIF/i.test(v.formula)) { formulas.push({ k, f: String(v.formula).slice(0, 70), val: v.val }); if (formulas.length >= 3) break; } } } return { quick: !!document.querySelector('.vno-sheet-quick-view'), docId: a?.docId || a?._docId || null, hydrated: a?._hydrated ?? a?.hydrated ?? null, sheets, formulas }; })())`;
try {
  const norm = file.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`!!window.__vnoAppInstance?.grid?.sheetsData`, { timeoutMilliseconds: 600000, intervalMilliseconds: 250 });
  console.error(`[${((Date.now() - t0) / 1000).toFixed(1)}s] grid co sheetsData`);
  console.log("EARLY", await ev(snap));
  await session.cdp.waitFor(`(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase(); return p === ${JSON.stringify(norm)}; })()`, { timeoutMilliseconds: 600000, intervalMilliseconds: 250 });
  console.error(`[${((Date.now() - t0) / 1000).toFixed(1)}s] nguon da set`);
  await sleep(5000);
  console.log("LATE ", await ev(snap));
} finally { try { await session.close(); } catch {} }
