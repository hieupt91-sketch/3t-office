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
    await click(cdp, "#vno-ribbon-tab-insert"); await click(cdp, '[data-command-id="writer.table.insert"]'); await sleep(150);
    const state = await ev(`(()=>{const p=document.querySelector('[data-table-size-picker]'),c=p?.querySelector('[data-table-size="10x8"]'),r=p?.getBoundingClientRect(),s=p&&getComputedStyle(p),cs=c&&getComputedStyle(c),probe=document.createElement('div');probe.style.backgroundColor='var(--vno-bg-window,#fff)';document.body.append(probe);const expected=getComputedStyle(probe).backgroundColor;probe.remove();return{open:!!p,rect:r&&{x:r.x,y:r.y,right:r.right,bottom:r.bottom},viewport:{width:innerWidth,height:innerHeight},expected,popup:s?.backgroundColor,cell:cs?.backgroundColor}})()`);
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(path.join(dir, `q40-writer-q37-table-grid-${width}x${height}-${theme}-${phase}.png`), Buffer.from((shot.result || shot).data, "base64"));
    const passed = state.open && state.rect.x >= 0 && state.rect.y >= 0 && state.rect.right <= width && state.rect.bottom <= height && (theme !== "dark" || (state.popup === state.expected && state.cell === state.expected));
    results.push(passed); console.log(`${passed ? "PASS" : "FAIL"} | Q37 insert table grid theme ${width}x${height} ${theme} | ${JSON.stringify(state)}`);
    await ev(`document.querySelector('[data-table-size-picker]')?.remove()`);
  }
} catch (error) { results.push(false); console.error(error.stack || error); }
finally { await session.close(); }
console.log(`SUMMARY ${results.filter(Boolean).length}/${results.length} PASS | ${results.length - results.filter(Boolean).length} FAIL`);
if (results.some(result => !result)) process.exitCode = 1;
