import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, mouseDoubleClick, press } from "./actions.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
const source = process.env.VNO_FIX_L8_SOURCE || "E:\\VN OFice\\file test\\sample-3.pptx";
if (!root || !localAppData) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const file = path.join(localAppData, "fix-l8-clipboard.pptx");
const evidence = path.resolve("docs/tickets-0710/evidence/fix-l8/home");
await fs.mkdir(localAppData, { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.copyFile(source, file);
const session = await launchApp("slides", { root, filePath: file, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const snapshot = () => session.cdp.evaluate(`JSON.stringify((()=>{const c=window.__vnoAppInstance.adapter.canvas,s=c.slides[c.currentSlideIndex],e=[...document.querySelectorAll('[data-shape-id]')].find(x=>x.textContent.trim());return{slides:c.slides.length,shapeCount:s.shapes.length,title:s.title,firstShapeText:s.shapes[0]?.text,liveText:e?.innerText,selection:window.getSelection()?.toString(),active:document.activeElement?.className}})())`);
const screenshot = async name => {
  const result = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(path.join(evidence, `${name}.png`), Buffer.from(result.result.data, "base64"));
};
try {
  const normalized = file.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(()=>{const a=window.__vnoAppInstance?.adapter,p=String(a?._sourcePath||a?.sourceFilePath||"").replace(/\\\\/g,"/").toLowerCase();return p===${JSON.stringify(normalized)}&&a?.canvas?.slides?.length>0})()`, { timeoutMilliseconds: 300000, intervalMilliseconds: 500 });
  const before = JSON.parse(await snapshot());
  const point = await session.cdp.evaluate(`(()=>{const e=[...document.querySelectorAll('[data-shape-id]')].find(x=>x.textContent.trim());if(!e)return null;const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  if (!point) throw new Error("No visible textbox in the loaded fixture.");
  await mouseDoubleClick(session.cdp, point.x, point.y);
  await press(session.cdp, "a", { ctrl: true }, 100);
  console.log("SELECTED", await snapshot());

  await click(session.cdp, '[data-command-id="common.edit.copy"]');
  console.log("COPIED", await snapshot());
  const clipboard = await session.cdp.evaluate("window.__vnoAppInstance.adapter._readClipboardData()", { awaitPromise: true });
  console.log("CLIPBOARD", clipboard);
  await click(session.cdp, '[data-command-id="common.edit.paste"]');
  await new Promise(resolve => setTimeout(resolve, 700));
  const afterPaste = JSON.parse(await snapshot());
  console.log("PASTED", JSON.stringify(afterPaste));
  const pastePassed = afterPaste.firstShapeText.replace(/\s/g, "") === before.firstShapeText.replace(/\s/g, "") && afterPaste.shapeCount === before.shapeCount;
  if (!pastePassed) throw new Error("Paste changed text/shape count unexpectedly: " + JSON.stringify({ before, afterPaste }));
  await screenshot("clipboard-paste");
  const pasteSaved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 600000 });
  if (!pasteSaved) throw new Error("Save after paste returned false.");
  const pasteFile = path.join(localAppData, "fix-l8-clipboard-paste.pptx");
  await fs.copyFile(file, pasteFile);

  const nextPoint = await session.cdp.evaluate(`(()=>{const e=[...document.querySelectorAll('[data-shape-id]')].find(x=>x.textContent.trim());if(!e)return null;const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  await mouseDoubleClick(session.cdp, nextPoint.x, nextPoint.y);
  await press(session.cdp, "a", { ctrl: true }, 100);
  await click(session.cdp, '[data-command-id="common.edit.cut"]');
  await new Promise(resolve => setTimeout(resolve, 500));
  const afterCut = JSON.parse(await snapshot());
  console.log("CUT", JSON.stringify(afterCut));
  if (afterCut.firstShapeText.trim() || afterCut.shapeCount !== before.shapeCount) throw new Error("Cut did not remove the selected text in place.");
  await screenshot("clipboard-cut");
  await fs.writeFile(path.join(evidence, "clipboard-cdp-readback.json"), JSON.stringify({ before, clipboard: { status: clipboard?.status, text: clipboard?.text, htmlLength: clipboard?.html?.length || 0, hasFragmentMarkers: /<!--\s*(?:Start|End)Fragment\s*-->/i.test(clipboard?.html || "") }, afterPaste, afterCut }, null, 2) + "\n", "utf8");

  const saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 600000 });
  if (!saved) throw new Error("Save returned false.");
  await session.cdp.waitFor("window.__vnoAppInstance.adapter.isDirty===false", { timeoutMilliseconds: 120000 });
  console.log("SAVED", JSON.stringify({ file, pasteFile, saved, before, afterPaste, afterCut }));
} finally {
  await session.close();
}
