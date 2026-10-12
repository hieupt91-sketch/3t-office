import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { readTargets } from "./client.mjs";
import { click, typeText, sleep } from "./actions.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
const source = process.env.VNO_FIX_L8_SOURCE || "E:\\VN OFice\\file test\\sample-3.pptx";
if (!root || !localAppData) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const file = path.join(localAppData, "fix-l13-view-macro.pptx");
const evidence = path.resolve("docs/tickets-0710/evidence/fix-l13/view");
await fs.mkdir(localAppData, { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.copyFile(source, file);
const session = await launchApp("slides", { root, filePath: file, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const read = () => session.cdp.evaluate(`JSON.stringify((()=>{const c=window.__vnoAppInstance.adapter.canvas;const indicator=document.querySelector('#vno-macro-status-indicator');return{slides:c.slides.length,index:c.currentSlideIndex,zoom:c.zoomLevel,macroRecording:document.body.classList.contains('vno-macro-is-recording'),indicatorVisible:!!indicator&&getComputedStyle(indicator).display!=='none'&&indicator.getClientRects().length>0,manager:!!document.querySelector('.vno-macro-list')}})())`);
const screenshot = async name => {
  const result = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(path.join(evidence, `${name}.png`), Buffer.from(result.result.data, "base64"));
};
const command = id => click(session.cdp, `[data-command-id="${id}"]`);
const result = { file };
try {
  const normalized = file.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(()=>{const a=window.__vnoAppInstance?.adapter,p=String(a?._sourcePath||a?.sourceFilePath||"").replace(/\\\\/g,"/").toLowerCase();return p===${JSON.stringify(normalized)}&&a?.canvas?.slides?.length>0})()`, { timeoutMilliseconds: 300000, intervalMilliseconds: 500 });
  await click(session.cdp, "#vno-ribbon-tab-view");
  result.viewBefore = JSON.parse(await read());
  const pagesBefore = (await readTargets(session.debugPort)).filter(x => x.type === "page").length;
  await session.cdp.evaluate(`(() => { const c=window.__vnoAppInstance.adapter.canvas, original=c.newWindow.bind(c); window.__l13NewWindowResult=null; c.newWindow=()=>{const result=original();window.__l13NewWindowResult=result;return result}; })()`);
  await command("slides.view.newWindow");
  await sleep(500);
  const pagesAfter = (await readTargets(session.debugPort)).filter(x => x.type === "page").length;
  result.newWindow = { pagesBefore, pagesAfter, commandResult: await session.cdp.evaluate("window.__l13NewWindowResult"), state: JSON.parse(await read()), status: await session.cdp.evaluate("document.querySelector('#vno-status-docinfo')?.innerText||''") };
  await screenshot("new-window");

  await command("common.macro.recordToggle");
  result.recordingStarted = JSON.parse(await read()); await screenshot("macro-recording");
  await command("slides.view.zoomIn");
  result.recordedStep = JSON.parse(await read());
  await command("common.macro.recordToggle");
  await session.cdp.waitFor("!!document.querySelector('.vno-dialog-input')", { timeoutMilliseconds: 30000 });
  await click(session.cdp, ".vno-dialog-input");
  await typeText(session.cdp, "FIX-L10 Macro", 20);
  await click(session.cdp, ".vno-dialog-ok-btn");
  await session.cdp.waitFor("!document.querySelector('.vno-dialog-input')", { timeoutMilliseconds: 30000 });
  result.recordingStopped = JSON.parse(await read());
  await command("common.macro.manager");
  await session.cdp.waitFor("!!document.querySelector('.vno-macro-list')", { timeoutMilliseconds: 30000 });
  result.managerOpen = { state: JSON.parse(await read()), rows: await session.cdp.evaluate("[...document.querySelectorAll('.vno-macro-row .vno-macro-name')].map(x=>x.textContent)") };
  await screenshot("macro-manager");
  await click(session.cdp, ".vno-macro-close-btn");
  result.saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 600000 });
  if (!result.saved) throw new Error("Save returned false.");
  await fs.writeFile(path.join(evidence, "view-macro-cdp-readback.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(result));
} finally { await session.close(); }
