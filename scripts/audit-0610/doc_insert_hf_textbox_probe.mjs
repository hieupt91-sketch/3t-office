// Chan doan 3 nut Chen (Dau trang, Chan trang, Hop van ban) tren tai lieu dai: do ca vung NGOAI than tai lieu (dau/chan trang, lop noi).
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press } from "../../tests/live/cdp/actions.mjs";
const file = process.argv.slice(2).find((a) => !a.startsWith("--")) || "E:\\VN OFice\\file test\\landocx\\d07.docx";
const session = await launchApp("writer", { filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const WIDE = `(() => {
  const q = (s) => document.querySelectorAll(s).length;
  const vis = (s) => [...document.querySelectorAll(s)].filter(e => e.offsetParent !== null).length;
  const hf = [...document.querySelectorAll('[class*="header"],[class*="footer"],[data-vno-header],[data-vno-footer]')].filter(e => !e.closest('.vno-ribbon,.vno-ribbon-content,[role=tablist]')).map(e => e.className.toString().split(' ')[0]);
  const floats = q('[data-vno-float-anchor],[class*="textbox"],[class*="text-box"],[data-vno-textbox]');
  const active = document.activeElement ? (document.activeElement.className || document.activeElement.tagName).toString().slice(0, 60) : '';
  const editing = document.querySelector('[contenteditable=true]:not(.vno-writer-body)') ? document.querySelector('[contenteditable=true]:not(.vno-writer-body)').className.toString().slice(0, 60) : '';
  const hfText = [...document.querySelectorAll('[class*="vno-header"],[class*="vno-footer"],[class*="page-header"],[class*="page-footer"]')].slice(0, 6).map(e => (e.textContent || '').trim().slice(0, 40));
  return { hfClasses: [...new Set(hf)].slice(0, 12), hfCount: hf.length, floats, active, editing, hfText, dialogs: vis('[role=dialog],.vno-dialog-box'), notifications: [...document.querySelectorAll('.vno-notification-bar, [role=status], .vno-toast')].filter(e => e.offsetParent !== null).map(e => e.textContent.trim().slice(0, 80)) };
})()`;
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 5000", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(6000);
  await ev(`(() => { const t = document.getElementById('vno-ribbon-tab-insert'); if (t) { t.hidden = false; t.click(); } return true; })()`);
  await sleep(500);
  for (const id of ["writer.header.insert", "writer.footer.insert", "writer.insert.textbox", "writer.insert.removeCoverPage"]) {
    await ev(`document.querySelector('.vno-writer-body').focus(); true`);
    const before = await ev(WIDE);
    const clicked = await ev(`(() => { const e = [...document.querySelectorAll('.vno-ribbon-content [data-command-id="${id}"]')].find(x => x.offsetParent !== null); if (e) e.click(); return !!e; })()`);
    await sleep(1200);
    const after = await ev(WIDE);
    console.log(`## ${id} clicked=${clicked}\n  TRUOC ${JSON.stringify(before)}\n  SAU   ${JSON.stringify(after)}`);
    await press(session.cdp, "Escape", {}, 250);
  }
} finally { await session.close(); }
