// D10: create a chart in the desktop app, save XLSX, reopen it in a new CDP session.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA to a fresh per-run profile.");
fs.mkdirSync(profile, { recursive: true });
const output = path.join(profile, "sheet-d10-chart.xlsx");
const evidence = path.join(profile, "evidence");
fs.mkdirSync(evidence, { recursive: true });
execFileSync("python", ["-c", [
  "import openpyxl,sys",
  "w=openpyxl.Workbook();s=w.active",
  "s['B1']='Tên hàng';s['C1']='Số lượng'",
  "[(s.cell(r,2,n),s.cell(r,3,v)) for r,(n,v) in enumerate([('Bút bi Thiên Long',120),('Sổ tay',85),('Bìa hồ sơ',200),('Thước kẻ',45)],2)]",
  "w.save(sys.argv[1])",
].join(";") , output], { stdio: "inherit" });

const checks = [];
const record = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass), detail: String(detail ?? "") });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name} | ${detail}`);
};
const snap = async (cdp, name) => {
  const result = await cdp.send("Page.captureScreenshot", { format: "png" }, 30000);
  fs.writeFileSync(path.join(evidence, name), Buffer.from((result.result || result).data, "base64"));
};
const ev = (cdp, expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 180000 });
let session = await launchApp("sheet", { filePath: output, localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  const grid = "window.__vnoAppInstance.grid";
  await cdp.waitFor(`${grid}.cellsData.get('C1')?.val === 'Số lượng'`, { timeoutMilliseconds: 180000 });
  await ev(cdp, `${grid}.insertChart('bar',{start:{c:'B',r:1},end:{c:'C',r:5}})`);
  await cdp.waitFor("document.querySelector('.vno-sheet-chart')", { timeoutMilliseconds: 30000 });
  await new Promise(resolve => setTimeout(resolve, 1500));
  const before = JSON.parse(await ev(cdp, `JSON.stringify({chart:${grid}.getCharts()[0],style:(()=>{const e=document.querySelector('.vno-sheet-chart');return e?{left:e.style.left,top:e.style.top,rect:(()=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}})(),outline:getComputedStyle(e).outline,active:document.activeElement?.className}:null})(),dataRight:document.querySelector('.vno-grid-cell[data-coord="C5"]')?.getBoundingClientRect().right,cells:['B1','C1','B2','C2'].map(a=>({a,v:${grid}.cellsData.get(a)?.val}))})`));
  await snap(cdp, "before-save.png");
  await ev(cdp, "[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Tối')?.click()");
  await new Promise(resolve => setTimeout(resolve, 500));
  await snap(cdp, "before-save-dark.png");
  await ev(cdp, "[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Sáng')?.click()");
  const saveState = JSON.parse(await ev(cdp, "JSON.stringify({sourceFilePath:window.__vnoAppInstance.adapter.sourceFilePath,sourceFileName:window.__vnoAppInstance.adapter.sourceFileName})"));
  const saved = await ev(cdp, "window.__vnoAppInstance.adapter.save()");
  record("Lưu XLSX từ desktop adapter", saved !== false && saved?.status !== "error", JSON.stringify({saved, ...saveState}));
  record("Trước lưu: nhãn chuỗi lấy từ C1", before.chart?.series?.[0]?.name === "Số lượng", JSON.stringify({name:before.chart?.series?.[0]?.name, labelCell:before.chart?.series?.[0]?.labelCell}));
  record("Trước lưu: biểu đồ không chồng vùng dữ liệu", Number(before.style?.rect?.x) >= Number(before.dataRight), JSON.stringify({style:before.style,dataRight:before.dataRight}));
  console.log(`BEFORE | ${JSON.stringify({style:before.style})}`);
} finally { await session.close(); }

session = await launchApp("sheet", { filePath: output, localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  const grid = "window.__vnoAppInstance.grid";
  await cdp.waitFor(`${grid}.getCharts().length > 0`, { timeoutMilliseconds: 180000 });
  await new Promise(resolve => setTimeout(resolve, 1000));
  const after = JSON.parse(await ev(cdp, `JSON.stringify({charts:${grid}.getCharts(),style:(()=>{const e=document.querySelector('.vno-sheet-chart');return e?{left:e.style.left,top:e.style.top,rect:(()=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}})(),outline:getComputedStyle(e).outline,active:document.activeElement?.className}:null})(),dashedDom:[...document.querySelectorAll('*')].map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return{tag:e.tagName,cls:String(e.className?.baseVal||e.className||''),rect:{x:r.x,y:r.y,width:r.width,height:r.height},outline:s.outline,border:s.border,stroke:e.getAttribute?.('stroke-dasharray')}}).filter(x=>/dashed|dotted/i.test(x.outline+' '+x.border)||x.stroke),dataRight:document.querySelector('.vno-grid-cell[data-coord="C5"]')?.getBoundingClientRect().right,cells:['B1','C1','B2','C2'].map(a=>({a,v:${grid}.cellsData.get(a)?.val}))})`));
  await snap(cdp, "after-reopen.png");
  await ev(cdp, "[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Tối')?.click()");
  await new Promise(resolve => setTimeout(resolve, 500));
  await snap(cdp, "after-reopen-dark.png");
  const reopened = after.charts[0];
  record("Mở lại: tên chuỗi vẫn là Số lượng", reopened?.series?.[0]?.name === "Số lượng", JSON.stringify({name:reopened?.series?.[0]?.name,labelCell:reopened?.series?.[0]?.labelCell,range:reopened?.range}));
  record("Mở lại: biểu đồ không chồng vùng dữ liệu", Number(after.style?.rect?.x) >= Number(after.dataRight), JSON.stringify({style:after.style,dataRight:after.dataRight}));
  const brokenPreview = JSON.parse(await ev(cdp, "JSON.stringify([...document.querySelectorAll('.vno-image-broken')].map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,title:e.title}}))"));
  record("Mở lại: không phủ chart bằng khung ảnh xem trước hỏng", brokenPreview.length === 0, JSON.stringify(brokenPreview));
  console.log(`AFTER | ${JSON.stringify(after)}`);
} finally { await session.close(); }

const failed = checks.filter(x => !x.pass).length;
console.log(`SUMMARY | ${checks.length-failed}/${checks.length} PASS | ${failed} FAIL | evidence=${evidence} | xlsx=${output}`);
fs.writeFileSync(path.join(evidence, "results.json"), JSON.stringify({ checks }, null, 2), "utf8");
if (failed) process.exitCode = 1;
