// Kiem tra khả năng dùng của Sheet trên BAN DA CAI: mo tep, khi nao sua duoc, go chu, cuon, xem truoc khi in.
// Chay: node --experimental-websocket scripts/audit-0610/installed_sheet_usability.mjs <thu-muc-cai> <LOCALAPPDATA co lap> <tep.xlsx> [OUT.json]
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { mouseClick, mouseWheel, press, typeText } from "../../tests/live/cdp/actions.mjs";
import fs from "node:fs";
import path from "node:path";

const inst = process.argv[2], lad = process.argv[3], file = process.argv[4], outJson = process.argv[5];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const r = { file: path.basename(file), sizeMB: +(fs.statSync(file).size / 1048576).toFixed(2) };
const t0 = Date.now(); const log = (m) => console.error(`[${((Date.now()-t0)/1000).toFixed(1)}s] ${m}`);
const session = await launchApp("sheet", { root: path.join(inst, "app"), python: path.join(inst, "python", "python.exe"), localAppData: lad, filePath: file, startTimeoutMilliseconds: 600000, readyTimeoutMilliseconds: 600000 });
const ev = (e, ms = 120000) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: ms });
try {
  r.tLaunchMs = Date.now() - t0; log("launched");
  const norm = file.replace(/\\/g, "/").toLowerCase();
  const loaded = `(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase(); return p === ${JSON.stringify(norm)}; })()`;
  await session.cdp.waitFor(loaded, { timeoutMilliseconds: 600000, intervalMilliseconds: 250 });
  r.tSourceSetMs = Date.now() - t0; log("source set");
  // grid co du lieu / quick view
  await session.cdp.waitFor(`!!window.__vnoAppInstance?.grid && !!window.__vnoAppInstance.grid.cellsData`, { timeoutMilliseconds: 600000, intervalMilliseconds: 250 });
  r.tGridMs = Date.now() - t0; log("grid ready");
  r.quickViewAtGrid = await ev(`!!document.querySelector('.vno-sheet-quick-view')`);
  // cho quick view bien mat (neu co) de do thoi diem sua duoc
  const qv0 = Date.now();
  try { await session.cdp.waitFor(`![...document.querySelectorAll('.vno-sheet-quick-view, .vno-loading, [role=progressbar]')].some(n => { const b = n.getBoundingClientRect(); const s = getComputedStyle(n); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; })`, { timeoutMilliseconds: 600000, intervalMilliseconds: 250 }); } catch (e) { r.quickViewStuck = true; }
  r.tEditableMs = Date.now() - t0; log("editable (quick view gone)");
  r.quickViewWaitMs = Date.now() - qv0;
  await sleep(1500);
  // thong tin kich thuoc
  r.info = JSON.parse(await ev(`JSON.stringify((() => { const g = window.__vnoAppInstance.grid; const s = g.activeSheet || ''; const m = g.cellsData; return { sheets: (g.sheets || []).length, active: s, cells: m ? m.size : -1, title: document.title }; })())`));
  // do do tre luong giao dien khi ranh: 15 lan do thoi gian di-ve cua mot lenh JS trivial
  const rtt = async (n) => { const a = []; for (let i = 0; i < n; i++) { const s = Date.now(); await ev("1"); a.push(Date.now() - s); await sleep(60); } a.sort((x, y) => x - y); return { p50: a[Math.floor(a.length / 2)], max: a[a.length - 1] }; };
  r.idleRtt = await rtt(15);
  // thu go chu vao o: bam o A1 bang chuot that, go chu, Enter
  const pos = { x: 860, y: 420 };  // vung o trong ben phai bang du lieu (lan tep mau); luoi la DOM, khong phai canvas
  const tType0 = Date.now();
  await mouseClick(session.cdp, pos.x, pos.y);
  await sleep(300);
  await typeText(session.cdp, "TEST123", 20);
  await press(session.cdp, "Enter", {}, 200);
  r.tTypeMs = Date.now() - tType0; log("typed");
  await sleep(500);
  r.typedOk = await ev(`(() => { const g = window.__vnoAppInstance.grid; for (const [k, v] of g.cellsData) { if (v && String(v.val) === 'TEST123') return k; } return null; })()`);
  // undo
  await press(session.cdp, "z", { ctrl: true }, 400);
  r.undoRemoved = await ev(`(() => { const g = window.__vnoAppInstance.grid; for (const [k, v] of g.cellsData) { if (v && String(v.val) === 'TEST123') return false; } return true; })()`);
  // cuon: 30 lan lan chuot, do thoi gian
  const tS = Date.now();
  for (let i = 0; i < 30; i++) { await mouseWheel(session.cdp, pos.x + 100, pos.y + 100, 0, 240); }
  r.tScroll30Ms = Date.now() - tS; log("scrolled");
  r.afterScrollRtt = await rtt(10);
  // Xem truoc khi in
  const tP = Date.now();
  const clicked = await ev(`(() => { const tab = document.getElementById('vno-ribbon-tab-pageLayout') || [...document.querySelectorAll('[id^=vno-ribbon-tab-]')].find(t => /layout|trang|page/i.test(t.id + t.textContent)); if (tab) tab.click(); return !!tab; })()`);
  await sleep(500);
  const btn = await ev(`(() => { const n = [...document.querySelectorAll('[data-command-id="sheet.file.printPreview"],[data-command-id="common.file.print"]')].find(x => { const b = x.getBoundingClientRect(); return b.width > 0 && b.height > 0; }); if (!n) return null; const b = n.getBoundingClientRect(); return { id: n.dataset.commandId, x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
  r.printButton = btn && btn.id;
  if (btn) {
    await mouseClick(session.cdp, btn.x, btn.y);
    try {
      await session.cdp.waitFor(`!!document.querySelector('[role=dialog], .vno-dialog-box, .vno-print-preview, .vno-print-dialog')`, { timeoutMilliseconds: 180000, intervalMilliseconds: 250 });
      r.tPrintDialogMs = Date.now() - tP;
      r.printUi = await ev(`(() => { const d = document.querySelector('.vno-print-preview, .vno-print-dialog, [role=dialog], .vno-dialog-box'); return d ? d.innerText.replace(/\\s+/g,' ').slice(0, 200) : ''; })()`);
    } catch (e) { r.printDialogTimeout = true; }
  }
} catch (e) {
  r.error = String(e.message).slice(0, 300);
} finally {
  try { await session.close(); } catch {}
}
const out = JSON.stringify(r);
console.log(out);
if (outJson) fs.writeFileSync(outJson, out, "utf8");
