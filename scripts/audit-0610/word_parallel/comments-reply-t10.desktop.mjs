import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click, mouseDrag, typeText } from "../../../tests/live/cdp/actions.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const dir = process.env.VNO_CDP_LOCALAPPDATA;
if (!dir || !process.env.VNO_APP_ROOT) throw new Error("Set VNO_CDP_LOCALAPPDATA and VNO_APP_ROOT.");
mkdirSync(dir, { recursive: true });
const output = `${dir}\\comments-reply-t10.docx`;
const session = await launchApp("writer", { localAppData: dir, root: process.env.VNO_APP_ROOT, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  await cdp.waitFor("!!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await click(cdp, ".vno-writer-body p", 0);
  await typeText(cdp, "Alpha comment target.", 20);
  const bounds = await cdp.evaluate(`(()=>{const n=document.querySelector('.vno-writer-body p').firstChild;const r=document.createRange();r.setStart(n,0);r.setEnd(n,5);const b=r.getBoundingClientRect();return{x1:b.left+1,y1:b.top+b.height/2,x2:b.right-1,y2:b.top+b.height/2}})()`);
  await mouseDrag(cdp, bounds.x1, bounds.y1, bounds.x2, bounds.y2, { steps: 6 });
  if ((await cdp.evaluate("String(getSelection())")) !== "Alpha") throw new Error("CDP selection did not select Alpha");
  const review = await cdp.evaluate("[...document.querySelectorAll('.vno-ribbon-tab')].findIndex(x=>/Đánh giá|Review/i.test(x.textContent))");
  await click(cdp, ".vno-ribbon-tab", review);
  await click(cdp, 'button[data-command-id="writer.comment.insert"]');
  await cdp.waitFor("!!document.querySelector('.vno-dialog-overlay .vno-dialog-input')", { timeoutMilliseconds: 5000, intervalMilliseconds: 100 });
  await click(cdp, ".vno-dialog-overlay .vno-dialog-input");
  await typeText(cdp, "Parent comment", 15);
  await click(cdp, ".vno-dialog-overlay .vno-dialog-ok-btn");
  await cdp.waitFor("!document.querySelector('.vno-dialog-overlay')", { timeoutMilliseconds: 5000, intervalMilliseconds: 100 });
  await click(cdp, 'button[data-command-id="writer.review.commentReply"]');
  await cdp.waitFor("!!document.querySelector('.vno-dialog-overlay .vno-dialog-input')", { timeoutMilliseconds: 5000, intervalMilliseconds: 100 });
  await click(cdp, ".vno-dialog-overlay .vno-dialog-input");
  await typeText(cdp, "Reply body", 15);
  await click(cdp, ".vno-dialog-overlay .vno-dialog-ok-btn");
  await cdp.waitFor("!document.querySelector('.vno-dialog-overlay')", { timeoutMilliseconds: 5000, intervalMilliseconds: 100 });
  const state = await cdp.evaluate(`(()=>{const c=window.__vnoAppInstance.adapter.comments[0];return{anchor:c.anchorText,content:c.content,replies:c.replies,replyCard:document.querySelector('.vno-comment-reply')?.innerText}})()`);
  if (state.replies?.[0]?.content !== "Reply body") throw new Error("Reply is missing in the thread panel");
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(`${dir}\\comments-reply-t10.png`, Buffer.from(shot.result.data, "base64"));
  const saved = await cdp.evaluate(`(()=>{const a=window.__vnoAppInstance.adapter;return globalThis.globalUnoBridge.saveRealFileInPlace("writer",a._contentForExport(),${JSON.stringify(output)},${JSON.stringify(output)});})()`, { awaitPromise: true, timeoutMilliseconds: 240000 });
  console.log(JSON.stringify({ state, saved, output, screenshot: `${dir}\\comments-reply-t10.png`, appPid: session.child?.pid ?? null }));
} finally {
  await session.close();
  if (session.child?.pid && session.child.exitCode === null && session.child.signalCode === null) {
    session.child.kill("SIGTERM");
    await Promise.race([session.exited, new Promise(resolve => setTimeout(resolve, 5000))]);
  }
}
