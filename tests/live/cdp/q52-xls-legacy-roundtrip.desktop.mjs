import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";

const corpus = process.env.VNO_Q52_LEGACY_CORPUS || "E:\\VN OFice\\file test\\lan-legacy";
const outputDir = process.env.VNO_Q52_XLS_OUT || "E:\\VNOffice-briefs\\logs\\Q52-work\\xls-libreoffice";
const artifacts = process.env.VNO_Q52_ARTIFACTS || "E:\\VNOffice-briefs\\logs\\Q52-work\\ui-xls";
const firstIndex = Number(process.env.VNO_Q52_FIRST_INDEX || 1);
const lastIndex = Number(process.env.VNO_Q52_LAST_INDEX || 20);
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(artifacts, { recursive: true });

const results = [];
for (let index = firstIndex; index <= lastIndex; index += 1) {
  const fileName = `legacy${String(index).padStart(2, "0")}.xls`;
  const sourcePath = path.resolve(corpus, fileName);
  const outputPath = path.resolve(outputDir, `_rt_${fileName}`);
  const session = await launchApp("sheet", {
    filePath: sourcePath,
    startTimeoutMilliseconds: 180000,
    readyTimeoutMilliseconds: 180000,
  });
  try {
    await session.cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await session.cdp.waitFor(
      `String(window.__vnoAppInstance?.adapter?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase() === ${JSON.stringify(sourcePath.replaceAll("\\", "/").toLowerCase())}`,
      { timeoutMilliseconds: 180000, intervalMilliseconds: 250 },
    );
    await session.cdp.waitFor(
      `document.querySelector('.vno-notification-bar')?.innerText?.includes('(.xls)') === true`,
      { timeoutMilliseconds: 10000, intervalMilliseconds: 100 },
    );
    const inspect = await session.cdp.evaluate(`(() => {
      const bar = document.querySelector('.vno-notification-bar');
      const action = bar?.querySelector('.vno-notification-bar-action-btn');
      const r = bar?.getBoundingClientRect();
      const style = bar ? getComputedStyle(bar) : null;
      return JSON.stringify({
        warning: bar?.innerText || '', action: action?.innerText || '',
        rect: r ? { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom } : null,
        visible: !!r && r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0,
        viewport: { width:innerWidth, height:innerHeight, scrollWidth:document.documentElement.scrollWidth },
        sheets: window.__vnoAppInstance.adapter.grid?.sheets?.length || 0,
        cells: Object.values(window.__vnoAppInstance.adapter.grid?.sheetsData || {}).reduce((n, cells) => n + cells.size, 0)
      });
    })()`);
    const state = JSON.parse(inspect);
    const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(path.join(artifacts, `sheet-${fileName}-light.png`), Buffer.from((shot.result || shot).data, "base64"));

    const warningOk = state.warning.includes("Tệp định dạng cũ (.xls)") && state.action.includes(".xlsx");
    const r = state.rect;
    const geometryOk = !!r && r.x >= 0 && r.right <= 1366 && r.bottom <= 768 && state.viewport.scrollWidth <= 1366;
    const saveResult = await session.cdp.evaluate(`(async () => {
      const adapter = window.__vnoAppInstance.adapter;
      const content = adapter.serializeToFods();
      const result = await window.pywebview.api.save_document_in_place(content, 'sheet', ${JSON.stringify(outputPath)}, ${JSON.stringify(sourcePath)});
      return JSON.stringify(result);
    })()`, { awaitPromise: true, timeoutMilliseconds: 180000 });
    const saved = JSON.parse(saveResult || "{}");
    const bytes = saved.status === "ok" ? await fs.readFile(outputPath) : Buffer.alloc(0);
    const cfb = bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
    const pass = warningOk && geometryOk && saved.status === "ok" && cfb;
    results.push(pass);
    console.log(`${pass ? "PASS" : "FAIL"} | ${fileName} | warning=${warningOk} visible=${state.visible} geometry=${geometryOk} rect=${JSON.stringify(state.rect)} saved=${saved.status || "missing"} cfb=${cfb} sheets=${state.sheets} cells=${state.cells}`);
  } finally {
    await session.close();
  }
}
console.log(`SUMMARY | ${results.filter(Boolean).length}/${results.length} passed`);
if (results.some((pass) => !pass)) process.exitCode = 1;
