// Q36: opening Writer's context menu must hide the floating mini toolbar.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep } from "./client.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to an isolated profile.");
const output = path.resolve(process.env.Q36_SCREENSHOT_DIR || "docs/assets/q36-ui/mini-after");
await mkdir(output, { recursive: true });
const session = await launchApp("writer", { localAppData: profile });
const failures = [];
const check = (name, pass, detail = "") => {
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
  if (!pass) failures.push(name);
};

try {
  const { cdp } = session;
  await sleep(800);
  await cdp.evaluate(`(() => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<p>Q36 menu context test</p>';
    body.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);

  for (const [width, height] of [[1366, 768], [1280, 720], [1024, 600]]) {
    const target = await cdp.send("Browser.getWindowForTarget");
    await cdp.send("Browser.setWindowBounds", {
      windowId: target.result.windowId,
      bounds: { windowState: "normal", width, height },
    });
    await sleep(800);
    for (const theme of ["light", "dark"]) {
      await cdp.evaluate(`document.documentElement.dataset.theme = ${JSON.stringify(theme)}`);
      await cdp.evaluate(`(() => {
        const body = document.querySelector('.vno-writer-body');
        body.innerHTML = '<p>Q36 menu context test</p>';
        body.dispatchEvent(new Event('input', { bubbles: true }));
        const text = body.querySelector('p').firstChild;
        const range = document.createRange(); range.selectNodeContents(text);
        const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      })()`);
      const point = await cdp.evaluate(`(() => { const r = document.querySelector('.vno-writer-body p').getBoundingClientRect(); return { x:r.left + 36, y:r.top + 12 }; })()`);
      await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "right", buttons: 2, clickCount: 1 });
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "right", buttons: 0, clickCount: 1 });
      await sleep(300);
      const metrics = await cdp.evaluate(`(() => {
        const menu = document.querySelector('.vno-context-menu');
        const mini = document.querySelector('.vno-mini-toolbar');
        const rect = element => { const r = element?.getBoundingClientRect(); return r && { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height }; };
        const r = rect(menu);
        const miniRect = rect(mini);
        return { menu:!!menu, mini:!!mini, menuRect:r,
          miniRect,
          overlap:!!r && !!miniRect && r.left < miniRect.right && r.right > miniRect.left && r.top < miniRect.bottom && r.bottom > miniRect.top,
          menuInside:!!r && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
          menuScroll:menu?.scrollHeight || 0, menuClient:menu?.clientHeight || 0 };
      })()`);
      check(`${width}x${height} ${theme}: menu ngữ cảnh hiển thị`, metrics.menu, JSON.stringify(metrics.menuRect));
      check(`${width}x${height} ${theme}: mini toolbar ẩn khi menu mở`, !metrics.mini, JSON.stringify({ miniRect: metrics.miniRect, overlap: metrics.overlap }));
      check(`${width}x${height} ${theme}: menu nằm trọn trong cửa sổ`, metrics.menuInside, JSON.stringify(metrics.menuRect));
      const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
      await writeFile(path.join(output, `writer-context-${width}x${height}-${theme}.png`), Buffer.from(shot.result.data, "base64"));
      console.log(`METRICS | Writer context ${width}x${height} ${theme} | ${JSON.stringify(metrics)}`);
      await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Escape", windowsVirtualKeyCode: 27 });
      await sleep(100);
    }
  }
} finally {
  await session.close();
}

if (failures.length) process.exit(1);
