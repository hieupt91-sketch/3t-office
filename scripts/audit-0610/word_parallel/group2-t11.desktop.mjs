import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click, mouseDrag, press, typeText } from "../../../tests/live/cdp/actions.mjs";

const dir = process.env.VNO_CDP_LOCALAPPDATA;
const root = process.env.VNO_APP_ROOT || process.cwd();
if (!dir) throw new Error("VNO_CDP_LOCALAPPDATA is required.");
const template = path.join(dir, "template.docx");
const body = ".vno-writer-body";
const operations = [
  ["blank-page", async cdp => { await click(cdp, `${body} p`); await press(cdp, "End"); await clickVisible(cdp, '[data-command-id="writer.page.blank"]'); }],
  ["text-to-table", async cdp => {
    const points = await rangePoints(cdp, `${body} p:first-of-type`, `${body} p:nth-of-type(2)`);
    if (!points) throw new Error("Could not locate two source paragraphs for text-to-table: " + await cdp.evaluate(`document.querySelector('${body}')?.innerHTML`));
    await mouseDrag(cdp, points.x1, points.y1, points.x2, points.y2, { steps: 8 });
    await clickVisible(cdp, '[data-command-id="writer.table.fromText"]');
    await click(cdp, "#vno-t2t-delim"); await press(cdp, "Home"); for (let i=0;i<3;i++) await press(cdp, "ArrowDown"); await press(cdp, "Enter"); await click(cdp, ".vno-dialog-box .vno-dialog-ok-btn");
  }],
  ["hyperlink", async cdp => {
    const points = await rangePoints(cdp, `${body} p:first-of-type`, `${body} p:first-of-type`);
    if (!points) throw new Error("Could not locate paragraph for hyperlink selection.");
    await mouseDrag(cdp, points.x1, points.y1, points.x2, points.y2, { steps: 6 });
    await clickVisible(cdp, '[data-command-id="common.edit.hyperlink"]');
    await fill(cdp, 'input[id^="vno-hyperlink-url-"]', "https://example.org/report");
    await click(cdp, ".vno-dialog-box .vno-dialog-ok-btn");
  }],
  ["bookmark", async cdp => { await click(cdp, `${body} p`); await clickVisible(cdp, '[data-command-id="writer.insert.bookmark"]'); await fill(cdp, "#vno-bookmark-input", "SectionStart"); await click(cdp, ".vno-dialog-box .vno-dialog-ok-btn"); }],
  ["drop-cap", async cdp => { await click(cdp, `${body} p`); await clickVisible(cdp, '[data-command-id="writer.format.dropCap"]'); }],
  ["date-time", async cdp => { await click(cdp, `${body} p`); await clickVisible(cdp, '[data-command-id="writer.insert.dateTime"]'); await click(cdp, '.vno-datetime-preset[data-datetime-format="yyyy-MM-dd"]'); await click(cdp, ".vno-dialog-box .vno-dialog-ok-btn"); }],
  ["equation", async cdp => { await click(cdp, `${body} p`); await clickVisible(cdp, '[data-command-id="writer.insert.equation"]'); await fill(cdp, "#vno-equation-input", "x^2 + y^2 = z^2"); await click(cdp, ".vno-equation-editor .vno-dialog-ok-btn"); }],
  ["chart", async cdp => { await click(cdp, `${body} p`); await clickVisible(cdp, '[data-command-id="writer.chart.insert"]'); await fill(cdp, "#vno-chart-title-input", "Quarterly revenue"); await click(cdp, ".vno-dialog-box .vno-dialog-ok-btn"); }],
  ["diagram", async cdp => { await click(cdp, `${body} p`); await clickVisible(cdp, '[data-command-id="writer.diagram.insert"]'); await click(cdp, '.vno-diagram-card[data-diagram-type="process"]'); await click(cdp, ".vno-dialog-box .vno-dialog-ok-btn"); }],
];
const selectedOps = new Set((process.env.OPS || "").split(",").filter(Boolean));

async function fill(cdp, selector, value) {
  await click(cdp, selector); await press(cdp, "A", { ctrl: true }); await typeText(cdp, value, 10);
}

async function clickVisible(cdp, selector) {
  if (selector.includes("data-command-id")) {
    const insertIndex = await cdp.evaluate("[...document.querySelectorAll('.vno-ribbon-tab')].findIndex(x=>/Chèn|Insert/i.test(x.textContent))");
    await click(cdp, ".vno-ribbon-tab", insertIndex);
  }
  const index = await cdp.evaluate(`([...document.querySelectorAll(${JSON.stringify(selector)})].findIndex(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0}))`);
  if (index < 0) throw new Error(`No visible target for ${selector}`);
  await click(cdp, selector, index);
}

async function rangePoints(cdp, from, to) {
  return cdp.evaluate(`(() => {const a=document.querySelector(${JSON.stringify(from)}),b=document.querySelector(${JSON.stringify(to)});if(!a||!b)return null;const rects=e=>{const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),out=[];let n;while(n=w.nextNode()){const r=document.createRange();r.selectNodeContents(n);out.push(...[...r.getClientRects()].filter(x=>x.width&&x.height));}return out;};const x=rects(a),y=rects(b);if(!x.length||!y.length)return null;return{x1:x[0].left+1,y1:x[0].top+x[0].height/2,x2:y.at(-1).right-1,y2:y.at(-1).top+y.at(-1).height/2}})()`);
}

const results = [];
for (const [name, action] of operations.filter(([name]) => !selectedOps.size || selectedOps.has(name))) {
  const inputFile = path.join(dir, `t11_group2_input_${name}.docx`);
  await fs.copyFile(template, inputFile);
  const session = await launchApp("writer", { root, filePath: inputFile, localAppData: path.join(dir, "group2_profiles", name), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  try {
    const cdp = session.cdp;
    await cdp.waitFor(`!!document.querySelector('${body} p')`, { timeoutMilliseconds: 180000 });
    await cdp.waitFor(`document.querySelector('${body}')?.textContent.includes('Mot doan dau tien')`, { timeoutMilliseconds: 180000 });
    await action(cdp);
    await new Promise(resolve => setTimeout(resolve, 250));
    const state = await cdp.evaluate(`(() => {const b=document.querySelector('${body}');return {text:b?.innerText,html:b?.innerHTML,paragraphs:b?.querySelectorAll('p').length,tables:b?.querySelectorAll('table').length,links:[...b.querySelectorAll('a[href]')].map(a=>({text:a.innerText,href:a.href})),bookmarks:[...b.querySelectorAll('a.vno-bookmark')].map(a=>({id:a.id,name:a.dataset.bookmarkName})),dropCaps:[...b.querySelectorAll('.vno-drop-cap')].map(x=>({text:x.textContent,lines:x.dataset.dropLines})),dateTimes:[...b.querySelectorAll('.vno-datetime')].map(x=>({text:x.textContent,format:x.dataset.datetimeFormat})),equations:[...b.querySelectorAll('math')].map(x=>({text:x.textContent,linear:x.parentElement?.dataset.vnoEquationLinear})),charts:b?.querySelectorAll('[data-vno-chart]').length||0,diagrams:b?.querySelectorAll('[data-vno-diagram]').length||0,dialogs:[...document.querySelectorAll('[role=dialog]')].filter(x=>x.getClientRects().length).map(x=>x.innerText)}})()`);
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(path.join(dir, `t11_${name}.png`), Buffer.from(shot.result.data, "base64"));
    const file = path.join(dir, `t11_${name}.docx`);
    const saved = await cdp.evaluate(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(file)},${JSON.stringify(template)})`, { timeoutMilliseconds: 1200000 });
    if (saved?.status !== "ok") throw new Error(`${name}: save failed ${JSON.stringify(saved)}`);
    results.push({ name, file, state, saved: saved.status });
    console.log(name, saved.status, JSON.stringify({ tables: state.tables, bookmarks: state.bookmarks, dropCaps: state.dropCaps, dateTimes: state.dateTimes, equations: state.equations, charts: state.charts, diagrams: state.diagrams, dialogs: state.dialogs }));
  } finally { await session.close(); }
}
await fs.writeFile(path.join(dir, "t11_group2_app.json"), JSON.stringify(results, null, 2), "utf8");
