import { launchApp } from "./session.mjs";
import { mouseClick } from "./actions.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("writer", { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
const results = [];
const check = (n, ok, d) => { results.push(ok); console.log((ok ? "PASS" : "FAIL") + " | " + n + " | " + String(d).slice(0, 260)); };
const clickSel = async (q) => { const p = JSON.parse(await ev(`(() => { const e=document.querySelector(${JSON.stringify(q)}); e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`)); await mouseClick(session.cdp, p.x, p.y); };
const grid = () => ev(`JSON.stringify((() => { const t=document.querySelector('.vno-writer-body table'); const occ=[]; const out=[]; [...t.rows].forEach((row,ri)=>{ occ[ri]=occ[ri]||[]; let c=0; const line=[]; [...row.cells].forEach(cell=>{ while(occ[ri][c]) c++; line.push(c+':'+cell.textContent.trim()); const rs=cell.rowSpan||1, cs=cell.colSpan||1; for(let dr=0;dr<rs;dr++){ occ[ri+dr]=occ[ri+dr]||[]; for(let dc=0;dc<cs;dc++) occ[ri+dr][c+dc]=true;} c+=cs; }); out.push({line, width:Math.max(...occ[ri].map((v,i)=>v?i+1:0))}); }); return out; })())`);
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(4000);
  await ev("document.querySelector('.vno-writer-body').focus()");
  await clickSel("#vno-ribbon-tab-insert"); await sleep(300);
  await clickSel('[data-command-id="writer.table.insert"]'); await sleep(800);
  // Dung lai bang: cot 0 gop doc hang 0-2; o 2x2 o cot 1-2 hang 0-1; (4 cot)
  await ev(`(() => { const t=document.querySelector('.vno-writer-body table'); t.innerHTML='<tbody>'+
    '<tr><td rowspan="3">A</td><td colspan="2" rowspan="2" id="big">M</td><td>D1</td></tr>'+
    '<tr><td>D2</td></tr>'+
    '<tr><td>x1</td><td>x2</td><td>x3</td></tr></tbody>'; return 1; })()`);
  console.log("truoc:", await grid());
  await clickSel("#big"); await sleep(300);
  await clickSel("#vno-ribbon-tab-tableLayout"); await sleep(500);
  await clickSel('[data-command-id="writer.table.splitCells"]'); await sleep(600);
  const g = JSON.parse(await grid());
  console.log("sau:", JSON.stringify(g));
  check("Tach o co rowspan cot khac: moi hang du 4 cot", g.every((r) => r.width === 4), JSON.stringify(g.map((r) => r.width)));
  check("Tach o: o goc D2 giu nguyen cot 3, o moi vao cot 1 va 2", g[1].line.includes("3:D2") && g[1].line.includes("1:") && g[1].line.includes("2:"), JSON.stringify(g[1].line));
  console.log("SUMMARY", results.filter(Boolean).length + "/" + results.length);
} finally { await session.close(); }