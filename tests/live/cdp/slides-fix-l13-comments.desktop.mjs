import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, typeText } from "./actions.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
const source = process.env.VNO_FIX_L8_SOURCE || "E:\\VN OFice\\file test\\sample-3.pptx";
if (!root || !localAppData) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const file = path.join(localAppData, "fix-l13-comments.pptx");
const beforeDelete = path.join(localAppData, "fix-l13-comments-before-delete.pptx");
const resolvedFile = path.join(localAppData, "fix-l13-comments-resolved.pptx");
const evidence = path.resolve("docs/tickets-0710/evidence/fix-l13/review");
await fs.mkdir(localAppData, { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.copyFile(source, file);
const session = await launchApp("slides", { root, filePath: file, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const read = () => session.cdp.evaluate(`JSON.stringify((()=>{const c=window.__vnoAppInstance.adapter.canvas,s=c.slides[c.currentSlideIndex];return{slides:c.slides.length,index:c.currentSlideIndex,comments:s.comments||[],activeCommentId:c.activeCommentId,panelOpen:!!c.commentPanelEl&&!c.commentPanelEl.hidden,items:[...document.querySelectorAll('.vno-slide-comment-item')].map(x=>({id:x.dataset.commentId,resolved:x.classList.contains('is-resolved'),text:x.querySelector('p')?.textContent||''}))}})())`);
const screenshot = async name => {
  const result = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(path.join(evidence, `${name}.png`), Buffer.from(result.result.data, "base64"));
};
const command = id => click(session.cdp, `[data-command-id="${id}"]`);
const save = () => session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 600000 });
const result = { file, beforeDelete, resolvedFile };
try {
  const normalized = file.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(()=>{const a=window.__vnoAppInstance?.adapter,p=String(a?._sourcePath||a?.sourceFilePath||"").replace(/\\\\/g,"/").toLowerCase();return p===${JSON.stringify(normalized)}&&a?.canvas?.slides?.length>0})()`, { timeoutMilliseconds: 300000, intervalMilliseconds: 500 });
  await click(session.cdp, "#vno-ribbon-tab-review");
  await command("slides.review.commentInsert");
  await session.cdp.waitFor("!!document.querySelector('.vno-slide-comments-panel:not([hidden])')", { timeoutMilliseconds: 30000 });
  for (const text of ["FIX-L10 Alpha comment", "FIX-L10 Beta comment"]) {
    await click(session.cdp, ".vno-slide-comments-panel textarea");
    await typeText(session.cdp, text, 20);
    await click(session.cdp, ".vno-slide-comment-add");
  }
  result.afterInsert = JSON.parse(await read()); await screenshot("comments-inserted");
  if (!(await save())) throw new Error("Save failed after comment insert.");
  await fs.copyFile(file, beforeDelete);

  await command("slides.review.commentNext"); result.next = JSON.parse(await read());
  await command("slides.review.commentPrevious"); result.previous = JSON.parse(await read());
  await command("slides.review.commentResolve"); result.resolved = JSON.parse(await read()); await screenshot("comment-resolved");
  result.savedAfterResolve = await save();
  if (!result.savedAfterResolve) throw new Error("Save failed after resolving comment.");
  await fs.copyFile(file, resolvedFile);

  const beta = await session.cdp.evaluate(`(()=>{const e=[...document.querySelectorAll('.vno-slide-comment-item')].find(x=>x.querySelector('p')?.textContent==='FIX-L10 Beta comment');return e?.dataset.commentId||null})()`);
  if (!beta) throw new Error("Beta comment row not found.");
  await click(session.cdp, `[data-comment-id="${beta}"]`);
  await command("slides.review.commentDelete");
  result.afterDelete = JSON.parse(await read()); await screenshot("comment-deleted");
  if (!(await save())) throw new Error("Save failed after comment delete.");
  await fs.writeFile(path.join(evidence, "comments-cdp-readback.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(result));
} finally { await session.close(); }
