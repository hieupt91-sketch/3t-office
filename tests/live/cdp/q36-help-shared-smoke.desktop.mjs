// Q36: shared Help panel smoke test for Sheet and Slides at desktop window sizes.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep } from "./client.mjs";

const app = process.env.Q36_APP;
if (!['sheet', 'slides'].includes(app)) throw new Error("Set Q36_APP to sheet or slides.");
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to an isolated profile.");
const output = path.resolve(process.env.Q36_SCREENSHOT_DIR || "docs/assets/q36-ui/help-after");
await mkdir(output, { recursive: true });
const session = await launchApp(app, { localAppData: profile });
const failures = [];
const check = (name, pass, detail = "") => {
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
  if (!pass) failures.push(name);
};

try {
  const { cdp } = session;
  await sleep(900);
  await cdp.evaluate(`import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('${app}.help.open'))`);
  await cdp.waitFor("!!document.querySelector('#vno-help-panel:not([hidden])')", { timeoutMilliseconds: 15000 });
  await cdp.evaluate(`window.__vnoAppInstance?.helpPanel?.open({ entryId: '${app}.help.open' })`);

  for (const [width, height] of [[1366, 768], [1280, 720], [1024, 600]]) {
    const target = await cdp.send("Browser.getWindowForTarget");
    await cdp.send("Browser.setWindowBounds", {
      windowId: target.result.windowId,
      bounds: { windowState: "normal", width, height },
    });
    await sleep(700);
    for (const theme of ["light", "dark"]) {
      await cdp.evaluate(`document.documentElement.dataset.theme = ${JSON.stringify(theme)}`);
      await sleep(150);
      const metrics = await cdp.evaluate(`(() => {
        const panel = document.querySelector('#vno-help-panel');
        const body = panel?.querySelector('.vno-help-body');
        const list = panel?.querySelector('.vno-help-list');
        const article = panel?.querySelector('.vno-help-article');
        const actions = panel?.querySelector('.vno-help-reporting-actions');
        return { panelClient:panel?.clientHeight, panelScroll:panel?.scrollHeight,
          bodyHeight:body?.clientHeight, listHeight:list?.clientHeight,
          articleHeight:article?.getBoundingClientRect().height,
          articleScroll:article?.scrollHeight, actionsInsideArticle:article?.contains(actions) };
      })()`);
      check(`${app} ${width}x${height} ${theme}: panel ngoài không cuộn`, metrics.panelScroll <= metrics.panelClient + 1, `${metrics.panelScroll}/${metrics.panelClient}px`);
      check(`${app} ${width}x${height} ${theme}: danh sách không quá 35%`, metrics.listHeight <= metrics.bodyHeight * 0.36 + 2, `${metrics.listHeight}/${metrics.bodyHeight}px`);
      check(`${app} ${width}x${height} ${theme}: vùng bài và tùy chọn dùng được`, metrics.articleHeight >= 70 && metrics.actionsInsideArticle, JSON.stringify(metrics));
      const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
      await writeFile(path.join(output, `help-${app}-${width}x${height}-${theme}.png`), Buffer.from(shot.result.data, "base64"));
    }
  }
} finally {
  await session.close();
}

if (failures.length) process.exit(1);
