import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, mouseClick, mouseDoubleClick, press } from "./actions.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
const source = process.env.VNO_FIX_L8_SOURCE || "E:\\VN OFice\\file test\\sample-3.pptx";
if (!root || !localAppData) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const file = path.join(localAppData, "fix-l10-format-painter.pptx");
const evidence = path.resolve("docs/tickets-0710/evidence/fix-l10/home");
await fs.mkdir(localAppData, { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.copyFile(source, file);
const session = await launchApp("slides", { root, filePath: file, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const read = () => session.cdp.evaluate(`JSON.stringify((()=>{const c=window.__vnoAppInstance.adapter.canvas,s=c.slides[c.currentSlideIndex];return{slides:c.slides.length,selectedTarget:c.selectedTarget,formatPainter:c.formatPainter,shapes:s.shapes.filter(x=>x.text).map(x=>({id:x.id,text:x.text,textHtml:x.textHtml||""}))}})())`);
const screenshot = async name => {
  const result = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(path.join(evidence, `${name}.png`), Buffer.from(result.result.data, "base64"));
};
try {
  const normalized = file.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(()=>{const a=window.__vnoAppInstance?.adapter,p=String(a?._sourcePath||a?.sourceFilePath||"").replace(/\\\\/g,"/").toLowerCase();return p===${JSON.stringify(normalized)}&&a?.canvas?.slides?.length>0})()`, { timeoutMilliseconds: 300000, intervalMilliseconds: 500 });
  await click(session.cdp, "#vno-ribbon-tab-home");
  const sourceShape = await session.cdp.evaluate(`(()=>{const s=window.__vnoAppInstance.adapter.canvas.slides[0].shapes.filter(x=>x.text);const e=document.querySelector('[data-shape-id="'+CSS.escape(String(s[0].id))+'"]'),r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,id:String(s[0].id),text:s[0].text}})()`);
  const targetShape = await session.cdp.evaluate(`(()=>{const s=window.__vnoAppInstance.adapter.canvas.slides[0].shapes.filter(x=>x.text);const e=document.querySelector('[data-shape-id="'+CSS.escape(String(s[1].id))+'"]'),r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,id:String(s[1].id),text:s[1].text}})()`);
  if (!sourceShape || !targetShape) throw new Error("Text source/target shapes not found.");
  await mouseDoubleClick(session.cdp, sourceShape.x, sourceShape.y);
  await press(session.cdp, "a", { ctrl: true }, 120);
  await click(session.cdp, '[data-command-id="slides.edit.formatPainter"]');
  const armed = JSON.parse(await read());
  await screenshot("format-painter-armed");
  await mouseDoubleClick(session.cdp, targetShape.x, targetShape.y);
  const applied = JSON.parse(await read());
  await screenshot("format-painter-applied");
  const saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 600000 });
  if (!saved) throw new Error("Save returned false.");
  const result = { sourceShape, targetShape, armed, applied, saved, file };
  await fs.writeFile(path.join(evidence, "format-painter-cdp-readback.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(result));
} finally { await session.close(); }
