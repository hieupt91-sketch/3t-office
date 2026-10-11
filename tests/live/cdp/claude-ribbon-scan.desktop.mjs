// Quet moi nut tren ribbon: bam bang chuot that (CDP) va ghi phan ung (hop thoai/thong bao/menu/DOM/tai lieu doi).
// Chay: VNO_APP_ROOT=<repo> VNO_CDP_LOCALAPPDATA=<profile rieng> OUT=<tep.json> node --experimental-websocket tests/live/cdp/claude-ribbon-scan.desktop.mjs writer|sheet|slides
import { launchApp } from "./session.mjs";
import { mouseClick, press } from "./actions.mjs";
import fs from "node:fs";

const app = process.argv[2] || "writer";
const out = process.env.OUT || `ribbon-scan-${app}.json`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Lenh nguy hiem/thoat khoi tai lieu: chi ghi nhan, khong bam.
const SKIP = /(^|\.)(file\.(exit|close|quit|new|open|print|saveAs|export|share|account)|app\.(quit|exit|newWindow)|help\.(about|update|license|feedback)|print|exit|quit|close|newWindow|account|license|ai\.|slides\.show\.(startFromBegin|startFromCurrent|presenterMode|rehearseTimings))/i;

const session = await launchApp(app, { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
const results = [];
try {
  await sleep(5000);
  const tabs = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('[id^="vno-ribbon-tab-"]')].filter(t=>!t.hidden).map(t=>({id:t.id,label:(t.textContent||'').trim()})))`));
  await ev(`(() => { window.__vnoScan = { mut: 0 }; const obs = new MutationObserver((m)=>{ window.__vnoScan.mut += m.length; }); obs.observe(document.body, { subtree:true, childList:true, attributes:true, characterData:true }); window.__vnoScanObs = obs; return true; })()`);
  for (const tab of tabs) {
    if (/file|tep/i.test(tab.id) && /backstage|file/.test(tab.id)) continue;
    await ev(`(() => { const t=document.getElementById(${JSON.stringify(tab.id)}); if(t){t.click();} return true; })()`);
    await sleep(500);
    const buttons = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.vno-ribbon-content [data-command-id]')].filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0;}).map((n,i)=>{const r=n.getBoundingClientRect();return {id:n.dataset.commandId,label:(n.getAttribute('aria-label')||n.title||n.textContent||'').trim().replace(/\\s+/g,' ').slice(0,60),tag:n.tagName,hasIcon:!!n.querySelector('svg,img'),disabled:n.disabled===true||n.getAttribute('aria-disabled')==='true',x:r.left+r.width/2,y:r.top+r.height/2,isSelect:n.tagName==='SELECT'||n.tagName==='INPUT'};}))`));
    const seen = new Set();
    for (const b of buttons) {
      const key = tab.id + "|" + b.id + "|" + b.label;
      if (seen.has(key)) continue;
      seen.add(key);
      const rec = { tab: tab.label || tab.id, id: b.id, label: b.label, hasIcon: b.hasIcon, disabled: b.disabled };
      if (b.disabled) { rec.reaction = "disabled"; results.push(rec); continue; }
      if (b.isSelect) { rec.reaction = "control(select/input)"; results.push(rec); continue; }
      if (SKIP.test(b.id)) { rec.reaction = "skipped(dangerous)"; results.push(rec); continue; }
      if (process.env.PROGRESS) fs.appendFileSync(process.env.PROGRESS, `${tab.label}|${b.id}|${b.label}\n`);
      const before = await ev(`(() => { window.__vnoScan.mut = 0; const ed = document.querySelector('.vno-writer-body, .vno-sheet-grid-host, .vno-slide-canvas, [contenteditable=true]'); return JSON.stringify({ html: ed ? ed.innerHTML.length : -1, dlg: document.querySelectorAll('[role=dialog], .vno-dialog-box, .vno-modal').length, menu: document.querySelectorAll('[role=menu], .vno-dropdown-menu, .vno-ribbon-dropdown-open').length, toast: document.querySelectorAll('.vno-toast, .vno-notification, [role=alert], [role=status]').length }); })()`);
      await mouseClick(session.cdp, b.x, b.y);
      await sleep(450);
      const after = await ev(`(() => { const ed = document.querySelector('.vno-writer-body, .vno-sheet-grid-host, .vno-slide-canvas, [contenteditable=true]'); return JSON.stringify({ mut: window.__vnoScan.mut, html: ed ? ed.innerHTML.length : -1, dlg: document.querySelectorAll('[role=dialog], .vno-dialog-box, .vno-modal').length, menu: document.querySelectorAll('[role=menu], .vno-dropdown-menu, .vno-ribbon-dropdown-open').length, toast: document.querySelectorAll('.vno-toast, .vno-notification, [role=alert], [role=status]').length, text: (document.querySelector('[role=alert],[role=status],.vno-toast,.vno-notification')||{}).textContent||'' }); })()`);
      const bo = JSON.parse(before), af = JSON.parse(after);
      const rx = [];
      if (af.dlg > bo.dlg) rx.push("dialog");
      if (af.menu > bo.menu) rx.push("menu");
      if (af.toast > bo.toast) rx.push("toast:" + String(af.text).trim().slice(0, 80));
      if (af.html !== bo.html) rx.push("document");
      if (!rx.length && af.mut > 0) rx.push("dom:" + af.mut);
      rec.reaction = rx.length ? rx.join(",") : "NONE";
      results.push(rec);
      // dong moi thu mo ra de khong anh huong nut sau
      await press(session.cdp, "Escape", {}, 150);
      await press(session.cdp, "Escape", {}, 150);
      await sleep(150);
    }
  }
} finally {
  await session.close();
}
fs.writeFileSync(out, JSON.stringify(results, null, 1), "utf8");
const none = results.filter((r) => r.reaction === "NONE");
console.log(`${app}: ${results.length} nut, NONE=${none.length}, khongIcon=${results.filter((r) => !r.hasIcon).length}`);
for (const r of none) console.log("  NONE |", r.tab, "|", r.id, "|", r.label);
