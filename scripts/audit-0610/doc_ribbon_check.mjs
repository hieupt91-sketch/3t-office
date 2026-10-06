// D14 kiem chung doc lap: thanh cuon ribbon va icon roi ve dau cham tron.
// Chay: node --experimental-websocket scripts/audit-0610/doc_ribbon_check.mjs
import { launchApp } from "../../tests/live/cdp/session.mjs";
const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
const ev = (e) => session.cdp.evaluate(e);
const rows = [];
try {
  const tabs = await ev(`[...document.querySelectorAll('[id^="vno-ribbon-tab-"]')].map(x => x.id)`);
  for (const [w, h, scale] of [[1366, 768, 1], [1920, 1080, 1], [1366, 768, 1.25], [1920, 1080, 1.25]]) {
    await session.cdp.send("Emulation.setDeviceMetricsOverride", { width: Math.round(w / scale), height: Math.round(h / scale), deviceScaleFactor: scale, mobile: false });
    await new Promise(r => setTimeout(r, 500));
    for (const id of tabs) {
      await ev(`document.getElementById(${JSON.stringify(id)}).click(); true`);
      await new Promise(r => setTimeout(r, 350));
      const r = await ev(`(() => {
        const ribbon = document.querySelector('.vno-ribbon-content, .vno-ribbon-panel, .vno-ribbon-body, .vno-ribbon') ;
        const panels = [...document.querySelectorAll('.vno-ribbon-content, .vno-ribbon-panel, .vno-ribbon-body, .vno-ribbon, .vno-ribbon-groups')].filter(x => x.getClientRects().length);
        const hscroll = panels.filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.className.toString().slice(0,40) + ':' + x.scrollWidth + '>' + x.clientWidth);
        const vscroll = panels.filter(x => x.scrollHeight > x.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(x).overflowY)).map(x => x.className.toString().slice(0,40));
        const docH = document.documentElement.scrollWidth > window.innerWidth + 1;
        const btns = [...document.querySelectorAll('.vno-ribbon button, .vno-ribbon [role=button]')].filter(b => b.getClientRects().length);
        const circle = btns.filter(b => /<circle[^>]*r="4"/.test(b.innerHTML) && !b.querySelector('path, rect, line, polyline, polygon')).map(b => (b.getAttribute('aria-label') || b.title || b.innerText || '?').slice(0, 30));
        const unlabeled = btns.filter(b => !(b.getAttribute('aria-label') || b.title || (b.innerText||'').trim())).length;
        return { hscroll, vscroll, docH, nbtn: btns.length, circle, unlabeled };
      })()`);
      rows.push({ vp: `${w}x${h}@${scale * 100}`, tab: id.replace("vno-ribbon-tab-", ""), ...r });
    }
  }
  await session.cdp.send("Emulation.clearDeviceMetricsOverride", {});
  const bad = rows.filter(r => r.hscroll.length || r.vscroll.length || r.docH);
  for (const r of rows) console.log(`${r.vp.padEnd(15)} ${r.tab.padEnd(14)} btn=${String(r.nbtn).padEnd(3)} hscroll=${r.hscroll.length} vscroll=${r.vscroll.length} docH=${r.docH} circleIcon=${r.circle.length}${r.circle.length ? " [" + r.circle.slice(0, 6).join("|") + "]" : ""} unlabeled=${r.unlabeled}`);
  console.log(`TONG: ${rows.length} phep do | co thanh cuon: ${bad.length} | nut icon cham tron (moi to hop dau): ${rows.filter(r => r.vp.startsWith("1366x768@100")).reduce((s, r) => s + r.circle.length, 0)}`);
} finally { await session.close(); }