import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { mouseClick, press, sleep } from "./actions.mjs";

const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!localAppData) throw new Error("Set VNO_CDP_LOCALAPPDATA to a unique profile path before running.");
const outputDir = path.resolve("docs/assets/q49-ui");
mkdirSync(outputDir, { recursive: true });
const targets = [
  { id: "writer.insert.equation", name: "equation", tab: "Chèn" },
  { id: "writer.insert.symbol", name: "symbol", tab: "Chèn" },
  { id: "writer.insert.crossReference", name: "cross-reference", tab: "Tham chiếu" },
  { id: "writer.reference.captionInsert", name: "caption", tab: "Tham chiếu" },
  { id: "writer.review.wordCount", name: "wordcount", tab: "Đánh giá" },
  { id: "writer.mailMerge.open", name: "mailmerge-source", tab: "Trộn thư" },
];
const session = await launchApp("writer", { localAppData });
const results = [];
try {
  const win = await session.cdp.send("Browser.getWindowForTarget", {});
  await session.cdp.send("Browser.setWindowBounds", {
    windowId: (win.result || win).windowId,
    bounds: { windowState: "normal", width: 1366, height: 768 },
  });
  await sleep(500);
  for (const target of targets) {
    const tab = await session.cdp.evaluate(`(() => [...document.querySelectorAll('.vno-ribbon-tab')].find(e => e.innerText.trim() === ${JSON.stringify(target.tab)})?.getBoundingClientRect().toJSON())()`);
    if (!tab) throw new Error(`Ribbon tab not found: ${target.tab}`);
    await mouseClick(session.cdp, tab.x + tab.width / 2, tab.y + tab.height / 2);
    await sleep(150);
    for (const theme of ["light", "dark"]) {
      await session.cdp.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
      const button = await session.cdp.evaluate(`(() => { const e=[...document.querySelectorAll('[data-command-id]')].find(x=>x.dataset.commandId===${JSON.stringify(target.id)}); if(!e) return null; e.scrollIntoView({block:'nearest',inline:'nearest'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
      if (!button) throw new Error(`Command button not found: ${target.id}`);
      await mouseClick(session.cdp, button.x, button.y);
      await sleep(300);
      const state = await session.cdp.evaluate(`(() => { const d=[...document.querySelectorAll('[role="dialog"],.vno-dialog-overlay,.vno-modal')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0}).at(-1); const r=d?.getBoundingClientRect(); let contrast=null; if(${JSON.stringify(target.name)}==='equation'){const p=document.querySelector('.vno-equation-preview'),m=p?.querySelector('math'),fg=getComputedStyle(m||p).color.match(/[\\d.]+/g)?.slice(0,3).map(Number),bg=getComputedStyle(p).backgroundColor.match(/[\\d.]+/g)?.slice(0,3).map(Number);const lum=c=>{const v=c.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2]};if(fg&&bg){const a=lum(fg),b=lum(bg);contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}} return {dialog:!!d, rect:r&&{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}, viewport:{width:innerWidth,height:innerHeight},contrast}; })()`);
      const screenshot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      const filename = `writer-${target.name}-${theme}-1366x768.png`;
      writeFileSync(path.join(outputDir, filename), Buffer.from((screenshot.result || screenshot).data, "base64"));
      const inBounds = state.dialog && state.rect.x >= 0 && state.rect.y >= 0 && state.rect.right <= 1366 && state.rect.bottom <= 768;
      const contrastPass = target.name !== "equation" || theme !== "dark" || state.contrast >= 4.5;
      results.push({ target: target.name, theme, inBounds, contrastPass, pass: inBounds && contrastPass, ...state, filename });
      console.log(`${inBounds && contrastPass ? "PASS" : "FAIL"} | ${target.name} | ${theme} | ${JSON.stringify(state)} | ${filename}`);
      await press(session.cdp, "Escape");
      await sleep(150);
    }
  }
} finally {
  await session.close();
}
const failures = results.filter(result => !result.pass);
console.log(`SUMMARY ${results.length - failures.length}/${results.length} dialog frames in bounds; ${failures.length} failures`);
if (failures.length) process.exitCode = 1;
