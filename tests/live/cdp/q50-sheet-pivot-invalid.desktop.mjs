import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, mouseClick, press, sleep, typeText } from "./actions.mjs";

const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!localAppData) throw new Error("Set VNO_CDP_LOCALAPPDATA to a unique profile path before running.");
const outputDir = path.resolve("docs/assets/q50-ui");
mkdirSync(outputDir, { recursive: true });
const session = await launchApp("sheet", { localAppData });
let failed = false;
try {
  const win = await session.cdp.send("Browser.getWindowForTarget", {});
  await session.cdp.send("Browser.setWindowBounds", { windowId: (win.result || win).windowId, bounds: { windowState: "normal", width: 1366, height: 768 } });
  await sleep(500);
  const tab = await session.cdp.evaluate(`(() => [...document.querySelectorAll('.vno-ribbon-tab')].find(e => e.innerText.trim() === "Dữ liệu")?.getBoundingClientRect().toJSON())()`);
  await mouseClick(session.cdp, tab.x + tab.width / 2, tab.y + tab.height / 2);
  const button = await session.cdp.evaluate(`(() => { const e=document.querySelector('[data-command-id="sheet.data.pivotTable"]'); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await mouseClick(session.cdp, button.x, button.y);
  await sleep(300);
  for (const theme of ["light", "dark"]) {
    await session.cdp.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
    const state = await session.cdp.evaluate(`(() => { const d=document.querySelector('.vno-sheet-rule-dialog'); const b=d?.querySelector('.vno-rule-apply'); const e=d?.querySelector('.vno-rule-error'); return {dialog:!!d, source:d?.querySelector('#vno-pivot-range')?.value, error:e?.textContent?.trim(), disabled:b?.disabled, ariaDisabled:b?.getAttribute('aria-disabled'), rect:d?.querySelector('.vno-dialog-box')?.getBoundingClientRect().toJSON()}; })()`);
    const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(path.join(outputDir, `sheet-pivot-invalid-${theme}-after-1366x768.png`), Buffer.from((shot.result || shot).data, "base64"));
    if (!state.dialog || !state.disabled || state.ariaDisabled !== "true") failed = true;
    console.log(`${state.disabled && state.ariaDisabled === "true" ? "PASS" : "FAIL"} | pivot invalid ${theme} | ${JSON.stringify(state)}`);
  }
  await press(session.cdp, "Enter");
  await sleep(300);
  const afterEnter = await session.cdp.evaluate(`({dialog:!!document.querySelector('.vno-sheet-rule-dialog'), pivotCount:(window.sheetGrid?.pivotTablesBySheet?.[window.sheetGrid?.activeSheet]||[]).length})`);
  if (!afterEnter.dialog) failed = true;
  console.log(`${afterEnter.dialog ? "PASS" : "FAIL"} | Enter leaves invalid dialog open | ${JSON.stringify(afterEnter)}`);
  await press(session.cdp, "Escape");
  await click(session.cdp, '.vno-grid-cell[data-coord="A1"]');
  await typeText(session.cdp, "Hạng mục", 0);
  await press(session.cdp, "Enter");
  await typeText(session.cdp, "Đơn vị", 0);
  await press(session.cdp, "Enter");
  const dataTab = await session.cdp.evaluate(`(() => [...document.querySelectorAll('.vno-ribbon-tab')].find(e => e.innerText.trim() === "Dữ liệu")?.getBoundingClientRect().toJSON())()`);
  await mouseClick(session.cdp, dataTab.x + dataTab.width / 2, dataTab.y + dataTab.height / 2);
  const pivotButton = await session.cdp.evaluate(`(() => { const r=document.querySelector('[data-command-id="sheet.data.pivotTable"]').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await mouseClick(session.cdp, pivotButton.x, pivotButton.y);
  await sleep(250);
  await session.cdp.evaluate(`(() => { const input=document.querySelector('.vno-sheet-rule-dialog #vno-pivot-range'); input.value="A1:A2"; input.dispatchEvent(new Event("input",{bubbles:true})); })()`);
  const valid = await session.cdp.evaluate(`(() => { const d=document.querySelector('.vno-sheet-rule-dialog'); const b=d?.querySelector('.vno-rule-apply'); const host=d?.querySelector('.vno-pivot-fields'); const row=host?.querySelector('.vno-pivot-field'); const h=host?.getBoundingClientRect(); const r=row?.getBoundingClientRect(); return {dialog:!!d, error:d?.querySelector('.vno-rule-error')?.textContent?.trim(), disabled:b?.disabled, ariaDisabled:b?.getAttribute('aria-disabled'), headers:host?.dataset.headers, hostClientWidth:host?.clientWidth, hostScrollWidth:host?.scrollWidth, rowRightRelative:r&&h?(r.right-h.left):null, overflow:!!host&&host.scrollWidth>host.clientWidth || !!r&&!!h&&r.right>h.right+1}; })()`);
  if (!valid.dialog || valid.disabled || valid.ariaDisabled !== "false") failed = true;
  console.log(`${!valid.disabled && valid.ariaDisabled === "false" ? "PASS" : "FAIL"} | pivot valid range re-enables create | ${JSON.stringify(valid)}`);
  if (valid.overflow) failed = true;
  console.log(`${valid.overflow ? "FAIL" : "PASS"} | pivot field row fits without horizontal overflow | ${JSON.stringify(valid)}`);
  for (const theme of ["light", "dark"]) {
    await session.cdp.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
    const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(path.join(outputDir, `sheet-pivot-valid-${theme}-after-1366x768.png`), Buffer.from((shot.result || shot).data, "base64"));
  }
} finally {
  await session.close();
}
if (failed) process.exitCode = 1;
