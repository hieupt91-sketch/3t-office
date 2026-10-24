import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { press, sleep } from "./actions.mjs";

const profileRoot = process.env.VNO_CDP_LOCALAPPDATA;
if (!profileRoot) throw new Error("Set VNO_CDP_LOCALAPPDATA to a unique profile path before running.");
const outputDir = path.resolve("docs/assets/q61-ui");
mkdirSync(outputDir, { recursive: true });
const cases = [
  { id: "goal-seek", tab: "data", dropdown: "sheet-what-if-analysis", item: "Dò tìm mục tiêu", dialog: "#vno-goal-set-cell" },
  { id: "data-table", tab: "data", dropdown: "sheet-what-if-analysis", item: "Bảng dữ liệu", dialog: "#vno-data-table-row-input" },
  { id: "scenario-manager", tab: "data", dropdown: "sheet-what-if-analysis", item: "Trình quản lý kịch bản", dialog: "#vno-scenario-list" },
  { id: "row-height", tab: "home", dropdown: "sheet.cells.format", item: "Chiều cao hàng", dialog: ".vno-dialog-input" },
  { id: "page-margins", tab: "pageLayout", dropdown: "sheet.page.margins", item: "Căn lề tùy chỉnh", dialog: "#vno-sheet-margin-top" },
  { id: "paper-size", tab: "pageLayout", dropdown: "sheet.page.size", item: "Thêm khổ giấy", dialog: "#vno-sheet-size" },
];

const session = await launchApp("sheet", { localAppData: path.join(profileRoot, "sheet") });
let assertions = 0;
let tabChecks = 0;
try {
  for (const item of cases) {
    const initialWindowInfo = await session.cdp.send("Browser.getWindowForTarget", {});
    const initialWindowId = (initialWindowInfo.result || initialWindowInfo).windowId;
    if (item.id === "paper-size") {
      await session.cdp.send("Browser.setWindowBounds", { windowId: initialWindowId, bounds: { windowState: "normal", width: 1024, height: 600 } });
      await sleep(120);
    }
    await session.cdp.evaluate(`(() => {
      document.querySelector(${JSON.stringify(`#vno-ribbon-tab-${item.tab}`)})?.click();
      const panel = document.querySelector(${JSON.stringify(`#vno-ribbon-tabpanel-${item.tab}`)});
      const trigger = panel?.querySelector(${JSON.stringify(`[data-dropdown-id="${item.dropdown}"]`)});
      if (!trigger) throw new Error("Missing dropdown trigger: ${item.dropdown}");
      trigger.click();
      return true;
    })()`);
    await session.cdp.waitFor(`!!document.querySelector(".vno-ribbon-dropdown-menu")`, { timeoutMilliseconds: 5000 });
    const menuShot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(path.join(outputDir, `sheet-focus-${item.id}-menu.png`), Buffer.from((menuShot.result || menuShot).data, "base64"));
    await session.cdp.evaluate(`(() => {
      const menuItem = [...document.querySelectorAll(".vno-ribbon-dropdown-item")].find(node => node.textContent.trim().startsWith(${JSON.stringify(item.item)}));
      if (!menuItem) throw new Error("Missing dropdown item: ${item.item}");
      menuItem.click();
      return true;
    })()`);
    await session.cdp.waitFor(`!!document.querySelector(${JSON.stringify(item.dialog)})`, { timeoutMilliseconds: 8000 });
    const windowId = initialWindowId;
    if (item.id === "paper-size") {
      const visibility = await session.cdp.evaluate(`(() => {
        const control=document.querySelector("#vno-sheet-size");
        const body=control?.closest(".vno-dialog-box")?.querySelector(".vno-dialog-body");
        const controlRect=control?.getBoundingClientRect();
        const bodyRect=body?.getBoundingClientRect();
        return {control:controlRect?.toJSON(),body:bodyRect?.toJSON(),scrollTop:body?.scrollTop,scrollHeight:body?.scrollHeight};
      })()`);
      assert.ok(visibility.control.top >= visibility.body.top - 1 && visibility.control.bottom <= visibility.body.bottom + 1,
        `Paper Size control is fully visible in the scroll area on open at 1024x600: ${JSON.stringify(visibility)}`);
      await sleep(300);
      const initialSizeShot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      writeFileSync(path.join(outputDir, "sheet-focus-paper-size-open-initial-1024x600-light.png"), Buffer.from((initialSizeShot.result || initialSizeShot).data, "base64"));
      console.log(`PASS paper-size control fully visible at 1024x600 on open: ${JSON.stringify(visibility)}`);
    }
    for (const [width, height] of [[1366, 768], [1024, 600]]) {
      for (const theme of ["light", "dark"]) {
        await session.cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal", width, height } });
        await session.cdp.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
        await sleep(300);
        const variantShot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
        writeFileSync(path.join(outputDir, `sheet-focus-${item.id}-open-${width}x${height}-${theme}.png`), Buffer.from((variantShot.result || variantShot).data, "base64"));
      }
    }
    await session.cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal", width: 1366, height: 768 } });
    await session.cdp.evaluate('document.documentElement.dataset.theme="light"');
    const triggerSelector = `[data-dropdown-id="${item.dropdown}"]`;
    const openState = await session.cdp.evaluate(`(() => {
      const dialog = document.querySelector(${JSON.stringify(item.dialog)})?.closest('[role="dialog"]');
      const trigger = document.querySelector(${JSON.stringify(`#vno-ribbon-tabpanel-${item.tab} ${triggerSelector}`)});
      return { dialog: !!dialog, triggerConnected: !!trigger?.isConnected, focusInside: !!dialog?.contains(document.activeElement) };
    })()`);
    assert.ok(openState.dialog && openState.triggerConnected, `${item.id} opened from a live ribbon dropdown: ${JSON.stringify(openState)}`);
    await sleep(120);
    for (let step = 0; step < 10; step++) await press(session.cdp, "Tab", {}, 30);
    const trapped = await session.cdp.evaluate(`(() => { const dialog=document.querySelector(${JSON.stringify(item.dialog)})?.closest('[role="dialog"]'); return !!dialog?.contains(document.activeElement); })()`);
    assert.equal(trapped, true, `${item.id} keeps focus inside after ten Tab presses`);
    tabChecks++;
    const openShot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(path.join(outputDir, `sheet-focus-${item.id}-open.png`), Buffer.from((openShot.result || openShot).data, "base64"));

    await press(session.cdp, "Escape", {}, 100);
    await session.cdp.waitFor(`!document.querySelector(${JSON.stringify(item.dialog)})`, { timeoutMilliseconds: 5000 });
    await sleep(180);
    const restored = await session.cdp.evaluate(`(() => {
      const trigger = document.querySelector(${JSON.stringify(`#vno-ribbon-tabpanel-${item.tab} ${triggerSelector}`)});
      return { same: document.activeElement === trigger, active: document.activeElement?.getAttribute("aria-label") || document.activeElement?.id || document.activeElement?.className, trigger: trigger?.getAttribute("aria-label") };
    })()`);
    assert.equal(restored.same, true, `${item.id} Escape restores the dropdown trigger: ${JSON.stringify(restored)}`);
    const returnShot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(path.join(outputDir, `sheet-focus-${item.id}-return.png`), Buffer.from((returnShot.result || returnShot).data, "base64"));
    assertions++;
    console.log(`PASS ${item.id}: ${JSON.stringify(restored)}`);
  }
} finally {
  await session.close();
}
console.log(`PASS ${assertions}/${cases.length} Escape returns; ${tabChecks}/${cases.length} Tab traps; captured ${assertions * 3} menu/dialog/return screenshots at 1366x768 light plus ${assertions * 4} dialog screenshots at 1366x768 and 1024x600 in light/dark themes.`);
