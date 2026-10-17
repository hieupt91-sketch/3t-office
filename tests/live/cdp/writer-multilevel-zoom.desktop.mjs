import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { click, mouseWheel, press, typeText, sleep } from "./actions.mjs";
import { launchApp } from "./session.mjs";

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-multilevel-zoom-"));
const docxPath = path.join(profile, "multilevel.docx");
const session = await launchApp("writer", { localAppData: profile });
const { cdp } = session;
const ev = expression => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const checks = [];
const check = (label, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${label}${detail ? ` | ${detail}` : ""}`); };
try {
  await cdp.waitFor("!!window.__vnoAppInstance?.adapter && !!document.querySelector('.vno-writer-body p')");
  await click(cdp, ".vno-writer-body p");
  await press(cdp, "a", { ctrl: true });
  await typeText(cdp, "Van ban kiem tra danh sach");
  await press(cdp, "Enter"); await typeText(cdp, "Khoan kiem tra");
  await press(cdp, "Enter"); await typeText(cdp, "Diem kiem tra");
  await press(cdp, "a", { ctrl: true });
  await click(cdp, '[data-dropdown-id="writer.para.multilevelList"]');
  await click(cdp, '[data-command-id="writer.para.defineMultilevelList"]');
  await cdp.waitFor("!!document.querySelector('.vno-dialog-box #vno-ml-apply')");
  check("Ribbon mở hộp thoại định nghĩa danh sách", await ev("document.querySelectorAll('.vno-dialog-box [role=tab][data-level]').length") === 9);
  await click(cdp, '[data-level="1"]');
  const level2 = await ev("({format:document.querySelector('#vno-ml-format').value,parents:document.querySelector('#vno-ml-parents').checked,suffix:document.querySelector('#vno-ml-suffix').value})");
  check("Hộp thoại đọc được cấu hình cấp 2", level2.format === "decimal" && level2.parents && level2.suffix === "");
  await click(cdp, '[data-level="2"]');
  const level3 = await ev("({format:document.querySelector('#vno-ml-format').value,suffix:document.querySelector('#vno-ml-suffix').value})");
  check("Hộp thoại đọc được cấu hình cấp 3", level3.format === "lowerLetter" && level3.suffix === ")");
  await click(cdp, '[data-level="0"]');
  await click(cdp, "#vno-ml-prefix"); await press(cdp, "a", { ctrl: true }); await typeText(cdp, "Điều ");
  await click(cdp, "#vno-ml-suffix"); await press(cdp, "a", { ctrl: true }); await typeText(cdp, ".");
  const level1 = await ev("({prefix:document.querySelector('#vno-ml-prefix').value,suffix:document.querySelector('#vno-ml-suffix').value})");
  check("Có thể đặt tiền tố Điều và dấu chấm cho cấp 1", level1.prefix === "Điều " && level1.suffix === ".", JSON.stringify(level1));
  await click(cdp, "#vno-ml-apply");
  await sleep(250);
  await click(cdp, ".vno-writer-body li", 1);
  await press(cdp, "Home"); await press(cdp, "Tab");
  await click(cdp, ".vno-writer-body li", 2);
  await press(cdp, "Home"); await press(cdp, "Tab"); await press(cdp, "Tab");
  let dom = await ev(`(() => ({lists:[...document.querySelectorAll('.vno-writer-body ol')].map(x=>({class:x.className,config:!!x.dataset.vnoMultilevelConfig})),items:[...document.querySelectorAll('.vno-writer-body li')].map(x=>x.innerText.trim())}))()`);
  const levels = await ev("[...document.querySelectorAll('.vno-writer-body li')].map(x=>{let n=x,d=1;while(n.parentElement.closest('li')){d++;n=n.parentElement.closest('li')}return {text:x.childNodes[0]?.textContent?.trim(),depth:d}})");
  check("Tab tạo ba cấp lồng nhau sau khi áp dụng cấu hình custom", dom.items.length === 3 && dom.lists.some(x => x.class.includes("vno-ml-custom") && x.config) && levels.map(x=>x.depth).join(",") === "1,2,3", JSON.stringify({ dom, levels }));
  await click(cdp, ".vno-writer-body li", 2); await press(cdp, "Home");
  await click(cdp, '[data-dropdown-id="writer.para.multilevelList"]');
  await click(cdp, '[data-command-id="writer.para.defineMultilevelList"]');
  await cdp.waitFor("!!document.querySelector('#vno-ml-apply')");
  const reopened = await ev("({prefix:document.querySelector('#vno-ml-prefix').value,suffix:document.querySelector('#vno-ml-suffix').value})");
  check("Mở lại từ mục cấp 3 khôi phục cấu hình cấp 1", reopened.prefix === "Điều " && reopened.suffix === ".", JSON.stringify(reopened));
  await click(cdp, ".vno-dialog-close-footer-btn");
  const save = await ev(`(async () => { const a=window.__vnoAppInstance.adapter; a.isDirty=true; return await globalThis.globalUnoBridge.saveRealFileInPlace('writer', a._contentForExport(), ${JSON.stringify(docxPath)}, null); })()`);
  check("Lưu DOCX qua luồng ứng dụng", save?.status === "ok" && fs.existsSync(docxPath), JSON.stringify(save));
  if (save?.status === "ok" && fs.existsSync(docxPath)) {
    const oraclePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "writer-multilevel-word-readonly.ps1");
    const raw = execFileSync("powershell", ["-NoProfile", "-File", oraclePath, "-Path", docxPath], { encoding: "utf8", timeout: 90000 }).trim();
    const oracle = JSON.parse(raw);
    check("Word COM chỉ đọc khớp nhãn Điều 1. / 1.1 / a) và cấp 1/2/3", oracle.listParagraphCount === 3 && oracle.paragraphs.length === 3 &&
      oracle.paragraphs.map(p => p.listString).join("|") === "Điều 1.|1.1|a)" && oracle.paragraphs.map(p => p.level).join(",") === "1,2,3" && oracle.paragraphs.every(p => p.listParagraphCount === 3), JSON.stringify(oracle));
  }

  await click(cdp, "#vno-ribbon-tab-view");
  await click(cdp, '[data-command-id="writer.view.zoomDialog"]');
  await cdp.waitFor("!!document.querySelector('#vno-writer-zoom-value')");
  await click(cdp, "#vno-writer-zoom-value"); await press(cdp, "a", { ctrl: true }); await typeText(cdp, "165"); await click(cdp, "#vno-writer-zoom-apply");
  await sleep(200);
  const zoom = await ev(`({value:window.__vnoAppInstance.shell.zoomLevel,display:document.querySelector('#vno-zoom-text')?.textContent.trim(),transform:document.querySelector('.vno-writer-page')?.style.transform})`);
  check("CDP bàn phím/chuột áp dụng 165% và đồng bộ thanh trạng thái", zoom.value === 165 && zoom.display === "165%" && zoom.transform === "scale(1.65)", JSON.stringify(zoom));
  const point = await ev("(() => {const r=document.querySelector('.vno-writer-viewport').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
  await ev("window.__wheelProbe=[];window.addEventListener('wheel',e=>window.__wheelProbe.push({ctrl:e.ctrlKey,deltaY:e.deltaY,target:e.target?.className}),{capture:true,once:true})");
  await mouseWheel(cdp, point.x, point.y, 0, -120, { ctrl: true });
  const wheelZoom = await ev("({zoom:window.__vnoAppInstance.shell.zoomLevel,display:document.querySelector('#vno-zoom-text')?.textContent.trim(),events:window.__wheelProbe})");
  check("Ctrl+cuộn chuột tăng 10% và cập nhật thanh trạng thái", wheelZoom.zoom === 175 && wheelZoom.display === "175%" && wheelZoom.events?.[0]?.ctrl && wheelZoom.events[0].deltaY < 0, JSON.stringify(wheelZoom));
  await click(cdp, "#vno-zoom-text");
  check("Bấm phần trăm trên thanh trạng thái mở hộp thoại Thu phóng", await ev("!!document.querySelector('#vno-writer-zoom-value')"));
  await click(cdp, '[data-fit="page"]'); await sleep(200);
  const fit = await ev("({display:document.querySelector('#vno-zoom-text')?.textContent.trim(), zoom:window.__vnoAppInstance.shell.zoomLevel})");
  check("Vừa cả trang cập nhật mức thu phóng và thanh trạng thái", Number(fit.zoom) >= 10 && Number(fit.zoom) <= 500 && fit.display === `${fit.zoom}%`, JSON.stringify(fit));
  await click(cdp, "#vno-zoom-text");
  await click(cdp, '[data-fit="width"]'); await sleep(200);
  const width = await ev("({class:document.querySelector('.vno-writer-container')?.className,display:document.querySelector('#vno-zoom-text')?.textContent.trim()})");
  check("Vừa chiều rộng trang chọn chế độ vừa chiều rộng và hiện phần trăm", /vno-writer-page-width/.test(width.class || "") && width.display.endsWith("%"), JSON.stringify(width));
  await click(cdp, '[data-command-id="writer.view.zoomDialog"]');
  await click(cdp, '[data-fit="multiple"]'); await sleep(200);
  const multi = await ev("({class:document.querySelector('.vno-writer-container')?.className,display:document.querySelector('#vno-zoom-text')?.textContent.trim()})");
  check("Nhiều trang chọn chế độ thu phóng trong vùng xem", /vno-writer-multiple-pages/.test(multi.class || "") && multi.display.endsWith("%"), JSON.stringify(multi));
} catch (error) {
  check("Luồng desktop CDP không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close(); }
if (checks.some(value => !value)) process.exit(1);
console.log(`Writer multilevel and zoom desktop CDP: ${checks.length}/${checks.length} PASS`);

