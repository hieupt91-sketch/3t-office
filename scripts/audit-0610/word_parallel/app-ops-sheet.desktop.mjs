import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { mouseClick, mouseDrag, mouseMove, mouseRightClick, mouseTripleClick, press, typeText, insertText } from "../../../tests/live/cdp/actions.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const renderedNode = "n=>{for(let e=n;e&&e!==document.documentElement;e=e.parentElement){const r=e.getBoundingClientRect(),s=getComputedStyle(e);if(e.hidden||e.getAttribute('aria-hidden')==='true'||r.width<=0||r.height<=0||s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)return false}return true}";
const root = process.env.VNO_APP_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const dir = process.env.VNO_CDP_LOCALAPPDATA;
if (!dir) throw new Error("Set VNO_CDP_LOCALAPPDATA to a dedicated audit profile.");
const template = process.env.VNO_AUDIT_TEMPLATE || path.join(root, "tests/live/cdp/test_sheet_home.xlsx");
await mkdir(dir, { recursive: true });
// [ten, o, loai, id, gia tri]
const ops = [
  ["bold","B2","click","sheet.cell.bold"],["italic","B2","click","sheet.cell.italic"],["underline","B2","click","sheet.cell.underline"],["fontGrow","B2","click","sheet.font.grow"],["fontShrink","B2","click","sheet.font.shrink"],
  ["alignTop","B2","click","sheet.cell.alignTop"],["alignMiddle","B2","click","sheet.cell.alignMiddle"],["alignBottom","B2","click","sheet.cell.alignBottom"],
  ["size16","B2","selectDom","sheet.font.size","16"],["fontArial","B2","selectDom","sheet.font.family","Arial"],
  ["fillDefault","B2","click","sheet.cell.fillColor"],["textColorDefault","B2","click","sheet.cell.textColor"],
  ["alignLeft","B2","click","sheet.cell.alignLeft"],["alignCenter","B2","click","sheet.cell.alignCenter"],["alignRight","B2","click","sheet.cell.alignRight"],["wrap","B2","click","sheet.cell.wrapText"],
  ["currencyBtn","C2","click","sheet.format.currencyVND"],["numNumber","C2","selectDom","sheet.format.quickCategory","number"],["numCurrency","C2","selectDom","sheet.format.quickCategory","currency"],["numAccounting","C2","selectDom","sheet.format.quickCategory","accounting"],
  ["s16CalculationManual","C2","selectDom","sheet.calc.calculationOptions","manual"],
  ["s16CellsDialog","B2","formatCells","sheet.format.cellsDialog"],["s16ProtectSheet","B2","protect","sheet.sheet.protect"],["s16ProtectWorkbook","B2","protect","sheet.workbook.protect"],["s16TextBox","A1","textBox","sheet.insert.textbox"],
  ["s16Copy","I2","clipboard","common.edit.copy","B2"],["s16Cut","I2","clipboard","common.edit.cut","C2"],["s16Paste","I2","clipboard","common.edit.paste","S16 clipboard test"],["s16FormatPainter","C2","formatPainter","sheet.edit.formatPainter"],["s16CommentResolve","C2","click","sheet.review.commentResolve"],
  ["s16CategoryFinancial","H2","formulaCategory","sheet.formula.categoryFinancial",'=PMT(0.1/12,12,1000)'],["s16CategoryLogical","H2","formulaCategory","sheet.formula.categoryLogical",'=IF(1=1,"Đúng","Sai")'],["s16CategoryText","H2","formulaCategory","sheet.formula.categoryText",'=CONCAT("VN"," Office")'],["s16CategoryDateTime","H2","formulaCategory","sheet.formula.categoryDateTime",'=DATE(2026,10,12)'],["s16CategoryLookup","H2","formulaCategory","sheet.formula.categoryLookup",'=VLOOKUP(1,A2:B6,2,FALSE)'],["s16CategoryMath","H2","formulaCategory","sheet.formula.categoryMath",'=SUM(C2:C6)'],["s16CategoryMore","H2","formulaCategory","sheet.formula.categoryMore",'=AVERAGE(C2:C6)'],
  ["s16EvaluateFormula","H2","click","sheet.formula.evaluateFormula"],["s16WatchWindow","H2","click","sheet.formula.watchWindow"],["s16SpellCheck","B2","click","sheet.review.spellCheck"],["s16ToggleSpellCheck","B2","click","sheet.review.toggleSpellCheck"],["s16ViewNormal","A1","click","sheet.view.normal"],["s16ZoomReset","A1","click","sheet.view.zoomReset"],["s16ZoomToSelection","A1","range","sheet.view.zoomToSelection","A1:G6"],
  ["s16TracePrecedents","H2","trace","sheet.formula.tracePrecedents","precedents"],["s16TraceDependents","H2","trace","sheet.formula.traceDependents","dependents"],["s16TraceRemoveArrows","H2","trace","sheet.formula.removeArrows","remove"],
  ["s16PrintPreview","A1","printPreview","sheet.file.printPreview"],["s16NewWindow","A1","click","sheet.view.newWindow"],
  ["s16MacroRecord","A1","macroToggle","common.macro.recordToggle"],["s16MacroManager","A1","click","common.macro.manager"],
  ["s16HelpF1","A1","helpKey","sheet.help.open"],["s16About","A1","click","common.help.about"],
  ["s16AiToggle","A1","click","ai.assistant.toggle"],["s16AiActionsEvidence","A1","ribbonEvidence","ai.assistant.summarize"],
  ["numPercent","D2","select","sheet.format.quickCategory","percentage"],["numDate","E2","select","sheet.format.quickCategory","date"],
  ["decInc","C2","click","sheet.format.increaseDecimal"],["decDec","C2","click","sheet.format.decreaseDecimal"],["standard","C2","click","sheet.format.standard"],["percentBtn","D2","click","sheet.format.percent"],["bordersDefault","B2","click","sheet.cell.borders"],
  ["indentIncrease","B2","click","sheet.cell.indentIncrease"],["indentDecrease","B2","click","sheet.cell.indentDecrease"],["mergeCenter","A8","merge","sheet.cell.mergeCenter","A8:B8"],["mergeAcross","A8","merge","sheet.cell.mergeAcross","A8:B8"],["mergeCells","A8","merge","sheet.cell.mergeCells","A8:B8"],["unmerge","A8","click","sheet.cell.unmerge"],
  ["autoSum","C7","click","sheet.formula.sum"],["averageBtn","C7","click","sheet.formula.average"],["countNumbersBtn","C7","click","sheet.formula.countNumbers"],["maxBtn","C7","click","sheet.formula.max"],["minBtn","C7","click","sheet.formula.min"],["fillDown","B2","shortcutDown","Ctrl+D","B2:B3"],
  ["insertRow","A3","click","sheet.row.insert"],["deleteRow","A3","click","sheet.row.delete"],
  ["insertCol","B2","click","sheet.col.insert"],["deleteCol","B2","click","sheet.col.delete"],
  ["rowHeight","A3","promptNumber","sheet.row.height","36"],["colWidth","B2","promptNumber","sheet.col.width","120"],
  ["hideRow","A3","click","sheet.row.hide"],["hideCol","B2","click","sheet.col.hide"],
  ["unhideRow","A2","click","sheet.row.unhide"],["unhideCol","C2","click","sheet.col.unhide"],
  ["zoomIn","A1","click","sheet.view.zoomIn"],
  ["zoomReset","A1","click","sheet.view.zoomReset"],
  ["zoomOut","A1","click","sheet.view.zoomOut"],
  ["freezePanes","B2","click","sheet.view.freezePanes"],["showFormulas","A1","click","sheet.formula.showFormulas"],["formulaBar","A1","click","sheet.view.formulaBar"],["normalView","A1","click","sheet.view.normal"],["pageBreakPreview","A1","click","sheet.view.pageBreakPreview"],["pageLayoutView","A1","click","sheet.view.pageLayout"],["gridlines","A1","click","sheet.view.gridlines"],["headings","A1","click","sheet.view.headings"],["printArea","A1","click","sheet.page.setPrintArea"],["clearArea","A1","click","sheet.page.clearPrintArea"],
  ["pageSetup","A1","pageSetup","sheet.page.margins","landscape"],
  ["pageSize","A1","pageSize","sheet.page.size","Legal"],
  ["pageScale","A1","pageScale","sheet.page.scale","80"],
  ["printTitles","A1","pageTitles","sheet.page.printTitles","1:1"],
  ["headerFooter","A1","headerFooter","sheet.page.headerFooter","VN Office S12"],
  ["insertPageBreak","C5","pageBreak","sheet.page.insertPageBreak"],
  ["removePageBreak","C5","pageBreak","sheet.page.removePageBreak"],
  ["hyperlink","G2","hyperlink","sheet.insert.hyperlink"],
  ["commentInsert","C2","commentInsert","sheet.review.commentInsert"],
  ["commentDelete","C2","click","sheet.review.commentDelete"],
  ["commentSecond","D2","commentInsert","sheet.review.commentInsert"],
  ["commentPrevious","D2","click","sheet.review.commentPrevious"],
  ["commentNext","C2","click","sheet.review.commentNext"],
  ["defineName","B2","defineName","sheet.formula.defineName"],
  ["insertFunction","H2","click","sheet.formula.insertFunction"],
  ["createNames","A1","range","sheet.formula.createFromSelection","A1:C6"],
  ["useInFormula","H2","click","sheet.formula.useInFormula"],
  ["formulaRecalculate","H2","click","sheet.formula.recalculate"],
  ["calculateSheet","H2","click","sheet.calc.calculateSheet"],
  ["errorChecking","H2","click","sheet.formula.errorChecking"],
  ["formulaError","H2","type",null,"=1/0"],
  ["image","B2","image","sheet.insert.image"],
  ["rotation90","B2","orientation","sheet.cell.orientation","90"],
  ["widthControl","B2","widthControl",null,null],
  ["definedName","B2","nameManager","sheet.formula.nameManager","SampleNames"],
  ["validation","C2","validation","sheet.data.validation","Open,Closed"],
  ["chart","A1","chart","sheet.chart.insert","A1:C6"],
  ["chartBar","A1","chartVariant","sheet.chart.insert","bar"],
  ["chartLine","A1","chartVariant","sheet.chart.insert","line"],
  ["chartPie","A1","chartVariant","sheet.chart.insert","pie"],
  ["chartArea","A1","chartVariant","sheet.chart.insert","area"],
  ["pivotChart","A1","click","sheet.chart.pivotChart"],
  ["sparklineLine","C2","range","sheet.insert.sparklineLine","C2:C6"],["sparklineColumn","C2","range","sheet.insert.sparklineColumn","C2:C6"],
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
  ["conditionalManager","C2","conditionalManager","sheet.format.conditional","C2:C6"],
  ["formatAsTable","A1","tableStyle","sheet.style.formatAsTable","A1:G6"],["cellGood","B2","cellStyle","sheet.style.cellStyles","good"],
  ["flashFill","K2","flashFill","sheet.data.flashFill"],
  ["pivotTable","A1","pivotTable","sheet.data.pivotTable","A1:C6"],
  ["pivotRefresh","A1","pivotRefresh","sheet.data.pivotRefresh"],
  ["subtotal","A1","subtotal","sheet.data.subtotal","A1:C6"],
  ["consolidate","M1","consolidate","sheet.data.consolidate"],
  ["groupRows","A2","groupRows","sheet.data.group","A2:A6"],
  ["ungroupRows","A2","groupRows","sheet.data.ungroup","A2:A6"],
  ["textToColumns","B2","textToColumns","sheet.data.textToColumns"],
  ["sortAsc","B2","click","sheet.data.sortAsc"],["sortDesc","B2","click","sheet.data.sortDesc"],["filter","B1","click","sheet.data.filter"],
];
const only = (process.env.OPS || "").split(",").filter(Boolean);
for (const [name, cell, kind, id, value] of ops) {
  if (only.length && !only.includes(name)) continue;
  const out = dir + "\\app_" + (process.env.VNO_AUDIT_SUFFIX || "") + name + ".xlsx";
  const session = await launchApp("sheet", { root, localAppData: dir, filePath: template, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 300000 });
  let restoreSystemClipboard = false;
  let clipboardRestoration = "not-needed";
  try {
    const norm = template.replace(/\\/g, "/").toLowerCase();
    await session.cdp.waitFor(`(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase(); return p === ${JSON.stringify(norm)} && window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view'); })()`, { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
    await sleep(1500);
    if (kind === "clipboard") {
      const backup = JSON.parse(await ev(`(async()=>{const bridge=globalThis.globalUnoBridge;if(!bridge?.readClipboardData)return 'null';const value=await bridge.readClipboardData();window.__s16ClipboardBackup=value;return JSON.stringify({status:value?.status,textLength:value?.text?.length||0,htmlLength:value?.html?.length||0})})()`));
      if (!backup || backup === "null" || backup.status !== "ok") throw new Error("Could not snapshot local clipboard through app bridge");
      restoreSystemClipboard = true;
      const testWrite = await ev(`globalThis.globalUnoBridge.writeClipboardData({text:"S16 clipboard test",html:""})`);
      if (!testWrite || (testWrite.status && testWrite.status !== "ok")) throw new Error("Could not set S16 test clipboard through app bridge");
    }
    const pos = JSON.parse(await ev(`(() => { const e=document.querySelector('.vno-grid-cell[data-coord="${cell}"]'); if(!e) return 'null'; e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`));
    if (!pos) { console.log(name.padEnd(18), "khong thay o", cell); continue; }
    if (kind === "subtotal") {
      const p=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="B3"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
      if(!p)throw new Error("Missing subtotal duplicate probe cell B3");await mouseClick(session.cdp,p.x,p.y);await typeText(session.cdp,"Nguyễn Văn A");await press(session.cdp,"Enter");
    }
    if (kind === "removeDuplicates") {
      const duplicate=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="A6"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
      if(!duplicate)throw new Error("Could not locate audit duplicate cell A6");
      await mouseClick(session.cdp,duplicate.x,duplicate.y); await typeText(session.cdp,"1"); await press(session.cdp,"Enter");
    }
    if (kind === "merge" || kind === "range" || kind === "customSort" || kind === "shortcutDown" || kind === "shortcutRight" || kind === "conditional" || kind === "conditionalManager" || kind === "tableStyle" || kind === "chart" || kind === "chartVariant" || kind === "pivotTable" || kind === "subtotal" || kind === "removeDuplicates") {
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
    } else if (kind === "formatCells") {
      const launcher = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-ribbon-dialog-launcher[data-command="${id}"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
      if (launcher) await mouseClick(session.cdp, launcher.x, launcher.y); else { await mouseClick(session.cdp, pos.x, pos.y); await press(session.cdp, "1", { ctrl: true }); }
      await sleep(400);
      const cell = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-fc-cat-item[data-cat="currency"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
      if (!cell) status = "NO_FORMAT_CELLS_DIALOG";
      else {
        await mouseClick(session.cdp, cell.x, cell.y);
        const inputs = await ev(`(() => {const d=document.querySelector('#vno-fc-decimals'),b=document.querySelector('.vno-fc-ok-btn');if(!d||!b)return 'NO_FORMAT_CELLS_CONTROLS';d.value='2';d.dispatchEvent(new Event('input',{bubbles:true}));const r=b.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,category:document.querySelector('.vno-fc-cat-item.is-selected')?.dataset.cat,decimals:d.value})})()`);
        const apply = typeof inputs === "string" && inputs.startsWith("{") ? JSON.parse(inputs) : inputs;
        if (!apply || apply === "NO_FORMAT_CELLS_CONTROLS") status = "NO_FORMAT_CELLS_CONTROLS";
        else { await mouseClick(session.cdp, apply.x, apply.y); status = `Ctrl+1; selected currency via UI; ${JSON.stringify(apply)}`; }
      }
    } else if (kind === "protect" || kind === "textBox") {
      const tabId = kind === "textBox" ? "insert" : "review";
      const tab = JSON.parse(await ev(`(() => {const n=document.querySelector('#vno-ribbon-tab-${tabId}');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,active:n.classList.contains('is-active')})})()`));
      if (tab && !tab.active) { await mouseClick(session.cdp, tab.x, tab.y); await sleep(150); }
      const command = JSON.parse(await ev(`(() => {const n=document.querySelector('[data-command-id="${id}"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
      if (!command) status = "COMMAND_NOT_VISIBLE";
      else {
        await mouseClick(session.cdp, command.x, command.y); await sleep(250);
        if (kind === "textBox") {
          const data = await ev(`(() => {const i=document.querySelector('.vno-dialog-input'),b=document.querySelector('.vno-dialog-ok-btn');if(!i||!b)return 'NO_TEXTBOX_PROMPT';i.value='S16 text box';i.dispatchEvent(new Event('input',{bubbles:true}));const r=b.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`);
          const apply = typeof data === "string" && data.startsWith("{") ? JSON.parse(data) : data;
          if (!apply || apply === "NO_TEXTBOX_PROMPT") status = "NO_TEXTBOX_PROMPT";
          else { await mouseClick(session.cdp, apply.x, apply.y); status = "entered S16 text through prompt"; }
        } else {
          const selectors = id === "sheet.sheet.protect" ? ["#vno-protect-password", "#vno-protect-password2"] : ["#vno-protect-wb-password", "#vno-protect-wb-password2"];
          const data = await ev(`(() => {const a=document.querySelector(${JSON.stringify(selectors[0])}),b=document.querySelector(${JSON.stringify(selectors[1])}),ok=document.querySelector('.vno-rule-apply');if(!a||!b||!ok)return 'NO_PROTECT_DIALOG';a.value='s16-test';b.value='s16-test';a.dispatchEvent(new Event('input',{bubbles:true}));b.dispatchEvent(new Event('input',{bubbles:true}));const r=ok.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`);
          const apply = typeof data === "string" && data.startsWith("{") ? JSON.parse(data) : data;
          if (!apply || apply === "NO_PROTECT_DIALOG") status = "NO_PROTECT_DIALOG";
          else { await mouseClick(session.cdp, apply.x, apply.y); status = "enabled UI protection with test password s16-test"; }
        }
      }
    } else if (kind === "formulaCategory") {
      const tab = JSON.parse(await ev(`(() => {const n=document.querySelector('#vno-ribbon-tab-formulas');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,active:n.classList.contains('is-active')})})()`));
      if (tab && !tab.active) { await mouseClick(session.cdp, tab.x, tab.y); await sleep(150); }
      const command = JSON.parse(await ev(`(() => {const n=[...document.querySelectorAll('[data-command-id="${id}"]')].find(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
      if (!command) status = "COMMAND_NOT_VISIBLE";
      else {
        await mouseClick(session.cdp, command.x, command.y); await sleep(500);
        const modalReady = await ev("!!document.querySelector('.vno-func-dialog #vno-fx-insert-btn')");
        if (modalReady !== "true" && modalReady !== true) { const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, 60000); const evidenceDir = path.join(root, "docs", "tickets-0710", "evidence", "s16"); await mkdir(evidenceDir, { recursive: true }); await writeFile(path.join(evidenceDir, `${name}.png`), Buffer.from((shot.result || shot).data, "base64")); status = `NO_FUNC_DIALOG; active=${await ev("[...document.querySelectorAll('.vno-ribbon-tab.is-active')].map(n=>n.dataset.tabId).join(',')")}; visible=${await ev(`JSON.stringify([...document.querySelectorAll('[data-command-id="${id}"]')].map(n=>({tag:n.tagName,disabled:n.disabled,text:n.innerText,rect:(()=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()})))`)}`; }
        else {
        const state = await ev(`JSON.stringify({category:document.querySelector('#vno-func-cat-select')?.value,selected:document.querySelector('#vno-func-list .vno-func-item.is-selected')?.dataset.funcName,count:document.querySelectorAll('#vno-func-list .vno-func-item').length})`);
        const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, 60000);
        const evidenceDir = path.join(root, "docs", "tickets-0710", "evidence", "s16"); await mkdir(evidenceDir, { recursive: true });
        await writeFile(path.join(evidenceDir, `${name}.png`), Buffer.from((shot.result || shot).data, "base64"));
        const apply = JSON.parse(await ev(`(() => {const n=document.querySelector('#vno-fx-insert-btn');const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        await mouseClick(session.cdp, apply.x, apply.y); await sleep(150);
        await mouseClick(session.cdp, pos.x, pos.y); await typeText(session.cdp, value); await press(session.cdp, "Enter");
        status = `function dialog ${state}; entered valid ${value.split('(')[0]} formula through grid UI`;
        }
      }
    } else if (kind === "clipboard") {
      if (id === "common.edit.copy" || id === "common.edit.cut") {
        const source = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="${value}"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if (!source) throw new Error("Missing clipboard source cell " + value);
        await mouseClick(session.cdp, source.x, source.y); await press(session.cdp, id === "common.edit.copy" ? "c" : "x", { ctrl: true });
        const destination = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="I2"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if (!destination) throw new Error("Missing clipboard destination I2");
        await mouseClick(session.cdp, destination.x, destination.y); await press(session.cdp, "v", { ctrl: true });
        status = `${id.endsWith("copy") ? "copied" : "cut"} ${value} and pasted into I2 by CDP keyboard`;
      } else {
        await mouseClick(session.cdp, pos.x, pos.y); await press(session.cdp, "v", { ctrl: true }); status = "pasted the S16 test clipboard into I2 by CDP keyboard";
      }
    } else if (kind === "formatPainter") {
      const clickCommand = async commandId => {
        const point = JSON.parse(await ev(`(() => {const n=[...document.querySelectorAll('[data-command-id="${commandId}"]')].find(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if (!point) throw new Error("Visible command missing: " + commandId); await mouseClick(session.cdp, point.x, point.y);
      };
      const source = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="B2"]');const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
      await mouseClick(session.cdp, source.x, source.y); await clickCommand("sheet.cell.bold"); await clickCommand("sheet.edit.formatPainter");
      const destination = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="C2"]');const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
      await mouseClick(session.cdp, destination.x, destination.y); status = "applied Bold from B2 to C2 through the format painter UI";
    } else if (kind === "selectDom") {
      if (id === "sheet.calc.calculationOptions") {
        const tab = JSON.parse(await ev(`(() => {const n=document.querySelector('#vno-ribbon-tab-formulas');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,active:n.classList.contains('is-active')})})()`));
        if (tab && !tab.active) { await mouseClick(session.cdp, tab.x, tab.y); await sleep(150); }
      }
      const before = await ev(`(() => { const s=[...document.querySelectorAll('select[data-command-id="${id}"]')].find(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0}); return s ? JSON.stringify({value:s.value,options:[...s.options].map(o=>o.value)}) : 'null'; })()`);
      const updated = await ev(`(() => { const s=[...document.querySelectorAll('select[data-command-id="${id}"]')].find(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0}); if(!s)return JSON.stringify({error:'SELECT_NOT_VISIBLE'}); const value=${JSON.stringify(value)}; if(![...s.options].some(o=>o.value===value))return JSON.stringify({error:'VALUE_NOT_AVAILABLE',value:s.value}); s.value=value; s.dispatchEvent(new Event('change',{bubbles:true})); return JSON.stringify({value:s.value,activeElement:document.activeElement?.tagName}); })()`);
      status = `CDP DOM value + change; before=${before}; after=${updated}`;
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
    } else if (kind === "click" || kind === "trace" || kind === "printPreview" || kind === "macroToggle" || kind === "ribbonEvidence" || kind === "helpKey" || kind === "merge" || kind === "range" || kind === "flashFill" || kind === "conditional" || kind === "conditionalManager" || kind === "tableStyle" || kind === "cellStyle" || kind === "promptNumber" || kind === "nameManager" || kind === "defineName" || kind === "validation" || kind === "chart" || kind === "chartVariant" || kind === "pivotTable" || kind === "pivotRefresh" || kind === "groupRows" || kind === "subtotal" || kind === "consolidate" || kind === "pageSetup" || kind === "pageSize" || kind === "pageScale" || kind === "pageTitles" || kind === "headerFooter" || kind === "pageBreak" || kind === "hyperlink" || kind === "commentInsert" || kind === "image" || kind === "removeDuplicates" || kind === "textToColumns") {
      if (name.startsWith("s16")) {
        const tabId = id?.startsWith("sheet.formula.") || id === "sheet.calc.calculationOptions" ? "formulas"
          : id?.startsWith("sheet.review.") ? "review"
          : id?.startsWith("sheet.view.") ? "view"
          : id?.startsWith("sheet.file.") ? "view"
          : id?.startsWith("sheet.insert.") ? "insert"
          : id === "sheet.help.open" ? "help"
          : id === "common.help.about" ? "help"
          : id?.startsWith("ai.") || id?.startsWith("sheet.ai.") ? "ai"
          : id === "common.macro.recordToggle" || id === "common.macro.manager" ? "view"
          : null;
        if (tabId) {
          const tab = JSON.parse(await ev(`(() => {const n=document.querySelector('#vno-ribbon-tab-${tabId}');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,active:n.classList.contains('is-active')})})()`));
          if (tab && !tab.active) { await mouseClick(session.cdp, tab.x, tab.y); await sleep(200); }
        }
        if (id === "sheet.formula.evaluateFormula" || id === "sheet.formula.watchWindow") {
          const formulaCell = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="${cell}"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
          if (formulaCell) { await mouseClick(session.cdp, formulaCell.x, formulaCell.y); await typeText(session.cdp, "=SUM(C2:C6)"); await press(session.cdp, "Enter"); await sleep(100); const selected = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="${cell}"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`)); if (selected) await mouseClick(session.cdp, selected.x, selected.y); }
        }
        if (id === "sheet.view.normal") {
          const pre = JSON.parse(await ev(`(() => {const n=document.querySelector('[data-command-id="sheet.view.pageLayout"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
          if (pre) { await mouseClick(session.cdp, pre.x, pre.y); await sleep(120); }
        }
        if (id === "sheet.view.zoomReset") {
          const pre = JSON.parse(await ev(`(() => {const n=document.querySelector('[data-command-id="sheet.view.zoomIn"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
          if (pre) { await mouseClick(session.cdp, pre.x, pre.y); await mouseClick(session.cdp, pre.x, pre.y); await sleep(120); }
        }
        if (id === "sheet.review.commentResolve") {
          const target = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="C2"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
          if (target) await mouseClick(session.cdp, target.x, target.y);
        }
      }
      if (kind === "consolidate") await mouseClick(session.cdp,pos.x,pos.y);
      if (kind === "groupRows") {
        const a=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-row-header[data-row="2"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        const b=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-row-header[data-row="6"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if(!a||!b)throw new Error("Missing row headers 2:6");await mouseDrag(session.cdp,a.x,a.y,b.x,b.y);
      }
      if (kind === "pivotRefresh") {
        const clickTab=async name=>{const p=JSON.parse(await ev(`(() => {const n=[...document.querySelectorAll('.vno-sheet-tab-item')].find(x=>x.dataset.sheet===${JSON.stringify(name)});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));if(!p)throw new Error("Missing Pivot sheet tab "+name);await mouseClick(session.cdp,p.x,p.y);};
        await clickTab("Sheet1");
        const source=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="C2"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if(!source)throw new Error("Missing pivot source C2");await mouseClick(session.cdp,source.x,source.y);await typeText(session.cdp,"2222");await press(session.cdp,"Enter");await clickTab("Sheet1 (2)");
      }
      if (kind === "flashFill") {
        for (const [row, value] of [[2,"Nguyễn Văn A"],[3,"Trần Thị B"],[4,"Lê Văn C"],[5,"Phạm Thị D"],[6,"Hoàng Văn E"]]) {
          const p=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="J${row}"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
          if(!p)throw new Error("Missing Flash Fill source J"+row); await mouseClick(session.cdp,p.x,p.y); await typeText(session.cdp,value); await press(session.cdp,"Enter");
        }
        for (const [row, value] of [[2,"A"],[3,"B"]]) {
          const p=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="K${row}"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
          if(!p)throw new Error("Missing Flash Fill example K"+row); await mouseClick(session.cdp,p.x,p.y); await typeText(session.cdp,value); await press(session.cdp,"Enter");
        }
        const last=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="K6"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if(!last)throw new Error("Missing Flash Fill range end K6"); await mouseDrag(session.cdp,pos.x,pos.y,last.x,last.y);
      }
      if (kind === "textToColumns") {
        const end = JSON.parse(await ev(`(() => { const e=document.querySelector('.vno-grid-cell[data-coord="B6"]'); if(!e)return 'null'; const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`));
        if (!end) throw new Error("Could not locate text-to-columns range end B6");
        await mouseDrag(session.cdp,pos.x,pos.y,end.x,end.y);
      }
      const tabId = id.startsWith("sheet.view.") || id.startsWith("common.macro.") ? "view" : id === "sheet.help.open" || id === "common.help.about" ? "help" : id.startsWith("ai.") || id.startsWith("sheet.ai.") ? "ai" : id === "sheet.page.headerFooter" ? "insert" : id.startsWith("sheet.page.") ? "pageLayout" : id.startsWith("sheet.data.") ? "data" : id.startsWith("sheet.formula.") || id.startsWith("sheet.calc.") ? "formulas" : id.startsWith("sheet.chart.") || id.startsWith("sheet.insert.") ? "insert" : id.startsWith("sheet.review.") ? "review" : "home";
      const tabPos = JSON.parse(await ev(`(() => { const visible=${renderedNode}; const n=[...document.querySelectorAll('#vno-ribbon-tab-${tabId}')].find(visible); if(!n)return 'null'; const r=n.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,active:n.classList.contains('is-active')}) })()`));
      if (!tabPos) throw new Error("Visible ribbon tab missing: " + tabId); if (!tabPos.active) await mouseClick(session.cdp, tabPos.x, tabPos.y); await session.cdp.waitFor(`(() => { const visible=${renderedNode}; const n=[...document.querySelectorAll('#vno-ribbon-tab-${tabId}')].find(visible),p=[...document.querySelectorAll('#vno-ribbon-tabpanel-${tabId}')].find(visible); return !!n?.classList.contains('is-active')&&!!p; })()`, { timeoutMilliseconds: 10000, intervalMilliseconds: 100 });
      await sleep(350);
      if (kind === "trace") {
        for (const [coord, formula] of [["H2", "=SUM(C2:C6)"], ["H3", "=H2*2"]]) {
          const p = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="${coord}"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
          if (!p) throw new Error("Missing trace formula cell " + coord);
          await mouseClick(session.cdp, p.x, p.y); await typeText(session.cdp, formula); await press(session.cdp, "Enter");
        }
        const target = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-grid-cell[data-coord="${cell}"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if (!target) throw new Error("Missing trace selection " + cell);
        await mouseClick(session.cdp, target.x, target.y);
      }
      let fileChooserBackendNodeId = null;
      let fileChooserListener = null;
      if (kind === "image") {
        if (!process.env.VNO_AUDIT_IMAGE) throw new Error("Set VNO_AUDIT_IMAGE to a harmless image fixture.");
        await session.cdp.send("Page.enable"); await session.cdp.send("DOM.enable"); await session.cdp.send("Page.setInterceptFileChooserDialog", { enabled: true });
        fileChooserListener = event => { try { const msg = JSON.parse(String(event.data)); if (msg.method === "Page.fileChooserOpened") fileChooserBackendNodeId = msg.params.backendNodeId; } catch {} };
        session.cdp.socket.addEventListener("message", fileChooserListener);
      }
      const button = JSON.parse(await ev(`(() => { const visible=${renderedNode}; const panel=[...document.querySelectorAll('#vno-ribbon-tabpanel-${tabId}')].find(visible); if(!panel)return 'null'; const nodes=[...panel.querySelectorAll('[data-command-id="${id}"]')]; const hitVisible=n=>visible(n)&&(()=>{const r=n.getBoundingClientRect(),h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return h===n||n.contains(h)})(); const hit=nodes.find(hitVisible); const group=(hit||nodes[0])?.closest('.vno-ribbon-group.vno-group-collapsed'); const btn=group?.querySelector('.vno-ribbon-group-collapsed-btn'); if(btn&&visible(btn)){const r=btn.getBoundingClientRect();return JSON.stringify({collapsed:{x:r.left+r.width/2,y:r.top+r.height/2}})} const v=hit; if(v){const r=v.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})} const dropdownId=${JSON.stringify(id.startsWith("sheet.row.")||id.startsWith("sheet.col.")?"sheet.cells.format":id.startsWith("sheet.view.freeze")?"sheet.view.freezePanesMenu":"")}; const dd=[...document.querySelectorAll('[data-dropdown-id="'+dropdownId+'"]')].find(visible); if(dd){const r=dd.getBoundingClientRect();return JSON.stringify({dropdown:{x:r.left+r.width/2,y:r.top+r.height/2}})} return 'null' })()`));
      if (kind === "ribbonEvidence") {
        status = "AI content actions left unactivated; visible ribbon captured";
      } else if (kind === "helpKey") {
        await press(session.cdp, "F1"); await sleep(300); status = "opened Help with F1";
      } else if (kind === "printPreview") {
        const tab = JSON.parse(await ev(`(() => {const n=document.querySelector('#vno-ribbon-tab-view');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,active:n.classList.contains('is-active')})})()`));
        if (!tab) status = "NO_VIEW_TAB";
        else { if (!tab.active) { await mouseClick(session.cdp, tab.x, tab.y); await sleep(250); }
          const p = JSON.parse(await ev(`(() => {const n=[...document.querySelectorAll('#vno-ribbon-tabpanel-view [data-command-id="sheet.file.printPreview"]')].find(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
          if (!p) status = "NO_PRINT_PREVIEW_BUTTON";
          else { await mouseClick(session.cdp, p.x, p.y); await sleep(350); status = "clicked print preview; overlay=" + await ev("!!document.querySelector('.vno-sheet-print-preview-overlay')"); if (await ev("!!document.querySelector('.vno-sheet-print-preview-overlay')")) await press(session.cdp, "Escape"); }
        }
      } else if (!button) {
        status = "NO_BUTTON";
      }
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
      if (kind === "trace" && status === "clicked") {
        await sleep(100);
        const traceState = await ev("JSON.stringify({arrows:window.__vnoAppInstance.grid.auditArrows,precedent:document.querySelectorAll('.vno-cell-precedent').length,dependent:document.querySelectorAll('.vno-cell-dependent').length})");
        status = "UI-only arrows; " + traceState;
      }
      if (kind === "macroToggle" && status === "clicked") {
        await sleep(150);
        const p = JSON.parse(await ev(`(() => {const n=[...document.querySelectorAll('[data-command-id="${id}"]')].find(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,checked:n.classList.contains('is-checked')})})()`));
        if (!p) status = "recording toggled; control no longer visible to turn off";
        else { await mouseClick(session.cdp, p.x, p.y); status = "toggled recording on then off without recording edits"; }
      }
      if ((kind === "click" || kind === "printPreview") && id === "sheet.file.printPreview" && status === "clicked") {
        await sleep(350); status = "opened print preview; no print command issued";
        const opened = await ev("!!document.querySelector('.vno-sheet-print-preview-overlay, .vno-sheet-print-preview')");
        status += "; overlay=" + opened;
        if (opened) await press(session.cdp, "Escape");
      }
      if (kind === "click" && id === "sheet.view.newWindow" && status === "clicked") {
        status = "new-window command invoked; " + await ev("JSON.stringify({windowOpen:typeof window.open,blockedStatus:document.querySelector('[data-vno-status]')?.textContent||''})");
      }
      if (kind === "image" && status === "clicked") {
        for (let attempt = 0; attempt < 100 && !fileChooserBackendNodeId; attempt++) await sleep(50);
        if (!fileChooserBackendNodeId) status = "NO_FILE_CHOOSER";
        else {
          await session.cdp.send("DOM.setFileInputFiles", { backendNodeId: fileChooserBackendNodeId, files: [path.resolve(process.env.VNO_AUDIT_IMAGE)] });
          await session.cdp.waitFor("(window.__vnoAppInstance.grid.imagesBySheet[window.__vnoAppInstance.grid.activeSheet]||[]).length>0", { timeoutMilliseconds: 15000, intervalMilliseconds: 100 });
          const shot = await session.cdp.send("Page.captureScreenshot", { format: "png" }, 60000);
          await writeFile(path.join(root, "docs", "tickets-0710", "evidence", `fix-s12-${name}.png`), Buffer.from((shot.result || shot).data, "base64"));
          status = "inserted image by selecting file through CDP file chooser";
        }
        if (fileChooserListener) session.cdp.socket.removeEventListener("message", fileChooserListener);
      }
      if (kind === "pivotRefresh" && status === "clicked") status = "changed source C2 to 2222 and refreshed pivot";
      if (name === "pivotChart" && status === "clicked") {
        await sleep(250);
        const dialog = await ev("!!document.querySelector('.vno-dialog-overlay [data-chart-apply]')");
        if (!dialog) status = "NO_PIVOT_CHART_DIALOG";
        else { await press(session.cdp, "Enter"); await session.cdp.waitFor("!document.querySelector('.vno-dialog-overlay [data-chart-apply]')", { timeoutMilliseconds: 5000, intervalMilliseconds: 100 }); status = "inserted Pivot bar chart by Enter"; }
      }
      if (kind === "pivotTable" && status === "clicked") {
        await sleep(250);
        const row=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-pivot-field[data-field="Họ tên"] input[data-zone="rows"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        const val=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-pivot-field[data-field="Số tiền"] input[data-zone="values"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if(!row||!val)status="PIVOT_FIELDS_NOT_LOADED";else {await mouseClick(session.cdp,row.x,row.y);await mouseClick(session.cdp,val.x,val.y);const apply=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-sheet-rule-dialog .vno-rule-apply');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));if(!apply)status="NO_PIVOT_APPLY";else{await mouseClick(session.cdp,apply.x,apply.y);status="created Pivot by name and sum of amount";}}
      }
      if (kind === "consolidate" && status === "clicked") {
        await sleep(150);
        const field=JSON.parse(await ev(`(() => {const n=document.querySelector('#vno-consolidate-ref');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if(!field)status="NO_CONSOLIDATE_DIALOG";else {const add=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-consolidate-add');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));if(!add)status="NO_CONSOLIDATE_ADD";else{await mouseClick(session.cdp,field.x,field.y);await press(session.cdp,"Home");await press(session.cdp,"End",{shift:true});await press(session.cdp,"Backspace");for(const ref of ["Sheet1!A2:C3","Sheet1!A4:C5"]){await mouseClick(session.cdp,field.x,field.y);await typeText(session.cdp,ref);await mouseClick(session.cdp,add.x,add.y);}const apply=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-sheet-rule-dialog .vno-rule-apply');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));if(!apply)status="NO_CONSOLIDATE_APPLY";else{await mouseClick(session.cdp,apply.x,apply.y);status="SUM consolidated A2:C3 and A4:C5 at M1";}}}
      }
      if (kind === "subtotal" && status === "clicked") {
        await sleep(150);
        const group=JSON.parse(await ev(`(() => {const n=document.querySelector('#vno-st-group');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if(!group)status="NO_SUBTOTAL_DIALOG";else {await mouseClick(session.cdp,group.x,group.y);await press(session.cdp,"ArrowDown");await press(session.cdp,"Enter");const b=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-st-col[value="B"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,checked:n.checked})})()`));if(!b)status="NO_SUBTOTAL_COLUMNS";else{if(b.checked)await mouseClick(session.cdp,b.x,b.y);const apply=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-sheet-rule-dialog .vno-rule-apply');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));if(!apply)status="NO_SUBTOTAL_APPLY";else{await mouseClick(session.cdp,apply.x,apply.y);status="subtotal by Họ tên using SUM of Số tiền";}}}
      }
      if (kind === "flashFill" && status === "clicked") status = "applied Flash Fill K2:K6 using last-name initial examples";
      if (name === "insertFunction" && status === "clicked") {
        await sleep(150);
        const search = JSON.parse(await ev(`(() => {const n=document.querySelector('#vno-func-search');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if (!search) status = "NO_FUNCTION_SEARCH";
        else {
          await mouseClick(session.cdp, search.x, search.y); await typeText(session.cdp, "TODAY"); await sleep(100);
          const item = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-func-item[data-func-name="TODAY"]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
          if (!item) status = "NO_TODAY_FUNCTION";
          else {
            await mouseClick(session.cdp, item.x, item.y); await sleep(75);
            const selected = await ev(`document.querySelector('.vno-func-item.is-selected')?.dataset.funcName||''`);
            if (selected !== "TODAY") status = "FUNCTION_SELECTION_MISMATCH:" + selected;
            else {
              const insert = JSON.parse(await ev(`(() => {const n=document.querySelector('#vno-fx-insert-btn');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
              if (!insert) status = "NO_INSERT_FUNCTION_BUTTON";
              else { await mouseClick(session.cdp, insert.x, insert.y); await sleep(150); const shot=await session.cdp.send("Page.captureScreenshot",{format:"png"},60000); await writeFile(path.join(root,"docs","tickets-0710","evidence","fix-s12-insertFunction.png"),Buffer.from((shot.result||shot).data,"base64")); status = "inserted selected TODAY function into H2 via fx dialog"; }
            }
          }
        }
      }
      if (name === "createNames" && status === "clicked") {
        const names = await ev(`JSON.stringify(window.__vnoAppInstance.grid.namedRangesWorkbook)`);
        const shot = await session.cdp.send("Page.captureScreenshot",{format:"png"},60000);
        await writeFile(path.join(root,"docs","tickets-0710","evidence","fix-s12-createNames.png"),Buffer.from((shot.result||shot).data,"base64"));
        status = "created names from A1:C6 headers: " + names;
      }
      if (name === "useInFormula" && status === "clicked") {
        await sleep(100);
        const item = await ev(`document.querySelector('.vno-paste-name-item.is-selected')?.dataset.name||''`);
        const apply = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-sheet-rule-dialog .vno-rule-apply');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if (!item) status = "NO_DEFINED_NAME_IN_DIALOG";
        else if (!apply) status = "NO_PASTE_NAME_APPLY";
        else { await mouseClick(session.cdp,apply.x,apply.y); status = "inserted defined name " + item + " into H2"; const shot=await session.cdp.send("Page.captureScreenshot",{format:"png"},60000); await writeFile(path.join(root,"docs","tickets-0710","evidence","fix-s12-useInFormula.png"),Buffer.from((shot.result||shot).data,"base64")); }
      }
      if ((kind === "pageSize" || kind === "pageScale") && status === "clicked") {
        await sleep(150);
        const selector = kind === "pageSize" ? "#vno-sheet-size" : "#vno-sheet-scale-percent";
        const field = JSON.parse(await ev(`(() => {const n=document.querySelector(${JSON.stringify(selector)});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if (!field) status = "NO_PAGE_SETUP_FIELD";
        else {
          await mouseClick(session.cdp, field.x, field.y);
          if (kind === "pageSize") { await press(session.cdp, "Home"); await press(session.cdp, "ArrowDown"); await press(session.cdp, "ArrowDown"); await press(session.cdp, "Enter"); }
          else { await mouseTripleClick(session.cdp, field.x, field.y); await press(session.cdp, "Home"); await press(session.cdp, "End", { shift: true }); await press(session.cdp, "Backspace"); await typeText(session.cdp, value); }
          const apply = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-sheet-rule-dialog .vno-rule-apply');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
          const inputState = await ev(`JSON.stringify({value:document.querySelector(${JSON.stringify(selector)})?.value,active:document.activeElement?.id})`);
          if (!apply) status = "NO_PAGE_SETUP_APPLY";
          else {
            await mouseClick(session.cdp, apply.x, apply.y);
            const shot = await session.cdp.send("Page.captureScreenshot", { format: "png" }, 60000);
            await writeFile(path.join(root, "docs", "tickets-0710", "evidence", `fix-s12-${name}.png`), Buffer.from((shot.result || shot).data, "base64"));
            status = kind === "pageSize" ? "selected Legal paper size; " + inputState : "input=" + inputState + " setup=" + await ev("JSON.stringify(window.__vnoAppInstance.grid.getPageSetup())");
          }
        }
      }
      if (kind === "pageTitles" && status === "clicked") {
        await sleep(150);
        const field = JSON.parse(await ev(`(() => {const n=document.querySelector('#vno-sheet-title-rows');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if (!field) status = "NO_PRINT_TITLES_FIELD";
        else {
          await mouseTripleClick(session.cdp, field.x, field.y); await press(session.cdp, "Home"); await press(session.cdp, "End", { shift: true }); await press(session.cdp, "Backspace"); await typeText(session.cdp, value);
          const apply = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-sheet-rule-dialog .vno-rule-apply');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
          if (!apply) status = "NO_PRINT_TITLES_APPLY";
          else { await mouseClick(session.cdp, apply.x, apply.y); status = "set print title rows to 1:1"; }
          const shot = await session.cdp.send("Page.captureScreenshot", { format: "png" }, 60000);
          await writeFile(path.join(root, "docs", "tickets-0710", "evidence", `fix-s12-${name}.png`), Buffer.from((shot.result || shot).data, "base64"));
        }
      }
      if (kind === "headerFooter" && status === "clicked") {
        await sleep(150);
        const field = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-sheet-rule-dialog #vno-sheet-header-right');if(!n)return 'null';const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);const s=getComputedStyle(n),o=n.closest('.vno-sheet-rule-dialog'),or=o.getBoundingClientRect(),b=o.querySelector('.vno-dialog-box'),br=b.getBoundingClientRect(),bs=getComputedStyle(b);return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,visible:r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden',hit:hit?.id||hit?.className||hit?.tagName,overlay:{x:or.left,y:or.top,w:or.width,h:or.height},box:{x:br.left,y:br.top,w:br.width,h:br.height,z:bs.zIndex,display:bs.display,visibility:bs.visibility}})})()`));
        if (!field) status = "NO_HEADER_FOOTER_FIELD";
        else if (!field.visible || field.hit !== "vno-sheet-header-right") { status = "HEADER_FOOTER_FIELD_NOT_HIT:" + JSON.stringify(field); const shot=await session.cdp.send("Page.captureScreenshot",{format:"png"},60000); await writeFile(path.join(root,"docs","tickets-0710","evidence",`fix-s12-${name}.png`),Buffer.from((shot.result||shot).data,"base64")); }
        else {
          await mouseTripleClick(session.cdp, field.x, field.y); await press(session.cdp, "Home"); await press(session.cdp, "End", { shift: true }); await press(session.cdp, "Backspace"); await typeText(session.cdp, value);
          const entered = await ev(`document.querySelector('.vno-sheet-rule-dialog #vno-sheet-header-right')?.value||''`);
          if (entered !== value) status = "HEADER_FOOTER_INPUT_MISMATCH:" + entered;
          const apply = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-sheet-rule-dialog .vno-rule-apply');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
          if (status.startsWith("HEADER_FOOTER_INPUT_MISMATCH:")) {}
          else if (!apply) status = "NO_HEADER_FOOTER_APPLY";
          else { await mouseClick(session.cdp, apply.x, apply.y); status = "set right header to " + value; }
          const shot = await session.cdp.send("Page.captureScreenshot", { format: "png" }, 60000);
          await writeFile(path.join(root, "docs", "tickets-0710", "evidence", `fix-s12-${name}.png`), Buffer.from((shot.result || shot).data, "base64"));
        }
      }
      if (kind === "pageBreak" && status === "clicked") {
        const shot = await session.cdp.send("Page.captureScreenshot", { format: "png" }, 60000);
        await writeFile(path.join(root, "docs", "tickets-0710", "evidence", `fix-s12-${name}.png`), Buffer.from((shot.result || shot).data, "base64"));
        status = id.endsWith("insertPageBreak") ? "inserted page breaks at C5 through ribbon" : "removed page breaks at C5 through ribbon";
      }
      if ((kind === "hyperlink" || kind === "commentInsert") && status === "clicked") {
        await sleep(200);
        const fill = async (selector, text) => {
          const field = JSON.parse(await ev(`(() => {const n=document.querySelector(${JSON.stringify(selector)});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
          if (!field) throw new Error("Missing dialog field " + selector);
          await mouseTripleClick(session.cdp, field.x, field.y); await press(session.cdp, "Home"); await press(session.cdp, "End", { shift: true }); await press(session.cdp, "Backspace"); await typeText(session.cdp, text);
        };
        if (kind === "hyperlink") {
          await fill(".vno-hyperlink-text-input", "Trang chủ VN Office");
          await fill(".vno-hyperlink-url-input", "https://vnoffice.vn");
          const apply = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-hyperlink-dialog .vno-dialog-ok-btn');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
          if (!apply) status = "NO_HYPERLINK_APPLY";
          else { await mouseClick(session.cdp, apply.x, apply.y); status = "inserted https://vnoffice.vn hyperlink into G2"; }
        } else {
          await fill("#vno-comment-text", "Ghi chú kiểm thử S12");
          const apply = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-sheet-rule-dialog .vno-rule-apply');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
          if (!apply) status = "NO_COMMENT_APPLY";
          else { await mouseClick(session.cdp, apply.x, apply.y); status = "inserted comment at C2"; }
        }
        if (status.startsWith("inserted ")) {
          const shot = await session.cdp.send("Page.captureScreenshot", { format: "png" }, 60000);
          await writeFile(path.join(root, "docs", "tickets-0710", "evidence", `fix-s12-${name}.png`), Buffer.from((shot.result || shot).data, "base64"));
        }
      }
      if (kind === "defineName" && status === "clicked") {
        await sleep(150);
        const fill = async (selector, text) => {
          const field = JSON.parse(await ev(`(() => {const n=document.querySelector(${JSON.stringify(selector)});if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
          if (!field) throw new Error("Missing Define Name field " + selector);
          await mouseTripleClick(session.cdp, field.x, field.y); await press(session.cdp, "Home"); await press(session.cdp, "End", { shift: true }); await press(session.cdp, "Backspace"); await typeText(session.cdp, text);
        };
        await fill("#vno-defname-name", "S12Cell");
        await fill("#vno-defname-ref", "B2");
        const apply = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-sheet-rule-dialog .vno-rule-apply');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if (!apply) status = "NO_DEFINE_NAME_APPLY";
        else { await mouseClick(session.cdp, apply.x, apply.y); status = "defined workbook name S12Cell for B2"; }
        if (status.startsWith("defined ")) {
          const shot = await session.cdp.send("Page.captureScreenshot", { format: "png" }, 60000);
          await writeFile(path.join(root, "docs", "tickets-0710", "evidence", `fix-s12-${name}.png`), Buffer.from((shot.result || shot).data, "base64"));
        }
      }
      if (kind === "click" && ["sheet.formula.recalculate", "sheet.calc.calculateSheet", "sheet.formula.errorChecking"].includes(id) && status === "clicked") {
        await sleep(150);
        const checkerState = id === "sheet.formula.errorChecking" ? await ev("JSON.stringify({rows:document.querySelectorAll('.vno-error-row').length,text:document.querySelector('.vno-error-checking-dialog')?.innerText||''})") : "";
        const shot = await session.cdp.send("Page.captureScreenshot", { format: "png" }, 60000);
        await writeFile(path.join(root, "docs", "tickets-0710", "evidence", `fix-s12-${name}.png`), Buffer.from((shot.result || shot).data, "base64"));
        status = id === "sheet.formula.recalculate" ? "clicked full workbook recalculation" : id === "sheet.calc.calculateSheet" ? "clicked active sheet recalculation" : "opened Formula Error Checking " + checkerState;
        if (id === "sheet.formula.errorChecking") await press(session.cdp, "Escape");
      }
      if (kind === "click" && id === "sheet.review.commentDelete" && status === "clicked") {
        const commentState = await ev("JSON.stringify(window.__vnoAppInstance.grid.commentsBySheet[window.__vnoAppInstance.grid.activeSheet])");
        const shot = await session.cdp.send("Page.captureScreenshot", { format: "png" }, 60000);
        await writeFile(path.join(root, "docs", "tickets-0710", "evidence", `fix-s12-${name}.png`), Buffer.from((shot.result || shot).data, "base64"));
        status = "deleted selected comment; remaining=" + commentState;
      }
      if (kind === "click" && ["sheet.cell.alignTop", "sheet.cell.alignMiddle", "sheet.cell.alignBottom", "sheet.cell.wrapText"].includes(id) && status === "clicked") {
        const cellState = await ev(`JSON.stringify({selected:window.__vnoAppInstance.grid.selectedCoord,cell:window.__vnoAppInstance.grid.cellsData.get("${cell}")})`);
        const shot = await session.cdp.send("Page.captureScreenshot", { format: "png" }, 60000);
        await writeFile(path.join(root, "docs", "tickets-0710", "evidence", `fix-s12-${name}.png`), Buffer.from((shot.result || shot).data, "base64"));
        status = "clicked; " + cellState;
      }
      if (kind === "click" && ["sheet.review.commentPrevious", "sheet.review.commentNext"].includes(id) && status === "clicked") {
        const selection = await ev("JSON.stringify({selected:window.__vnoAppInstance.grid.selectedCoord,comments:window.__vnoAppInstance.grid.commentsBySheet[window.__vnoAppInstance.grid.activeSheet]})");
        const shot = await session.cdp.send("Page.captureScreenshot", { format: "png" }, 60000);
        await writeFile(path.join(root, "docs", "tickets-0710", "evidence", `fix-s12-${name}.png`), Buffer.from((shot.result || shot).data, "base64"));
        status = "navigated comment; " + selection;
      }
      if (kind === "textToColumns" && status === "clicked") {
        await sleep(150);
        const select = JSON.parse(await ev(`(() => {const n=document.querySelector('#vno-ttc-del');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
        if (!select) status = "NO_TEXT_TO_COLUMNS_DIALOG";
        else {
          await mouseClick(session.cdp,select.x,select.y); await press(session.cdp,"ArrowDown"); await press(session.cdp,"ArrowDown"); await press(session.cdp,"Enter");
          const apply=JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-sheet-rule-dialog .vno-rule-apply');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
          if (!apply) status = "NO_TEXT_TO_COLUMNS_APPLY"; else { await mouseClick(session.cdp,apply.x,apply.y); status = "split B2:B6 using spaces"; }
        }
      }
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
      if ((kind === "conditional" || kind === "conditionalManager") && status === "clicked") {
        await sleep(350);
        const dialog = await ev(`(() => { const type=document.querySelector('#vno-cf-type'), val=document.querySelector('#vno-cf-value'), color=document.querySelector('#vno-cf-color'); if(!type||!val) return false; type.value='greaterThan'; type.dispatchEvent(new Event('change',{bubbles:true})); val.value='2000'; val.dispatchEvent(new Event('input',{bubbles:true})); if(color) color.value='#fed7aa'; const btn=document.querySelector('.vno-rule-apply'); if(!btn) return false; const r=btn.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`);
        const apply = typeof dialog === "string" ? JSON.parse(dialog) : dialog;
        if (!apply) status = "NO_RULE_DIALOG";
        else {
          await mouseClick(session.cdp, apply.x, apply.y); status = "applied > 2000";
          if (kind === "conditionalManager") {
            await sleep(250);
            await mouseClick(session.cdp, button.x, button.y);
            await session.cdp.waitFor("!!document.querySelector('.vno-cf-rule-row [data-cf-remove]')", { timeoutMilliseconds: 10000 });
            const remove = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-cf-rule-row [data-cf-remove]');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
            if (!remove) throw new Error("Conditional Formatting manager did not expose Remove rule.");
            await mouseClick(session.cdp, remove.x, remove.y);
            await session.cdp.waitFor("window.__vnoAppInstance.grid.getConditionalFormattingRules().length===0", { timeoutMilliseconds: 10000 });
            const add = JSON.parse(await ev(`(() => {const n=document.querySelector('.vno-rule-apply');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
            if (!add) throw new Error("Conditional Formatting manager lost its Add rule action.");
            const threshold = JSON.parse(await ev(`(() => {const n=document.querySelector('#vno-cf-value');if(!n)return 'null';const r=n.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
            if (!threshold) throw new Error("Conditional Formatting manager lost the threshold field.");
            await mouseClick(session.cdp, threshold.x, threshold.y); await press(session.cdp, "a", { ctrl: true }); await typeText(session.cdp, "2000");
            await mouseClick(session.cdp, add.x, add.y);
            status = "created, removed, and re-added > 2000 through the rule manager";
          }
        }
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
      const homeTab = JSON.parse(await ev(`(() => { const visible=${renderedNode}; const n=[...document.querySelectorAll('#vno-ribbon-tab-home')].find(visible); if(!n) return 'null'; const r=n.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,active:n.classList.contains('is-active')}); })()`));
      if (!homeTab) throw new Error("Visible Home ribbon tab is missing"); if (!homeTab.active) { await mouseClick(session.cdp, homeTab.x, homeTab.y); await session.cdp.waitFor("(() => { const n=[...document.querySelectorAll('#vno-ribbon-tab-home')].find(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0}); return !!n?.classList.contains('is-active'); })()", { timeoutMilliseconds: 10000, intervalMilliseconds: 100 }); }
      let choice = JSON.parse(await ev(`(() => { const visible=n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'}; const s=[...document.querySelectorAll('select[data-command-id="${id}"]')].find(visible); if(!s) return 'null'; const r=s.getBoundingClientRect(),g=s.closest('.vno-ribbon-group.vno-group-collapsed'),b=g?.querySelector('.vno-ribbon-group-collapsed-btn'),br=b?.getBoundingClientRect(); const options=[...s.options]; const index=options.findIndex(o=>o.value===${JSON.stringify(value)}),currentIndex=options.findIndex(o=>o.value===s.value); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,index,currentIndex,count:options.length,initial:s.value,collapsed:!!(br?.width&&br.height),cx:br ? br.left+br.width/2 : undefined,cy:br ? br.top+br.height/2 : undefined,visible:true}); })()`));
      if (!choice) status = "NO_SELECT";
      else if (choice.index < 0) status = "VALUE_NOT_AVAILABLE";
      else {
        if (choice.collapsed) {
          await mouseClick(session.cdp, choice.cx, choice.cy); await sleep(200);
          choice = JSON.parse(await ev(`(() => { const s=[...document.querySelectorAll('.vno-ribbon-group-popover select[data-command-id="${id}"]')].find(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0}); if(!s) return 'null'; const r=s.getBoundingClientRect(),options=[...s.options],index=options.findIndex(o=>o.value===${JSON.stringify(value)}),currentIndex=options.findIndex(o=>o.value===s.value); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,index,currentIndex,count:options.length,initial:s.value,visible:true}); })()`));
        }
        if (!choice || !choice.visible) { status = "SELECT_NOT_VISIBLE"; }
        else {
        await mouseClick(session.cdp, choice.x, choice.y);
        const focused = await ev(`JSON.stringify((()=>{const s=[...document.querySelectorAll('select[data-command-id="${id}"]')].find(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0});return !!s&&document.activeElement===s})())`);
        if (focused !== "true") status = "SELECT_NOT_FOCUSED";
        else {
          const key = choice.index >= choice.currentIndex ? "ArrowDown" : "ArrowUp";
          for (let i = 0; i < Math.abs(choice.index - choice.currentIndex); i++) await press(session.cdp, key, {}, 0);
          const selectedValue = await ev(`(() => { const s=[...document.querySelectorAll('select[data-command-id="${id}"]')].find(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0}); return s ? s.value : 'SELECT_UNMOUNTED'; })()`);
          if (selectedValue !== value) status = `SELECT_VALUE_MISMATCH(${selectedValue}; wanted ${value})`;
          else { await press(session.cdp, "Enter", {}, 0); await sleep(250); status = `keyboard selection submitted (${selectedValue})`; }
        }
        }
      }
    }
    await sleep(600);
    const info = await ev(`(() => { const app=window.__vnoAppInstance,it=app.grid.cellsData.get("${cell}")||{},g=app.grid,a=app.adapter; const fods=a.serializeToFods(),active=[...document.querySelectorAll('.vno-ribbon-tab.is-active')].find(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0}); return JSON.stringify({activeTab:active?.dataset.tabId, value:it.val, formula:it.formula, calculatedValue:it.calculatedValue, style:it.style, sparkline:it.sparkline, quickCategory:document.querySelector('select[data-command-id="sheet.format.quickCategory"]')?.value, printAreaBySheet:g.printAreaBySheet, gridlinesVisible:g.gridlinesVisible, headingsVisible:g.headingsVisible, rowHeight:g.getRowHeight?.(3), columnWidth:g.getColumnWidth?.('B'), names:g.namedRangesWorkbook, comments:g.commentsBySheet?.[g.activeSheet], pivotTables:g.pivotTablesBySheet, adapterNames:a.grid?.namedRangesWorkbook, serializedName:fods.includes('table:named-range'), fw:it.style&&it.style.fontWeight, fmt:it.style&&it.style.numberFormat&&it.style.numberFormat.category, textRotation:it.style&&it.style.textRotation}); })()`);
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
    if (name.startsWith("s16") || ["size16", "fontArial", "numNumber", "numCurrency", "numAccounting"].includes(name)) {
      const evidenceDir = path.join(root, "docs", "tickets-0710", "evidence", "s16");
      await mkdir(evidenceDir, { recursive: true });
      const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, 60000);
      await writeFile(path.join(evidenceDir, `${name.replace(/^s16/, "")}.png`), Buffer.from((shot.result || shot).data, "base64"));
    }
    console.log(name.padEnd(18), "save=" + (saved && saved.status), saved?.status === "error" ? JSON.stringify(saved) : "", "|", status, "|", info, formulaValues ? "| formulas=" + formulaValues : "");
  } catch (e) { console.log(name.padEnd(18), "LOI:", String(e.message).slice(0, 120)); } finally {
    if (restoreSystemClipboard) {
      try {
        const restored = await ev(`globalThis.globalUnoBridge.writeClipboardData(window.__s16ClipboardBackup)`);
        clipboardRestoration = restored && (!restored.status || restored.status === "ok") ? "PASS" : "FAIL";
      } catch { clipboardRestoration = "FAIL"; }
    }
    await session.close();
    if (restoreSystemClipboard) console.log(name.padEnd(18), "system clipboard restore=" + clipboardRestoration);
  }
}
