import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, press } from "./actions.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
const source = process.env.VNO_FIX_L8_SOURCE || "E:\\VN OFice\\file test\\sample-3.pptx";
if (!root || !localAppData) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const file = path.join(localAppData, "fix-l8-view-help.pptx");
const evidence = path.resolve("docs/tickets-0710/evidence/fix-l8/view");
await fs.mkdir(localAppData, { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.copyFile(source, file);
const session = await launchApp("slides", { root, filePath: file, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const read = () => session.cdp.evaluate(`JSON.stringify((()=>{const c=window.__vnoAppInstance.adapter.canvas,visible=s=>{const e=document.querySelector(s);return !!e&&!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length)};return{slides:c.slides.length,index:c.currentSlideIndex,presentationView:c.presentationView,isReadingView:c.isReadingView,zoom:c.zoomLevel,ruler:c.rulerVisible,gridlines:c.gridlinesVisible,guides:c.guidesVisible,show:!!document.querySelector('.vno-slideshow-overlay'),sorter:!!c.slideSorterOverlay,reading:!!c.readingOverlay,helpVisible:visible('#vno-help-panel'),aboutVisible:visible('.vno-about-backdrop'),printVisible:visible('.vno-print-dialog'),macroRecording:document.documentElement.dataset.macroRecording||null}})())`);
const shot = async name => {
  const result = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(path.join(evidence, `${name}.png`), Buffer.from(result.result.data, "base64"));
};
const clickCommand = async id => click(session.cdp, `[data-command-id="${id}"]`);
const result = {};
try {
  const normalized = file.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(()=>{const a=window.__vnoAppInstance?.adapter,p=String(a?._sourcePath||a?.sourceFilePath||"").replace(/\\\\/g,"/").toLowerCase();return p===${JSON.stringify(normalized)}&&a?.canvas?.slides?.length>0})()`, { timeoutMilliseconds: 300000, intervalMilliseconds: 500 });
  await click(session.cdp, "#vno-ribbon-tab-view");
  result.viewStart = JSON.parse(await read());
  await clickCommand("slides.view.slideSorter");
  result.sorter = JSON.parse(await read());
  await shot("sorter");
  await press(session.cdp, "Escape", {}, 250);
  result.sorterClosed = JSON.parse(await read());
  await clickCommand("slides.view.normal");
  result.normal = JSON.parse(await read());
  await clickCommand("slides.view.reading");
  result.reading = JSON.parse(await read());
  await shot("reading");
  await press(session.cdp, "Escape", {}, 250);
  result.afterReading = JSON.parse(await read());
  for (const [id,key] of [["slides.view.ruler","ruler"],["slides.view.gridlines","gridlines"],["slides.view.guides","guides"]]) {
    const before = JSON.parse(await read());
    await clickCommand(id);
    const on = JSON.parse(await read());
    await clickCommand(id);
    const restored = JSON.parse(await read());
    result[key] = { before, on, restored };
  }
  for (const [id,key] of [["slides.view.zoomIn","zoomIn"],["slides.view.zoomOut","zoomOut"],["slides.view.zoomReset","zoomReset"],["slides.view.fitToWindow","fitToWindow"]]) {
    await clickCommand(id);
    result[key] = JSON.parse(await read());
  }
  await clickCommand("slides.file.printPreview");
  result.printPreview = JSON.parse(await read());
  await shot("print-preview");
  await press(session.cdp,"Escape",{},250);
  await click(session.cdp,"#vno-ribbon-tab-help");
  await clickCommand("slides.help.open");
  result.help = JSON.parse(await read());
  await shot("help");
  await press(session.cdp,"Escape",{},250);
  await clickCommand("common.help.about");
  result.about = JSON.parse(await read());
  await shot("about");
  await press(session.cdp,"Escape",{},250);
  const saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 600000 });
  if (!saved) throw new Error("Save returned false.");
  result.file = file;
  result.saved = saved;
  await fs.writeFile(path.join(evidence,"view-help-cdp-readback.json"),JSON.stringify(result,null,2)+"\n","utf8");
  console.log(JSON.stringify(result));
} finally { await session.close(); }
