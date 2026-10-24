import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";

const root = process.env.VNO_APP_ROOT || path.resolve(".");
const input = process.env.Q60_LAN01 || "E:/VN OFice/file test/lan/lan01.xlsx";
const output = process.env.Q60_SCREENSHOT || "E:/VNOffice-briefs/runs/q60-lan01-dark-contrast.png";
const localAppData = process.env.VNO_CDP_LOCALAPPDATA || "E:/VNOffice-briefs/profiles/q60-dark-contrast";
const session = await launchApp("sheet", { root, localAppData, filePath: input, startTimeoutMilliseconds: 300000, readyTimeoutMilliseconds: 300000 });

try {
  const windowInfo = await session.cdp.send("Browser.getWindowForTarget", {});
  await session.cdp.send("Browser.setWindowBounds", { windowId: windowInfo.result.windowId, bounds: { width: 1366, height: 768, windowState: "normal" } });
  await session.cdp.waitFor("!!window.__vnoAppInstance?.adapter?.grid?.cellsData?.size && !window.__vnoSheetQuickViewController?.active", { timeoutMilliseconds: 300000, intervalMilliseconds: 200 });
  const before = await session.cdp.evaluate("document.documentElement.getAttribute('data-theme')");
  if (before !== "dark") await session.cdp.evaluate("window.globalCommandBus.dispatch('common.view.toggleTheme')", { awaitPromise: true });
  await session.cdp.waitFor("document.documentElement.getAttribute('data-theme') === 'dark'", { timeoutMilliseconds: 10000, intervalMilliseconds: 100 });
  const result = await session.cdp.evaluate(`(() => {
    const luminance = rgb => {
      const values = rgb.match(/[0-9.]+/g)?.slice(0, 3).map(Number) || [0, 0, 0];
      const linear = values.map(value => { const c=value/255; return c<=0.04045 ? c/12.92 : ((c+0.055)/1.055)**2.4; });
      return 0.2126*linear[0] + 0.7152*linear[1] + 0.0722*linear[2];
    };
    const cells = [...document.querySelectorAll('.vno-grid-cell.has-content')].filter(cell => cell.textContent.trim() && !cell.style.backgroundColor);
    const samples = cells.slice(0, 100).map(cell => {
      const style=getComputedStyle(cell), fg=style.color, bg=style.backgroundColor;
      const a=luminance(fg), b=luminance(bg), contrast=(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
      return {coord:cell.dataset.coord || '', text:cell.textContent.trim().slice(0,40), color:fg, background:bg, contrast:+contrast.toFixed(2)};
    });
    const worst = samples.reduce((a,b) => !a || b.contrast<a.contrast ? b : a, null);
    return {theme:document.documentElement.getAttribute('data-theme'), sampleCount:samples.length, worst, pass:samples.length>0 && samples.every(item=>item.contrast>=4.5)};
  })()`);
  const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, 30000);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, Buffer.from(shot.result.data, "base64"));
  console.log(JSON.stringify({ ...result, screenshot: output }));
  if (!result.pass) process.exitCode = 1;
} finally { await session.close(); }
