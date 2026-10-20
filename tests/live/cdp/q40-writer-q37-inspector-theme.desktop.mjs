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
    await ev(`window.__vnoGlobalCommandBus.execute('writer.file.inspectDocument')`); await sleep(180);
    const state = await ev(`(()=>{const d=document.querySelector('.vno-document-inspector-dialog'),r=d?.getBoundingClientRect(),probe=document.createElement('span');probe.style.color='var(--vno-text-primary)';document.body.append(probe);const expected=getComputedStyle(probe).color;probe.remove();const labels=[...(d?.querySelectorAll('label,strong')||[])],items=labels.map(x=>({text:x.textContent.trim(),color:getComputedStyle(x).color}));return{open:!!d,rect:r&&{x:r.x,y:r.y,right:r.right,bottom:r.bottom},viewport:{width:innerWidth,height:innerHeight},expected,labels:items.slice(0,8)}})()`);
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(path.join(dir, `q40-writer-q37-inspector-${width}x${height}-${theme}-${phase}.png`), Buffer.from((shot.result || shot).data, "base64"));
    const passed = state.open && state.rect.x >= 0 && state.rect.y >= 0 && state.rect.right <= width && state.rect.bottom <= height && state.labels.length > 0 && state.labels.every(x => x.color === state.expected);
    results.push(passed); console.log(`${passed ? "PASS" : "FAIL"} | Q37 document inspector theme ${width}x${height} ${theme} | ${JSON.stringify(state)}`);
    await ev(`document.querySelector('.vno-document-inspector-dialog .vno-dialog-close, .vno-document-inspector-dialog [data-action="close"], .vno-document-inspector-dialog button[aria-label="Đóng"]')?.click()`); await sleep(100);
    await ev(`document.querySelector('.vno-document-inspector-dialog')?.remove();document.querySelector('.vno-dialog-overlay')?.remove()`);
  }
} catch (error) { results.push(false); console.error(error.stack || error); }
finally { await session.close(); }
console.log(`SUMMARY ${results.filter(Boolean).length}/${results.length} PASS | ${results.length - results.filter(Boolean).length} FAIL`);
if (results.some(result => !result)) process.exitCode = 1;
