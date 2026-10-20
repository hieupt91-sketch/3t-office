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
  { app: "writer", forbidden: /sổ làm việc|trang tính|workbook|worksheet|slide|trang chiếu/i, scope: "Phạm vi in", options: ["Tất cả tài liệu", "Trang hiện tại", "Vùng chọn (văn bản đang bôi đen)"] },
  { app: "sheet", forbidden: /slide|trang chiếu|văn bản đang bôi đen/i, required: /Phạm vi sổ làm việc|In trang tính hiện hoạt|In toàn bộ sổ làm việc/i, scope: "Phạm vi sổ làm việc", options: ["In trang tính hiện hoạt", "In toàn bộ sổ làm việc", "In vùng chọn"] },
  { app: "slides", forbidden: /sổ làm việc|trang tính|workbook|worksheet|văn bản đang bôi đen/i, scope: "Phạm vi slide", options: ["In tất cả slide", "Slide hiện tại", "Slide đã chọn", "Slide ẩn"] },
];
const selectedCases = cases.filter(testCase => !process.env.VNO_Q34_APP || testCase.app === process.env.VNO_Q34_APP);

await mkdir(evidenceRoot, { recursive: true });
let failures = 0;
for (const { app, forbidden, required, scope: expectedScope, options } of selectedCases) {
  let session;
  try {
    session = await launchApp(app, { localAppData: path.join(runRoot, app), startTimeoutMilliseconds: 120000 });
    await session.cdp.send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
    console.log(`CDP ${app}: open print dialog`);
    await session.cdp.evaluate("import('/platform/commands/command-bus.js').then(({globalCommandBus}) => { globalCommandBus.execute('common.file.print'); return true; })");
    await session.cdp.waitFor("!!document.querySelector('.vno-print-dialog-overlay')", { timeoutMilliseconds: 30000 });
    await session.cdp.waitFor("document.querySelector('.vno-print-dialog-status')?.textContent.trim() === 'Sẵn sàng in.'", { timeoutMilliseconds: 60000 });
    await sleep(250);
    console.log(`CDP ${app}: read dialog state`);
    const result = await session.cdp.evaluate(`(() => {
      const overlay = document.querySelector('.vno-print-dialog-overlay');
      const scope = overlay.querySelector('[data-print-scope]:not([hidden])');
      const range = overlay.querySelector('.vno-print-range');
      return {
        text: overlay.innerText,
        scopeText: scope.innerText,
        rangeLegend: range.querySelector('legend')?.innerText,
        rangeInputs: [...range.querySelectorAll('input[name="rangeMode"]')].map(x => x.value),
        scopeLegend: scope.querySelector('legend')?.innerText,
        scopeOptions: [...scope.querySelectorAll('label span')].map(x => x.innerText),
        scopeHelp: scope.querySelector('.vno-print-selection-help')?.innerText || "",
        bounds: (() => { const r=overlay.querySelector('.vno-print-dialog').getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; })(),
        dimensions: { width: innerWidth, height: innerHeight }
      };
    })()`);
    console.log(`CDP ${app}: capture light screenshot`);
    const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const screenshotData = (shot.result || shot).data;
    if (!screenshotData) throw new Error(`Screenshot response has no data: ${JSON.stringify(shot)}`);
    await writeFile(path.join(evidenceRoot, `${app}-1366x768-light.png`), Buffer.from(screenshotData, "base64"));
    console.log(`CDP ${app}: switch dark theme`);
    await session.cdp.evaluate("document.documentElement.setAttribute('data-theme','dark')");
    await sleep(150);
    const darkShot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(path.join(evidenceRoot, `${app}-1366x768-dark.png`), Buffer.from((darkShot.result || darkShot).data, "base64"));
    console.log(`CDP ${app}: verify scope and page range mapping`);
    const scopeMapping = await session.cdp.evaluate(`(() => {
      const overlay = document.querySelector('.vno-print-dialog-overlay');
      const current = overlay.querySelector('input[name="documentScope"][value="current"]');
      let currentMapsToPage = null;
      let allMapsToAll = null;
      if (current) {
        current.click();
        currentMapsToPage = overlay.querySelector('input[name="rangeMode"][value="current"]').checked;
        overlay.querySelector('input[name="documentScope"][value="all"]').click();
        allMapsToAll = overlay.querySelector('input[name="rangeMode"][value="all"]').checked;
      }
      const custom = overlay.querySelector('input[name="rangeMode"][value="custom"]');
      custom.click();
      const input = overlay.querySelector('#vno-print-range-input');
      input.value = '1-3,5';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return { currentMapsToPage, allMapsToAll, customEnabled: !input.disabled, customValue: input.value };
    })()`);
    if (forbidden) assert.doesNotMatch(result.text, forbidden, `${app} contains wording from another application`);
    if (required) assert.match(result.text, required, `${app} is missing Sheet wording`);
    assert.equal(result.scopeLegend, expectedScope, `${app} scope legend differs`);
    assert.deepEqual(result.scopeOptions, options, `${app} scope options differ`);
    assert.ok(result.scopeHelp, `${app} should explain why selection scope is unavailable`);
    assert.doesNotMatch(result.text.split("\n")[2] || "", /^(?:TaiLieu|BangTinh|TrinhChieu)$/i, `${app} exposes an internal placeholder name`);
    assert.deepEqual(result.rangeInputs, ["all", "current", "custom"]);
    assert.equal(result.rangeLegend, "Phạm vi trang");
    assert.deepEqual(scopeMapping, {
      currentMapsToPage: app === "sheet" ? null : true,
      allMapsToAll: app === "sheet" ? null : true,
      customEnabled: true,
      customValue: "1-3,5"
    });
    console.log(`PASS ${app} | ${JSON.stringify(result)}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${app} | ${error.stack || error}`);
  } finally {
    await session?.close();
  }
}
if (failures) process.exitCode = 1;
