import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, press } from "./actions.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
const source = process.env.VNO_FIX_L8_SOURCE || "E:\\VN OFice\\file test\\sample-3.pptx";
if (!root || !localAppData) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const file = path.join(localAppData, "fix-l13-spellcheck.pptx");
const evidence = path.resolve("docs/tickets-0710/evidence/fix-l13/review");
await fs.mkdir(localAppData, { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.copyFile(source, file);
const session = await launchApp("slides", { root, filePath: file, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const read = () => session.cdp.evaluate(`JSON.stringify((()=>{const c=window.__vnoAppInstance.adapter.canvas;return{slides:c.slides.length,index:c.currentSlideIndex,spellcheckEnabled:c.spellcheckController?.enabled??null,spellDialog:!!document.querySelector('.vno-slides-spellcheck-dialog'),spellState:document.querySelector('.vno-slides-spellcheck-dialog')?.dataset.spellcheckState||null,spellWord:document.querySelector('.vno-slides-spellcheck-dialog')?.dataset.spellWord||null}})())`);
const screenshot = async name => {
  const result = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(path.join(evidence, `${name}.png`), Buffer.from(result.result.data, "base64"));
};
const command = id => click(session.cdp, `[data-command-id="${id}"]`);
const result = { file };
try {
  const normalized = file.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(()=>{const a=window.__vnoAppInstance?.adapter,p=String(a?._sourcePath||a?.sourceFilePath||"").replace(/\\\\/g,"/").toLowerCase();return p===${JSON.stringify(normalized)}&&a?.canvas?.slides?.length>0})()`, { timeoutMilliseconds: 300000, intervalMilliseconds: 500 });
  await click(session.cdp, "#vno-ribbon-tab-review");
  result.before = JSON.parse(await read());
  await command("slides.review.toggleSpellCheck");
  result.toggled = JSON.parse(await read());
  await command("slides.review.toggleSpellCheck");
  result.restored = JSON.parse(await read());
  await command("slides.review.spellCheck");
  await session.cdp.waitFor("!!document.querySelector('.vno-slides-spellcheck-dialog')", { timeoutMilliseconds: 30000 });
  await session.cdp.waitFor("!!document.querySelector('.vno-slides-spellcheck-dialog [data-spellcheck-state]')", { timeoutMilliseconds: 30000 }).catch(() => {});
  result.dialog = JSON.parse(await read()); await screenshot("spellcheck-dialog");
  await press(session.cdp, "Escape", {}, 200);
  result.closed = JSON.parse(await read());
  result.saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 600000 });
  if (!result.saved) throw new Error("Save returned false.");
  await fs.writeFile(path.join(evidence, "spellcheck-cdp-readback.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(result));
} finally { await session.close(); }
