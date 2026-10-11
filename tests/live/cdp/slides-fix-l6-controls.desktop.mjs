import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp } from "./session.mjs";
import { click, press, typeText } from "./actions.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!root || !localAppData) throw new Error("Set VNO_APP_ROOT and dedicated VNO_CDP_LOCALAPPDATA.");
const input = path.join(localAppData, "template.pptx");
const output = path.join(localAppData, "fix-l6-controls.pptx");
const evidenceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../docs/tickets-0710/evidence/fix-l6");
await fs.copyFile(input, output);
const session = await launchApp("slides", { root, filePath: output, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const screenshot = async name => {
  await fs.mkdir(evidenceDir, { recursive: true });
  const result = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(path.join(evidenceDir, `${name}.png`), Buffer.from(result.result.data, "base64"));
};
const state = () => session.cdp.evaluate(`JSON.stringify((()=>{const a=window.__vnoAppInstance.adapter,c=a.canvas,s=c.slides[c.currentSlideIndex];return {layout:s.layoutType,notes:s.notes||"",transition:s.transition||null,masterThemeId:a.masterThemeId||c.masterThemeId||null,animations:c.collectSlideAnimations(s).map(x=>({target:x.target,type:x.type,order:x.order,duration:x.duration,delay:x.delay,start:x.start})),shapes:s.shapes.map(x=>({id:x.id,type:x.type,text:x.text||"",animation:x.animation||null}))}})())`);
const selectIndex = async (selector, index) => {
  await click(session.cdp, selector);
  await press(session.cdp, "Home", {}, 50);
  for (let i=0; i<index; i++) await press(session.cdp, "ArrowDown", {}, 50);
  await press(session.cdp, "Enter", {}, 100);
};
const setNumber = async (selector, value) => {
  await click(session.cdp, selector);
  await press(session.cdp, "Home", {}, 50);
  for (let i=0; i<6; i++) await press(session.cdp, "Delete", {}, 30);
  await typeText(session.cdp, value, 20);
};
const animateSelected = async (typeIndex, durationIndex, delayIndex) => {
  await click(session.cdp, "#vno-ribbon-tab-animations");
  await click(session.cdp, '[data-command-id="slides.animation.apply"]');
  await session.cdp.waitFor('!!document.querySelector("#vno-anim-apply")', { timeoutMilliseconds: 30000 });
  await selectIndex("#vno-anim-type-select", typeIndex);
  await selectIndex("#vno-anim-duration-select", durationIndex);
  await selectIndex("#vno-anim-delay-select", delayIndex);
  await click(session.cdp, "#vno-anim-apply");
};
try {
  await session.cdp.waitFor(`window.__vnoAppInstance?.adapter?.sourceFilePath === ${JSON.stringify(output)}`, { timeoutMilliseconds: 180000 });
  await session.cdp.waitFor("window.__vnoAppInstance?.adapter?.canvas?.slides?.length > 0", { timeoutMilliseconds: 180000 });
  console.log(`CDP_PORT ${session.debugPort} | PROFILE ${localAppData} | ROOT ${root}`);

  const firstId = await session.cdp.evaluate(`String(window.__vnoAppInstance.adapter.canvas.slides[0].shapes[0].id)`);
  await click(session.cdp, `[data-shape-id="${firstId}"]`);
  await animateSelected(1, 2, 1);
  await click(session.cdp, "#vno-ribbon-tab-insert");
  await click(session.cdp, '[data-command-id="slides.shape.insert"]');
  const secondId = await session.cdp.evaluate(`String(window.__vnoAppInstance.adapter.canvas.slides[0].shapes.at(-1).id)`);
  await animateSelected(2, 1, 0);
  console.log("ANIMATIONS_BEFORE_ORDER " + await state());
  await click(session.cdp, '[data-command-id="slides.animation.pane"]');
  await session.cdp.waitFor('!!document.querySelector(".vno-animation-pane")', { timeoutMilliseconds: 30000 });
  await screenshot("animation-pane-before-order");
  const paneItems = await session.cdp.evaluate(`JSON.stringify([...document.querySelectorAll(".vno-anim-pane-item")].map(x=>({target:x.dataset.animTarget,label:x.querySelector(".vno-anim-pane-object")?.textContent,type:x.querySelector(".vno-anim-pane-type")?.textContent})))`);
  console.log("ANIMATION_PANE_ITEMS " + paneItems);
  const downButton = await session.cdp.evaluate(`(() => {const item=document.querySelector('.vno-anim-pane-item[data-anim-index="0"]');const b=item?.querySelector('[data-anim-action="down"]');if(!b)return null;const r=b.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  if (downButton) { const {mouseClick}=await import("./actions.mjs"); await mouseClick(session.cdp,downButton.x,downButton.y); }
  console.log("ANIMATIONS_AFTER_ORDER " + await state());
  await screenshot("animation-pane-after-order");
  await click(session.cdp, ".vno-anim-pane-close");

  await click(session.cdp, "#vno-ribbon-tab-transitions");
  await click(session.cdp, '[data-command-id="slides.transition.apply"]');
  await session.cdp.waitFor('!!document.querySelector("#vno-trans-apply-current")', { timeoutMilliseconds: 30000 });
  await selectIndex("#vno-trans-type-select", 2);
  await selectIndex("#vno-trans-duration-select", 2);
  await screenshot("transition-dialog");
  await click(session.cdp, "#vno-trans-apply-current");
  console.log("TRANSITION " + await state());

  await click(session.cdp, "#vno-ribbon-tab-home");
  await click(session.cdp, '[data-command-id="slides.layout.apply"]');
  await session.cdp.waitFor('!!document.querySelector("#vno-layout-apply-current")', { timeoutMilliseconds: 30000 });
  await click(session.cdp, '[data-layout-id="two-content"]');
  await screenshot("layout-dialog");
  await click(session.cdp, "#vno-layout-apply-current");
  console.log("LAYOUT " + await state());

  await click(session.cdp, "#vno-ribbon-tab-design");
  await click(session.cdp, '[data-command-id="slides.master.apply"]');
  await session.cdp.waitFor('!!document.querySelector("#vno-master-apply")', { timeoutMilliseconds: 30000 });
  const themeCard = await session.cdp.evaluate(`(() => {const e=document.querySelector('[data-theme-id="minimal-dark"]');if(!e)return null;const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  if (!themeCard) throw new Error("Modern Charcoal Slide Master theme card not found.");
  const {mouseClick}=await import("./actions.mjs"); await mouseClick(session.cdp,themeCard.x,themeCard.y);
  await screenshot("slide-master-dialog");
  await click(session.cdp, "#vno-master-apply");
  console.log("MASTER " + await state());

  await click(session.cdp, "#vno-ribbon-tab-slideshow");
  await click(session.cdp, '[data-command-id="slides.notes.toggle"]');
  await session.cdp.waitFor('!!document.querySelector("#vno-notes-textarea")', { timeoutMilliseconds: 30000 });
  await click(session.cdp, "#vno-notes-textarea");
  await typeText(session.cdp, "FIX-L6 speaker notes", 20);
  await screenshot("speaker-notes");
  console.log("NOTES " + await state());

  await press(session.cdp, "s", { ctrl: true }, 1200);
  const saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 600000 });
  if (!saved) throw new Error("SlidesAdapter.save() returned false.");
  await session.cdp.waitFor("window.__vnoAppInstance.adapter.isDirty === false", { timeoutMilliseconds: 120000 });
  console.log("SAVED " + JSON.stringify({ saved, output, state: await state() }));
} finally {
  await session.close();
}
