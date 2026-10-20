import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { repoRoot } from "./session.mjs";
import { sleep } from "./client.mjs";

const evidenceRoot = path.join(repoRoot, "docs", "assets", "q34-ui");
const runRoot = process.env.VNO_CDP_LOCALAPPDATA;
if (!runRoot) throw new Error("Set VNO_CDP_LOCALAPPDATA to a unique local profile root for this run.");
const cases = [
  { app: "writer", forbidden: /sổ làm việc|trang tính|workbook|worksheet/i },
  { app: "sheet", required: /Phạm vi sổ làm việc|In trang tính hiện hoạt|In toàn bộ sổ làm việc/i },
  { app: "slides", forbidden: /sổ làm việc|trang tính|workbook|worksheet/i },
];
const selectedCases = cases.filter(testCase => !process.env.VNO_Q34_APP || testCase.app === process.env.VNO_Q34_APP);

await mkdir(evidenceRoot, { recursive: true });
let failures = 0;
for (const { app, forbidden, required } of selectedCases) {
  let session;
  try {
    session = await launchApp(app, { localAppData: path.join(runRoot, app), startTimeoutMilliseconds: 120000 });
    await session.cdp.send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
    await session.cdp.evaluate("import('/platform/commands/command-bus.js').then(({globalCommandBus}) => globalCommandBus.execute('common.file.print'))");
    await session.cdp.waitFor("!!document.querySelector('.vno-print-dialog-overlay')", { timeoutMilliseconds: 30000 });
    await sleep(3000);
    const result = await session.cdp.evaluate(`(() => {
      const overlay = document.querySelector('.vno-print-dialog-overlay');
      const scope = overlay.querySelector('.vno-print-sheet-scope');
      const range = overlay.querySelector('.vno-print-range');
      return {
        text: overlay.innerText,
        scopeHidden: getComputedStyle(scope).display === 'none',
        scopeText: scope.innerText,
        rangeLegend: range.querySelector('legend')?.innerText,
        rangeInputs: [...range.querySelectorAll('input[name="rangeMode"]')].map(x => x.value),
        bounds: (() => { const r=overlay.querySelector('.vno-print-dialog').getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; })(),
        dimensions: { width: innerWidth, height: innerHeight }
      };
    })()`);
    const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const screenshotData = (shot.result || shot).data;
    if (!screenshotData) throw new Error(`Screenshot response has no data: ${JSON.stringify(shot)}`);
    await writeFile(path.join(evidenceRoot, `${app}-1366x768-light.png`), Buffer.from(screenshotData, "base64"));
    await session.cdp.evaluate("document.documentElement.setAttribute('data-theme','dark')");
    await sleep(150);
    const darkShot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(path.join(evidenceRoot, `${app}-1366x768-dark.png`), Buffer.from((darkShot.result || darkShot).data, "base64"));
    if (app !== "sheet") assert.equal(result.scopeHidden, true, `${app} must hide Sheet scope`);
    if (forbidden) assert.doesNotMatch(result.text, forbidden, `${app} contains Sheet-only wording`);
    if (required) assert.match(result.text, required, `${app} is missing Sheet wording`);
    assert.doesNotMatch(result.text.split("\n")[2] || "", /^(?:TaiLieu|BangTinh|TrinhChieu)$/i, `${app} exposes an internal placeholder name`);
    assert.deepEqual(result.rangeInputs, ["all", "current", "custom"]);
    console.log(`PASS ${app} | ${JSON.stringify(result)}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${app} | ${error.stack || error}`);
  } finally {
    await session?.close();
  }
}
if (failures) process.exitCode = 1;
