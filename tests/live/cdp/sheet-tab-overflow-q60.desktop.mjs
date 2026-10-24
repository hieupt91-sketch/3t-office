import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";

const root = process.env.VNO_APP_ROOT || path.resolve(".");
const input = process.env.Q60_LAN09 || "E:\\VN OFice\\file test\\lan\\lan09.xlsx";
const output = process.env.Q60_SCREENSHOT || "E:\\VNOffice-profiles\\codex-q60-speed\\lan09-tab-overflow.png";
const localAppData = process.env.VNO_CDP_LOCALAPPDATA || "E:\\VNOffice-profiles\\codex-q60-speed\\visual";
const session = await launchApp("sheet", {
  root,
  localAppData,
  filePath: input,
  startTimeoutMilliseconds: 900000,
  readyTimeoutMilliseconds: 900000,
});

try {
  const windowInfo = await session.cdp.send("Browser.getWindowForTarget", {});
  await session.cdp.send("Browser.setWindowBounds", {
    windowId: windowInfo.result.windowId,
    bounds: { width: 1366, height: 768, windowState: "normal" },
  });
  await session.cdp.waitFor(
    "!!window.__vnoAppInstance?.adapter?.sourceFilePath && !!window.__vnoAppInstance?.grid?.cellsData?.size && !window.__vnoSheetQuickViewController?.active",
    { timeoutMilliseconds: 900000, intervalMilliseconds: 100 },
  );
  const result = await session.cdp.evaluate(`(() => {
    const bar = document.querySelector('.vno-sheet-tab-bar');
    const barRect = bar?.getBoundingClientRect();
    const pathNodes = [...(bar?.querySelectorAll('.vno-sheet-tab-label') || [])].filter(node =>
      /^['\"]?(file:|[a-z]:[\\/])/i.test((node.textContent || '').trim()));
    const overflow = pathNodes.map(node => {
      const rect = node.getBoundingClientRect();
      const itemRect = node.closest('.vno-sheet-tab-item')?.getBoundingClientRect();
      const style = getComputedStyle(node);
      return { text: node.textContent.trim().slice(0, 100), tag: node.tagName, className: String(node.className || ''), itemWidth: itemRect?.width,
        x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom,
        barLeft: barRect?.left, barRight: barRect?.right, barTop: barRect?.top, barBottom: barRect?.bottom, position: style.position,
        overflowX: style.overflowX, textOverflow: style.textOverflow, whiteSpace: style.whiteSpace,
        overlapsTabBar: !!barRect && rect.bottom > barRect.top && rect.top < barRect.bottom };
    });
    const hitTargets = [1200, 1300].map(x => ({ x, y: barRect?.top + 3, items: document.elementsFromPoint(x, barRect?.top + 3).slice(0, 5).map(node => ({ tag: node.tagName, className: String(node.className || ''), text: (node.textContent || '').trim().slice(0, 80) })) }));
    const viewport = document.querySelector('.vno-grid-viewport')?.getBoundingClientRect();
    return { viewport: { width: innerWidth, height: innerHeight }, bar: barRect && { x: barRect.x, y: barRect.y, width: barRect.width, height: barRect.height }, grid: viewport && { x: viewport.x, y: viewport.y, width: viewport.width, height: viewport.height, bottom: viewport.bottom }, pathNodes: overflow, hitTargets,
      pass: pathNodes.length > 0 && overflow.every(item => item.width >= 20 && item.width <= 160 && item.itemWidth >= 40 && item.textOverflow === 'ellipsis' && item.whiteSpace === 'nowrap') };
  })()`);
  const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, 30000);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, Buffer.from(shot.result.data, "base64"));
  console.log(JSON.stringify({ ...result, screenshot: output }));
  if (!result.pass) process.exitCode = 1;
} finally {
  await session.close();
}
