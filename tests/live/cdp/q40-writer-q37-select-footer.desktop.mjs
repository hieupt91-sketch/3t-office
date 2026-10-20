import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, sleep } from "./actions.mjs";

const dir = path.resolve("docs/assets/q40-ui"); mkdirSync(dir, { recursive: true });
const phase = process.env.VNO_Q40_PHASE || "after";
const session = await launchApp("writer", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const { cdp } = session; const results = [];
const ev = source => cdp.evaluate(source, { awaitPromise: true });
const resize = async (width, height) => { const w = await cdp.send("Browser.getWindowForTarget", {}); await cdp.send("Browser.setWindowBounds", { windowId: (w.result || w).windowId, bounds: { windowState: "normal", width, height } }); await sleep(250); };
try {
  for (const [width, height] of [[1366, 768], [1280, 720]]) for (const theme of ["light", "dark"]) {
    await resize(width, height); await ev(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
    await click(cdp, "#vno-ribbon-tab-home"); await click(cdp, '[data-dropdown-id="writer.edit.select"]'); await sleep(150);
    const state = await ev(`(()=>{const b=document.querySelector('[data-dropdown-id="writer.edit.select"]'),m=document.querySelector('.vno-ribbon-dropdown-menu'),f=b?.closest('.vno-ribbon-group')?.querySelector('.vno-ribbon-group-footer'),mr=m?.getBoundingClientRect(),fr=f?.getBoundingClientRect();return{open:!!m,menu:mr&&{x:mr.x,y:mr.y,right:mr.right,bottom:mr.bottom},footer:fr&&{x:fr.x,y:fr.y,right:fr.right,bottom:fr.bottom},viewport:{width:innerWidth,height:innerHeight}}})()`);
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(path.join(dir, `q40-writer-q37-select-${width}x${height}-${theme}-${phase}.png`), Buffer.from((shot.result || shot).data, "base64"));
    const passed = state.open && state.menu.x >= 0 && state.menu.y >= 0 && state.menu.right <= width && state.menu.bottom <= height;
    results.push(passed); console.log(`${passed ? "PASS" : "FAIL"} | Q37 Chọn opens without footer obstruction ${width}x${height} ${theme} | ${JSON.stringify(state)}`);
    await ev(`document.querySelector('.vno-ribbon-dropdown-menu')?.remove()`);
  }
} catch (error) { results.push(false); console.error(error.stack || error); }
finally { await session.close(); }
console.log(`SUMMARY ${results.filter(Boolean).length}/${results.length} PASS | ${results.length - results.filter(Boolean).length} FAIL`);
if (results.some(result => !result)) process.exitCode = 1;
