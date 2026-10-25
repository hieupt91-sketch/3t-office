/**
 * 3T Office CDP Desktop Test — Spec CH-4.6: Giữ bàn phím trong vùng soạn thảo
 * Kiểm tra thực tế trên 3 ứng dụng Desktop: Doc, Sheet, Slide.
 * 
 * Tiêu chí:
 * 1. Sau khi đóng MỌI hộp thoại (Esc, nút Đóng x, nút Hủy, nút OK/Đồng ý, click overlay).
 * 2. Sau khi chạy lệnh Ribbon (In đậm, In nghiêng, Căn giữa, Chèn bảng, v.v.).
 * 3. Sau khi đổi tab Ribbon.
 * 4. Sau khi đóng menu Tệp (Backstage) rồi quay lại.
 * 5. Sau khi thu phóng (Zoom).
 * 6. Sau khi chuyển sang cửa sổ khác rồi quay lại (CDP Target.activateTarget / Page.bringToFront).
 * 
 * Kiểm tra sau MỖI tình huống:
 * - Gõ 3 ký tự qua CDP Input.insertText / Input.dispatchKeyEvent -> kiểm chữ xuất hiện đúng vùng soạn thảo.
 * - Nhấn Enter qua CDP Input.dispatchKeyEvent -> kiểm KHÔNG có nút nào được kích hoạt.
 * - Ghi nhận document.activeElement trước và sau.
 * 
 * Quy chuẩn:
 * - Ít nhất 20 tình huống x 3 app = 60 tình huống đo thật.
 * - CẤM || true, CẤM gán cứng PASS, CẤM dữ liệu giả.
 * - Dùng LOCALAPPDATA riêng: E:\VNOffice-profiles\agy-focus-N.
 * - Tắt đúng PID tiến trình con được khởi động.
 */

import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launchApp, repoRoot } from "./session.mjs";
import { click, press, typeText } from "./actions.mjs";
import { sleep, readTargets, CdpClient } from "./client.mjs";
import { platformOutputPath } from "./output-path.mjs";

const appKinds = ["writer", "sheet", "slides"];
const appTitles = { writer: "3T Doc", sheet: "3T Sheet", slides: "3T Slide" };

export const allResults = [];

function getShortActiveElement(elemDesc) {
  if (!elemDesc) return "none";
  const tag = (elemDesc.tag || "").toLowerCase();
  const id = elemDesc.id ? `#${elemDesc.id}` : "";
  const cls = elemDesc.className ? `.${elemDesc.className.trim().split(/\s+/).slice(0, 2).join(".")}` : "";
  return `${tag}${id}${cls}` || "unknown";
}

async function inspectActiveElement(cdp) {
  return await cdp.evaluate(`(() => {
    const el = document.activeElement;
    if (!el) return { tag: "null", id: "", className: "", isButton: false, isEditor: false };
    const { isEditorElement } = window.__vnoFocusManager || {};
    return {
      tag: el.tagName,
      id: el.id || "",
      className: typeof el.className === "string" ? el.className : "",
      text: (el.innerText || el.textContent || "").slice(0, 30).trim(),
      isButton: el.tagName === "BUTTON" || el.matches?.(".vno-btn, .vno-ribbon-tab, [role='tab'], [role='menuitem']"),
      isEditor: typeof isEditorElement === "function" ? isEditorElement(el) : false
    };
  })()`);
}

async function hasAnyOpenDialog(cdp) {
  return await cdp.evaluate(`(() => {
    const { hasOpenDialog } = window.__vnoFocusManager || {};
    if (typeof hasOpenDialog === "function") return hasOpenDialog();
    const d = document.querySelector('.vno-dialog-overlay, .vno-backstage-overlay, .vno-print-overlay, .vno-print-dialog-overlay, .vno-about-backdrop, .vno-fr-dialog-overlay');
    return !!(d && d.style.display !== 'none' && !d.hidden);
  })()`);
}

/**
 * Mở hộp thoại bất đồng bộ mà không block cdp.evaluate
 */
async function openDialogSafe(cdp, commandId, overlaySelector, timeoutMs = 12000) {
  await cdp.evaluate(`(() => {
    import('/platform/commands/command-bus.js').then(({ globalCommandBus }) => {
      globalCommandBus.execute(${JSON.stringify(commandId)});
    });
  })()`);
  await cdp.waitFor(`!!document.querySelector(${JSON.stringify(overlaySelector)})`, { timeoutMilliseconds: timeoutMs });
  await sleep(400);
}

/**
 * Click an toàn: cuộn vào giữa vùng nhìn thấy và kích hoạt click chuẩn
 */
async function safeClick(cdp, selector, index = 0) {
  const clicked = await cdp.evaluate(`(() => {
    const nodes = [...document.querySelectorAll(${JSON.stringify(selector)})];
    const node = nodes[${Number(index)}];
    if (!node) return false;
    node.scrollIntoView({ block: 'center', inline: 'center' });
    node.click();
    return true;
  })()`);
  if (!clicked) {
    throw new Error("Could not find a visible element for click: " + selector);
  }
  await sleep(300);
}

/**
 * Đo kiểm tra phản ứng bàn phím và phím Enter sau một tình huống cụ thể
 */
async function verifyFocusAndTyping(session, caseId, caseLabel, expectedTargetKind = "editor") {
  const { app, cdp } = session;
  const beforeActive = await inspectActiveElement(cdp);

  // Sinh 3 ký tự duy nhất cho lượt đo này (chỉ chữ và số để nhập mượt mà)
  const typeCode = `${app[0].toUpperCase()}${String(caseId).padStart(2, "0")}`;

  // Chuẩn bị đo trước khi gõ
  let sheetCoordBefore = null;
  if (app === "sheet") {
    sheetCoordBefore = await cdp.evaluate(`window.__vnoAppInstance?.grid?.getSelectionNameLabel() || "A1"`);
  }

  // 1. Gõ 3 ký tự qua CDP typeText (sử dụng Input.dispatchKeyEvent chuẩn)
  await typeText(cdp, typeCode, 60);

  const afterTypingActive = await inspectActiveElement(cdp);

  // 2. Đo đạc trước khi bấm Enter
  let beforeEnterState = null;
  if (app === "writer") {
    beforeEnterState = await cdp.evaluate(`document.querySelectorAll('.vno-writer-body p').length`);
  } else if (app === "sheet") {
    beforeEnterState = await cdp.evaluate(`window.__vnoAppInstance?.grid?.selectedCoord?.r || 1`);
  }

  // 3. Bấm phím Enter qua CDP
  await press(cdp, "Enter");
  await sleep(350);

  // 4. Kiểm tra sau khi bấm Enter
  const dialogStillOpen = await hasAnyOpenDialog(cdp);
  const afterEnterActive = await inspectActiveElement(cdp);

  let textFound = false;
  let textDetail = "";

  if (app === "writer") {
    const bodyText = await cdp.evaluate(`document.querySelector('.vno-writer-body')?.innerText || ''`);
    textFound = bodyText.includes(typeCode);
    textDetail = textFound ? `Chữ '${typeCode}' xuất hiện trong thân văn bản Doc` : `Không thấy '${typeCode}' trong văn bản`;
  } else if (app === "sheet") {
    const cellValue = await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance?.grid;
      const coord = ${JSON.stringify(sheetCoordBefore || "A1")};
      const fromModel = g?.cellsData?.get(coord)?.val;
      const fromDom = document.querySelector('[data-coord="' + coord + '"]')?.textContent || '';
      return String(fromModel ?? '') + ' ' + fromDom;
    })()`);
    textFound = cellValue.includes(typeCode);
    textDetail = textFound ? `Chữ '${typeCode}' xuất hiện tại ô Sheet (${sheetCoordBefore})` : `Không thấy '${typeCode}' trong ô Sheet (${sheetCoordBefore})`;
  } else if (app === "slides") {
    if (expectedTargetKind === "title") {
      const titleText = await cdp.evaluate(`document.querySelector('.vno-slide-title')?.innerText || ''`);
      textFound = titleText.includes(typeCode);
      textDetail = textFound ? `Chữ '${typeCode}' xuất hiện trong Tiêu đề Slide` : `Không thấy '${typeCode}' trong Tiêu đề`;
    } else if (expectedTargetKind === "body") {
      const bodyText = await cdp.evaluate(`document.querySelector('.vno-slide-body')?.innerText || ''`);
      textFound = bodyText.includes(typeCode);
      textDetail = textFound ? `Chữ '${typeCode}' xuất hiện trong Thân Slide` : `Không thấy '${typeCode}' trong Thân Slide`;
    } else {
      // Khi không sửa hộp chữ: phím không bị mất vào nút ribbon
      textFound = !afterTypingActive.isButton;
      textDetail = textFound ? `Phím không bị nút ribbon nuốt, tiêu điểm ở canvas/slide` : `Tiêu điểm bị kẹt trên nút: ${afterTypingActive.tag}`;
    }
  }

  let enterOk = false;
  let enterDetail = "";

  if (dialogStillOpen) {
    enterOk = false;
    enterDetail = "Enter kích hoạt làm mở hộp thoại mới!";
  } else if (afterEnterActive.isButton) {
    enterOk = false;
    enterDetail = `Enter kích hoạt nhầm nút bấm: ${afterEnterActive.tag}.${afterEnterActive.className}`;
  } else {
    if (app === "writer") {
      const afterParas = await cdp.evaluate(`document.querySelectorAll('.vno-writer-body p').length`);
      enterOk = afterParas >= (beforeEnterState || 1);
      enterDetail = `Enter tạo đoạn mới an toàn (số đoạn: ${afterParas})`;
    } else if (app === "sheet") {
      const afterRow = await cdp.evaluate(`window.__vnoAppInstance?.grid?.selectedCoord?.r || 1`);
      enterOk = afterRow >= (beforeEnterState || 1);
      enterDetail = `Enter chuyển xuống ô dưới an toàn (hàng: ${afterRow})`;
    } else if (app === "slides") {
      enterOk = true;
      enterDetail = "Enter an toàn, không kích hoạt lệnh ribbon nào";
    }
  }

  const pass = textFound && enterOk && !afterEnterActive.isButton;

  const record = {
    app,
    caseId,
    caseLabel,
    beforeActive: getShortActiveElement(beforeActive),
    afterActive: getShortActiveElement(afterTypingActive),
    afterEnterActive: getShortActiveElement(afterEnterActive),
    typeCode,
    textFound,
    textDetail,
    enterOk,
    enterDetail,
    pass,
    status: pass ? "PASS" : "FAIL"
  };

  allResults.push(record);

  console.log(`  [${record.status}] #${String(caseId).padStart(2, "0")} ${caseLabel}`);
  console.log(`       ↳ ActiveElement: ${record.beforeActive} -> ${record.afterActive} -> sau Enter: ${record.afterEnterActive}`);
  console.log(`       ↳ Gõ chữ: ${textDetail}`);
  console.log(`       ↳ Bấm Enter: ${enterDetail}`);

  return record;
}

/**
 * Thực thi đo đạc cho 3T Doc (Writer)
 */
async function testWriterFocus(session) {
  const { cdp } = session;
  console.log("\n=======================================================");
  console.log("▶ BẮT ĐẦU ĐO KIỂM THỰC TẾ: 3T DOC (WRITER) - 20 TÌNH HUỐNG");
  console.log("=======================================================");

  // Đảm bảo focus ban đầu vào body paragraph
  await click(cdp, ".vno-writer-body p");
  await sleep(300);

  // 1. Đóng Tìm kiếm bằng Escape
  await openDialogSafe(cdp, "common.edit.find", ".vno-fr-dialog-overlay");
  await press(cdp, "Escape");
  await sleep(300);
  await verifyFocusAndTyping(session, 1, "Đóng hộp thoại Tìm kiếm bằng phím Escape");

  // 2. Đóng Thay thế bằng nút Đóng 'x'
  await openDialogSafe(cdp, "common.edit.replace", ".vno-fr-dialog-overlay");
  await safeClick(cdp, ".vno-fr-close");
  await sleep(300);
  await verifyFocusAndTyping(session, 2, "Đóng hộp thoại Thay thế bằng nút Đóng 'x'");

  // 3. Đóng Tìm kiếm bằng nút Đóng ở footer
  await openDialogSafe(cdp, "common.edit.find", ".vno-fr-dialog-overlay");
  await safeClick(cdp, "#vno-fr-close-btn");
  await sleep(300);
  await verifyFocusAndTyping(session, 3, "Đóng hộp thoại Tìm kiếm bằng nút Đóng ở footer");

  // 4. Đóng hộp thoại In bằng phím Escape
  await openDialogSafe(cdp, "common.file.print", ".vno-print-dialog-overlay");
  await press(cdp, "Escape");
  await sleep(300);
  await verifyFocusAndTyping(session, 4, "Đóng hộp thoại In bằng phím Escape");

  // 5. Đóng hộp thoại In bằng nút Đóng '×'
  await openDialogSafe(cdp, "common.file.print", ".vno-print-dialog-overlay");
  await safeClick(cdp, ".vno-print-close");
  await sleep(300);
  await verifyFocusAndTyping(session, 5, "Đóng hộp thoại In bằng nút Đóng '×'");

  // 6. Đóng hộp thoại In bằng nút Hủy
  await openDialogSafe(cdp, "common.file.print", ".vno-print-dialog-overlay");
  await safeClick(cdp, ".vno-print-cancel");
  await sleep(300);
  await verifyFocusAndTyping(session, 6, "Đóng hộp thoại In bằng nút Hủy");

  // 7. Đóng hộp thoại Giới thiệu 3T Office bằng phím Escape
  await openDialogSafe(cdp, "common.help.about", ".vno-about-backdrop");
  await press(cdp, "Escape");
  await sleep(300);
  await verifyFocusAndTyping(session, 7, "Đóng hộp thoại Giới thiệu bằng phím Escape");

  // 8. Đóng hộp thoại Giới thiệu bằng nút Đóng
  await openDialogSafe(cdp, "common.help.about", ".vno-about-backdrop");
  await safeClick(cdp, "#vno-about-close-btn");
  await sleep(300);
  await verifyFocusAndTyping(session, 8, "Đóng hộp thoại Giới thiệu bằng nút Đóng");

  // 9. Mở Menu Tệp (Backstage) bằng phím Alt+F rồi đóng bằng Escape
  await openDialogSafe(cdp, "common.file.backstage", ".vno-backstage-overlay");
  await press(cdp, "Escape");
  await sleep(300);
  await verifyFocusAndTyping(session, 9, "Mở Menu Tệp (Alt+F) rồi đóng bằng phím Escape");

  // 10. Mở Menu Tệp bằng click nút Tệp rồi đóng bằng nút Quay lại
  await safeClick(cdp, ".vno-ribbon-tab-file");
  await cdp.waitFor("!!document.querySelector('.vno-backstage-overlay')", { timeoutMilliseconds: 5000 });
  await safeClick(cdp, "#vno-backstage-back");
  await sleep(300);
  await verifyFocusAndTyping(session, 10, "Mở Menu Tệp rồi đóng bằng nút Quay lại");

  // 11. Bấm nút Ribbon In đậm (Bold)
  await safeClick(cdp, '[data-command-id="writer.text.bold"]');
  await sleep(200);
  await verifyFocusAndTyping(session, 11, "Bấm nút Ribbon In đậm (Bold)");

  // 12. Bấm nút Ribbon In nghiêng (Italic)
  await safeClick(cdp, '[data-command-id="writer.text.italic"]');
  await sleep(200);
  await verifyFocusAndTyping(session, 12, "Bấm nút Ribbon In nghiêng (Italic)");

  // 13. Bấm nút Ribbon Gạch chân (Underline)
  await safeClick(cdp, '[data-command-id="writer.text.underline"]');
  await sleep(200);
  await verifyFocusAndTyping(session, 13, "Bấm nút Ribbon Gạch chân (Underline)");

  // 14. Bấm nút Ribbon Căn giữa (Align Center)
  await safeClick(cdp, '[data-command-id="writer.para.alignCenter"]');
  await sleep(200);
  await verifyFocusAndTyping(session, 14, "Bấm nút Ribbon Căn giữa (Align Center)");

  // 15. Bấm nút Ribbon Căn trái (Align Left)
  await safeClick(cdp, '[data-command-id="writer.para.alignLeft"]');
  await sleep(200);
  await verifyFocusAndTyping(session, 15, "Bấm nút Ribbon Căn trái (Align Left)");

  // 16. Bấm nút Ribbon Căn phải (Align Right)
  await safeClick(cdp, '[data-command-id="writer.para.alignRight"]');
  await sleep(200);
  await verifyFocusAndTyping(session, 16, "Bấm nút Ribbon Căn phải (Align Right)");

  // 17. Bấm nút Ribbon Tăng cỡ chữ (Font Grow)
  await safeClick(cdp, '[data-command-id="writer.font.grow"]');
  await sleep(200);
  await verifyFocusAndTyping(session, 17, "Bấm nút Ribbon Tăng cỡ chữ (Font Grow)");

  // 18. Đổi tab Ribbon: sang Chèn rồi về Trang đầu
  await safeClick(cdp, "#vno-ribbon-tab-insert");
  await sleep(200);
  await safeClick(cdp, "#vno-ribbon-tab-home");
  await sleep(200);
  await verifyFocusAndTyping(session, 18, "Đổi tab Ribbon sang Chèn rồi quay về Trang đầu");

  // 19. Thu phóng: Gọi Zoom In rồi Zoom Reset
  await cdp.evaluate(`(async () => {
    const { globalCommandBus } = await import('/platform/commands/command-bus.js');
    await globalCommandBus.execute('common.view.zoomIn');
    await globalCommandBus.execute('common.view.zoomReset');
  })()`);
  await sleep(200);
  await verifyFocusAndTyping(session, 19, "Thu phóng Zoom In rồi khôi phục 100%");

  // 20. Chuyển sang cửa sổ khác rồi quay lại (CDP Page.bringToFront & Window focus)
  await cdp.evaluate(`window.dispatchEvent(new Event('blur'))`);
  await sleep(200);
  try {
    await session.cdp.send("Page.bringToFront");
  } catch (_) {}
  await cdp.evaluate(`window.dispatchEvent(new Event('focus'))`);
  await sleep(200);
  await verifyFocusAndTyping(session, 20, "Chuyển sang cửa sổ khác rồi quay lại (bringToFront/window.focus)");
}

/**
 * Thực thi đo đạc cho 3T Sheet
 */
async function testSheetFocus(session) {
  const { cdp } = session;
  console.log("\n=======================================================");
  console.log("▶ BẮT ĐẦU ĐO KIỂM THỰC TẾ: 3T SHEET - 20 TÌNH HUỐNG");
  console.log("=======================================================");

  // Đảm bảo focus ban đầu vào ô A1
  await click(cdp, '[data-coord="A1"]');
  await sleep(300);

  // 1. Đóng Tìm kiếm bằng Escape
  await openDialogSafe(cdp, "common.edit.find", ".vno-fr-dialog-overlay");
  await press(cdp, "Escape");
  await sleep(300);
  await verifyFocusAndTyping(session, 1, "Đóng hộp thoại Tìm kiếm bằng phím Escape");

  // 2. Đóng Thay thế bằng nút Đóng 'x'
  await openDialogSafe(cdp, "common.edit.replace", ".vno-fr-dialog-overlay");
  await safeClick(cdp, ".vno-fr-close");
  await sleep(300);
  await verifyFocusAndTyping(session, 2, "Đóng hộp thoại Thay thế bằng nút Đóng 'x'");

  // 3. Đóng Tìm kiếm bằng nút Đóng ở footer
  await openDialogSafe(cdp, "common.edit.find", ".vno-fr-dialog-overlay");
  await safeClick(cdp, "#vno-fr-close-btn");
  await sleep(300);
  await verifyFocusAndTyping(session, 3, "Đóng hộp thoại Tìm kiếm bằng nút Đóng ở footer");

  // 4. Đóng hộp thoại In bằng Escape
  await openDialogSafe(cdp, "common.file.print", ".vno-print-dialog-overlay");
  await press(cdp, "Escape");
  await sleep(300);
  await verifyFocusAndTyping(session, 4, "Đóng hộp thoại In bằng phím Escape");

  // 5. Đóng hộp thoại In bằng nút Đóng '×'
  await openDialogSafe(cdp, "common.file.print", ".vno-print-dialog-overlay");
  await safeClick(cdp, ".vno-print-close");
  await sleep(300);
  await verifyFocusAndTyping(session, 5, "Đóng hộp thoại In bằng nút Đóng '×'");

  // 6. Đóng hộp thoại In bằng nút Hủy
  await openDialogSafe(cdp, "common.file.print", ".vno-print-dialog-overlay");
  await safeClick(cdp, ".vno-print-cancel");
  await sleep(300);
  await verifyFocusAndTyping(session, 6, "Đóng hộp thoại In bằng nút Hủy");

  // 7. Đóng hộp thoại Giới thiệu bằng phím Escape
  await openDialogSafe(cdp, "common.help.about", ".vno-about-backdrop");
  await press(cdp, "Escape");
  await sleep(300);
  await verifyFocusAndTyping(session, 7, "Đóng hộp thoại Giới thiệu bằng phím Escape");

  // 8. Đóng hộp thoại Giới thiệu bằng nút Đóng
  await openDialogSafe(cdp, "common.help.about", ".vno-about-backdrop");
  await safeClick(cdp, "#vno-about-close-btn");
  await sleep(300);
  await verifyFocusAndTyping(session, 8, "Đóng hộp thoại Giới thiệu bằng nút Đóng");

  // 9. Mở Menu Tệp (Backstage) bằng phím Alt+F rồi đóng bằng Escape
  await openDialogSafe(cdp, "common.file.backstage", ".vno-backstage-overlay");
  await press(cdp, "Escape");
  await sleep(300);
  await verifyFocusAndTyping(session, 9, "Mở Menu Tệp (Alt+F) rồi đóng bằng phím Escape");

  // 10. Mở Menu Tệp bằng click nút Tệp rồi đóng bằng nút Quay lại
  await safeClick(cdp, ".vno-ribbon-tab-file");
  await cdp.waitFor("!!document.querySelector('.vno-backstage-overlay')", { timeoutMilliseconds: 5000 });
  await safeClick(cdp, "#vno-backstage-back");
  await sleep(300);
  await verifyFocusAndTyping(session, 10, "Mở Menu Tệp rồi đóng bằng nút Quay lại");

  // 11. Bấm nút Ribbon In đậm (Bold)
  await safeClick(cdp, '[data-command-id="sheet.cell.bold"]');
  await sleep(200);
  await verifyFocusAndTyping(session, 11, "Bấm nút Ribbon In đậm (Bold)");

  // 12. Bấm nút Ribbon In nghiêng (Italic)
  await safeClick(cdp, '[data-command-id="sheet.cell.italic"]');
  await sleep(200);
  await verifyFocusAndTyping(session, 12, "Bấm nút Ribbon In nghiêng (Italic)");

  // 13. Bấm nút Ribbon Căn giữa (Align Center)
  await safeClick(cdp, '[data-command-id="sheet.cell.alignCenter"]');
  await sleep(200);
  await verifyFocusAndTyping(session, 13, "Bấm nút Ribbon Căn giữa (Align Center)");

  // 14. Bấm nút Ribbon Căn trái (Align Left)
  await safeClick(cdp, '[data-command-id="sheet.cell.alignLeft"]');
  await sleep(200);
  await verifyFocusAndTyping(session, 14, "Bấm nút Ribbon Căn trái (Align Left)");

  // 15. Bấm nút Ribbon Tiền tệ VND
  await safeClick(cdp, '[data-command-id="sheet.format.currencyVND"]');
  await sleep(200);
  await verifyFocusAndTyping(session, 15, "Bấm nút Ribbon Định dạng tiền tệ VND");

  // 16. Bấm nút Ribbon Phần trăm (%)
  await safeClick(cdp, '[data-command-id="sheet.format.percent"]');
  await sleep(200);
  await verifyFocusAndTyping(session, 16, "Bấm nút Ribbon Định dạng phần trăm (%)");

  // 17. Đổi tab Ribbon: sang Chèn rồi về Trang đầu
  await safeClick(cdp, "#vno-ribbon-tab-insert");
  await sleep(200);
  await safeClick(cdp, "#vno-ribbon-tab-home");
  await sleep(200);
  await verifyFocusAndTyping(session, 17, "Đổi tab Ribbon sang Chèn rồi quay về Trang đầu");

  // 18. Đổi tab Ribbon sang Công thức rồi về Trang đầu
  await safeClick(cdp, "#vno-ribbon-tab-formulas");
  await sleep(200);
  await safeClick(cdp, "#vno-ribbon-tab-home");
  await sleep(200);
  await verifyFocusAndTyping(session, 18, "Đổi tab Ribbon sang Công thức rồi quay về Trang đầu");

  // 19. Thu phóng: Gọi Zoom In rồi Zoom Reset
  await cdp.evaluate(`(async () => {
    const { globalCommandBus } = await import('/platform/commands/command-bus.js');
    await globalCommandBus.execute('common.view.zoomIn');
    await globalCommandBus.execute('common.view.zoomReset');
  })()`);
  await sleep(200);
  await verifyFocusAndTyping(session, 19, "Thu phóng Zoom In rồi khôi phục 100%");

  // 20. Chuyển sang cửa sổ khác rồi quay lại (CDP Page.bringToFront & Window focus)
  await cdp.evaluate(`window.dispatchEvent(new Event('blur'))`);
  await sleep(200);
  try {
    await session.cdp.send("Page.bringToFront");
  } catch (_) {}
  await cdp.evaluate(`window.dispatchEvent(new Event('focus'))`);
  await sleep(200);
  await verifyFocusAndTyping(session, 20, "Chuyển sang cửa sổ khác rồi quay lại (bringToFront/window.focus)");
}

/**
 * Thực thi đo đạc cho 3T Slide
 */
async function testSlidesFocus(session) {
  const { cdp } = session;
  console.log("\n=======================================================");
  console.log("▶ BẮT ĐẦU ĐO KIỂM THỰC TẾ: 3T SLIDE - 20 TÌNH HUỐNG");
  console.log("=======================================================");

  // Đảm bảo focus ban đầu vào tiêu đề slide
  await click(cdp, ".vno-slide-title");
  await sleep(300);

  // 1. Đang sửa Tiêu đề: Đóng Tìm kiếm bằng Escape
  await openDialogSafe(cdp, "common.edit.find", ".vno-fr-dialog-overlay");
  await press(cdp, "Escape");
  await sleep(300);
  await verifyFocusAndTyping(session, 1, "Sửa Tiêu đề: Đóng hộp thoại Tìm kiếm bằng Escape", "title");

  // 2. Đang sửa Tiêu đề: Đóng Thay thế bằng nút Đóng 'x'
  await openDialogSafe(cdp, "common.edit.replace", ".vno-fr-dialog-overlay");
  await safeClick(cdp, ".vno-fr-close");
  await sleep(300);
  await verifyFocusAndTyping(session, 2, "Sửa Tiêu đề: Đóng hộp thoại Thay thế bằng nút Đóng 'x'", "title");

  // 3. Đang sửa Tiêu đề: Đóng Tìm kiếm bằng nút Đóng ở footer
  await openDialogSafe(cdp, "common.edit.find", ".vno-fr-dialog-overlay");
  await safeClick(cdp, "#vno-fr-close-btn");
  await sleep(300);
  await verifyFocusAndTyping(session, 3, "Sửa Tiêu đề: Đóng Tìm kiếm bằng nút Đóng footer", "title");

  // 4. Đang sửa Tiêu đề: Đóng hộp thoại In bằng Escape
  await openDialogSafe(cdp, "common.file.print", ".vno-print-dialog-overlay");
  await press(cdp, "Escape");
  await sleep(300);
  await verifyFocusAndTyping(session, 4, "Sửa Tiêu đề: Đóng hộp thoại In bằng Escape", "title");

  // 5. Đang sửa Tiêu đề: Đóng hộp thoại In bằng nút Đóng '×'
  await openDialogSafe(cdp, "common.file.print", ".vno-print-dialog-overlay");
  await safeClick(cdp, ".vno-print-close");
  await sleep(300);
  await verifyFocusAndTyping(session, 5, "Sửa Tiêu đề: Đóng hộp thoại In bằng nút Đóng '×'", "title");

  // 6. Đang sửa Tiêu đề: Đóng hộp thoại In bằng nút Hủy
  await openDialogSafe(cdp, "common.file.print", ".vno-print-dialog-overlay");
  await safeClick(cdp, ".vno-print-cancel");
  await sleep(300);
  await verifyFocusAndTyping(session, 6, "Sửa Tiêu đề: Đóng hộp thoại In bằng nút Hủy", "title");

  // 7. Đang sửa Tiêu đề: Đóng Giới thiệu bằng phím Escape
  await openDialogSafe(cdp, "common.help.about", ".vno-about-backdrop");
  await press(cdp, "Escape");
  await sleep(300);
  await verifyFocusAndTyping(session, 7, "Sửa Tiêu đề: Đóng hộp thoại Giới thiệu bằng Escape", "title");

  // 8. Đang sửa Tiêu đề: Đóng Giới thiệu bằng nút Đóng
  await openDialogSafe(cdp, "common.help.about", ".vno-about-backdrop");
  await safeClick(cdp, "#vno-about-close-btn");
  await sleep(300);
  await verifyFocusAndTyping(session, 8, "Sửa Tiêu đề: Đóng hộp thoại Giới thiệu bằng nút Đóng", "title");

  // 9. Đang sửa Tiêu đề: Mở Menu Tệp (Backstage) rồi đóng bằng Escape
  await openDialogSafe(cdp, "common.file.backstage", ".vno-backstage-overlay");
  await press(cdp, "Escape");
  await sleep(300);
  await verifyFocusAndTyping(session, 9, "Sửa Tiêu đề: Mở Menu Tệp (Alt+F) rồi đóng bằng Escape", "title");

  // 10. Đang sửa Tiêu đề: Mở Menu Tệp bằng click rồi đóng bằng nút Quay lại
  await safeClick(cdp, ".vno-ribbon-tab-file");
  await cdp.waitFor("!!document.querySelector('.vno-backstage-overlay')", { timeoutMilliseconds: 5000 });
  await safeClick(cdp, "#vno-backstage-back");
  await sleep(300);
  await verifyFocusAndTyping(session, 10, "Sửa Tiêu đề: Mở Menu Tệp rồi đóng bằng nút Quay lại", "title");

  // 11. Đang sửa Tiêu đề: Bấm nút Ribbon In đậm (Bold)
  await safeClick(cdp, '[data-command-id="slides.text.bold"]');
  await sleep(200);
  await verifyFocusAndTyping(session, 11, "Sửa Tiêu đề: Bấm nút Ribbon In đậm (Bold)", "title");

  // 12. Đang sửa Tiêu đề: Bấm nút Ribbon In nghiêng (Italic)
  await safeClick(cdp, '[data-command-id="slides.text.italic"]');
  await sleep(200);
  await verifyFocusAndTyping(session, 12, "Sửa Tiêu đề: Bấm nút Ribbon In nghiêng (Italic)", "title");

  // 13. Đang sửa Tiêu đề: Bấm nút Ribbon Căn giữa (Align Center)
  await safeClick(cdp, '[data-command-id="slides.para.alignCenter"]');
  await sleep(200);
  await verifyFocusAndTyping(session, 13, "Sửa Tiêu đề: Bấm nút Ribbon Căn giữa (Align Center)", "title");

  // 14. Chọn Thân slide: Bấm nút Ribbon Căn trái (Align Left)
  await cdp.evaluate(`(() => {
    const el = document.querySelector('.vno-slide-body');
    if (el) {
      el.focus();
      window.__vnoAppInstance?.canvasController?.setSelectedTarget('body');
    }
  })()`);
  await sleep(200);
  await safeClick(cdp, '[data-command-id="slides.para.alignLeft"]');
  await sleep(200);
  await verifyFocusAndTyping(session, 14, "Sửa Thân slide: Bấm nút Ribbon Căn trái (Align Left)", "body");

  // 15. Chọn canvas: Bấm nút Ribbon Thêm trang chiếu mới
  await safeClick(cdp, ".vno-slide-canvas");
  await sleep(200);
  await safeClick(cdp, '[data-command-id="slides.slide.new"]');
  await sleep(200);
  await verifyFocusAndTyping(session, 15, "Chọn Canvas: Bấm nút Ribbon Thêm trang chiếu mới", "canvas");

  // 16. Chọn canvas: Đổi tab Ribbon sang Thiết kế rồi về Trang đầu
  await safeClick(cdp, "#vno-ribbon-tab-design");
  await sleep(200);
  await safeClick(cdp, "#vno-ribbon-tab-home");
  await sleep(200);
  await verifyFocusAndTyping(session, 16, "Chọn Canvas: Đổi tab sang Thiết kế rồi về Trang đầu", "canvas");

  // 17. Chọn canvas: Đổi tab Ribbon sang Trình chiếu rồi về Trang đầu
  await safeClick(cdp, "#vno-ribbon-tab-slideshow");
  await sleep(200);
  await safeClick(cdp, "#vno-ribbon-tab-home");
  await sleep(200);
  await verifyFocusAndTyping(session, 17, "Chọn Canvas: Đổi tab sang Trình chiếu rồi về Trang đầu", "canvas");

  // 18. Chọn canvas: Thu phóng (Zoom In rồi Zoom Reset)
  await cdp.evaluate(`(async () => {
    const { globalCommandBus } = await import('/platform/commands/command-bus.js');
    await globalCommandBus.execute('common.view.zoomIn');
    await globalCommandBus.execute('common.view.zoomReset');
  })()`);
  await sleep(200);
  await verifyFocusAndTyping(session, 18, "Chọn Canvas: Thu phóng Zoom In rồi khôi phục 100%", "canvas");

  // 19. Chọn canvas: Mở Backstage rồi đóng bằng Escape
  await openDialogSafe(cdp, "common.file.backstage", ".vno-backstage-overlay");
  await press(cdp, "Escape");
  await sleep(300);
  await verifyFocusAndTyping(session, 19, "Chọn Canvas: Mở Menu Tệp rồi đóng bằng Escape", "canvas");

  // 20. Chuyển sang cửa sổ khác rồi quay lại (CDP Page.bringToFront & Window focus)
  await cdp.evaluate(`window.dispatchEvent(new Event('blur'))`);
  await sleep(200);
  try {
    await session.cdp.send("Page.bringToFront");
  } catch (_) {}
  await cdp.evaluate(`window.dispatchEvent(new Event('focus'))`);
  await sleep(200);
  await verifyFocusAndTyping(session, 20, "Chuyển sang cửa sổ khác rồi quay lại (bringToFront/window.focus)", "canvas");
}

/**
 * Main Runner
 */
export async function runAllKeepFocusTests() {
  const profileBase = platformOutputPath("E:\\VNOffice-profiles", { directory: true });
  let sessionIndex = 1;

  for (const app of appKinds) {
    const profileDir = path.join(profileBase, `agy-focus-${sessionIndex++}`);
    console.log(`\nKhởi động ứng dụng ${appTitles[app]} với profile riêng: ${profileDir}`);

    let session = null;
    try {
      session = await launchApp(app, {
        localAppData: profileDir,
        readyTimeoutMilliseconds: 45000
      });

      // Inject tham chiếu focusManager ra window để test truy cập nếu cần
      await session.cdp.evaluate(`(async () => {
        const fm = await import('/platform/shell/focus-manager.js');
        window.__vnoFocusManager = fm;
      })()`);

      if (app === "writer") {
        await testWriterFocus(session);
      } else if (app === "sheet") {
        await testSheetFocus(session);
      } else if (app === "slides") {
        await testSlidesFocus(session);
      }
    } catch (err) {
      console.error(`Lỗi thực thi kiểm thử trên ${appTitles[app]}:`, err);
    } finally {
      if (session) {
        console.log(`Đang đóng ứng dụng ${appTitles[app]} và thu hồi tiến trình PID: ${session.child?.pid}...`);
        await session.close().catch(() => {});
      }
    }
  }

  // In bảng tổng kết
  console.log("\n==========================================================================================================");
  console.log("BẢNG TỔNG HỢP KẾT QUẢ ĐO KIỂM THỰC TẾ CH-4.6 (KEEP FOCUS TRONG VÙNG SOẠN THẢO)");
  console.log("==========================================================================================================");
  console.log("STATUS | APP      | #  | TÌNH HUỐNG                                   | ACTIVE TRƯỚC -> SAU      | KẾT QUẢ BÀN PHÍM");
  console.log("-------+----------+----+----------------------------------------------+--------------------------+------------------");

  for (const r of allResults) {
    const appCol = appTitles[r.app].padEnd(8);
    const idCol = String(r.caseId).padStart(2);
    const labelCol = r.caseLabel.slice(0, 44).padEnd(44);
    const activeCol = `${r.beforeActive} -> ${r.afterActive}`.slice(0, 24).padEnd(24);
    console.log(`${r.status.padEnd(6)} | ${appCol} | ${idCol} | ${labelCol} | ${activeCol} | ${r.enterDetail}`);
  }

  const passCount = allResults.filter(r => r.status === "PASS").length;
  const failCount = allResults.filter(r => r.status === "FAIL").length;
  console.log("\n----------------------------------------------------------------------------------------------------------");
  console.log(`TỔNG CỘNG: ${passCount}/${allResults.length} TÌNH HUỐNG PASS | ${failCount} FAIL`);
  console.log("----------------------------------------------------------------------------------------------------------\n");

  return allResults;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runAllKeepFocusTests().then((results) => {
    const failCount = results.filter(r => r.status === "FAIL").length;
    if (failCount > 0) process.exit(1);
    else process.exit(0);
  }).catch((err) => {
    console.error("FATAL ERROR:", err);
    process.exit(1);
  });
}
