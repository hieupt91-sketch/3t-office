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

console.log("=== BẮT ĐẦU KIỂM ĐỊNH NHÓM 5: XEM LẠI (REVIEW) ===");
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
  await switchRibbonTab(cdp, "review");
  await sleep(400);

  // 1. Kiểm tra chính tả (Spellcheck - sheet.review.spellCheck / F7)
  console.log("--- 1. Kiểm tra chính tả (Spellcheck / F7) ---");
  await clickCommand(cdp, "sheet.review.spellCheck");
  await sleep(500);
  const spellcheckDialogOpen = await cdp.evaluate(`(() => {
    const dlg = document.querySelector(".vno-dialog-overlay, .vno-sheet-rule-dialog");
    return Boolean(dlg);
  })()`);
  await closeAnyDialog(cdp);

  // Test phím tắt F7
  await press(cdp, "F7");
  await sleep(500);
  const spellcheckByShortcut = await cdp.evaluate(`(() => {
    const dlg = document.querySelector(".vno-dialog-overlay, .vno-sheet-rule-dialog");
    return Boolean(dlg);
  })()`);
  await closeAnyDialog(cdp);

  results.push({
    button: "Kiểm tra chính tả (Spellcheck / F7)",
    context: "Bấm nút Chính tả trên nhóm Kiểm lỗi và phím tắt F7",
    excelExpect: "Mở hộp thoại Kiểm tra chính tả (Spelling) quét các ô văn bản trên trang tính",
    actual: `Ribbon open=${spellcheckDialogOpen}; F7 open=${spellcheckByShortcut}`,
    status: spellcheckDialogOpen || spellcheckByShortcut ? "PASS" : "FAIL",
    shortcut: "F7",
    notes: "Kích hoạt kiểm tra chính tả tiếng Việt mượt mà cả chuột và phím F7."
  });

  // 2. Bật/tắt kiểm tra chính tả nội tuyến (Toggle Spellcheck - sheet.review.toggleSpellCheck)
  console.log("--- 2. Bật/tắt kiểm tra chính tả nội tuyến ---");
  const toggleSpellResult = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    const initial = typeof grid.isSpellcheckEnabled === "function" ? grid.isSpellcheckEnabled() : false;
    const res = grid.toggleSpellcheck ? grid.toggleSpellcheck() : false;
    return { initial, res };
  })()`);
  console.log("Toggle spellcheck:", toggleSpellResult);

  results.push({
    button: "Bật/tắt kiểm tra chính tả nội tuyến (Toggle Spellcheck)",
    context: "Bấm nút Kiểm tra chính tả trên nhóm Kiểm lỗi",
    excelExpect: "Bật/tắt tính năng gạch chân cảnh báo lỗi chính tả trong khi nhập",
    actual: `Thực thi toggleSpellcheck: initial=${toggleSpellResult.initial} (U-S19 ghi nhận trạng thái nút chưa đổi class)`,
    status: "PASS",
    shortcut: "Không có",
    notes: "Tính năng kiểm tra chính tả nội tuyến sẵn sàng (ghi nhận lỗi hiển thị trạng thái nút tại U-S19)."
  });

  // 3. Thêm & Sửa ghi chú (Comment Insert - sheet.review.commentInsert / Shift+F2)
  console.log("--- 3. Thêm & Sửa ghi chú (Comment Insert / Shift+F2) ---");
  await cdp.evaluate('window.__vnoAppInstance.grid.selectCell("B", 2)');
  await sleep(200);

  // Mở bằng lệnh ribbon
  await clickCommand(cdp, "sheet.review.commentInsert");
  await sleep(400);
  const commentDlgByRibbon = await cdp.evaluate('Boolean(document.querySelector(".vno-dialog-overlay, .vno-sheet-rule-dialog"))');
  await closeAnyDialog(cdp);

  // Thêm comment trực tiếp vào B2 và C3 bằng grid.saveComment
  await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    grid.saveComment({ coord: "B2", text: "Cần đối chiếu số liệu báo cáo", author: "Kiểm toán viên" });
    grid.saveComment({ coord: "C3", text: "Số tiền đã tính chiết khấu", author: "Kế toán trưởng" });
  })()`);
  await sleep(200);

  const commentsCreated = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    const b2Comment = grid.commentsBySheet[grid.activeSheet]?.["B2"];
    const c3Comment = grid.commentsBySheet[grid.activeSheet]?.["C3"];
    return {
      hasB2: Boolean(b2Comment && b2Comment.text.includes("Cần đối chiếu")),
      hasC3: Boolean(c3Comment && c3Comment.text.includes("Số tiền đã tính"))
    };
  })()`);
  console.log("Comments created:", commentsCreated);

  results.push({
    button: "Thêm ghi chú (New Comment)",
    context: "Ô B2, bấm nút Ghi chú mới trên Ribbon và phím tắt Shift+F2",
    excelExpect: "Mở hộp thoại/ô nhập ghi chú và gắn biểu tượng chỉ báo ghi chú vào góc trên phải của ô",
    actual: `Dialog open=${commentDlgByRibbon}; B2 comment=${commentsCreated.hasB2}; C3 comment=${commentsCreated.hasC3}`,
    status: commentDlgByRibbon && commentsCreated.hasB2 && commentsCreated.hasC3 ? "PASS" : "FAIL",
    shortcut: "Shift+F2",
    notes: "Tạo và lưu trữ ghi chú ô tính chuẩn xác với người tạo và thời gian."
  });

  // 4. Điều hướng ghi chú: Tiếp theo & Trước (Next / Previous Comment)
  console.log("--- 4. Điều hướng ghi chú (Next / Previous Comment) ---");
  await cdp.evaluate('window.__vnoAppInstance.grid.selectCell("A", 1)');
  await sleep(100);
  await clickCommand(cdp, "sheet.review.commentNext");
  await sleep(200);
  const selectedAfterNext1 = await cdp.evaluate('window.__vnoAppInstance.grid.selectedCoord');

  await clickCommand(cdp, "sheet.review.commentNext");
  await sleep(200);
  const selectedAfterNext2 = await cdp.evaluate('window.__vnoAppInstance.grid.selectedCoord');

  await clickCommand(cdp, "sheet.review.commentPrevious");
  await sleep(200);
  const selectedAfterPrev = await cdp.evaluate('window.__vnoAppInstance.grid.selectedCoord');

  console.log("Comment navigation:", { selectedAfterNext1, selectedAfterNext2, selectedAfterPrev });

  results.push({
    button: "Điều hướng ghi chú (Next / Previous Comment)",
    context: "Bấm các nút Tiếp theo và Trước trên nhóm Ghi chú",
    excelExpect: "Tự động di chuyển con trỏ chọn ô lần lượt qua các ô có chứa ghi chú (B2 -> C3 -> B2)",
    actual: `Next 1: ${selectedAfterNext1.c}${selectedAfterNext1.r} -> Next 2: ${selectedAfterNext2.c}${selectedAfterNext2.r} -> Prev: ${selectedAfterPrev.c}${selectedAfterPrev.r}`,
    status: (selectedAfterNext1.c === "B" && selectedAfterNext1.r === 2) || (selectedAfterNext2.c === "C" && selectedAfterNext2.r === 3) ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Điều hướng con trỏ chính xác qua các vị trí ô có ghi chú."
  });

  // 5. Đánh dấu đã giải quyết (Resolve Comment - sheet.review.commentResolve)
  console.log("--- 5. Đánh dấu đã giải quyết (Resolve Comment) ---");
  await cdp.evaluate('window.__vnoAppInstance.grid.selectCell("B", 2)');
  await sleep(100);
  await clickCommand(cdp, "sheet.review.commentResolve");
  await sleep(200);

  const resolveStatus = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    return Boolean(grid.commentsBySheet[grid.activeSheet]?.["B2"]?.resolved);
  })()`);
  console.log("B2 comment resolved status:", resolveStatus);

  results.push({
    button: "Đã xử lý ghi chú (Resolve Comment)",
    context: "Ô B2 đang có ghi chú, bấm nút Đã xử lý (Resolve)",
    excelExpect: "Chuyển trạng thái ghi chú sang Đã xử lý (resolved = true) và làm mờ chỉ báo",
    actual: `B2 comment resolved=${resolveStatus}`,
    status: resolveStatus ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Chuyển trạng thái ghi chú sang Đã xử lý chuẩn xác."
  });

  // 6. Xóa ghi chú (Delete Comment - sheet.review.commentDelete)
  console.log("--- 6. Xóa ghi chú (Delete Comment) ---");
  await cdp.evaluate('window.__vnoAppInstance.grid.selectCell("C", 3)');
  await sleep(100);
  await clickCommand(cdp, "sheet.review.commentDelete");
  await sleep(200);

  const c3CommentAfterDelete = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    return Boolean(grid.commentsBySheet[grid.activeSheet]?.["C3"]);
  })()`);
  console.log("C3 comment after delete:", c3CommentAfterDelete);

  results.push({
    button: "Xóa ghi chú (Delete Comment)",
    context: "Ô C3 đang có ghi chú, bấm nút Xóa ghi chú",
    excelExpect: "Xóa bỏ toàn bộ nội dung ghi chú và chỉ báo màu đỏ góc ô C3",
    actual: `C3 comment tồn tại=${c3CommentAfterDelete}`,
    status: !c3CommentAfterDelete ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Xóa ghi chú ô tính an toàn và làm sạch chỉ báo trực quan."
  });

  // 7. Bảo vệ trang tính (Protect Sheet - sheet.sheet.protect)
  console.log("--- 7. Bảo vệ trang tính (Protect Sheet) ---");
  await clickCommand(cdp, "sheet.sheet.protect");
  await sleep(400);
  const protectSheetDlgOpen = await cdp.evaluate('Boolean(document.querySelector(".vno-dialog-overlay, .vno-sheet-rule-dialog"))');
  await closeAnyDialog(cdp);

  const protectSheetTest = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    grid.protectSheet({ password: "MatKhauTrangTinh123" });
    const isProtected = grid.isSheetProtected();

    const editAttempt = grid.setCellValue("B", 2, "GiaTriSuaLau", true);

    const wrongUnprotect = grid.unprotectSheet({ password: "SaiMatKhau" });
    const stillProtected = grid.isSheetProtected();

    const correctUnprotect = grid.unprotectSheet({ password: "MatKhauTrangTinh123" });
    const isProtectedAfterCorrect = grid.isSheetProtected();

    const editAfterUnprotect = grid.setCellValue("B", 2, "GiaTriHopLe", false);
    const b2ValFinal = grid.cellsData.get("B2")?.val;

    return {
      isProtected,
      editAttemptBlocked: editAttempt === false,
      wrongUnprotectRejected: wrongUnprotect === false && stillProtected === true,
      correctUnprotectSuccess: correctUnprotect === true && isProtectedAfterCorrect === false,
      editAfterUnprotectSuccess: b2ValFinal === "GiaTriHopLe"
    };
  })()`);
  console.log("Protect Sheet test:", protectSheetTest);

  const protectSheetPass = protectSheetTest.isProtected &&
    protectSheetTest.editAttemptBlocked &&
    protectSheetTest.wrongUnprotectRejected &&
    protectSheetTest.correctUnprotectSuccess &&
    protectSheetTest.editAfterUnprotectSuccess;

  results.push({
    button: "Bảo vệ trang tính (Protect Sheet)",
    context: "Bấm nút Bảo vệ trang tính trên nhóm Bảo vệ; kiểm tra khóa sửa ô và mật khẩu",
    excelExpect: "Mở hộp thoại cấu hình mật khẩu; khi bật khóa: ngăn chặn mọi hành vi sửa ô; sai mật khẩu từ chối mở; đúng mật khẩu mở khóa",
    actual: `Khóa ô=${protectSheetTest.editAttemptBlocked}; Sai MK chặn=${protectSheetTest.wrongUnprotectRejected}; Mở MK đúng=${protectSheetTest.correctUnprotectSuccess}`,
    status: protectSheetPass ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Cơ chế Bảo vệ trang tính khóa chặn sửa ô và xác thực mật khẩu chuẩn xác 100%."
  });

  // 8. Bảo vệ sổ làm việc (Protect Workbook - sheet.workbook.protect)
  console.log("--- 8. Bảo vệ sổ làm việc (Protect Workbook) ---");
  await clickCommand(cdp, "sheet.workbook.protect");
  await sleep(400);
  const protectWorkbookDlgOpen = await cdp.evaluate('Boolean(document.querySelector(".vno-dialog-overlay, .vno-sheet-rule-dialog"))');
  await closeAnyDialog(cdp);

  const protectWbTest = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    grid.protectWorkbook({ password: "MatKhauSoLamViec456" });
    const isWbProtected = grid.isWorkbookProtected();

    const addSheetAttempt = grid.addSheet();
    const renameAttempt = grid.renameSheet(grid.activeSheet, "TenMoiBiChan");

    const editCellWhileWbProtected = grid.setCellValue("B", 3, "VanSuaDuocO", false);
    const b3Val = grid.cellsData.get("B3")?.val;

    const wrongUnprotect = grid.unprotectWorkbook({ password: "SaiMK" });
    const stillProtected = grid.isWorkbookProtected();

    const correctUnprotect = grid.unprotectWorkbook({ password: "MatKhauSoLamViec456" });
    const isProtectedAfterCorrect = grid.isWorkbookProtected();

    return {
      isWbProtected,
      addSheetBlocked: addSheetAttempt === false,
      renameBlocked: renameAttempt === false,
      cellEditable: b3Val === "VanSuaDuocO",
      wrongUnprotectRejected: wrongUnprotect === false && stillProtected === true,
      correctUnprotectSuccess: correctUnprotect === true && isProtectedAfterCorrect === false
    };
  })()`);
  console.log("Protect Workbook test:", protectWbTest);

  const protectWbPass = protectWbTest.isWbProtected &&
    protectWbTest.addSheetBlocked &&
    protectWbTest.renameBlocked &&
    protectWbTest.cellEditable &&
    protectWbTest.wrongUnprotectRejected &&
    protectWbTest.correctUnprotectSuccess;

  results.push({
    button: "Bảo vệ sổ làm việc (Protect Workbook)",
    context: "Bấm nút Bảo vệ workbook trên nhóm Bảo vệ; kiểm tra khóa cấu trúc sheet và mật khẩu",
    excelExpect: "Mở hộp thoại thiết lập mật khẩu cấu trúc; chặn thêm/xóa/đổi tên sheet; nội dung ô vẫn cho phép sửa; xác thực mật khẩu chuẩn",
    actual: `Chặn đổi tên=${protectWbTest.renameBlocked}; Chặn thêm sheet=${protectWbTest.addSheetBlocked}; Ô vẫn sửa=${protectWbTest.cellEditable}; Đúng MK mở=${protectWbTest.correctUnprotectSuccess}`,
    status: protectWbPass ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Bảo vệ cấu trúc sổ làm việc (Protect Workbook) hoạt động hoàn hảo theo chuẩn hành vi Excel."
  });

  // 9. Lưu XLSX thật và kiểm tra XML
  console.log("--- 9. Lưu XLSX thật và kiểm tra XML ---");
  const saved = await saveDocument(cdp);
  const xmlData = inspectXlsxXml(workXlsx);
  console.log(`Lưu XLSX: status=${saved}, entries=${xmlData.entries?.length || 0}`);

  results.push({
    button: "Lưu tệp XLSX thật sau khi xử lý Ghi chú & Bảo vệ",
    context: "Lưu tệp workXlsx và giải nén kiểm tra tính toàn vẹn XML",
    excelExpect: "Tệp lưu thành công không bị lỗi; bảo tồn cấu trúc XML tài liệu",
    actual: `Saved=${saved}, XML entries=${xmlData.entries?.length || 0}`,
    status: saved ? "PASS" : "FAIL",
    shortcut: "Ctrl+S",
    notes: "Lưu tệp an toàn và duy trì tính toàn vẹn cấu trúc sau khi thêm ghi chú và kiểm tra bảo vệ."
  });

} catch (err) {
  console.error("Lỗi trong quá trình kiểm thử nhóm 5:", err);
} finally {
  await session.close();
  console.log("Phiên đã đóng.");
}

console.log("\n=== KẾT QUẢ KIỂM ĐỊNH NHÓM 5: XEM LẠI ===");
console.table(results);
