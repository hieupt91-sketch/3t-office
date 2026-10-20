import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, mouseClick, sleep } from "./actions.mjs";

const evidence = path.resolve("docs/assets/q40-ui");
const phase = process.env.VNO_Q40_PHASE || "after";
mkdirSync(evidence, { recursive: true });
const session = await launchApp("slides", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const { cdp } = session;
const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true });
const checks = [];
const check = (name, pass, details) => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name} | ${JSON.stringify(details)}`);
};
const resize = async (width, height) => {
  const win = await cdp.send("Browser.getWindowForTarget", {});
  await cdp.send("Browser.setWindowBounds", { windowId: (win.result || win).windowId, bounds: { windowState: "normal", width, height } });
  await sleep(350);
};
const screenshot = async (name) => {
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(path.join(evidence, `${name}-${phase}.png`), Buffer.from((shot.result || shot).data, "base64"));
};
const inspect = async (width, height, theme) => {
  await resize(width, height);
  await ev(`document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)})`);
  await click(cdp, "#vno-ribbon-tab-home");
  await click(cdp, '[data-dropdown-id="slides.shape.gallery"]');
  await sleep(250);
  const metrics = await ev(`(() => { const menu=document.querySelector('.vno-ribbon-dropdown-menu'); const status=document.querySelector('.vno-statusbar'); if(!menu||!status)return null;const m=menu.getBoundingClientRect(),s=status.getBoundingClientRect();return {menu:{top:m.top,bottom:m.bottom,height:m.height,scrollHeight:menu.scrollHeight,clientHeight:menu.clientHeight},status:{top:s.top,bottom:s.bottom},viewport:{width:innerWidth,height:innerHeight},overlap:m.bottom>s.top+1,scrollable:menu.scrollHeight>menu.clientHeight}; })()`);
  await screenshot(`q40-slides-gallery-${width}x${height}-${theme}`);
  check(`gallery fits above status bar ${width}x${height} ${theme}`, metrics && !metrics.overlap && (metrics.scrollable || metrics.menu.scrollHeight <= metrics.menu.clientHeight), metrics);
  await click(cdp, '[data-dropdown-id="slides.shape.gallery"]');
};
try {
  await sleep(900);
  for (const [w,h] of [[1366,768],[1280,720]]) {
    await inspect(w,h,"light");
    await inspect(w,h,"dark");
  }
} finally {
  await session.close();
}
if (checks.some((pass) => !pass)) process.exit(1);
console.log(`Q40 Slides gallery viewport: ${checks.length}/${checks.length} PASS`);
