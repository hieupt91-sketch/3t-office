// Measure a real keyboard edit/commit/undo/redo on a visible dependent cell,
// then compare incremental results with the application's forced full recalc.
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { mouseClick, press } from "../../tests/live/cdp/actions.mjs";

const [profile, file] = process.argv.slice(2);
if (!profile || !file) throw new Error("Usage: p2_edit_latency.desktop.mjs <profile> <workbook.xlsx>");
const session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 600000, readyTimeoutMilliseconds: 600000 });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const expected = file.replace(/\\/g, "/").toLowerCase();
try {
  await session.cdp.waitFor(`(() => { const a=window.__vnoAppInstance?.adapter; return String(a?._sourcePath||a?.sourceFilePath||'').replace(/\\\\/g,'/').toLowerCase()===${JSON.stringify(expected)}; })()`, { timeoutMilliseconds: 900000, intervalMilliseconds: 500 });
  await sleep(1500);
  const target = await session.cdp.evaluate(`(() => {
    const g=window.__vnoAppInstance.grid;
    let graph=g._formulaDependencyGraph || g._buildFormulaDependencyGraph();
    if (!graph) return {error:'dependency graph unavailable; incremental path uses fallback'};
    const options=[];
    for (const sheet of g.sheets) {
      if (sheet!==g.activeSheet) continue;
      const map=g.sheetsData[sheet];
      if (!map) continue;
      for (const [coord,item] of map) {
        if (!item || item.formula || item.val==='' || item.val==null) continue;
        const visible=g.container.querySelector('.vno-grid-cell[data-coord="'+coord+'"]');
        if (!visible?.getBoundingClientRect()?.width) continue;
        const dirty=g._getDirtyFormulaOrder(graph,{sheet,coord});
        if (!dirty?.length) continue;
        options.push({sheet,coord,count:dirty.length,originalValue:item.val});
      }
    }
    options.sort((a,b)=>b.count-a.count);
    const best=options[0];
    if (!best) return {error:'no visible non-formula cell with dependent formulas'};
    g.selectCell(best.coord.match(/^[A-Z]+/)[0],Number(best.coord.match(/\\d+$/)[0]));
    const dom=g.container.querySelector('.vno-grid-cell[data-coord="'+best.coord+'"]');
    const rect=dom?.getBoundingClientRect();
    if(!rect?.width||!rect?.height)return {error:'selected dependent cell is not visible'};
    return {...best,x:rect.left+rect.width/2,y:rect.top+rect.height/2};
  })()`);
  if (target.error) throw new Error(target.error);

  const times = {};
  const timed = async (name, action) => { const start=performance.now(); await action(); times[name]=Math.round(performance.now()-start); };
  await timed("selectCell", () => mouseClick(session.cdp,target.x,target.y));
  await timed("editStartFirstKey", () => press(session.cdp,"t",{shift:true},20));
  await timed("typingSecondKey", () => press(session.cdp,"e",{shift:true},20));
  await timed("Enter", () => press(session.cdp,"Enter",{},20));
  await sleep(200);
  await session.cdp.evaluate("window.__vnoAppInstance.grid.focusGrid()");

  const edited = await session.cdp.evaluate(`(() => {
    const g=window.__vnoAppInstance.grid;
    const formulas=[];
    for(const sheet of g.sheets) for(const [coord,item] of g.sheetsData[sheet]||[]) if(item?.formula) formulas.push([sheet,coord,item.val]);
    const item=g.sheetsData[${JSON.stringify(target.sheet)}]?.get(${JSON.stringify(target.coord)});
    return {formulaValues:formulas,editedValue:item?.val};
  })()`);
  await timed("Ctrl+Z", () => press(session.cdp,"z",{ctrl:true},20));
  const undoValue = await session.cdp.evaluate(`(() => window.__vnoAppInstance.grid.sheetsData[${JSON.stringify(target.sheet)}]?.get(${JSON.stringify(target.coord)})?.val)()`);
  await session.cdp.evaluate("window.__vnoAppInstance.grid.focusGrid()");
  await timed("Ctrl+Y", () => press(session.cdp,"y",{ctrl:true},20));
  const redoState = await session.cdp.evaluate(`(() => {const g=window.__vnoAppInstance.grid,formulas=[];for(const sheet of g.sheets)for(const [coord,item] of g.sheetsData[sheet]||[])if(item?.formula)formulas.push([sheet,coord,item.val]);return {value:g.sheetsData[${JSON.stringify(target.sheet)}]?.get(${JSON.stringify(target.coord)})?.val,formulaValues:formulas}})()`);
  const oracle = await session.cdp.evaluate(`(() => {
    const g=window.__vnoAppInstance.grid, before=${JSON.stringify(redoState.formulaValues)};
    g._recalculateAllFormulas(undefined,true);
    const after=[];
    for(const sheet of g.sheets) for(const [coord,item] of g.sheetsData[sheet]||[]) if(item?.formula) after.push([sheet,coord,item.val]);
    const beforeMap=new Map(before.map(([s,c,v])=>[JSON.stringify([s,c]),v]));
    const differences=[];
    for(const [s,c,v] of after){const prior=beforeMap.get(JSON.stringify([s,c]));if(!Object.is(prior,v))differences.push({sheet:s,coord:c,incremental:prior,full:v});}
    return {formulaCount:after.length,mismatchCount:differences.length,mismatches:differences.slice(0,20)};
  })()`);
  console.log(JSON.stringify({file,target:{sheet:target.sheet,coord:target.coord,dependentFormulaCount:target.count,originalValue:target.originalValue},times,editedValue:edited.editedValue,undoValue,undoRestored:Object.is(undoValue,target.originalValue),redoValue:redoState.value,redoRestored:Object.is(redoState.value,edited.editedValue),oracle}));
} finally {
  await session.close();
}
