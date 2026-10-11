import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, mouseDoubleClick, press } from "./actions.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
const source = process.env.VNO_FIX_L8_SOURCE || "E:\\VN OFice\\file test\\sample-3.pptx";
if (!root || !localAppData) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const file = path.join(localAppData, "fix-l8-highlight.pptx");
const evidence = path.resolve("docs/tickets-0710/evidence/fix-l8/home");
await fs.mkdir(localAppData, { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.copyFile(source, file);
const session = await launchApp("slides", { root, filePath: file, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const normalized = file.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(()=>{const a=window.__vnoAppInstance?.adapter,p=String(a?._sourcePath||a?.sourceFilePath||"").replace(/\\\\/g,"/").toLowerCase();return p===${JSON.stringify(normalized)}&&a?.canvas?.slides?.length>0})()`, { timeoutMilliseconds: 300000, intervalMilliseconds: 500 });
  const point = await session.cdp.evaluate(`(()=>{const e=[...document.querySelectorAll('[data-shape-id]')].find(x=>x.textContent.trim());if(!e)return null;const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  if (!point) throw new Error("No visible text shape in the loaded fixture.");
  await mouseDoubleClick(session.cdp, point.x, point.y);
  await press(session.cdp, "a", { ctrl: true }, 100);
  await click(session.cdp, '[data-command-id="slides.color.highlight"]');
  const result = await session.cdp.evaluate(`(()=>{const c=window.__vnoAppInstance.adapter.canvas,s=c.slides[c.currentSlideIndex],shape=s.shapes.find(x=>x.text);return{shapeText:shape?.text,html:shape?.textHtml,slides:c.slides.length,shapes:s.shapes.length}})()`);
  if (!String(result.html).includes("rgb(255, 205, 0)")) throw new Error("Ribbon highlight did not apply the default yellow to selected text: " + JSON.stringify(result));
  const screenshot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(path.join(evidence, "highlight.png"), Buffer.from(screenshot.result.data, "base64"));
  const saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 600000 });
  if (!saved) throw new Error("Save returned false.");
  console.log("HIGHLIGHT", JSON.stringify({ file, saved, ...result }));
} finally {
  await session.close();
}
