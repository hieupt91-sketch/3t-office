import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp } from "./session.mjs";
import { click, mouseRightClick, press, typeText } from "./actions.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!root) throw new Error("Set VNO_APP_ROOT to the selected worktree.");
if (!localAppData) throw new Error("Set VNO_CDP_LOCALAPPDATA to a dedicated profile.");
const input = path.join(localAppData, "template.pptx");
const output = path.join(localAppData, "fix-l6-result.pptx");
const evidenceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../docs/tickets-0710/evidence/fix-l6");
await fs.copyFile(input, output);
const session = await launchApp("slides", { root, filePath: output, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const state = () => session.cdp.evaluate(`JSON.stringify((()=>{const a=window.__vnoAppInstance.adapter,c=a.canvas,s=c.slides[c.currentSlideIndex];return {source:a.sourceFilePath,slideCount:c.slides.length,slideIndex:c.currentSlideIndex,shapeCount:s.shapes.length,shapes:s.shapes.map(x=>({id:x.id,type:x.type,text:x.text||"",x:x.x,y:x.y,w:x.w,h:x.h,fill:x.fill||x.color,stroke:x.stroke||null,strokeWidth:x.strokeWidth||0,rotation:x.rotation||0,animation:x.animation||null})),notes:s.notes||"",hidden:!!s.hidden,transition:s.transition||null,layout:s.layoutType,masterThemeId:a.masterThemeId||null};})())`);
const screenshot = async name => {
  await fs.mkdir(evidenceDir, { recursive: true });
  const result = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(path.join(evidenceDir, `${name}.png`), Buffer.from(result.result.data, "base64"));
};
try {
  await session.cdp.waitFor(`window.__vnoAppInstance?.adapter?.sourceFilePath === ${JSON.stringify(output)}`, { timeoutMilliseconds: 180000 });
  await session.cdp.waitFor("window.__vnoAppInstance?.adapter?.canvas?.slides?.length > 0", { timeoutMilliseconds: 180000 });
  console.log(`CDP_PORT ${session.debugPort} | PROFILE ${localAppData} | ROOT ${root}`);
  console.log("BASELINE " + await state());
  await click(session.cdp, "#vno-ribbon-tab-insert");
  await click(session.cdp, '[data-command-id="slides.shape.insert"]');
  await sleep(800);
  console.log("AFTER_SHAPE_INSERT " + await state());
  await screenshot("insert-shape");
  const shapePoint = await session.cdp.evaluate(`(() => { const c=window.__vnoAppInstance.adapter.canvas,s=c.slides[c.currentSlideIndex],x=s.shapes.at(-1),e=[...document.querySelectorAll("[data-shape-id]")].find(y=>y.dataset.shapeId===String(x.id)); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  if (!shapePoint) throw new Error("Cannot locate inserted shape on the slide canvas.");
  await mouseRightClick(session.cdp, shapePoint.x, shapePoint.y);
  await screenshot("shape-context-menu");
  console.log("SHAPE_CONTEXT_MENU " + await session.cdp.evaluate(`JSON.stringify([...document.querySelectorAll("[role=menu] button,[role=menuitem]")].filter(e=>e.offsetParent).map(e=>e.textContent.trim()))`));
  await click(session.cdp, '.vno-shape-context-menu [data-action="format"]');
  await session.cdp.waitFor('!!document.querySelector("#vno-shape-format-apply")', { timeoutMilliseconds: 10000 });
  await screenshot("shape-format-dialog");
  await click(session.cdp, '[data-shape-fill="#f97316"]');
  await click(session.cdp, '[data-shape-stroke="#111827"]');
  await click(session.cdp, '[data-shape-stroke-width="2"]');
  for (const [selector, value] of [["#vno-shape-format-width", "260"], ["#vno-shape-format-height", "150"], ["#vno-shape-format-rotation", "30"]]) {
    await click(session.cdp, selector);
    await press(session.cdp, "Home", {}, 60);
    for (let i = 0; i < 6; i++) await press(session.cdp, "Delete", {}, 30);
    await typeText(session.cdp, value, 30);
  }
  await screenshot("shape-format-selected");
  const fieldValues = await session.cdp.evaluate(`JSON.stringify(["width","height","rotation"].map(name=>document.querySelector("#vno-shape-format-"+name).value))`);
  console.log("SHAPE_FORMAT_INPUTS " + fieldValues);
  await click(session.cdp, "#vno-shape-format-apply");
  const formattedState = JSON.parse(await state());
  const formattedShape = formattedState.shapes.at(-1);
  if (formattedShape.fill !== "#f97316" || formattedShape.strokeWidth !== 2 || formattedShape.w !== 260 || formattedShape.h !== 150 || formattedShape.rotation !== 30) throw new Error("Shape Format UI did not apply selected values: " + JSON.stringify(formattedShape));
  await screenshot("shape-format-applied");
  console.log("AFTER_SHAPE_FORMAT " + JSON.stringify(formattedShape));
  await press(session.cdp, "s", { ctrl: true }, 1200);
  const saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 600000 });
  if (!saved) throw new Error("SlidesAdapter.save() returned false.");
  await session.cdp.waitFor("window.__vnoAppInstance.adapter.isDirty === false", { timeoutMilliseconds: 120000 });
  console.log("SAVED " + JSON.stringify({ saved, output, state: await state() }));
} finally {
  await session.close();
}
