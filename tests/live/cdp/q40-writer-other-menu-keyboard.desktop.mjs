import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";
import { switchRibbonTab } from "./audit_helpers.mjs";

const dir = path.resolve("docs/assets/q40-ui"); mkdirSync(dir, { recursive: true });
const phase = process.env.VNO_Q40_PHASE || "after";
const session = await launchApp("writer", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const { cdp } = session; const results = [];
const ev = source => cdp.evaluate(source, { awaitPromise: true });
const resize = async (width, height) => { const win = await cdp.send("Browser.getWindowForTarget", {}); await cdp.send("Browser.setWindowBounds", { windowId: (win.result || win).windowId, bounds: { windowState: "normal", width, height } }); await sleep(300); };
const shot = async name => { const image = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); writeFileSync(path.join(dir, `${name}-${phase}.png`), Buffer.from((image.result || image).data, "base64")); };
const cases = [
  [1366, 768, "light", "Tab", {}], [1280, 720, "light", "Tab", { shift: true }],
  [1366, 768, "dark", "Escape", {}], [1280, 720, "dark", "Enter", {}],
];
try {
  await sleep(700);
  await switchRibbonTab(cdp, "insert");
  await click(cdp, '[data-command-id="writer.table.insert"]');
  await click(cdp, '[data-table-size="1x1"]');
  await sleep(250);
  for (const menu of [
    { id: "writer.para.lineSpacing", tab: "home", label: "line-spacing" },
    { id: "writer.table.borders", tab: "tableDesign", label: "table-borders" },
  ]) for (const [width, height, theme, key, modifiers] of cases) {
    await resize(width, height); await ev(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
    await switchRibbonTab(cdp, menu.tab); await click(cdp, `[data-dropdown-id="${menu.id}"]`); await sleep(150);
    const selector = `[data-dropdown-id="${menu.id}"]`;
    const opened = await ev(`!!document.querySelector('.vno-ribbon-dropdown-menu')`);
    if (key === "Enter") await press(cdp, "ArrowDown");
    await press(cdp, key, modifiers); await sleep(150);
    const state = await ev(`(()=>{const m=document.querySelector('.vno-ribbon-dropdown-menu'),b=document.querySelector(${JSON.stringify(selector)});return{open:!!m,focusedTrigger:document.activeElement===b,focused:document.activeElement?.getAttribute('data-dropdown-id')||document.activeElement?.getAttribute('data-command-id')||document.activeElement?.tagName}})()`);
    await shot(`q40-writer-${menu.label}-${width}x${height}-${theme}-${key.toLowerCase()}${modifiers.shift ? "-shift" : ""}`);
    const pass = opened && !state.open && state.focusedTrigger;
    results.push(pass); console.log(`${pass ? "PASS" : "FAIL"} | ${menu.label} ${key}${modifiers.shift ? "+Shift" : ""} ${width}x${height} ${theme} | ${JSON.stringify(state)}`);
    await ev(`document.querySelector('.vno-ribbon-dropdown-menu')?.remove()`);
  }
} catch (error) { results.push(false); console.error(error.stack || error); }
finally { await session.close(); }
console.log(`SUMMARY ${results.filter(Boolean).length}/${results.length} PASS | ${results.length - results.filter(Boolean).length} FAIL`);
if (results.some(value => !value)) process.exitCode = 1;
