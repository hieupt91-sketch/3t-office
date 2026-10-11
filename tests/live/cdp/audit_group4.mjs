import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { click, press, sleep } from "./actions.mjs";
import { clickCommand, selectCell, getCellInfo, saveDocument, inspectXlsxXml, setupSession } from "./audit_helpers.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const workXlsx = path.join(root, "tests/live/cdp/test_sheet_work.xlsx");

console.log("=== BẮT ĐẦU KIỂM THỬ NHÓM 4: SỐ (NUMBER FORMATTING) ===");
const session = await setupSession();
const { cdp } = session;

const results = [];

try {
  await sleep(1000);

  // Helper để đổi giá trị select quickCategory trên Ribbon
  async function setQuickCategory(category) {
    return await cdp.evaluate(`(() => {
      const select = document.querySelector('select[data-command-id="sheet.format.quickCategory"]');
      if (!select) return { error: "select_not_found" };
      select.value = "${category}";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return { success: true, val: select.value };
    })()`);
  }

  // 1. Dropdown Định dạng số: Chung (General)
  console.log("--- 1. Dropdown: Chung (General) ---");
  await selectCell(cdp, "C2");
  await setQuickCategory("general");
  await sleep(300);
  const c2Gen = await getCellInfo(cdp, "C2");
  const genPassed = c2Gen.rawVal === 1234.5 && (!c2Gen.numFmt || c2Gen.numFmt.category === "general");
  results.push({
    button: "Định dạng Chung (General)",
    context: "Ô C2 (1234.5), chọn định dạng Chung từ dropdown",
    excelExpect: "Hiển thị số tự nhiên 1234.5, raw value giữ nguyên 1234.5",
    actual: `rawVal=${c2Gen.rawVal}, text='${c2Gen.domText}', cat=${c2Gen.numFmt?.category || 'general'}`,
    status: genPassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+Shift+~",
    notes: "Raw value 1234.5 không bị thay đổi, hiển thị chuẩn General."
  });

  // 2. Dropdown Định dạng số: Số (Number)
  console.log("--- 2. Dropdown: Số (Number) ---");
  await selectCell(cdp, "C2");
  await setQuickCategory("number");
  await sleep(300);
  const c2Num = await getCellInfo(cdp, "C2");
  const numPassed = c2Num.rawVal === 1234.5 && c2Num.numFmt?.category === "number" && c2Num.domText.includes("1,234.50");
  results.push({
    button: "Định dạng Số (Number)",
    context: "Ô C2 (1234.5), chọn định dạng Số từ dropdown",
    excelExpect: "Hiển thị '1,234.50' (2 thập phân, dấu phẩy nghìn), raw value giữ nguyên 1234.5",
    actual: `rawVal=${c2Num.rawVal}, text='${c2Num.domText}', cat=${c2Num.numFmt?.category}`,
    status: numPassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Đo kỹ: raw value giữ 1234.5 không bị làm tròn thành chuỗi, hiển thị '1,234.50'."
  });

  // 3. Dropdown Định dạng số: Tiền tệ (Currency)
  console.log("--- 3. Dropdown: Tiền tệ (Currency) ---");
  await selectCell(cdp, "C2");
  await setQuickCategory("currency");
  await sleep(300);
  const c2Cur = await getCellInfo(cdp, "C2");
  const curPassed = c2Cur.rawVal === 1234.5 && c2Cur.numFmt?.category === "currency" && c2Cur.domText.includes("₫");
  results.push({
    button: "Định dạng Tiền tệ (Currency)",
    context: "Ô C2 (1234.5), chọn định dạng Tiền tệ từ dropdown",
    excelExpect: "Hiển thị '1,234.50 ₫', raw value giữ nguyên 1234.5",
    actual: `rawVal=${c2Cur.rawVal}, text='${c2Cur.domText}', cat=${c2Cur.numFmt?.category}`,
    status: curPassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Raw value giữ nguyên 1234.5, ký hiệu tiền tệ ₫ hiển thị chuẩn."
  });

  // 4. Dropdown Định dạng số: Kế toán (Accounting)
  console.log("--- 4. Dropdown: Kế toán (Accounting) ---");
  await selectCell(cdp, "C2");
  await setQuickCategory("accounting");
  await sleep(300);
  const c2Acc = await getCellInfo(cdp, "C2");
  const accPassed = c2Acc.rawVal === 1234.5 && c2Acc.numFmt?.category === "accounting" && c2Acc.domText.includes("₫");
  results.push({
    button: "Định dạng Kế toán (Accounting)",
    context: "Ô C2 (1234.5), chọn định dạng Kế toán từ dropdown",
    excelExpect: "Hiển thị định dạng kế toán (₫ căn lề, 1,234.50), raw value giữ nguyên 1234.5",
    actual: `rawVal=${c2Acc.rawVal}, text='${c2Acc.domText}', cat=${c2Acc.numFmt?.category}`,
    status: accPassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Raw value giữ nguyên 1234.5, định dạng Kế toán chuẩn Excel."
  });

  // 5. Dropdown Định dạng số: Phần trăm (Percentage)
  console.log("--- 5. Dropdown: Phần trăm (Percentage) ---");
  await selectCell(cdp, "D2"); // D2 có giá trị 0.075
  await setQuickCategory("percentage");
  await sleep(300);
  const d2Pct = await getCellInfo(cdp, "D2");
  // 0.075 * 100 = 7.5%, với 2 decimals là 7.50%
  const pctPassed = d2Pct.rawVal === 0.075 && d2Pct.numFmt?.category === "percentage" && d2Pct.domText.includes("7.50%");
  results.push({
    button: "Định dạng Phần trăm (Percentage)",
    context: "Ô D2 (0.075), chọn định dạng Phần trăm từ dropdown",
    excelExpect: "0.075 hiển thị '7.50%' (hoặc '7.5%'), raw value giữ nguyên 0.075",
    actual: `rawVal=${d2Pct.rawVal}, text='${d2Pct.domText}', cat=${d2Pct.numFmt?.category}`,
    status: pctPassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+Shift+%",
    notes: "Đo kỹ: raw value giữ 0.075, hiển thị chuẩn 7.50%."
  });

  // 6. Dropdown Định dạng số: Ngày (Date)
  console.log("--- 6. Dropdown: Ngày (Date) ---");
  await selectCell(cdp, "E2"); // E2 có giá trị 45000
  await setQuickCategory("date");
  await sleep(300);
  const e2Date = await getCellInfo(cdp, "E2");
  // Serial 45000 là 15/03/2023
  const datePassed = e2Date.rawVal === 45000 && e2Date.numFmt?.category === "date" && e2Date.domText.includes("15/03/2023");
  results.push({
    button: "Định dạng Ngày (Date)",
    context: "Ô E2 (serial 45000), chọn định dạng Ngày từ dropdown",
    excelExpect: "Serial 45000 hiển thị '15/03/2023' (định dạng Việt Nam dd/mm/yyyy), raw value giữ nguyên 45000",
    actual: `rawVal=${e2Date.rawVal}, text='${e2Date.domText}', cat=${e2Date.numFmt?.category}`,
    status: datePassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+Shift+#",
    notes: "Đo kỹ: raw value giữ nguyên số serial 45000, hiển thị đúng ngày Việt Nam 15/03/2023."
  });

  // 7. Dropdown Định dạng số: Khoa học (Scientific)
  console.log("--- 7. Dropdown: Khoa học (Scientific) ---");
  await selectCell(cdp, "C2");
  await setQuickCategory("scientific");
  await sleep(300);
  const c2Sci = await getCellInfo(cdp, "C2");
  const sciPassed = c2Sci.rawVal === 1234.5 && c2Sci.numFmt?.category === "scientific" && /1\.23E\+0?3/i.test(c2Sci.domText);
  results.push({
    button: "Định dạng Khoa học (Scientific)",
    context: "Ô C2 (1234.5), chọn định dạng Khoa học từ dropdown",
    excelExpect: "Hiển thị ký hiệu số mũ '1.23E+03', raw value giữ nguyên 1234.5",
    actual: `rawVal=${c2Sci.rawVal}, text='${c2Sci.domText}', cat=${c2Sci.numFmt?.category}`,
    status: sciPassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+Shift+^",
    notes: "Hiển thị số mũ chuẩn khoa học, raw value không bị biến dạng."
  });

  // 8. Dropdown Định dạng số: Văn bản (Text)
  console.log("--- 8. Dropdown: Văn bản (Text) ---");
  await selectCell(cdp, "C2");
  await setQuickCategory("text");
  await sleep(300);
  const c2Txt = await getCellInfo(cdp, "C2");
  const txtPassed = c2Txt.numFmt?.category === "text" && c2Txt.style?.textAlign === "left";
  results.push({
    button: "Định dạng Văn bản (Text)",
    context: "Ô C2 (1234.5), chọn định dạng Văn bản từ dropdown",
    excelExpect: "Căn lề trái, hiển thị dạng văn bản thô",
    actual: `rawVal=${c2Txt.rawVal}, text='${c2Txt.domText}', cat=${c2Txt.numFmt?.category}, align=${c2Txt.style?.textAlign}`,
    status: txtPassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+Shift+@",
    notes: "Chuyển ô sang chế độ văn bản, căn lề trái tự động."
  });

  // 9. Nút Tiền tệ VND (sheet.format.currencyVND)
  console.log("--- 9. Nút Tiền tệ VND ---");
  await selectCell(cdp, "C3"); // 5678.9
  await clickCommand(cdp, "sheet.format.currencyVND");
  await sleep(300);
  const c3Vnd = await getCellInfo(cdp, "C3");
  const vndPassed = c3Vnd.rawVal === 5678.9 && c3Vnd.numFmt?.category === "currency" && c3Vnd.numFmt?.currencySymbol === "₫" && c3Vnd.domText.includes("₫");
  results.push({
    button: "Định dạng Tiền tệ VND",
    context: "Ô C3 (5678.9), bấm nút Tiền tệ VND trên Ribbon",
    excelExpect: "Định dạng tiền tệ Việt Nam với ký hiệu ₫, raw value giữ nguyên 5678.9",
    actual: `rawVal=${c3Vnd.rawVal}, text='${c3Vnd.domText}', cat=${c3Vnd.numFmt?.category}`,
    status: vndPassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+Shift+4",
    notes: "Áp dụng định dạng tiền tệ VND tức thì với ký hiệu ₫."
  });

  // 10. Nút Phần trăm (sheet.format.percent)
  console.log("--- 10. Nút Phần trăm ---");
  await selectCell(cdp, "D3"); // 0.125
  await clickCommand(cdp, "sheet.format.percent");
  await sleep(300);
  const d3Pct = await getCellInfo(cdp, "D3");
  const pctBtnPassed = d3Pct.rawVal === 0.125 && d3Pct.numFmt?.category === "percentage" && d3Pct.domText.includes("12.50%");
  results.push({
    button: "Kiểu phần trăm (Percent Style)",
    context: "Ô D3 (0.125), bấm nút Phần trăm trên Ribbon",
    excelExpect: "0.125 chuyển thành 12.50%, raw value giữ nguyên 0.125",
    actual: `rawVal=${d3Pct.rawVal}, text='${d3Pct.domText}', cat=${d3Pct.numFmt?.category}`,
    status: pctBtnPassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+Shift+5",
    notes: "Nút % trên Ribbon hoạt động chuẩn xác, giữ nguyên raw value 0.125."
  });

  // 11. Dấu phân cách hàng nghìn (sheet.format.standard)
  console.log("--- 11. Dấu phân cách hàng nghìn (Standard Comma) ---");
  await selectCell(cdp, "C4"); // 2468
  await clickCommand(cdp, "sheet.format.standard");
  await sleep(300);
  const c4Std = await getCellInfo(cdp, "C4");
  const stdPassed = c4Std.rawVal === 2468 && c4Std.numFmt?.category === "number" && c4Std.numFmt?.useThousands === true && c4Std.domText.includes("2,468.00");
  results.push({
    button: "Dấu phân cách hàng nghìn (Comma Style)",
    context: "Ô C4 (2468), bấm nút Dấu phẩy trên Ribbon",
    excelExpect: "Hiển thị định dạng số có dấu phẩy phân cách hàng nghìn '2,468.00'",
    actual: `rawVal=${c4Std.rawVal}, text='${c4Std.domText}', useThousands=${c4Std.numFmt?.useThousands}`,
    status: stdPassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+Shift+!",
    notes: "Hiển thị dấu phẩy phân cách chuẩn Excel."
  });

  // 12. Tăng chữ số thập phân (sheet.format.increaseDecimal)
  console.log("--- 12. Tăng chữ số thập phân ---");
  // C4 đang có decimals: 2 (2,468.00)
  await selectCell(cdp, "C4");
  await clickCommand(cdp, "sheet.format.increaseDecimal");
  await sleep(300);
  const c4Inc = await getCellInfo(cdp, "C4");
  const incPassed = c4Inc.numFmt?.decimals === 3 && c4Inc.domText.includes("2,468.000");
  results.push({
    button: "Tăng chữ số thập phân",
    context: "Ô C4 (đang 2 chữ số thập phân), bấm nút Tăng chữ số thập phân",
    excelExpect: "Tăng số chữ số thập phân từ 2 lên 3, hiển thị '2,468.000', raw value giữ 2468",
    actual: `decimals=${c4Inc.numFmt?.decimals}, text='${c4Inc.domText}', rawVal=${c4Inc.rawVal}`,
    status: incPassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Tăng thập phân chính xác, giá trị ô không suy hao."
  });

  // 13. Giảm chữ số thập phân (sheet.format.decreaseDecimal)
  console.log("--- 13. Giảm chữ số thập phân ---");
  // C4 đang có decimals: 3, bấm giảm 2 lần -> decimals: 1
  await selectCell(cdp, "C4");
  await clickCommand(cdp, "sheet.format.decreaseDecimal");
  await sleep(200);
  await clickCommand(cdp, "sheet.format.decreaseDecimal");
  await sleep(300);
  const c4Dec = await getCellInfo(cdp, "C4");
  const decPassed = c4Dec.numFmt?.decimals === 1 && c4Dec.domText.includes("2,468.0");
  results.push({
    button: "Giảm chữ số thập phân",
    context: "Ô C4 (đang 3 chữ số thập phân), bấm nút Giảm chữ số thập phân 2 lần",
    excelExpect: "Giảm số chữ số thập phân từ 3 xuống 1, hiển thị '2,468.0', raw value giữ 2468",
    actual: `decimals=${c4Dec.numFmt?.decimals}, text='${c4Dec.domText}', rawVal=${c4Dec.rawVal}`,
    status: decPassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Giảm thập phân đúng nấc, raw value giữ nguyên vẹn 2468."
  });

  // 14. Launcher nhóm Số: Hộp thoại Định dạng ô (tab Số)
  console.log("--- 14. Launcher nhóm Số ---");
  await selectCell(cdp, "C2");
  const launcherClicked = await cdp.evaluate(`(() => {
    const btn = document.querySelector('.vno-ribbon-group[data-group-id="number"] .vno-ribbon-dialog-launcher');
    if (btn) { btn.click(); return true; }
    return false;
  })()`);
  await sleep(500);
  const dialogOpen = await cdp.evaluate(`Boolean(document.querySelector('.vno-format-cells-overlay'))`);

  // Đóng dialog an toàn bằng phím Escape
  await press(cdp, "Escape");
  await sleep(400);
  const dialogClosed = await cdp.evaluate(`!document.querySelector('.vno-format-cells-overlay')`);

  const launcherPassed = launcherClicked && dialogOpen && dialogClosed;
  results.push({
    button: "Launcher Định dạng ô (tab Số)",
    context: "Bấm nút launcher ở góc dưới phải nhóm Số",
    excelExpect: "Mở hộp thoại Định dạng ô (Format Cells) tab Số, phím Escape đóng an toàn",
    actual: `clicked=${launcherClicked}, opened=${dialogOpen}, closed=${dialogClosed}`,
    status: launcherPassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+1",
    notes: "Nút launcher góc nhóm mở đúng hộp thoại Định dạng ô chuẩn Office."
  });

  // 15. Kiểm tra phím tắt Ctrl+1 mở Format Cells
  console.log("--- 15. Phím tắt Ctrl+1 mở tab Số ---");
  await press(cdp, "1", { ctrl: true });
  await sleep(500);
  const ctrl1Open = await cdp.evaluate(`Boolean(document.querySelector('.vno-format-cells-overlay'))`);
  await press(cdp, "Escape");
  await sleep(400);

  results.push({
    button: "Phím tắt Ctrl+1",
    context: "Nhấn Ctrl+1 từ lưới ô tính",
    excelExpect: "Mở hộp thoại Định dạng ô tức thì",
    actual: `ctrl1Opened=${ctrl1Open}`,
    status: ctrl1Open ? "PASS" : "FAIL",
    shortcut: "Ctrl+1",
    notes: "Phím tắt Ctrl+1 hoạt động chính xác tương đương Excel."
  });

  // 16. Lưu tệp và kiểm tra XML
  console.log("--- 16. Lưu tệp XLSX và kiểm tra XML ---");
  const saveSuccess = await saveDocument(cdp, workXlsx);
  console.log("Lưu tài liệu thành công:", saveSuccess);

  const xmlCheck = await inspectXlsxXml(workXlsx);
  const sheetXml = xmlCheck.sheetXml || "";
  const stylesXml = xmlCheck.stylesXml || "";
  
  // Xác nhận ô C2, D2, E2 có raw values trong XML
  const hasRaw1234 = sheetXml.includes("1234.5");
  const hasRaw0075 = sheetXml.includes("0.075");
  const hasRaw45000 = sheetXml.includes("45000");

  console.log(`XML Raw Check: 1234.5=${hasRaw1234}, 0.075=${hasRaw0075}, 45000=${hasRaw45000}`);

  console.log("\n=== KẾT QUẢ KIỂM THỬ NHÓM 4: SỐ ===");
  console.table(results);

} catch (err) {
  console.error("LỖI KIỂM THỬ NHÓM 4:", err);
} finally {
  console.log("Đang đóng phiên Sheet...");
  await session.close();
}
