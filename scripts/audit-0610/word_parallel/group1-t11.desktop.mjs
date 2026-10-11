import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click, mouseDrag, press } from "../../../tests/live/cdp/actions.mjs";

const dir = process.env.VNO_CDP_LOCALAPPDATA;
if (!dir) throw new Error("VNO_CDP_LOCALAPPDATA is required.");
const root = process.env.VNO_APP_ROOT || process.cwd();
const template = path.join(dir, "template.docx");
const body = ".vno-writer-body";
const selectedOps = new Set((process.env.OPS || "").split(",").filter(Boolean));
const operations = [
  ["grow", async cdp => { await select(cdp, "p:nth-of-type(2)"); await click(cdp, '[data-command-id="writer.font.grow"]'); }],
  ["shrink", async cdp => { await select(cdp, "p:nth-of-type(2)"); await click(cdp, '[data-command-id="writer.font.shrink"]'); }],
  ["clear-format", async cdp => { await select(cdp, "p:nth-of-type(2)"); await click(cdp, '[data-command-id="writer.text.clearFormat"]'); }],
  ["format-painter", async cdp => { await select(cdp, "p:nth-of-type(2)"); await click(cdp, '[data-command-id="common.edit.formatPainter"]'); await select(cdp, "p:last-of-type"); }],
  ["indent-decrease", async cdp => { await click(cdp, `${body} p:nth-of-type(2)`); await click(cdp, '[data-command-id="writer.para.indentInc"]'); await click(cdp, '[data-command-id="writer.para.indentDec"]'); }],
  ["paragraph-shading", async cdp => { await click(cdp, `${body} p:nth-of-type(2)`); await click(cdp, '[data-command-id="writer.para.shading"]'); }],
  ["paragraph-sort", async cdp => { await select(cdp, "p:first-of-type", "p:last-of-type"); await click(cdp, '[data-command-id="writer.para.sort"]'); }],
  ["formatting-marks", async cdp => { await click(cdp, '[data-command-id="writer.para.showFormattingMarks"]'); }],
  ["paragraph-borders", async cdp => { await click(cdp, `${body} p:nth-of-type(2)`); await click(cdp, '[data-command-id="writer.para.borders"]'); await cdp.evaluate("document.querySelector('[data-command-id=\\\"writer.para.borders\\\"]').focus()"); await press(cdp, "ArrowDown", {}, 150); }],
  ["copy", async cdp => { await select(cdp, "p:nth-of-type(2)"); await click(cdp, '[data-command-id="common.edit.copy"]'); }],
  ["paste", async cdp => { await select(cdp, "p:nth-of-type(2)"); await click(cdp, '[data-command-id="common.edit.copy"]'); await click(cdp, `${body} p:last-of-type`); await press(cdp, "End"); await click(cdp, '[data-command-id="common.edit.paste"]'); }],
  ["cut", async cdp => { await select(cdp, "p:nth-of-type(2)"); await click(cdp, '[data-command-id="common.edit.cut"]'); }],
  ["paste-special-source", async cdp => { await select(cdp, "p:nth-of-type(2)"); await click(cdp, '[data-command-id="common.edit.copy"]'); await click(cdp, `${body} p:last-of-type`); await press(cdp, "End"); await click(cdp, '[data-command-id="writer.edit.pasteSpecial"]'); await click(cdp, ".vno-dialog-box .vno-dialog-ok-btn"); }],
  ["paste-special-text", async cdp => { await select(cdp, "p:nth-of-type(2)"); await click(cdp, '[data-command-id="common.edit.copy"]'); await click(cdp, `${body} p:last-of-type`); await press(cdp, "End"); await click(cdp, '[data-command-id="writer.edit.pasteSpecial"]'); await click(cdp, '.vno-paste-special-dialog input[value="text"]'); await click(cdp, ".vno-dialog-box .vno-dialog-ok-btn"); }],
  ["paste-special", async cdp => { await click(cdp, `${body} p:nth-of-type(2)`); await click(cdp, '[data-command-id="writer.edit.pasteSpecial"]'); }],
];

async function select(cdp, from, to = from) {
  const points = await cdp.evaluate(`(() => {
    const a=document.querySelector(${JSON.stringify(`${body} ${from}`)}),b=document.querySelector(${JSON.stringify(`${body} ${to}`)});if(!a||!b)return null;
    const rects=e=>{const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),out=[];let n;while(n=w.nextNode()){const r=document.createRange();r.selectNodeContents(n);out.push(...[...r.getClientRects()].filter(x=>x.width&&x.height));}return out;};
    const x=rects(a),y=rects(b);if(!x.length||!y.length)return null;return {start:{x:x[0].left+1,y:x[0].top+x[0].height/2},end:{x:y.at(-1).right-1,y:y.at(-1).top+y.at(-1).height/2}};
  })()`);
  if (!points) throw new Error(`Text is not visible for ${from} → ${to}`);
  await mouseDrag(cdp, points.start.x, points.start.y, points.end.x, points.end.y, { steps: 8, settleMs: 200 });
}

const results = [];
for (const [name, act] of operations) {
  if (selectedOps.size && !selectedOps.has(name)) continue;
  const session = await launchApp("writer", { root, filePath: template, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  try {
    await session.cdp.waitFor(`!!document.querySelector('${body} p:nth-of-type(2)')`, { timeoutMilliseconds: 180000 });
    await act(session.cdp);
    await new Promise(resolve => setTimeout(resolve, 300));
    const dialog = await session.cdp.evaluate(`(() => [...document.querySelectorAll('[role=dialog]')].find(x=>x.getClientRects().length)?.innerText||'')()`);
    const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(path.join(dir, `t11_${name}.png`), Buffer.from(shot.result.data, "base64"));
    const file = path.join(dir, `t11_${name}.docx`);
    if (name !== "paste-special") {
      const saved = await session.cdp.evaluate(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(file)},${JSON.stringify(template)})`, { timeoutMilliseconds: 1200000 });
      if (saved?.status !== "ok") throw new Error(`${name}: save failed ${JSON.stringify(saved)}`);
    }
    const state = await session.cdp.evaluate(`(() => {const b=document.querySelector('${body}'),c=document.querySelector('[data-command-id="writer.para.borders"]');return {text:b?.innerText,html:b?.innerHTML,clipboard:window.__vnoAppInstance?.adapter?._clipboardMemory,marks:b?.querySelectorAll('[data-vno-format-mark]').length,borderControl:c?.outerHTML,borderValue:c?.value,dialog:[...document.querySelectorAll('[role=dialog]')].find(x=>x.getClientRects().length)?.innerText||''}})()`);
    results.push({ name, file: name === "paste-special" ? null : file, state, dialog });
    console.log(name, "captured", JSON.stringify({ dialog: dialog.slice(0, 100), text: state.text }));
    if (name === "paste-special") await press(session.cdp, "Escape");
  } finally {
    await session.close();
  }
}
await fs.writeFile(path.join(dir, "t11_group1_app.json"), JSON.stringify(results, null, 2), "utf8");
