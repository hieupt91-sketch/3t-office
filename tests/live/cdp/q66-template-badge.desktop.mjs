import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { launchApp, repoRoot } from "./session.mjs";
import { sleep } from "./actions.mjs";

const session = await launchApp("slides", { localAppData: path.join(os.tmpdir(), `vno-cdp-q66-template-${Date.now()}`) });
try {
  await sleep(2500);
  const ev = (expression) => session.cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 30000 });
  await session.cdp.send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await ev("window.__vnoAppInstance.shell.showBackstageMenu()")
  await sleep(500);
  const result = await ev(`(() => {
    const card = document.querySelector('.vno-template-card[data-template-id="presentation_outline"]');
    if (!card) return { found: false };
    return {
      found: true,
      badgeTexts: [...card.querySelectorAll('span')].map(el => el.textContent.trim()).filter(Boolean),
      rect: (() => { const r = card.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height }; })(),
      overflow: card.scrollWidth > card.clientWidth || card.scrollHeight > card.clientHeight
    };
  })()`);
  const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const screenshot = path.join(repoRoot, "docs", "screenshots", "q66-template-badge.png");
  await writeFile(screenshot, Buffer.from(shot.result?.data || "", "base64"));
  console.log(JSON.stringify({ ...result, screenshot }));
  if (!result.found || result.badgeTexts.includes("Mẫu báo cáo") || result.overflow) process.exitCode = 1;
} finally {
  await session.close().catch(() => {});
}
