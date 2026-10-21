import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { mouseClick, press, sleep } from "./actions.mjs";

const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!localAppData) throw new Error("Set VNO_CDP_LOCALAPPDATA to a unique profile path before running.");
const outputDir = path.resolve("docs/assets/q50-ui");
mkdirSync(outputDir, { recursive: true });
const session = await launchApp("slides", { localAppData });
let failed = false;
try {
  const win = await session.cdp.send("Browser.getWindowForTarget", {});
  await session.cdp.send("Browser.setWindowBounds", { windowId: (win.result || win).windowId, bounds: { windowState: "normal", width: 1366, height: 768 } });
  const tab = await session.cdp.evaluate(`(() => [...document.querySelectorAll('.vno-ribbon-tab')].find(e => e.innerText.trim()==="Chèn")?.getBoundingClientRect().toJSON())()`);
  await mouseClick(session.cdp, tab.x + tab.width / 2, tab.y + tab.height / 2);
  await sleep(150);
  for (const theme of ["light", "dark"]) {
    await session.cdp.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
    const state = await session.cdp.evaluate(`(() => { const e=document.querySelector('[data-command-id="slides.insert.hyperlink"]'); return {entry:!!e, text:e?.innerText?.trim(), title:e?.getAttribute('title'), rect:e?.getBoundingClientRect().toJSON()}; })()`);
    const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(path.join(outputDir, `slides-hyperlink-entry-${theme}-after-1366x768.png`), Buffer.from((shot.result || shot).data, "base64"));
    console.log(`${state.entry ? "PASS" : "FAIL"} | Slides Insert tab hyperlink entry ${theme} | ${JSON.stringify(state)}`);
    if (!state.entry) failed = true;
  }
  const entry = await session.cdp.evaluate(`(() => { const e=document.querySelector('[data-command-id="slides.insert.hyperlink"]'); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,title:e.title, ariaLabel:e.getAttribute('aria-label')}; })()`);
  if (!entry.ariaLabel.includes("Ctrl+K")) failed = true;
  await mouseClick(session.cdp, entry.x, entry.y);
  await sleep(250);
  for (const theme of ["light", "dark"]) {
    await session.cdp.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
    const dialog = await session.cdp.evaluate(`(() => { const e=document.querySelector('.vno-hyperlink-dialog'); const r=e?.getBoundingClientRect(); return {open:!!e, rect:r&&r.toJSON(), textInput:!!e?.querySelector('.vno-hyperlink-text-input'), urlInput:!!e?.querySelector('.vno-hyperlink-url-input')}; })()`);
    const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(path.join(outputDir, `slides-hyperlink-dialog-${theme}-after-1366x768.png`), Buffer.from((shot.result || shot).data, "base64"));
    console.log(`${dialog.open && dialog.textInput && dialog.urlInput ? "PASS" : "FAIL"} | hyperlink command opens dialog ${theme} | ${JSON.stringify(dialog)}`);
    if (!dialog.open || !dialog.textInput || !dialog.urlInput) failed = true;
  }
  await press(session.cdp, "Escape");
  await press(session.cdp, "K", { ctrl: true });
  const shortcutOpens = await session.cdp.evaluate(`Boolean(document.querySelector('.vno-hyperlink-dialog'))`);
  if (!shortcutOpens) failed = true;
  console.log(`${shortcutOpens ? "PASS" : "FAIL"} | Ctrl+K opens the Slides hyperlink dialog`);
} finally {
  await session.close();
}
if (failed) process.exitCode = 1;
