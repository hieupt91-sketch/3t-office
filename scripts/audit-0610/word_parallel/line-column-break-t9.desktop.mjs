import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click, press, typeText } from "../../../tests/live/cdp/actions.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const dir = process.env.VNO_CDP_LOCALAPPDATA;
if (!dir || !process.env.VNO_APP_ROOT) throw new Error("Set VNO_CDP_LOCALAPPDATA and VNO_APP_ROOT.");
mkdirSync(dir, { recursive: true });
const output = `${dir}\\app_line_column_break_t9.docx`;
const session = await launchApp("writer", { localAppData: dir, root: process.env.VNO_APP_ROOT, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  await cdp.waitFor("!!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  const body = ".vno-writer-body";
  const layout = await cdp.evaluate("[...document.querySelectorAll('.vno-ribbon-tab')].findIndex(x=>/Bố cục|Layout/i.test(x.textContent))");
  await click(cdp, ".vno-ribbon-tab", layout);
  await click(cdp, 'button[data-command-id="writer.page.columns2"]');
  await click(cdp, `${body} p`, 0);
  await typeText(cdp, "Alpha", 10);
  await press(cdp, "Enter", { shift: true });
  await typeText(cdp, "Line after", 10);
  await click(cdp, 'button[data-dropdown-id="writer.layout.breaks"]');
  await click(cdp, '[role="menuitem"][data-command-id="writer.break.column"]');
  await typeText(cdp, "Next column", 10);
  const state = await cdp.evaluate(`(() => { const a=window.__vnoAppInstance.adapter; return {text:${JSON.stringify("")},html:a.bodyDom.innerHTML,columns:a.columns}; })()`);
  state.text = await cdp.evaluate(`document.querySelector(${JSON.stringify(body)}).innerText`);
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(`${dir}\\line-column-break-t9.png`, Buffer.from(shot.result.data, "base64"));
  const saved = await cdp.evaluate(`(() => {const a=window.__vnoAppInstance.adapter;return globalThis.globalUnoBridge.saveRealFileInPlace("writer",a._contentForExport(),${JSON.stringify(output)},${JSON.stringify(output)});})()`, { awaitPromise: true, timeoutMilliseconds: 240000 });
  console.log(JSON.stringify({ state, saved, output, screenshot: `${dir}\\line-column-break-t9.png` }));
} finally { await session.close(); }
