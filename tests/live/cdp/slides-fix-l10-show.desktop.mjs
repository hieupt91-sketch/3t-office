import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, press } from "./actions.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
const source = process.env.VNO_FIX_L8_SOURCE || "E:\\VN OFice\\file test\\sample-3.pptx";
if (!root || !localAppData) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const file = path.join(localAppData, "fix-l10-show.pptx");
const evidence = path.resolve("docs/tickets-0710/evidence/fix-l10/show");
await fs.mkdir(localAppData, { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.copyFile(source, file);
const session = await launchApp("slides", { root, filePath: file, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const read = () => session.cdp.evaluate(`JSON.stringify((()=>{const c=window.__vnoAppInstance.adapter.canvas;return{slides:c.slides.length,index:c.currentSlideIndex,show:!!document.querySelector('.vno-slideshow-overlay'),presenter:!!document.querySelector('.vno-presenter-overlay'),slideText:document.querySelector('.vno-slideshow-content')?.innerText||null,setupDialog:!!document.querySelector('[aria-labelledby="vno-setup-show-title"]'),settings:c.getSlideShowSettings?.()||null}})())`);
const screenshot = async name => {
  const result = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(path.join(evidence, `${name}.png`), Buffer.from(result.result.data, "base64"));
};
const command = id => click(session.cdp, `[data-command-id="${id}"]`);
const result = {};
try {
  const normalized = file.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(()=>{const a=window.__vnoAppInstance?.adapter,p=String(a?._sourcePath||a?.sourceFilePath||"").replace(/\\\\/g,"/").toLowerCase();return p===${JSON.stringify(normalized)}&&a?.canvas?.slides?.length>0})()`, { timeoutMilliseconds: 300000, intervalMilliseconds: 500 });
  result.file = file;
  await click(session.cdp, "#vno-ribbon-tab-slideshow");

  await command("slides.show.startFromBegin");
  await session.cdp.waitFor("!!document.querySelector('.vno-slideshow-overlay')", { timeoutMilliseconds: 30000 });
  result.startFromBegin = JSON.parse(await read()); await screenshot("start-from-begin");
  await press(session.cdp, "Escape", {}, 250);

  await click(session.cdp, '[data-slide-index="1"]');
  result.selectedSecondSlide = JSON.parse(await read());
  await command("slides.show.startFromCurrent");
  await session.cdp.waitFor("!!document.querySelector('.vno-slideshow-overlay')", { timeoutMilliseconds: 30000 });
  result.startFromCurrent = JSON.parse(await read()); await screenshot("start-from-current");
  await press(session.cdp, "Escape", {}, 250);

  await command("slides.show.presenterMode");
  await session.cdp.waitFor("!!document.querySelector('.vno-presenter-overlay')", { timeoutMilliseconds: 30000 });
  result.presenterMode = JSON.parse(await read()); await screenshot("presenter-mode");
  await press(session.cdp, "Escape", {}, 250);

  await command("slides.show.setupShow");
  await session.cdp.waitFor("!!document.querySelector('[aria-labelledby=\"vno-setup-show-title\"]')", { timeoutMilliseconds: 30000 });
  result.setupShowBefore = JSON.parse(await read()); await screenshot("setup-show");
  await click(session.cdp, "#vno-setup-loop");
  await click(session.cdp, "#vno-setup-ok");
  await session.cdp.waitFor("!document.querySelector('[aria-labelledby=\"vno-setup-show-title\"]')", { timeoutMilliseconds: 30000 });
  result.setupShowAfter = JSON.parse(await read());
  result.savedAfterSetup = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 600000 });
  if (!result.savedAfterSetup) throw new Error("Save returned false after setup-show change.");

  await command("slides.show.rehearseTimings");
  await session.cdp.waitFor("!!document.querySelector('.vno-slideshow-overlay')", { timeoutMilliseconds: 30000 });
  result.rehearseTimings = JSON.parse(await read()); await screenshot("rehearse-timings");

  await fs.writeFile(path.join(evidence, "show-cdp-readback.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(result));
} finally { await session.close(); }
