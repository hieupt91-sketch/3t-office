import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { launchApp, repoRoot } from "./session.mjs";

const runRoot = process.env.VNO_CDP_LOCALAPPDATA;
if (!runRoot) throw new Error("Set VNO_CDP_LOCALAPPDATA to a unique local profile root for this run.");
const evidenceRoot = path.join(repoRoot, "docs", "assets", "q34-ui");
const cases = [
  { app: "writer", label: "Writer", forbidden: /sổ làm việc|trang tính|worksheet|workbook/i, info: /Mã hóa bằng mật khẩu/ },
  { app: "sheet", label: "Sheet", forbidden: /bản trình chiếu|trang chiếu|presentation|slide/i, info: /sổ làm việc/ },
  { app: "slides", label: "Slides", forbidden: /sổ làm việc|trang tính|worksheet|workbook/i, info: /bản trình bày/ },
];
const selectedCases = cases.filter((item) => !process.env.VNO_Q34_APP || item.app === process.env.VNO_Q34_APP);

await mkdir(evidenceRoot, { recursive: true });
let failures = 0;
for (const { app, label, forbidden, info } of selectedCases) {
  let session;
  try {
    session = await launchApp(app, { localAppData: path.join(runRoot, app), startTimeoutMilliseconds: 120000 });
    const { cdp } = session;
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
    await cdp.evaluate("import('/platform/commands/command-bus.js').then(({globalCommandBus}) => { globalCommandBus.execute('common.file.backstage'); return true; })");
    await cdp.waitFor("!!document.querySelector('#vno-backstage-options')", { timeoutMilliseconds: 20000 });
    await cdp.evaluate("document.querySelector('#vno-backstage-options').click()");
    await cdp.waitFor("!!document.querySelector('#vno-options-dialog-title')", { timeoutMilliseconds: 10000 });
    const optionsText = await cdp.evaluate("document.querySelector('.vno-dialog-overlay')?.innerText || ''");
    assert.doesNotMatch(optionsText, forbidden, `${app} Options contains another app's wording`);
    await capture(cdp, app, "options");
    await cdp.evaluate("document.querySelector('.vno-options-close-btn').click()");

    await cdp.evaluate("import('/platform/commands/command-bus.js').then(({globalCommandBus}) => { globalCommandBus.execute('common.file.backstage'); return true; })");
    await cdp.waitFor("!!document.querySelector('#vno-backstage-writer-info')", { timeoutMilliseconds: 20000 });
    await cdp.evaluate("document.querySelector('#vno-backstage-writer-info').click()");
    await cdp.waitFor("document.querySelector('#vno-backstage-info-view')?.innerText.trim().length > 0", { timeoutMilliseconds: 20000 });
    await cdp.evaluate("new Promise(resolve => setTimeout(resolve, 500))");
    const infoText = await cdp.evaluate("document.querySelector('#vno-backstage-info-view')?.innerText || ''");
    assert.match(infoText, info, `${app} file information should use its own document name: ${infoText.slice(0, 360)}`);
    assert.doesNotMatch(infoText, forbidden, `${app} file information contains another app's wording`);
    await capture(cdp, app, "file-info");
    console.log(`PASS ${app} | Options and file information | ${JSON.stringify({ options: optionsText.slice(0, 240), info: infoText.slice(0, 360) })}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${app} | ${error.stack || error}`);
  } finally {
    await session?.close();
  }
}
if (failures) process.exitCode = 1;

async function capture(cdp, app, dialog) {
  const take = async (theme) => {
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(path.join(evidenceRoot, `${app}-${dialog}-1366x768-${theme}.png`), Buffer.from((shot.result || shot).data, "base64"));
  };
  await take("light");
  await cdp.evaluate("document.documentElement.setAttribute('data-theme','dark')");
  await take("dark");
  await cdp.evaluate("document.documentElement.removeAttribute('data-theme')");
}
