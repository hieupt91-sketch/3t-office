import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { mouseClick, mouseDrag, press } from "./actions.mjs";
import { listZipEntries, readZipEntry } from "../../helpers/zip-package.mjs";
import { parseMasterThemeId } from "../../../adapters/libreoffice/slides/pptx-master-logo.js";

const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!localAppData) throw new Error("Set VNO_CDP_LOCALAPPDATA to the dedicated Slides test profile.");
const source = process.env.VNO_FIX_L3_SOURCE || "E:\\VN OFice\\file test\\lan\\BÁO CÁO KẾT QUẢ KINH DOANH NĂM 2021.pptx";
const workDir = path.join(localAppData, "fix-l3");
mkdirSync(workDir, { recursive: true });
const roundtrip = path.join(workDir, "slides-groups-roundtrip.pptx");
copyFileSync(source, roundtrip);
const countNativeGroups = buffer => listZipEntries(buffer)
  .filter(item => /^ppt\/slides\/slide\d+\.xml$/.test(item.name))
  .reduce((count, item) => count + ((readZipEntry(buffer, item.name).toString("utf8").match(/<p:grpSp\b/g) || []).length), 0);
const sourceGroupCount = countNativeGroups(readFileSync(roundtrip));
const results = [];
const check = (name, pass, detail = "") => {
  results.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name} | ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const readGroupXml = () => {
  const buffer = readFileSync(roundtrip);
  const entries = listZipEntries(buffer).filter(item => /^ppt\/slides\/slide\d+\.xml$/.test(item.name));
  if (!entries.length) throw new Error("No slide XML entry in saved PPTX");
  return entries.map(item => readZipEntry(buffer, item.name).toString("utf8")).join("\n");
};
const openLoaded = async () => {
  const session = await launchApp("slides", {
    filePath: roundtrip,
    localAppData,
    startTimeoutMilliseconds: 180000,
    readyTimeoutMilliseconds: 180000
  });
  await session.cdp.waitFor(
    `window.__vnoAppInstance?.adapter?.sourceFilePath === ${JSON.stringify(roundtrip)}`,
    { timeoutMilliseconds: 240000, intervalMilliseconds: 250 }
  );
  await session.cdp.waitFor("window.__vnoAppInstance.adapter.canvas.slides.length > 0", { timeoutMilliseconds: 240000 });
  return session;
};

let session;
try {
  session = await openLoaded();
  console.log(`CDP_PORT ${session.debugPort} | PROFILE ${session.localAppData} | SOURCE ${roundtrip}`);
  const created = await session.cdp.evaluate(`(() => {
    const canvas=window.__vnoAppInstance.adapter.canvas;
    const slide=canvas.slides[canvas.currentSlideIndex];
    const groupTag='L3_GROUP_'+Date.now();
    const shapes=[
      {id:groupTag+'_rect',type:'rect',x:80,y:100,w:130,h:90,fill:'#e87924',groupId:null},
      {id:groupTag+'_text',type:'textbox',x:230,y:100,w:160,h:90,text:'L3 grouped text',groupId:null},
      {id:groupTag+'_image',type:'image',x:410,y:100,w:100,h:90,src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pZsAAAAASUVORK5CYII=',groupId:null}
    ];
    slide.shapes.push(...shapes);
    canvas._renderShapesLayer();
    canvas.setSelectedShapes(shapes.slice(0,2).map(item=>item.id));
    return {ids:shapes.map(item=>item.id), slideIndex:canvas.currentSlideIndex};
  })()`);
  await press(session.cdp, "g", { ctrl: true });
  await session.cdp.waitFor("window.__vnoAppInstance.adapter.canvas.slides[window.__vnoAppInstance.adapter.canvas.currentSlideIndex].groups?.length === 1");
  await session.cdp.evaluate(`(() => {
    const c=window.__vnoAppInstance.adapter.canvas;
    const s=c.slides[c.currentSlideIndex];
    const first=s.shapes.find(x=>x.id===${JSON.stringify(created.ids[0])});
    const image=s.shapes.find(x=>x.id===${JSON.stringify(created.ids[2])});
    c.setSelectedShapes([first.id,image.id]);
  })()`);
  await press(session.cdp, "g", { ctrl: true });
  const groupModel = JSON.parse(await session.cdp.evaluate(`JSON.stringify((()=>{
    const s=window.__vnoAppInstance.adapter.canvas.slides[${created.slideIndex}];
    return {groups:s.groups,shapes:s.shapes.filter(x=>${JSON.stringify(created.ids)}.includes(x.id)).map(x=>({id:x.id,type:x.type,groupId:x.groupId}))};
  })())`));
  check("Ctrl+G tạo nhóm lồng chứa hình, hộp chữ và ảnh", groupModel.groups.length === 2 && groupModel.shapes.length === 3 && groupModel.shapes.some(x => x.type === "image"), groupModel);
  await press(session.cdp, "g", { ctrl: true, shift: true });
  const ungroupedCount = await session.cdp.evaluate(`window.__vnoAppInstance.adapter.canvas.slides[${created.slideIndex}].groups.length`);
  check("Ctrl+Shift+G bỏ nhóm cha và giữ nguyên nhóm con", ungroupedCount === 1, { ungroupedCount });
  await press(session.cdp, "z", { ctrl: true });
  await session.cdp.waitFor(`window.__vnoAppInstance.adapter.canvas.slides[${created.slideIndex}].groups.length === 2`);

  await press(session.cdp, "s", { ctrl: true }, 1200);
  await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()");
  await session.cdp.waitFor("window.__vnoAppInstance.adapter.isDirty === false", { timeoutMilliseconds: 120000, intervalMilliseconds: 250 });
  const pptxXml = readGroupXml();
  const groupCount = (pptxXml.match(/<p:grpSp\b/g) || []).length;
  check("Ctrl+S ghi nhóm lồng, giữ nhóm đã có của PPTX nguồn", groupCount >= sourceGroupCount + 2 && pptxXml.includes("L3_GROUP_"), { sourceGroupCount, savedGroupCount: groupCount, xmlLength: pptxXml.length });
  await session.close();
  session = null;

  session = await openLoaded();
  const reopened = JSON.parse(await session.cdp.evaluate(`JSON.stringify((()=>{
    const c=window.__vnoAppInstance.adapter.canvas;
    const s=c.slides.find(slide=>slide.shapes?.some(x=>String(x.text||'').includes('L3 grouped text')));
    return s ? {source:window.__vnoAppInstance.adapter.sourceFilePath,groups:s.groups,shapes:s.shapes.filter(x=>String(x.text||'').includes('L3 grouped text')||x.type==='image'||x.id.toString().includes('L3_GROUP')).map(x=>({id:x.id,type:x.type,text:x.text||'',groupId:x.groupId,x:x.x,y:x.y}))} : null;
  })())`));
  const groupRelations = reopened?.groups?.length >= 2 && reopened.groups.some(group => reopened.groups.some(parent => parent.id === group.parentId));
  check("Mở lại cùng PPTX khôi phục nhóm cha/con và đủ ba loại shape", Boolean(reopened && groupRelations && reopened.shapes.some(x => x.type === "image") && reopened.shapes.some(x => x.text.includes("L3 grouped text"))), reopened);

  const beforeDrag = await session.cdp.evaluate(`(() => {
    const c=window.__vnoAppInstance.adapter.canvas;
    const s=c.slides.find(slide=>slide.shapes?.some(x=>String(x.text||'').includes('L3 grouped text')));
    const text=s.shapes.find(x=>String(x.text||'').includes('L3 grouped text'));
    return {slideIndex:c.slides.indexOf(s),textId:String(text.id),x:text.x,y:text.y};
  })()`);
  await session.cdp.evaluate(`(() => {
    const c=window.__vnoAppInstance.adapter.canvas,s=c.slides[${beforeDrag.slideIndex}];
    c.selectShapeFromUserClick(s.shapes.find(x=>String(x.id)===${JSON.stringify(beforeDrag.textId)}));
  })()`);
  const box = await session.cdp.evaluate(`(() => {const e=document.querySelector('[data-shape-id="${beforeDrag.textId}"]');if(!e)return null;const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  if (box) await mouseDrag(session.cdp, box.x, box.y, box.x + 34, box.y + 22, { steps: 5 });
  const afterDrag = await session.cdp.evaluate(`(() => {
    const c=window.__vnoAppInstance.adapter.canvas,s=c.slides[${beforeDrag.slideIndex}];
    const t=s.shapes.find(x=>String(x.id)===${JSON.stringify(beforeDrag.textId)});
    return {x:t.x,y:t.y,selected:c.selectedShapeIds.size};
  })()`);
  check("Kéo nhóm sau khi mở lại di chuyển các đối tượng đã chọn cùng nhau", Boolean(box && afterDrag.selected >= 2 && afterDrag.x > beforeDrag.x && afterDrag.y > beforeDrag.y), { beforeDrag, afterDrag });

  const resizeStart = await session.cdp.evaluate(`(() => {
    const canvas=window.__vnoAppInstance.adapter.canvas,s=canvas.slides[${beforeDrag.slideIndex}];
    const members=s.shapes.filter(x=>canvas.selectedShapeIds.has(String(x.id)));
    const e=document.querySelector('[data-shape-id="${beforeDrag.textId}"] [data-handle-dir="se"]');
    if(!e)return null;const r=e.getBoundingClientRect();
    return {x:r.left+r.width/2,y:r.top+r.height/2,widths:members.map(x=>x.w)};
  })()`);
  if (resizeStart) await mouseDrag(session.cdp, resizeStart.x, resizeStart.y, resizeStart.x + 28, resizeStart.y + 20, { steps: 5 });
  const resizeEnd = await session.cdp.evaluate(`(() => {
    const c=window.__vnoAppInstance.adapter.canvas,s=c.slides[${beforeDrag.slideIndex}];
    return s.shapes.filter(x=>c.selectedShapeIds.has(String(x.id))).map(x=>x.w);
  })()`);
  check("Kéo tay nắm đổi kích thước cả nhóm sau khi mở lại", Boolean(resizeStart && resizeEnd.length >= 2 && resizeEnd.every((width,index)=>width > resizeStart.widths[index])), { before: resizeStart?.widths, after: resizeEnd });

  const rotateDrag = await session.cdp.evaluate(`(() => {
    const c=window.__vnoAppInstance.adapter.canvas,s=c.slides[${beforeDrag.slideIndex}],selected=s.shapes.filter(x=>c.selectedShapeIds.has(String(x.id)));
    const handle=document.querySelector('[data-shape-id="${beforeDrag.textId}"] .vno-shape-rotate-handle');if(!handle)return null;
    const hr=handle.getBoundingClientRect(),cr=c.canvasEl.getBoundingClientRect();
    const start={x:hr.left+hr.width/2,y:hr.top+hr.height/2};
    const centerX=cr.left+(Math.min(...selected.map(x=>x.x))+Math.max(...selected.map(x=>x.x+x.w)))/2*c._pointerScale();
    const centerY=cr.top+(Math.min(...selected.map(x=>x.y))+Math.max(...selected.map(x=>x.y+x.h)))/2*c._pointerScale();
    const dx=start.x-centerX,dy=start.y-centerY,angle=Math.PI/6;
    return {start,target:{x:centerX+dx*Math.cos(angle)-dy*Math.sin(angle),y:centerY+dx*Math.sin(angle)+dy*Math.cos(angle)},rotations:selected.map(x=>x.rotation||0)};
  })()`);
  if (rotateDrag) await mouseDrag(session.cdp, rotateDrag.start.x, rotateDrag.start.y, rotateDrag.target.x, rotateDrag.target.y, { steps: 6 });
  const rotationsAfter = await session.cdp.evaluate(`(() => {
    const c=window.__vnoAppInstance.adapter.canvas,s=c.slides[${beforeDrag.slideIndex}];return s.shapes.filter(x=>c.selectedShapeIds.has(String(x.id))).map(x=>x.rotation||0);
  })()`);
  check("Xoay tay nắm làm xoay và đổi vị trí cả nhóm sau khi mở lại", Boolean(rotateDrag && rotationsAfter.length >= 2 && rotationsAfter.every((rotation,index)=>rotation !== rotateDrag.rotations[index])), { before: rotateDrag?.rotations, after: rotationsAfter });

  await session.cdp.evaluate("(() => { window.__l3ThemeDialogPromise = window.__vnoAppInstance.adapter.canvas.showSlideMasterDialog(); return true; })()");
  await session.cdp.waitFor("document.querySelector('.vno-theme-card[data-theme-id=\"minimal-dark\"]')", { timeoutMilliseconds: 10000 });
  const themeCard = await session.cdp.evaluate(`(() => {const r=document.querySelector('.vno-theme-card[data-theme-id="minimal-dark"]').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  await mouseClick(session.cdp, themeCard.x, themeCard.y);
  const applyTheme = await session.cdp.evaluate(`(() => {const r=document.querySelector('#vno-master-apply').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  await mouseClick(session.cdp, applyTheme.x, applyTheme.y);
  await press(session.cdp, "s", { ctrl: true }, 1000);
  await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()");
  const themedXml = readGroupXml();
  const masterEntry = listZipEntries(readFileSync(roundtrip)).find(item => /^ppt\/slideMasters\/slideMaster\d+\.xml$/.test(item.name));
  const themeId = parseMasterThemeId(readZipEntry(readFileSync(roundtrip), masterEntry.name).toString("utf8"));
  check("Áp dụng Than Chì Hiện Đại rồi lưu giữ themeId minimal-dark trong Slide Master", themeId === "minimal-dark", { themeId, masterEntry: masterEntry.name, marker: themedXml.includes("L3_GROUP_") });
  await session.close();
  session = await openLoaded();
  const reopenedThemeId = await session.cdp.evaluate("window.__vnoAppInstance.adapter.canvas.masterTheme?.id || window.__vnoAppInstance.adapter.canvas.masterTheme?.themeId || ''");
  check("Mở lại PPTX vẫn nhận diện theme minimal-dark", reopenedThemeId === "minimal-dark", { reopenedThemeId });

  const showStarted = await session.cdp.evaluate("Boolean(window.__l3Show = window.__vnoAppInstance.adapter.canvas.startSlideShow(0))");
  check("Bắt đầu trình chiếu thật cho kiểm thử phím tắt bút", showStarted);
  await press(session.cdp, "p", { ctrl: true });
  const pen = JSON.parse(await session.cdp.evaluate(`JSON.stringify({mode:window.__l3Show?.getPointerMode?.(),cursor:document.querySelector('.vno-slideshow-overlay')?.style.cursor,overlay:!!document.querySelector('.vno-slideshow-overlay')})`));
  check("Ctrl+P bật bút trong trình chiếu", pen.mode === "pen" && pen.overlay, pen);
  await press(session.cdp, "l", { ctrl: true });
  const laser = await session.cdp.evaluate("window.__l3Show?.getPointerMode?.() === 'laser'");
  await press(session.cdp, "a", { ctrl: true });
  const arrow = await session.cdp.evaluate("window.__l3Show?.getPointerMode?.() === 'arrow'");
  check("Ctrl+L bật laser và Ctrl+A trở về mũi tên", Boolean(laser && arrow), { laser, arrow });
  await press(session.cdp, "p", { ctrl: true });
  await press(session.cdp, "Escape");
  const escapeState = await session.cdp.evaluate("({mode:window.__l3Show?.getPointerMode?.(),overlay:!!document.querySelector('.vno-slideshow-overlay')})");
  check("Esc thoát công cụ bút nhưng giữ trình chiếu mở", escapeState.mode === "arrow" && escapeState.overlay, escapeState);
  await session.cdp.evaluate("window.__l3Show?.close(false)");
} finally {
  if (session) await session.close().catch(() => {});
}
if (results.some(pass => !pass)) process.exitCode = 1;
