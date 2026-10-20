import { launchApp } from "./session.mjs";
import { click, insertText, press, sleep } from "./actions.mjs";
import fs from "node:fs";
import path from "node:path";

const root = process.env.VNO_CDP_LOCALAPPDATA;
const source = process.env.Q17_SOURCE_DOCX;
if (!root || !source) throw new Error("Set fresh VNO_CDP_LOCALAPPDATA and Q17_SOURCE_DOCX.");
const output = path.join(root, "q17-section-layout.docx");
const shots = path.join(root, "screenshots");
fs.mkdirSync(shots, { recursive: true });
const results = [];
const check = (name, ok, detail = "") => { results.push(Boolean(ok)); console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
let session = await launchApp("writer", { filePath: source, localAppData: path.join(root, "create"), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  const expectedPath = source.replace(/\\/g, "/").toLowerCase();
  await cdp.waitFor(`(() => {const a=window.__vnoAppInstance?.adapter;return String(a?._sourcePath||a?.sourceFilePath||'').replace(/\\\\/g,'/').toLowerCase()===${JSON.stringify(expectedPath)}})()`, { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await click(cdp, ".vno-writer-body");
  await press(cdp, "End", { ctrl: true });
  await press(cdp, "Enter");
  await insertText(cdp, "HÌNH ẢNH VÀ BỐ CỤC PHÂN ĐOẠN");
  await press(cdp, "Enter");
  await click(cdp, "#vno-ribbon-tab-layout");
  await click(cdp, '[data-dropdown-id="writer.layout.breaks"]');
  await click(cdp, '[data-command-id="writer.section.nextPage"]');
  await press(cdp, "End", { ctrl: true });
  await press(cdp, "Enter");
  await insertText(cdp, "Nội dung riêng của mục ngang sau ngắt mục.");
  await click(cdp, '[data-dropdown-id="writer.layout.sectionOptions"]');
  await click(cdp, '[data-command-id="writer.section.options"]');
  await click(cdp, "#vno-hf-diff-first");
  await click(cdp, "#vno-hf-diff-oddeven");
  await click(cdp, ".vno-dialog-ok-btn");
  await click(cdp, '[data-command-id="writer.page.orientation"]');
  await cdp.waitFor("document.querySelector('#vno-pagesetup-orientation')", { timeoutMilliseconds: 15000 });
  await click(cdp, "#vno-pagesetup-orientation");
  await press(cdp, "ArrowDown");
  await press(cdp, "Enter");
  const orientationValue = await cdp.evaluate("document.querySelector('#vno-pagesetup-orientation')?.value");
  await click(cdp, ".vno-dialog-ok-btn");
  const sectionState = await cdp.evaluate(`(() => {const a=window.__vnoAppInstance.adapter;return{sectionHeadersFooters:a.sectionHeadersFooters,body:document.querySelector('.vno-writer-body')?.innerText.slice(-100)}})()`);
  check("Chèn ngắt mục, bật trang đầu/chẵn-lẻ và đặt hướng ngang", orientationValue === "landscape" && Object.values(sectionState.sectionHeadersFooters||{}).some(x=>x.differentFirstPage&&x.differentOddEven), JSON.stringify({ ...sectionState, orientationValue }));
  const html = await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
  const saved = await cdp.evaluate(`window.pywebview.api.save_document_in_place(${JSON.stringify(html)}, 'writer', ${JSON.stringify(output)}, ${JSON.stringify(source)})`, { awaitPromise: true, timeoutMilliseconds: 240000 });
  check("Lưu nhóm bố cục DOCX bằng đường dẫn thật", saved?.status === "ok", JSON.stringify(saved));
} catch (error) { check("Nhóm bố cục không phát sinh ngoại lệ CDP", false, error.stack || error.message); }
finally { await session.close(); }
if (fs.existsSync(output)) {
  session = await launchApp("writer", { filePath: output, localAppData: path.join(root, "reopen"), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  try {
    const expectedPath = output.replace(/\\/g, "/").toLowerCase();
    await session.cdp.waitFor(`(() => {const a=window.__vnoAppInstance?.adapter;return String(a?._sourcePath||a?.sourceFilePath||'').replace(/\\\\/g,'/').toLowerCase()===${JSON.stringify(expectedPath)}})()`, { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
    const state = await session.cdp.evaluate(`(() => ({sections:window.__vnoAppInstance.adapter.sectionHeadersFooters,body:document.querySelector('.vno-writer-body')?.innerText.slice(-250)}))()`);
    check("Mở lại phiên mới giữ ngắt mục và tùy chọn đầu/cuối trang", Object.values(state.sections||{}).some(x=>x.differentFirstPage&&x.differentOddEven), JSON.stringify(state));
  } catch (error) { check("Mở lại nhóm bố cục", false, error.stack || error.message); }
  finally { await session.close(); }
}
console.log(`SECTION_DOCX ${output}`);
console.log(`SUMMARY ${results.filter(Boolean).length}/${results.length} PASS | ${results.length-results.filter(Boolean).length} FAIL`);
if (results.some(x => !x)) process.exitCode = 1;
