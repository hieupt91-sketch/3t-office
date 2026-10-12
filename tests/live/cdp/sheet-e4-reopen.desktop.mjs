import { launchApp } from "./session.mjs";
import { click, sleep } from "./actions.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!root || !localAppData) throw new Error("Set VNO_APP_ROOT and the dedicated VNO_CDP_LOCALAPPDATA profile.");
const files = process.argv.slice(2);
if (!files.length) throw new Error("Pass saved E4 XLSX paths to reopen.");
const assertCase = async (file, cdp) => {
  const base = file.split(/[\\/]/).at(-1).replace(/^app_/, "").replace(/\.xlsx$/i, "");
  return cdp.evaluate(`(() => {
    const app=window.__vnoAppInstance, g=app?.grid, cells=g?.cellsData;
    const cell=k=>cells?.get(k)||{};
    const bySheet=(name,coord)=>g?.sheetsData?.[name]?.[coord]||{};
    switch(${JSON.stringify(base)}) {
      case "s16CellsDialog": return {ok:cell("B2").style?.numberFormat?.category==="currency",value:cell("B2").style?.numberFormat};
      case "pasteSpecialPack": return {ok:cell("F3").formula==="=C3*D3" && String(cell("I2").val)==="1234.5",formula:cell("F3").formula,value:cell("I2").val};
      case "bold": return {ok:cell("B2").style?.fontWeight==="bold",style:cell("B2").style};
      case "size16": return {ok:parseFloat(cell("B2").style?.fontSize)>=21,style:cell("B2").style};
      case "fontArial": return {ok:cell("B2").style?.fontFamily==="Arial",style:cell("B2").style};
      case "fillDefault": return {ok:String(cell("B2").style?.backgroundColor||"").toUpperCase()==="#FFFF00",style:cell("B2").style};
      case "bordersDefault": return {ok:["borderLeft","borderRight","borderTop","borderBottom"].some(key=>!!cell("B2").style?.[key]),style:cell("B2").style};
      case "alignCenter": return {ok:cell("B2").style?.textAlign==="center",style:cell("B2").style};
      case "rotation90": return {ok:cell("B2").style?.textRotation===90,style:cell("B2").style};
      case "findReplacePack": return {ok:cell("G2").val==="Đã thay",sheets:g?.sheets,value:cell("G2").val};
      case "customSort": return {ok:cell("B2").val==="Hoàng Văn E",value:cell("B2").val};
      case "filter": return {ok:g?.isFilterActive===true,active:g?.isFilterActive};
      case "validation": return {ok:(g?.dataValidationsBySheet?.[g?.activeSheet]||[]).length>0,rules:g?.dataValidationsBySheet?.[g?.activeSheet]||[]};
      case "conditional": return {ok:(g?.conditionalFormattingBySheet?.[g?.activeSheet]||[]).length>0,rules:g?.conditionalFormattingBySheet?.[g?.activeSheet]||[]};
      case "conditionalManager": {
        const rules=g?.conditionalFormattingBySheet?.[g?.activeSheet]||[],range=rules[0]?.range;
        return {ok:rules.length>0&&range?.start?.c==="C"&&range?.start?.r===2&&range?.end?.c==="C"&&range?.end?.r===6,rules};
      }
      case "definedName": return {ok:(g?.namedRangesWorkbook||[]).some(item=>item.name==="SampleNames"&&item.ref==="B2"),names:g?.namedRangesWorkbook||[]};
      case "freezePanes": {
        const panes={rows:g?.frozenRows||0,cols:g?.frozenCols||0};
        return {ok:panes.rows===1&&panes.cols===1,panes};
      }
      case "pageSetup": case "pageSize": case "pageScale": case "printTitles": case "headerFooter": case "printArea": {
        const setup=g?.getPageSetup?.();
        const ok=${JSON.stringify(base)}==="pageSetup" ? setup?.orientation==="landscape"
          : ${JSON.stringify(base)}==="pageSize" ? setup?.size==="legal"
          : ${JSON.stringify(base)}==="pageScale" ? setup?.scale?.mode==="percent"&&setup?.scale?.percent===80
          : ${JSON.stringify(base)}==="printTitles" ? ["1","1:1"].includes(setup?.printTitles?.rows)
          : ${JSON.stringify(base)}==="headerFooter" ? setup?.headerFooter?.header?.right==="VN Office S12"
          : g?.printAreaBySheet?.[g?.activeSheet]==="A1";
        return {ok:!!ok,setup,printArea:g?.printAreaBySheet?.[g?.activeSheet]};
      }
      case "chart": case "chartBar": case "chartLine": case "chartPie": case "chartArea": {
        const charts=g?.chartsBySheet?.[g?.activeSheet]||[];
        return {ok:charts.length>0,charts};
      }
      case "formatAsTable": {
        const tables=g?.tablesBySheet?.[g?.activeSheet]||[];
        return {ok:tables.some(table=>table.name==="Table1"&&table.ref==="A1:G6"),tables};
      }
      case "pivotTable": {
        const pivots=Object.values(g?.pivotTablesBySheet||{}).flat();
        return {ok:pivots.length>0,pivots};
      }
      case "sparklineLine": case "sparklineColumn": {
        const item=cell("C6"), expected=${JSON.stringify(base)}==="sparklineLine"?"line":"column";
        return {ok:item.sparkline?.type===expected,sparkline:item.sparkline};
      }
      case "insertPageBreak": case "removePageBreak": {
        const breaks=g?.pageBreaksBySheet?.[g?.activeSheet]||{rows:[],cols:[]};
        const ok=${JSON.stringify(base)}==="insertPageBreak" ? breaks.rows?.includes(5)&&breaks.cols?.includes("C")
          : !breaks.rows?.length&&!breaks.cols?.length;
        return {ok:!!ok,breaks};
      }
      default: return {ok:!!g?.sheets?.length,sheets:g?.sheets};
    }
  })()`);
};
let failures=0;
for (const file of files) {
  const session=await launchApp("sheet",{root,localAppData,filePath:file,startTimeoutMilliseconds:180000,readyTimeoutMilliseconds:180000});
  try {
    const expected=file.replace(/\\/g,"/").toLowerCase();
    await session.cdp.waitFor(`String(window.__vnoAppInstance?.adapter?._sourcePath||window.__vnoAppInstance?.adapter?.sourceFilePath||"").replace(/\\\\/g,"/").toLowerCase()===${JSON.stringify(expected)} && !!window.__vnoAppInstance?.grid?.sheets?.length`,{timeoutMilliseconds:180000});
    if (file.toLowerCase().includes("findreplacepack")) {
      await click(session.cdp, '.vno-sheet-tab-item[data-sheet="Sheet1"]');
      await sleep(300);
    }
    const result=await assertCase(file,session.cdp);
    console.log(`${result.ok?"PASS":"FAIL"} | reopen in VN Sheet | ${file} | ${JSON.stringify(result)}`);
    if(!result.ok) failures++;
  } finally { await session.close(); }
}
process.exitCode=failures?1:0;
