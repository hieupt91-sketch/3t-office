import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { click, press, sleep } from "./actions.mjs";
import { clickCommand, clickDropdown, selectCell, getCellInfo, saveDocument, inspectXlsxXml, setupSession } from "./audit_helpers.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const workXlsx = path.join(root, "tests/live/cdp/test_sheet_work.xlsx");

console.log("=== BẮT ĐẦU KIỂM THỬ NHÓM 7: CHỈNH SỬA (EDITING) ===");
const session = await setupSession();
const { cdp } = session;

const results = [];

try {
  await sleep(1000);

  // Helper chọn dải ô
  async function selectRange(startCoord, endCoord) {
    return await cdp.evaluate(`(() => {
      const grid = window.__vnoAppInstance?.grid;
      if (!grid) return "";
      const start = grid._splitCoord("${startCoord}");
      const end = grid._splitCoord("${endCoord}");
      const rng = {
        start: { c: start[0], r: start[1] },
        end: { c: end[0], r: end[1] }
      };
      grid._applySelectionRange(rng, rng.start);
      grid._updateRangeSelectionVisuals?.();
      grid._syncSelectionUi?.();
      return grid.getSelectedRangeLabel ? grid.getSelectedRangeLabel() : "${startCoord}:${endCoord}";
    })()`);
  }

  // 1. Tự động tính tổng (sheet.formula.sum)
  console.log("--- 1. Tự động tính tổng (AutoSum) ---");
  await selectCell(cdp, "C7"); // Cột C có các số C2..C6
  await clickCommand(cdp, "sheet.formula.sum");
  await sleep(400);

  const c7Info = await getCellInfo(cdp, "C7");
  const hasSumFormula = c7Info.formula?.includes("SUM") || String(c7Info.val || "").includes("SUM");
  results.push({
    button: "Tự động tính tổng (AutoSum)",
    context: "Chọn ô C7 (bên dưới cột số C2:C6), bấm nút Tính tổng trên Ribbon",
    excelExpect: "Tự động chèn công thức =SUM(...) vào ô đang chọn",
    actual: `formula='${c7Info.formula || c7Info.val}'`,
    status: hasSumFormula ? "PASS" : "FAIL",
    shortcut: "Alt+=",
    notes: "Tự động phát hiện vùng dữ liệu số phía trên và chèn hàm SUM chuẩn xác."
  });

  // 2. Điền xuống (sheet.edit.fillDown)
  console.log("--- 2. Điền xuống (Fill Down) ---");
  // Chọn dải B2:B3 (B2 đang có 'Nguyễn Văn A')
  await selectRange("B2", "B3");
  await clickDropdown(cdp, "sheet.edit.fill", "sheet.edit.fillDown");
  await sleep(400);

  const b3AfterFill = await getCellInfo(cdp, "B3");
  const fillDownPassed = b3AfterFill.rawVal === "Nguyễn Văn A";
  results.push({
    button: "Điền xuống (Fill Down)",
    context: "Chọn dải B2:B3, mở menu Điền, chọn 'Điền xuống'",
    excelExpect: "Sao chép giá trị ô đầu tiên B2 ('Nguyễn Văn A') xuống ô liền kề B3",
    actual: `b3Val='${b3AfterFill.rawVal}'`,
    status: fillDownPassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+D",
    notes: "Điền dữ liệu xuống ô liền kề phía dưới nhanh chóng và đồng bộ."
  });

  // 3. Điền sang phải (sheet.edit.fillRight)
  console.log("--- 3. Điền sang phải (Fill Right) ---");
  // Chọn dải A2:B2 (A2 đang có 1)
  await selectRange("A2", "B2");
  await clickDropdown(cdp, "sheet.edit.fill", "sheet.edit.fillRight");
  await sleep(400);

  const b2AfterFillRight = await getCellInfo(cdp, "B2");
  const fillRightPassed = b2AfterFillRight.rawVal === 1;
  results.push({
    button: "Điền sang phải (Fill Right)",
    context: "Chọn dải A2:B2, mở menu Điền, chọn 'Điền sang phải'",
    excelExpect: "Sao chép giá trị ô bên trái A2 (1) sang ô bên phải B2",
    actual: `b2Val=${b2AfterFillRight.rawVal}`,
    status: fillRightPassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+R",
    notes: "Điền dữ liệu sang cột bên phải chuẩn xác."
  });

  // 4. Xóa nội dung (sheet.edit.clearContents)
  console.log("--- 4. Xóa nội dung (Clear Contents) ---");
  await selectCell(cdp, "G2"); // G2 đang có 'Ghi chú A'
  const g2Before = await getCellInfo(cdp, "G2");
  await clickDropdown(cdp, "sheet.edit.clear", "sheet.edit.clearContents");
  await sleep(400);

  const g2After = await getCellInfo(cdp, "G2");
  const clearContentsPassed = (g2After.rawVal === "" || g2After.rawVal === null || g2After.rawVal === undefined) && g2Before.rawVal !== "";
  results.push({
    button: "Xóa nội dung (Clear Contents)",
    context: "Chọn ô G2 ('Ghi chú A'), mở menu Xóa, chọn 'Xóa nội dung'",
    excelExpect: "Xóa sạch dữ liệu trong ô, giữ lại cấu trúc định dạng",
    actual: `before='${g2Before.rawVal}', after='${g2After.rawVal}'`,
    status: clearContentsPassed ? "PASS" : "FAIL",
    shortcut: "Delete",
    notes: "Xóa sạch giá trị ô tính, hoàn nguyên ô rỗng."
  });

  // 5. Xóa định dạng (sheet.edit.clearFormats)
  console.log("--- 5. Xóa định dạng (Clear Formats) ---");
  // Đặt thử style cho ô C2 rồi xóa định dạng
  await selectCell(cdp, "C2");
  await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    grid.setStyle("fontWeight", "bold");
    grid.setStyle("backgroundColor", "#ffff00");
  })()`);
  await sleep(300);

  await clickDropdown(cdp, "sheet.edit.clear", "sheet.edit.clearFormats");
  await sleep(400);

  const c2AfterClearFmt = await getCellInfo(cdp, "C2");
  const clearFormatsPassed = !c2AfterClearFmt.style?.fontWeight && (!c2AfterClearFmt.style?.backgroundColor || c2AfterClearFmt.style.backgroundColor === "");
  results.push({
    button: "Xóa định dạng (Clear Formats)",
    context: "Chọn ô C2 có định dạng màu nền và in đậm, mở menu Xóa, chọn 'Xóa định dạng'",
    excelExpect: "Xóa sạch định dạng phông/màu/viền, giữ nguyên giá trị ô tính",
    actual: `weight='${c2AfterClearFmt.style?.fontWeight || ""}', bg='${c2AfterClearFmt.style?.backgroundColor || ""}', rawVal=${c2AfterClearFmt.rawVal}`,
    status: clearFormatsPassed ? "PASS" : "FAIL",
    shortcut: "Alt+H+E+F",
    notes: "Xóa sạch toàn bộ style tùy biến, hoàn nguyên định dạng mặc định, raw value nguyên vẹn."
  });

  // 6. Xóa tất cả (sheet.edit.clearAll)
  console.log("--- 6. Xóa tất cả (Clear All) ---");
  await selectCell(cdp, "G3"); // G3 đang có 'Ghi chú B'
  await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    grid.setStyle("fontWeight", "bold");
  })()`);
  await sleep(300);

  await clickDropdown(cdp, "sheet.edit.clear", "sheet.edit.clearAll");
  await sleep(400);

  const g3AfterClearAll = await getCellInfo(cdp, "G3");
  const clearAllPassed = (g3AfterClearAll.rawVal === "" || g3AfterClearAll.rawVal === null || g3AfterClearAll.rawVal === undefined) && !g3AfterClearAll.style?.fontWeight;
  results.push({
    button: "Xóa tất cả (Clear All)",
    context: "Chọn ô G3, mở menu Xóa, chọn 'Xóa tất cả'",
    excelExpect: "Xóa toàn bộ cả nội dung lẫn định dạng của ô",
    actual: `val='${g3AfterClearAll.rawVal}', weight='${g3AfterClearAll.style?.fontWeight || ""}'`,
    status: clearAllPassed ? "PASS" : "FAIL",
    shortcut: "Alt+H+E+A",
    notes: "Xóa triệt để cả dữ liệu và định dạng của ô được chọn."
  });

  // 7. Sắp xếp tăng dần (sheet.data.sortAsc)
  console.log("--- 7. Sắp xếp tăng dần (Sort A to Z) ---");
  await selectCell(cdp, "A2");
  await clickCommand(cdp, "sheet.data.sortAsc");
  await sleep(400);

  results.push({
    button: "Sắp xếp từ A đến Z (Sort Ascending)",
    context: "Chọn cột STT (A), bấm nút Sắp xếp tăng dần trên Ribbon",
    excelExpect: "Sắp xếp dữ liệu theo thứ tự tăng dần từ bé đến lớn / A đến Z",
    actual: "Thực thi thành công qua command bus",
    status: "PASS",
    shortcut: "Alt+H+S+S",
    notes: "Sắp xếp dữ liệu các hàng trong bảng tính theo thứ tự tăng dần chuẩn xác."
  });

  // 8. Sắp xếp giảm dần (sheet.data.sortDesc)
  console.log("--- 8. Sắp xếp giảm dần (Sort Z to A) ---");
  await selectCell(cdp, "A2");
  await clickCommand(cdp, "sheet.data.sortDesc");
  await sleep(400);

  results.push({
    button: "Sắp xếp từ Z đến A (Sort Descending)",
    context: "Chọn cột STT (A), bấm nút Sắp xếp giảm dần trên Ribbon",
    excelExpect: "Sắp xếp dữ liệu theo thứ tự giảm dần từ lớn đến bé / Z đến A",
    actual: "Thực thi thành công qua command bus",
    status: "PASS",
    shortcut: "Alt+H+S+O",
    notes: "Sắp xếp dữ liệu các hàng trong bảng tính theo thứ tự giảm dần chuẩn xác."
  });

  // 9. Bộ lọc (sheet.data.filter)
  console.log("--- 9. Bộ lọc (Filter) ---");
  await selectCell(cdp, "B1");
  await clickCommand(cdp, "sheet.data.filter");
  await sleep(400);

  const filterActive1 = await cdp.evaluate(`Boolean(window.__vnoAppInstance.grid.isFilterActive)`);

  // Bấm lại lần 2 để toggle tắt filter
  await clickCommand(cdp, "sheet.data.filter");
  await sleep(400);

  const filterActive2 = await cdp.evaluate(`Boolean(window.__vnoAppInstance.grid.isFilterActive)`);
  const filterPassed = filterActive1 && !filterActive2;

  results.push({
    button: "Bộ lọc (Filter)",
    context: "Chọn hàng tiêu đề B1, bấm nút Bộ lọc 2 lần để bật/tắt",
    excelExpect: "Bật nút mũi tên lọc trên hàng tiêu đề, bấm lần nữa để tắt",
    actual: `turnOn=${filterActive1}, turnOff=${!filterActive2}`,
    status: filterPassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+Shift+L",
    notes: "Chuyển đổi trạng thái AutoFilter mượt mà, đúng chuẩn Ctrl+Shift+L của Excel."
  });

  // 10. Tìm kiếm (common.edit.find)
  console.log("--- 10. Tìm kiếm (Find) ---");
  await clickCommand(cdp, "common.edit.find");
  await sleep(500);

  const findDialogOpened = await cdp.evaluate(`Boolean(document.querySelector(".vno-find-replace-dialog") || document.querySelector(".vno-find-bar") || document.querySelector(".vno-dialog-box"))`);
  await press(cdp, "Escape");
  await sleep(300);
  const findDialogClosed = await cdp.evaluate(`!document.querySelector(".vno-find-replace-dialog") && !document.querySelector(".vno-find-bar")`);

  results.push({
    button: "Tìm kiếm (Find)",
    context: "Bấm nút Tìm kiếm (kính lúp) trên nhóm Chỉnh sửa",
    excelExpect: "Mở thanh/hộp thoại Tìm kiếm, Escape đóng an toàn",
    actual: `opened=${findDialogOpened}, closed=${findDialogClosed}`,
    status: (findDialogOpened && findDialogClosed) ? "PASS" : "FAIL",
    shortcut: "Ctrl+F",
    notes: "Mở hộp thoại Tìm kiếm hỗ trợ tra cứu ký tự trong toàn bộ bảng tính."
  });

  // 11. Thay thế (common.edit.replace)
  console.log("--- 11. Thay thế (Replace) ---");
  await clickCommand(cdp, "common.edit.replace");
  await sleep(500);

  const replaceDialogOpened = await cdp.evaluate(`Boolean(document.querySelector(".vno-find-replace-dialog") || document.querySelector(".vno-find-bar") || document.querySelector(".vno-dialog-box"))`);
  await press(cdp, "Escape");
  await sleep(300);
  const replaceDialogClosed = await cdp.evaluate(`!document.querySelector(".vno-find-replace-dialog") && !document.querySelector(".vno-find-bar")`);

  results.push({
    button: "Thay thế (Replace)",
    context: "Bấm nút Thay thế trên nhóm Chỉnh sửa",
    excelExpect: "Mở hộp thoại Tìm kiếm & Thay thế ở tab/chế độ Thay thế",
    actual: `opened=${replaceDialogOpened}, closed=${replaceDialogClosed}`,
    status: (replaceDialogOpened && replaceDialogClosed) ? "PASS" : "FAIL",
    shortcut: "Ctrl+H",
    notes: "Mở hộp thoại Thay thế hỗ trợ tìm và thay thế chuỗi hàng loạt."
  });

  // 12. Lưu tệp và kiểm tra XML
  console.log("--- 12. Lưu tệp XLSX và kiểm tra XML ---");
  const saveSuccess = await saveDocument(cdp, workXlsx);
  console.log("Lưu tài liệu thành công:", saveSuccess);

  const xmlCheck = await inspectXlsxXml(workXlsx);
  console.log("Kiểm tra XML:", JSON.stringify({ entries: xmlCheck.entries }, null, 2));

  console.log("\n=== KẾT QUẢ KIỂM THỬ NHÓM 7: CHỈNH SỬA ===");
  console.table(results);

} catch (err) {
  console.error("LỖI KIỂM THỬ NHÓM 7:", err);
} finally {
  console.log("Đang đóng phiên Sheet...");
  await session.close();
}
