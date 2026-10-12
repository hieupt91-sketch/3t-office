import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, mouseClick, mouseDrag, typeText } from "./actions.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!root || !localAppData) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const file = path.join(localAppData, "fix-l12-office-compare.pptx");
const template = path.join(localAppData, "template.pptx");
const fs = await import("node:fs/promises");
await fs.copyFile(template, file);
const session = await launchApp("slides", { root, filePath: file, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const results = [];
const check = (name, pass, detail = "") => {
  results.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name} | ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
};
const state = () => session.cdp.evaluate(`(() => { const c=window.__vnoAppInstance.adapter.canvas,s=c.slides[c.currentSlideIndex]; return {layout:s.layoutType,transition:s.transition||null,theme:c.masterTheme?.id||c.masterThemeId||null,shapes:s.shapes.map(x=>({id:String(x.id),type:x.type,text:x.text||"",groupId:x.diagramGroupId||x.groupId||null}))}; })()`);
const clickCommand = async id => click(session.cdp, `[data-command-id="${id}"]`);
const chooseTheme = async id => {
  await click(session.cdp, "#vno-ribbon-tab-design");
  await clickCommand("slides.master.apply");
  await session.cdp.waitFor('!!document.querySelector("#vno-master-apply")', { timeoutMilliseconds: 30000 });
  const point = await session.cdp.evaluate(`(() => {const e=document.querySelector('[data-theme-id="${id}"]');if(!e)return null;const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  if (!point) return false;
  await mouseClick(session.cdp, point.x, point.y);
  await click(session.cdp, "#vno-master-apply");
  return true;
};
try {
  await session.cdp.waitFor(`window.__vnoAppInstance?.adapter?.sourceFilePath === ${JSON.stringify(file)}`, { timeoutMilliseconds: 180000 });
  await session.cdp.waitFor("window.__vnoAppInstance.adapter.canvas.slides.length === 1", { timeoutMilliseconds: 180000 });

  await click(session.cdp, "#vno-ribbon-tab-home");
  await clickCommand("slides.layout.apply");
  await session.cdp.waitFor('!!document.querySelector("#vno-layout-apply-current")', { timeoutMilliseconds: 30000 });
  await click(session.cdp, '[data-layout-id="two-content"]');
  await click(session.cdp, "#vno-layout-apply-current");
  const layoutState = await state();
  check("Áp dụng bố cục Hai nội dung qua ribbon", /two|content/i.test(String(layoutState.layout)), layoutState.layout);
  await clickCommand("slides.layout.reset");
  check("Đặt lại bố cục vẫn giữ Hai nội dung", /two|content/i.test(String((await state()).layout)), (await state()).layout);

  await click(session.cdp, "#vno-ribbon-tab-transitions");
  await clickCommand("slides.transition.apply");
  await session.cdp.waitFor('!!document.querySelector("#vno-trans-apply-current")', { timeoutMilliseconds: 30000 });
  await click(session.cdp, "#vno-trans-type-select");
  await session.cdp.evaluate(`(() => {const e=document.querySelector('#vno-trans-type-select');e.value='zoom';e.dispatchEvent(new Event('change',{bubbles:true}));return e.value})()`);
  await click(session.cdp, "#vno-trans-apply-current");
  const transitionState = await state();
  check("Chuyển tiếp Zoom lưu trong model", transitionState.transition?.type === "zoom", transitionState.transition);

  await chooseTheme("minimal-dark");
  check("Chủ đề Than Chì Hiện Đại được áp dụng", (await state()).theme === "minimal-dark", (await state()).theme);

  await click(session.cdp, "#vno-ribbon-tab-insert");
  await clickCommand("slides.insert.wordart");
  await session.cdp.waitFor('!!document.querySelector("[data-vno-dialog=wordart]")', { timeoutMilliseconds: 30000 });
  await click(session.cdp, "#vno-wordart-text");
  await typeText(session.cdp, "L12 WordArt editable", 15);
  await click(session.cdp, '[data-wordart-preset="ocean-gradient"]');
  await click(session.cdp, '[data-vno-dialog="wordart"] .vno-dialog-ok-btn');
  check("WordArt được tạo thành đối tượng chỉnh sửa được trong model", (await state()).shapes.some(x => x.type === "wordart" && x.text.includes("L12 WordArt editable")));

  await clickCommand("slides.diagram.insert");
  await session.cdp.waitFor('!!document.querySelector("#vno-diagram-insert")', { timeoutMilliseconds: 30000 });
  await click(session.cdp, "#vno-diagram-insert");
  await session.cdp.waitFor("window.__vnoAppInstance.adapter.canvas.slides[0].shapes.some(x=>x.diagramGroupId)", { timeoutMilliseconds: 30000 });
  const diagramBefore = await state();
  const groupId = diagramBefore.shapes.find(x => x.groupId)?.groupId;
  const members = diagramBefore.shapes.filter(x => x.groupId === groupId);
  check("Sơ đồ có nhóm thành viên trong model", Boolean(groupId && members.length >= 4), { groupId, members: members.length });
  if (members[0]) {
    const shapeId = members[0].id;
    const point = await session.cdp.evaluate(`(() => {const e=document.querySelector('[data-shape-id="${shapeId}"]');if(!e)return null;const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
    if (point) await mouseClick(session.cdp, point.x, point.y);
    const clickState = await session.cdp.evaluate(`(() => {const c=window.__vnoAppInstance.adapter.canvas;const top=document.elementFromPoint(${point?.x || 0},${point?.y || 0});return {selected:[...c.selectedShapeIds],target:c.selectedTarget,groupSelection:c.diagramGroupSelectionId,top:top?.className||top?.tagName,shapeId:${JSON.stringify(shapeId)}}})()`);
    const selected = clickState.selected.length;
    check("Nhấp một thành phần chọn cả sơ đồ", selected >= members.length, clickState);
    if (point) {
      const beforeMove = await state();
      const afterPoint = { x: point.x + 28, y: point.y + 20 };
      await mouseDrag(session.cdp, point.x, point.y, afterPoint.x, afterPoint.y, { steps: 5 });
      const moved = await state();
      const beforeMembers = beforeMove.shapes.filter(x => x.groupId === groupId);
      const afterMembers = moved.shapes.filter(x => x.groupId === groupId);
      const delta = afterMembers.map((shape,index) => ({ id:shape.id,dx:shape.x-beforeMembers[index].x,dy:shape.y-beforeMembers[index].y }));
      const allMovedTogether = delta.length === members.length && delta.every(item=>item.dx===delta[0].dx&&item.dy===delta[0].dy&&item.dx!==0&&item.dy!==0);
      check("Kéo sơ đồ di chuyển tất cả thành viên cùng một lượng", allMovedTogether, delta);
    }
  }

  const saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 600000 });
  check("Lưu tệp PPTX đối chiếu thành công", Boolean(saved), saved);
  await fs.writeFile(path.join(localAppData, "fix-l12-office-compare-state.json"), JSON.stringify({ file, results, state: await state() }, null, 2) + "\n", "utf8");
  if (results.some(pass => !pass)) process.exitCode = 1;
} finally {
  await session.close();
}
