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
