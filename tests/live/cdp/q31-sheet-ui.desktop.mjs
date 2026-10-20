import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";

const input = process.env.VNO_Q31_INPUT;
const out = process.env.VNO_Q31_OUT;
const profileRoot = process.env.VNO_CDP_LOCALAPPDATA_ROOT;
if (!input || !out || !profileRoot) throw new Error("Set fresh VNO_Q31_INPUT, VNO_Q31_OUT and VNO_CDP_LOCALAPPDATA_ROOT");
await fs.mkdir(out, { recursive: true });
await fs.mkdir(profileRoot, { recursive: true });
const session = await launchApp("sheet", {
  filePath: input,
  localAppData: path.join(profileRoot, "sheet-ui"),
  startTimeoutMilliseconds: 180000,
  readyTimeoutMilliseconds: 180000
});
const checks = [];
const check = (name, ok, detail) => {
  checks.push({ name, pass: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | ${JSON.stringify(detail)}`);
};
const screenshot = async name => {
  const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(path.join(out, `${name}.png`), Buffer.from(shot.result.data, "base64"));
};

try {
  await session.cdp.send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await session.cdp.waitFor("!!window.__vnoAppInstance?.grid", { timeoutMilliseconds: 30000 });
  await session.cdp.waitFor("!!window.__vnoAppInstance?.grid?.getCharts?.().length", { timeoutMilliseconds: 120000 });
  const chartModels = await session.cdp.evaluate("JSON.stringify(window.__vnoAppInstance.grid.getCharts().map(c=>({id:c.id,type:c.type,x:c.x,y:c.y,range:c.range,title:c.title,series:c.series?.map(s=>({name:s.name,type:s.chartType,axis:s.axisGroup}))})))");
  console.log(`CHART_MODELS ${chartModels}`);
  await session.cdp.evaluate("window.__vnoAppInstance.grid.renderCharts()");
  await session.cdp.waitFor("document.querySelectorAll('.vno-sheet-chart svg').length > 0", { timeoutMilliseconds: 30000 });
  await session.cdp.evaluate("document.querySelector('.vno-grid-viewport')?.scrollTo({left:700,top:0})");
  const anchorRects = JSON.parse(await session.cdp.evaluate(`JSON.stringify([...document.querySelectorAll('.vno-sheet-chart')].map(p=>{const r=p.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}}))`));
  const uniquePositions = new Set(anchorRects.map(r => `${Math.round(r.x)},${Math.round(r.y)}`));
  check("Neo hai chart khong dung chung toa do", anchorRects.length >= 2 && uniquePositions.size >= 2, anchorRects);
  const comboView = JSON.parse(await session.cdp.evaluate(`JSON.stringify((()=>{const g=window.__vnoAppInstance.grid;const c=g.getCharts().find(x=>x.type==='combo');const p=[...document.querySelectorAll('.vno-sheet-chart')].find(x=>x.dataset.chartId===c?.id);return {type:c?.type,series:c?.series?.map(s=>s.chartType),secondaryTicks:p?.querySelectorAll('[data-axis="secondary-value-label"]').length||0,lines:p?.querySelectorAll('[data-series-type="line"]').length||0,bars:p?.querySelectorAll('[data-series-type="bar"]').length||0}})())`));
  check("Combo mo lai co cot, duong va truc phu", comboView.type === "combo" && comboView.secondaryTicks === 5 && comboView.lines === 2 && comboView.bars === 4, comboView);
  const viewport = await session.cdp.evaluate("JSON.stringify({width:innerWidth,height:innerHeight})");
  check("Kích thước kiểm tra 1366×768", JSON.parse(viewport).width === 1366 && JSON.parse(viewport).height === 768, JSON.parse(viewport));
  await new Promise(resolve => setTimeout(resolve, 2500));
  await screenshot("light-combo");
  const light = JSON.parse(await session.cdp.evaluate(`JSON.stringify([...document.querySelectorAll('.vno-sheet-chart')].map(p=>({
    rect:(()=>{const r=p.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}})(),
    background:getComputedStyle(p).backgroundColor,
    overflow:getComputedStyle(p).overflow
  })))`));
  check("Biểu đồ sáng giữ kích thước khung và cắt nội dung đúng", light.every(x=>x.rect.width===520&&x.rect.height===300&&x.overflow==="hidden"), light);
  await session.cdp.evaluate("document.querySelector('.vno-grid-viewport')?.scrollTo({left:700,top:300})");
  await new Promise(resolve => setTimeout(resolve, 250));
  await screenshot("light-pie");

  await session.cdp.evaluate("document.querySelector('#vno-toggle-theme-btn')?.click()");
  await session.cdp.waitFor("document.documentElement.dataset.theme === 'dark'", { timeoutMilliseconds: 10000 });
  await session.cdp.evaluate("window.__vnoAppInstance.grid.renderCharts()");
  await new Promise(resolve => setTimeout(resolve, 500));
  await session.cdp.evaluate("document.querySelector('.vno-grid-viewport')?.scrollTo({left:700,top:0})");
  await new Promise(resolve => setTimeout(resolve, 250));
  await screenshot("dark-combo");
  const dark = JSON.parse(await session.cdp.evaluate(`JSON.stringify([...document.querySelectorAll('.vno-sheet-chart')].map(p=>({
    rect:(()=>{const r=p.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}})(),
    background:getComputedStyle(p).backgroundColor,
    overflow:getComputedStyle(p).overflow
  })))`));
  check("Biểu đồ tối dùng nền theo theme, giữ khung và cắt nội dung đúng", dark.every(x=>x.rect.width===520&&x.rect.height===300&&x.background!=="rgb(255, 255, 255)"&&x.overflow==="hidden"), dark);
  await session.cdp.evaluate("document.querySelector('.vno-grid-viewport')?.scrollTo({left:700,top:300})");
  await new Promise(resolve => setTimeout(resolve, 250));
  await screenshot("dark-pie");
} finally {
  await session.close().catch(() => {});
}
const failed = checks.filter(x => !x.pass);
console.log(`SUMMARY ${checks.length-failed.length}/${checks.length} PASS | ${failed.length} FAIL | ${checks.length} total | ${out}`);
if (failed.length) process.exitCode = 1;
