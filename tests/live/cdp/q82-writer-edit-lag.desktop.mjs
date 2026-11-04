import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [root, file, localAppData, outputPath] = process.argv.slice(2);
if (!root || !file || !localAppData) throw new Error("Usage: node --experimental-websocket q82-writer-edit-lag.desktop.mjs <root> <docx> <LOCALAPPDATA> [screenshot]");
process.env.VNO_APP_ROOT = root;
const { launchApp } = await import(pathToFileURL(path.join(root, "tests/live/cdp/session.mjs")).href);
const { press, mouseClick, sleep } = await import(pathToFileURL(path.join(root, "tests/live/cdp/actions.mjs")).href);
const session = await launchApp("writer", { filePath: file, localAppData, startTimeoutMilliseconds: 600000, readyTimeoutMilliseconds: 600000 });
const evaluate = expression => session.cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 120000 });
const frame = () => evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
let outcome;
try {
  await session.cdp.waitFor("!!(window.__vnoAppInstance?.adapter?.bodyDom?.innerText?.trim().length > 20)", { timeoutMilliseconds: 600000, intervalMilliseconds: 100 });
  await sleep(3500);
  const point = JSON.parse(await evaluate(`JSON.stringify((()=>{const body=window.__vnoAppInstance.adapter.bodyDom;const el=[...body.querySelectorAll('p')].find(p=>p.innerText.trim().length>10&&p.getBoundingClientRect().top>150&&p.getBoundingClientRect().bottom<innerHeight-40);const r=(el||body).getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+8)}})())`));
  await session.cdp.send("Page.enable");
  const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  if (outputPath) await fs.writeFile(outputPath, Buffer.from(shot.result.data, "base64"));
  await mouseClick(session.cdp, point.x, point.y);
  await frame();
  await evaluate(`(()=>{const a=window.__vnoAppInstance.adapter;a.__q82SnapshotCalls=0;a.__q82SnapshotCallers={};const old=a._snapshotBodyHtml.bind(a);a._snapshotBodyHtml=function(){this.__q82SnapshotCalls++;const caller=(new Error().stack||'').split('\\n').slice(2,6).map(x=>x.trim()).join(' <- ')||'unknown';this.__q82SnapshotCallers[caller]=(this.__q82SnapshotCallers[caller]||0)+1;return old()};window.__q82LongTasks=[];new PerformanceObserver(list=>list.getEntries().forEach(e=>window.__q82LongTasks.push(e.duration))).observe({entryTypes:['longtask']})})()`);
  const latency = [];
  for (const key of "kiem tra go phim muot") {
    const started = performance.now();
    await press(session.cdp, key === " " ? " " : key, {}, 0);
    await frame();
    latency.push(+(performance.now() - started).toFixed(1));
  }
  await sleep(1200);
  const observed = JSON.parse(await evaluate(`JSON.stringify((()=>{const a=window.__vnoAppInstance.adapter;const s=[...${JSON.stringify(latency)}].sort((x,y)=>x-y);return {latency:{n:s.length,p50:s[Math.floor(.5*s.length)],p95:s[Math.floor(.95*s.length)],max:s.at(-1)},snapshotCalls:a.__q82SnapshotCalls,snapshotCallers:a.__q82SnapshotCallers,longTasks:window.__q82LongTasks||[]}})())`));
  const failures = [];
  if (observed.latency.p95 > 50) failures.push(`p95 ${observed.latency.p95}ms > 50ms`);
  if (observed.latency.max > 100) failures.push(`max ${observed.latency.max}ms > 100ms`);
  if (observed.longTasks.some(ms => ms > 100)) failures.push(`${observed.longTasks.filter(ms => ms > 100).length} long tasks > 100ms`);
  if (observed.snapshotCalls > 3) failures.push(`${observed.snapshotCalls} full snapshots during one typing run > 3`);
  outcome = { status: failures.length ? "FAIL" : "PASS", point, ...observed, failures };
} catch (error) {
  outcome = { status: "ERROR", error: String(error?.stack || error) };
} finally {
  console.log(JSON.stringify(outcome));
  await session.close().catch(() => {});
}
if (outcome?.status !== "PASS") process.exitCode = 1;
