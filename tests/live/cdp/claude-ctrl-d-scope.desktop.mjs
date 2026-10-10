import { launchApp } from "./session.mjs";
import { press, typeText } from "./actions.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const app = process.env.APP;
const session = await launchApp(app, { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
try {
  await sleep(7000);
  if (app === "sheet") {
    await ev("document.querySelector('.vno-sheet-container, .vno-sheet-grid, canvas')&&1");
    await press(session.cdp, "Home", { ctrl: true }, 100);
    await typeText(session.cdp, "5", 8); await press(session.cdp, "Enter", {}, 100);
    await press(session.cdp, "ArrowUp", {}, 100);
    await press(session.cdp, "ArrowDown", { shift: true }, 100); await press(session.cdp, "ArrowDown", { shift: true }, 100);
    await press(session.cdp, "d", { ctrl: true }, 200); await sleep(500);
    const vals = await ev("(() => { const g=window.__vnoAppInstance&&window.__vnoAppInstance.grid; if(!g) return 'khong co grid'; return JSON.stringify(['A1','A2','A3'].map(c=>{const i=g.cellsData.get(c); return i?i.val:null;})); })()");
    const dom = await ev("[...document.querySelectorAll('.vno-grid-cell')].slice(0,3).map(c=>c.textContent).join('|')");
    console.log("SHEET Ctrl+D (Dien xuong) A1..A3:", vals, "| dom:", dom, "| hop thoai Phong chu:", await ev("!!document.querySelector('.vno-font-dialog,.vno-dialog-box')"));
  } else {
    const countSlides = () => ev("(() => { const c=window.__vnoAppInstance.adapter.canvas; const k=Object.keys(c||{}).filter(x=>Array.isArray(c[x])&&/slide/i.test(x)).map(x=>x+'='+c[x].length); return k.join(',')||'?'+Object.keys(c||{}).slice(0,30).join(','); })()"); const before = await countSlides();
    await ev("document.querySelector('.vno-slides-canvas, .vno-slide-canvas, .vno-slides-workspace')&&1");
    await press(session.cdp, "d", { ctrl: true }, 200); await sleep(800);
    const after = await countSlides();
    console.log("SLIDES Ctrl+D (Nhan doi): so slide", before, "->", after, "| hop thoai:", await ev("!![...document.querySelectorAll('.vno-dialog-box')].filter(e=>e.offsetParent).length"));
  }
} finally { await session.close(); }