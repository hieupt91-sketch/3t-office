import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { launchApp, repoRoot } from "./session.mjs";
import { click, mouseClick, press, sleep, typeText } from "./actions.mjs";

const screenshotDir = path.join(repoRoot, "docs", "screenshots");
await mkdir(screenshotDir, { recursive: true });
const session = await launchApp("sheet", { localAppData: path.join(os.tmpdir(), `vno-cdp-q66-legacy-warning-${Date.now()}`) });
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
try {
  const cdp = session.cdp;
  await cdp.waitFor("window.__vnoAppInstance?.grid && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 90000 });
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await sleep(400);
  const ev = expression => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 30000 });
  const saveShot = async filename => {
    const response = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(path.join(screenshotDir, filename), Buffer.from(response.result?.data || "", "base64"));
  };
  const enter = async (coord, formula) => {
    const point = await ev(`(() => { const el = document.querySelector('[data-coord="${coord}"]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x:r.x+r.width/2,y:r.y+r.height/2 }; })()`);
    if (!point) throw new Error(`Không tìm thấy ô ${coord}`);
    await mouseClick(cdp, point.x, point.y);
    await typeText(cdp, formula, 2);
    await press(cdp, "Enter");
    await sleep(250);
  };
  const notification = () => ev(`(() => {
    const bar = document.querySelector('.vno-notification-bar');
    return { count: document.querySelectorAll('.vno-notification-bar').length,
      text: bar?.querySelector('.vno-notification-bar-message')?.textContent?.trim() || '',
      action: bar?.querySelector('.vno-notification-bar-action-btn')?.textContent?.trim() || '',
      rect: bar ? (() => { const r=bar.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}; })() : null,
      overflow: bar ? bar.scrollWidth > bar.clientWidth || bar.scrollHeight > bar.clientHeight : false };
  })()`);

  await enter("A1", "=XLOOKUP(A1;B:B;C:C)");
  const first = await notification();
  check("XLOOKUP cảnh báo khả năng tương thích mà không chặn công thức", first.text.includes("XLOOKUP") && first.text.includes("2019/365") && first.text.includes("#NAME?") && (await ev(`!!window.__vnoAppInstance.grid.cellsData.get("A1")?.formula`)), JSON.stringify(first));
  check("Thanh cảnh báo vừa khung 1366x768", first.count === 1 && !first.overflow && first.rect?.bottom <= 768, JSON.stringify(first.rect));
  await saveShot("q66-legacy-warning-light.png");

  await enter("A2", "=XLOOKUP(A1;B:B;C:C)");
  const repeated = await notification();
  check("XLOOKUP chỉ cảnh báo một lần trong phiên", repeated.count === 1 && repeated.text === first.text, JSON.stringify(repeated));
  await enter("A3", "=_xlfn._xlws.FILTER(A1:A3;A1:A3>0)");
  const filter = await notification();
  check("Nhận diện tiền tố _xlfn của FILTER", filter.text.includes("FILTER") && filter.text.includes("#NAME?"), JSON.stringify(filter));
  await click(cdp, "#vno-toggle-theme-btn");
  await sleep(300);
  await saveShot("q66-legacy-warning-dark.png");
  const darkStyle = await ev(`getComputedStyle(document.querySelector('.vno-notification-bar')).backgroundColor`);
  check("Thông báo hiển thị trong giao diện tối", Boolean(darkStyle));
  await ev(`document.querySelector('.vno-notification-bar-action-btn')?.click()`);
  await sleep(200);
  await enter("A4", "=UNIQUE(A1:A3)");
  const disabled = await notification();
  check("Tắt cảnh báo có hiệu lực trong phiên", disabled.count === 0, JSON.stringify(disabled));
} catch (error) {
  check("CDP không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close().catch(() => {});
}
if (checks.some(pass => !pass)) process.exit(1);
