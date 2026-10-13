// Doc gia tri/cong thuc cac o chi dinh sau khi nap day du trong app.
// Chay: VNO_APP_ROOT=<repo> node --experimental-websocket scripts/audit-0610/probe_cells.mjs <LOCALAPPDATA> <tep.xlsx> "<ten sheet>" A1,B2,...
import { launchApp } from "../../tests/live/cdp/session.mjs";
const [lad, file, sheet, cellList] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("sheet", { localAppData: lad, filePath: file, startTimeoutMilliseconds: 600000, readyTimeoutMilliseconds: 600000 });
const ev = (e, ms = 300000) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: ms });
try {
  const norm = file.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase(); return p === ${JSON.stringify(norm)}; })()`, { timeoutMilliseconds: 600000, intervalMilliseconds: 250 });
  await sleep(12000);
  const r = await ev(`JSON.stringify((() => { const g = window.__vnoAppInstance.grid; const d = (g.sheetsData || {})[${JSON.stringify(sheet)}]; if (!d) return { error: 'no sheet', sheets: Object.keys(g.sheetsData || {}) }; const out = {}; for (const c of ${JSON.stringify(cellList)}.split(',')) { const v = d.get(c); out[c] = v ? { val: v.val, f: String(v.formula || '').slice(0, 80), t: typeof v.val } : null; } return out; })())`);
  console.log(r);
} finally { try { await session.close(); } catch {} }