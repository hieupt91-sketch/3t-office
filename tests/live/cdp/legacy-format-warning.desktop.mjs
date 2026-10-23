import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const corpus = process.env.VNO_Q52_LEGACY_CORPUS || "E:\\VN OFice\\file test\\lan-legacy";
const artifacts = process.env.VNO_Q52_ARTIFACTS || "E:\\VNOffice-briefs\\logs\\Q52-work\\ui";
await fs.mkdir(artifacts, { recursive: true });

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};

async function inspectLegacy(app, fileName, extension) {
  const filePath = path.join(corpus, fileName);
  const session = await launchApp(app, {
    filePath,
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
    const ev = (expression) => session.cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 180000 });
    await session.cdp.waitFor(
      "!!(window.__vnoAppInstance?.adapter?._sourcePath || window.__vnoAppInstance?.adapter?.sourceFilePath)",
      { timeoutMilliseconds: 180000 },
    );
    await sleep(300);
    const state = await ev(`(() => {
      const bar = document.querySelector('.vno-notification-bar');
      const action = bar?.querySelector('.vno-notification-bar-action-btn');
      const r = bar?.getBoundingClientRect();
      return JSON.stringify({
        text: bar?.innerText || '', action: action?.innerText || '',
        visible: !!bar && r.width > 0 && r.height > 0,
        rect: r ? { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom } : null,
        viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }
      });
    })()`);
    const parsed = JSON.parse(state || "{}");
    const expectedMessage = `Tệp định dạng cũ (.${extension})`;
    check(`${fileName}: có cảnh báo định dạng cũ bằng tiếng Việt`, parsed.visible && parsed.text.includes(expectedMessage), parsed.text || "cảnh báo không xuất hiện");
    check(`${fileName}: có nút lưu sang định dạng mới`, parsed.action.toLowerCase().includes(extension === "doc" ? ".docx" : ".xlsx"), parsed.action || "không có nút hành động");
    const rect = parsed.rect;
    check(`${fileName}: cảnh báo không tràn/cắt ở 1366x768`, !!rect && rect.x >= 0 && rect.y >= 0 && rect.right <= 1366 && rect.bottom <= 768 && parsed.viewport.scrollWidth <= 1366, JSON.stringify({ rect, viewport: parsed.viewport }));

    const light = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(path.join(artifacts, `${app}-${extension}-warning-light.png`), Buffer.from((light.result || light).data, "base64"));
    await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);
    await sleep(250);
    const dark = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(path.join(artifacts, `${app}-${extension}-warning-dark.png`), Buffer.from((dark.result || dark).data, "base64"));

    if (parsed.visible) {
      await ev(`(async () => {
        window.__q52SaveCall = null;
        const { globalUnoBridge } = await import('/adapters/libreoffice/common/uno-bridge.js');
        window.__q52OriginalSaveRealFile = globalUnoBridge.saveRealFile;
        globalUnoBridge.saveRealFile = async (...args) => {
          window.__q52SaveCall = { format: args[2], suggestedName: args[3] };
          return { status: 'cancelled' };
        };
        document.querySelector('.vno-notification-bar-action-btn')?.click();
        return true;
      })()`);
      await sleep(250);
      const call = JSON.parse(await ev("JSON.stringify(window.__q52SaveCall || {})"));
      await ev(`import('/adapters/libreoffice/common/uno-bridge.js').then(({ globalUnoBridge }) => { globalUnoBridge.saveRealFile = window.__q52OriginalSaveRealFile; })`);
      const targetFormat = extension === "doc" ? "docx" : "xlsx";
      check(`${fileName}: nút cảnh báo gọi Lưu thành ${extension === "doc" ? ".docx" : ".xlsx"}`,
        call.format === targetFormat && new RegExp(`\\.${targetFormat}$`, "i").test(call.suggestedName || ""), JSON.stringify(call));
    }
  } finally {
    await session.close();
  }
}

await inspectLegacy("writer", "legacy06.doc", "doc");
await inspectLegacy("sheet", "legacy06.xls", "xls");
console.log(`SUMMARY | ${checks.filter(Boolean).length}/${checks.length} passed`);
if (checks.some((pass) => !pass)) process.exitCode = 1;
