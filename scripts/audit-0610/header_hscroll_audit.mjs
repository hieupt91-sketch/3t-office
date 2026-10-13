// Mọi phần tử đang có thanh cuộn ngang trong vùng đầu cửa sổ (tiêu đề, dải tab, ribbon, thanh công thức).
import { launchApp } from "../../tests/live/cdp/session.mjs";
const [app, lad, widthsCsv = "900,1024,1280,1366,1600"] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp(app, { localAppData: lad, startTimeoutMilliseconds: 300000, readyTimeoutMilliseconds: 300000 });
const cdp = session.cdp;
const ev = (e) => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
try {
  await sleep(2500);
  for (const w of widthsCsv.split(",").map(Number)) {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: 800, deviceScaleFactor: 1, mobile: false });
    await sleep(900);
    await ev(`window.dispatchEvent(new Event('resize')); true`); await sleep(500);
    const hits = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); if (r.top > 230 || r.width === 0) return false; const s = getComputedStyle(e); return /auto|scroll/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 1; }).map(e => ({ tag: e.tagName, cls: String(e.className).slice(0, 50), id: e.id, sw: e.scrollWidth, cw: e.clientWidth })))`));
    console.log(`${app} ${w}px: ${hits.length ? JSON.stringify(hits) : "không có cuộn ngang"}`);
  }
} finally { try { await session.close(); } catch {} }