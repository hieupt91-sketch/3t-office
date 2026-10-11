import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, mouseDoubleClick, press } from "./actions.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
const source = process.env.VNO_FIX_L8_SOURCE || "E:\\VN OFice\\file test\\sample-3.pptx";
if (!root || !localAppData) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const file = path.join(localAppData, "fix-l8-indent-dec.pptx");
const evidence = path.resolve("docs/tickets-0710/evidence/fix-l8/home");
await fs.mkdir(localAppData, { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.copyFile(source, file);
const session = await launchApp("slides", { root, filePath: file, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const read = () => session.cdp.evaluate(`JSON.stringify((()=>{const a=window.__vnoAppInstance.adapter,c=a.canvas,s=c.slides[c.currentSlideIndex];return{slides:c.slides.length,shapes:s.shapes.length,selectedText:window.getSelection()?.toString(),textHtml:s.shapes.find(x=>x.text)?.textHtml,bodyHtml:s.bodyHtml}})())`);
try {
  const normalized = file.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(()=>{const a=window.__vnoAppInstance?.adapter,p=String(a?._sourcePath||a?.sourceFilePath||"").replace(/\\\\/g,"/").toLowerCase();return p===${JSON.stringify(normalized)}&&a?.canvas?.slides?.length>0})()`, { timeoutMilliseconds: 300000, intervalMilliseconds: 500 });
  const point = await session.cdp.evaluate(`(()=>{const e=[...document.querySelectorAll('[data-shape-id]')].find(x=>x.textContent.trim());const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  await mouseDoubleClick(session.cdp, point.x, point.y);
  await press(session.cdp, "a", { ctrl: true }, 100);
  const before = JSON.parse(await read());
  if (!before.selectedText) throw new Error("CDP did not select title text.");
  await click(session.cdp, '[data-command-id="slides.para.indentInc"]');
  const increased = JSON.parse(await read());
  await mouseDoubleClick(session.cdp, point.x, point.y);
  await press(session.cdp, "a", { ctrl: true }, 100);
  await click(session.cdp, '[data-command-id="slides.para.indentDec"]');
  const decreased = JSON.parse(await read());
  const saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 600000 });
  if (!saved) throw new Error("Save returned false.");
  await fs.writeFile(path.join(evidence, "indent-dec-cdp-readback.json"), JSON.stringify({ before, increased, decreased, file }, null, 2) + "\n", "utf8");
  console.log("INDENT", JSON.stringify({ before, increased, decreased, file, saved }));
} finally {
  await session.close();
}
