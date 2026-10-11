import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click } from "../../../tests/live/cdp/actions.mjs";
import { mkdirSync } from "node:fs";

const dir = process.env.VNO_WORD_PARALLEL_DIR || process.env.VNO_CDP_LOCALAPPDATA;
if (!dir) throw new Error("Set VNO_CDP_LOCALAPPDATA to the dedicated audit profile.");
process.env.VNO_CDP_LOCALAPPDATA = dir;
process.env.VNO_APP_ROOT = process.env.VNO_APP_ROOT || process.cwd();
mkdirSync(dir, { recursive: true });
const template = dir + "\\template.docx";
const output = dir + "\\app_tableInsert.docx";
const session = await launchApp("writer", { filePath: template, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  const norm = template.replace(/\\/g, "/").toLowerCase();
  await cdp.waitFor(`(() => { const a=window.__vnoAppInstance?.adapter; const p=String(a?._sourcePath||a?.sourceFilePath||'').replace(/\\\\/g,'/').toLowerCase(); return p===${JSON.stringify(norm)} && document.querySelector('.vno-writer-body')?.textContent.includes('Alpha'); })()`, { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
  await cdp.evaluate(`(() => { const b=document.querySelector('.vno-writer-body'); b.focus(); const p=[...b.querySelectorAll('p')].find(x=>x.textContent.includes('Alpha')); const r=document.createRange(); r.selectNodeContents(p); const s=getSelection(); s.removeAllRanges(); s.addRange(r); })()`);
  const insertTab = await cdp.evaluate(`[...document.querySelectorAll('.vno-ribbon-tab')].find(x=>/Chèn|Insert/i.test(x.textContent))?.textContent`);
  if (insertTab) await click(cdp, ".vno-ribbon-tab", await cdp.evaluate(`[...document.querySelectorAll('.vno-ribbon-tab')].findIndex(x=>/Chèn|Insert/i.test(x.textContent))`));
  await click(cdp, 'button[data-command-id="writer.table.insert"]');
  await cdp.evaluate(`new Promise(r=>setTimeout(r,500))`, { awaitPromise: true });
  const state = await cdp.evaluate(`(() => { const t=document.querySelector('.vno-writer-body table'); return t ? {rows:t.rows.length, cells:[...t.rows].map(r=>r.cells.length), html:t.outerHTML} : null; })()`);
  if (!state) throw new Error("Ribbon action did not insert a table.");
  const saved = await cdp.evaluate(`(() => { const a=window.__vnoAppInstance.adapter; return globalThis.globalUnoBridge.saveRealFileInPlace("writer", a._contentForExport(), ${JSON.stringify(output)}, ${JSON.stringify(template)}); })()`, { awaitPromise: true, timeoutMilliseconds: 240000 });
  console.log(JSON.stringify({ state, save: saved?.status, output }));
} finally {
  await session.close();
}
