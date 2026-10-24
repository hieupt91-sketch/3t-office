import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const profileRoot = process.env.VNO_CDP_LOCALAPPDATA;
if (!profileRoot) throw new Error("Set VNO_CDP_LOCALAPPDATA to a unique profile path before running.");
const outputDir = path.resolve("docs/assets/q50-ui");
mkdirSync(outputDir, { recursive: true });
let failed = false;
for (const app of ["writer", "sheet", "slides"]) {
  const session = await launchApp(app, { localAppData: path.join(profileRoot, app) });
  try {
    const win = await session.cdp.send("Browser.getWindowForTarget", {});
    await session.cdp.send("Browser.setWindowBounds", { windowId: (win.result || win).windowId, bounds: { windowState: "normal", width: 1366, height: 768 } });
    await sleep(400);
    const ready = await session.cdp.evaluate(`Boolean(document.querySelector(${JSON.stringify(app === "writer" ? ".vno-writer-body" : app === "sheet" ? ".vno-sheet-container" : ".vno-slide-canvas")}))`);
    if (!ready) failed = true;
    console.log(`${ready ? "PASS" : "FAIL"} | ${app} app mounted at 1366x768`);
    for (const theme of ["light", "dark"]) {
      await session.cdp.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
      await sleep(100);
      const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      writeFileSync(path.join(outputDir, `${app}-smoke-${theme}-1366x768.png`), Buffer.from((shot.result || shot).data, "base64"));
    }
  } finally {
    await session.close();
  }
}
if (failed) process.exitCode = 1;
