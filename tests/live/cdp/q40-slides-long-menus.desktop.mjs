import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { clickCommand, clickDropdown, switchRibbonTab } from "./audit_helpers.mjs";
import { sleep } from "./actions.mjs";

const out = path.resolve("docs/assets/q40-ui"); mkdirSync(out, { recursive: true });
const phase = process.env.VNO_Q40_PHASE || "after";
const session = await launchApp("slides", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const { cdp } = session; const checks = [];
const ev = source => cdp.evaluate(source, { awaitPromise: true });
const resize = async (width, height) => { const win = await cdp.send("Browser.getWindowForTarget", {}); await cdp.send("Browser.setWindowBounds", { windowId: (win.result || win).windowId, bounds: { windowState: "normal", width, height } }); await sleep(350); };
const shot = async name => { const image = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); writeFileSync(path.join(out, `${name}-${phase}.png`), Buffer.from((image.result || image).data, "base64")); };
const check = (label, pass, metrics) => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${label} | ${JSON.stringify(metrics)}`); };
const close = async () => ev(`document.querySelector('.vno-ribbon-dropdown-menu')?.remove();document.querySelector('.vno-dialog-overlay')?.remove()`);
const galleryMetrics = () => ev(`(()=>{const menu=document.querySelector('.vno-ribbon-dropdown-menu'),status=document.querySelector('.vno-statusbar'),r=menu?.getBoundingClientRect(),s=status?.getBoundingClientRect();return{open:!!menu,menu:r&&{x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height,scrollHeight:menu.scrollHeight,clientHeight:menu.clientHeight},statusTop:s?.top,viewport:{width:innerWidth,height:innerHeight},overlap:!!r&&!!s&&r.bottom>s.top+1,scrollable:!!menu&&menu.scrollHeight>menu.clientHeight}})()`);
try {
  await sleep(800);
  for (const [width, height] of [[1280, 720], [1024, 600]]) for (const theme of ["light", "dark"]) {
    await resize(width, height); await ev(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
    for (const item of [
      { name: "layout", tab: "home", dropdown: null, command: "slides.layout.apply" },
      { name: "transition", tab: "transitions", dropdown: "slides.transition.gallery" },
      { name: "animation", tab: "animations", dropdown: "slides.animation.gallery" },
      { name: "shape", tab: "home", dropdown: "slides.shape.gallery" },
    ]) {
      await switchRibbonTab(cdp, item.tab);
      if (item.dropdown) await clickDropdown(cdp, item.dropdown, "__q40-no-item__");
      else await clickCommand(cdp, item.command);
      await sleep(180);
      const metrics = item.dropdown
        ? await galleryMetrics()
        : await ev(`(()=>{const d=document.querySelector('#vno-layouts-grid')?.closest('[role=dialog]'),r=d?.getBoundingClientRect(),g=document.querySelector('#vno-layouts-grid'),status=document.querySelector('.vno-statusbar')?.getBoundingClientRect();return{open:!!d,rect:r&&{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height},grid:g&&{scrollHeight:g.scrollHeight,clientHeight:g.clientHeight},statusTop:status?.top,viewport:{width:innerWidth,height:innerHeight},horizontalOverflow:!!g&&g.scrollWidth>g.clientWidth}})()`);
      await shot(`q40-slides-long-${item.name}-${width}x${height}-${theme}`);
      const rect = item.dropdown ? metrics?.menu : metrics?.rect;
      const within = !!rect && rect.x >= 0 && rect.y >= 0 && rect.right <= width && rect.bottom <= (metrics.statusTop ?? height) + 1;
      const scrollOk = item.dropdown ? metrics.scrollable || metrics.menu?.scrollHeight <= metrics.menu?.clientHeight : !metrics.horizontalOverflow;
      check(`${item.name} panel within viewport ${width}x${height} ${theme}`, metrics?.open && within && scrollOk && !metrics.overlap, metrics);
      await close();
    }
  }
} catch (error) { checks.push(false); console.error(error.stack || error); }
finally { await session.close(); }
console.log(`SUMMARY ${checks.filter(Boolean).length}/${checks.length} PASS | ${checks.length - checks.filter(Boolean).length} FAIL`);
if (checks.some(value => !value)) process.exitCode = 1;
