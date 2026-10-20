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
  await click("#vno-ribbon-tab-data");
  await click('button.vno-ribbon-btn-dropdown[aria-label="Phân tích What-If"]');
  await click('.vno-ribbon-dropdown-item[data-command-id="sheet.data.scenarioManager"]');
  const dir = path.resolve("docs/assets/q38-ui");
  mkdirSync(dir, { recursive: true });
  for (const size of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }]) {
    await session.cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal", ...size } });
    const state = JSON.parse(await session.cdp.evaluate(`(()=>{const d=document.querySelector('.vno-dialog-overlay .vno-dialog-box'),b=d?.querySelector('.vno-dialog-body'),c=d?.querySelector('.vno-scenario-manager');if(!d||!b||!c)return JSON.stringify({missing:true});const x=d.getBoundingClientRect(),y=c.getBoundingClientRect(),buttons=Array.from(c.querySelectorAll('.vno-scenario-actions .vno-btn')).map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {label:e.innerText,bg:s.backgroundColor,border:s.borderColor,height:r.height}});return JSON.stringify({dialogRight:x.right,contentRight:y.right,contentWidth:y.width,bodyScrollWidth:b.scrollWidth,bodyClientWidth:b.clientWidth,buttons})})()`));
    console.log(JSON.stringify({ ...size, ...state }));
    const shot = await session.cdp.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path.join(dir, `dialog-scenario-dark-after-${size.width}.png`), Buffer.from((shot.result || shot).data, "base64"));
    if (state.missing || state.contentRight > state.dialogRight + 1 || state.bodyScrollWidth > state.bodyClientWidth + 1 || state.buttons.some(b => b.height < 26 || b.bg.includes("0, 0, 0, 0") || b.border.includes("0, 0, 0, 0"))) throw new Error("Scenario dialog overflows or its actions lack visible button affordances.");
  }
  console.log("PASS | scenario dialog fits without horizontal scrolling at both viewports");
} finally {
  await session.close();
}
