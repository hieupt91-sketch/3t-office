import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { mouseClick, press, sleep } from "./actions.mjs";

const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!localAppData) throw new Error("Set VNO_CDP_LOCALAPPDATA to a unique profile path before running.");
const outputDir = path.resolve("docs/assets/q49-ui");
mkdirSync(outputDir, { recursive: true });
const targets = [
  { id: "sheet.data.validation", name: "validation", tab: "Dữ liệu" },
  { id: "sheet.data.goalSeek", name: "goalseek", tab: "Dữ liệu", menuId: "sheet-what-if-analysis" },
  { id: "sheet.data.dataTable", name: "datatable", tab: "Dữ liệu", menuId: "sheet-what-if-analysis" },
  { id: "sheet.data.scenarioManager", name: "scenario", tab: "Dữ liệu", menuId: "sheet-what-if-analysis" },
  { id: "sheet.data.pivotTable", name: "pivot", tab: "Dữ liệu" },
  { id: "sheet.format.conditional", name: "conditional", tab: "Trang đầu" },
  { id: "sheet.style.formatAsTable", name: "format-as-table", tab: "Trang đầu" },
  { id: "sheet.row.height", name: "row-height", tab: "Trang đầu", menuId: "sheet.cells.format" },
  { id: "sheet.page.margins", name: "custom-margins", tab: "Bố trí trang", menuId: "sheet.page.margins", menuItem: "Căn lề tùy chỉnh" },
  { id: "sheet.page.size", name: "custom-paper-size", tab: "Bố trí trang", menuId: "sheet.page.size", menuItem: "Thêm khổ giấy" },
];
const session = await launchApp("sheet", { localAppData });
const results = [];
try {
  const win = await session.cdp.send("Browser.getWindowForTarget", {});
  await session.cdp.send("Browser.setWindowBounds", {
    windowId: (win.result || win).windowId,
    bounds: { windowState: "normal", width: 1366, height: 768 },
  });
  await sleep(500);
  for (const target of targets) {
    await session.cdp.evaluate(`document.documentElement.dataset.theme="light"`);
    const tab = await session.cdp.evaluate(`(() => [...document.querySelectorAll('.vno-ribbon-tab')].find(e => e.innerText.trim() === ${JSON.stringify(target.tab)})?.getBoundingClientRect().toJSON())()`);
    if (!tab) throw new Error(`Ribbon tab not found: ${target.tab}`);
    await mouseClick(session.cdp, tab.x + tab.width / 2, tab.y + tab.height / 2);
    await sleep(150);
    for (const theme of ["light", "dark"]) {
      await session.cdp.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
      if (target.menuId) {
        const menuButton = await session.cdp.evaluate(`(() => document.querySelector('[data-dropdown-id=${JSON.stringify(target.menuId)}]')?.getBoundingClientRect().toJSON())()`);
        if (!menuButton) throw new Error(`Dropdown not found: ${target.menuId}`);
        await mouseClick(session.cdp, menuButton.x + menuButton.width / 2, menuButton.y + menuButton.height / 2);
        await sleep(120);
      }
      const button = await session.cdp.evaluate(`(() => { const e=[...document.querySelectorAll('[data-command-id]')].find(x=>x.dataset.commandId===${JSON.stringify(target.id)}${target.menuItem ? `&&x.innerText.includes(${JSON.stringify(target.menuItem)})` : ""}); if(!e) return null; e.scrollIntoView({block:'nearest',inline:'nearest'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
      if (!button) throw new Error(`Command button not found: ${target.id}`);
      await mouseClick(session.cdp, button.x, button.y);
      await sleep(300);
      const state = await session.cdp.evaluate(`(() => { const d=[...document.querySelectorAll('[role="dialog"],.vno-dialog-overlay,.vno-modal')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0}).at(-1); const r=d?.getBoundingClientRect(); return {dialog:!!d, rect:r&&{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}, viewport:{width:innerWidth,height:innerHeight}}; })()`);
      const screenshot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      const filename = `sheet-${target.name}-${theme}-1366x768.png`;
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
