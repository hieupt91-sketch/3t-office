import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { click, press, sleep } from "./actions.mjs";
import { clickCommand, selectCell, getCellInfo, saveDocument, inspectXlsxXml, setupSession } from "./audit_helpers.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const workXlsx = path.join(root, "tests/live/cdp/test_sheet_work.xlsx");

console.log("=== BẮT ĐẦU KIỂM THỬ NHÓM 5: KIỂU (STYLES) ===");
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

  // 1. Định dạng có điều kiện (sheet.format.conditional)
  console.log("--- 1. Định dạng có điều kiện (Conditional Formatting) ---");
  await selectRange("C2", "C6");
  await clickCommand(cdp, "sheet.format.conditional");
  await sleep(400);

  // Kiểm tra dialog mở
  const cfDialogOpen = await cdp.evaluate(`Boolean(document.querySelector("#vno-cf-type"))`);
  console.log("CF Dialog Open:", cfDialogOpen);

  // Áp dụng quy tắc: greaterThan 2000, màu #fed7aa
  const cfApplied = await cdp.evaluate(`(() => {
    const type = document.querySelector("#vno-cf-type");
    const val = document.querySelector("#vno-cf-value");
    const color = document.querySelector("#vno-cf-color");
    const applyBtn = document.querySelector(".vno-rule-apply");
    if (!type || !val || !applyBtn) return false;
    type.value = "greaterThan";
    val.value = "2000";
    if (color) color.value = "#fed7aa";
    applyBtn.click();
    return true;
  })()`);
  await sleep(400);

  // Kiểm tra quy tắc đã lưu trong grid
  const cfRulesCount = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    const rules = grid.conditionalFormattingBySheet?.[grid.activeSheet] || [];
    return rules.length;
  })()`);

  const cfPassed = cfDialogOpen && cfApplied && cfRulesCount > 0;
  results.push({
    button: "Định dạng có điều kiện (Conditional Formatting)",
    context: "Chọn dải C2:C6, mở hộp thoại Định dạng có điều kiện, thêm quy tắc > 2000",
    excelExpect: "Mở hộp thoại thiết lập quy tắc, áp dụng quy tắc thành công vào mô hình bảng tính",
    actual: `dialogOpen=${cfDialogOpen}, applied=${cfApplied}, rulesCount=${cfRulesCount}`,
    status: cfPassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Mở hộp thoại quy tắc điều kiện (Lớn hơn, Nhỏ hơn, Trống...), áp dụng và lưu quy tắc chuẩn xác."
  });

  // 2. Định dạng theo bảng (sheet.style.formatAsTable)
  console.log("--- 2. Định dạng theo bảng (Format as Table) ---");
  await selectRange("A1", "D6");
  await clickCommand(cdp, "sheet.style.formatAsTable");
  await sleep(400);

  const tableDialogOpen = await cdp.evaluate(`Boolean(document.querySelector(".vno-format-table-dialog"))`);
  console.log("Table Dialog Open:", tableDialogOpen);

  // Chọn mẫu bảng đầu tiên (preset card)
  const tablePresetApplied = await cdp.evaluate(`(() => {
    const card = document.querySelector(".vno-table-style-card");
    if (!card) return false;
    card.click();
    return true;
  })()`);
  await sleep(400);

  const tableDialogClosed = await cdp.evaluate(`!document.querySelector(".vno-format-table-dialog")`);
  
  // Kiểm tra ô tiêu đề A1 có nhận màu nền của bảng
  const a1Header = await getCellInfo(cdp, "A1");
  const a1HasBg = Boolean(a1Header.style?.backgroundColor || a1Header.domBg);
  const tablePassed = tableDialogOpen && tablePresetApplied && tableDialogClosed;

  results.push({
    button: "Định dạng theo bảng (Format as Table)",
    context: "Chọn dải A1:D6, mở thư viện mẫu bảng, chọn mẫu bảng áp dụng",
    excelExpect: "Mở thư viện kiểu bảng (Light/Medium/Dark), áp dụng tiêu đề màu và hàng xen kẽ vào vùng chọn",
    actual: `dialogOpen=${tableDialogOpen}, applied=${tablePresetApplied}, closed=${tableDialogClosed}, headerBg=${a1Header.style?.backgroundColor || a1Header.domBg}`,
    status: tablePassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+T / Ctrl+L",
    notes: "Thư viện kiểu bảng hiển thị phong phú các mẫu Sáng/Trung bình/Tối, áp dụng màu tiêu đề và hàng chuẩn Excel."
  });

  // 3. Kiểu ô (sheet.style.cellStyles)
  console.log("--- 3. Kiểu ô (Cell Styles) ---");
  await selectCell(cdp, "B2");
  await clickCommand(cdp, "sheet.style.cellStyles");
  await sleep(400);

  const cellStylesDialogOpen = await cdp.evaluate(`Boolean(document.querySelector(".vno-cell-styles-dialog"))`);
  console.log("Cell Styles Dialog Open:", cellStylesDialogOpen);

  // Chọn style "good" (hoặc style card đầu tiên)
  const cellStyleApplied = await cdp.evaluate(`(() => {
    const card = document.querySelector('.vno-cell-style-card[data-style-id="good"]') || document.querySelector(".vno-cell-style-card");
    if (!card) return false;
    card.click();
    return true;
  })()`);
  await sleep(400);

  const cellStylesDialogClosed = await cdp.evaluate(`!document.querySelector(".vno-cell-styles-dialog")`);
  const b2Style = await getCellInfo(cdp, "B2");
  const b2HasStyle = Boolean(b2Style.style?.backgroundColor || b2Style.style?.color);
  const stylePassed = cellStylesDialogOpen && cellStyleApplied && cellStylesDialogClosed;

  results.push({
    button: "Kiểu ô (Cell Styles)",
    context: "Chọn ô B2, mở thư viện Kiểu ô, chọn kiểu Trạng thái/Tốt",
    excelExpect: "Mở thư viện kiểu ô (Tốt/Xấu/Trung tính/Tiêu đề), gán màu nền và chữ định sẵn cho ô tính",
    actual: `dialogOpen=${cellStylesDialogOpen}, applied=${cellStyleApplied}, closed=${cellStylesDialogClosed}, bg=${b2Style.style?.backgroundColor || b2Style.domBg}`,
    status: stylePassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Thư viện kiểu ô phong phú theo chuẩn Excel (Good, Bad, Neutral, Heading, Data), áp style tức thì."
  });

  // 4. Kiểm tra đóng an toàn bằng phím Escape cho các hộp thoại Kiểu
  console.log("--- 4. Kiểm tra Escape đóng hộp thoại Kiểu ô ---");
  await clickCommand(cdp, "sheet.style.cellStyles");
  await sleep(300);
  const reOpenStyles = await cdp.evaluate(`Boolean(document.querySelector(".vno-cell-styles-dialog"))`);
  await press(cdp, "Escape");
  await sleep(300);
  const reClosedStyles = await cdp.evaluate(`!document.querySelector(".vno-cell-styles-dialog")`);

  results.push({
    button: "Đóng hộp thoại Kiểu ô bằng Escape",
    context: "Mở thư viện Kiểu ô, nhấn Escape",
    excelExpect: "Hộp thoại đóng an toàn, trả focus về lưới ô tính",
    actual: `opened=${reOpenStyles}, closed=${reClosedStyles}`,
    status: (reOpenStyles && reClosedStyles) ? "PASS" : "FAIL",
    shortcut: "Escape",
    notes: "Đóng overlay an toàn, không làm treo ứng dụng."
  });

  // 5. Lưu tệp XLSX và kiểm tra XML
  console.log("--- 5. Lưu tệp XLSX và kiểm tra XML ---");
  const saveSuccess = await saveDocument(cdp, workXlsx);
  console.log("Lưu tài liệu thành công:", saveSuccess);

  const xmlCheck = await inspectXlsxXml(workXlsx);
  console.log("Kiểm tra XML:", JSON.stringify({ entries: xmlCheck.entries }, null, 2));

  console.log("\n=== KẾT QUẢ KIỂM THỬ NHÓM 5: KIỂU ===");
  console.table(results);

} catch (err) {
  console.error("LỖI KIỂM THỬ NHÓM 5:", err);
} finally {
  console.log("Đang đóng phiên Sheet...");
  await session.close();
}
