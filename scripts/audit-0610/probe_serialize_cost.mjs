// Do chi phi serializeToFods() va snapshot autorecover tren tep lon trong app desktop (worktree).
// Chay: VNO_APP_ROOT=<repo> node --experimental-websocket scripts/audit-0610/probe_serialize_cost.mjs <LOCALAPPDATA> <tep.xlsx>
import { launchApp } from "../../tests/live/cdp/session.mjs";
const [lad, file] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const session = await launchApp("sheet", { localAppData: lad, filePath: file, startTimeoutMilliseconds: 600000, readyTimeoutMilliseconds: 600000 });
const ev = (e, ms = 900000) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: ms });
try {
  const norm = file.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase(); return p === ${JSON.stringify(norm)}; })()`, { timeoutMilliseconds: 600000, intervalMilliseconds: 250 });
  console.error(`[${((Date.now() - t0) / 1000).toFixed(1)}s] nguon da set`);
  await sleep(3000);
  const r = JSON.parse(await ev(`(() => { const a = window.__vnoAppInstance.adapter; const g = window.__vnoAppInstance.grid; const sheets = (g.sheets || []).map(s => { const m = g.sheetsData?.[s]; return { s, cells: m ? m.size : -1 }; }); const t = performance.now(); const x = a.serializeToFods(); const dt = performance.now() - t; return JSON.stringify({ serializeMs: Math.round(dt), fodsMB: +(x.length / 1048576).toFixed(1), sheets }); })()`));
  console.log(JSON.stringify(r));
  const r2 = JSON.parse(await ev(`(() => { const a = window.__vnoAppInstance.adapter; const t = performance.now(); const x = a.serializeToFods(); return JSON.stringify({ secondSerializeMs: Math.round(performance.now() - t) }); })()`));
  console.log(JSON.stringify(r2));
} finally { try { await session.close(); } catch {} }
