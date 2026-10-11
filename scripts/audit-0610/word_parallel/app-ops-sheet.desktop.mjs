import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { mouseClick, mouseDrag, mouseMove, mouseRightClick, mouseTripleClick, press, typeText, insertText } from "../../../tests/live/cdp/actions.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
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
  ["autoSum","C7","click","sheet.formula.sum"],["averageBtn","C7","click","sheet.formula.average"],["countNumbersBtn","C7","click","sheet.formula.countNumbers"],["fillDown","B2","shortcutDown","Ctrl+D","B2:B3"],
  ["insertRow","A3","click","sheet.row.insert"],["deleteRow","A3","click","sheet.row.delete"],
  ["insertCol","B2","click","sheet.col.insert"],["deleteCol","B2","click","sheet.col.delete"],
  ["rowHeight","A3","promptNumber","sheet.row.height","36"],["colWidth","B2","promptNumber","sheet.col.width","120"],
  ["hideRow","A3","click","sheet.row.hide"],["hideCol","B2","click","sheet.col.hide"],
  ["unhideRow","A2","click","sheet.row.unhide"],["unhideCol","C2","click","sheet.col.unhide"],
  ["freezePanes","B2","click","sheet.view.freezePanes"],["printArea","A1","click","sheet.page.setPrintArea"],
  ["pageSetup","A1","pageSetup","sheet.page.margins","landscape"],
  ["rotation90","B2","orientation","sheet.cell.orientation","90"],
  ["widthControl","B2","widthControl",null,null],
  ["definedName","B2","nameManager","sheet.formula.nameManager","SampleNames"],
  ["validation","C2","validation","sheet.data.validation","Open,Closed"],
  ["chart","A1","chart","sheet.chart.insert","A1:C6"],
  ["chartBar","A1","chartVariant","sheet.chart.insert","bar"],
  ["chartLine","A1","chartVariant","sheet.chart.insert","line"],
  ["chartPie","A1","chartVariant","sheet.chart.insert","pie"],
  ["chartArea","A1","chartVariant","sheet.chart.insert","area"],
  ["removeDuplicates","A1","removeDuplicates","sheet.data.removeDuplicates","A1:A6"],
  ["fillRight","C2","shortcutRight","Ctrl+R","C2:D2"],
  ["formulaSum","H2","type",null,"=SUM(C2:C6)"],["formulaAverage","H3","type",null,"=AVERAGE(C2:C6)"],
  ["formulaCount","H4","type",null,"=COUNT(C2:C6)"],["formulaIf","H5","type",null,'=IF(C2>1000,"Yes","No")'],
  ["formulaVlookup","H6","type",null,"=VLOOKUP(1,A2:B6,2,FALSE)"],["formulaIndexMatch","H7","type",null,"=INDEX(B2:B6,MATCH(1,A2:A6,0))"],
  ["formulaConcat","H8","type",null,'=CONCAT(B2," test")'],["formulaText","H9","type",null,'=TEXT(C2,"0.00")'],
  ["formulaDate","H10","type",null,"=DATE(2020,1,2)"],
  ["formulaPack","H2","formulaPack",null,null],
  ["sheetVisibilityPack","A1","sheetVisibilityPack",null,null],
  ["sheetManagementPack","A1","sheetManagementPack",null,null],
  ["customSort","B2","customSort","sheet.data.customSort","A1:C6"],
  ["findReplacePack","A1","findReplacePack",null,null],
  ["pasteSpecialPack","A1","pasteSpecialPack",null,null],
  ["conditional","C2","conditional","sheet.format.conditional","C2:C6"],
  ["formatAsTable","A1","tableStyle","sheet.style.formatAsTable","A1:G6"],["cellGood","B2","cellStyle","sheet.style.cellStyles","good"],
  ["sortAsc","B2","click","sheet.data.sortAsc"],["sortDesc","B2","click","sheet.data.sortDesc"],["filter","B1","click","sheet.data.filter"],
];
const only = (process.env.OPS || "").split(",").filter(Boolean);
for (const [name, cell, kind, id, value] of ops) {
  if (only.length && !only.includes(name)) continue;
  const out = dir + "\\app_" + (process.env.VNO_AUDIT_SUFFIX || "") + name + ".xlsx";
  const session = await launchApp("sheet", { root, localAppData: dir, filePath: template, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 300000 });
  try {
    const norm = template.replace(/\\/g, "/").toLowerCase();
    await session.cdp.waitFor(`(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase(); return p === ${JSON.stringify(norm)} && window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view'); })()`, { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
    await sleep(1500);
    const pos = JSON.parse(await ev(`(() => { const e=document.querySelector('.vno-grid-cell[data-coord="${cell}"]'); if(!e) return 'null'; e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`));
    if (!pos) { console.log(name.padEnd(18), "khong thay o", cell); continue; }
    if (kind === "removeDuplicates") {
      const duplicate=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="A6"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
      if(!duplicate)throw new Error("Could not locate audit duplicate cell A6");
      await mouseClick(session.cdp,duplicate.x,duplicate.y); await typeText(session.cdp,"1"); await press(session.cdp,"Enter");
    }
    if (kind === "merge" || kind === "range" || kind === "customSort" || kind === "shortcutDown" || kind === "shortcutRight" || kind === "conditional" || kind === "tableStyle" || kind === "chart" || kind === "chartVariant" || kind === "removeDuplicates") {
      if (kind === "customSort") {
        const duplicate=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="B3"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if(!duplicate)throw new Error("Could not locate sort tie probe B3");
        await mouseClick(session.cdp,duplicate.x,duplicate.y); await typeText(session.cdp,"Nguy\u1ec5n V\u0103n A"); await press(session.cdp,"Enter");
      }
      const [from, to] = kind === "chartVariant" ? ["A1", "C6"] : value.split(":");
      const range = JSON.parse(await ev(`(() => { const a=document.querySelector('.vno-grid-cell[data-coord="${from}"]'); const b=document.querySelector('.vno-grid-cell[data-coord="${to}"]'); if(!a||!b) return 'null'; const ar=a.getBoundingClientRect(), br=b.getBoundingClientRect(); return JSON.stringify({x1:ar.left+ar.width/2,y1:ar.top+ar.height/2,x2:br.left+br.width/2,y2:br.top+br.height/2}); })()`));
      if (!range) { console.log(name.padEnd(18), "khong thay vung", value); continue; }
      await mouseDrag(session.cdp, range.x1, range.y1, range.x2, range.y2);
      console.log(name.padEnd(18), "selection=" + await ev("JSON.stringify(window.__vnoAppInstance.grid.selectionRange)"));
    } else await mouseClick(session.cdp, pos.x, pos.y);
    let status;
    if (kind === "widthControl") {
      status = "opened and saved unchanged width control";
    } else if (kind === "sheetVisibilityPack") {
      const clickSelector = async selector => {
        const point = JSON.parse(await ev(`(() => {const n=document.querySelector(${JSON.stringify(selector)});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if (!point) throw new Error("Missing UI control: " + selector);
        await mouseClick(session.cdp, point.x, point.y);
      };
      const tabPoint = async name => JSON.parse(await ev(`(() => {const n=[...document.querySelectorAll('.vno-sheet-tab-item')].find(x=>x.dataset.sheet===${JSON.stringify(name)});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
      const contextItem = async index => { const point=JSON.parse(await ev(`(() => {const n=document.querySelectorAll(".vno-sheet-context-item")[${index}];if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));if(!point)throw new Error("Missing sheet context action index "+index);await mouseClick(session.cdp,point.x,point.y); };
      await clickSelector(".vno-sheet-add-btn");
      await session.cdp.waitFor("document.querySelectorAll('.vno-sheet-tab-item').length >= 2",{timeoutMilliseconds:10000});
      let tab=await tabPoint("Sheet2");
      if(!tab)tab=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-sheet-tab-item.is-active');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,name:n.dataset.sheet})})()`));
      await mouseRightClick(session.cdp,tab.x,tab.y);
      await contextItem(2);
      const hiddenState=await ev("JSON.stringify({sheets:window.__vnoAppInstance.grid.sheets,active:window.__vnoAppInstance.grid.activeSheet,visibility:window.__vnoAppInstance.grid.sheetVisibilityBySheet,tabs:[...document.querySelectorAll('.vno-sheet-tab-item')].map(x=>x.dataset.sheet)})");
      const evidenceDir=path.join(root,"docs","tickets-0710","evidence"); await mkdir(evidenceDir,{recursive:true});
      const hiddenShot=await session.cdp.send("Page.captureScreenshot",{format:"png"},60000);
      await writeFile(path.join(evidenceDir,"fix-s9-sheet-hide.png"),Buffer.from((hiddenShot.result||hiddenShot).data,"base64"));
      const hiddenOut=path.join(dir,"app_sheetVisibility_hidden.xlsx");
      await ev("window.__vnoAppInstance.adapter.isDirty = true");
      const hiddenContent=await ev("window.__vnoAppInstance.adapter.serializeToFods()");
      const hiddenSave=await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("sheet",${JSON.stringify(hiddenContent)},${JSON.stringify(hiddenOut)},${JSON.stringify(template)})`);
      if(!hiddenSave||hiddenSave.status!=="ok")throw new Error("Hidden-state XLSX save failed");
      const visibleName=JSON.parse(hiddenState).active;
      tab=await tabPoint(visibleName);
      await mouseRightClick(session.cdp,tab.x,tab.y);
      await contextItem(3);
      await sleep(200);
      const selector=".vno-sheet-rule-dialog #vno-unhide-sheet";
      const selectPos=JSON.parse(await ev(`(() => {const n=document.querySelector(${JSON.stringify(selector)});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
      if(!selectPos)throw new Error("Unhide dialog did not open");
      const dialogShot=await session.cdp.send("Page.captureScreenshot",{format:"png"},60000);
      await writeFile(path.join(evidenceDir,"fix-s9-sheet-unhide.png"),Buffer.from((dialogShot.result||dialogShot).data,"base64"));
      await mouseClick(session.cdp,selectPos.x,selectPos.y); await press(session.cdp,"ArrowDown"); await press(session.cdp,"Enter");
      await clickSelector(".vno-sheet-rule-dialog .vno-rule-apply");
      status="hidden save="+hiddenSave.status+" state="+hiddenState;
    } else if (kind === "sheetManagementPack") {
      const clickSelector=async selector=>{const point=JSON.parse(await ev(`(() => {const n=document.querySelector(${JSON.stringify(selector)});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));if(!point)throw new Error("Missing sheet management UI control "+selector);await mouseClick(session.cdp,point.x,point.y);};
      const tabPoint=async name=>JSON.parse(await ev(`(() => {const n=[...document.querySelectorAll('.vno-sheet-tab-item')].find(x=>x.dataset.sheet===${JSON.stringify(name)});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
      const openContext=async(name,index)=>{const p=await tabPoint(name);if(!p)throw new Error("Missing sheet tab "+name);await mouseRightClick(session.cdp,p.x,p.y);const item=JSON.parse(await ev(`(() => {const n=document.querySelectorAll(".vno-sheet-context-item")[${index}];if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));if(!item)throw new Error("Missing sheet menu action index "+index);await mouseClick(session.cdp,item.x,item.y);};
      await clickSelector(".vno-sheet-add-btn");await session.cdp.waitFor("document.querySelectorAll('.vno-sheet-tab-item').length>=2",{timeoutMilliseconds:10000});
      await openContext("Sheet2",0); await clickSelector("#vno-rename-sheet");await press(session.cdp,"Home");await press(session.cdp,"End",{shift:true});await insertText(session.cdp,"S9 Review");const renameDebug=await ev("JSON.stringify({value:document.querySelector(\"#vno-rename-sheet\")?.value,active:document.activeElement?.id})");await clickSelector(".vno-sheet-rule-dialog .vno-rule-apply");await sleep(100);console.log("renameDebug="+renameDebug+" sheets="+await ev("JSON.stringify(window.__vnoAppInstance.grid.sheets)"));
      await openContext("S9 Review",1);await press(session.cdp,"Home");await clickSelector(".vno-sheet-rule-dialog .vno-rule-apply");
      await clickSelector(".vno-sheet-add-btn");await session.cdp.waitFor("document.querySelectorAll('.vno-sheet-tab-item').length>=3",{timeoutMilliseconds:10000});
      await session.cdp.send("Page.enable");const dialogListener=event=>{try{const m=JSON.parse(String(event.data));if(m.method==="Page.javascriptDialogOpening")void session.cdp.send("Page.handleJavaScriptDialog",{accept:true},10000).catch(()=>{});}catch{}};session.cdp.socket.addEventListener("message",dialogListener);const deleteTab=await tabPoint("Sheet3");await mouseRightClick(session.cdp,deleteTab.x,deleteTab.y);const deleteItem=JSON.parse(await ev(`(() => {const n=document.querySelectorAll(".vno-sheet-context-item")[3];if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));if(!deleteItem)throw new Error("Missing delete sheet menu item");await mouseClick(session.cdp,deleteItem.x,deleteItem.y);session.cdp.socket.removeEventListener("message",dialogListener);await sleep(200);
      const state=await ev("JSON.stringify({sheets:window.__vnoAppInstance.grid.sheets,active:window.__vnoAppInstance.grid.activeSheet})");
      const shot=await session.cdp.send("Page.captureScreenshot",{format:"png"},60000);const evidenceDir=path.join(root,"docs","tickets-0710","evidence");await mkdir(evidenceDir,{recursive:true});await writeFile(path.join(evidenceDir,"fix-s9-sheet-management.png"),Buffer.from((shot.result||shot).data,"base64"));status="rename/move/delete via context menus; "+state;
    } else if (kind === "customSort") {
      const clickSelector=async selector=>{const point=JSON.parse(await ev(`(() => {const n=document.querySelector(${JSON.stringify(selector)});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));if(!point)throw new Error("Missing sort control "+selector);await mouseClick(session.cdp,point.x,point.y);};
      if(!(await ev("!!document.querySelector('#vno-cs-levels')"))){
        const anchor=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="B2"]');const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        await mouseRightClick(session.cdp,anchor.x,anchor.y); await sleep(100);
        let menuItem=JSON.parse(await ev(`(() => {const n=[...document.querySelectorAll(".vno-context-menu-item")].find(x=>x.textContent.trim().startsWith("S\u1eafp x\u1ebfp t\u00f9y ch\u1ec9nh"));if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if(!menuItem){const parent=JSON.parse(await ev(`(() => {const n=[...document.querySelectorAll(".vno-context-menu-item")].find(x=>x.textContent.trim()==="S\u1eafp x\u1ebfp");if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+n.getBoundingClientRect().height/2})})()`));if(parent){await mouseMove(session.cdp,parent.x,parent.y);await sleep(250);menuItem=JSON.parse(await ev(`(() => {const n=[...document.querySelectorAll(".vno-context-submenu .vno-context-menu-item")].find(x=>x.textContent.trim().startsWith("S\u1eafp x\u1ebfp t\u00f9y ch\u1ec9nh"));if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));}}
        if(!menuItem)throw new Error("Custom Sort did not open from ribbon or cell context menu");
        await mouseClick(session.cdp,menuItem.x,menuItem.y); await sleep(200);
      }
      await clickSelector(".vno-cs-level:nth-child(1) .vno-cs-col"); await press(session.cdp,"ArrowDown"); await press(session.cdp,"Enter");
      await clickSelector(".vno-cs-level:nth-child(2) .vno-cs-col"); await press(session.cdp,"ArrowDown"); await press(session.cdp,"Enter");
      await clickSelector(".vno-cs-level:nth-child(2) .vno-cs-order"); await press(session.cdp,"ArrowDown"); await press(session.cdp,"Enter");
      const apply=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-sheet-rule-dialog .vno-rule-apply');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
      if(!apply)status="NO_SORT_APPLY"; else {await mouseClick(session.cdp,apply.x,apply.y);const shot=await session.cdp.send("Page.captureScreenshot",{format:"png"},60000);const evidenceDir=path.join(root,"docs","tickets-0710","evidence");await mkdir(evidenceDir,{recursive:true});await writeFile(path.join(evidenceDir,"fix-s9-multi-sort.png"),Buffer.from((shot.result||shot).data,"base64"));status="sorted by name ascending then amount descending";}
    } else if (kind === "findReplacePack") {
      const clickSelector = async selector => {const point=JSON.parse(await ev(`(() => {const n=document.querySelector(${JSON.stringify(selector)});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));if(!point)throw new Error("Missing UI control: "+selector);await mouseClick(session.cdp,point.x,point.y);};
      await clickSelector(".vno-sheet-add-btn"); await session.cdp.waitFor("document.querySelectorAll('.vno-sheet-tab-item').length >= 2",{timeoutMilliseconds:10000});
      await typeText(session.cdp,"Ghi ch\u00fa C"); await press(session.cdp,"Enter"); await press(session.cdp,"h",{ctrl:true}); await sleep(250);
      await clickSelector("#vno-fr-tab-replace");
      for(const [selector,textValue] of [["#vno-fr-find-input","ghi ch\u00fa C"],["#vno-fr-replace-input","\u0110\u00e3 thay"]]){await clickSelector(selector);await press(session.cdp,"a",{ctrl:true});await insertText(session.cdp,textValue);}
      const entered=await ev("JSON.stringify({find:document.querySelector('#vno-fr-find-input')?.value,replace:document.querySelector('#vno-fr-replace-input')?.value})");
      await clickSelector("#vno-fr-opt-scope"); await press(session.cdp,"ArrowDown"); await press(session.cdp,"Enter");
      const findInput=JSON.parse(await ev("(() => {const n=document.querySelector('#vno-fr-find-input');const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()"));
      await mouseClick(session.cdp,findInput.x,findInput.y); await press(session.cdp,"Home"); await press(session.cdp,"End",{shift:true}); await press(session.cdp,"Backspace"); await insertText(session.cdp,"Ghi chú A");
      await clickSelector("#vno-fr-opt-cell"); await clickSelector("#vno-fr-replace-all-btn"); const exactCell=await ev("document.querySelector('#vno-fr-status')?.textContent||''");
      await mouseClick(session.cdp,findInput.x,findInput.y); await press(session.cdp,"Home"); await press(session.cdp,"End",{shift:true}); await press(session.cdp,"Backspace"); await insertText(session.cdp,"ghi chú C");
      await clickSelector("#vno-fr-opt-case");
      await clickSelector("#vno-fr-replace-all-btn"); const caseSensitive=await ev("document.querySelector('#vno-fr-status')?.textContent||''");
      await clickSelector("#vno-fr-opt-case"); await clickSelector("#vno-fr-replace-all-btn"); const insensitive=await ev("document.querySelector('#vno-fr-status')?.textContent||''");
      const shot=await session.cdp.send("Page.captureScreenshot",{format:"png"},60000); const evidenceDir=path.join(root,"docs","tickets-0710","evidence"); await mkdir(evidenceDir,{recursive:true}); await writeFile(path.join(evidenceDir,"fix-s9-find-replace.png"),Buffer.from((shot.result||shot).data,"base64"));
      status="entered="+entered+"; exact-cell="+exactCell+"; case-sensitive="+caseSensitive+"; case-insensitive="+insensitive;
    } else if (kind === "pasteSpecialPack") {
      const clickCell=async coord=>{const point=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="${coord}"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));if(!point)throw new Error("Missing cell "+coord);await mouseClick(session.cdp,point.x,point.y);};
      const clickSelector=async selector=>{const point=JSON.parse(await ev(`(() => {const n=document.querySelector(${JSON.stringify(selector)});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));if(!point)throw new Error("Missing UI control "+selector);await mouseClick(session.cdp,point.x,point.y);};
      await clickCell("C2"); await press(session.cdp,"c",{ctrl:true}); await clickCell("I2"); await press(session.cdp,"v",{ctrl:true,alt:true}); await sleep(200); await clickSelector('.vno-paste-special-dialog input[value="values"]'); await clickSelector(".vno-sheet-rule-dialog .vno-rule-apply");
      await clickCell("B1"); await press(session.cdp,"b",{ctrl:true}); await press(session.cdp,"c",{ctrl:true}); await clickCell("I3"); await press(session.cdp,"v",{ctrl:true,alt:true}); await sleep(200); await clickSelector('.vno-paste-special-dialog input[value="formats"]'); await clickSelector(".vno-sheet-rule-dialog .vno-rule-apply");
      await clickCell("F2"); await press(session.cdp,"c",{ctrl:true}); await clickCell("F3");
      const dest=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="F3"]');const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
      await mouseRightClick(session.cdp,dest.x,dest.y);
      const parent=JSON.parse(await ev(`(() => {const n=document.querySelectorAll(".vno-context-menu-item")[3];if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
      if(!parent)throw new Error("Missing Paste Special context submenu"); await mouseMove(session.cdp,parent.x,parent.y); await sleep(250);
      const formula=JSON.parse(await ev(`(() => {const n=document.querySelectorAll(".vno-context-submenu .vno-context-menu-item")[1];if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
      if(!formula)throw new Error("Missing Paste Formulas Only context action"); await mouseClick(session.cdp,formula.x,formula.y);
      const shot=await session.cdp.send("Page.captureScreenshot",{format:"png"},60000); const evidenceDir=path.join(root,"docs","tickets-0710","evidence"); await mkdir(evidenceDir,{recursive:true}); await writeFile(path.join(evidenceDir,"fix-s9-paste-special.png"),Buffer.from((shot.result||shot).data,"base64"));
      status="pasted values, formats, and relative formulas through UI";
    } else if (kind === "type") {
      await typeText(session.cdp, value); await press(session.cdp, "Enter"); status = "typed formula";
    } else if (kind === "formulaPack") {
      const formulas = [
        '=SUMIF(A2:A6,">2",C2:C6)', '=SUMIFS(C2:C6,A2:A6,">2")', '=COUNTIF(B2:B6,"*V\u0103n*")',
        '=COUNTIFS(A2:A6,">2",C2:C6,">0")', '=IFERROR(1/0,"L\u1ed7i")', '=ROUND(C2,1)', '=LEFT(B2,3)',
        '=MID(B2,2,4)', '=RIGHT(B2,3)', '=TEXT(C2,"#,##0.00")', '=TEXT(DATE(2020,1,2),"dd/mm/yyyy")',
        '=NA()', '=HLOOKUP("S\u1ed1 ti\u1ec1n",A1:E6,2,FALSE)', '=MATCH("L\u00ea V\u0103n C",B2:B6,0)', '=OFFSET(C2,1,0)',
        '=INDIRECT("C2")', '=SUMPRODUCT(C2:C6,D2:D6)', '=DATE(2024,2,29)', '=YEAR(DATE(2024,2,29))',
        '=MONTH(DATE(2024,2,29))', '=DAY(DATE(2024,2,29))', '=EDATE(DATE(2024,1,31),1)',
        '=EOMONTH(DATE(2024,2,1),0)', '=WEEKDAY(DATE(2024,2,29),2)', '=NETWORKDAYS(DATE(2024,2,26),DATE(2024,3,1))',
        '=WORKDAY(DATE(2024,2,28),2)', '=DAYS(DATE(2024,3,1),DATE(2024,2,28))', '=TODAY()', '=NOW()'
      ];
      for (const formula of formulas) { await typeText(session.cdp, formula); await press(session.cdp, "Enter"); }
      status = `typed ${formulas.length} formulas by CDP`;
    } else if (kind === "shortcutDown" || kind === "shortcutRight") {
      if (kind === "shortcutDown") await press(session.cdp, "d", { ctrl: true }); else await press(session.cdp, "r", { ctrl: true });
      status = kind === "shortcutDown" ? "pressed Ctrl+D" : "pressed Ctrl+R";
    } else if (kind === "orientation") {
      await press(session.cdp,"1",{ctrl:true}); await sleep(250);
      const pos=selector=>ev(`(() => {const n=document.querySelector(${JSON.stringify(selector)});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`);
      const align=JSON.parse(await pos("#vno-fc-tab-alignment"));
      if(!align) status="NO_ALIGNMENT_TAB";
      else {await mouseClick(session.cdp,align.x,align.y);await sleep(150);const angle=JSON.parse(await pos('.vno-fc-orient-btn[data-angle="90"]'));if(!angle)status="NO_90_DEGREE_OPTION";else{await mouseClick(session.cdp,angle.x,angle.y);const shot=await session.cdp.send("Page.captureScreenshot",{format:"png"},60000);const evidenceDir=path.join(root,"docs","tickets-0710","evidence");await mkdir(evidenceDir,{recursive:true});await writeFile(path.join(evidenceDir,"fix-s8-text-rotation.png"),Buffer.from((shot.result||shot).data,"base64"));const apply=JSON.parse(await pos(".vno-fc-ok-btn"));if(!apply)status="NO_FORMAT_CELLS_APPLY";else{await mouseClick(session.cdp,apply.x,apply.y);status="set Orientation=90 through Format Cells";}}}
    } else if (kind === "click" || kind === "merge" || kind === "range" || kind === "conditional" || kind === "tableStyle" || kind === "cellStyle" || kind === "promptNumber" || kind === "nameManager" || kind === "validation" || kind === "chart" || kind === "chartVariant" || kind === "pageSetup" || kind === "removeDuplicates") {
      const tabId = id.startsWith("sheet.view.") ? "view" : id.startsWith("sheet.page.") ? "pageLayout" : id.startsWith("sheet.data.") ? "data" : id.startsWith("sheet.formula.") ? "formulas" : id.startsWith("sheet.chart.") ? "insert" : "home";
      const tabPos = JSON.parse(await ev(`(() => { const n=document.querySelector('#vno-ribbon-tab-${tabId}'); if(!n)return 'null'; const r=n.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,active:n.classList.contains('is-active')}) })()`));
      if (tabPos && !tabPos.active) { await mouseClick(session.cdp, tabPos.x, tabPos.y); await sleep(250); }
      const button = JSON.parse(await ev(`(() => { const nodes=[...document.querySelectorAll('[data-command-id="${id}"]')]; const visible=n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'}; const v=nodes.find(visible); if(v){const r=v.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})} const group=nodes[0]?.closest('.vno-ribbon-group.vno-group-collapsed'); const btn=group?.querySelector('.vno-ribbon-group-collapsed-btn'); if(btn&&visible(btn)){const r=btn.getBoundingClientRect();return JSON.stringify({collapsed:{x:r.left+r.width/2,y:r.top+r.height/2}})} const dropdownId=${JSON.stringify(id.startsWith("sheet.row.")||id.startsWith("sheet.col.")?"sheet.cells.format":id.startsWith("sheet.view.freeze")?"sheet.view.freezePanesMenu":"")}; const dd=dropdownId&&document.querySelector('[data-dropdown-id="'+dropdownId+'"]'); if(dd&&visible(dd)){const r=dd.getBoundingClientRect();return JSON.stringify({dropdown:{x:r.left+r.width/2,y:r.top+r.height/2}})} return 'null' })()`));
      if (!button) status = "NO_BUTTON";
      else if (button.collapsed) {
        await mouseClick(session.cdp, button.collapsed.x, button.collapsed.y); await sleep(250);
        const item = JSON.parse(await ev(`(() => { const n=document.querySelector('.vno-ribbon-group-popover [data-command-id="${id}"]'); if(!n) return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}) })()`));
        if (!item) status = "NO_BUTTON_IN_POPOVER";
        else { await mouseClick(session.cdp, item.x, item.y); status = "clicked"; }
      } else if (button.dropdown) {
        await mouseClick(session.cdp,button.dropdown.x,button.dropdown.y); await sleep(200);
        const item=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-ribbon-dropdown-menu [data-command-id="${id}"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if(!item) status="NO_DROPDOWN_ITEM"; else {await mouseClick(session.cdp,item.x,item.y); status="clicked";}
      } else { await mouseClick(session.cdp, button.x, button.y); status = "clicked"; }
      if (kind === "click" && id === "sheet.col.insert" && status === "clicked") {
        const shot=await session.cdp.send("Page.captureScreenshot",{format:"png"},60000);
        const evidenceDir=path.join(root,"docs","tickets-0710","evidence"); await mkdir(evidenceDir,{recursive:true});
        await writeFile(path.join(evidenceDir,"fix-s8-insert-column.png"),Buffer.from((shot.result||shot).data,"base64"));
      }
      if (kind === "promptNumber" && status === "clicked") {
        await sleep(150);
        const prompt = JSON.parse(await ev(`(() => { const input=document.querySelector('.vno-dialog-input'); const btn=document.querySelector('.vno-dialog-ok-btn'); if(!input||!btn) return 'null'; const ir=input.getBoundingClientRect(), br=btn.getBoundingClientRect(); return JSON.stringify({ix:ir.left+ir.width/2,iy:ir.top+ir.height/2,bx:br.left+br.width/2,by:br.top+br.height/2}) })()`));
        if (!prompt) status = "NO_PROMPT";
        else { await mouseClick(session.cdp,prompt.ix,prompt.iy); await press(session.cdp,"End"); for(let i=0;i<12;i++) await press(session.cdp,"Backspace"); await typeText(session.cdp,value); await mouseClick(session.cdp,prompt.bx,prompt.by); status = "applied " + value; }
      }
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
      if (kind === "nameManager" && status === "clicked") {
        await sleep(200);
        const pos=selector=>ev(`(() => {const n=document.querySelector(${JSON.stringify(selector)});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`);
        const add=JSON.parse(await pos("#vno-name-new"));
        if(!add) status="NO_NAME_NEW_BUTTON";
        else {
          await mouseClick(session.cdp,add.x,add.y); await sleep(100);
          for (const [selector,text] of [["#vno-name-value",value],["#vno-name-ref","B2"]]) {
            const input=JSON.parse(await pos(selector));
            if(!input) throw new Error("Name Manager input missing: "+selector);
            await mouseClick(session.cdp,input.x,input.y); await press(session.cdp,"a",{ctrl:true}); await typeText(session.cdp,text);
          }
          const before=JSON.parse(await ev(`JSON.stringify({names:window.__vnoAppInstance.grid.namedRangesWorkbook,serialized:window.__vnoAppInstance.adapter.serializeToFods().includes('table:named-range')})`));
          const save=JSON.parse(await pos(".vno-dialog-footer .vno-rule-apply"));
          if(!save) status="NO_NAME_SAVE_BUTTON";
          else {
            const shot=await session.cdp.send("Page.captureScreenshot",{format:"png"},60000);
            const evidenceDir=path.join(root,"docs","tickets-0710","evidence"); await mkdir(evidenceDir,{recursive:true});
            await writeFile(path.join(evidenceDir,"fix-s8-name-manager.png"),Buffer.from((shot.result||shot).data,"base64"));
            await mouseClick(session.cdp,save.x,save.y); await sleep(200);
            const after=JSON.parse(await ev(`JSON.stringify({names:window.__vnoAppInstance.grid.namedRangesWorkbook,serialized:window.__vnoAppInstance.adapter.serializeToFods().includes('table:named-range'),error:document.querySelector('.vno-sheet-rule-dialog .vno-rule-error')?.textContent,formHidden:document.querySelector('.vno-name-form')?.hidden})`));
            status="before="+JSON.stringify(before)+" after="+JSON.stringify(after);
          }
        }
      }
      if (kind === "validation" && status === "clicked") {
        await sleep(200);
        const pos=selector=>ev(`(() => {const n=document.querySelector(${JSON.stringify(selector)});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`);
        const input=JSON.parse(await pos("#vno-dv-list"));
        if(!input) status="NO_VALIDATION_FORM";
        else {await mouseClick(session.cdp,input.x,input.y); await typeText(session.cdp,value); const apply=JSON.parse(await pos(".vno-rule-apply")); if(!apply)status="NO_VALIDATION_APPLY"; else {await mouseClick(session.cdp,apply.x,apply.y);status="applied list validation";} }
      }
      if ((kind === "chart" || kind === "chartVariant") && status === "clicked") {
        await sleep(500);
        if (kind === "chartVariant") {
          const typeButton = JSON.parse(await ev(`(() => {const n=document.querySelector('[data-chart-type="${value}"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
          if (!typeButton) throw new Error("Missing chart type option " + value);
          await mouseClick(session.cdp, typeButton.x, typeButton.y);
        }
        const chartShot=await session.cdp.send("Page.captureScreenshot",{format:"png"},60000);
        const chartEvidence=path.join(root,"docs","tickets-0710","evidence"); await mkdir(chartEvidence,{recursive:true});
        await writeFile(path.join(chartEvidence,`fix-s9-${name}.png`),Buffer.from((chartShot.result||chartShot).data,"base64"));
        const apply=JSON.parse(await ev(`(() => {const n=document.querySelector('[data-chart-apply]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if(!apply)status="NO_CHART_DIALOG"; else {await mouseClick(session.cdp,apply.x,apply.y);status=kind==="chartVariant"?`inserted ${value} chart through UI`:"inserted default chart";}
      }
      if (kind === "pageSetup" && status === "clicked") {
        await sleep(250);
        const pos=selector=>ev(`(() => {const n=document.querySelector(${JSON.stringify(selector)});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`);
        const select=JSON.parse(await ev(`(() => {const n=document.querySelector('#vno-sheet-orientation');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if(!select)status="NO_PAGE_SETUP_DIALOG"; else {await mouseClick(session.cdp,select.x,select.y);await press(session.cdp,"ArrowDown");for(const side of ["top","bottom","left","right"]){const input=JSON.parse(await pos(`#vno-sheet-margin-${side}`));if(input){await mouseTripleClick(session.cdp,input.x,input.y);await press(session.cdp,"Home");await press(session.cdp,"End",{shift:true});await press(session.cdp,"Backspace");await typeText(session.cdp,"1.27");}}const shot=await session.cdp.send("Page.captureScreenshot",{format:"png"},60000);const evidenceDir=path.join(root,"docs","tickets-0710","evidence");await mkdir(evidenceDir,{recursive:true});await writeFile(path.join(evidenceDir,"fix-s8-page-setup.png"),Buffer.from((shot.result||shot).data,"base64"));const apply=JSON.parse(await pos(".vno-sheet-rule-dialog .vno-rule-apply"));if(!apply)status="NO_PAGE_SETUP_APPLY";else{await mouseClick(session.cdp,apply.x,apply.y);status="set landscape margins=1.27cm";}}
      }
      if (kind === "removeDuplicates" && status === "clicked") {
        await sleep(200);
        const apply=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-sheet-rule-dialog .vno-rule-apply');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if(!apply)status="NO_DUPLICATE_DIALOG"; else {await mouseClick(session.cdp,apply.x,apply.y);status="removed duplicate ID";}
      }
    } else {
      const homeTab = JSON.parse(await ev(`(() => { const n=document.querySelector('#vno-ribbon-tab-home'); if(!n) return 'null'; const r=n.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,active:n.classList.contains('is-active')}); })()`));
      if (homeTab && !homeTab.active) { await mouseClick(session.cdp, homeTab.x, homeTab.y); await sleep(250); }
      let choice = JSON.parse(await ev(`(() => { const s=document.querySelector('select[data-command-id="${id}"]'); if(!s) return 'null'; const r=s.getBoundingClientRect(),g=s.closest('.vno-ribbon-group.vno-group-collapsed'),b=g?.querySelector('.vno-ribbon-group-collapsed-btn'),br=b?.getBoundingClientRect(); const options=[...s.options]; const index=options.findIndex(o=>o.value===${JSON.stringify(value)}); const first=options[index]?.textContent.trim().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')[0]?.toLowerCase(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,index,count:options.length,first,initial:s.value,collapsed:!!(br?.width&&br?.height),cx:br?.left+br?.width/2,cy:br?.top+br?.height/2,visible:!!(r.width&&r.height)}); })()`));
      if (!choice) status = "NO_SELECT";
      else if (choice.index < 0) status = "VALUE_NOT_AVAILABLE";
      else {
        if (choice.collapsed) {
          await mouseClick(session.cdp, choice.cx, choice.cy); await sleep(200);
          choice = JSON.parse(await ev(`(() => { const s=document.querySelector('.vno-ribbon-group-popover select[data-command-id="${id}"]'); if(!s) return 'null'; const r=s.getBoundingClientRect(),options=[...s.options],index=options.findIndex(o=>o.value===${JSON.stringify(value)}),first=options[index]?.textContent.trim().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')[0]?.toLowerCase(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,index,count:options.length,first,initial:s.value,visible:!!(r.width&&r.height)}); })()`));
        }
        if (!choice || !choice.visible) { status = "SELECT_NOT_VISIBLE"; }
        else {
        await mouseClick(session.cdp, choice.x, choice.y);
        await press(session.cdp, choice.first);
        const selectedValue = await ev(`(() => { const s=document.querySelector('select[data-command-id="${id}"]'); return s ? s.value : 'SELECT_UNMOUNTED'; })()`);
        await press(session.cdp, "Enter");
        status = `keyboard selection submitted (${selectedValue}; wanted ${value}; key=${choice.first}; initial=${choice.initial}; collapsed=${!!choice.collapsed})`;
        }
      }
    }
    await sleep(600);
    const info = await ev(`(() => { const app=window.__vnoAppInstance,it=app.grid.cellsData.get("${cell}")||{},g=app.grid,a=app.adapter; const fods=a.serializeToFods(); return JSON.stringify({value:it.val, formula:it.formula, calculatedValue:it.calculatedValue, style:it.style, quickCategory:document.querySelector('select[data-command-id="sheet.format.quickCategory"]')?.value, rowHeight:g.getRowHeight?.(3), columnWidth:g.getColumnWidth?.('B'), names:g.namedRangesWorkbook, adapterNames:a.grid?.namedRangesWorkbook, serializedName:fods.includes('table:named-range'), fw:it.style&&it.style.fontWeight, fmt:it.style&&it.style.numberFormat&&it.style.numberFormat.category, textRotation:it.style&&it.style.textRotation}); })()`);
    const formulaValues = kind === "formulaPack" ? await ev(`JSON.stringify(Array.from({length:29},(_,i)=>{const k='H'+(i+2),v=window.__vnoAppInstance.grid.cellsData.get(k)||{};return [k,v.formula,v.val]}))`) : null;
    if (kind === "formulaPack") {
      const shot=await session.cdp.send("Page.captureScreenshot",{format:"png"},60000);
      const evidenceDir=path.join(root,"docs","tickets-0710","evidence"); await mkdir(evidenceDir,{recursive:true});
      await writeFile(path.join(evidenceDir,"fix-s9-formulas.png"),Buffer.from((shot.result||shot).data,"base64"));
    }
    await ev("window.__vnoAppInstance.adapter.isDirty = true");
    const saved = await ev(`(() => { window.__vnoAuditContent = window.__vnoAppInstance.adapter.serializeToFods(); return globalThis.globalUnoBridge.saveRealFileInPlace("sheet", window.__vnoAuditContent, ${JSON.stringify(out)}, ${JSON.stringify(template)}); })()`);
    if (process.env.VNO_AUDIT_CAPTURE_DIR) {
      const captureDir = process.env.VNO_AUDIT_CAPTURE_DIR;
      await mkdir(captureDir, { recursive: true });
      const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, 60000);
      await writeFile(path.join(captureDir, `fix-s12-${name}.png`), Buffer.from((shot.result || shot).data, "base64"));
    }
    console.log(name.padEnd(18), "save=" + (saved && saved.status), "|", status, "|", info, formulaValues ? "| formulas=" + formulaValues : "");
  } catch (e) { console.log(name.padEnd(18), "LOI:", String(e.message).slice(0, 120)); } finally { await session.close(); }
}
