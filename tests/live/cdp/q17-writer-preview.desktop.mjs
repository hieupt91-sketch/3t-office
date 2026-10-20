import { launchApp } from "./session.mjs";
import { press } from "./actions.mjs";
import fs from "node:fs";
import path from "node:path";

const root = process.env.VNO_CDP_LOCALAPPDATA;
const source = process.env.Q17_SOURCE_DOCX;
if (!root || !source) throw new Error("Set fresh VNO_CDP_LOCALAPPDATA and Q17_SOURCE_DOCX.");
fs.mkdirSync(root, { recursive: true });
const session = await launchApp("writer", {
  filePath: source,
  localAppData: path.join(root, "create"),
  startTimeoutMilliseconds: 180000,
  readyTimeoutMilliseconds: 180000,
});
try {
  const cdp = session.cdp;
  const expected = source.replace(/\\/g, "/").toLowerCase();
  await cdp.waitFor(`(() => { const a=window.__vnoAppInstance?.adapter; return String(a?._sourcePath||a?.sourceFilePath||'').replace(/\\\\/g,'/').toLowerCase()===${JSON.stringify(expected)}; })()`, { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  const previewStartedAt = Date.now();
  await press(cdp, "F2", { ctrl: true }, 0);
  await cdp.waitFor("document.querySelector('.vno-print-preview-overlay')", { timeoutMilliseconds: 15000, intervalMilliseconds: 100 });
  const elapsedMs = Date.now() - previewStartedAt;
  const state = await cdp.evaluate(`(() => ({
    pages: document.querySelectorAll('.vno-print-preview-sheet').length,
    total: Number(document.querySelector('.vno-print-preview-total-pages')?.textContent || 0),
    printDialog: !!document.querySelector('.vno-print-dialog-overlay')
  }))()`);
  state.elapsedMs = elapsedMs;
  console.log(JSON.stringify(state));
  console.log(`${state.pages > 0 && state.total === state.pages && !state.printDialog ? "PASS" : "FAIL"} | Ctrl+F2 dựng preview báo cáo dài`);
  if (!(state.pages > 0 && state.total === state.pages && !state.printDialog)) process.exitCode = 1;
} finally {
  await session.close();
}
