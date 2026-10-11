import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { mouseClick, mouseDrag, press, typeText } from "../../../tests/live/cdp/actions.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const root = process.env.VNO_APP_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const dir = process.env.VNO_CDP_LOCALAPPDATA;
if (!dir) throw new Error("Set VNO_CDP_LOCALAPPDATA to a dedicated audit profile.");
const template = process.env.VNO_AUDIT_TEMPLATE || path.join(root, "tests/live/cdp/test_sheet_home.xlsx");
await mkdir(dir, { recursive: true });
// [ten, o, loai, id, gia tri]
const ops = [
  ["bold","B2","click","sheet.cell.bold"],["italic","B2","click","sheet.cell.italic"],["underline","B2","click","sheet.cell.underline"],
  ["size16","B2","select","sheet.font.size","16"],["fontArial","B2","select","sheet.font.family","Arial"],
  ["fillDefault","B2","click","sheet.cell.fillColor"],["textColorDefault","B2","click","sheet.cell.textColor"],
  ["alignCenter","B2","click","sheet.cell.alignCenter"],["alignRight","B2","click","sheet.cell.alignRight"],["wrap","B2","click","sheet.cell.wrapText"],
  ["numNumber","C2","select","sheet.format.quickCategory","number"],["numCurrency","C2","select","sheet.format.quickCategory","currency"],["numAccounting","C2","select","sheet.format.quickCategory","accounting"],
  ["numPercent","D2","select","sheet.format.quickCategory","percentage"],["numDate","E2","select","sheet.format.quickCategory","date"],
  ["decInc","C2","click","sheet.format.increaseDecimal"],["decDec","C2","click","sheet.format.decreaseDecimal"],["standard","C2","click","sheet.format.standard"],["percentBtn","D2","click","sheet.format.percent"],["bordersDefault","B2","click","sheet.cell.borders"],
  ["indentIncrease","B2","click","sheet.cell.indentIncrease"],["mergeCenter","A8","merge","sheet.cell.mergeCenter","A8:B8"],
  ["autoSum","C7","click","sheet.formula.sum"],["fillDown","B2","shortcutDown","Ctrl+D","B2:B3"],
  ["insertRow","A3","click","sheet.row.insert"],["deleteRow","A3","click","sheet.row.delete"],
  ["insertCol","B2","click","sheet.col.insert"],["deleteCol","B2","click","sheet.col.delete"],
  ["formulaSum","H2","type",null,"=SUM(C2:C6)"],["formulaAverage","H3","type",null,"=AVERAGE(C2:C6)"],
  ["formulaCount","H4","type",null,"=COUNT(C2:C6)"],["formulaIf","H5","type",null,'=IF(C2>1000,"Yes","No")'],
  ["formulaVlookup","H6","type",null,"=VLOOKUP(1,A2:B6,2,FALSE)"],["formulaIndexMatch","H7","type",null,"=INDEX(B2:B6,MATCH(1,A2:A6,0))"],
  ["formulaConcat","H8","type",null,'=CONCAT(B2," test")'],["formulaText","H9","type",null,'=TEXT(C2,"0.00")'],
  ["formulaDate","H10","type",null,"=DATE(2020,1,2)"],
  ["conditional","C2","conditional","sheet.format.conditional","C2:C6"],
  ["formatAsTable","A1","tableStyle","sheet.style.formatAsTable","A1:G6"],["cellGood","B2","cellStyle","sheet.style.cellStyles","good"],
  ["sortAsc","B2","click","sheet.data.sortAsc"],["filter","B1","click","sheet.data.filter"],
];
const only = (process.env.OPS || "").split(",").filter(Boolean);
for (const [name, cell, kind, id, value] of ops) {
  if (only.length && !only.includes(name)) continue;
  const out = dir + "\\app_" + name + ".xlsx";
  const session = await launchApp("sheet", { root, localAppData: dir, filePath: template, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 300000 });
  try {
    const norm = template.replace(/\\/g, "/").toLowerCase();
    await session.cdp.waitFor(`(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase(); return p === ${JSON.stringify(norm)} && window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view'); })()`, { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
    await sleep(1500);
    const pos = JSON.parse(await ev(`(() => { const e=document.querySelector('.vno-grid-cell[data-coord="${cell}"]'); if(!e) return 'null'; e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`));
    if (!pos) { console.log(name.padEnd(18), "khong thay o", cell); continue; }
    if (kind === "merge" || kind === "range" || kind === "shortcutDown" || kind === "conditional" || kind === "tableStyle") {
      const [from, to] = value.split(":");
      const range = JSON.parse(await ev(`(() => { const a=document.querySelector('.vno-grid-cell[data-coord="${from}"]'); const b=document.querySelector('.vno-grid-cell[data-coord="${to}"]'); if(!a||!b) return 'null'; const ar=a.getBoundingClientRect(), br=b.getBoundingClientRect(); return JSON.stringify({x1:ar.left+ar.width/2,y1:ar.top+ar.height/2,x2:br.left+br.width/2,y2:br.top+br.height/2}); })()`));
      if (!range) { console.log(name.padEnd(18), "khong thay vung", value); continue; }
      await mouseDrag(session.cdp, range.x1, range.y1, range.x2, range.y2);
      console.log(name.padEnd(18), "selection=" + await ev("JSON.stringify(window.__vnoAppInstance.grid.selectionRange)"));
    } else await mouseClick(session.cdp, pos.x, pos.y);
    let status;
    if (kind === "type") {
      await typeText(session.cdp, value); await press(session.cdp, "Enter"); status = "typed formula";
    } else if (kind === "shortcutDown") {
      await press(session.cdp, "d", { ctrl: true }); status = "pressed Ctrl+D";
    } else if (kind === "click" || kind === "merge" || kind === "range" || kind === "conditional" || kind === "tableStyle" || kind === "cellStyle") {
      const button = JSON.parse(await ev(`(() => { const nodes=[...document.querySelectorAll('[data-command-id="${id}"]')]; const visible=n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'}; const v=nodes.find(visible); if(v){const r=v.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})} const group=nodes[0]?.closest('.vno-ribbon-group.vno-group-collapsed'); const btn=group?.querySelector('.vno-ribbon-group-collapsed-btn'); if(!btn||!visible(btn)) return 'null'; const r=btn.getBoundingClientRect();return JSON.stringify({collapsed:{x:r.left+r.width/2,y:r.top+r.height/2}}) })()`));
      if (!button) status = "NO_BUTTON";
      else if (button.collapsed) {
        await mouseClick(session.cdp, button.collapsed.x, button.collapsed.y); await sleep(250);
        const item = JSON.parse(await ev(`(() => { const n=document.querySelector('.vno-ribbon-group-popover [data-command-id="${id}"]'); if(!n) return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}) })()`));
        if (!item) status = "NO_BUTTON_IN_POPOVER";
        else { await mouseClick(session.cdp, item.x, item.y); status = "clicked"; }
      } else { await mouseClick(session.cdp, button.x, button.y); status = "clicked"; }
      if (kind === "conditional" && status === "clicked") {
        await sleep(350);
        const dialog = await ev(`(() => { const type=document.querySelector('#vno-cf-type'), val=document.querySelector('#vno-cf-value'), color=document.querySelector('#vno-cf-color'); if(!type||!val) return false; type.value='greaterThan'; type.dispatchEvent(new Event('change',{bubbles:true})); val.value='2000'; val.dispatchEvent(new Event('input',{bubbles:true})); if(color) color.value='#fed7aa'; const btn=document.querySelector('.vno-rule-apply'); if(!btn) return false; const r=btn.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`);
        const apply = typeof dialog === "string" ? JSON.parse(dialog) : dialog;
        if (!apply) status = "NO_RULE_DIALOG";
        else { await mouseClick(session.cdp, apply.x, apply.y); status = "applied > 2000"; }
      }
      if ((kind === "tableStyle" || kind === "cellStyle") && status === "clicked") {
        await sleep(350);
        const selector = kind === "tableStyle" ? ".vno-table-style-card" : `.vno-cell-style-card[data-style-id="${value}"]`;
        const card = JSON.parse(await ev(`(() => { const n=document.querySelector(${JSON.stringify(selector)}); if(!n) return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}) })()`));
        if (!card) status = "NO_STYLE_CARD";
        else { await mouseClick(session.cdp, card.x, card.y); status = "applied style"; }
      }
    } else {
      status = await ev(`(() => { const s=document.querySelector('select[data-command-id="${id}"]'); if(!s) return 'NO_SELECT'; const opts=[...s.options].map(o=>o.value); const has=opts.includes(${JSON.stringify(value)}); s.value=${JSON.stringify(value)}; s.dispatchEvent(new Event('change',{bubbles:true})); return 'select '+(has?'ok':'GIA TRI KHONG CO trong '+opts.slice(0,12).join('/')); })()`);
    }
    await sleep(600);
    const info = await ev(`(() => { const it=window.__vnoAppInstance.grid.cellsData.get("${cell}")||{}; return JSON.stringify({value:it.val, formula:it.formula, calculatedValue:it.calculatedValue, fw:it.style&&it.style.fontWeight, fmt:it.style&&it.style.numberFormat&&it.style.numberFormat.category, textRotation:it.style&&it.style.textRotation}); })()`);
    await ev("window.__vnoAppInstance.adapter.isDirty = true");
    const saved = await ev(`(() => { window.__vnoAuditContent = window.__vnoAppInstance.adapter.serializeToFods(); return globalThis.globalUnoBridge.saveRealFileInPlace("sheet", window.__vnoAuditContent, ${JSON.stringify(out)}, ${JSON.stringify(template)}); })()`);
    console.log(name.padEnd(18), "save=" + (saved && saved.status), "|", status, "|", info);
  } catch (e) { console.log(name.padEnd(18), "LOI:", String(e.message).slice(0, 120)); } finally { await session.close(); }
}
