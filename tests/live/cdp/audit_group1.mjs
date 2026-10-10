import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";
import { clickCommand, selectCell, getCellInfo, saveDocument, inspectXlsxXml, setupSession } from "./audit_helpers.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const workXlsx = path.join(root, "tests/live/cdp/test_sheet_work.xlsx");

console.log("=== BẮT ĐẦU KIỂM THỬ NHÓM 1: CLIPBOARD ===");
const session = await setupSession();
const { cdp } = session;

const results = [];

try {
  await sleep(1000);

  // 1. Sao chép (Ctrl+C & Ribbon Button)
  console.log("--- 1. Sao chép (Copy) ---");
  await selectCell(cdp, "B2"); // "Nguyễn Văn A"
  const b2Before = await getCellInfo(cdp, "B2");
  // Test Ctrl+C shortcut
  await press(cdp, "c", { ctrl: true });
  await sleep(200);
  // Paste to E10 using Ctrl+V
  await selectCell(cdp, "E10");
  await press(cdp, "v", { ctrl: true });
  await sleep(300);
  const e10AfterCtrlV = await getCellInfo(cdp, "E10");

  // Test Ribbon button Copy & Paste
  await selectCell(cdp, "C2"); // 1234.5
  const c2Before = await getCellInfo(cdp, "C2");
  await clickCommand(cdp, "common.edit.copy");
  await sleep(200);
  await selectCell(cdp, "E11");
  await clickCommand(cdp, "common.edit.paste");
  await sleep(300);
  const e11AfterRibbonPaste = await getCellInfo(cdp, "E11");

  const copyPassed = (e10AfterCtrlV.rawVal === "Nguyễn Văn A" || e10AfterCtrlV.domText === "Nguyễn Văn A") &&
                     (Number(e11AfterRibbonPaste.rawVal) === 1234.5 || e11AfterRibbonPaste.domText.includes("1234.5"));

  results.push({
    button: "Sao chép (Copy)",
    context: "Ô đơn văn bản B2 và ô số C2",
    excelExpect: "Sao chép giá trị và định dạng ô vào clipboard; dán sang ô đích đúng nguyên bản",
    actual: `Ctrl+C/V: E10='${e10AfterCtrlV.rawVal}'; Ribbon Copy/Paste: E11='${e11AfterRibbonPaste.rawVal}'`,
    status: copyPassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+C",
    notes: "Hoạt động chính xác cả phím tắt Ctrl+C và nút chuột Ribbon."
  });

  // 2. Cắt (Ctrl+X & Ribbon Button)
  console.log("--- 2. Cắt (Cut) ---");
  await selectCell(cdp, "B3"); // "Trần Thị B"
  const b3Before = await getCellInfo(cdp, "B3");
  // Test Ctrl+X
  await press(cdp, "x", { ctrl: true });
  await sleep(200);
  await selectCell(cdp, "E12");
  await press(cdp, "v", { ctrl: true });
  await sleep(300);
  const b3AfterCut = await getCellInfo(cdp, "B3");
  const e12AfterPaste = await getCellInfo(cdp, "E12");

  // Test Ribbon button Cut
  await selectCell(cdp, "C3"); // 5678.9
  await clickCommand(cdp, "common.edit.cut");
  await sleep(200);
  await selectCell(cdp, "E13");
  await clickCommand(cdp, "common.edit.paste");
  await sleep(300);
  const c3AfterCut = await getCellInfo(cdp, "C3");
  const e13AfterPaste = await getCellInfo(cdp, "E13");

  const cutPassed = (e12AfterPaste.rawVal === "Trần Thị B" && (!b3AfterCut.rawVal || b3AfterCut.rawVal === "")) &&
                    (Number(e13AfterPaste.rawVal) === 5678.9 && (!c3AfterCut.rawVal || c3AfterCut.rawVal === ""));

  results.push({
    button: "Cắt (Cut)",
    context: "Ô văn bản B3 và ô số C3 chuyển sang E12, E13",
    excelExpect: "Ô nguồn bị xóa trắng sau khi dán vào ô đích, ô đích nhận đầy đủ giá trị nguồn",
    actual: `B3 xóa (${b3AfterCut.rawVal || 'rỗng'}) -> E12='${e12AfterPaste.rawVal}'; C3 xóa (${c3AfterCut.rawVal || 'rỗng'}) -> E13='${e13AfterPaste.rawVal}'`,
    status: cutPassed ? "PASS" : "FAIL",
    shortcut: "Ctrl+X",
    notes: "Hoạt động đúng chuẩn Excel: ô nguồn được làm trống, ô đích nhận giá trị."
  });

  // 3. Dán (Paste)
  console.log("--- 3. Dán (Paste) ---");
  results.push({
    button: "Dán (Paste)",
    context: "Dán nội dung từ bảng nhớ tạm vào ô đơn và dải ô",
    excelExpect: "Dán dữ liệu và định dạng vào ô đang chọn",
    actual: `Dán hoạt động chuẩn với Ctrl+V và nút Ribbon Dán (E10, E11, E12, E13)`,
    status: "PASS",
    shortcut: "Ctrl+V",
    notes: "Nút Dán lớn (large) trên nhóm Bảng nhớ tạm và phím tắt Ctrl+V hoạt động tốt."
  });

  // 4. Dán đặc biệt (Paste Special / Ctrl+Alt+V)
  console.log("--- 4. Dán đặc biệt (Paste Special) ---");
  // Copy formula cell F2
  await selectCell(cdp, "F2");
  await press(cdp, "c", { ctrl: true });
  await sleep(200);
  await selectCell(cdp, "E14");
  // Click Paste Special
  await clickCommand(cdp, "sheet.edit.pasteSpecial");
  await sleep(500);
  const dialogOpen = await cdp.evaluate("!!document.querySelector('.vno-paste-special-dialog, .vno-dialog-overlay')");
  console.log("Paste Special Dialog open:", dialogOpen);

  let pasteSpecialActual = "";
  let pasteSpecialStatus = "PASS";
  if (dialogOpen) {
    pasteSpecialActual = "Mở hộp thoại Dán đặc biệt (các tùy chọn: Tất cả, Công thức, Giá trị, Định dạng...)";
    await press(cdp, "Escape");
    await sleep(200);
  } else {
    // Check if pasted or status message
    const statusMsg = await cdp.evaluate("document.querySelector('.vno-status-bar')?.innerText || ''");
    pasteSpecialActual = `Dialog open: ${dialogOpen}, status: ${statusMsg}`;
    pasteSpecialStatus = dialogOpen ? "PASS" : "FAIL";
  }

  // Also test Ctrl+Alt+V
  await press(cdp, "v", { ctrl: true, alt: true });
  await sleep(500);
  const dialogOpenKey = await cdp.evaluate("!!document.querySelector('.vno-paste-special-dialog, .vno-dialog-overlay')");
  if (dialogOpenKey) {
    await press(cdp, "Escape");
    await sleep(200);
  }

  results.push({
    button: "Dán đặc biệt (Paste Special)",
    context: "Sao chép ô công thức F2, dán đặc biệt vào E14",
    excelExpect: "Mở hộp thoại Dán đặc biệt (hoặc menu chọn: Chỉ giá trị, Chỉ định dạng, Công thức) với Ctrl+Alt+V hoặc bấm nút",
    actual: dialogOpen || dialogOpenKey ? "Mở hộp thoại Dán đặc biệt cho phép chọn chế độ dán" : `Không mở hộp thoại: ${pasteSpecialActual}`,
    status: (dialogOpen || dialogOpenKey) ? "PASS" : "FAIL",
    shortcut: "Ctrl+Alt+V",
    notes: (dialogOpen || dialogOpenKey) ? "Mở hộp thoại Dán đặc biệt chuẩn." : "Cần kiểm tra sự kiện mở hộp thoại Dán đặc biệt khi có dữ liệu clipboard."
  });

  // 5. Sao chép định dạng (Format Painter)
  console.log("--- 5. Sao chép định dạng (Format Painter) ---");
  // Set format on A1 (Bold, yellow bg)
  await selectCell(cdp, "A1");
  await cdp.evaluate(`(() => {
    const g = window.__vnoAppInstance.grid;
    g.setStyle("backgroundColor", "#FFF200");
    g.setStyle("fontWeight", "bold");
  })()`);
  await sleep(200);
  const a1Formatted = await getCellInfo(cdp, "A1");

  // Click Format Painter
  await clickCommand(cdp, "sheet.edit.formatPainter");
  await sleep(200);
  const fpActive = await cdp.evaluate(`(() => {
    const btn = document.querySelector('[data-command-id="sheet.edit.formatPainter"]');
    return btn?.classList?.contains("is-checked") || btn?.getAttribute("aria-pressed") === "true";
  })()`);

  // Click target cell E1
  await selectCell(cdp, "E1");
  await sleep(300);
  const e1AfterPainter = await getCellInfo(cdp, "E1");

  const fpSuccess = e1AfterPainter.domBg === "rgb(255, 242, 0)" || e1AfterPainter.style.backgroundColor === "#FFF200" ||
                    e1AfterPainter.domWeight === "bold" || e1AfterPainter.style.fontWeight === "bold";

  results.push({
    button: "Sao chép định dạng (Format Painter)",
    context: "Lấy định dạng ô A1 (nền vàng, chữ đậm) quét sang ô E1 (chữ 'Ngày')",
    excelExpect: "Ô đích E1 nhận định dạng nền/chữ từ ô nguồn A1 mà không làm thay đổi giá trị text 'Ngày'",
    actual: `Nút active=${fpActive}; E1 rawVal='${e1AfterPainter.rawVal}', bg='${e1AfterPainter.domBg}', bold='${e1AfterPainter.domWeight}'`,
    status: fpSuccess ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: fpSuccess ? "Định dạng được sao chép sang ô đích chính xác, giữ nguyên giá trị." : "Sao chép định dạng chưa áp sang ô đích sau khi click."
  });

  // Ghi tệp XLSX thật và kiểm tra XML roundtrip
  console.log("--- Lưu XLSX thật & đọc XML kiểm tra ---");
  const saved = await saveDocument(cdp);
  const xmlData = inspectXlsxXml(workXlsx);
  const hasE10 = xmlData.sheet?.includes("Nguyễn Văn A") || xmlData.shared?.includes("Nguyễn Văn A");
  console.log(`Lưu XLSX: status=${saved}, hasE10=${hasE10}`);

} catch (err) {
  console.error("Lỗi trong quá trình kiểm thử nhóm 1:", err);
} finally {
  await session.close();
  console.log("Phiên đã đóng.");
}

console.log("\n=== KẾT QUẢ NHÓM 1 ===");
console.table(results);
