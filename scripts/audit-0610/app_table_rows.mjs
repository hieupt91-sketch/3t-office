// App: moi hang cua moi bang cap cao nhat (trang, top pt, cao pt, 40 ky tu dau) -> JSON.
// Chay: node --experimental-websocket scripts/audit-0610/app_table_rows.mjs <docx> <out.json>
import fs from "node:fs/promises";
import { launchApp } from "../../tests/live/cdp/session.mjs";
const [file, out] = [process.argv[2], process.argv[3]];
const session = await launchApp("writer", { filePath: file, startTimeoutMilliseconds: 120000 });
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 50", { timeoutMilliseconds: 120000, intervalMilliseconds: 500 });
  await new Promise((r) => setTimeout(r, 8000));
  const rows = await session.cdp.evaluate(`(() => { const body=document.querySelector('.vno-writer-body'); const tables=[...body.querySelectorAll('table')].filter(t => !t.parentElement.closest('table')); return tables.map((t, ti) => { const trs=[...t.querySelectorAll(':scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr, :scope > tr')]; let page=1, n=0; const out=[]; for (const tr of trs) { if (tr.hasAttribute('data-vno-auto-page-gap')) { page++; continue; } n++; const rc=tr.getBoundingClientRect(); out.push({ r:n, p:page, top: Math.round(rc.top*0.75*10)/10, h: Math.round(rc.height*0.75*10)/10, t:(tr.innerText||'').replace(/\\s+/g,' ').slice(0,40) }); } return { tableIndex: ti+1, rows: out }; }); })()`);
  await fs.writeFile(out, JSON.stringify(rows, null, 1));
  console.log("OK tables=" + rows.length);
} finally { await session.close(); }