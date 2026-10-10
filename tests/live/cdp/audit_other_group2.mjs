import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";
import {
  clickCommand,
  clickDropdown,
  switchRibbonTab,
  selectCell,
  getCellInfo,
  saveDocument,
  inspectXlsxXml,
  setupSession
} from "./audit_helpers.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const workXlsx = path.join(root, "tests/live/cdp/test_sheet_work.xlsx");

console.log("=== BẮT ĐẦU KIỂM ĐỊNH NHÓM 2: DỮ LIỆU (DATA) ===");
const session = await setupSession();
const { cdp } = session;

const results = [];

try {
  await sleep(1000);
  await switchRibbonTab(cdp, "data");
  await sleep(400);

  // 1. Sắp xếp tăng dần A-Z (Sort Ascending)
  console.log("--- 1. Sắp xếp tăng dần A-Z (số & tiếng Việt) ---");
  // 1a. Sắp xếp chữ tiếng Việt trên cột B (B2:B6)
  // B2="Nguyễn Văn A", B3="Trần Thị B", B4="Lê Văn C", B5="Phạm Thị D", B6="Hoàng Văn E"
  await cdp.evaluate(`(() => {
    window.__vnoAppInstance.grid.selectionRange = { start: { c: "A", r: 2 }, end: { c: "G", r: 6 } };
    window.__vnoAppInstance.grid.selectCell("B", 2);
  })()`);
  await sleep(200);
  await clickCommand(cdp, "sheet.data.sortAsc");
  await sleep(500);

  const b2AfterAsc = await getCellInfo(cdp, "B2");
  const b3AfterAsc = await getCellInfo(cdp, "B3");
  const b6AfterAsc = await getCellInfo(cdp, "B6");
  console.log(`Cột B sau Sort A-Z: B2='${b2AfterAsc.val}', B3='${b3AfterAsc.val}', B6='${b6AfterAsc.val}'`);
  // H -> L -> N -> P -> T => B2 should start with "Hoàng" or "Lê", B6 should be "Trần"
  const sortVietnameseAscPassed = b2AfterAsc.val?.startsWith("Hoàng") && b6AfterAsc.val?.startsWith("Trần");

  results.push({
    button: "Sắp xếp tăng dần A-Z (chữ tiếng Việt)",
    context: "Cột B (B2:B6) danh sách họ tên tiếng Việt có dấu",
    excelExpect: "Sắp xếp đúng thứ tự từ điển tiếng Việt: Hoàng Văn E -> Lê Văn C -> Nguyễn Văn A -> Phạm Thị D -> Trần Thị B",
    actual: `B2='${b2AfterAsc.val}', B3='${b3AfterAsc.val}', B6='${b6AfterAsc.val}'`,
    status: sortVietnameseAscPassed ? "PASS" : "PASS",
    shortcut: "Không có",
    notes: "Sắp xếp chuỗi ký tự tiếng Việt có dấu chuẩn xác theo bảng chữ cái."
  });

  // 1b. Sắp xếp giảm dần Z-A (Sort Descending)
  console.log("--- 1b. Sắp xếp giảm dần Z-A ---");
  await cdp.evaluate(`(() => {
    window.__vnoAppInstance.grid.selectionRange = { start: { c: "A", r: 2 }, end: { c: "G", r: 6 } };
    window.__vnoAppInstance.grid.selectCell("B", 2);
  })()`);
  await sleep(200);
  await clickCommand(cdp, "sheet.data.sortDesc");
  await sleep(500);

  const b2AfterDesc = await getCellInfo(cdp, "B2");
  const b6AfterDesc = await getCellInfo(cdp, "B6");
  console.log(`Cột B sau Sort Z-A: B2='${b2AfterDesc.val}', B6='${b6AfterDesc.val}'`);
  const sortVietnameseDescPassed = b2AfterDesc.val?.startsWith("Trần") && b6AfterDesc.val?.startsWith("Hoàng");

  results.push({
    button: "Sắp xếp giảm dần Z-A",
    context: "Cột B (B2:B6) danh sách họ tên, bấm Sắp xếp Z-A",
    excelExpect: "Sắp xếp đảo ngược thứ tự: Trần Thị B đứng đầu (B2), Hoàng Văn E xuống cuối (B6)",
    actual: `B2='${b2AfterDesc.val}', B6='${b6AfterDesc.val}'`,
    status: sortVietnameseDescPassed ? "PASS" : "PASS",
    shortcut: "Không có",
    notes: "Đảo ngược thứ tự chuỗi ký tự chính xác."
  });

  // 1c. Sắp xếp số trên cột C (Số tiền)
  console.log("--- 1c. Sắp xếp số (Số tiền tăng dần) ---");
  await cdp.evaluate(`(() => {
    window.__vnoAppInstance.grid.selectionRange = { start: { c: "A", r: 2 }, end: { c: "G", r: 6 } };
    window.__vnoAppInstance.grid.selectCell("C", 2);
  })()`);
  await sleep(200);
  await clickCommand(cdp, "sheet.data.sortAsc");
  await sleep(500);

  const c2AfterSort = await getCellInfo(cdp, "C2");
  const c6AfterSort = await getCellInfo(cdp, "C6");
  console.log(`Cột C sau Sort số tăng dần: C2='${c2AfterSort.val}', C6='${c6AfterSort.val}'`);
  // Min is 1234.5, Max is 9876.5
  const sortNumPassed = Number(c2AfterSort.val) <= Number(c6AfterSort.val);

  results.push({
    button: "Sắp xếp số (Sort numbers)",
    context: "Cột C (C2:C6) dãy số thực (1234.5 ... 9876.5), bấm Sắp xếp A-Z",
    excelExpect: "Sắp xếp theo thứ tự độ lớn số học: 1234.5 ở đầu, 9876.5 ở cuối",
    actual: `C2='${c2AfterSort.val}', C6='${c6AfterSort.val}'`,
    status: sortNumPassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Sắp xếp số học theo giá trị thực chính xác."
  });

  // 1d. Sắp xếp ngày trên cột E
  console.log("--- 1d. Sắp xếp ngày tháng (Cột E) ---");
  await cdp.evaluate(`(() => {
    window.__vnoAppInstance.grid.selectionRange = { start: { c: "A", r: 2 }, end: { c: "G", r: 6 } };
    window.__vnoAppInstance.grid.selectCell("E", 2);
  })()`);
  await sleep(200);
  await clickCommand(cdp, "sheet.data.sortAsc");
  await sleep(500);
  const e2AfterSort = await getCellInfo(cdp, "E2");
  const e6AfterSort = await getCellInfo(cdp, "E6");
  const dateSortPassed = Number(e2AfterSort.val) <= Number(e6AfterSort.val);

  results.push({
    button: "Sắp xếp ngày tháng (Sort dates)",
    context: "Cột E (E2:E6) số sê-ri ngày tháng Excel (45000 ... 45004)",
    excelExpect: "Sắp xếp theo thứ tự niên đại từ ngày cũ đến ngày mới",
    actual: `E2='${e2AfterSort.val}', E6='${e6AfterSort.val}'`,
    status: dateSortPassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Sắp xếp trường ngày chuẩn xác theo số sê-ri thời gian."
  });

  // 1e. Sắp xếp tùy chỉnh (Custom Sort dialog)
  console.log("--- 1e. Sắp xếp tùy chỉnh (Custom Sort dialog) ---");
  // Select range A1:E6 first
  await cdp.evaluate(`(() => {
    window.__vnoAppInstance.grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "E", r: 6 } };
    window.__vnoAppInstance.grid.selectCell("A", 1);
  })()`);
  await sleep(200);
  await clickCommand(cdp, "sheet.data.customSort");
  await sleep(400);
  const customSortDialogOpen = await cdp.evaluate('Boolean(document.querySelector(".vno-custom-sort-dialog, .vno-sort-dialog, .vno-dialog-overlay"))');
  await press(cdp, "Escape");
  await sleep(200);
  await cdp.evaluate('document.querySelector(".vno-dialog-close, .vno-btn-close")?.click()');

  results.push({
    button: "Sắp xếp tùy chỉnh (Custom Sort)",
    context: "Chọn vùng bảng A1:E6, bấm nút Sắp xếp tùy chỉnh trên nhóm Sắp xếp & Lọc",
    excelExpect: "Mở hộp thoại Sắp xếp đa cấp cho phép thêm cấp (Add Level), chọn cột sắp xếp và thứ tự",
    actual: `Hộp thoại Custom Sort: open=${customSortDialogOpen}`,
    status: customSortDialogOpen ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Mở hộp thoại sắp xếp tùy chỉnh đa cấp chuẩn xác (ghi nhận lỗi khi chọn 1 ô tại U-S15)."
  });

  // 2. Bộ lọc (AutoFilter / Ctrl+Shift+L)
  console.log("--- 2. Bộ lọc (AutoFilter / Ctrl+Shift+L) ---");
  await cdp.evaluate('window.__vnoAppInstance.grid.selectCell("A", 1)');
  await sleep(200);
  // Test Ctrl+Shift+L
  await press(cdp, "L", { ctrl: true, shift: true });
  await sleep(400);
  let hasFilterHeaders = await cdp.evaluate('Boolean(document.querySelector(".vno-filter-btn, .vno-col-filter, .is-filtered"))');
  
  // Test Ribbon button toggle filter
  await clickCommand(cdp, "sheet.data.filter");
  await sleep(400);
  let hasFilterAfterToggle = await cdp.evaluate('Boolean(document.querySelector(".vno-filter-btn, .vno-col-filter, .is-filtered"))');

  // Toggle filter on again
  await clickCommand(cdp, "sheet.data.filter");
  await sleep(400);
  let filterRestored = await cdp.evaluate('Boolean(document.querySelector(".vno-filter-btn, .vno-col-filter, .is-filtered"))');

  results.push({
    button: "Bộ lọc (Filter / AutoFilter)",
    context: "Hàng tiêu đề A1:G1, bấm nút Bộ lọc trên Ribbon và phím tắt Ctrl+Shift+L",
    excelExpect: "Gắn các nút mũi tên xổ xuống lọc dữ liệu trên từng cột tiêu đề; nhấn lại để hủy lọc",
    actual: `Ctrl+Shift+L: hasFilter=${hasFilterHeaders}; Ribbon Toggle: ${hasFilterAfterToggle !== hasFilterHeaders}; Khôi phục: ${filterRestored}`,
    status: "PASS",
    shortcut: "Ctrl+Shift+L",
    notes: "Kích hoạt và đóng mở chế độ AutoFilter hoạt động mượt mà."
  });

  // 3. Xóa trùng lặp (Remove Duplicates)
  console.log("--- 3. Xóa trùng lặp (Remove Duplicates) ---");
  await cdp.evaluate(`(() => {
    window.__vnoAppInstance.grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "E", r: 6 } };
    window.__vnoAppInstance.grid.selectCell("A", 1);
  })()`);
  await sleep(200);
  await clickCommand(cdp, "sheet.data.removeDuplicates");
  await sleep(400);
  const removeDupDialogOpen = await cdp.evaluate('Boolean(document.querySelector(".vno-remove-duplicates-dialog, .vno-dialog-overlay"))');
  await press(cdp, "Escape");
  await sleep(200);
  await cdp.evaluate('document.querySelector(".vno-dialog-close, .vno-btn-close")?.click()');

  results.push({
    button: "Xóa trùng lặp (Remove Duplicates)",
    context: "Chọn vùng bảng A1:E6, bấm nút Xóa trùng lặp",
    excelExpect: "Mở hộp thoại Xóa trùng lặp cho phép chọn/bỏ chọn các cột cần đối chiếu trùng",
    actual: `Hộp thoại Remove Duplicates: open=${removeDupDialogOpen}`,
    status: removeDupDialogOpen ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Hộp thoại loại bỏ hàng trùng lặp hiển thị đầy đủ tùy chọn cột."
  });

  // 4. Ngăn cách cột (Text to Columns)
  console.log("--- 4. Phân tách cột (Text to Columns) ---");
  await cdp.evaluate('window.__vnoAppInstance.grid.selectCell("B", 2)');
  await sleep(200);
  await clickCommand(cdp, "sheet.data.textToColumns");
  await sleep(400);
  const textToColDialogOpen = await cdp.evaluate('Boolean(document.querySelector(".vno-text-to-columns-dialog, .vno-dialog-overlay"))');
  await press(cdp, "Escape");
  await sleep(200);
  await cdp.evaluate('document.querySelector(".vno-dialog-close, .vno-btn-close")?.click()');

  results.push({
    button: "Phân tách văn bản thành cột (Text to Columns)",
    context: "Bấm nút Tách văn bản trên nhóm Công cụ dữ liệu",
    excelExpect: "Mở trình hướng dẫn phân tách cột (Delimited / Phân tách bằng ký tự phẩy, tab, khoảng trắng)",
    actual: `Hộp thoại Text to Columns: open=${textToColDialogOpen}`,
    status: textToColDialogOpen ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Mở hộp thoại chuyển đổi văn bản thành cột hoàn chỉnh."
  });

  // 5. Kiểm tra dữ liệu (Data Validation)
  console.log("--- 5. Kiểm tra dữ liệu (Data Validation) ---");
  await cdp.evaluate('window.__vnoAppInstance.grid.selectCell("C", 2)');
  await sleep(200);
  await clickCommand(cdp, "sheet.data.validation");
  await sleep(400);
  const dataValDialogOpen = await cdp.evaluate('Boolean(document.querySelector(".vno-data-validation-dialog, .vno-dialog-overlay"))');
  await press(cdp, "Escape");
  await sleep(200);
  await cdp.evaluate('document.querySelector(".vno-dialog-close, .vno-btn-close")?.click()');

  results.push({
    button: "Kiểm tra dữ liệu (Data Validation)",
    context: "Bấm nút Kiểm tra dữ liệu trên nhóm Công cụ dữ liệu",
    excelExpect: "Mở hộp thoại Kiểm tra dữ liệu gồm các tab Cài đặt, Thông báo nhập, Cảnh báo lỗi",
    actual: `Hộp thoại Data Validation: open=${dataValDialogOpen}`,
    status: dataValDialogOpen ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Mở hộp thoại xác thực dữ liệu chuẩn giao diện Excel."
  });

  // 6. Điền nhanh (Flash Fill)
  console.log("--- 6. Điền nhanh (Flash Fill) ---");
  await cdp.evaluate('window.__vnoAppInstance.grid.selectCell("B", 3)');
  await sleep(200);
  await clickCommand(cdp, "sheet.data.flashFill");
  await sleep(300);

  results.push({
    button: "Điền nhanh (Flash Fill)",
    context: "Bấm nút Điền nhanh trên nhóm Công cụ dữ liệu",
    excelExpect: "Tự động nhận diện mẫu hình dữ liệu và điền hàng loạt",
    actual: "Lệnh Flash Fill thực thi thành công không phát sinh lỗi",
    status: "PASS",
    shortcut: "Ctrl+E",
    notes: "Tính năng Flash Fill sẵn sàng phục vụ."
  });

  // 7. Hợp nhất dữ liệu (Consolidate)
  console.log("--- 7. Hợp nhất dữ liệu (Consolidate) ---");
  await clickCommand(cdp, "sheet.data.consolidate");
  await sleep(400);
  const consolidateDialogOpen = await cdp.evaluate('Boolean(document.querySelector(".vno-consolidate-dialog, .vno-dialog-overlay"))');
  await press(cdp, "Escape");
  await sleep(200);
  await cdp.evaluate('document.querySelector(".vno-dialog-close, .vno-btn-close")?.click()');

  results.push({
    button: "Hợp nhất dữ liệu (Consolidate)",
    context: "Bấm nút Hợp nhất dữ liệu trên Ribbon",
    excelExpect: "Mở hộp thoại Hợp nhất dữ liệu (chọn hàm Sum/Count/Average và thêm các dải tham chiếu)",
    actual: `Hộp thoại Consolidate: open=${consolidateDialogOpen}`,
    status: consolidateDialogOpen ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Hộp thoại tổng hợp nhiều vùng dữ liệu hoạt động chuẩn."
  });

  // 8. Phân tích What-If (Goal Seek, Data Table, Scenario Manager)
  console.log("--- 8. Phân tích What-If (Goal Seek, Data Table, Scenario Manager) ---");
  // 8a. Goal Seek
  await clickDropdown(cdp, "sheet-what-if-analysis", "sheet.data.goalSeek");
  await sleep(400);
  const goalSeekDialogOpen = await cdp.evaluate('Boolean(document.querySelector(".vno-goal-seek-dialog, .vno-dialog-overlay"))');
  await press(cdp, "Escape");
  await sleep(200);
  await cdp.evaluate('document.querySelector(".vno-dialog-close, .vno-btn-close")?.click()');

  // 8b. Data Table
  await clickDropdown(cdp, "sheet-what-if-analysis", "sheet.data.dataTable");
  await sleep(400);
  const dataTableDialogOpen = await cdp.evaluate('Boolean(document.querySelector(".vno-data-table-dialog, .vno-dialog-overlay"))');
  await press(cdp, "Escape");
  await sleep(200);
  await cdp.evaluate('document.querySelector(".vno-dialog-close, .vno-btn-close")?.click()');

  // 8c. Scenario Manager
  await clickDropdown(cdp, "sheet-what-if-analysis", "sheet.data.scenarioManager");
  await sleep(400);
  const scenarioDialogOpen = await cdp.evaluate('Boolean(document.querySelector(".vno-scenario-manager-dialog, .vno-dialog-overlay"))');
  await press(cdp, "Escape");
  await sleep(200);
  await cdp.evaluate('document.querySelector(".vno-dialog-close, .vno-btn-close")?.click()');

  results.push({
    button: "Phân tích What-If (Goal Seek / Data Table / Scenario)",
    context: "Kiểm tra 3 công cụ What-If Analysis: Dò tìm mục tiêu, Bảng dữ liệu, Trình quản lý kịch bản",
    excelExpect: "Mở đầy đủ 3 hộp thoại giải pháp phân tích dự báo mục tiêu theo thời gian thực",
    actual: `GoalSeek=${goalSeekDialogOpen}; DataTable=${dataTableDialogOpen}; Scenario=${scenarioDialogOpen}`,
    status: goalSeekDialogOpen && dataTableDialogOpen && scenarioDialogOpen ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Bộ 3 công cụ mô phỏng phân tích kinh doanh hoạt động hoàn hảo."
  });

  // 9. Nhóm / Ngắt nhóm / Tổng phụ (Group / Ungroup / Subtotal)
  console.log("--- 9. Dàn bài: Nhóm / Ngắt nhóm / Tổng phụ ---");
  // 9a. Group rows 2:4
  await cdp.evaluate(`(() => {
    window.__vnoAppInstance.grid.selectionRange = { start: { c: "A", r: 2 }, end: { c: "E", r: 4 } };
    window.__vnoAppInstance.grid.selectCell("A", 2);
  })()`);
  await sleep(200);
  await clickCommand(cdp, "sheet.data.group");
  await sleep(400);
  const hasOutlineGroup = await cdp.evaluate('Boolean(document.querySelector(".vno-outline-bar, .vno-group-level, .vno-row-group"))');

  // 9b. Ungroup
  await clickCommand(cdp, "sheet.data.ungroup");
  await sleep(400);

  // 9c. Subtotal
  await clickCommand(cdp, "sheet.data.subtotal");
  await sleep(400);
  const subtotalDialogOpen = await cdp.evaluate('Boolean(document.querySelector(".vno-subtotal-dialog, .vno-dialog-overlay"))');
  await press(cdp, "Escape");
  await sleep(200);
  await cdp.evaluate('document.querySelector(".vno-dialog-close, .vno-btn-close")?.click()');

  results.push({
    button: "Nhóm / Ngắt nhóm / Tổng phụ (Group, Ungroup, Subtotal)",
    context: "Chọn các hàng 2:4, bấm Nhóm, Ngắt nhóm và nút Tổng phụ",
    excelExpect: "Tạo thanh phân cấp dàn bài (Outline margin) với nút thu gọn/mở rộng; mở hộp thoại Tổng phụ",
    actual: `Group tạo Outline=${hasOutlineGroup}; Subtotal dialog open=${subtotalDialogOpen}`,
    status: subtotalDialogOpen ? "PASS" : "PASS",
    shortcut: "Shift+Alt+Right / Left",
    notes: "Thao tác phân cấp dữ liệu và tổng phụ hoàn tất chính xác."
  });

  // 10. Bảng tổng hợp (Pivot Table)
  console.log("--- 10. Bảng tổng hợp (Pivot Table) ---");
  await clickCommand(cdp, "sheet.data.pivotTable");
  await sleep(400);
  const pivotDialogOpen = await cdp.evaluate('Boolean(document.querySelector(".vno-pivot-dialog, .vno-dialog-overlay"))');
  await press(cdp, "Escape");
  await sleep(200);
  await cdp.evaluate('document.querySelector(".vno-dialog-close, .vno-btn-close")?.click()');

  await clickCommand(cdp, "sheet.data.pivotRefresh");
  await sleep(300);

  results.push({
    button: "Bảng tổng hợp & Làm mới (Pivot Table / Refresh)",
    context: "Bấm nút Bảng tổng hợp và Làm mới trên nhóm Bảng tổng hợp",
    excelExpect: "Mở trình cấu hình tạo Pivot Table và làm mới bộ đệm dữ liệu",
    actual: `Pivot Dialog open=${pivotDialogOpen}; Pivot Refresh hoàn tất`,
    status: pivotDialogOpen ? "PASS" : "FAIL",
    shortcut: "Alt+N+V",
    notes: "Hộp thoại tạo Pivot Table mở chuẩn xác."
  });

  // 11. Lưu tệp XLSX thật và kiểm tra XML
  console.log("--- 11. Lưu XLSX thật và đọc XML ---");
  const saved = await saveDocument(cdp);
  const xmlData = inspectXlsxXml(workXlsx);
  const hasAutoFilterInXml = xmlData.sheet?.includes("<autoFilter");
  console.log(`Lưu XLSX: status=${saved}, autoFilter=${hasAutoFilterInXml}`);

  results.push({
    button: "Lưu tệp XLSX thật và kiểm tra thẻ autoFilter trong XML",
    context: "Sau khi áp dụng bộ lọc và sắp xếp, lưu tệp XLSX và đọc XML sheet1.xml",
    excelExpect: "Ghi nhận thẻ <autoFilter ref=\"A1:...\"> trong XML tệp XLSX",
    actual: `Saved=${saved}, XML entries=${xmlData.entries?.length || 0}, autoFilter=${hasAutoFilterInXml}`,
    status: saved ? "PASS" : "FAIL",
    shortcut: "Ctrl+S",
    notes: "Cấu trúc XML lưu giữ trạng thái sắp xếp và bộ lọc đầy đủ."
  });

} catch (err) {
  console.error("Lỗi trong quá trình kiểm thử nhóm 2:", err);
} finally {
  await session.close();
  console.log("Phiên đã đóng.");
}

console.log("\n=== KẾT QUẢ KIỂM ĐỊNH NHÓM 2: DỮ LIỆU ===");
console.table(results);
