import { launchApp } from "./session.mjs";
import { mouseClick, press } from "./actions.mjs";
import { copyFileSync, mkdirSync } from "node:fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync("E:\\VNOffice-profiles\\claude-verify-fl1-files", { recursive: true });
copyFileSync("E:\\VN OFice\\file test\\sample-3.pptx", "E:\\VNOffice-profiles\\claude-verify-fl1-files\\s3.pptx");
const session = await launchApp("slides", { filePath: "E:\\VNOffice-profiles\\claude-verify-fl1-files\\s3.pptx", startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
const results = [];
const check = (n, ok, d) => { results.push(ok); console.log((ok ? "PASS" : "FAIL") + " | " + n + " | " + String(d).slice(0, 180)); };
const clickSel = async (sel) => { const p = await ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({block:'nearest'}); const r = e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`); if (!p) return false; const { x, y } = JSON.parse(p); await mouseClick(session.cdp, x, y); return true; };
const dialogs = () => ev(`[...document.querySelectorAll('.vno-dialog-box,[role=dialog]')].filter(e=>e.offsetParent).map(e=>e.textContent.trim().replace(/\\s+/g,' ').slice(0,60)).join(' || ')`);
const closeDialogs = async () => { await press(session.cdp, "Escape", {}, 200); await ev(`document.querySelectorAll('.vno-dialog-close,[data-dialog-action=cancel]').forEach(b=>b.click())`); await sleep(300); };
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-ribbon')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(6000);
  const tabs = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('[id^="vno-ribbon-tab-"]')].map(x=>x.id.replace('vno-ribbon-tab-','')))`));
  console.log("tabs:", tabs.join(","));
  const goTab = async (t) => { await clickSel("#vno-ribbon-tab-" + t); await sleep(500); };
  for (const [tab, cmd, name] of [["transitions", "slides.transition.apply", "Chuyen tiep"], ["design", "slides.master.apply", "Slide Master"]]) {
    const realTab = tabs.find((x) => x.includes(tab.slice(0, 5))) || tab;
    await goTab(realTab);
    const found = await clickSel(`[data-command-id="${cmd}"]`);
    await sleep(900);
    const d = await dialogs();
    check(`${name}: bam nut co phan hoi (hop thoai)`, found && !!d, found ? (d || "(khong thay hop thoai)") : "khong thay nut tren tab " + realTab);
    await closeDialogs();
  }
  // Chen hinh khoi
  const insTab = tabs.find((x) => x.startsWith("ins")) || "insert";
  await goTab(insTab);
  const before = Number(await ev("document.querySelectorAll('[data-shape-id],[data-vno-shape-id],.vno-slide-shape').length"));
  const btn = await ev(`[...document.querySelectorAll('.vno-ribbon-content [data-command-id]')].map(b=>b.dataset.commandId).filter(i=>/shape/i.test(i)).join(',')`);
  console.log("lenh hinh khoi tren tab Chen:", btn);
  const shapeCmd = btn.split(",")[0];
  const clicked = shapeCmd ? await clickSel(`[data-command-id="${shapeCmd}"]`) : false;
  await sleep(900);
  const d2 = await dialogs();
  const after = Number(await ev("document.querySelectorAll('[data-shape-id],[data-vno-shape-id],.vno-slide-shape').length"));
  check("Hinh khoi: bam nut co phan hoi (hop thoai hoac them hinh)", clicked && (!!d2 || after > before), `truoc=${before} sau=${after} dialog=${d2}`);
  await closeDialogs();
  console.log("SUMMARY", results.filter(Boolean).length + "/" + results.length);
} finally { await session.close(); }