import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp } from "./session.mjs";
import { click, mouseDoubleClick, press } from "./actions.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!root || !localAppData) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const template = path.join(localAppData, "template.pptx");
const screenshotDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../docs/tickets-0710/evidence/fix-l14");
const operations = [
  ["italic", "slides.text.italic"],
  ["underline", "slides.text.underline"],
  ["strike", "slides.text.strike"],
  ["clearFormat", "slides.text.clearFormat", "clear"],
  ["colorDefault", "slides.color.text"],
  ["colorHighlight", "slides.color.highlight"],
  ["alignLeft", "slides.para.alignLeft"],
  ["alignRight", "slides.para.alignRight"],
  ["alignJustify", "slides.para.justify"],
  ["bullet", "slides.list.bullet"],
  ["numbered", "slides.list.numbered"],
  ["indentDec", "slides.para.indentDec"],
  ["indentInc", "slides.para.indentInc"],
  ["lineSpacing", "slides.para.lineSpacing", "select"],
];
const selectedOperations = (process.env.VNO_FIX_L14_TEXT_OPS || "").split(",").filter(Boolean);

await fs.mkdir(screenshotDir, { recursive: true });
for (const [name, commandId, mode] of operations.filter(([name]) => !selectedOperations.length || selectedOperations.includes(name))) {
  const output = path.join(localAppData, `fix-l14-${name}.pptx`);
  await fs.copyFile(template, output);
  const session = await launchApp("slides", { root, filePath: output, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  try {
    const norm = output.replace(/\\/g, "/").toLowerCase();
    await session.cdp.waitFor(`(() => {const a=window.__vnoAppInstance?.adapter,p=String(a?._sourcePath||a?.sourceFilePath||"").replace(/\\\\/g,"/").toLowerCase();return p===${JSON.stringify(norm)}&&a?.canvas?.slides?.[0]?.shapes?.some(s=>String(s.text||"").includes("FIX-L4 audit sample text"));})()`, { timeoutMilliseconds: 300000, intervalMilliseconds: 500 });
    const target = await session.cdp.evaluate(`(() => {const s=window.__vnoAppInstance.adapter.canvas.slides[0].shapes.find(x=>String(x.text||"").includes("FIX-L4 audit sample text"));const e=document.querySelector('[data-shape-id="'+CSS.escape(String(s.id))+'"]');if(!e)return null;const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,id:String(s.id)}})()`);
    if (!target) throw new Error("Text fixture did not render on the slide canvas.");
    await mouseDoubleClick(session.cdp, target.x, target.y);
    await press(session.cdp, "a", { ctrl: true }, 120);
    if (mode === "clear") await click(session.cdp, '[data-command-id="slides.text.bold"]');
    if (mode === "select") {
      const control = `select[data-command-id="${commandId}"]`;
      await click(session.cdp, control);
      await press(session.cdp, "Home", {}, 50);
      await press(session.cdp, "ArrowDown", {}, 50);
      await press(session.cdp, "Enter", {}, 80);
    } else {
      await click(session.cdp, `[data-command-id="${commandId}"]`);
    }
    const state = await session.cdp.evaluate(`(() => {const a=window.__vnoAppInstance.adapter,c=a.canvas,s=c.slides[c.currentSlideIndex],sh=s.shapes.find(x=>String(x.text||"").includes("FIX-L4 audit sample text"));return {command:${JSON.stringify(commandId)},text:sh.text,textHtml:sh.textHtml||"",fontWeight:sh.fontWeight||sh.bold||null,fontStyle:sh.fontStyle||null,underline:sh.underline||null,strike:sh.strike||null,align:sh.textAlign||null,bullet:sh.bullet||null,indent:sh.indentLevel||sh.indent||null,lineSpacing:document.querySelector('select[data-command-id="slides.para.lineSpacing"]')?.value||null,selected:c.selectedShapeIds?.size||0};})()`);
    const fodp = await session.cdp.evaluate("window.__vnoAppInstance.adapter.serializeToFodp()");
    await fs.writeFile(path.join(localAppData, `fix-l14-${name}.fodp`), fodp, "utf8");
    const saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 600000 });
    if (saved !== true) throw new Error(`SlidesAdapter.save() did not succeed for ${name}: ${saved}`);
    await session.cdp.waitFor("window.__vnoAppInstance.adapter.isDirty === false", { timeoutMilliseconds: 120000, intervalMilliseconds: 250 });
    const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(path.join(screenshotDir, `${name}.png`), Buffer.from(shot.result.data, "base64"));
    console.log(`${name} | saved=${saved} | ${JSON.stringify(state)} | ${output}`);
  } finally {
    await session.close();
  }
}
