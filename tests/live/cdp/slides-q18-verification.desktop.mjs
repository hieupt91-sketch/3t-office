// Q18 extended authoring checks. Runs the packaged desktop entrypoint and persists a fresh LOCALAPPDATA per session.
import path from "node:path";
import fs from "node:fs/promises";
import { launchApp } from "./session.mjs";
import { click } from "./actions.mjs";

const outDir = process.env.VNO_Q18_OUT || "E:\\VNOffice-profiles\\q18-slides-20261020";
const pptx = path.join(outDir, "q18-eight-slides.pptx");
const screenshotsDir = process.env.VNO_Q56_UI_SHOTS || path.join(outDir, "screenshots");
await fs.mkdir(screenshotsDir, { recursive: true });
async function captureScreen(cdp, name) {
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(path.join(screenshotsDir, name + ".png"), Buffer.from((shot.result || shot).data, "base64"));
}
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
const reopenLocalAppData = process.env.VNO_Q18_REOPEN_LOCALAPPDATA;
const session = await launchApp("slides", { localAppData });
const { cdp } = session;
const ev = expression => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 180000 });
const canvas = "window.__vnoAppInstance.adapter.canvas";
async function save() {
  return await ev(`(async()=>{const a=window.__vnoAppInstance.adapter;return await window.pywebview.api.save_document_in_place(a.serializeToFodp(),'slides',${JSON.stringify(pptx)},null)})()`);
}
try {
  const init = await ev(`(() => { const c=${canvas}; while(c.slides.length>1)c.slides.pop(); c.slides[0].title="VN Office: Kế hoạch năm"; c.slides[0].body="Mục tiêu, sản phẩm và lộ trình"; for(let i=1;i<8;i++)c.addNewSlide(false); c.slides.forEach((s,i)=>{s.title=["Kế hoạch năm","Ưu tiên","Sản phẩm","Thiết kế","Triển khai","Đo lường","Rủi ro","Kết luận"][i];s.body="Nội dung làm việc trang "+(i+1);}); c._renderThumbnails(); return c.slides.length; })()`);
  check("Tạo dàn ý đúng 8 trang", init === 8, String(init));

  const cluster1 = await ev(`(() => { const c=${canvas}; c.applySlideMaster({themeId:"modern-blue",fontFamily:"Arial",bgColor:"#ffffff",titleColor:"#1e3a8a",bodyColor:"#334155",accentColor:"#0f766e",footerText:"Kế hoạch nội bộ"}); c.applyHeaderFooter({showDate:true,showSlideNumber:true,showFooter:true,footerText:"Kế hoạch nội bộ",applyToAll:true}); ["title-content","two-content","blank"].forEach((layout,i)=>{c.slides[i+1].layoutType=layout;}); c.slides[1].body="Cột trái"; c.slides[1].body2="Cột phải"; c.slides[2].body="Nội dung sản phẩm"; c.slides[3].body=""; c._renderThumbnails(); return {theme:c.masterTheme.themeId,layouts:c.slides.slice(1,4).map(s=>s.layoutType),hf:c.slides[0].headerFooter}; })()`);
  check("Master, ba bố cục, ngày/số trang/chân trang", cluster1.theme === "modern-blue" && cluster1.layouts.length === 3 && cluster1.hf.showDate && cluster1.hf.showSlideNumber && cluster1.hf.footerText === "Kế hoạch nội bộ", JSON.stringify(cluster1));
  await captureScreen(cdp, "q18-stage1-editor");
  const saved1 = await save();
  check("Lưu cụm master và bố cục vào PPTX", saved1?.status === "ok", JSON.stringify(saved1));
  await session.close();

  let reopened = await launchApp("slides", { filePath: pptx, localAppData: reopenLocalAppData });
  await reopened.cdp.waitFor(`${canvas}.slides.length===8`, { timeoutMilliseconds: 45000 });
  let state1 = await reopened.cdp.evaluate(`JSON.stringify({n:${canvas}.slides.length,theme:${canvas}.masterTheme.themeId,layouts:${canvas}.slides.slice(1,4).map(s=>s.layoutType),hf:${canvas}.slides[0].headerFooter})`);
  const decoded1 = JSON.parse(state1);
  await captureScreen(reopened.cdp, "q18-stage1-reopened");
  check("Phiên desktop mới đọc lại cụm master/bố cục", decoded1.n === 8 && decoded1.theme === "modern-blue" && decoded1.layouts.length === 3 && decoded1.hf?.showSlideNumber, state1);
  await reopened.close();

  const stage2 = await launchApp("slides", { filePath: pptx, localAppData: process.env.VNO_Q18_STAGE2_LOCALAPPDATA });
  await stage2.cdp.waitFor(`${canvas}.slides.length===8`, { timeoutMilliseconds: 45000 });
  const cdp2 = stage2.cdp;
  const ev2 = expression => cdp2.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 180000 });
  const cluster2 = await ev2(`(() => { const c=${canvas}; c.selectSlide(3); const d=c.insertDiagram("process",3); const s=c.slides[3]; const nodes=s.shapes.filter(x=>x.diagramRole==="node"); c.insertShape("rect"); c.insertShape("ellipse"); c.insertShape("rect"); const added=s.shapes.slice(-3); const ids=added.map(x=>x.id); c.setSelectedShapes(ids); const grouped=c.groupSelectedShapes(); c.ungroupSelectedShapes(); c.setSelectedShapes(ids); const aligned=c.alignShapes("center"); const distributed=c.distributeShapes("horizontal"); const lowered=c.reorderSelectedShapes("back"); const raised=c.reorderSelectedShapes("front"); s.notes="Giải thích quy trình và số liệu."; c.selectSlide(6); c.toggleCurrentSlideHidden(true,true); const aspectBefore=c.slideSize.preset; c.setSlideSize({preset:"standard"}); const aspect43=c.slideSize.preset; c.setSlideSize({preset:"wide"}); c._renderShapesLayer(); c._renderThumbnails(); return {diagram:d?.length||d,nodes:nodes.length,grouped:!!grouped,aligned:!!aligned,distributed:!!distributed,raised:!!raised,lowered:!!lowered,ids,order:s.shapes.map(x=>x.id),notes:s.notes,hidden:c.slides[6].hidden,aspectBefore,aspect43,aspectAfter:c.slideSize.preset}; })()`);
  check("Connector diagram, group/ungroup, align/distribute, layer, notes, hidden, aspect ratio", cluster2.nodes >= 3 && cluster2.notes.includes("Giải thích") && cluster2.hidden && cluster2.aspect43 === "standard" && cluster2.aspectAfter === "wide", JSON.stringify(cluster2));
  await captureScreen(cdp2, "q18-stage2-diagram");
  const saved2 = await ev2(`(async()=>{const a=window.__vnoAppInstance.adapter;return await window.pywebview.api.save_document_in_place(a.serializeToFodp(),'slides',${JSON.stringify(pptx)},null)})()`);
  check("Lưu cụm đối tượng và kích thước PPTX", saved2?.status === "ok", JSON.stringify(saved2));
  await stage2.close();

  const stage2Reopen = await launchApp("slides", { filePath: pptx, localAppData: process.env.VNO_Q18_STAGE2_REOPEN_LOCALAPPDATA });
  await stage2Reopen.cdp.waitFor(`${canvas}.slides.length===8`, { timeoutMilliseconds: 45000 });
  const round2 = await stage2Reopen.cdp.evaluate(`JSON.stringify({n:${canvas}.slides.length,notes:${canvas}.slides[3].notes,hidden:${canvas}.slides[6].hidden,size:${canvas}.slideSize.preset,shapes:${canvas}.slides[3].shapes.map(s=>s.type)})`);
  await captureScreen(stage2Reopen.cdp, "q18-stage2-reopened");
  check("PPTX round-trip cụm đối tượng và kích thước", JSON.parse(round2).n === 8 && JSON.parse(round2).notes.includes("Giải thích") && JSON.parse(round2).hidden, round2);
  await stage2Reopen.close();

  const stage3 = await launchApp("slides", { filePath: pptx, localAppData: process.env.VNO_Q18_STAGE3_LOCALAPPDATA });
  await stage3.cdp.waitFor(`${canvas}.slides.length===8`, { timeoutMilliseconds: 45000 });
  const ev3 = expression => stage3.cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 180000 });
  const cluster3 = await ev3(`(() => { const c=${canvas}; c.selectSlide(4); const s=c.slides[4]; c.insertShape("rect"); c.insertShape("ellipse"); c.insertShape("rect"); const [a,b,d]=s.shapes.slice(-3); c.setObjectAnimation(a.id,{type:"flyIn",duration:700,delay:0,start:"onClick",order:1,trigger:b.id}); c.setObjectAnimation(b.id,{type:"pulse",duration:500,delay:0,start:"afterPrevious",order:2}); c.setObjectAnimation(d.id,{type:"fadeOut",duration:600,delay:100,start:"onClick",order:3}); c.setTransition("wipe",800,false,{advanceOnClick:true,advanceAfter:5000},"left"); s.notes="Khi bấm, lần lượt hiện, nhấn mạnh rồi thoát."; c._renderThumbnails(); return {animations:[a.animation,b.animation,d.animation],transition:s.transition,notes:s.notes}; })()`);
  check("Ba loại hoạt ảnh, thứ tự, kích hoạt, thời lượng và chuyển trang tự động", cluster3.animations?.length === 3 && cluster3.animations[0]?.duration === 700 && cluster3.animations[0]?.trigger != null && cluster3.animations[1]?.order > cluster3.animations[0]?.order && cluster3.animations[2]?.type === "fadeOut" && cluster3.transition?.advanceAfter === 5000, JSON.stringify(cluster3));
  await captureScreen(stage3.cdp, "q18-stage3-animation");
  const saved3 = await ev3(`(async()=>{const a=window.__vnoAppInstance.adapter;return await window.pywebview.api.save_document_in_place(a.serializeToFodp(),'slides',${JSON.stringify(pptx)},null)})()`);
  check("Lưu cụm hoạt ảnh và chuyển trang PPTX", saved3?.status === "ok", JSON.stringify(saved3));
  await stage3.close();

  const stage3Reopen = await launchApp("slides", { filePath: pptx, localAppData: process.env.VNO_Q18_STAGE3_REOPEN_LOCALAPPDATA });
  await stage3Reopen.cdp.waitFor(`${canvas}.slides.length===8`, { timeoutMilliseconds: 45000 });
  const round3 = await stage3Reopen.cdp.evaluate(`JSON.stringify({n:${canvas}.slides.length,transition:${canvas}.slides[4].transition,shapes:${canvas}.slides[4].shapes.map(s=>({type:s.type,animation:s.animation,animations:s.animations}))})`);
  await captureScreen(stage3Reopen.cdp, "q18-stage3-reopened");
  check("PPTX round-trip cụm hoạt ảnh và chuyển trang", JSON.parse(round3).n === 8 && JSON.parse(round3).transition?.type === "wipe", round3);
  await stage3Reopen.close();

  const stage4 = await launchApp("slides", { filePath: pptx, localAppData: process.env.VNO_Q18_STAGE4_LOCALAPPDATA });
  await stage4.cdp.waitFor(`${canvas}.slides.length===8`, { timeoutMilliseconds: 45000 });
  await click(stage4.cdp, "#vno-ribbon-tab-insert");
  await captureScreen(stage4.cdp, "q18-insert-ribbon");
  const state4 = await stage4.cdp.evaluate(`JSON.stringify({media:[...document.querySelectorAll('[data-command-id]')].filter(e=>/slides\\.media\\.insert(Video|Audio)/.test(e.dataset.commandId)).map(e=>e.dataset.commandId),notesPage:!!window.__vnoAppInstance.adapter.canvas.openNotesPage})`);
  const parsed4 = JSON.parse(state4);
  check("Kiểm tra nút chèn video/âm thanh", parsed4.media.length === 2, state4);
  const notesOpened = await stage4.cdp.evaluate(`window.__vnoAppInstance.adapter.canvas.openNotesPage()`);
  await captureScreen(stage4.cdp, "q18-notes-page");
  check("Mở chế độ xem trang ghi chú", !!notesOpened);
  await stage4.cdp.evaluate(`window.__vnoAppInstance.adapter.canvas.closeNotesPage()`);
  await stage4.cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "F5", code: "F5", windowsVirtualKeyCode: 116 });
  await stage4.cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "F5", code: "F5", windowsVirtualKeyCode: 116 });
  await stage4.cdp.waitFor(`document.querySelector('.vno-slideshow-overlay')`, { timeoutMilliseconds: 5000 }).catch(() => {});
  const showStart = await stage4.cdp.evaluate(`!!document.querySelector('.vno-slideshow-overlay')`);
  await captureScreen(stage4.cdp, "q18-slideshow-start");
  check("F5 தொடக்க காட்சியைத் திறக்கிறது", showStart);
  await stage4.cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
  await stage4.cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
  const showNext = await stage4.cdp.evaluate(`document.querySelector('.vno-slideshow-overlay')?.textContent || ''`);
  await captureScreen(stage4.cdp, "q18-slideshow-next");
  check("அம்புக்குறியால் அடுத்த slide செல்லுதல்", showStart && showNext.length > 0, showNext.slice(0, 100));
  await stage4.cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await stage4.cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  check("Esc மூலம் காட்சியிலிருந்து வெளியேறுதல்", !(await stage4.cdp.evaluate(`!!document.querySelector('.vno-slideshow-overlay')`)));
  const printInfo = await stage4.cdp.evaluate(`JSON.stringify(window.__vnoAppInstance.adapter.canvas.computePrintPages())`);
  const printPages = JSON.parse(printInfo);
  check("Xem trước bản in không gồm trang bị ẩn", printPages.totalPages === 7, `totalPages=${printPages.totalPages}`);
  await stage4.cdp.evaluate(`window.__vnoAppInstance.adapter.canvas.openPrintPreview()` , { awaitPromise: true, timeoutMilliseconds: 30000 }).catch(() => {});
  await captureScreen(stage4.cdp, "q18-print-preview");
  check("Mở được xem trước khi in", !!(await stage4.cdp.evaluate(`document.querySelector('.vno-slides-print-preview-overlay')`)));
  await stage4.cdp.evaluate(`window.__vnoAppInstance.adapter.canvas.closePrintPreview()`);
  await stage4.close();
} catch (error) {
  check("Q18 desktop workflow kết thúc", false, error.stack || error.message);
  await session.close().catch(() => {});
}
if (checks.some(ok => !ok)) process.exit(1);
console.log(`slides-q18-verification: ${checks.length}/${checks.length} PASS`);
