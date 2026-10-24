import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep, press } from "./actions.mjs";

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
  await session.cdp.evaluate(`window.__vnoAppInstance.grid.showDataValidationDialog()`);
  await sleep(250);
  await session.cdp.evaluate(`(() => { const d=document.querySelector('.vno-sheet-rule-dialog'); d.querySelector('#vno-dv-type').value='list'; d.querySelector('#vno-dv-type').dispatchEvent(new Event('change',{bubbles:true})); d.querySelector('#vno-dv-list').value=''; d.querySelector('.vno-rule-apply').click(); })()`);
  await sleep(150);
  for (const theme of ["light", "dark"]) {
    await session.cdp.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
    const state = await session.cdp.evaluate(`(() => { const d=document.querySelector('.vno-sheet-rule-dialog'); const b=d?.querySelector('.vno-rule-apply'); const e=d?.querySelector('.vno-rule-error'); const body=d?.querySelector('.vno-dialog-body'); const er=e?.getBoundingClientRect(), br=body?.getBoundingClientRect(); return {open:!!d, error:e?.textContent?.trim(), disabled:b?.disabled, ariaDisabled:b?.getAttribute('aria-disabled'), errorVisible:!!er&&!!br&&er.bottom>br.top&&er.top<br.bottom, errorRect:er?.toJSON(), bodyRect:br?.toJSON(), box:d?.querySelector('.vno-dialog-box')?.getBoundingClientRect().toJSON()}; })()`);
    const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(path.join(outputDir, `sheet-dialog-invalid-${theme}-after-1366x768.png`), Buffer.from((shot.result || shot).data, "base64"));
    if (!state.open || !state.error || !state.disabled || state.ariaDisabled !== "true" || !state.errorVisible) failed = true;
    console.log(`${state.open && state.error && state.disabled && state.ariaDisabled === "true" && state.errorVisible ? "PASS" : "FAIL"} | invalid list shows error and disables Apply (${theme}) | ${JSON.stringify(state)}`);
  }
  await press(session.cdp, "Enter");
  await sleep(200);
  const state = await session.cdp.evaluate(`({open:!!document.querySelector('.vno-sheet-rule-dialog'), error:document.querySelector('.vno-rule-error')?.textContent?.trim(), disabled:document.querySelector('.vno-sheet-rule-dialog .vno-rule-apply')?.disabled})`);
  if (!state.open || !state.disabled) failed = true;
  console.log(`${state.open && state.disabled ? "PASS" : "FAIL"} | Enter does not submit invalid rule | ${JSON.stringify(state)}`);
} finally {
  await session.close();
}
if (failed) process.exitCode = 1;
