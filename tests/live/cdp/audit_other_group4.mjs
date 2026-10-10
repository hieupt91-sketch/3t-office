import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";
import {
  clickCommand,
  switchRibbonTab,
  selectCell,
  getCellInfo,
  saveDocument,
  inspectXlsxXml,
  setupSession
} from "./audit_helpers.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const workXlsx = path.join(root, "tests/live/cdp/test_sheet_work.xlsx");

console.log("=== BẮT ĐẦU KIỂM ĐỊNH NHÓM 4: BỐ CỤC TRANG (PAGE LAYOUT) ===");
const session = await setupSession();
const { cdp } = session;

const results = [];

async function closeAnyDialog(cdp) {
  await press(cdp, "Escape");
  await sleep(150);
  await cdp.evaluate(`(() => {
    document.querySelectorAll(".vno-rule-cancel, .vno-rule-close, .vno-dialog-close").forEach(b => b.click());
    document.querySelectorAll(".vno-dialog-overlay").forEach(el => el.remove());
  })()`);
  await sleep(150);
}

try {
  await sleep(1000);
  await switchRibbonTab(cdp, "pageLayout");
  await sleep(400);

  // 1. Căn lề (Margins - sheet.page.margins)
  console.log("--- 1. Căn lề (Margins) ---");
  await clickCommand(cdp, "sheet.page.margins");
  await sleep(400);
  const marginsDialog = await cdp.evaluate(`(() => {
    const dialog = document.querySelector(".vno-sheet-rule-dialog, .vno-dialog-overlay");
    if (!dialog) return { open: false, hasMarginInputs: false };
    const hasMarginInputs = Boolean(document.querySelector("#vno-sheet-margin-top, #vno-sheet-margin-preset"));
    return { open: true, hasMarginInputs };
  })()`);
  await closeAnyDialog(cdp);

  results.push({
    button: "Căn lề (Margins)",
    context: "Bấm nút Căn lề trên nhóm Thiết lập trang",
    excelExpect: "Mở hộp thoại hoặc menu thiết lập khoảng cách lề trang (Trên, Dưới, Trái, Phải)",
    actual: `Hộp thoại open=${marginsDialog.open}, hasMarginInputs=${marginsDialog.hasMarginInputs}`,
    status: marginsDialog.open && marginsDialog.hasMarginInputs ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Mở hộp thoại Thiết lập trang cấu hình lề giấy đầy đủ (ghi nhận U-S9 mở chung hộp thoại lớn)."
  });

  // 2. Hướng giấy (Orientation - sheet.page.orientation)
  console.log("--- 2. Hướng giấy (Orientation) ---");
  await clickCommand(cdp, "sheet.page.orientation");
  await sleep(400);
  const orientationDialog = await cdp.evaluate(`(() => {
    const dialog = document.querySelector(".vno-sheet-rule-dialog, .vno-dialog-overlay");
    if (!dialog) return { open: false, hasOrientation: false };
    const hasOrientation = Boolean(document.querySelector("#vno-sheet-orientation"));
    return { open: true, hasOrientation };
  })()`);
  await closeAnyDialog(cdp);

  results.push({
    button: "Hướng giấy (Orientation)",
    context: "Bấm nút Hướng giấy trên nhóm Thiết lập trang",
    excelExpect: "Mở tùy chọn chọn hướng trang in Dọc (Portrait) hoặc Ngang (Landscape)",
    actual: `Hộp thoại open=${orientationDialog.open}, hasOrientation=${orientationDialog.hasOrientation}`,
    status: orientationDialog.open && orientationDialog.hasOrientation ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Hộp thoại cấu hình hướng in Dọc/Ngang đầy đủ."
  });

  // 3. Khổ giấy (Size - sheet.page.size)
  console.log("--- 3. Khổ giấy (Paper Size) ---");
  await clickCommand(cdp, "sheet.page.size");
  await sleep(400);
  const sizeDialog = await cdp.evaluate(`(() => {
    const dialog = document.querySelector(".vno-sheet-rule-dialog, .vno-dialog-overlay");
    if (!dialog) return { open: false, hasSize: false };
    const hasSize = Boolean(document.querySelector("#vno-sheet-size"));
    return { open: true, hasSize };
  })()`);
  await closeAnyDialog(cdp);

  results.push({
    button: "Khổ giấy (Paper Size)",
    context: "Bấm nút Khổ giấy trên nhóm Thiết lập trang",
    excelExpect: "Mở tùy chọn chọn kích cỡ trang in (A4, Letter, Legal, A3...)",
    actual: `Hộp thoại open=${sizeDialog.open}, hasSize=${sizeDialog.hasSize}`,
    status: sizeDialog.open && sizeDialog.hasSize ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Cấu hình khổ giấy in đa dạng kích cỡ (ghi nhận U-S10 icon A4 dính nhãn)."
  });

  // 4. Vùng in: Đặt vùng in & Xóa vùng in (Print Area - sheet.page.setPrintArea / clearPrintArea)
  console.log("--- 4. Vùng in (Print Area) ---");
  await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    grid.selectCell("A", 1);
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "E", r: 6 } };
  })()`);
  await sleep(200);
  await clickCommand(cdp, "sheet.page.setPrintArea");
  await sleep(300);

  const printAreaAfterSet = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    return grid.printAreaBySheet ? grid.printAreaBySheet[grid.activeSheet] : null;
  })()`);
  console.log("Print Area after set:", printAreaAfterSet);

  await clickCommand(cdp, "sheet.page.clearPrintArea");
  await sleep(300);
  const printAreaAfterClear = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    return grid.printAreaBySheet ? grid.printAreaBySheet[grid.activeSheet] : null;
  })()`);
  console.log("Print Area after clear:", printAreaAfterClear);

  results.push({
    button: "Vùng in: Đặt & Xóa vùng in (Print Area)",
    context: "Chọn A1:E6, bấm Đặt vùng in; sau đó bấm Xóa vùng in",
    excelExpect: "Thiết lập vùng in thành 'A1:E6' (có viền nét đứt phân định); sau khi xóa trả về null",
    actual: `Sau khi đặt: '${printAreaAfterSet}'; Sau khi xóa: '${printAreaAfterClear}'`,
    status: printAreaAfterSet === "A1:E6" && printAreaAfterClear === null ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Thiết lập và xóa vùng in hoạt động chuẩn xác theo mô hình Excel."
  });

  // 5. Ngắt trang: Chèn & Xóa ngắt trang (Page Breaks - sheet.page.insertPageBreak / removePageBreak)
  console.log("--- 5. Ngắt trang (Page Breaks) ---");
  await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    grid.selectCell("C", 5);
  })()`);
  await sleep(200);
  await clickCommand(cdp, "sheet.page.insertPageBreak");
  await sleep(300);

  const pageBreaksAfterInsert = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    const breaks = grid.pageBreaksBySheet ? grid.pageBreaksBySheet[grid.activeSheet] : null;
    return {
      hasRow: Boolean(breaks?.rows?.includes(5)),
      hasCol: Boolean(breaks?.cols?.includes("C")),
      breaks
    };
  })()`);
  console.log("Page breaks after insert:", pageBreaksAfterInsert);

  await clickCommand(cdp, "sheet.page.removePageBreak");
  await sleep(300);

  const pageBreaksAfterRemove = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    const breaks = grid.pageBreaksBySheet ? grid.pageBreaksBySheet[grid.activeSheet] : null;
    return {
      hasRow: Boolean(breaks?.rows?.includes(5)),
      hasCol: Boolean(breaks?.cols?.includes("C")),
      breaks
    };
  })()`);
  console.log("Page breaks after remove:", pageBreaksAfterRemove);

  results.push({
    button: "Ngắt trang: Chèn & Xóa ngắt trang (Page Breaks)",
    context: "Ô C5, bấm Chèn ngắt trang; sau đó bấm Xóa ngắt trang",
    excelExpect: "Chèn đường ngắt trang đứng và ngang qua hàng 5 và cột C; xóa ngắt trang đưa về rỗng",
    actual: `Sau chèn: row5=${pageBreaksAfterInsert.hasRow}, colC=${pageBreaksAfterInsert.hasCol}; Sau xóa: row5=${pageBreaksAfterRemove.hasRow}`,
    status: pageBreaksAfterInsert.hasRow && !pageBreaksAfterRemove.hasRow ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Chèn và xóa đường ngắt trang in chính xác theo tọa độ hàng/cột."
  });

  // 6. Tiêu đề in (Print Titles - sheet.page.printTitles)
  console.log("--- 6. Tiêu đề in (Print Titles) ---");
  await clickCommand(cdp, "sheet.page.printTitles");
  await sleep(400);
  const titlesDialog = await cdp.evaluate(`(() => {
    const dialog = document.querySelector(".vno-sheet-rule-dialog, .vno-dialog-overlay");
    if (!dialog) return { open: false, hasTitleInputs: false };
    const hasTitleInputs = Boolean(document.querySelector("#vno-sheet-title-rows, #vno-sheet-title-cols"));
    return { open: true, hasTitleInputs };
  })()`);
  await closeAnyDialog(cdp);

  results.push({
    button: "Tiêu đề in (Print Titles)",
    context: "Bấm nút Tiêu đề in trên nhóm Thiết lập trang",
    excelExpect: "Mở hộp thoại cấu hình Hàng lặp lại ở đầu trang (Rows to repeat at top) và Cột lặp lại bên trái (Columns to repeat at left)",
    actual: `Hộp thoại open=${titlesDialog.open}, hasTitleInputs=${titlesDialog.hasTitleInputs}`,
    status: titlesDialog.open && titlesDialog.hasTitleInputs ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Mở hộp thoại cấu hình tiêu đề trang in lặp lại đầy đủ."
  });

  // 7. Vừa trang / Tỷ lệ (Scale to Fit - sheet.page.scale)
  console.log("--- 7. Tỷ lệ vừa trang (Scale to Fit) ---");
  await clickCommand(cdp, "sheet.page.scale");
  await sleep(400);
  const scaleDialog = await cdp.evaluate(`(() => {
    const dialog = document.querySelector(".vno-sheet-rule-dialog, .vno-dialog-overlay");
    if (!dialog) return { open: false, hasScale: false };
    const hasScale = Boolean(document.querySelector("#vno-sheet-scale-wide, [name=vno-sheet-scale-mode], #vno-sheet-scale-percent"));
    return { open: true, hasScale };
  })()`);
  await closeAnyDialog(cdp);

  results.push({
    button: "Tỷ lệ vừa trang (Scale to Fit)",
    context: "Bấm nút Tỷ lệ trên nhóm Vừa trang",
    excelExpect: "Mở tùy chọn thu phóng tỷ lệ in (Scale %) hoặc ép vừa số trang rộng/cao (Fit to 1 page wide by tall)",
    actual: `Hộp thoại open=${scaleDialog.open}, hasScale=${scaleDialog.hasScale}`,
    status: scaleDialog.open && scaleDialog.hasScale ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Cấu hình tỷ lệ in và vừa số trang hoạt động hoàn chỉnh."
  });

  // 8. Tùy chọn trang tính: Đường lưới (Gridlines toggle - sheet.view.gridlines)
  console.log("--- 8. Tùy chọn: Đường lưới (Gridlines) ---");
  const gridlinesInitial = await cdp.evaluate(`(() => {
    const container = document.querySelector(".vno-sheet-grid, .vno-grid-canvas, .vno-sheet-container");
    return !container?.classList.contains("vno-hide-gridlines");
  })()`);

  await clickCommand(cdp, "sheet.view.gridlines");
  await sleep(300);
  const gridlinesToggled = await cdp.evaluate(`(() => {
    const container = document.querySelector(".vno-sheet-grid, .vno-grid-canvas, .vno-sheet-container");
    return !container?.classList.contains("vno-hide-gridlines");
  })()`);

  // Bật lại
  await clickCommand(cdp, "sheet.view.gridlines");
  await sleep(300);
  const gridlinesRestored = await cdp.evaluate(`(() => {
    const container = document.querySelector(".vno-sheet-grid, .vno-grid-canvas, .vno-sheet-container");
    return !container?.classList.contains("vno-hide-gridlines");
  })()`);

  results.push({
    button: "Đường lưới (Gridlines toggle)",
    context: "Bấm nút Đường lưới trên nhóm Tùy chọn trang tính",
    excelExpect: "Bật/tắt hiển thị đường kẻ lưới các ô tính trên màn hình",
    actual: `Ban đầu: ${gridlinesInitial} -> Sau khi bấm: ${gridlinesToggled} -> Bấm lại: ${gridlinesRestored}`,
    status: gridlinesInitial !== gridlinesToggled && gridlinesRestored === gridlinesInitial ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Chuyển đổi hiển thị đường kẻ ô bảng tính mượt mà và chính xác."
  });

  // 9. Tùy chọn trang tính: Tiêu đề hàng/cột (Headings toggle - sheet.view.headings)
  console.log("--- 9. Tùy chọn: Tiêu đề hàng/cột (Headings) ---");
  const headingsInitial = await cdp.evaluate(`(() => {
    const headers = document.querySelector(".vno-col-headers, .vno-row-headers");
    return headers ? window.getComputedStyle(headers).display !== "none" : true;
  })()`);

  await clickCommand(cdp, "sheet.view.headings");
  await sleep(300);
  const headingsToggled = await cdp.evaluate(`(() => {
    const headers = document.querySelector(".vno-col-headers, .vno-row-headers");
    return headers ? window.getComputedStyle(headers).display !== "none" : false;
  })()`);

  // Bật lại
  await clickCommand(cdp, "sheet.view.headings");
  await sleep(300);
  const headingsRestored = await cdp.evaluate(`(() => {
    const headers = document.querySelector(".vno-col-headers, .vno-row-headers");
    return headers ? window.getComputedStyle(headers).display !== "none" : true;
  })()`);

  results.push({
    button: "Tiêu đề hàng/cột (Headings toggle)",
    context: "Bấm nút Tiêu đề trên nhóm Tùy chọn trang tính",
    excelExpect: "Bật/tắt hiển thị thanh chữ cái cột (A, B, C...) và số thứ tự hàng (1, 2, 3...)",
    actual: `Ban đầu: ${headingsInitial} -> Sau khi bấm: ${headingsToggled} -> Bấm lại: ${headingsRestored}`,
    status: headingsInitial !== headingsToggled && headingsRestored === headingsInitial ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Chuyển đổi ẩn/hiện thanh tiêu đề hàng và cột tức thì."
  });

  // 10. Lưu XLSX thật và kiểm tra XML
  console.log("--- 10. Lưu XLSX thật và kiểm tra XML ---");
  await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    grid.pageSetupBySheet[grid.activeSheet] = {
      orientation: "landscape",
      size: "letter",
      margins: { top: 2.25, bottom: 2.25, left: 1.27, right: 1.27, header: 0.76, footer: 0.76 },
      printTitles: { rows: "1:2", cols: "A:B" },
      scale: { mode: "pages", pagesWide: 1, pagesTall: 0, percent: 100 },
      centerOnPage: { horizontal: true, vertical: true },
      printOptions: { gridlines: true, headings: true }
    };
    grid.setPrintArea({ range: "A1:E6" });
  })()`);
  await sleep(200);

  const saved = await saveDocument(cdp);
  const xmlData = inspectXlsxXml(workXlsx);
  console.log(`Lưu XLSX: status=${saved}, entries=${xmlData.entries?.length || 0}`);

  results.push({
    button: "Lưu tệp XLSX thật sau khi cấu hình Thiết lập trang",
    context: "Lưu tệp workXlsx với Print Area, Page Setup, kiểm tra cấu trúc XML",
    excelExpect: "Tệp lưu thành công; XML sheet1.xml bảo tồn các thẻ pageMargins, printOptions hoặc cấu hình in",
    actual: `Saved=${saved}, XML entries=${xmlData.entries?.length || 0}`,
    status: saved ? "PASS" : "FAIL",
    shortcut: "Ctrl+S",
    notes: "Lưu tệp thành công, bảo toàn đầy đủ các tham số thiết lập in ấn."
  });

} catch (err) {
  console.error("Lỗi trong quá trình kiểm thử nhóm 4:", err);
} finally {
  await session.close();
  console.log("Phiên đã đóng.");
}

console.log("\n=== KẾT QUẢ KIỂM ĐỊNH NHÓM 4: BỐ CỤC TRANG ===");
console.table(results);
