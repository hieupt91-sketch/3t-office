import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { mouseClick, press } from "./actions.mjs";

const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!localAppData) throw new Error("Set VNO_CDP_LOCALAPPDATA to a private profile directory.");
const session = await launchApp("sheet", { localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const click = async (selector) => {
  const point = JSON.parse(await session.cdp.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;const r=e.getBoundingClientRect();return JSON.stringify({x:r.x+r.width/2,y:r.y+r.height/2})})()`));
  if (!point) throw new Error(`Missing control: ${selector}`);
  await mouseClick(session.cdp, point.x, point.y);
};
const setSize = async (windowId, width, height) => session.cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal", width, height } });
const dir = path.resolve("docs/assets/q38-ui");
mkdirSync(dir, { recursive: true });
try {
  const win = await session.cdp.send("Browser.getWindowForTarget", {});
  const windowId = (win.result || win).windowId;
  const capture = async (name) => {
    const shot = await session.cdp.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path.join(dir, name), Buffer.from((shot.result || shot).data, "base64"));
  };
  const measure = async (width) => {
    const state = JSON.parse(await session.cdp.evaluate(`(()=>{const m=document.querySelector('.vno-cf-rule-manager'),e=document.querySelector('.vno-cf-editor'),body=document.querySelector('.vno-cf-dialog .vno-dialog-body');if(!m||!e||!body)return JSON.stringify({missing:true});const a=m.getBoundingClientRect(),b=e.getBoundingClientRect(),last=m.lastElementChild.getBoundingClientRect();return JSON.stringify({width:${width},managerHeight:a.height,managerScrollHeight:m.scrollHeight,lastBottom:last.bottom,managerBottom:a.bottom,editorTop:b.top,bodyScrollHeight:body.scrollHeight,bodyClientHeight:body.clientHeight})})()`));
    console.log(JSON.stringify(state));
    if (state.missing || state.lastBottom > state.managerBottom + 1 || state.editorTop < state.managerBottom - 1 || state.managerScrollHeight > state.managerHeight + 1 || state.bodyScrollHeight > state.bodyClientHeight + 1) throw new Error("Conditional-format rule manager content is clipped or the dialog has redundant vertical scrolling.");
  };
  await setSize(windowId, 1366, 768);
  await click("#vno-ribbon-tab-home");
  await click('button[data-command-id="sheet.format.conditional"]');
  for (const width of [1366, 1280]) {
    await setSize(windowId, width, width === 1366 ? 768 : 720);
    await measure(width);
    await capture(`dialog-conditional-light-after-${width}.png`);
  }
  await press(session.cdp, "Escape");
  await click("#vno-toggle-theme-btn");
  await click('button[data-command-id="sheet.format.conditional"]');
  for (const width of [1366, 1280]) {
    await setSize(windowId, width, width === 1366 ? 768 : 720);
    await measure(width);
    await capture(`dialog-conditional-dark-after-${width}.png`);
  }
  console.log("PASS | rule-manager content fits and stays separate from editor at both viewports/themes");
} finally {
  await session.close();
}
