import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, mouseClick, sleep } from "./actions.mjs";

const evidence = path.resolve("docs/assets/q40-ui");
mkdirSync(evidence, { recursive: true });
const phase = process.env.VNO_Q40_PHASE || "after";
const session = await launchApp("slides", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const { cdp } = session;
const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true });
const results = [];
const check = (name, pass, details = "") => {
  results.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${details ? ` | ${details}` : ""}`);
};
const resize = async (width, height) => {
  const win = await cdp.send("Browser.getWindowForTarget", {});
  await cdp.send("Browser.setWindowBounds", { windowId: (win.result || win).windowId, bounds: { windowState: "normal", width, height } });
  await sleep(250);
};
const shot = async (name) => {
  const capture = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(path.join(evidence, `${name}-${phase}.png`), Buffer.from((capture.result || capture).data, "base64"));
};
try {
  await sleep(800);
  for (const [width,height] of [[1366,768],[1280,720]]) for (const theme of ["light","dark"]) {
    await resize(width,height);
    await ev(`document.documentElement.setAttribute('data-theme',${JSON.stringify(theme)})`);
    await click(cdp,"#vno-ribbon-tab-transitions");
    await click(cdp,'[data-dropdown-id="slides.transition.gallery"]');
    const morph = await ev(`(() => {const e=[...document.querySelectorAll('.vno-ribbon-dropdown-item')].find(x=>x.textContent.trim()==='Morph');if(!e)return null;const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
    check(`Morph xuất hiện trong menu ${width}x${height} ${theme}`, !!morph);
    if (!morph) continue;
    await mouseClick(cdp,morph.x,morph.y);
    await sleep(250);
    const notice = await ev(`(() => {const d=document.querySelector('.vno-dialog-overlay [role="dialog"]');return {text:d?.innerText||'',open:!!d,menu:!!document.querySelector('.vno-ribbon-dropdown-menu')};})()`);
    await shot(`q40-slides-morph-${width}x${height}-${theme}`);
    check(`Morph hiển thị thông báo rõ và đóng menu ${width}x${height} ${theme}`, notice.open && /Morph/.test(notice.text) && /chưa được hỗ trợ đầy đủ/i.test(notice.text) && !notice.menu, JSON.stringify(notice));
    if (notice.open) await click(cdp,".vno-dialog-ok-btn");
  }
} finally {
  await session.close();
}
if (results.some((pass)=>!pass)) process.exit(1);
console.log(`Q40 Slides Morph feedback: ${results.length}/${results.length} PASS`);
