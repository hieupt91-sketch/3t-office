import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click, mouseDrag, press, typeText } from "../../../tests/live/cdp/actions.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const dir = process.env.VNO_CDP_LOCALAPPDATA;
if (!dir || !process.env.VNO_APP_ROOT) throw new Error("Set VNO_CDP_LOCALAPPDATA and VNO_APP_ROOT.");
mkdirSync(dir, { recursive: true });
const output = `${dir}\\app_styles_t8_new.docx`;
const session = await launchApp("writer", { localAppData: dir, root: process.env.VNO_APP_ROOT, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  await cdp.waitFor("!!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  const home = await cdp.evaluate("[...document.querySelectorAll('.vno-ribbon-tab')].findIndex(x=>/Trang đầu|Home/i.test(x.textContent))");
  await click(cdp, ".vno-ribbon-tab", home);
  await click(cdp, ".vno-writer-body p", 0);
  await typeText(cdp, "Normal sample", 20);
  for (const value of ["Title sample", "Quote sample"]) { await press(cdp, "Enter", {}, 100); await typeText(cdp, value, 20); }
  const select = async text => {
    const r = await cdp.evaluate(`(() => {const p=[...document.querySelectorAll('.vno-writer-body p')].find(x=>x.textContent.includes(${JSON.stringify(text)}));if(!p)return null;const q=document.createRange();q.selectNodeContents(p);const a=[...q.getClientRects()].filter(x=>x.width&&x.height);return a.length?{x1:a[0].left+1,y1:a[0].top+a[0].height/2,x2:a.at(-1).right-1,y2:a.at(-1).top+a.at(-1).height/2}:null})()`);
    if (!r) throw new Error(`Paragraph not found: ${text}`);
    await mouseDrag(cdp, r.x1, r.y1, r.x2, r.y2, { steps: 7 });
    if (!(await cdp.evaluate("String(getSelection())")).includes(text)) throw new Error(`Could not select: ${text}`);
  };
  await select("Normal sample");
  await click(cdp, '.vno-style-gallery-strip [data-style-id="normal"]');
  await select("Title sample");
  await click(cdp, 'button[data-command-id="writer.style.gallery"]');
  await click(cdp, '.vno-style-gallery-dropdown .vno-style-card[data-style-id="title"]');
  await select("Quote sample");
  await click(cdp, 'button[data-command-id="writer.style.gallery"]');
  await click(cdp, '.vno-style-gallery-dropdown .vno-style-card[data-style-id="quote"]');
  const result = await cdp.evaluate(`(() => [...document.querySelectorAll('.vno-writer-body p,.vno-writer-body blockquote')].map(x=>({tag:x.tagName,text:x.textContent,html:x.outerHTML,css:{font:getComputedStyle(x).fontFamily,size:getComputedStyle(x).fontSize,weight:getComputedStyle(x).fontWeight,italic:getComputedStyle(x).fontStyle,color:getComputedStyle(x).color,align:getComputedStyle(x).textAlign,before:getComputedStyle(x).marginTop,after:getComputedStyle(x).marginBottom}})))()`);
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(`${dir}\\styles-t8-before.png`, Buffer.from(shot.result.data, "base64"));
  const saved = await cdp.evaluate(`(() => {const a=window.__vnoAppInstance.adapter;return globalThis.globalUnoBridge.saveRealFileInPlace("writer",a._contentForExport(),${JSON.stringify(output)},${JSON.stringify(output)});})()`, { awaitPromise: true, timeoutMilliseconds: 240000 });
  console.log(JSON.stringify({ result, saved, output, screenshot: `${dir}\\styles-t8-before.png` }));
} finally { await session.close(); }
