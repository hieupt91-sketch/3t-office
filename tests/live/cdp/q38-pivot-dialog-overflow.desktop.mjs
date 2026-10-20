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
  await click("#vno-ribbon-tab-data");
  await click('button[data-command-id="sheet.data.pivotTable"]');
  const evidenceDir = path.resolve("docs/assets/q38-ui");
  mkdirSync(evidenceDir, { recursive: true });
  for (const size of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }]) {
    await session.cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal", ...size } });
    const state = JSON.parse(await session.cdp.evaluate(`(()=>{const d=document.querySelector('.vno-dialog-overlay .vno-dialog-box'),c=d?.querySelector('.vno-pivot-dialog');if(!d||!c)return JSON.stringify({missing:true});const a=d.getBoundingClientRect(),b=c.getBoundingClientRect();return JSON.stringify({viewport:innerWidth,dialogWidth:a.width,contentWidth:b.width,contentRight:b.right,dialogRight:a.right,scrollWidth:d.scrollWidth,clientWidth:d.clientWidth})})()`));
    console.log(JSON.stringify({ ...size, ...state }));
    const shot = await session.cdp.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path.join(evidenceDir, `dialog-pivot-dark-after-${size.width}.png`), Buffer.from((shot.result || shot).data, "base64"));
    if (state.missing || state.contentRight > state.dialogRight + 1 || state.scrollWidth > state.clientWidth + 1) throw new Error("Pivot dialog has horizontal overflow.");
  }
  console.log("PASS | pivot dialog fits without horizontal overflow at both viewports");
} finally {
  await session.close();
}
