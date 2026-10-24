import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click } from "./actions.mjs";
import { sleep } from "./client.mjs";

const sourceDir = "E:\\VN OFice\\file test\\lan-legacy";
const expected = new Map([["legacy06.doc", 3], ["legacy13.doc", 1], ["legacy14.doc", 15], ["legacy20.doc", 1]]);
const selectedFiles = new Set((process.env.VNO_Q57_FILES || "").split(",").filter(Boolean));
const profileRoot = process.env.VNO_CDP_LOCALAPPDATA;
if (!profileRoot) throw new Error("Set VNO_CDP_LOCALAPPDATA to a fresh profile path for this run.");
const screenshotDir = path.join(profileRoot, "q57-screenshots");
await fs.mkdir(screenshotDir, { recursive: true });
let failed = false;

for (const [file, wanted] of expected) {
  if (selectedFiles.size && !selectedFiles.has(file)) continue;
  const session = await launchApp("writer", {
    filePath: path.join(sourceDir, file),
    localAppData: path.join(profileRoot, file.replaceAll(".", "-") + "-profile"),
    startTimeoutMilliseconds: 180000,
    readyTimeoutMilliseconds: 180000,
  });
  try {
    const windowInfo = await session.cdp.send("Browser.getWindowForTarget");
    const windowId = (windowInfo.result || windowInfo).windowId;
    await session.cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal", width: 1366, height: 768 } });
    await session.cdp.waitFor(`(() => {
      const app = window.__vnoAppInstance;
      const adapter = app?.adapter;
      const opened = window.__vnoStartupEvents?.some(event => event.name === 'document_open_complete');
      return !!adapter && (opened || String(adapter._sourcePath || adapter.sourceFilePath || '').toLowerCase().endsWith(${JSON.stringify(file.toLowerCase())}));
    })()`, { timeoutMilliseconds: 300000, intervalMilliseconds: 500 });
    await sleep(2000);
    const result = await session.cdp.evaluate(`(() => {
      const body = document.querySelector('.vno-writer-body');
      const status = document.querySelector('.vno-statusbar')?.textContent || '';
      return {
        status: status.replace(/\\s+/g, ' ').trim(),
        pageCount: Number(body?.closest('[data-page-count]')?.dataset.pageCount || window.writerAdapter?._livePageCount || 0),
        gaps: body?.querySelectorAll('[data-vno-auto-page-gap="true"]').length ?? -1,
        markers: body?.querySelectorAll('.vno-hyphenation-marker').length ?? -1,
        markerStyles: [...(body?.querySelectorAll('.vno-hyphenation-marker') || [])].map(el => ({ display: getComputedStyle(el).display, rect: el.getBoundingClientRect().toJSON() })),
        bodyRect: body?.getBoundingClientRect().toJSON(),
      };
    })()`);
    const screenshot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(path.join(screenshotDir, `${file.replace(".doc", "")}-light-1366x768.png`), Buffer.from((screenshot.result || screenshot).data, "base64"));
    const pages = Number(result.status.match(/\/\s*(\d+)/)?.[1] || result.pageCount || 0);
    const pass = pages === wanted;
    console.log(`${pass ? "PASS" : "FAIL"} | ${file} canvas pages ${pages}/${wanted} | ${JSON.stringify(result)}`);
    failed ||= !pass;

    await click(session.cdp, "#vno-toggle-theme-btn");
    await session.cdp.waitFor("document.documentElement.dataset.theme === 'dark'", { timeoutMilliseconds: 10000, intervalMilliseconds: 100 });
    await sleep(800);
    const darkScreenshot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(path.join(screenshotDir, `${file.replace(".doc", "")}-dark-1366x768.png`), Buffer.from((darkScreenshot.result || darkScreenshot).data, "base64"));
  } finally {
    await session.close();
  }
}
console.log(`SCREENSHOTS | ${screenshotDir}`);
if (failed) process.exitCode = 1;
