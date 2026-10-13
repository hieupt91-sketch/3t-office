// Rà soát cuộn ngang ribbon: mọi tab của một ứng dụng ở nhiều độ rộng cửa sổ.
// Chạy: VNO_APP_ROOT=<repo> node --experimental-websocket scripts/audit-0610/ribbon_scroll_audit.mjs <app> <LOCALAPPDATA> [widths csv]
import { launchApp } from "../../tests/live/cdp/session.mjs";
const [app, lad, widthsCsv = "1100,1280,1366,1440,1600,1920"] = process.argv.slice(2);
const widths = widthsCsv.split(",").map(Number);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp(app, { localAppData: lad, startTimeoutMilliseconds: 300000, readyTimeoutMilliseconds: 300000 });
const cdp = session.cdp;
const ev = (e) => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
const rows = [];
try {
  await sleep(2500);
  const tabs = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.vno-ribbon-tab')].filter(t => t.getBoundingClientRect().width > 0).map(t => ({ id: t.id, text: t.textContent.trim() })))`));
  for (const w of widths) {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: 800, deviceScaleFactor: 1, mobile: false });
    await sleep(900);
    for (const tab of tabs) {
      await ev(`(() => { const t = document.getElementById(${JSON.stringify(tab.id)}); t && t.click(); return true; })()`);
      await sleep(350);
      await ev(`window.dispatchEvent(new Event('resize')); true`);
      await sleep(450);
      const m = JSON.parse(await ev(`JSON.stringify((() => { const c = document.querySelector('.vno-ribbon-content'); if (!c) return null; const groups = [...c.querySelectorAll('.vno-ribbon-group')]; const clipped = groups.filter(g => { const r = g.getBoundingClientRect(); return r.right > c.getBoundingClientRect().right + 1 || r.left < c.getBoundingClientRect().left - 1; }).length; return { sw: c.scrollWidth, cw: c.clientWidth, over: c.scrollWidth - c.clientWidth, sh: c.scrollHeight, ch: c.clientHeight, collapsed: groups.filter(g => g.classList.contains('vno-group-collapsed')).length, groups: groups.length, clipped }; })())`));
      if (m) rows.push({ w, tab: tab.text, ...m });
    }
  }
} finally { try { await session.close(); } catch {} }
const bad = rows.filter((r) => r.over > 1 || r.clipped > 0 || r.sh > r.ch + 1);
console.log(`APP ${app}: ${rows.length} phép đo, ${bad.length} tab-độ rộng lỗi`);
for (const r of bad) console.log(`  ${String(r.w).padStart(4)}px | ${r.tab.padEnd(22)} | tràn ${r.over}px | cao ${r.sh}/${r.ch} | nhóm thu ${r.collapsed}/${r.groups} | bị cắt ${r.clipped}`);