import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click, mouseDrag, typeText } from "../../../tests/live/cdp/actions.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const dir = process.env.VNO_CDP_LOCALAPPDATA;
if (!dir || !process.env.VNO_APP_ROOT) throw new Error("Set VNO_CDP_LOCALAPPDATA and VNO_APP_ROOT.");
mkdirSync(dir, { recursive: true });
const output = `${dir}\\app_comments_t8_new.docx`;
const session = await launchApp("writer", { localAppData: dir, root: process.env.VNO_APP_ROOT, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  await cdp.waitFor("!!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await click(cdp, ".vno-writer-body p", 0);
  await typeText(cdp, "Alpha comment target. Beta comment target.", 20);
  const select = async text => {
    const r = await cdp.evaluate(`(() => {const w=${JSON.stringify(text)};const body=document.querySelector('.vno-writer-body');const n=[...body.querySelectorAll('p')].find(x=>x.textContent.includes(w));if(!n)return null;const walker=document.createTreeWalker(n,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){const i=node.textContent.indexOf(w);if(i<0)continue;const r=document.createRange();r.setStart(node,i);r.setEnd(node,i+w.length);const a=[...r.getClientRects()];return a.length?{x1:a[0].left+1,y1:a[0].top+a[0].height/2,x2:a.at(-1).right-1,y2:a.at(-1).top+a.at(-1).height/2}:null}return null})()`);
    if (!r) throw new Error(`Text not found: ${text}`);
    await mouseDrag(cdp, r.x1, r.y1, r.x2, r.y2, { steps: 7 });
    if (!(await cdp.evaluate("String(getSelection())")).includes(text)) throw new Error(`Could not select ${text}`);
  };
  const review = await cdp.evaluate("[...document.querySelectorAll('.vno-ribbon-tab')].findIndex(x=>/Đánh giá|Review/i.test(x.textContent))");
  await click(cdp, ".vno-ribbon-tab", review);
  const add = async (target, text) => {
    await select(target);
    await click(cdp, 'button[data-command-id="writer.comment.insert"]');
    await cdp.waitFor("!!document.querySelector('.vno-dialog-overlay .vno-dialog-input')", { timeoutMilliseconds: 5000, intervalMilliseconds: 100 });
    await click(cdp, ".vno-dialog-overlay .vno-dialog-input");
    await typeText(cdp, text, 15);
    await click(cdp, ".vno-dialog-overlay .vno-dialog-ok-btn");
    await cdp.waitFor("!document.querySelector('.vno-dialog-overlay')", { timeoutMilliseconds: 5000, intervalMilliseconds: 100 });
  };
  await add("Alpha", "Resolve audit");
  await add("Beta", "Delete audit");
  await click(cdp, 'button[data-command-id="writer.review.commentPrevious"]');
  const nav = await cdp.evaluate("document.querySelector('.vno-comment-anchor.is-active')?.textContent");
  await click(cdp, 'button[data-command-id="writer.review.commentResolve"]');
  await click(cdp, 'button[data-command-id="writer.review.commentNext"]');
  await click(cdp, 'button[data-command-id="writer.review.commentDelete"]');
  const state = await cdp.evaluate(`(()=>({comments:[...window.__vnoAppInstance.adapter.comments].map(c=>({anchorText:c.anchorText,content:c.content,resolved:c.resolved,author:c.author})),active:document.querySelector('.vno-comment-anchor.is-active')?.textContent}))()`);
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(`${dir}\\comments-t8-before.png`, Buffer.from(shot.result.data, "base64"));
  const saved = await cdp.evaluate(`(()=>{const a=window.__vnoAppInstance.adapter;return globalThis.globalUnoBridge.saveRealFileInPlace("writer",a._contentForExport(),${JSON.stringify(output)},${JSON.stringify(output)});})()`, { awaitPromise: true, timeoutMilliseconds: 240000 });
  console.log(JSON.stringify({ nav, state, saved, output, screenshot: `${dir}\\comments-t8-before.png` }));
} finally { await session.close(); }
