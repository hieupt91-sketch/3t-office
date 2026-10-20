import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { clickCommand, switchRibbonTab } from "./audit_helpers.mjs";
import { sleep } from "./actions.mjs";

const out = path.resolve("docs/assets/q40-ui"); mkdirSync(out, { recursive: true });
const phase = process.env.VNO_Q40_PHASE || "after";
const session = await launchApp("writer", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const { cdp } = session; const checks = [];
const ev = source => cdp.evaluate(source, { awaitPromise: true });
const resize = async (width, height) => { const win = await cdp.send("Browser.getWindowForTarget", {}); await cdp.send("Browser.setWindowBounds", { windowId: (win.result || win).windowId, bounds: { windowState: "normal", width, height } }); await sleep(300); };
const shot = async name => { const image = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); writeFileSync(path.join(out, `${name}-${phase}.png`), Buffer.from((image.result || image).data, "base64")); };
try {
  for (const [width, height] of [[1366, 768], [1280, 720]]) for (const theme of ["light", "dark"]) {
    await resize(width, height); await ev(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
    await switchRibbonTab(cdp, "mailings");
    await clickCommand(cdp, "writer.mailMerge.addressBlock");
    const first = await ev(`document.getElementById('vno-status-docinfo')?.textContent?.trim() || ''`);
    await clickCommand(cdp, "writer.mailMerge.greetingLine"); await sleep(150);
    const second = await ev(`document.getElementById('vno-status-docinfo')?.textContent?.trim() || ''`);
    await shot(`q40-writer-mailmerge-${width}x${height}-${theme}`);
    const passed = Boolean(first && second && second !== first && /lời chào/i.test(second));
    checks.push(passed); console.log(`${passed ? "PASS" : "FAIL"} | Lời chào reports missing data source after another missing-source action ${width}x${height} ${theme} | ${JSON.stringify({ first, second })}`);
  }
} catch (error) { checks.push(false); console.error(error.stack || error); }
finally { await session.close(); }
console.log(`SUMMARY ${checks.filter(Boolean).length}/${checks.length} PASS | ${checks.length - checks.filter(Boolean).length} FAIL`);
if (checks.some(Boolean) === false) process.exitCode = 1;
