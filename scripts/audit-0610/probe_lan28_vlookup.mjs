// Chan doan VLOOKUP lan28 trong app: gia tri N3 sau khi nap, kieu khoa cot A cua 'Gia cost1'.
// Chay: VNO_APP_ROOT=<repo> node --experimental-websocket scripts/audit-0610/probe_lan28_vlookup.mjs <LOCALAPPDATA> <tep.xlsx>
import { launchApp } from "../../tests/live/cdp/session.mjs";
const [lad, file] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("sheet", { localAppData: lad, filePath: file, startTimeoutMilliseconds: 600000, readyTimeoutMilliseconds: 600000 });
const ev = (e, ms = 300000) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: ms });
try {
  const norm = file.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase(); return p === ${JSON.stringify(norm)}; })()`, { timeoutMilliseconds: 600000, intervalMilliseconds: 250 });
  await sleep(8000);
  const r = await ev(`JSON.stringify((() => { const g = window.__vnoAppInstance.grid; const names = g.sheets || []; const out = { sheets: names, scriptSrc: [...document.scripts].map(s => s.src).filter(s => /formula-engine|sheet-grid/.test(s)).slice(0, 3) }; const gc = (g.sheetsData || {})['Giá cost1']; out.giaCost1Cells = gc ? gc.size : -1; const keys = []; if (gc) { for (const [k, v] of gc) { if (/^A\\d+$/.test(k) && keys.length < 6) keys.push({ k, val: v && v.val, type: typeof (v && v.val), isTextCell: v && v.isTextCell, nf: v && v.style && v.style.numberFormat }); } } out.keysA = keys; const act = g.activeSheet; const d = (g.sheetsData || {})[act]; const pick = (c) => { const v = d && d.get(c); return v ? { val: v.val, f: String(v.formula || '').slice(0, 60) } : null; }; out.active = act; out.B3 = pick('B3'); out.N3 = pick('N3'); out.N4 = pick('N4'); return out; })())`);
  const o = JSON.parse(r); console.log(JSON.stringify({ active: o.active, B3: o.B3, N3: o.N3, N4: o.N4, giaCost1Cells: o.giaCost1Cells }));
  try { const fe = await ev(`(async () => { const t = await (await fetch('/apps/sheet/formula-engine.js')).text(); return JSON.stringify({ len: t.length, hasE0: t.includes('Excel 2016 can match a numeric lookup value') }); })()`); console.log("engine:", fe); } catch (e) { console.log("engine fetch error", String(e.message).slice(0, 100)); }
} finally { try { await session.close(); } catch {} }
