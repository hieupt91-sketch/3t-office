import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { mouseClick, typeText } from "./actions.mjs";

const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!localAppData) throw new Error("Set VNO_CDP_LOCALAPPDATA to a dedicated desktop-test profile.");

const source = process.env.VNO_FIX_L2_SOURCE || "E:\\VN OFice\\file test\\sample-3.pptx";
const businessSource = process.env.VNO_FIX_L2_BUSINESS_SOURCE
  || "E:\\VN OFice\\file test\\lan\\BÁO CÁO KẾT QUẢ KINH DOANH NĂM 2021.pptx";
const workDir = path.join(localAppData, "fix-l2");
mkdirSync(workDir, { recursive: true });
const roundtripFile = path.join(workDir, "slides-roundtrip.pptx");
const businessFile = path.join(workDir, "business-roundtrip.pptx");
copyFileSync(source, roundtripFile);
copyFileSync(businessSource, businessFile);

const results = [];
const check = (name, pass, details = "") => {
  results.push(Boolean(pass));
  const detail = typeof details === "object" && details !== null ? JSON.stringify(details) : String(details);
  console.log(`${pass ? "PASS" : "FAIL"} | ${name} | ${detail.slice(0, 500)}`);
};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const slideState = async session => JSON.parse(await session.cdp.evaluate(`JSON.stringify((() => {
  const c=window.__vnoAppInstance.adapter.canvas;
  return {index:c.currentSlideIndex,count:c.slides.length,slides:c.slides.map(s=>({
    title:s.title,body:s.body,transition:s.transition?.type||null,
    shapes:(s.shapes||[]).map(x=>({id:x.id,type:x.type,text:x.text||"",x:x.x,y:x.y,w:x.w,h:x.h}))
  }))};
})())`));
const clickCommand = async (session, selector) => {
  const point = await session.cdp.evaluate(`(() => {
    const e=document.querySelector(${JSON.stringify(selector)}); if(!e) return null;
    const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};
  })()`);
  if (!point) return false;
  await mouseClick(session.cdp, point.x, point.y);
  return true;
};
const openLoaded = async file => {
  const session = await launchApp("slides", {
    filePath: file,
    localAppData,
    startTimeoutMilliseconds: 180000,
    readyTimeoutMilliseconds: 180000
  });
  await session.cdp.waitFor(
    `window.__vnoAppInstance?.adapter?.sourceFilePath?.toLowerCase().endsWith(${JSON.stringify(path.basename(file).toLowerCase())})`,
    { timeoutMilliseconds: 240000, intervalMilliseconds: 250 }
  );
  return session;
};

let session = await openLoaded(roundtripFile);
let savedShapeSignatures = [];
let expectedSlideCount = 0;
try {
  console.log(`CDP_PORT ${session.debugPort} | PROFILE ${session.localAppData}`);
  const initial = await slideState(session);
  const startIndex = initial.index;

  check("PPTX nguồn được nạp xong trước khi đo", initial.count > 0 && initial.slides.length === initial.count, initial.count);
  check("Ribbon chèn textbox", await clickCommand(session, '[data-command-id="slides.text.insert"]'));
  await wait(400);
  await typeText(session.cdp, "Hop kiem thu FIX-L2", 8);
  check("Ribbon chèn hình", await clickCommand(session, '[data-command-id="slides.shape.insert"]'));
  await wait(600);

  const afterInsert = await slideState(session);
  const selectedCount = Number(await session.cdp.evaluate("window.__vnoAppInstance.adapter.canvas.selectedShapeIds?.size || 0"));
  check("Textbox và hình hiện trong model", afterInsert.slides[startIndex].shapes.some(s => s.text.includes("Hop kiem thu FIX-L2"))
    && afterInsert.slides[startIndex].shapes.length >= initial.slides[startIndex].shapes.length + 2,
  { selectedCount, before: initial.slides[startIndex].shapes.length, after: afterInsert.slides[startIndex].shapes.length });
  check("Shape còn được chọn để tái hiện nhánh nhân đôi nhầm", selectedCount > 0, selectedCount);

  // A shape remains selected after insertion. The ribbon action must still duplicate its slide.
  const beforeDuplicate = afterInsert.count;
  check("Ribbon nhân đôi slide khi đang chọn shape", await clickCommand(session, '[data-command-id="slides.slide.duplicate"]'));
  await session.cdp.waitFor(`window.__vnoAppInstance.adapter.canvas.slides.length === ${beforeDuplicate + 1}`,
    { timeoutMilliseconds: 10000, intervalMilliseconds: 100 });
  for (let attempt = 0; attempt < 2; attempt++) {
    const before = Number(await session.cdp.evaluate("window.__vnoAppInstance.adapter.canvas.slides.length"));
    check(`Ribbon nhân đôi lặp ${attempt + 2}`, await clickCommand(session, '[data-command-id="slides.slide.duplicate"]'));
    await session.cdp.waitFor(`window.__vnoAppInstance.adapter.canvas.slides.length === ${before + 1}`,
      { timeoutMilliseconds: 10000, intervalMilliseconds: 100 });
  }

  expectedSlideCount = initial.count + 3;
  await session.cdp.evaluate("window.__vnoAppInstance.adapter.canvas.selectSlide(0)");
  await clickCommand(session, "#vno-ribbon-tab-transitions");
  await wait(350);
  await clickCommand(session, '[data-command-id="slides.transition.apply"]');
  await wait(500);
  const applied = await session.cdp.evaluate(`(() => {
    const d=[...document.querySelectorAll('.vno-dialog-box')].find(e=>e.offsetParent);
    if(!d) return false;
    const select=d.querySelector('select'); if(!select) return false;
    const option=[...select.options].find(o=>/fade/i.test(o.value)||/Mờ|Fade/i.test(o.textContent));
    if(!option) return false;
    select.value=option.value; select.dispatchEvent(new Event('change',{bubbles:true}));
    const button=[...d.querySelectorAll('button')].find(b=>/Áp dụng|Apply|OK/i.test(b.textContent));
    if(!button) return false; button.click(); return true;
  })()`);
  await wait(500);
  const beforeSave = await slideState(session);
  const edited = beforeSave.slides[beforeSave.index];
  check("Transition fade ở model trước lưu", applied && edited.transition === "fade", edited.transition);
  check("Canvas vẽ đủ shape của slide", Number(await session.cdp.evaluate(`document.querySelectorAll('.vno-slide-shapes-layer .vno-slide-shape-item').length`)) === edited.shapes.length,
    { model: edited.shapes.length, rendered: await session.cdp.evaluate("document.querySelectorAll('.vno-slide-shapes-layer .vno-slide-shape-item').length") });
  const saveResult = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 600000 });
  check("Lưu PPTX qua app", saveResult === true, saveResult);
  savedShapeSignatures = edited.shapes.map(({ text }) => text || "");
} finally {
  await session.close();
}

session = await openLoaded(roundtripFile);
try {
  console.log(`CDP_PORT ${session.debugPort} | PROFILE ${session.localAppData}`);
  const reopened = await slideState(session);
  const targetSlide = reopened.slides[0];
  check("Mở lại giữ số slide sau các lần nhân đôi", reopened.count === expectedSlideCount, `${expectedSlideCount} -> ${reopened.count}`);
  check("Mở lại giữ textbox, hình và fade", targetSlide.shapes.some(s => s.text.includes("Hop kiem thu FIX-L2"))
    && targetSlide.shapes.length >= 2 && targetSlide.transition === "fade",
  { shapes: targetSlide.shapes.length, transition: targetSlide.transition });
  const rendered = Number(await session.cdp.evaluate("document.querySelectorAll('.vno-slide-shapes-layer .vno-slide-shape-item').length"));
  check("Mở lại hiển thị đủ shape trên canvas", rendered === targetSlide.shapes.length, { model: targetSlide.shapes.length, rendered });
  const reopenedSignatures = targetSlide.shapes.map(({ text }) => text || "");
  check("Mở lại giữ thứ tự lớp của shapes", JSON.stringify(reopenedSignatures) === JSON.stringify(savedShapeSignatures),
    { saved: savedShapeSignatures, reopened: reopenedSignatures });
  const renderedOrder = JSON.parse(await session.cdp.evaluate("JSON.stringify([...document.querySelectorAll('.vno-slide-shapes-layer .vno-slide-shape-item')].map(e=>e.dataset.shapeId))"));
  check("DOM canvas vẽ shapes đúng thứ tự model", JSON.stringify(renderedOrder) === JSON.stringify(targetSlide.shapes.map(s => String(s.id))),
    { model: targetSlide.shapes.map(s => String(s.id)), rendered: renderedOrder });
} finally {
  await session.close();
}

session = await openLoaded(businessFile);
let businessBefore;
try {
  businessBefore = await slideState(session);
  check("Mở tệp kinh doanh để so số đối tượng", businessBefore.count > 0,
    businessBefore.slides.map(s => s.shapes.length));
  const saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 600000 });
  check("Lưu lại tệp kinh doanh", saved === true, saved);
} finally {
  await session.close();
}

session = await openLoaded(businessFile);
try {
  const businessAfter = await slideState(session);
  const beforeCounts = businessBefore.slides.map(s => s.shapes.length);
  const afterCounts = businessAfter.slides.map(s => s.shapes.length);
  check("Tệp kinh doanh: số slide giữ nguyên", businessAfter.count === businessBefore.count,
    `${businessBefore.count} -> ${businessAfter.count}`);
  check("Tệp kinh doanh: số đối tượng từng slide giữ nguyên", JSON.stringify(afterCounts) === JSON.stringify(beforeCounts),
    { before: beforeCounts, after: afterCounts });
} finally {
  await session.close();
}

console.log(`SUMMARY ${results.filter(Boolean).length}/${results.length}`);
if (results.some(pass => !pass)) process.exitCode = 1;
