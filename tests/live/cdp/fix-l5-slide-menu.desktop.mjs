import { mkdir, writeFile } from "node:fs/promises";
import { launchApp } from "./session.mjs";
import { mouseClick, mouseRightClick, press } from "./actions.mjs";

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const template = process.env.PPT_TEMPLATE || "E:\\VNOffice-profiles\\claude-pptpar\\template.pptx";
const output = process.env.PPT_OUTPUT || "E:\\VNOffice-profiles\\claude-pptpar\\app_slideMenu.pptx";
const screenshotDir = process.env.SCREENSHOT_DIR || "";
const session = await launchApp("slides", { filePath: template, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = expression => session.cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const screenshot = async name => {
  if (!screenshotDir) return;
  await mkdir(screenshotDir, { recursive: true });
  const result = await session.cdp.send("Page.captureScreenshot", { format: "png" });
  await writeFile(`${screenshotDir}\\${name}.png`, Buffer.from((result.result || result).data, "base64"));
};
const rightClickThumbnail = async index => {
  const probe = JSON.parse(await ev(`(() => { const item=document.querySelector('[data-slide-index="${index}"]'); if(!item)return null; const r=item.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,tag:item.tagName,cls:item.className,rect:{x:r.x,y:r.y,width:r.width,height:r.height}}); })()`));
  if (!probe) throw new Error(`Missing slide thumbnail ${index}`);
  const { x, y } = probe;
  await mouseRightClick(session.cdp, x, y);
  await sleep(250);
};
const clickMenuAction = async action => {
  const point = JSON.parse(await ev(`(() => {const b=document.querySelector('.vno-slide-section-menu [data-slide-action="${action}"]');if(!b)return null;const r=b.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`));
  if (!point) throw new Error(`Missing menu action ${action}`);
  await mouseClick(session.cdp, point.x, point.y);
};

try {
  await session.cdp.waitFor("window.__vnoAppInstance?.adapter?.canvas?.slides?.length > 0", { timeoutMilliseconds: 120000 });
  await session.cdp.waitFor("![...document.querySelectorAll('.vno-dialog-overlay')].some(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(x).pointerEvents!=='none'})", { timeoutMilliseconds: 120000 });
  await sleep(1000);
  await press(session.cdp, "m", { ctrl: true }, 500);
  const added = JSON.parse(await ev("JSON.stringify({count:window.__vnoAppInstance.adapter.canvas.slides.length,index:window.__vnoAppInstance.adapter.canvas.currentSlideIndex})"));
  if (added.count !== 2 || added.index !== 1) throw new Error(`Ctrl+M setup failed: ${JSON.stringify(added)}`);

  await rightClickThumbnail(1);
  const menuInfo = JSON.parse(await ev("JSON.stringify({labels:[...document.querySelectorAll('.vno-slide-section-menu button')].map(b=>b.textContent.trim()),focus:document.activeElement?.dataset?.slideAction})"));
  for (const label of ["Cắt trang chiếu", "Sao chép trang chiếu", "Ẩn trang chiếu", "Chuyển lên", "Chuyển xuống", "Bộ sắp xếp trang chiếu", "Bố cục"]) {
    if (!menuInfo.labels.includes(label)) throw new Error(`Menu is missing ${label}`);
  }
  await sleep(1200);
  await screenshot("slide-context-menu");
  for (let i = 0; i < 5; i += 1) await press(session.cdp, "ArrowDown", {}, 80);
  const focusedHide = await ev("document.activeElement?.dataset?.slideAction === 'hide'");
  if (!focusedHide) throw new Error("Arrow-key navigation did not focus Hide Slide");
  await clickMenuAction("hide");
  const hiddenState = JSON.parse(await ev("JSON.stringify({hidden:window.__vnoAppInstance.adapter.canvas.slides[1].hidden,index:window.__vnoAppInstance.adapter.canvas.currentSlideIndex,menu:!!document.querySelector('.vno-slide-section-menu')})"));
  if (hiddenState.hidden !== true) throw new Error(`Mouse activation did not hide the selected slide: ${JSON.stringify(hiddenState)}`);

  await rightClickThumbnail(1);
  await screenshot("slide-hidden-context-menu");
  const showLabel = await ev("[...document.querySelectorAll('.vno-slide-section-menu button')].some(b=>b.textContent.trim()==='Hiện trang chiếu')");
  if (!showLabel) throw new Error("Context menu did not switch to Show Slide");
  await clickMenuAction("hide");
  if (!(await ev("window.__vnoAppInstance.adapter.canvas.slides[1].hidden === false"))) throw new Error("Mouse activation did not show the selected slide");

  await rightClickThumbnail(1);
  await clickMenuAction("copy");
  await rightClickThumbnail(0);
  const pasteEnabled = await ev("!document.querySelector('.vno-slide-section-menu [data-slide-action=\"paste\"]')?.disabled");
  if (!pasteEnabled) throw new Error("Paste did not become available after copying a slide");
  await clickMenuAction("paste");
  const afterPaste = JSON.parse(await ev("JSON.stringify({count:window.__vnoAppInstance.adapter.canvas.slides.length,ids:window.__vnoAppInstance.adapter.canvas.slides.map(s=>s.id)})"));
  if (afterPaste.count !== 3 || afterPaste.ids[1] === afterPaste.ids[0]) throw new Error(`Paste did not insert a copied slide: ${JSON.stringify(afterPaste)}`);
  await rightClickThumbnail(2);
  await clickMenuAction("move-up");
  const afterMove = JSON.parse(await ev("JSON.stringify({ids:window.__vnoAppInstance.adapter.canvas.slides.map(s=>s.id),index:window.__vnoAppInstance.adapter.canvas.currentSlideIndex})"));
  if (afterMove.ids[1] !== afterPaste.ids[2] || afterMove.index !== 2) throw new Error(`Move Up failed: ${JSON.stringify(afterMove)}`);
  await rightClickThumbnail(1);
  await clickMenuAction("cut");
  const afterCut = JSON.parse(await ev("JSON.stringify({count:window.__vnoAppInstance.adapter.canvas.slides.length,clipboard:!!window.__vnoAppInstance.adapter.canvas.slideClipboard})"));
  if (afterCut.count !== 2 || !afterCut.clipboard) throw new Error(`Cut did not move the slide to the app clipboard: ${JSON.stringify(afterCut)}`);
  await rightClickThumbnail(0);
  await clickMenuAction("paste");
  if (!(await ev("window.__vnoAppInstance.adapter.canvas.slides.length === 3"))) throw new Error("Pasting a cut slide did not restore it");

  const saved = await ev(`(() => { const a=window.__vnoAppInstance.adapter; a.isDirty=true; const fodp=a.serializeToFodp(); return globalThis.globalUnoBridge.saveRealFileInPlace("slides",fodp,${JSON.stringify(output)},${JSON.stringify(template)}); })()`);
  if (!saved || saved.status !== "ok") throw new Error(`Could not save slide menu test PPTX: ${JSON.stringify(saved)}`);
  console.log(JSON.stringify({ menu: "PASS", keyboardNavigation: "PASS", mouseHideShow: "PASS", copyPaste: "PASS", moveUp: "PASS", cutPaste: "PASS", saved: saved.status, items: menuInfo.labels }));
} finally {
  await session.close();
}
