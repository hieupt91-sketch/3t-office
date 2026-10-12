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
      const map=g.sheetsData[sheet];
      if (!map) continue;
      for (const [coord,item] of map) {
        if (!item || item.formula || item.val==='' || item.val==null) continue;
        const dom=sheet===g.activeSheet ? g.container.querySelector('.vno-grid-cell[data-coord="'+coord+'"]') : null;
        if (!dom) continue;
        const rect=dom.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const dirty=g._getDirtyFormulaOrder(graph,{sheet,coord});
        if (!dirty?.length) continue;
        options.push({sheet,coord,count:dirty.length,x:rect.left+rect.width/2,y:rect.top+rect.height/2});
      }
    }
    options.sort((a,b)=>b.count-a.count);
    const best=options[0];
    if (!best) return {error:'no visible non-formula cell with dependent formulas'};
    g.selectCell(best.coord.match(/^[A-Z]+/)[0],Number(best.coord.match(/\\d+$/)[0]));
    return best;
  })()`);
  if (target.error) throw new Error(target.error);

  const times = {};
  const timed = async (name, action) => { const start=performance.now(); await action(); times[name]=Math.round(performance.now()-start); };
  await timed("selectCell", () => mouseClick(session.cdp,target.x,target.y));
  await timed("editStartFirstKey", () => press(session.cdp,"t",{shift:true},20));
  await timed("typingSecondKey", () => press(session.cdp,"e",{shift:true},20));
  await timed("Enter", () => press(session.cdp,"Enter",{},20));
  await sleep(200);

  const edited = await session.cdp.evaluate(`(() => {
    const g=window.__vnoAppInstance.grid;
    const formulas=[];
    for(const sheet of g.sheets) for(const [coord,item] of g.sheetsData[sheet]||[]) if(item?.formula) formulas.push([sheet,coord,item.val]);
    const item=g.sheetsData[${JSON.stringify(target.sheet)}]?.get(${JSON.stringify(target.coord)});
    return {formulaValues:formulas,editedValue:item?.val,undo:g.canUndo(),redo:g.canRedo()};
  })()`);
  const oracle = await session.cdp.evaluate(`(() => {
    const g=window.__vnoAppInstance.grid, before=${JSON.stringify(edited.formulaValues)};
    g._recalculateAllFormulas(undefined,true);
    const after=[];
    for(const sheet of g.sheets) for(const [coord,item] of g.sheetsData[sheet]||[]) if(item?.formula) after.push([sheet,coord,item.val]);
    const beforeMap=new Map(before.map(([s,c,v])=>[JSON.stringify([s,c]),v]));
    const differences=[];
    for(const [s,c,v] of after){const prior=beforeMap.get(JSON.stringify([s,c]));if(!Object.is(prior,v))differences.push({sheet:s,coord:c,incremental:prior,full:v});}
    return {formulaCount:after.length,mismatchCount:differences.length,mismatches:differences.slice(0,20)};
  })()`);

  await timed("Ctrl+Z", () => press(session.cdp,"z",{ctrl:true},20));
  const afterUndo = await session.cdp.evaluate(`(() => {const g=window.__vnoAppInstance.grid;return g.sheetsData[${JSON.stringify(target.sheet)}]?.get(${JSON.stringify(target.coord)})?.val})()`);
  await timed("Ctrl+Y", () => press(session.cdp,"y",{ctrl:true},20));
  const afterRedo = await session.cdp.evaluate(`(() => {const g=window.__vnoAppInstance.grid;return g.sheetsData[${JSON.stringify(target.sheet)}]?.get(${JSON.stringify(target.coord)})?.val})()`);
  console.log(JSON.stringify({file,target:{sheet:target.sheet,coord:target.coord,dependentFormulaCount:target.count},times,editedValue:edited.editedValue,undoValue:afterUndo,redoValue:afterRedo,oracle}));
} finally {
  await session.close();
}
