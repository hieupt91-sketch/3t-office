import { launchApp } from "./session.mjs";
import { mouseClick } from "./actions.mjs";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync("E:\\VNOffice-profiles\\claude-s42", { recursive: true });
const src = "E:\\VNOffice-agy-rbs2\\tests\\live\\cdp\\test_sheet_home.xlsx";
const file = "E:\\VNOffice-profiles\\claude-s42\\work.xlsx";
copyFileSync(src, file);
const session = await launchApp("sheet", { filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
const clickSel = async (q) => { const p = await ev(`(() => { const e=document.querySelector(${JSON.stringify(q)}); if(!e) return null; e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`); if (!p) return false; const { x, y } = JSON.parse(p); await mouseClick(session.cdp, x, y); return true; };
try {
  await session.cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0", { timeoutMilliseconds: 120000, intervalMilliseconds: 500 });
  await sleep(2500);
  const ids = async (tab, re) => { await clickSel("#vno-ribbon-tab-" + tab); await sleep(400); return JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.vno-ribbon-content [data-command-id]')].map(b=>b.dataset.commandId).filter(i=>${re}.test(i)))`)); };
  const freezeIds = await ids("view", "/freeze|pane|lock|split/i"); console.log("lenh tab view:", (await ids("view", "/./")).join(","));
  console.log("freeze commands:", freezeIds.join(","));
  console.log("dong bang qua CommandBus:", await ev("(async () => { const m = await import('/platform/commands/command-bus.js'); m.globalCommandBus.execute('sheet.view.freezeTopRow', null); return JSON.stringify({frozen: Object.keys(window.__vnoAppInstance.grid).filter(k=>/freeze|frozen/i.test(k)).map(k=>k+'='+JSON.stringify(window.__vnoAppInstance.grid[k]))}); })()"));
  await sleep(600);
  const filterIds = await ids("data", "/filter/i");
  console.log("filter commands:", filterIds.join(","));
  await ev("window.__vnoAppInstance.grid.selectCell && window.__vnoAppInstance.grid.selectCell('A1')");
  if (filterIds.length) { await clickSel(`[data-command-id="${filterIds[0]}"]`); await sleep(600); }
  console.log("trang thai loc tren UI:", await ev("JSON.stringify({btns:document.querySelectorAll('.vno-filter-btn,.vno-autofilter-btn,[class*=filter-arrow],[class*=filter-btn]').length, af: !!(window.__vnoAppInstance.grid && (window.__vnoAppInstance.grid.autoFilter||window.__vnoAppInstance.grid.autoFilterRange)), freeze: window.__vnoAppInstance.grid && (window.__vnoAppInstance.grid.frozenRows||window.__vnoAppInstance.grid.freezeRows||null)})"));
  await ev("window.__vnoAppInstance.adapter.isDirty = true");
  const saved = await ev("window.__vnoAppInstance.adapter.save()");
  console.log("luu:", JSON.stringify(saved).slice(0, 160));
  await sleep(1500);
} finally { await session.close(); }
const dir = "E:\\VNOffice-profiles\\claude-s42\\x"; mkdirSync(dir, { recursive: true });
execFileSync("powershell", ["-NoProfile", "-Command", `Add-Type -A System.IO.Compression.FileSystem; $z=[IO.Compression.ZipFile]::OpenRead('${file}'); $e=$z.Entries | ?{ $_.FullName -like 'xl/worksheets/sheet1.xml' }; $r=New-Object IO.StreamReader($e.Open()); $x=$r.ReadToEnd(); $r.Close(); $z.Dispose(); [IO.File]::WriteAllText('${dir}\\sheet1.xml',$x)`]);
const xml = readFileSync(dir + "\\sheet1.xml", "utf8");
console.log("<pane> trong sheet1.xml:", /<pane\b[^>]*>/.exec(xml)?.[0] || "KHONG CO");
console.log("<autoFilter> trong sheet1.xml:", /<autoFilter\b[^>]*>/.exec(xml)?.[0] || "KHONG CO");