import { launchApp } from "./session.mjs";
import { mouseClick } from "./actions.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dir = "E:\\VNOffice-profiles\\claude-excelpar";
const template = dir + "\\template.xlsx";
// [ten, o, loai, id, gia tri]
const ops = [
  ["bold","E2","click","sheet.cell.bold"],["italic","E2","click","sheet.cell.italic"],["underline","E2","click","sheet.cell.underline"],
  ["size16","E2","select","sheet.font.size","16"],["fontArial","E2","select","sheet.font.family","Arial"],
  ["fillDefault","E2","click","sheet.cell.fillColor"],["textColorDefault","E2","click","sheet.cell.textColor"],
  ["alignCenter","E2","click","sheet.cell.alignCenter"],["alignRight","E2","click","sheet.cell.alignRight"],["wrap","E2","click","sheet.cell.wrapText"],
  ["numNumber","B2","select","sheet.format.quickCategory","number"],["numCurrency","B2","select","sheet.format.quickCategory","currency"],["numAccounting","B2","select","sheet.format.quickCategory","accounting"],
  ["numPercent","C2","select","sheet.format.quickCategory","percentage"],["numDate","D2","select","sheet.format.quickCategory","date"],
  ["decInc","B2","click","sheet.format.increaseDecimal"],["decDec","B2","click","sheet.format.decreaseDecimal"],["thousands","B2","click","sheet.format.thousands"],["percentBtn","C2","click","sheet.format.percent"],["bordersDefault","E2","click","sheet.cell.borders"],
];
const only = (process.env.OPS || "").split(",").filter(Boolean);
for (const [name, cell, kind, id, value] of ops) {
  if (only.length && !only.includes(name)) continue;
  const out = dir + "\\app_" + name + ".xlsx";
  const session = await launchApp("sheet", { filePath: template, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 300000 });
  try {
    const norm = template.replace(/\\/g, "/").toLowerCase();
    await session.cdp.waitFor(`(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase(); return p === ${JSON.stringify(norm)} && window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view'); })()`, { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
    await sleep(1500);
    const pos = JSON.parse(await ev(`(() => { const e=document.querySelector('.vno-grid-cell[data-coord="${cell}"]'); if(!e) return 'null'; e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`));
    if (!pos) { console.log(name.padEnd(18), "khong thay o", cell); continue; }
    await mouseClick(session.cdp, pos.x, pos.y); await sleep(250);
    let status;
    if (kind === "click") {
      status = await ev(`(() => { const nodes=[...document.querySelectorAll('[data-command-id="${id}"]')]; const v=nodes.find(n=>{const r=n.getBoundingClientRect(); return r.width>0&&r.height>0;}); if(!v) return 'NO_BUTTON'; v.click(); return 'clicked'; })()`);
    } else {
      status = await ev(`(() => { const s=document.querySelector('select[data-command-id="${id}"]'); if(!s) return 'NO_SELECT'; const opts=[...s.options].map(o=>o.value); const has=opts.includes(${JSON.stringify(value)}); s.value=${JSON.stringify(value)}; s.dispatchEvent(new Event('change',{bubbles:true})); return 'select '+(has?'ok':'GIA TRI KHONG CO trong '+opts.slice(0,12).join('/')); })()`);
    }
    await sleep(600);
    const info = await ev(`(() => { const it=window.__vnoAppInstance.grid.cellsData.get("${cell}")||{}; return JSON.stringify({fw:it.style&&it.style.fontWeight, fmt:it.style&&it.style.numberFormat&&it.style.numberFormat.category}); })()`);
    await ev("window.__vnoAppInstance.adapter.isDirty = true");
    const saved = await ev(`(() => { window.__vnoAuditContent = window.__vnoAppInstance.adapter.serializeToFods(); return globalThis.globalUnoBridge.saveRealFileInPlace("sheet", window.__vnoAuditContent, ${JSON.stringify(out)}, ${JSON.stringify(template)}); })()`);
    console.log(name.padEnd(18), "save=" + (saved && saved.status), "|", status, "|", info);
  } catch (e) { console.log(name.padEnd(18), "LOI:", String(e.message).slice(0, 120)); } finally { await session.close(); }
}