// Q36: Help panel keeps search/results fixed and places article plus controls in one scroll region.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep } from "./client.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to an isolated profile.");
const output = path.resolve(process.env.Q36_SCREENSHOT_DIR || "docs/assets/q36-ui/before");
await mkdir(output, { recursive: true });
const session = await launchApp("writer", { localAppData: profile });
const failures = [];
const check = (name, pass, detail = "") => {
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
  if (!pass) failures.push(name);
};

try {
  const { cdp } = session;
  await sleep(1200);
  await cdp.evaluate("import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('writer.help.open'))");
  await cdp.waitFor("!!document.querySelector('#vno-help-panel:not([hidden])')", { timeoutMilliseconds: 15000 });
  await cdp.evaluate("window.__vnoAppInstance?.helpPanel?.open({ entryId: 'writer.help.open' })");
  await sleep(300);

  for (const [width, height] of [[1366, 768], [1280, 720], [1024, 600]]) {
    for (const theme of ["light", "dark"]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
      await cdp.evaluate(`document.documentElement.dataset.theme = ${JSON.stringify(theme)}`);
      await sleep(250);
      const metrics = await cdp.evaluate(`(() => {
        const panel = document.querySelector('#vno-help-panel');
        const body = panel?.querySelector('.vno-help-body');
        const list = panel?.querySelector('.vno-help-list');
        const article = panel?.querySelector('.vno-help-article');
        const actions = panel?.querySelector('.vno-help-reporting-actions');
        const rect = el => { const r = el?.getBoundingClientRect(); return r && { top:r.top, bottom:r.bottom, height:r.height }; };
        return {
          panelClient: panel?.clientHeight, panelScroll: panel?.scrollHeight,
          body: rect(body), list: rect(list), article: rect(article), actions: rect(actions),
          bodyHeight: body?.clientHeight, listHeight: list?.clientHeight,
          actionsInsideArticle: Boolean(article?.contains(actions)),
          articleScroll: article?.scrollHeight, articleClient: article?.clientHeight,
          overflowNodes: [...panel.querySelectorAll('*')].filter(el => el.scrollHeight > el.clientHeight + 2 && getComputedStyle(el).overflowY !== 'visible').map(el => el.className || el.tagName)
        };
      })()`);
      check(`${width}x${height} ${theme}: panel không cuộn ngoài bài`, metrics.panelScroll <= metrics.panelClient + 1, `${metrics.panelScroll}/${metrics.panelClient}px`);
      check(`${width}x${height} ${theme}: nút cuối ngăn nằm trong vùng bài`, metrics.actionsInsideArticle, JSON.stringify(metrics.actions));
      check(`${width}x${height} ${theme}: kết quả chiếm tối đa 35% vùng nội dung`, metrics.listHeight <= metrics.bodyHeight * 0.36 + 2, `${metrics.listHeight}/${metrics.bodyHeight}px`);
      check(`${width}x${height} ${theme}: vùng bài còn dùng được`, metrics.article?.height >= 70, `${metrics.article?.height}px`);
      const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
      await writeFile(path.join(output, `help-${width}x${height}-${theme}.png`), Buffer.from(shot.result.data, "base64"));
      console.log(`METRICS | Help ${width}x${height} ${theme} | ${JSON.stringify(metrics)}`);
    }
  }

  await cdp.evaluate(`(() => {
    const input = document.querySelector('#vno-help-search');
    input.value = 'đếm từ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(200);
  const resultCount = await cdp.evaluate("document.querySelectorAll('.vno-help-topic[data-help-id]').length");
  check("Tìm kiếm hiển thị kết quả", resultCount > 0, `${resultCount} kết quả`);
  await cdp.evaluate("document.querySelector('.vno-help-topic[data-help-id]')?.click()");
  const selected = await cdp.evaluate("Boolean(document.querySelector('.vno-help-topic[aria-selected=true]') && document.querySelector('.vno-help-article-content h3'))");
  check("Chọn kết quả mở đúng bài chi tiết", selected);
  const internalLinks = await cdp.evaluate("document.querySelectorAll('.vno-help-article-content a[href^=\\\"#\\\"], .vno-help-article-content [data-help-link]').length");
  console.log(`INFO | Liên kết nội bộ có sẵn trong bài Help: ${internalLinks ? `${internalLinks} (chưa kích hoạt trong layout probe)` : "không có liên kết nội bộ để kiểm tra"}`);
  await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(100);
  check("Esc đóng ngăn Trợ giúp", await cdp.evaluate("document.querySelector('#vno-help-panel').hidden"));
  await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "F1", windowsVirtualKeyCode: 112 });
  await sleep(200);
  check("F1 mở lại ngăn Trợ giúp", await cdp.evaluate("!document.querySelector('#vno-help-panel').hidden"));
} finally {
  await session.close();
}

if (failures.length) process.exit(1);
