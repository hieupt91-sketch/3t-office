import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click, typeText } from "../../../tests/live/cdp/actions.mjs";

const dir = process.env.VNO_CDP_LOCALAPPDATA;
const root = process.env.VNO_APP_ROOT || process.cwd();
if (!dir) throw new Error("VNO_CDP_LOCALAPPDATA is required.");
const input = path.join(dir, "t11_group4_input.docx");
await fs.copyFile(path.join(dir, "template.docx"), input);
const session = await launchApp("writer", { root, filePath: input, localAppData: path.join(dir, "group4_profiles", "writer"), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const cdp = session.cdp;
try {
  await cdp.waitFor("!!document.querySelector('.vno-writer-body p')", { timeoutMilliseconds: 180000 });
  const refTab = await cdp.evaluate("[...document.querySelectorAll('.vno-ribbon-tab')].findIndex(x=>/Tham chiếu|References/i.test(x.textContent))");
  await click(cdp, ".vno-ribbon-tab", refTab);
  await click(cdp, 'button[data-command-id="writer.reference.sourcesManage"]');
  await click(cdp, ".vno-source-manager-dialog .vno-add-source, .vno-dialog-overlay .vno-add-source");
  for (const [name, value] of [["author", "Nguyễn An"], ["title", "Nghiên cứu T11"], ["year", "2024"], ["publisher", "Nhà xuất bản Mẫu"], ["url", "https://example.test/t11"]]) {
    const selector = `.vno-dialog-overlay [name="${name}"]`;
    await click(cdp, selector); await cdp.evaluate(`document.querySelector(${JSON.stringify(selector)}).value=${JSON.stringify(value)}`);
    await cdp.evaluate(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new Event('input',{bubbles:true}))`);
  }
  await click(cdp, ".vno-dialog-overlay .vno-save-source");
  await click(cdp, ".vno-source-manager-dialog .vno-apply-sources, .vno-dialog-overlay .vno-apply-sources");
  const style = 'select[data-command-id="writer.reference.citationStyle"]';
  await cdp.evaluate(`(() => {const x=[...document.querySelectorAll(${JSON.stringify(style)})].find(e=>{const r=e.getBoundingClientRect();return r.width&&r.height});if(!x)throw Error('Citation style select is hidden');x.value='mla';x.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  await cdp.evaluate(`(() => {const p=[...document.querySelectorAll('.vno-writer-body p')].find(x=>x.textContent.trim());if(!p)throw Error('Template paragraph missing');const r=document.createRange();r.selectNodeContents(p);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r);p.focus()})()`);
  await click(cdp, 'button[data-command-id="writer.reference.citationInsert"]');
  await click(cdp, ".vno-source-select");
  await click(cdp, ".vno-dialog-overlay .vno-insert-citation");
  await click(cdp, 'button[data-command-id="writer.reference.bibliographyInsert"]');
  const state = await cdp.evaluate(`(() => {const a=window.__vnoAppInstance.adapter,b=document.querySelector('.vno-writer-body');return {style:a.citationStyle,sources:a.citationSources,html:b.innerHTML,citations:[...b.querySelectorAll('.vno-citation-field')].map(x=>x.textContent),bibliography:b.querySelector('.vno-bibliography')?.innerText}})()`);
  const output = path.join(dir, "t11_group4_references.docx");
  const saved = await cdp.evaluate(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(output)},${JSON.stringify(input)})`, { timeoutMilliseconds: 1200000 });
  if (saved?.status !== "ok") throw new Error(`save failed: ${JSON.stringify(saved)}`);
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(path.join(dir, "t11_group4_references.png"), Buffer.from(shot.result.data, "base64"));
  await fs.writeFile(path.join(dir, "t11_group4_app.json"), JSON.stringify({ state, output }, null, 2), "utf8");
  console.log(JSON.stringify({ style: state.style, sources: state.sources.length, citations: state.citations, bibliography: state.bibliography, saved: saved.status, output }));
} finally { await session.close(); }
