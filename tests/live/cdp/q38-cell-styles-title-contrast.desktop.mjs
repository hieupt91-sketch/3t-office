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
  await click("#vno-toggle-theme-btn");
  await click("#vno-ribbon-tab-home");
  await click('button[data-command-id="sheet.style.cellStyles"]');
  const dir = path.resolve("docs/assets/q38-ui");
  mkdirSync(dir, { recursive: true });
  for (const size of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }]) {
    await session.cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal", ...size } });
    const state = JSON.parse(await session.cdp.evaluate(`(()=>{const e=document.querySelector('#vno-cell-styles-title');if(!e)return JSON.stringify({missing:true});const s=getComputedStyle(e),p=getComputedStyle(e.parentElement),rgb=v=>v.match(/[\\d.]+/g).map(Number).slice(0,3).map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}),lum=a=>.2126*a[0]+.7152*a[1]+.0722*a[2],a=lum(rgb(s.color)),b=lum(rgb(p.backgroundColor));return JSON.stringify({color:s.color,background:p.backgroundColor,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)})})()`));
    console.log(JSON.stringify({ ...size, ...state }));
    const shot = await session.cdp.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path.join(dir, `dialog-cell-styles-dark-after-${size.width}.png`), Buffer.from((shot.result || shot).data, "base64"));
    if (state.missing || state.ratio < 4.5) throw new Error("Cell-style gallery title contrast is below 4.5:1.");
  }
  console.log("PASS | cell-style gallery title contrast at both viewports in dark mode");
} finally {
  await session.close();
}
