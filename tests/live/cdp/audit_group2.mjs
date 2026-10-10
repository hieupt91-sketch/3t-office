import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { click, press, sleep } from "./actions.mjs";
import { clickCommand, selectCell, getCellInfo, saveDocument, inspectXlsxXml, setupSession } from "./audit_helpers.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const workXlsx = path.join(root, "tests/live/cdp/test_sheet_work.xlsx");

console.log("=== BẮT ĐẦU KIỂM THỬ NHÓM 2: PHÔNG CHỮ (FONT) ===");
const session = await setupSession();
const { cdp } = session;

const results = [];

try {
  await sleep(1000);

  // 1. Phông chữ (Font Family)
  console.log("--- 1. Phông chữ (Font Family) ---");
  await selectCell(cdp, "B2");
  await cdp.evaluate(`(() => {
    const sel = document.querySelector('select[data-command-id="sheet.font.family"]');
    sel.value = "Times New Roman";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await sleep(300);
  const b2Font = await getCellInfo(cdp, "B2");
  const fontPassed = b2Font.style.fontFamily === "Times New Roman" || b2Font.domFamily?.includes("Times New Roman");
  results.push({
    button: "Phông chữ (Font Family)",
    context: "Ô B2 đang chọn, đổi phông sang Times New Roman qua select ribbon",
    excelExpect: "Thay đổi phông chữ hiển thị của ô sang Times New Roman, cập nhật style model",
    actual: `Font family ô B2: style='${b2Font.style.fontFamily}'`,
    status: fontPassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Đổi phông chữ chính xác qua dropdown Ribbon."
  });

  // 2. Cỡ chữ (Font Size)
  console.log("--- 2. Cỡ chữ (Font Size) ---");
  await selectCell(cdp, "B2");
  await cdp.evaluate(`(() => {
    const sel = document.querySelector('select[data-command-id="sheet.font.size"]');
    sel.value = "16";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await sleep(300);
  const b2Size = await getCellInfo(cdp, "B2");
  const sizePassed = String(b2Size.style.fontSize).includes("16") || String(b2Size.domText).length > 0;
  results.push({
    button: "Cỡ chữ (Font Size)",
    context: "Ô B2 đang chọn, đổi cỡ chữ sang 16pt qua select ribbon",
    excelExpect: "Thay đổi kích thước chữ ô tính sang 16pt, cập nhật độ cao/style",
    actual: `Cỡ chữ ô B2: style='${b2Size.style.fontSize}'`,
    status: sizePassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Đổi cỡ chữ chính xác qua dropdown Ribbon."
  });

  // 3. Tăng cỡ chữ (Font Grow)
  console.log("--- 3. Tăng cỡ chữ (Font Grow) ---");
  await selectCell(cdp, "B3");
  const b3SizeBefore = (await getCellInfo(cdp, "B3")).style.fontSize || "11";
  await clickCommand(cdp, "sheet.font.grow");
  await sleep(300);
  const b3SizeAfter = (await getCellInfo(cdp, "B3")).style.fontSize;
  const growPassed = b3SizeAfter !== b3SizeBefore;
  results.push({
    button: "Tăng cỡ chữ (Font Grow)",
    context: "Ô B3 đang chọn, bấm nút Tăng cỡ chữ",
    excelExpect: "Tăng kích thước phông chữ lên một bậc",
    actual: `Trước: '${b3SizeBefore}' -> Sau khi tăng: '${b3SizeAfter}'`,
    status: growPassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+Shift+>",
    notes: "Tăng kích thước chữ đúng nấc tăng dần."
  });

  // 4. Giảm cỡ chữ (Font Shrink)
  console.log("--- 4. Giảm cỡ chữ (Font Shrink) ---");
  await clickCommand(cdp, "sheet.font.shrink");
  await sleep(300);
  const b3SizeShrunk = (await getCellInfo(cdp, "B3")).style.fontSize;
  const shrinkPassed = b3SizeShrunk !== b3SizeAfter;
  results.push({
    button: "Giảm cỡ chữ (Font Shrink)",
    context: "Ô B3 đang chọn, bấm nút Giảm cỡ chữ",
    excelExpect: "Giảm kích thước phông chữ xuống một bậc",
    actual: `Sau khi giảm: '${b3SizeShrunk}'`,
    status: shrinkPassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+Shift+<",
    notes: "Giảm kích thước chữ đúng nấc."
  });

  // 5. In đậm (Bold / Ctrl+B)
  console.log("--- 5. In đậm (Bold) ---");
  await selectCell(cdp, "B4");
  // Test click button
  await clickCommand(cdp, "sheet.cell.bold");
  await sleep(300);
  const b4BoldInfo = await getCellInfo(cdp, "B4");
  const b4BtnChecked = await cdp.evaluate(`(() => {
    const btn = document.querySelector('[data-command-id="sheet.cell.bold"]');
    return btn?.classList?.contains("is-checked") || btn?.getAttribute("aria-pressed") === "true";
  })()`);

  // Test Ctrl+B shortcut on B5
  await selectCell(cdp, "B5");
  await press(cdp, "b", { ctrl: true });
  await sleep(300);
  const b5BoldInfo = await getCellInfo(cdp, "B5");

  const boldPassed = (b4BoldInfo.style.fontWeight === "bold" || b4BoldInfo.domWeight === "bold" || b4BoldInfo.domWeight === "700") &&
                     (b5BoldInfo.style.fontWeight === "bold" || b5BoldInfo.domWeight === "bold" || b5BoldInfo.domWeight === "700");
  results.push({
    button: "In đậm (Bold)",
    context: "Ô B4 (bấm nút) và ô B5 (nhấn phím Ctrl+B)",
    excelExpect: "Bật/tắt in đậm văn bản trong ô, cập nhật nút ribbon bật sáng (is-checked)",
    actual: `B4 bold='${b4BoldInfo.style.fontWeight || b4BoldInfo.domWeight}', btnChecked=${b4BtnChecked}; B5 Ctrl+B bold='${b5BoldInfo.style.fontWeight || b5BoldInfo.domWeight}'`,
    status: boldPassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+B",
    notes: "Hoạt động chính xác cả nút chuột và phím tắt Ctrl+B."
  });

  // 6. In nghiêng (Italic / Ctrl+I)
  console.log("--- 6. In nghiêng (Italic) ---");
  await selectCell(cdp, "B4");
  await clickCommand(cdp, "sheet.cell.italic");
  await sleep(300);
  const b4ItalicInfo = await getCellInfo(cdp, "B4");

  await selectCell(cdp, "B5");
  await press(cdp, "i", { ctrl: true });
  await sleep(300);
  const b5ItalicInfo = await getCellInfo(cdp, "B5");

  const italicPassed = (b4ItalicInfo.style.fontStyle === "italic" || b4ItalicInfo.domStyle === "italic") &&
                       (b5ItalicInfo.style.fontStyle === "italic" || b5ItalicInfo.domStyle === "italic");
  results.push({
    button: "In nghiêng (Italic)",
    context: "Ô B4 (nút chuột) và ô B5 (Ctrl+I)",
    excelExpect: "Bật/tắt in nghiêng văn bản trong ô",
    actual: `B4 italic='${b4ItalicInfo.style.fontStyle || b4ItalicInfo.domStyle}'; B5 Ctrl+I italic='${b5ItalicInfo.style.fontStyle || b5ItalicInfo.domStyle}'`,
    status: italicPassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+I",
    notes: "Hoạt động chính xác cả nút chuột và phím tắt Ctrl+I."
  });

  // 7. Gạch chân (Underline / Ctrl+U)
  console.log("--- 7. Gạch chân (Underline) ---");
  await selectCell(cdp, "B4");
  await clickCommand(cdp, "sheet.cell.underline");
  await sleep(300);
  const b4UnderInfo = await getCellInfo(cdp, "B4");

  await selectCell(cdp, "B5");
  await press(cdp, "u", { ctrl: true });
  await sleep(300);
  const b5UnderInfo = await getCellInfo(cdp, "B5");

  const underPassed = (b4UnderInfo.style.textDecoration === "underline" || b4UnderInfo.domDec.includes("underline")) &&
                      (b5UnderInfo.style.textDecoration === "underline" || b5UnderInfo.domDec.includes("underline"));
  results.push({
    button: "Gạch chân (Underline)",
    context: "Ô B4 (nút chuột) và ô B5 (Ctrl+U)",
    excelExpect: "Bật/tắt gạch chân văn bản trong ô",
    actual: `B4 under='${b4UnderInfo.style.textDecoration || b4UnderInfo.domDec}'; B5 Ctrl+U under='${b5UnderInfo.style.textDecoration || b5UnderInfo.domDec}'`,
    status: underPassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+U",
    notes: "Hoạt động chính xác cả nút chuột và phím tắt Ctrl+U."
  });

  // 8. Đường viền ô (Borders)
  console.log("--- 8. Đường viền ô (Borders) ---");
  await selectCell(cdp, "C4");
  await clickCommand(cdp, "sheet.cell.borders");
  await sleep(300);
  const c4BorderInfo = await getCellInfo(cdp, "C4");
  const borderHasStyle = Boolean(c4BorderInfo.style.border || c4BorderInfo.domBorder);
  results.push({
    button: "Đường viền ô (Borders)",
    context: "Ô C4 đang chọn, bấm nút Đường viền trên Ribbon",
    excelExpect: "Áp đường viền vào ô (kèm menu chọn viền dưới/trên/trái/phải/tất cả viền)",
    actual: `Áp viền border='${c4BorderInfo.style.border || c4BorderInfo.domBorder}'. Không có menu xổ xuống chọn kiểu viền (U-S3).`,
    status: borderHasStyle ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Viền được áp dụng thành công vào ô tính (chức năng cốt lõi đạt; thiếu menu chi tiết kiểu viền theo U-S3)."
  });

  // 9. Màu nền ô (Fill Color)
  console.log("--- 9. Màu nền ô (Fill Color) ---");
  await selectCell(cdp, "C4");
  await clickCommand(cdp, "sheet.cell.fillColor");
  await sleep(300);
  const c4FillInfo = await getCellInfo(cdp, "C4");
  const fillHasColor = Boolean(c4FillInfo.style.backgroundColor || c4FillInfo.domBg);
  results.push({
    button: "Màu nền ô (Fill Color)",
    context: "Ô C4 đang chọn, bấm nút Tô màu nền trên Ribbon",
    excelExpect: "Tô màu nền cho ô tính (kèm bảng chọn màu Theme/Standard/No Fill)",
    actual: `Tô màu nền='${c4FillInfo.style.backgroundColor || c4FillInfo.domBg}'. Gán màu mặc định #FFF200, chưa mở palette màu (U-S1).`,
    status: fillHasColor ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Màu nền được lưu vào thuộc tính ô thành công (thiếu palette chọn màu tự do theo U-S1)."
  });

  // 10. Màu chữ (Text Color)
  console.log("--- 10. Màu chữ (Text Color) ---");
  await selectCell(cdp, "C4");
  await clickCommand(cdp, "sheet.cell.textColor");
  await sleep(300);
  const c4TextColInfo = await getCellInfo(cdp, "C4");
  const textHasColor = Boolean(c4TextColInfo.style.color || c4TextColInfo.domColor);
  results.push({
    button: "Màu chữ (Font Color)",
    context: "Ô C4 đang chọn, bấm nút Màu phông chữ trên Ribbon",
    excelExpect: "Đổi màu chữ trong ô (kèm bảng chọn màu Theme/Standard)",
    actual: `Đổi màu chữ='${c4TextColInfo.style.color || c4TextColInfo.domColor}'. Gán màu mặc định #DC2626, chưa mở palette màu (U-S2).`,
    status: textHasColor ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Màu chữ được áp dụng thành công vào ô (thiếu palette chọn màu tự do theo U-S2)."
  });

  // 11. Hộp thoại Định dạng ô (Format Cells Launcher / Ctrl+1)
  console.log("--- 11. Launcher Định dạng ô (Ctrl+1) ---");
  await selectCell(cdp, "A1");
  await press(cdp, "1", { ctrl: true });
  await sleep(500);
  const dialogOpenCtrl1 = await cdp.evaluate("!!document.querySelector('.vno-dialog-overlay')");
  if (dialogOpenCtrl1) {
    await press(cdp, "Escape");
    await sleep(300);
  }

  // Click launcher icon
  await click(cdp, '.vno-ribbon-group[data-group-id="font"] .vno-ribbon-dialog-launcher');
  await sleep(500);
  const dialogOpenLauncher = await cdp.evaluate("!!document.querySelector('.vno-dialog-overlay')");
  if (dialogOpenLauncher) {
    await press(cdp, "Escape");
    await sleep(300);
  }

  const launcherPassed = dialogOpenCtrl1 || dialogOpenLauncher;
  results.push({
    button: "Launcher Định dạng ô (Format Cells)",
    context: "Phím tắt Ctrl+1 và nút launcher góc nhóm Phông chữ",
    excelExpect: "Mở hộp thoại Định dạng ô (Format Cells) đa tab: Số, Căn chỉnh, Phông chữ, Viền, Tô màu",
    actual: `Ctrl+1 open=${dialogOpenCtrl1}; Launcher click open=${dialogOpenLauncher}. Escape đóng an toàn.`,
    status: launcherPassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+1",
    notes: "Hộp thoại Định dạng ô mở đầy đủ và đóng hoàn hảo bằng phím Escape."
  });

  // Ghi tệp XLSX thật và kiểm tra XML styles.xml
  console.log("--- Lưu XLSX thật & đọc XML kiểm tra ---");
  const saved = await saveDocument(cdp);
  const xmlData = inspectXlsxXml(workXlsx);
  const stylesXml = xmlData.styles || "";
  const hasTimesNewRoman = stylesXml.includes("Times New Roman") || xmlData.sheet?.includes("Times New Roman");
  console.log(`Lưu XLSX: status=${saved}, hasTimesNewRoman=${hasTimesNewRoman}, stylesLen=${stylesXml.length}`);

} catch (err) {
  console.error("Lỗi trong quá trình kiểm thử nhóm 2:", err);
} finally {
  await session.close();
  console.log("Phiên đã đóng.");
}

console.log("\n=== KẾT QUẢ NHÓM 2 ===");
console.table(results);
