import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, press, typeText } from "./actions.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
const source = process.env.VNO_FIX_L8_SOURCE || "E:\\VN OFice\\file test\\sample-3.pptx";
if (!root || !localAppData) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const file = path.join(localAppData, "fix-l8-find-replace.pptx");
const evidence = path.resolve("docs/tickets-0710/evidence/fix-l8/home");
await fs.mkdir(localAppData, { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.copyFile(source, file);
const session = await launchApp("slides", { root, filePath: file, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const snapshot = () => session.cdp.evaluate(`JSON.stringify((()=>{const c=window.__vnoAppInstance.adapter.canvas,s=c.slides[c.currentSlideIndex];return{slides:c.slides.length,index:c.currentSlideIndex,title:s.title,body:s.body,body2:s.body2,shapeTexts:s.shapes.filter(x=>x.text).map(x=>x.text),selection:window.getSelection()?.toString(),findState:c._findState||null,status:document.querySelector('#vno-fr-status')?.textContent||''}})())`);
const screenshot = async name => {
  const result = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(path.join(evidence, `${name}.png`), Buffer.from(result.result.data, "base64"));
};
try {
  const normalized = file.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(()=>{const a=window.__vnoAppInstance?.adapter,p=String(a?._sourcePath||a?.sourceFilePath||"").replace(/\\\\/g,"/").toLowerCase();return p===${JSON.stringify(normalized)}&&a?.canvas?.slides?.length>0})()`, { timeoutMilliseconds: 300000, intervalMilliseconds: 500 });
  const clearInput = async selector => { await click(session.cdp, selector); await press(session.cdp, "Home", {}, 50); await press(session.cdp, "End", { shift: true }, 50); await press(session.cdp, "Backspace", {}, 50); };
  await click(session.cdp, '[data-command-id="common.edit.find"]');
  await session.cdp.waitFor('!!document.querySelector("#vno-fr-find-input")', { timeoutMilliseconds: 10000 });
  await clearInput("#vno-fr-find-input");
  await typeText(session.cdp, "ROAD TRIP", 10);
  await click(session.cdp, "#vno-fr-find-next-btn");
  await new Promise(resolve => setTimeout(resolve, 300));
  const find = JSON.parse(await snapshot());
  console.log("FIND", JSON.stringify(find));
  await screenshot("find-result");
  await click(session.cdp, "#vno-fr-close-btn");

  await click(session.cdp, '[data-command-id="common.edit.replace"]');
  await session.cdp.waitFor('!!document.querySelector("#vno-fr-replace-input")', { timeoutMilliseconds: 10000 });
  await clearInput("#vno-fr-find-input");
  await typeText(session.cdp, "Your Name", 10);
  await clearInput("#vno-fr-replace-input");
  await typeText(session.cdp, "Presenter", 10);
  console.log("REPLACE_FIELDS", await session.cdp.evaluate(`JSON.stringify({find:document.querySelector('#vno-fr-find-input')?.value,replace:document.querySelector('#vno-fr-replace-input')?.value,visible:document.querySelector('#vno-fr-replace-row')?.style.display})`));
  await click(session.cdp, "#vno-fr-replace-all-btn");
  await new Promise(resolve => setTimeout(resolve, 500));
  const replace = JSON.parse(await snapshot());
  console.log("REPLACE", JSON.stringify(replace));
  if (![replace.title, replace.body, replace.body2, ...replace.shapeTexts].some(text => String(text || "").includes("Presenter"))) {
    throw new Error("Replace All did not change the saved model text.");
  }
  await screenshot("replace-result");
  const saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 600000 });
  if (!saved) throw new Error("Save returned false.");
  await fs.writeFile(path.join(evidence, "find-replace-cdp-readback.json"), JSON.stringify({ find, replace, file }, null, 2) + "\n", "utf8");
  console.log("SAVED", JSON.stringify({ file, saved }));
} finally {
  await session.close();
}
