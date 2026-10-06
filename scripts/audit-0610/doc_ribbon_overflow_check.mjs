// Ribbon co bi cuon ngang khong? Do scrollWidth/clientWidth cua tung tab tren app desktop that (CDP).
// Chay: node --experimental-websocket scripts/audit-0610/doc_ribbon_overflow_check.mjs
import { launchApp } from "../../tests/live/cdp/session.mjs";

const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
const ev = (e) => session.cdp.evaluate(e);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
try {
  await session.cdp.waitFor("!!document.querySelector('[id^=\"vno-ribbon-tab-\"]')", { timeoutMilliseconds: 60000, intervalMilliseconds: 300 });
  console.log("Cua so:", JSON.stringify(await ev(`({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio })`)));
  const tabs = await ev(`[...document.querySelectorAll('[id^="vno-ribbon-tab-"]')].map(x => x.id.replace('vno-ribbon-tab-', ''))`);
  for (const tab of tabs) {
    await ev(`document.getElementById('vno-ribbon-tab-${tab}').hidden = false; document.getElementById('vno-ribbon-tab-${tab}').click(); true`);
    await sleep(350);
    const r = await ev(`(() => { const out = []; for (const el of document.querySelectorAll('.vno-ribbon, .vno-ribbon-content, .vno-ribbon-panel, .vno-ribbon-groups')) { const cs = getComputedStyle(el); if (el.scrollWidth > el.clientWidth + 1) out.push({ cls: el.className.slice(0, 40), sw: el.scrollWidth, cw: el.clientWidth, ox: cs.overflowX }); } return out; })()`);
    if (r.length) failed += 1;
    console.log(r.length ? "FAIL" : "PASS", "|", tab, "|", JSON.stringify(r));
  }
} finally { await session.close(); }
console.log(failed ? `TONG: ${failed} tab cuon ngang` : "TONG: khong tab nao cuon ngang");
process.exit(failed ? 1 : 0);
