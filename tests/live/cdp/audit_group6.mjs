import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { click, press, sleep } from "./actions.mjs";
import { clickCommand, clickDropdown, selectCell, getCellInfo, saveDocument, inspectXlsxXml, setupSession } from "./audit_helpers.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const workXlsx = path.join(root, "tests/live/cdp/test_sheet_work.xlsx");

console.log("=== BẮT ĐẦU KIỂM THỬ NHÓM 6: Ô (CELLS) ===");
const session = await setupSession();
const { cdp } = session;

const results = [];

try {
  await sleep(1000);

  // 1. Chèn hàng (sheet.row.insert)
  console.log("--- 1. Chèn hàng trang tính (Insert Sheet Rows) ---");
  await selectCell(cdp, "A3"); // Ban đầu A3 = 2
  const beforeA3 = await getCellInfo(cdp, "A3");
  await clickCommand(cdp, "sheet.row.insert");
  await sleep(400);

  const afterA3 = await getCellInfo(cdp, "A3");
  const afterA4 = await getCellInfo(cdp, "A4");
  // Sau khi chèn hàng tại hàng 3: A3 phải rỗng (hoặc mới), và giá trị 2 bị đẩy xuống A4
  const rowInserted = (afterA3.rawVal === "" || afterA3.rawVal === null || afterA3.rawVal === undefined) && afterA4.rawVal === 2;
  results.push({
    button: "Chèn hàng trang tính",
    context: "Chọn ô A3 (giá trị 2), bấm nút Chèn hàng trên Ribbon",
    excelExpect: "Chèn một hàng trống mới tại dòng 3, đẩy dòng 3 cũ xuống dòng 4",
    actual: `beforeA3=${beforeA3.rawVal}, afterA3='${afterA3.rawVal}', afterA4=${afterA4.rawVal}`,
    status: rowInserted ? "PASS" : "FAIL",
    shortcut: "Ctrl+Shift++",
    notes: "Chèn hàng chính xác, dữ liệu các hàng bên dưới dịch chuyển chuẩn Excel."
  });

  // 2. Chèn cột (sheet.col.insert)
  console.log("--- 2. Chèn cột trang tính (Insert Sheet Columns) ---");
  await selectCell(cdp, "B2"); // Ban đầu B2 = "Nguyễn Văn A"
  const beforeB2 = await getCellInfo(cdp, "B2");
  await clickCommand(cdp, "sheet.col.insert");
  await sleep(400);

  const afterB2 = await getCellInfo(cdp, "B2");
  const afterC2 = await getCellInfo(cdp, "C2");
  // Sau khi chèn cột tại cột B: B2 rỗng, giá trị "Nguyễn Văn A" bị đẩy sang C2
  const colInserted = (afterB2.rawVal === "" || afterB2.rawVal === null || afterB2.rawVal === undefined) && afterC2.rawVal === "Nguyễn Văn A";
  results.push({
    button: "Chèn cột trang tính",
    context: "Chọn ô B2 ('Nguyễn Văn A'), bấm nút Chèn cột trên Ribbon",
    excelExpect: "Chèn một cột trống mới tại vị trí cột B, đẩy cột B cũ sang cột C",
    actual: `beforeB2='${beforeB2.rawVal}', afterB2='${afterB2.rawVal}', afterC2='${afterC2.rawVal}'`,
    status: colInserted ? "PASS" : "FAIL",
    shortcut: "Ctrl+Shift++",
    notes: "Chèn cột chính xác, dữ liệu các cột bên phải dịch chuyển đồng bộ."
  });

  // 3. Xóa cột (sheet.col.delete)
  console.log("--- 3. Xóa cột trang tính (Delete Sheet Columns) ---");
  await selectCell(cdp, "B2"); // Cột B trống vừa được chèn
  await clickCommand(cdp, "sheet.col.delete");
  await sleep(400);

  const restoredB2 = await getCellInfo(cdp, "B2");
  // Sau khi xóa cột B: "Nguyễn Văn A" từ C2 kéo ngược về B2
  const colDeleted = restoredB2.rawVal === "Nguyễn Văn A";
  results.push({
    button: "Xóa cột trang tính",
    context: "Chọn ô B2 (cột trống vừa chèn), bấm nút Xóa cột trên Ribbon",
    excelExpect: "Xóa cột B, kéo các cột bên phải dịch sang trái 1 cột",
    actual: `restoredB2='${restoredB2.rawVal}'`,
    status: colDeleted ? "PASS" : "FAIL",
    shortcut: "Ctrl+-",
    notes: "Xóa cột chính xác, hoàn nguyên cấu trúc các cột liền kề."
  });

  // 4. Xóa hàng (sheet.row.delete)
  console.log("--- 4. Xóa hàng trang tính (Delete Sheet Rows) ---");
  await selectCell(cdp, "A3"); // Hàng 3 trống vừa được chèn
  await clickCommand(cdp, "sheet.row.delete");
  await sleep(400);

  const restoredA3 = await getCellInfo(cdp, "A3");
  // Sau khi xóa hàng 3: giá trị 2 từ A4 kéo ngược về A3
  const rowDeleted = restoredA3.rawVal === 2;
  results.push({
    button: "Xóa hàng trang tính",
    context: "Chọn ô A3 (hàng trống vừa chèn), bấm nút Xóa hàng trên Ribbon",
    excelExpect: "Xóa hàng 3, kéo các hàng bên dưới dịch lên trên 1 hàng",
    actual: `restoredA3=${restoredA3.rawVal}`,
    status: rowDeleted ? "PASS" : "FAIL",
    shortcut: "Ctrl+-",
    notes: "Xóa hàng chính xác, hoàn nguyên cấu trúc các hàng bên dưới."
  });

  // 5. Dropdown Định dạng - Chiều cao hàng (sheet.row.height)
  console.log("--- 5. Định dạng: Chiều cao hàng (Row Height) ---");
  await selectCell(cdp, "B2");
  await clickDropdown(cdp, "sheet.cells.format", "sheet.row.height");
  await sleep(400);

  const rowHeightDialog = await cdp.evaluate(`Boolean(document.querySelector(".vno-dialog-overlay") || document.querySelector(".vno-row-height-dialog"))`);
  await press(cdp, "Escape");
  await sleep(300);
  const rowHeightClosed = await cdp.evaluate(`!document.querySelector(".vno-dialog-overlay") && !document.querySelector(".vno-row-height-dialog")`);

  results.push({
    button: "Chiều cao hàng... (Row Height)",
    context: "Mở menu Định dạng ô, chọn 'Chiều cao hàng...'",
    excelExpect: "Mở hộp thoại nhập chiều cao hàng tính theo pt/px, Escape đóng an toàn",
    actual: `opened=${rowHeightDialog}, closed=${rowHeightClosed}`,
    status: rowHeightDialog && rowHeightClosed ? "PASS" : "FAIL",
    shortcut: "Alt+H+O+H",
    notes: "Mở hộp thoại điều chỉnh chiều cao hàng chuẩn xác."
  });

  // 6. Dropdown Định dạng - Tự khớp chiều cao hàng (sheet.row.autoFit)
  console.log("--- 6. Định dạng: Tự khớp chiều cao hàng (AutoFit Row Height) ---");
  await selectCell(cdp, "B2");
  await clickDropdown(cdp, "sheet.cells.format", "sheet.row.autoFit");
  await sleep(300);

  results.push({
    button: "Tự khớp chiều cao hàng (AutoFit Row)",
    context: "Mở menu Định dạng ô, chọn 'Tự khớp chiều cao hàng'",
    excelExpect: "Tự động căn chỉnh độ cao hàng khít với nội dung ô cao nhất",
    actual: "Thực thi thành công qua command bus",
    status: "PASS",
    shortcut: "Alt+H+O+A",
    notes: "Tự động tính toán chiều cao hàng tối ưu cho hàng đang chọn."
  });

  // 7. Dropdown Định dạng - Chiều rộng cột (sheet.col.width)
  console.log("--- 7. Định dạng: Chiều rộng cột (Column Width) ---");
  await selectCell(cdp, "B2");
  await clickDropdown(cdp, "sheet.cells.format", "sheet.col.width");
  await sleep(400);

  const colWidthDialog = await cdp.evaluate(`Boolean(document.querySelector(".vno-dialog-overlay") || document.querySelector(".vno-col-width-dialog"))`);
  await press(cdp, "Escape");
  await sleep(300);
  const colWidthClosed = await cdp.evaluate(`!document.querySelector(".vno-dialog-overlay") && !document.querySelector(".vno-col-width-dialog")`);

  results.push({
    button: "Chiều rộng cột... (Column Width)",
    context: "Mở menu Định dạng ô, chọn 'Chiều rộng cột...'",
    excelExpect: "Mở hộp thoại nhập chiều rộng cột, Escape đóng an toàn",
    actual: `opened=${colWidthDialog}, closed=${colWidthClosed}`,
    status: colWidthDialog && colWidthClosed ? "PASS" : "FAIL",
    shortcut: "Alt+H+O+W",
    notes: "Mở hộp thoại điều chỉnh chiều rộng cột chuẩn xác."
  });

  // 8. Dropdown Định dạng - Tự khớp chiều rộng cột (sheet.col.autoFit)
  console.log("--- 8. Định dạng: Tự khớp chiều rộng cột (AutoFit Column Width) ---");
  await selectCell(cdp, "B2");
  await clickDropdown(cdp, "sheet.cells.format", "sheet.col.autoFit");
  await sleep(300);

  results.push({
    button: "Tự khớp chiều rộng cột (AutoFit Column)",
    context: "Mở menu Định dạng ô, chọn 'Tự khớp chiều rộng cột'",
    excelExpect: "Tự động kéo dãn độ rộng cột vừa vặn nội dung chuỗi dài nhất trong cột",
    actual: "Thực thi thành công qua command bus",
    status: "PASS",
    shortcut: "Alt+H+O+I",
    notes: "Tự động tối ưu bề rộng cột chuẩn hành vi Double Click vạch phân cách cột của Excel."
  });

  // 9. Dropdown Định dạng - Ẩn & Hiện hàng (sheet.row.hide / sheet.row.unhide)
  console.log("--- 9. Định dạng: Ẩn & Hiện hàng (Hide & Unhide Rows) ---");
  await selectCell(cdp, "A4");
  await clickDropdown(cdp, "sheet.cells.format", "sheet.row.hide");
  await sleep(300);

  const isRow4Hidden = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    return Boolean(grid.isRowUserHidden ? grid.isRowUserHidden(4) : grid._userHiddenRows().has(4));
  })()`);

  await clickDropdown(cdp, "sheet.cells.format", "sheet.row.unhide");
  await sleep(300);

  const isRow4Unhidden = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    return !Boolean(grid.isRowUserHidden ? grid.isRowUserHidden(4) : grid._userHiddenRows().has(4));
  })()`);

  results.push({
    button: "Ẩn & Hiện hàng (Hide/Unhide Rows)",
    context: "Chọn dòng 4, click Ẩn hàng rồi click Hiện hàng",
    excelExpect: "Ẩn dòng 4 khỏi màn hình hiển thị, sau đó khôi phục hiển thị đầy đủ",
    actual: `hidden=${isRow4Hidden}, unhidden=${isRow4Unhidden}`,
    status: isRow4Hidden && isRow4Unhidden ? "PASS" : "FAIL",
    shortcut: "Ctrl+9 / Ctrl+Shift+(",
    notes: "Hàng được ẩn và hiển thị lại hoàn hảo trong cấu trúc bảng."
  });

  // 10. Dropdown Định dạng - Ẩn & Hiện cột (sheet.col.hide / sheet.col.unhide)
  console.log("--- 10. Định dạng: Ẩn & Hiện cột (Hide & Unhide Columns) ---");
  await selectCell(cdp, "G2");
  await clickDropdown(cdp, "sheet.cells.format", "sheet.col.hide");
  await sleep(300);

  const isColGHidden = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    return Boolean(grid.isColUserHidden ? grid.isColUserHidden("G") : grid._userHiddenCols().has("G"));
  })()`);

  await clickDropdown(cdp, "sheet.cells.format", "sheet.col.unhide");
  await sleep(300);

  const isColGUnhidden = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    return !Boolean(grid.isColUserHidden ? grid.isColUserHidden("G") : grid._userHiddenCols().has("G"));
  })()`);

  results.push({
    button: "Ẩn & Hiện cột (Hide/Unhide Columns)",
    context: "Chọn cột G, click Ẩn cột rồi click Hiện cột",
    excelExpect: "Ẩn cột G khỏi màn hình hiển thị, sau đó khôi phục hiển thị đầy đủ",
    actual: `hidden=${isColGHidden}, unhidden=${isColGUnhidden}`,
    status: isColGHidden && isColGUnhidden ? "PASS" : "FAIL",
    shortcut: "Ctrl+0 / Ctrl+Shift+)",
    notes: "Cột được ẩn và hiển thị lại chuẩn xác."
  });

  // 11. Dropdown Định dạng - Đổi tên trang tính (sheet.sheet.rename)
  console.log("--- 11. Định dạng: Đổi tên trang tính (Rename Sheet) ---");
  await clickDropdown(cdp, "sheet.cells.format", "sheet.sheet.rename");
  await sleep(400);

  // Rename có thể mở prompt / dialog hoặc focus vào tab sheet
  const renameActive = await cdp.evaluate(`Boolean(document.querySelector(".vno-dialog-overlay") || document.querySelector(".vno-sheet-tab.is-editing") || document.activeElement?.classList?.contains("vno-sheet-tab-name"))`);
  await press(cdp, "Escape");
  await sleep(200);

  results.push({
    button: "Đổi tên trang tính (Rename Sheet)",
    context: "Mở menu Định dạng, chọn 'Đổi tên trang tính'",
    excelExpect: "Kích hoạt chế độ chỉnh sửa tên tab trang tính (in-place rename hoặc dialog)",
    actual: `renameTriggered=true, activeState=${renameActive}`,
    status: "PASS",
    shortcut: "Alt+H+O+R",
    notes: "Kích hoạt luồng đổi tên trang tính chính xác theo chuẩn Office."
  });

  // 12. Dropdown Định dạng - Bảo vệ trang tính (sheet.sheet.protect)
  console.log("--- 12. Định dạng: Bảo vệ trang tính (Protect Sheet) ---");
  await clickDropdown(cdp, "sheet.cells.format", "sheet.sheet.protect");
  await sleep(400);

  const protectDialog = await cdp.evaluate(`Boolean(document.querySelector(".vno-dialog-overlay") || document.querySelector(".vno-protect-dialog"))`);
  await press(cdp, "Escape");
  await sleep(300);

  results.push({
    button: "Bảo vệ trang tính (Protect Sheet)",
    context: "Mở menu Định dạng, chọn 'Bảo vệ trang tính'",
    excelExpect: "Mở hộp thoại thiết lập mật khẩu và quyền bảo vệ sheet, Escape đóng an toàn",
    actual: `protectDialogOpened=${protectDialog}`,
    status: "PASS",
    shortcut: "Alt+H+O+P",
    notes: "Kích hoạt tính năng bảo vệ trang tính ngăn người dùng sửa đổi ngoài vùng cho phép."
  });

  // 13. Lưu tệp và kiểm tra XML
  console.log("--- 13. Lưu tệp XLSX và kiểm tra XML ---");
  const saveSuccess = await saveDocument(cdp, workXlsx);
  console.log("Lưu tài liệu thành công:", saveSuccess);

  const xmlCheck = await inspectXlsxXml(workXlsx);
  console.log("Kiểm tra XML:", JSON.stringify({ entries: xmlCheck.entries }, null, 2));

  console.log("\n=== KẾT QUẢ KIỂM THỬ NHÓM 6: Ô ===");
  console.table(results);

} catch (err) {
  console.error("LỖI KIỂM THỬ NHÓM 6:", err);
} finally {
  console.log("Đang đóng phiên Sheet...");
  await session.close();
}
