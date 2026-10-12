import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click } from "../../../tests/live/cdp/actions.mjs";

const root = process.env.VNO_APP_ROOT;
const profile = process.env.VNO_CDP_LOCALAPPDATA;
const corpus = process.env.VNO_DOCX_CORPUS || path.join(root || "", "file test", "landocx");
if (!root || !profile) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const names = ["d01.docx", "d02.docx", "d06.docx", "d07.docx", "d13.docx", "d20.docx", "d24.docx"];
const rows = [];

for (const name of names) {
  const session = await launchApp("writer", {
    root,
    filePath: path.join(corpus, name),
    localAppData: path.join(profile, "t13-corpus-profiles", path.parse(name).name),
    startTimeoutMilliseconds: 180000,
    readyTimeoutMilliseconds: 180000,
  });
  try {
    const cdp = session.cdp;
    await cdp.waitFor(`(() => {const a=window.__vnoAppInstance?.adapter;return String(a?._sourcePath||'').toLowerCase().endsWith(${JSON.stringify(name.toLowerCase())})})()`, { timeoutMilliseconds: 900000, intervalMilliseconds: 500 });
    await click(cdp, "#vno-ribbon-tab-review");
    await click(cdp, '[data-command-id="writer.review.wordCount"]');
    await cdp.waitFor("!!document.querySelector('#vno-wordcount-overlay [data-stat=\"charactersWithSpaces\"]')", { timeoutMilliseconds: 15000 });
    const stats = await cdp.evaluate(`(() => {const read=name=>Number((document.querySelector('#vno-wordcount-overlay [data-stat="'+name+'"]')?.textContent||'0').replace(/\\./g,''));return {words:read('words'),charactersNoSpaces:read('charactersNoSpaces'),charactersWithSpaces:read('charactersWithSpaces'),paragraphs:read('paragraphs'),lines:read('lines')}})()`);
    rows.push({ name, ...stats });
    console.log(JSON.stringify(rows[rows.length - 1]));
    await click(cdp, "#vno-wordcount-overlay .vno-dialog-ok-btn");
  } finally {
    await session.close();
  }
}
await fs.writeFile(path.join(profile, "fix-t13-app-word-count.json"), JSON.stringify(rows, null, 2), "utf8");
