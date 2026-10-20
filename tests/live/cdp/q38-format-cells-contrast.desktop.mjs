import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { mouseClick } from "./actions.mjs";

const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!localAppData) throw new Error("Set VNO_CDP_LOCALAPPDATA to a private profile directory.");
const session = await launchApp("sheet", { localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const click = async (selector) => {
  const point = JSON.parse(await session.cdp.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;const r=e.getBoundingClientRect();return JSON.stringify({x:r.x+r.width/2,y:r.y+r.height/2})})()`));
  if (!point) throw new Error(`Missing control: ${selector}`);
  await mouseClick(session.cdp, point.x, point.y);
};
try {
  const win = await session.cdp.send("Browser.getWindowForTarget", {});
  const windowId = (win.result || win).windowId;
  await session.cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal", width: 1366, height: 768 } });
  await click("#vno-toggle-theme-btn");
  await click('button[data-command-id="sheet.format.cellsDialog"]');
  const state = JSON.parse(await session.cdp.evaluate(`(()=>{const e=document.querySelector('.vno-fc-cat-item.is-selected');if(!e)return JSON.stringify({missing:true});const r=e.getBoundingClientRect(),s=getComputedStyle(e),rgb=v=>v.match(/[\\d.]+/g).map(Number).slice(0,3).map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}),lum=a=>.2126*a[0]+.7152*a[1]+.0722*a[2],a=lum(rgb(s.color)),b=lum(rgb(s.backgroundColor)),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);return JSON.stringify({text:e.innerText,color:s.color,background:s.backgroundColor,ratio,rect:{x:r.x,y:r.y,width:r.width,height:r.height},viewport:{width:innerWidth,height:innerHeight}})})()`));
  console.log(JSON.stringify(state));
  if (state.missing || state.ratio < 4.5 || state.rect.x < 0 || state.rect.y < 0 || state.rect.x + state.rect.width > state.viewport.width || state.rect.y + state.rect.height > state.viewport.height) {
    throw new Error("Selected number-format category fails contrast or bounds check.");
  }
  const evidenceDir = path.resolve("docs/assets/q38-ui");
  mkdirSync(evidenceDir, { recursive: true });
  const saveScreenshot = async (name) => {
    const shot = await session.cdp.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path.join(evidenceDir, name), Buffer.from((shot.result || shot).data, "base64"));
  };
  await saveScreenshot("dialog-format-cells-dark-after-1366.png");
  await session.cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal", width: 1280, height: 720 } });
  await saveScreenshot("dialog-format-cells-dark-after-1280.png");
  console.log("PASS | selected category contrast and viewport bounds");
} finally {
  await session.close();
}
