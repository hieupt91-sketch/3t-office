import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click, press, typeText } from "../../../tests/live/cdp/actions.mjs";

const dir = process.env.VNO_CDP_LOCALAPPDATA;
const root = process.env.VNO_APP_ROOT || process.cwd();
if (!dir) throw new Error("VNO_CDP_LOCALAPPDATA is required.");
const body = ".vno-writer-body";
const file = path.join(dir, "t11_group3_input.docx");
await fs.copyFile(path.join(dir, "template.docx"), file);
const session = await launchApp("writer", { root, filePath: file, localAppData: path.join(dir, "group3_profiles", "writer"), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const cdp = session.cdp;
async function command(id, tab) {
  if (tab) {
    const index = await cdp.evaluate(`([...document.querySelectorAll('.vno-ribbon-tab')].findIndex(x=>new RegExp(${JSON.stringify(tab)},'i').test(x.textContent)))`);
    await click(cdp, ".vno-ribbon-tab", index);
  }
  const selector = `[data-command-id=${JSON.stringify(id)}]`;
  const index = await cdp.evaluate(`([...document.querySelectorAll(${JSON.stringify(selector)})].findIndex(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0}))`);
  if (index < 0) throw new Error(`No visible command ${id}`);
  await click(cdp, selector, index);
}
async function save(name) {
  const target = path.join(dir, `t11_${name}.docx`);
  const saved = await cdp.evaluate(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(target)},${JSON.stringify(file)})`, { timeoutMilliseconds: 1200000 });
  if (saved?.status !== "ok") throw new Error(`${name} save failed: ${JSON.stringify(saved)}`);
  return target;
}
async function shot(name) {
  const img = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(path.join(dir, `t11_${name}.png`), Buffer.from(img.result.data, "base64"));
}
const results = [];
try {
  await cdp.waitFor(`document.querySelector('${body}')?.textContent.includes('Mot doan dau tien')`, { timeoutMilliseconds: 180000 });
  await command("writer.design.themeGallery", "Thiết kế|Design");
  await click(cdp, '.vno-theme-card[data-theme-id="administrative"]');
  await shot("theme"); await click(cdp, ".vno-dialog-box .vno-dialog-ok-btn");
  results.push({ name: "theme", state: await cdp.evaluate(`({theme:document.querySelector('${body}')?.dataset.vnoTheme,font:getComputedStyle(document.querySelector('${body}')).fontFamily,lineHeight:getComputedStyle(document.querySelector('${body}')).lineHeight})`), file: await save("theme") });

  await command("writer.page.watermark", "Thiết kế|Design");
  await fill("#vno-wm-text", "DỰ THẢO T11");
  await click(cdp, ".vno-watermark-dialog .vno-dialog-ok-btn"); await shot("watermark");
  results.push({ name: "watermark", state: await cdp.evaluate(`({text:document.querySelector('.vno-page-watermark')?.innerText,html:document.querySelector('.vno-page-watermark')?.outerHTML})`), file: await save("watermark") });

  await command("writer.page.color", "Thiết kế|Design");
  await click(cdp, '.vno-page-color-swatch[data-page-color="#dbeafe"]');
  await click(cdp, '.vno-page-color-dialog [data-action="apply"]'); await shot("page-color");
  results.push({ name: "page-color", state: await cdp.evaluate(`({color:window.__vnoAppInstance.adapter.pageColor,background:getComputedStyle(document.querySelector('.vno-writer-page')).backgroundColor})`), file: await save("page-color") });

  await command("writer.page.border", "Thiết kế|Design");
  await choose("#vno-border-style", "dashed"); await choose("#vno-border-width", "3"); await choose("#vno-border-color", "#dc2626");
  await click(cdp, ".vno-page-border-dialog .vno-dialog-ok-btn"); await shot("page-border");
  results.push({ name: "page-border", state: await cdp.evaluate(`({border:window.__vnoAppInstance.adapter.pageBorder,html:document.querySelector('.vno-page-border-frame')?.outerHTML})`), file: await save("page-border") });

  await click(cdp, ".vno-ribbon-tab", await tabIndex("Bố cục|Layout"));
  await click(cdp, `${body} p:nth-of-type(2)`);
  await click(cdp, ".vno-ribbon-tab", await tabIndex("Bố cục|Layout"));
  const lineIndex = await cdp.evaluate(`([...document.querySelectorAll('select[data-command-id="writer.layout.lineNumbers"]')].findIndex(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0}))`);
  const lineSelector = 'select[data-command-id="writer.layout.lineNumbers"]';
  await choose(lineSelector, "restartPage", true);
  const lineValue = await cdp.evaluate(`document.querySelectorAll(${JSON.stringify(lineSelector)})[${lineIndex}]?.value`);
  if (lineValue !== "restartPage") throw new Error(`Line number selection mismatch: ${lineValue}`);
  await shot("line-numbers");
  results.push({ name: "line-numbers", state: await cdp.evaluate(`({config:window.__vnoAppInstance.adapter.lineNumbers,indicator:document.querySelector('.vno-line-numbers-indicator')?.innerText})`), file: await save("line-numbers") });

  await click(cdp, ".vno-ribbon-tab", await tabIndex("Bố cục|Layout"));
  await choose('select[data-command-id="writer.para.firstLineIndent"]', "36"); await shot("first-line-indent");
  results.push({ name: "first-line-indent", state: await cdp.evaluate(`({paragraph:document.querySelector('${body} p:nth-of-type(2)')?.getAttribute('style'),textIndent:getComputedStyle(document.querySelector('${body} p:nth-of-type(2)')).textIndent})`), file: await save("first-line-indent") });

  await command("writer.file.printPreview", "Bố cục|Layout");
  await cdp.waitFor("!!document.querySelector('.vno-print-dialog-overlay')", { timeoutMilliseconds: 20000 });
  await cdp.waitFor("document.querySelector('.vno-print-dialog-status')?.textContent && !/đang tạo|preparing/i.test(document.querySelector('.vno-print-dialog-status').textContent)", { timeoutMilliseconds: 120000 });
  await shot("print-preview");
  results.push({ name: "print-preview", state: await cdp.evaluate(`(() => {const x=document.querySelector('.vno-print-dialog-overlay');return {text:x?.innerText,pages:x?.querySelector('.vno-print-total')?.textContent,current:x?.querySelector('.vno-print-preview-page')?.value,paper:x?.querySelector('.vno-print-page-setup')?.textContent,status:x?.querySelector('.vno-print-dialog-status')?.textContent}})()`), file: null });
  await click(cdp, ".vno-print-close");
  await fs.writeFile(path.join(dir, "t11_group3_app.json"), JSON.stringify(results, null, 2), "utf8");
  for (const row of results) console.log(row.name, JSON.stringify(row.state));
} finally { await session.close(); }

async function fill(selector, value) {
  await click(cdp, selector); await press(cdp, "A", { ctrl: true }); await typeText(cdp, value, 10);
}
async function choose(selector, value, keyboardOnly = false) {
  const visibleIndex = await cdp.evaluate(`([...document.querySelectorAll(${JSON.stringify(selector)})].findIndex(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0}))`);
  const index = await cdp.evaluate(`(() => {const x=[...document.querySelectorAll(${JSON.stringify(selector)})].filter(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0})[${visibleIndex}];return x?[...x.options].findIndex(o=>o.value===${JSON.stringify(value)}):-1})()`);
  if (index < 0) throw new Error(`Option ${value} missing from ${selector}`);
  if (keyboardOnly) {
    await cdp.evaluate(`(() => {const node=[...document.querySelectorAll(${JSON.stringify(selector)})].filter(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0})[0];if(!node)return false;node.focus();node.value=${JSON.stringify(value)};node.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
    return;
  }
  if (!keyboardOnly) await click(cdp, selector, visibleIndex);
  await cdp.evaluate(`document.querySelectorAll(${JSON.stringify(selector)})[${visibleIndex}]?.focus()`);
  await press(cdp, "Home");
  for (let i=0;i<index;i++) await press(cdp, "ArrowDown");
  await press(cdp, "Enter");
}
async function tabIndex(pattern) {
  return cdp.evaluate(`([...document.querySelectorAll('.vno-ribbon-tab')].findIndex(x=>new RegExp(${JSON.stringify(pattern)},'i').test(x.textContent)))`);
}
