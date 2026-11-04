import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [root, file, localAppData, outputDir] = process.argv.slice(2);
if (!root || !file || !localAppData || !outputDir) throw new Error("Usage: node --experimental-websocket q82-slides-scroll.desktop.mjs <root> <pptx> <LOCALAPPDATA> <screenshot-dir>");
process.env.VNO_APP_ROOT = root;
const { launchApp } = await import(pathToFileURL(path.join(root, "tests/live/cdp/session.mjs")).href);
const { mouseWheel, sleep } = await import(pathToFileURL(path.join(root, "tests/live/cdp/actions.mjs")).href);
const session = await launchApp("slides", { filePath: file, localAppData, startTimeoutMilliseconds: 600000, readyTimeoutMilliseconds: 600000 });
const evaluate = expression => session.cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 120000 });
const frame = () => evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
let outcome;
try {
  await session.cdp.waitFor("(()=>{const p=document.querySelector('.vno-document-open-progress');return !p||p.hidden})()", { timeoutMilliseconds: 600000, intervalMilliseconds: 100 });
  await sleep(2500);
  await fs.mkdir(outputDir, { recursive: true });
  await session.cdp.send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await sleep(250);
  await session.cdp.send("Page.enable");
  const capture = async name => {
    const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(path.join(outputDir, name), Buffer.from(shot.result.data, "base64"));
  };
  await capture("slides-before.png");
  const points = JSON.parse(await evaluate(`JSON.stringify((()=>{const app=window.__vnoAppInstance;const list=app.slideListContainer||app.canvas?.slideListContainer||document.querySelector('.vno-slide-thumb-list');const nav=app.navEl||app.canvas?.navEl||document.querySelector('.vno-slide-navigator');const canvas=app.canvasEl||app.canvas?.canvasEl||document.querySelector('.vno-slide-canvas');const stage=app.stageEl||app.canvas?.stageEl||document.querySelector('.vno-slide-stage');const pick=(el,fx,fy)=>{const r=el.getBoundingClientRect();return {x:Math.round(r.left+r.width*fx),y:Math.round(r.top+r.height*fy),rect:{x:r.x,y:r.y,width:r.width,height:r.height},scrollHeight:el.scrollHeight,clientHeight:el.clientHeight}};return {thumb:pick(nav,.5,.65),canvas:pick(canvas,.5,.5),thumbCount:list?.querySelectorAll('.vno-slide-thumb-item').length||0,slideCount:app.slides?.length||app.canvas?.slides?.length||0,scroll:{thumb:nav.scrollTop,canvas:stage.scrollTop}}})())`));
  await evaluate("window.__q82ScrollLongTasks=[];new PerformanceObserver(list=>list.getEntries().forEach(e=>window.__q82ScrollLongTasks.push(e.duration))).observe({entryTypes:['longtask']})");
  const runs = {};
  const scrollSamples = {};
  const scrollEnd = {};
  for (const area of ["thumb", "canvas"]) {
    const p = points[area];
    runs[area] = [];
    scrollSamples[area] = [];
    for (const delta of [700, 700, -700, -700]) {
      const started = performance.now();
      await mouseWheel(session.cdp, p.x, p.y, 0, delta);
      await frame();
      runs[area].push(+(performance.now() - started).toFixed(1));
      scrollSamples[area].push(await evaluate(`(()=>{const app=window.__vnoAppInstance;const el=${JSON.stringify(area)}==='thumb'?(app.navEl||app.canvas?.navEl||document.querySelector('.vno-slide-navigator')):(app.stageEl||app.canvas?.stageEl||document.querySelector('.vno-slide-stage'));return el.scrollTop})()`));
    }
    scrollEnd[area] = await evaluate(`(()=>{const app=window.__vnoAppInstance;const el=${JSON.stringify(area)}==='thumb'?(app.navEl||app.canvas?.navEl||document.querySelector('.vno-slide-navigator')):(app.stageEl||app.canvas?.stageEl||document.querySelector('.vno-slide-stage'));return el.scrollTop})()`);
    await capture(`slides-after-${area}.png`);
  }
  const longTasks = JSON.parse(await evaluate("JSON.stringify(window.__q82ScrollLongTasks||[])"));
  const failures = [];
  for (const area of ["thumb", "canvas"]) {
    if (new Set(scrollSamples[area]).size < 2) failures.push(`${area} wheel did not move its scroll region (${scrollSamples[area].join(",")})`);
  }
  if (longTasks.some(duration => duration > 100)) failures.push(`${longTasks.filter(duration => duration > 100).length} long tasks > 100ms`);
  outcome = { status: failures.length ? "FAIL" : "PASS", points, runs, scrollSamples, scrollEnd, longTasks, failures, screenshots: ["slides-before.png", "slides-after-thumb.png", "slides-after-canvas.png"] };
} catch (error) {
  outcome = { status: "ERROR", error: String(error?.stack || error) };
} finally {
  console.log(JSON.stringify(outcome));
  await session.close().catch(() => {});
}
if (outcome?.status !== "PASS") process.exitCode = 1;
