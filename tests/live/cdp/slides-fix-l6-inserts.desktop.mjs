import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp } from "./session.mjs";
import { click, press, typeText } from "./actions.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!root || !localAppData) throw new Error("Set VNO_APP_ROOT and dedicated VNO_CDP_LOCALAPPDATA.");
const input = path.join(localAppData, "template.pptx");
const output = path.join(localAppData, "fix-l6-inserts.pptx");
const evidenceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../docs/tickets-0710/evidence/fix-l6");
await fs.copyFile(input, output);
const session = await launchApp("slides", { root, filePath: output, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const screenshot = async name => {
  await fs.mkdir(evidenceDir, { recursive: true });
  const result = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(path.join(evidenceDir, `${name}.png`), Buffer.from(result.result.data, "base64"));
};
const count = () => session.cdp.evaluate(`JSON.stringify((()=>{const c=window.__vnoAppInstance.adapter.canvas,s=c.slides[c.currentSlideIndex];return {count:s.shapes.length,shapes:s.shapes.map(x=>({id:x.id,type:x.type,text:x.text||"",rows:x.rows||0,cols:x.cols||0,chartType:x.chartType||null,diagramGroupId:x.diagramGroupId||null,x:x.x,y:x.y,w:x.w,h:x.h}))}})())`);
try {
  await session.cdp.waitFor(`window.__vnoAppInstance?.adapter?.sourceFilePath === ${JSON.stringify(output)}`, { timeoutMilliseconds: 180000 });
  await session.cdp.waitFor("window.__vnoAppInstance?.adapter?.canvas?.slides?.length > 0", { timeoutMilliseconds: 180000 });
  console.log(`CDP_PORT ${session.debugPort} | PROFILE ${localAppData} | ROOT ${root}`);
  await click(session.cdp, "#vno-ribbon-tab-insert");

  const beforeTable = JSON.parse(await count()).count;
  await click(session.cdp, '[data-command-id="slides.insert.table"]');
  await session.cdp.waitFor('!!document.querySelector("#vno-slide-table-rows")', { timeoutMilliseconds: 30000 });
  await screenshot("insert-table-dialog");
  await click(session.cdp, ".vno-dialog-ok-btn");
  await session.cdp.waitFor(`window.__vnoAppInstance.adapter.canvas.slides[0].shapes.length === ${beforeTable + 1}`, { timeoutMilliseconds: 30000 });
  console.log("TABLE " + await count());
  await screenshot("insert-table");

  const beforeDiagram = JSON.parse(await count()).count;
  await click(session.cdp, '[data-command-id="slides.diagram.insert"]');
  await session.cdp.waitFor('!!document.querySelector("#vno-diagram-insert")', { timeoutMilliseconds: 30000 });
  await click(session.cdp, "#vno-diagram-insert");
  await session.cdp.waitFor(`window.__vnoAppInstance.adapter.canvas.slides[0].shapes.length > ${beforeDiagram}`, { timeoutMilliseconds: 30000 });
  console.log("SMARTART " + await count());
  await screenshot("insert-smartart");

  const beforeChart = JSON.parse(await count()).count;
  await click(session.cdp, '[data-command-id="slides.insert.chart"]');
  await session.cdp.waitFor('!!document.querySelector("[data-chart-apply]")', { timeoutMilliseconds: 30000 });
  await screenshot("insert-chart-dialog");
  await click(session.cdp, "[data-chart-apply]");
  await session.cdp.waitFor(`window.__vnoAppInstance.adapter.canvas.slides[0].shapes.length === ${beforeChart + 1}`, { timeoutMilliseconds: 30000 });
  console.log("CHART " + await count());
  await screenshot("insert-chart");

  const beforeText = JSON.parse(await count()).count;
  await click(session.cdp, '[data-command-id="slides.text.insert"]');
  await session.cdp.waitFor(`window.__vnoAppInstance.adapter.canvas.slides[0].shapes.length === ${beforeText + 1}`, { timeoutMilliseconds: 30000 });
  const editor = await session.cdp.evaluate(`(() => {const c=window.__vnoAppInstance.adapter.canvas,s=c.slides[c.currentSlideIndex],x=s.shapes.at(-1);return !!document.querySelector('[data-shape-text-id="'+CSS.escape(String(x.id))+'"][contenteditable="true"]')})()`);
  if (!editor) throw new Error("Textbox was not placed in text editing mode after insertion.");
  await typeText(session.cdp, "FIX-L6 TEXTBOX");
  console.log("TEXTBOX " + await count());
  await screenshot("insert-textbox");

  await press(session.cdp, "s", { ctrl: true }, 1200);
  const saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 600000 });
  if (!saved) throw new Error("SlidesAdapter.save() returned false.");
  await session.cdp.waitFor("window.__vnoAppInstance.adapter.isDirty === false", { timeoutMilliseconds: 120000 });
  console.log("SAVED " + JSON.stringify({ saved, output, state: await count() }));
} finally {
  await session.close();
}
