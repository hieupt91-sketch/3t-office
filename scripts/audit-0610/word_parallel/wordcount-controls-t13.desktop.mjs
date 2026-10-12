import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click } from "../../../tests/live/cdp/actions.mjs";

const root = process.env.VNO_APP_ROOT;
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!root || !profile) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const dir = path.join(profile, "wordcount-controls-t13");
const controls = ["plain", "repeated-spaces", "whitespace-only-run", "numbered-list", "table", "textbox", "manual-linebreak", "tab", "page-field", "special-chars", "empty"];
const rows = [];

for (const name of controls) {
  const session = await launchApp("writer", {
    root,
    filePath: path.join(dir, `${name}.docx`),
    localAppData: path.join(dir, "app-profiles", name),
    startTimeoutMilliseconds: 180000,
    readyTimeoutMilliseconds: 180000,
  });
  try {
    const cdp = session.cdp;
    await cdp.waitFor("!!window.__vnoAppInstance?.adapter && !!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 240000 });
    await click(cdp, "#vno-ribbon-tab-review");
    await cdp.waitFor("!!document.querySelector('[data-command-id=\"writer.review.wordCount\"]')", { timeoutMilliseconds: 60000 });
    await click(cdp, '[data-command-id="writer.review.wordCount"]');
    await cdp.waitFor("!!document.querySelector('#vno-wordcount-overlay [data-stat=\"charactersWithSpaces\"]')", { timeoutMilliseconds: 10000 });
    const stats = await cdp.evaluate(`(() => {const read=name=>Number((document.querySelector('#vno-wordcount-overlay [data-stat="'+name+'"]')?.textContent||'0').replace(/\\./g,''));return {words:read('words'),charactersNoSpaces:read('charactersNoSpaces'),charactersWithSpaces:read('charactersWithSpaces'),paragraphs:read('paragraphs'),lines:read('lines')}})()`);
    rows.push({ name, stats });
    console.log(JSON.stringify(rows[rows.length - 1]));
    const close = await cdp.evaluate("!!document.querySelector('#vno-wordcount-overlay .vno-dialog-ok-btn')");
    await click(cdp, close ? "#vno-wordcount-overlay .vno-dialog-ok-btn" : "#vno-wordcount-overlay .vno-dialog-close-btn");
  } finally {
    await session.close();
  }
}
await fs.writeFile(path.join(dir, "app-wordcount-controls-t13.json"), JSON.stringify(rows, null, 2), "utf8");
