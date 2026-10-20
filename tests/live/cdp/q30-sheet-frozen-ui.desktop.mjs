import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp } from "./session.mjs";

const evidenceDir = path.resolve("docs/assets/q30-ui");
await fs.mkdir(evidenceDir, { recursive: true });
const root = await fs.mkdtemp(path.join(os.tmpdir(), "vno-q30-sheet-"));
const file = process.env.VNO_Q30_FILE || path.join(root, "frozen-header.xlsx");
const localAppData = path.join(root, "localappdata");
if (!process.env.VNO_Q30_FILE) execFileSync("python", ["-c", String.raw`import sys
from openpyxl import Workbook
from openpyxl.styles import PatternFill, Font
from openpyxl.worksheet.datavalidation import DataValidation
w=Workbook(); s=w.active
for c in range(1,8):
 x=s.cell(1,c,f'Header {c}'); x.fill=PatternFill('solid',fgColor='A5A5A5'); x.font=Font(color='FFFFFF',bold=True)
for r in range(2,61):
 for c in range(1,8): s.cell(r,c,f'Body {r}-{c}')
dv=DataValidation(type='list',formula1='"Thu,Chi"'); s.add_data_validation(dv); dv.add('C2:F20')
s.freeze_panes='B2'; s.sheet_view.showGridLines=False
w.save(sys.argv[1])`, file], { stdio: "inherit" });

const session = await launchApp("sheet", { filePath: file, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const cdp = session.cdp;
const results = [];
try {
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size >= 420", { timeoutMilliseconds: 30000 });
  const target = await cdp.send("Browser.getWindowForTarget", {});
  const windowId = (target.result || target).windowId;
  await cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal", width: 1366, height: 768 } });
  const initial = await cdp.evaluate(`(() => {
    const cells=[...document.querySelectorAll('.vno-grid-cell')].filter(e=>/^([A-G])1$/.test(e.dataset.coord||''));
    return cells.map(e=>({coord:e.dataset.coord,inline:e.style.backgroundColor,computed:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,rect:(()=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()}));
  })()`);
  const suffix = process.env.VNO_Q30_SCREENSHOT_SUFFIX || "after";
  const initialPath = path.join(evidenceDir, `frozen-header-${suffix}.png`);
  const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
  await fs.writeFile(initialPath, Buffer.from((shot.result || shot).data, "base64"));
  const expected = "rgb(165, 165, 165)";
  const blank = await cdp.evaluate(`(() => {const e=document.querySelector('.vno-grid-cell[data-coord="H1"]'); return e ? {inline:e.style.backgroundColor,computed:getComputedStyle(e).backgroundColor} : null})()`);
  const good = initial.length === 7 && initial.every(x => x.computed === expected) && Boolean(blank?.computed) && !blank.computed.startsWith("rgba(");
  results.push({ name: "frozen header preserves cell fill", pass: good, cells: initial, screenshot: initialPath });
  console.log(`${good ? "PASS" : "FAIL"} | frozen header preserves cell fill | ${JSON.stringify(initial)}`);
  console.log(`INFO | unfilled frozen cell remains opaque | ${JSON.stringify(blank)}`);
  const viewport = await cdp.evaluate(`document.querySelector('.vno-grid-viewport')?.scrollTo({top:260,left:420}); true`);
  await new Promise(resolve => setTimeout(resolve, 350));
  const scrolled = await cdp.evaluate(`(() => ({scrollTop:document.querySelector('.vno-grid-viewport')?.scrollTop,scrollLeft:document.querySelector('.vno-grid-viewport')?.scrollLeft,header:[...document.querySelectorAll('.vno-grid-cell')].filter(e=>/^([A-G])1$/.test(e.dataset.coord||'')).map(e=>getComputedStyle(e).backgroundColor)}))()`);
  const scrollShot = await cdp.send("Page.captureScreenshot", { format: "png" });
  await fs.writeFile(path.join(evidenceDir, `frozen-header-scrolled-${suffix}.png`), Buffer.from((scrollShot.result || scrollShot).data, "base64"));
  const scrollGood = scrolled.scrollTop > 0 && scrolled.scrollLeft > 0 && scrolled.header.length === 7 && scrolled.header.every(x => x === expected);
  results.push({ name: "frozen row and column remain opaque after two-axis scroll", pass: scrollGood, detail: scrolled });
  console.log(`${scrollGood ? "PASS" : "FAIL"} | frozen row and column after scroll | ${JSON.stringify(scrolled)}`);
  await cdp.evaluate(`document.documentElement.setAttribute('data-theme','dark')`);
  await new Promise(resolve => setTimeout(resolve, 150));
  const dark = await cdp.evaluate(`(() => ({header:[...document.querySelectorAll('.vno-grid-cell')].filter(e=>/^([A-G])1$/.test(e.dataset.coord||'')).map(e=>getComputedStyle(e).backgroundColor),blank:getComputedStyle(document.querySelector('.vno-grid-cell[data-coord="H1"]')).backgroundColor}))()`);
  const darkShot = await cdp.send("Page.captureScreenshot", { format: "png" });
  await fs.writeFile(path.join(evidenceDir, `frozen-header-dark-${suffix}.png`), Buffer.from((darkShot.result || darkShot).data, "base64"));
  const darkGood = dark.header.length === 7 && dark.header.every(x => x === expected) && !dark.blank.startsWith("rgba(");
  results.push({ name: "dark frozen header preserves fill", pass: darkGood, detail: dark });
  console.log(`${darkGood ? "PASS" : "FAIL"} | dark frozen header preserves fill | ${JSON.stringify(dark)}`);
  const metrics = await cdp.evaluate(`(() => {
    const all=[...document.querySelectorAll('.vno-grid-cell')];
    const validation=all.filter(e=>e.classList.contains('has-validation')).map(e=>({coord:e.dataset.coord,arrow:getComputedStyle(e,'::after').content,selected:e.classList.contains('is-selected'),hovered:e.matches(':hover')}));
    const rows=[...document.querySelectorAll('tr')].filter(e=>e.querySelector('.vno-grid-cell')).slice(0,20).map(e=>({row:e.dataset.row,height:e.getBoundingClientRect().height,scroll:e.scrollHeight,client:e.clientHeight,notes:e.querySelectorAll('.has-comment,.has-note').length,wrapped:[...e.querySelectorAll('.vno-grid-cell')].some(c=>getComputedStyle(c).whiteSpace==='normal')}));
    return {validation:validation.slice(0,30),validationCount:validation.length,rows};
  })()`);
  console.log(`INFO | validation arrows and row heights | ${JSON.stringify(metrics)}`);
  if (!good || !scrollGood || !darkGood) process.exitCode = 1;
} finally {
  await session.close();
  await fs.rm(root, { recursive: true, force: true });
}
