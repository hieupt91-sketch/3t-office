import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { mouseClick, press, sleep } from "./actions.mjs";

const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!localAppData) throw new Error("Set VNO_CDP_LOCALAPPDATA to a unique profile path before running.");
const outputDir = path.resolve("docs/assets/q49-ui");
mkdirSync(outputDir, { recursive: true });
const targets = [
  { id: "slides.insert.table", name: "table" },
  { id: "slides.diagram.insert", name: "diagram" },
  { id: "slides.insert.headerFooter", name: "header-footer" },
  { id: "slides.insert.dateTime", name: "date-time" },
  { id: "slides.insert.symbol", name: "symbol" },
  { id: "slides.insert.wordart", name: "wordart" },
  { id: "slides.review.spellCheck", name: "spellcheck", tab: "Đánh giá" },
];
const session = await launchApp("slides", { localAppData });
const results = [];
try {
  const win = await session.cdp.send("Browser.getWindowForTarget", {});
  await session.cdp.send("Browser.setWindowBounds", {
    windowId: (win.result || win).windowId,
    bounds: { windowState: "normal", width: 1366, height: 768 },
  });
  await sleep(500);
  for (const target of targets) {
    for (const theme of ["light", "dark"]) {
      await session.cdp.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
      const tabName = target.tab || "Chèn";
      const tab = await session.cdp.evaluate(`(() => [...document.querySelectorAll('.vno-ribbon-tab')].find(e => e.innerText.trim() === ${JSON.stringify(tabName)})?.getBoundingClientRect().toJSON())()`);
      if (!tab) throw new Error(`Ribbon tab not found: ${tabName}`);
      await mouseClick(session.cdp, tab.x + tab.width / 2, tab.y + tab.height / 2);
      await sleep(150);
      const button = await session.cdp.evaluate(`(() => { const e=[...document.querySelectorAll('[data-command-id]')].find(x=>x.dataset.commandId===${JSON.stringify(target.id)}); if(!e) return null; e.scrollIntoView({block:'nearest',inline:'nearest'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
      if (!button) throw new Error(`Command button not found: ${target.id}`);
      await mouseClick(session.cdp, button.x, button.y);
      await sleep(300);
      const state = await session.cdp.evaluate(`(() => { const d=[...document.querySelectorAll('[role="dialog"],.vno-dialog-overlay,.vno-modal')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0}).at(-1); const r=d?.getBoundingClientRect(); return {dialog:!!d, title:d?.querySelector('h1,h2,h3,[class*=title]')?.innerText?.trim()||'', rect:r&&{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}, viewport:{width:innerWidth,height:innerHeight}}; })()`);
      const screenshot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      const filename = `slides-${target.name}-${theme}-1366x768.png`;
      writeFileSync(path.join(outputDir, filename), Buffer.from((screenshot.result || screenshot).data, "base64"));
      const inBounds = state.dialog && state.rect.x >= 0 && state.rect.y >= 0 && state.rect.right <= 1366 && state.rect.bottom <= 768;
      results.push({ target: target.name, theme, inBounds, ...state, filename });
      console.log(`${inBounds ? "PASS" : "FAIL"} | ${target.name} | ${theme} | ${JSON.stringify(state)} | ${filename}`);
      await press(session.cdp, "Escape");
      await sleep(150);
    }
  }
} finally {
  await session.close();
}
const failures = results.filter(result => !result.inBounds);
console.log(`SUMMARY ${results.length - failures.length}/${results.length} dialog frames in bounds; ${failures.length} failures`);
if (failures.length) process.exitCode = 1;
