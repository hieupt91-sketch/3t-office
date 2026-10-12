import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click } from "../../../tests/live/cdp/actions.mjs";

const root = process.env.VNO_APP_ROOT;
const profile = process.env.VNO_CDP_LOCALAPPDATA;
const corpus = process.env.VNO_DOCX_CORPUS || path.join(root || "", "file test", "landocx");
if (!root || !profile) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const allNames = ["d01.docx", "d02.docx", "d06.docx", "d07.docx", "d13.docx", "d20.docx", "d24.docx"];
const selectedNames = (process.env.VNO_WORDCOUNT_CASES || "").split(",").map(value => value.trim()).filter(Boolean);
const names = selectedNames.length ? selectedNames : allNames;
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
    await cdp.waitFor("!!window.__vnoAppInstance?.adapter?._openedEditorDomHash && !window.__vnoAppInstance.adapter.isDirty", { timeoutMilliseconds: 900000, intervalMilliseconds: 500 });
    const cleanState = await cdp.evaluate("(() => {const a=window.__vnoAppInstance.adapter;return {isDirty:a.isDirty,sourceHashMatches:a._openedEditorDomHash===a._editorDomFingerprint()}})()");
    const cleanStats = await cdp.evaluate("window.__vnoAppInstance.adapter.getWordCountStats({preferSelection:false})");
    const cleanHtml = await cdp.evaluate("document.querySelector('.vno-writer-body')?.innerHTML||''");
    await click(cdp, "#vno-ribbon-tab-review");
    const reviewState = await cdp.evaluate("(() => {const a=window.__vnoAppInstance.adapter;return {isDirty:a.isDirty,sourceHashMatches:a._openedEditorDomHash===a._editorDomFingerprint()}})()");
    const reviewHtml = await cdp.evaluate("document.querySelector('.vno-writer-body')?.innerHTML||''");
    let firstBodyDifference = 0;
    while (firstBodyDifference < Math.min(cleanHtml.length, reviewHtml.length) && cleanHtml[firstBodyDifference] === reviewHtml[firstBodyDifference]) firstBodyDifference += 1;
    await click(cdp, '[data-command-id="writer.review.wordCount"]');
    await cdp.waitFor("!!document.querySelector('#vno-wordcount-overlay [data-stat=\"charactersWithSpaces\"]')", { timeoutMilliseconds: 15000 });
    const result = await cdp.evaluate(`(() => {const read=name=>Number((document.querySelector('#vno-wordcount-overlay [data-stat="'+name+'"]')?.textContent||'0').replace(/\\./g,''));const a=window.__vnoAppInstance.adapter;const source=a._wordCountSourceText;return {isDirtyAfterUiClick:a.isDirty,sourceHashMatchesAfterUiClick:a._openedEditorDomHash===a._editorDomFingerprint(),dialogStats:{words:read('words'),charactersNoSpaces:read('charactersNoSpaces'),charactersWithSpaces:read('charactersWithSpaces')},documentStats:a.getWordCountStats({preferSelection:false}),sourceText:source==null?null:{length:source.length,charactersNoSpaces:source.replace(/\\s+/g,'').length,charactersWithSpaces:source.replace(/[\\r\\n\\u2028\\u2029]/g,'').length}}})()`);
    rows.push({ name, cleanState, cleanStats, reviewState, bodyLengths: [cleanHtml.length, reviewHtml.length], firstBodyDifference, bodyDifferenceSnippet: [cleanHtml.slice(Math.max(0, firstBodyDifference - 80), firstBodyDifference + 160), reviewHtml.slice(Math.max(0, firstBodyDifference - 80), firstBodyDifference + 160)], ...result });
    console.log(JSON.stringify(rows[rows.length - 1]));
    await click(cdp, "#vno-wordcount-overlay .vno-dialog-ok-btn");
  } finally {
    await session.close();
  }
}
await fs.writeFile(path.join(profile, "fix-t13-app-word-count.json"), JSON.stringify(rows, null, 2), "utf8");
