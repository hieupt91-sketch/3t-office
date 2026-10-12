import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click } from "../../../tests/live/cdp/actions.mjs";

const root = process.env.VNO_APP_ROOT;
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!root || !profile) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const dir = path.join(profile, "wordcount-controls-t13");
const allControls = ["plain", "repeated-spaces", "whitespace-only-run", "numbered-list", "table", "textbox", "manual-linebreak", "tab", "page-field", "special-chars", "empty"];
const selectedControls = (process.env.VNO_WORDCOUNT_CASES || "").split(",").map(value => value.trim()).filter(Boolean);
const controls = selectedControls.length ? selectedControls : allControls;
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
    await cdp.waitFor(`(() => {const a=window.__vnoAppInstance?.adapter;return String(a?._sourcePath||'').toLowerCase().endsWith(${JSON.stringify(`${name}.docx`.toLowerCase())})})()`, { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
    await click(cdp, "#vno-ribbon-tab-review");
    await cdp.waitFor("!!document.querySelector('[data-command-id=\"writer.review.wordCount\"]')", { timeoutMilliseconds: 60000 });
    await click(cdp, '[data-command-id="writer.review.wordCount"]');
    await cdp.waitFor("!!document.querySelector('#vno-wordcount-overlay [data-stat=\"charactersWithSpaces\"]')", { timeoutMilliseconds: 10000 });
    const result = await cdp.evaluate(`(() => {const read=name=>Number((document.querySelector('#vno-wordcount-overlay [data-stat="'+name+'"]')?.textContent||'0').replace(/\\./g,''));const b=document.querySelector('.vno-writer-body');const walker=document.createTreeWalker(b,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode()){const n=walker.currentNode;nodes.push({value:n.nodeValue,parent:n.parentElement?.tagName,classes:n.parentElement?.className})}return {stats:{words:read('words'),charactersNoSpaces:read('charactersNoSpaces'),charactersWithSpaces:read('charactersWithSpaces'),paragraphs:read('paragraphs'),lines:read('lines')},detail:{innerText:b.innerText,textContent:b.textContent,textNodes:nodes,html:b.innerHTML.slice(0,5000)}}})()`);
    rows.push({ name, ...result });
    console.log(JSON.stringify(rows[rows.length - 1]));
    const close = await cdp.evaluate("!!document.querySelector('#vno-wordcount-overlay .vno-dialog-ok-btn')");
    await click(cdp, close ? "#vno-wordcount-overlay .vno-dialog-ok-btn" : "#vno-wordcount-overlay .vno-dialog-close-btn");
  } finally {
    await session.close();
  }
}
await fs.writeFile(path.join(dir, "app-wordcount-controls-t13.json"), JSON.stringify(rows, null, 2), "utf8");
