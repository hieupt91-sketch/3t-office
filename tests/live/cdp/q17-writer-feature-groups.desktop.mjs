import { launchApp } from "./session.mjs";
import { click, insertText, press, mouseClick, mouseDrag, sleep } from "./actions.mjs";
import fs from "node:fs";
import path from "node:path";

const root = process.env.VNO_CDP_LOCALAPPDATA;
const source = process.env.Q17_SOURCE_DOCX;
if (!root || !source) throw new Error("Set fresh VNO_CDP_LOCALAPPDATA and Q17_SOURCE_DOCX.");
const output = path.join(root, "q17-feature-groups.docx");
const shots = path.join(root, "screenshots");
fs.mkdirSync(shots, { recursive: true });
const results = [];
const check = (name, ok, detail = "") => {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const save = async cdp => {
  const html = await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
  return cdp.evaluate(`window.pywebview.api.save_document_in_place(${JSON.stringify(html)}, 'writer', ${JSON.stringify(output)}, ${JSON.stringify(source)})`, { awaitPromise: true, timeoutMilliseconds: 240000 });
};
const shot = async (cdp, name) => {
  const r = await cdp.send("Page.captureScreenshot", { format: "png" }, 30000);
  fs.writeFileSync(path.join(shots, `${name}.png`), Buffer.from((r.result || r).data, "base64"));
};
const checkState = async (cdp, label, expr) => check(label, await cdp.evaluate(expr));

let session = await launchApp("writer", { filePath: source, localAppData: path.join(root, "group1"), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  await cdp.waitFor("document.querySelector('.vno-writer-body h1')", { timeoutMilliseconds: 30000 });
  await click(cdp, ".vno-writer-body");
  await press(cdp, "End", { ctrl: true });
  await press(cdp, "Enter");
  await press(cdp, "3", { ctrl: true, alt: true });
  await insertText(cdp, "7.1 Đánh giá chi tiết");
  await press(cdp, "Enter");
  await insertText(cdp, "Phân tích theo từng nhóm chỉ số và nguồn xác nhận.");
  await press(cdp, "Enter");
  await insertText(cdp, "Mục chính Q19");
  await press(cdp, "Enter");
  await insertText(cdp, "Mục cấp hai Q19");
  await press(cdp, "Enter");
  await insertText(cdp, "Mục cấp ba Q19");
  await press(cdp, "Enter");
  await press(cdp, "Enter");
  const listApplied = await cdp.evaluate(`(() => {
    const adapter = window.__vnoAppInstance.adapter;
    const body = document.querySelector('.vno-writer-body');
    const blocks = [...body.querySelectorAll('p')].filter(p => /^Mục (chính|cấp hai|cấp ba) Q19$/.test(p.textContent.trim()));
    if (blocks.length !== 3 || !adapter.applyMultilevelList('decimal', blocks)) return false;
    const items = [...body.querySelectorAll('li')].filter(li => /Mục (chính|cấp hai|cấp ba) Q19/.test(li.textContent));
    if (items.length !== 3) return false;
    adapter._changeListItemLevelDom(items[1], 1, body);
    const third = [...body.querySelectorAll('li')].find(li => /Mục cấp ba Q19/.test(li.textContent));
    adapter._changeListItemLevelDom(third, 1, body);
    adapter._changeListItemLevelDom(third, 1, body);
    return [...body.querySelectorAll('ol.vno-ml-decimal')].length >= 3;
  })()`);
  const listExport = await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
  check("Gán danh sách ba cấp qua lệnh Writer và xuất đủ cấu trúc", listApplied && listExport.includes("Mục chính Q19") && listExport.includes("Mục cấp hai Q19") && listExport.includes("Mục cấp ba Q19"), JSON.stringify({ listApplied, listExport: listExport.slice(Math.max(0, listExport.indexOf("Mục chính Q19") - 250), listExport.indexOf("Mục chính Q19") + 500) }));
  await click(cdp, "#vno-ribbon-tab-insert");
  await click(cdp, '[data-command-id="writer.table.insert"]');
  await click(cdp, '[aria-label="4 cột, 5 hàng"]');
  await sleep(400);
  const tableBox = await cdp.evaluate(`(() => {const t=document.querySelector('.vno-writer-body table:last-of-type');const r=t?.rows[0]?.cells[0]?.getBoundingClientRect();return r&&{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  if (tableBox) {
    await mouseClick(cdp, tableBox.x, tableBox.y);
    for (let i = 1; i <= 20; i++) {
      await insertText(cdp, i <= 4 ? ["Chỉ số", "Đơn vị", "Kế hoạch", "Thực tế"][i-1] : `Mục ${i-4}`);
      if (i < 20) await press(cdp, "Tab", {}, 70);
    }
  }
  await click(cdp, "#vno-ribbon-tab-tableDesign");
  await click(cdp, '[data-command-id="writer.table.toggleHeaderRow"]');
  await sleep(300);
  const rowRects = await cdp.evaluate(`(() => {const r=document.querySelector('.vno-writer-body table:last-of-type')?.rows[0];if(!r)return null;return [...r.cells].map(c=>{const x=c.getBoundingClientRect();return{x:x.left+x.width/2,y:x.top+x.height/2}})})()`);
  if (rowRects?.length >= 2) {
    await mouseDrag(cdp, rowRects[0].x, rowRects[0].y, rowRects[1].x, rowRects[1].y);
    await click(cdp, "#vno-ribbon-tab-tableLayout");
    await click(cdp, '[data-command-id="writer.table.mergeCells"]');
  }
  const table = await cdp.evaluate(`(() => {const t=document.querySelector('.vno-writer-body table:last-of-type');return t&&{rows:t.rows.length,cells:[...t.rows].map(r=>r.cells.length),span:t.rows[0]?.cells[0]?.colSpan||1,header:t.classList.contains('vno-table-header-row')}})()`);
  check("Bảng 5×4 và gộp hai ô đầu hàng", table?.rows === 5 && table.cells[0] === 3 && table.span === 2, JSON.stringify(table));
  await shot(cdp, "02-bang-5x4-gop-tieu-de");
  await click(cdp, ".vno-writer-body table:last-of-type td");
  await click(cdp, "#vno-ribbon-tab-references");
  await click(cdp, '[data-command-id="writer.reference.captionInsert"]');
  await sleep(300);
  const captionDialog = await cdp.evaluate(`!!document.querySelector('[role=dialog]')`);
  if (captionDialog) {
    const input = await cdp.evaluate(`!!document.querySelector('.vno-caption-text-input')`);
    if (input) { await click(cdp, '.vno-caption-text-input'); await press(cdp, "a", { ctrl: true }, 50); await insertText(cdp, "Bảng tổng hợp chỉ số"); }
    await press(cdp, "Enter");
  }
  await click(cdp, '[data-command-id="writer.reference.footnoteInsert"]');
  await insertText(cdp, "Nguồn: biên bản tổng hợp quý III.");
  await click(cdp, ".vno-writer-body");
  await press(cdp, "End", { ctrl: true });
  await click(cdp, '[data-command-id="writer.reference.endnoteInsert"]');
  await insertText(cdp, "Phụ chú: số liệu đã được xác nhận.");
  const noteState = await cdp.evaluate(`(() => {const b=document.querySelector('.vno-writer-body');return{footnotes:b.querySelectorAll('[data-vno-footnote],.vno-footnote').length,endnotes:b.querySelectorAll('[data-vno-endnote],.vno-endnote').length,captions:b.querySelectorAll('figcaption,.vno-caption').length,text:b.innerText.slice(-500)}})()`);
  check("Chèn chú thích bảng, cuối trang và cuối tài liệu", noteState.captions > 0 && noteState.text.includes("Nguồn: biên bản") && noteState.text.includes("Phụ chú: số liệu"), JSON.stringify(noteState));
  await shot(cdp, "03-chu-thich-va-ghi-chu");
  const saved = await save(cdp);
  check("Lưu nhóm 1 DOCX bằng đường dẫn thật", saved?.status === "ok", JSON.stringify(saved));
} catch (error) { check("Nhóm 1 không phát sinh ngoại lệ CDP", false, error.stack || error.message); }
finally { await session.close(); }

if (fs.existsSync(output)) {
  session = await launchApp("writer", { filePath: output, localAppData: path.join(root, "group1-reopen"), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  try {
    const expectedPath = output.replace(/\\/g, "/").toLowerCase();
    await session.cdp.waitFor(`(() => { const a=window.__vnoAppInstance?.adapter; const p=String(a?._sourcePath||a?.sourceFilePath||'').replace(/\\\\/g,'/').toLowerCase(); return p===${JSON.stringify(expectedPath)}; })()`, { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
    const state = await session.cdp.evaluate(`(() => {const b=document.querySelector('.vno-writer-body');const t=b.querySelector('table');return{headings:b.querySelectorAll('h1,h2,h3').length,rows:t?.rows.length||0,span:t?.rows[0]?.cells[0]?.colSpan||1,text:b.innerText}})()`);
    check("Mở lại phiên mới nhóm 1 giữ đề mục và bảng", state.headings >= 13 && state.rows === 5 && state.span === 2, JSON.stringify({ headings: state.headings, rows: state.rows, span: state.span }));
  } catch (error) { check("Mở lại nhóm 1", false, error.stack || error.message); }
  finally { await session.close(); }
}
console.log(`GROUP1_DOCX ${output}`);
console.log(`SUMMARY ${results.filter(Boolean).length}/${results.length} PASS | ${results.length-results.filter(Boolean).length} FAIL`);
if (results.some(x => !x)) process.exitCode = 1;
