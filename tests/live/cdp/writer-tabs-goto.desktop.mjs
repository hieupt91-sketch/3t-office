import { launchApp } from "./session.mjs";
import { click, press, typeText, sleep } from "./actions.mjs";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass) });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};

const session = await launchApp("writer", {});
const { cdp } = session;
const ev = expression => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });

try {
  await sleep(1200);
  await click(cdp, ".vno-writer-body p");
  await typeText(cdp, "Dòng thứ nhất");
  await press(cdp, "Enter");
  await typeText(cdp, "Dòng thứ hai");
  await press(cdp, "F5");
  await sleep(250);
  check("F5 mở hộp thoại Đi đến trong Writer", await ev("!!document.querySelector('.vno-goto-dialog')"));
  await click(cdp, '#vno-goto-type-list option[value="line"]');
  await click(cdp, "#vno-goto-input");
  await typeText(cdp, "2");
  await press(cdp, "Enter");
  await sleep(150);
  const lineResult = await ev(`(() => { const n=window.getSelection()?.anchorNode; return {paragraph:(n?.nodeType===1?n:n?.parentElement)?.closest?.('p')?.textContent || '', feedback:document.querySelector('#vno-goto-feedback')?.textContent || '', blocks:[...document.querySelectorAll('.vno-writer-body p,.vno-writer-body h1,.vno-writer-body li')].map(x=>x.textContent)}; })()`);
  check("Đi đến Dòng 2 đặt con trỏ vào dòng thứ hai", lineResult.paragraph === "Dòng thứ hai", JSON.stringify(lineResult));
  await click(cdp, "#vno-goto-prev-btn");
  const previousLine = await ev("(() => { const n=window.getSelection()?.anchorNode; return (n?.nodeType===1?n:n?.parentElement)?.closest?.('p')?.textContent || ''; })()");
  check("Trước chuyển con trỏ về dòng trước", previousLine === "Dòng thứ nhất", previousLine);
  await click(cdp, "#vno-goto-next-btn");
  const nextLine = await ev("(() => { const n=window.getSelection()?.anchorNode; return (n?.nodeType===1?n:n?.parentElement)?.closest?.('p')?.textContent || ''; })()");
  check("Tiếp chuyển con trỏ về dòng kế", nextLine === "Dòng thứ hai", nextLine);
  await click(cdp, "#vno-goto-input");
  await press(cdp, "a", { ctrl: true });
  await typeText(cdp, "999");
  await press(cdp, "Enter");
  const missing = await ev("document.querySelector('#vno-goto-feedback')?.textContent || ''");
  check("Dòng không tồn tại hiện thông báo rõ", /không tìm thấy/i.test(missing), missing);
  await press(cdp, "Escape");

  await click(cdp, '.vno-writer-body p');
  await click(cdp, '[data-command="writer.format.paragraphDialog"]');
  await sleep(250);
  check("Launcher Đoạn văn mở hộp thoại định dạng đoạn", await ev("!!document.querySelector('.vno-paragraph-dialog')"));
  await click(cdp, "#vno-para-tabs-btn");
  await sleep(200);
  check("Mục Dừng tab mở dialog có danh sách và căn/leader", await ev("!!document.querySelector('.vno-tab-stops-dialog #vno-tabs-list')"));
  await click(cdp, "#vno-tabs-pos");
  await typeText(cdp, "7");
  await click(cdp, "#vno-tabs-align");
  await press(cdp, "ArrowDown");
  await press(cdp, "Enter");
  await click(cdp, "#vno-tabs-set");
  await click(cdp, "#vno-tabs-pos");
  await typeText(cdp, "14");
  await click(cdp, "#vno-tabs-align");
  await press(cdp, "ArrowDown");
  await press(cdp, "Enter");
  await click(cdp, "#vno-tabs-leader");
  await press(cdp, "ArrowDown");
  await press(cdp, "Enter");
  await click(cdp, "#vno-tabs-set");
  const configured = await ev(`(() => ({items:document.querySelectorAll('#vno-tabs-list option').length, align:document.querySelector('#vno-tabs-align')?.value, leader:document.querySelector('#vno-tabs-leader')?.value}))()`);
  check("Đặt tab giữa 7 cm và tab phải 14 cm có leader chấm", configured.items === 2 && configured.align === "r" && configured.leader === "d", JSON.stringify(configured));
  await click(cdp, ".vno-tab-stops-dialog .vno-dialog-ok-btn");
  const stored = await ev("document.querySelector('.vno-writer-body p')?.dataset?.vnoTabs || ''");
  check("Thiết lập được áp dụng vào đoạn đang chọn", /7:c:n;14:r:d/.test(stored), stored);
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-tabs-"));
  const outputPath = path.join(outputDir, "writer-tabs.docx");
  const save = await ev(`(async () => { const a=window.__vnoAppInstance.adapter; a.isDirty=true; return await globalThis.globalUnoBridge.saveRealFileInPlace('writer', a._contentForExport(), ${JSON.stringify(outputPath)}, null); })()`);
  check("Lưu tài liệu có điểm dừng Tab qua DOCX thật", save?.status === "ok" && fs.existsSync(outputPath), JSON.stringify(save));
  if (save?.status === "ok" && fs.existsSync(outputPath)) {
    const raw = execFileSync("powershell", ["-NoProfile", "-File", path.join(path.dirname(fileURLToPath(import.meta.url)), "writer-tabs-word-readonly.ps1"), "-Path", outputPath], { encoding: "utf8", timeout: 60000 }).trim();
    const oracle = JSON.parse(raw);
    const stops = oracle.Paragraphs?.[0]?.Tabs || [];
    const near = (actual, expected) => Math.abs(actual - expected) < 0.1;
    const center = stops.find(stop => near(stop.PositionPt, 7 * 72 / 2.54) && stop.Alignment === 1 && stop.Leader === 0);
    const rightDot = stops.find(stop => near(stop.PositionPt, 14 * 72 / 2.54) && stop.Alignment === 2 && stop.Leader === 1);
    check("Word COM đọc lại đúng vị trí/căn/leader của 2 tab tùy chỉnh", !!center && !!rightDot, `effective TabStops.Count=${stops.length}; ${JSON.stringify(stops)}`);
  }
} catch (error) {
  check("Luồng CDP không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}

if (checks.some(item => !item.pass)) process.exit(1);
console.log(`Writer tabs and Go To desktop CDP: ${checks.length}/${checks.length} PASS`);
