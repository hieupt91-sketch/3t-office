import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const out = path.resolve("docs/assets/q40-ui"); mkdirSync(out, { recursive: true });
const checks = [];
for (const app of ["writer", "sheet", "slides"]) {
  const session = await launchApp(app, { localAppData: `${process.env.VNO_CDP_LOCALAPPDATA}-${app}` });
  try {
    const { cdp } = session;
    const win = await cdp.send("Browser.getWindowForTarget", {});
    await cdp.send("Browser.setWindowBounds", { windowId: (win.result || win).windowId, bounds: { windowState: "normal", width: 1366, height: 768 } });
    await sleep(300);
    for (const theme of ["light", "dark"]) {
      await cdp.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
      const state = await cdp.evaluate(`(()=>{const root=document.querySelector(${JSON.stringify(app === "writer" ? ".vno-writer-body" : app === "sheet" ? ".vno-sheet-container" : ".vno-slide-canvas")}),r=root?.getBoundingClientRect();return{open:!!root,rect:r&&{x:r.x,y:r.y,right:r.right,bottom:r.bottom},viewport:{width:innerWidth,height:innerHeight},status:!!document.querySelector('.vno-statusbar')}})()`);
      const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      writeFileSync(path.join(out, `q40-smoke-${app}-1366x768-${theme}.png`), Buffer.from((screenshot.result || screenshot).data, "base64"));
      const pass = state.open && state.rect.x >= 0 && state.rect.y < 740 && state.rect.right <= 1366 && state.rect.bottom > 180 && state.status;
      checks.push(pass); console.log(`${pass ? "PASS" : "FAIL"} | ${app} desktop smoke ${theme} 1366x768 | ${JSON.stringify(state)}`);
    }
  } finally { await session.close(); }
}
console.log(`SUMMARY ${checks.filter(Boolean).length}/${checks.length} PASS | ${checks.length - checks.filter(Boolean).length} FAIL`);
if (checks.some(value => !value)) process.exitCode = 1;
