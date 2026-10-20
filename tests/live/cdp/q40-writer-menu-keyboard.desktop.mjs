import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";

const evidence = path.resolve("docs/assets/q40-ui");
mkdirSync(evidence, { recursive: true });
const phase = process.env.VNO_Q40_PHASE || "after";
const session = await launchApp("writer", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const { cdp } = session;
const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true });
const checks = [];
const check = (name, pass, details = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${details ? ` | ${details}` : ""}`);
};
const resize = async (width, height) => {
  const win = await cdp.send("Browser.getWindowForTarget", {});
  await cdp.send("Browser.setWindowBounds", { windowId: (win.result || win).windowId, bounds: { windowState: "normal", width, height } });
  await sleep(300);
};
const shot = async (name) => {
  const capture = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(path.join(evidence, `${name}-${phase}.png`), Buffer.from((capture.result || capture).data, "base64"));
};
const openMenu = async () => {
  await click(cdp, "#vno-ribbon-tab-home");
  await click(cdp, '[data-dropdown-id="writer.edit.select"]');
  await sleep(150);
};
const state = async () => ev(`(() => { const menu=document.querySelector('.vno-ribbon-dropdown-menu'); const button=document.querySelector('[data-dropdown-id="writer.edit.select"]'); return {open:!!menu, focusedTrigger:document.activeElement===button, focused:document.activeElement?.outerHTML?.slice(0,100)||''}; })()`);

try {
  await sleep(800);
  for (const [width,height] of [[1366,768],[1280,720]]) {
    for (const theme of ["light","dark"]) {
      await resize(width,height);
      await ev(`document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)})`);
      await openMenu();
      await shot(`q40-writer-select-menu-${width}x${height}-${theme}`);
      const menuBox = await ev(`(() => { const e=document.querySelector('.vno-ribbon-dropdown-menu'),s=document.querySelector('.vno-statusbar'); if(!e||!s)return null;const a=e.getBoundingClientRect(),b=s.getBoundingClientRect();return {bottom:a.bottom,statusTop:b.top,overlap:a.bottom>b.top}; })()`);
      check(`menu opens within frame ${width}x${height} ${theme}`, menuBox && !menuBox.overlap, JSON.stringify(menuBox));
    }
  }

  await resize(1366,768);
  await ev("document.documentElement.setAttribute('data-theme','light')");
  for (const [key,mods] of [["Tab",{}],["Tab",{shift:true}],["Escape",{}],["Enter",{}]]) {
    await openMenu();
    if (key === "Enter") await press(cdp,"ArrowDown");
    await press(cdp,key,mods);
    await sleep(120);
    const result = await state();
    check(`${key}${mods.shift ? "+Shift" : ""} closes menu and restores trigger focus`, !result.open && result.focusedTrigger, JSON.stringify(result));
  }
} finally {
  await session.close();
}
if (checks.some((pass) => !pass)) process.exit(1);
console.log(`Q40 Writer menu keyboard: ${checks.length}/${checks.length} PASS`);
